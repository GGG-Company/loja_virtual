import Redis from 'ioredis';

let publisher: Redis.Redis | null = null;
let _redisErrorLogged = false;

export function getRedisPublisher() {
  if (publisher) return publisher;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  publisher = new Redis(url);
  // log the first connection/error once to avoid flooding logs in local dev
  publisher.on('error', (err) => {
    if (!_redisErrorLogged) {
      console.error('[REDIS PUB] error', err);
      _redisErrorLogged = true;
    }
  });
  return publisher;
}

export async function publish(channel: string, message: any) {
  const pub = getRedisPublisher();
  if (!pub) return false;
  try {
    await pub.publish(channel, JSON.stringify(message));
    return true;
  } catch (e) {
    if (!_redisErrorLogged) {
      console.error('[REDIS PUB] publish error', e);
      _redisErrorLogged = true;
    }
    return false;
  }
}
