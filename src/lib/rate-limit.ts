import { NextRequest, NextResponse } from 'next/server';
import { getRedisPublisher } from './redis';
import logger from './logger';

/**
 * Rate limiter baseado em Redis (sliding window simplificado).
 * Fallback para Map em memória se Redis não estiver disponível.
 *
 * Uso:
 *   const limiter = createRateLimiter({ max: 5, windowSec: 60 });
 *   // dentro de um handler:
 *   const blocked = await limiter.check(req);
 *   if (blocked) return blocked; // já retorna 429
 */

interface RateLimitOpts {
  /** Máximo de requisições por janela */
  max: number;
  /** Tamanho da janela em segundos */
  windowSec: number;
  /** Prefixo para a chave no Redis */
  prefix?: string;
}

// Fallback em memória para quando Redis não está disponível
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function createRateLimiter(opts: RateLimitOpts) {
  const { max, windowSec, prefix = 'rl' } = opts;

  return {
    /**
     * Verifica se o IP excedeu o limite.
     * Retorna NextResponse 429 se bloqueado, ou null se liberado.
     */
    async check(req: NextRequest): Promise<NextResponse | null> {
      const ip = getClientIp(req);
      const key = `${prefix}:${ip}`;

      try {
        const redis = getRedisPublisher();
        if (redis) {
          // Usa INCR + EXPIRE atômico
          const current = await redis.incr(key);
          if (current === 1) {
            await redis.expire(key, windowSec);
          }

          if (current > max) {
            const ttl = await redis.ttl(key);
            logger.warn({ ip, key, current, max }, '[RATE_LIMIT] Bloqueado');
            return NextResponse.json(
              { error: 'Muitas requisições. Tente novamente em alguns instantes.' },
              {
                status: 429,
                headers: {
                  'Retry-After': String(ttl > 0 ? ttl : windowSec),
                  'X-RateLimit-Limit': String(max),
                  'X-RateLimit-Remaining': '0',
                },
              }
            );
          }

          return null; // liberado
        }
      } catch {
        // Redis falhou — usa fallback em memória
      }

      // Fallback em memória
      const now = Date.now();
      const entry = memoryStore.get(key);

      if (!entry || now > entry.resetAt) {
        memoryStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
        return null;
      }

      entry.count++;
      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
          { error: 'Muitas requisições. Tente novamente em alguns instantes.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(max),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }

      return null;
    },
  };
}

/** Limiters pré-configurados para rotas sensíveis */
export const authLimiter = createRateLimiter({ max: 10, windowSec: 60, prefix: 'rl:auth' });
export const paymentLimiter = createRateLimiter({ max: 10, windowSec: 60, prefix: 'rl:pay' });
export const apiLimiter = createRateLimiter({ max: 60, windowSec: 60, prefix: 'rl:api' });
export const uploadLimiter = createRateLimiter({ max: 10, windowSec: 3600, prefix: 'rl:upload' });
export const reviewLimiter = createRateLimiter({ max: 5, windowSec: 3600, prefix: 'rl:review' });
export const supportChatLimiter = createRateLimiter({ max: 10, windowSec: 3600, prefix: 'rl:support' });
export const orderLimiter = createRateLimiter({ max: 10, windowSec: 60, prefix: 'rl:order' });
