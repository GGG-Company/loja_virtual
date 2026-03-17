require('dotenv').config();
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const PORT = process.env.SOCKET_PORT || 4000;
const INTERNAL_KEY = process.env.X_INTERNAL_API_KEY;

const io = new Server(PORT, {
  maxHttpBufferSize: 1e6,
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://loja.azura.dev.br', 'http://localhost:3000'],
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

  // Subscribe to support chat messages
  await externalMsgClient.pSubscribe('support:chat:*', (message, channel) => {
    try {
      const chatId = channel.split(':')[2];
      let data = null;
      try { data = JSON.parse(message); } catch (e) { console.error('[REMOTE] failed to parse message from redis', e); return; }

      // emit to both room conventions
      io.to(chatId).emit('new_message', data);
      io.to(`chat_${chatId}`).emit('new_message', data);

      console.log(`[REMOTE REDIS] forwarded support:chat to ${chatId}`);
    } catch (e) {
      console.error('[REMOTE REDIS] pSubscribe handler error', e);
    }
  });

  // Subscribe to notifications channels (user-specific, room and global)
  await externalMsgClient.pSubscribe('notifications*', (message, channel) => {
    try {
      let payload = null;
      try { payload = JSON.parse(message); } catch (e) { console.error('[REMOTE] failed to parse notification message', e); return; }

      // channel possibilities:
      // notifications -> global broadcast
      // notifications:user:{userId} -> user-specific
      // notifications:room:{roomName} -> room-specific
      // notifications:global:{something} -> global
      if (channel === 'notifications' || channel.startsWith('notifications:global')) {
        io.emit('notification', payload);
        console.log('[REMOTE REDIS] broadcast notification');
        return;
      }

      if (channel.startsWith('notifications:user:')) {
        const userId = channel.split(':')[2];
        io.to(userId).emit('notification', payload);
        io.to(`user_${userId}`).emit('notification', payload);
        console.log(`[REMOTE REDIS] forwarded notification to user ${userId}`);
        return;
      }

      if (channel.startsWith('notifications:room:')) {
        const roomName = channel.split(':').slice(2).join(':');
        io.to(roomName).emit('notification', payload);
        console.log(`[REMOTE REDIS] forwarded notification to room ${roomName}`);
        return;
      }

      // fallback: emit as 'notification' to all
      io.emit('notification', payload);
      console.log('[REMOTE REDIS] forwarded notification (fallback)');
    } catch (e) {
      console.error('[REMOTE REDIS] notifications pSubscribe handler error', e);
    }
  });

  console.log(`Remote Socket server listening on ${PORT}`);
}

init().catch((e) => { console.error('[REMOTE] init error', e); process.exit(1); });

// handshake auth
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (token) {
    if (token === INTERNAL_KEY) return next();
    return next(new Error('unauthorized'));
  }
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
