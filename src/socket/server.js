require('dotenv').config();
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const PORT = process.env.SOCKET_PORT || 4000;
const INTERNAL_KEY = process.env.X_INTERNAL_API_KEY;

const io = new Server(PORT, {
  maxHttpBufferSize: 1e6,
  cors: {
    origin: (() => {
      const defaultOrigins = ['https://loja.azura.dev.br', 'http://localhost:3000'];
      if (!process.env.ALLOWED_ORIGINS) return defaultOrigins;
      return process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
    })(),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

const redisConfig = { url: process.env.REDIS_URL };
const pubClient = createClient(redisConfig);
const subClient = pubClient.duplicate();
const externalMsgClient = pubClient.duplicate();

[pubClient, subClient, externalMsgClient].forEach((c) => c.on('error', (e) => console.error('[REDIS ERROR]', e)));

async function init() {
  await Promise.all([pubClient.connect(), subClient.connect(), externalMsgClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  await externalMsgClient.pSubscribe('support:chat:*', (message, channel) => {
    try {
      const chatId = channel.split(':')[2];
      let data = null;
      try { data = JSON.parse(message); } catch (e) { console.error('[REMOTE] failed to parse message from redis', e); return; }

      // emit to both room conventions
      io.to(chatId).emit('new_message', data);
      io.to(`chat_${chatId}`).emit('new_message', data);
      if (process.env.SOCKET_VERBOSE === '1') console.log(`[REMOTE REDIS] forwarded to ${chatId}`);
    } catch (e) {
      console.error('[REMOTE REDIS] pSubscribe handler error', e);
    }
  });

  // Também inscreve em canais de notificações (user, room e broadcast)
  await externalMsgClient.pSubscribe('notifications*', (message, channel) => {
    try {
      let payload = null;
      try { payload = JSON.parse(message); } catch (e) { console.error('[REMOTE] failed to parse notification message', e); return; }

      if (channel === 'notifications' || channel.startsWith('notifications:global')) {
        io.emit('notification', payload);
        if (process.env.SOCKET_VERBOSE === '1') console.log('[REMOTE REDIS] broadcast notification');
        return;
      }

      if (channel.startsWith('notifications:user:')) {
        const userId = channel.split(':')[2];
        io.to(userId).emit('notification', payload);
        io.to(`user_${userId}`).emit('notification', payload);
        if (process.env.SOCKET_VERBOSE === '1') console.log(`[REMOTE REDIS] forwarded notification to user ${userId}`);
        return;
      }

      if (channel.startsWith('notifications:room:')) {
        const roomName = channel.split(':').slice(2).join(':');
        io.to(roomName).emit('notification', payload);
        if (process.env.SOCKET_VERBOSE === '1') console.log(`[REMOTE REDIS] forwarded notification to room ${roomName}`);
        return;
      }

      // fallback: broadcast
      io.emit('notification', payload);
      if (process.env.SOCKET_VERBOSE === '1') console.log('[REMOTE REDIS] forwarded notification (fallback)');
    } catch (e) {
      console.error('[REMOTE REDIS] notifications pSubscribe handler error', e);
    }
  });

  // Inscrever em eventos de conversas para encaminhar atualizações em tempo real
  await externalMsgClient.pSubscribe('conversations*', (message, channel) => {
    try {
      let payload = null;
      try { payload = JSON.parse(message); } catch (e) { console.error('[REMOTE] failed to parse conversation message', e); return; }

      // channels: conversations:user:<userId> OR conversations:<conversationId>
      if (channel.startsWith('conversations:user:')) {
        const userId = channel.split(':')[2];
        io.to(userId).emit('conversation_created', payload);
        io.to(`user_${userId}`).emit('conversation_created', payload);
        if (process.env.SOCKET_VERBOSE === '1') console.log(`[REMOTE REDIS] forwarded conversation event to user ${userId}`);
        return;
      }

      if (channel.startsWith('conversations:')) {
        const convoId = channel.split(':')[1];
        io.to(convoId).emit('conversation_message', payload);
        io.to(`conversation_${convoId}`).emit('conversation_message', payload);
        if (process.env.SOCKET_VERBOSE === '1') console.log(`[REMOTE REDIS] forwarded conversation event to convo ${convoId}`);
        return;
      }

      // fallback: broadcast
      io.emit('conversation_update', payload);
      if (process.env.SOCKET_VERBOSE === '1') console.log('[REMOTE REDIS] forwarded conversation event (fallback)');
    } catch (e) {
      console.error('[REMOTE REDIS] conversations pSubscribe handler error', e);
    }
  });

  console.log(`🚀 Remote Socket server listening on ${PORT}`);
}

init().catch((e) => { console.error('[REMOTE] init error', e); process.exit(1); });

// handshake auth
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  // mark socket as internal when token matches INTERNAL_KEY
  socket.data = socket.data || {};
  if (token) {
    if (token === INTERNAL_KEY) {
      socket.data.isInternal = true;
      return next();
    }
    return next(new Error('unauthorized'));
  }
  // no token: allow (public/browser) but mark as not-internal
  socket.data.isInternal = false;
  return next();
});

io.on('connection', (socket) => {
  console.log(`[REMOTE CONNECT] ${socket.id} ${socket.conn.remoteAddress}`);

  const handleJoin = (id) => {
    const cleanId = String(id).replace(/^chat_/, '');
    socket.join(cleanId);
    socket.join(`chat_${cleanId}`);
    console.log(`[REMOTE JOIN] ${socket.id} -> ${cleanId}`);
  };

  socket.on('join', handleJoin);
  socket.on('join_chat', handleJoin);

  let msgCount = 0;
  const resetInterval = setInterval(() => { msgCount = 0; }, 60000);

  socket.on('send_message', (data) => {
    if (++msgCount > 100) return socket.emit('error', 'rate_limit');
    if (!data || !data.chatId || !data.content) return;
    io.to(data.chatId).emit('new_message', { ...data, server_ts: Date.now() });
    io.to(`chat_${data.chatId}`).emit('new_message', { ...data, server_ts: Date.now() });
  });

  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(`chat_${chatId}`).emit('user_typing', { isTyping });
  });

  socket.on('disconnect', (reason) => {
    clearInterval(resetInterval);
    console.log(`[REMOTE DISCONNECT] ${socket.id} reason=${reason}`);
  });
});

process.on('SIGINT', async () => {
  console.log('[REMOTE] SIGINT, shutting down');
  try { await externalMsgClient.quit(); } catch (e) {}
  try { await pubClient.quit(); } catch (e) {}
  try { await subClient.quit(); } catch (e) {}
  io.close(() => process.exit(0));
});

process.on('unhandledRejection', (err) => console.error('[REMOTE UNHANDLED]', err));
process.on('uncaughtException', (err) => console.error('[REMOTE UNCAUGHT]', err));
