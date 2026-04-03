import Redis from 'ioredis';
import logger from './logger';

let publisher: Redis | null = null;
let _redisErrorLogged = false;

export function getRedisPublisher() {
  if (publisher) return publisher;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  
  publisher = new Redis(url, {
    maxRetriesPerRequest: 3,
    commandTimeout: 5000, // 5 s — evita hang em comandos individuais
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 10) return null; // desiste após 10 tentativas
      return Math.min(times * 100, 3000);
    },
  });

  // log the first connection/error once to avoid flooding logs in local dev
  publisher.on('error', (err: Error) => {
    if (!_redisErrorLogged) {
      logger.error(err, '[REDIS PUB] error');
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
      logger.error(e as Error, '[REDIS PUB] publish error');
      _redisErrorLogged = true;
    }
    return false;
  }
}
