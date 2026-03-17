const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

/**
 * SERVIDOR SOCKET.IO EXTERNO (Node.js)
 * 
 * Este servidor deve rodar no mesmo ambiente onde o Redis está acessível.
 * Ele ouve eventos do Redis Pub/Sub e os retransmite para os clientes via WebSockets.
 */

// Configurações (Ajuste conforme necessário ou use variáveis de ambiente)
const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://:Hstg_7294_Psql_X8@72.61.37.230:6379';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Em produção, limite para o domínio da sua loja
    methods: ["GET", "POST"]
  }
});

// Cliente Redis para Inscrição (Sub)
const redisSub = new Redis(REDIS_URL);

redisSub.on('connect', () => console.log('✅ Conectado ao Redis Pub/Sub'));
redisSub.on('error', (err) => console.error('❌ Erro no Redis:', err));

// Canais que este servidor vai ouvir
const CHANNELS = [
  'notifications:user:*',
  'support:chat:*'
];

// Inscrição via Pattern (P-Subscribe)
redisSub.psubscribe(...CHANNELS, (err, count) => {
  if (err) {
    console.error('❌ Falha ao se inscrever nos canais:', err);
  } else {
    console.log(`📡 Ouvindo ${count} padrões de canais Redis.`);
  }
});

// Quando uma mensagem chega no Redis...
redisSub.on('pmessage', (pattern, channel, message) => {
  console.log(`[REDIS] Mensagem recebida no canal ${channel}`);
  
  try {
    const data = JSON.parse(message);

    // 1. Encaminhar para Notificações de Usuário
    if (channel.startsWith('notifications:user:')) {
      const userId = channel.split(':').pop();
      io.to(`user:${userId}`).emit('notification', data);
    }

    // 2. Encaminhar para Chat de Suporte
    if (channel.startsWith('support:chat:')) {
      const chatId = channel.split(':').pop();
      io.to(`chat:${chatId}`).emit('message', data);
    }
  } catch (e) {
    console.error('❌ Erro ao processar mensagem do Redis:', e);
  }
});

// Lógica de Conexão dos Clientes (Frontend)
io.on('connection', (socket) => {
  console.log('👤 Novo cliente conectado:', socket.id);

  // Cliente entra na sua sala específica (User ID enviado na conexão)
  socket.on('join-user', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`📥 Cliente ${socket.id} entrou na sala do usuário ${userId}`);
  });

  // Cliente entra na sala do chat específico
  socket.on('join-chat', (chatId) => {
    socket.join(`chat:${chatId}`);
    console.log(`📥 Cliente ${socket.id} entrou no chat ${chatId}`);
  });

  socket.on('disconnect', () => {
    console.log('👋 Cliente desconectado:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor Socket.io externo rodando na porta ${PORT}`);
  console.log(`🔗 REDIS_URL configurada: ${REDIS_URL.split('@')[1] || REDIS_URL}`);
});
