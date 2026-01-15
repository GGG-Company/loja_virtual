const { createClient } = require('redis');

const url = process.env.REDIS_URL || 'redis://:%40Apl19751202@72.61.37.230:6379';

(async () => {
  const client = createClient({ url });
  client.on('error', (e) => console.error('redis err', e));
  await client.connect();
  const chatId = process.argv[2] || 'TEST_CHAT';
  const payload = {
    message: { id: `m-${Date.now()}`, sender: 'attendant', senderName: 'Assistente', message: 'Mensagem de teste do publish-test', createdAt: new Date().toISOString() }
  };
  await client.publish(`support:chat:${chatId}`, JSON.stringify(payload));
  console.log('published to', `support:chat:${chatId}`);
  await client.disconnect();
  process.exit(0);
})();
