import { NextRequest, NextResponse } from 'next/server';
import { getRedisPublisher } from './redis';
import logger from './logger';

/**
 * Rate limiter baseado em Redis (sliding window simplificado).
 * Fallback para Map em memória se Redis não estiver disponível.
 *
 * Uso básico (por IP):
 *   const blocked = await limiter.check(req);
 *
 * Uso autenticado (por userId + IP — dupla proteção):
 *   const blocked = await limiter.check(req, session?.user?.id);
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

async function checkKey(
  key: string,
  max: number,
  windowSec: number,
): Promise<{ blocked: boolean; retryAfter: number }> {
  try {
    const redis = getRedisPublisher();
    if (redis) {
      const current = await redis.incr(key);
      if (current === 1) await redis.expire(key, windowSec);
      if (current > max) {
        const ttl = await redis.ttl(key);
        return { blocked: true, retryAfter: ttl > 0 ? ttl : windowSec };
      }
      return { blocked: false, retryAfter: 0 };
    }
  } catch {
    // Redis falhou — usa fallback em memória
  }

  // Fallback em memória
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { blocked: false, retryAfter: 0 };
  }
  entry.count++;
  if (entry.count > max) {
    return { blocked: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { blocked: false, retryAfter: 0 };
}

export function createRateLimiter(opts: RateLimitOpts) {
  const { max, windowSec, prefix = 'rl' } = opts;

  return {
    /**
     * Verifica se o cliente excedeu o limite.
     * Quando userId é fornecido, aplica limite por IP E por usuário — ambos devem passar.
     * Retorna NextResponse 429 se bloqueado, ou null se liberado.
     */
    async check(req: NextRequest, userId?: string): Promise<NextResponse | null> {
      const ip = getClientIp(req);

      // Sempre checar por IP
      const ipResult = await checkKey(`${prefix}:ip:${ip}`, max, windowSec);
      if (ipResult.blocked) {
        logger.warn({ ip, prefix }, '[RATE_LIMIT] Bloqueado por IP');
        return NextResponse.json(
          { error: 'Muitas requisições. Tente novamente em alguns instantes.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(ipResult.retryAfter),
              'X-RateLimit-Limit': String(max),
              'X-RateLimit-Remaining': '0',
            },
          },
        );
      }

      // Se userId fornecido, também checar por usuário
      if (userId) {
        const userResult = await checkKey(`${prefix}:user:${userId}`, max, windowSec);
        if (userResult.blocked) {
          logger.warn({ userId, prefix }, '[RATE_LIMIT] Bloqueado por userId');
          return NextResponse.json(
            { error: 'Muitas requisições. Tente novamente em alguns instantes.' },
            {
              status: 429,
              headers: {
                'Retry-After': String(userResult.retryAfter),
                'X-RateLimit-Limit': String(max),
                'X-RateLimit-Remaining': '0',
              },
            },
          );
        }
      }

      return null; // liberado
    },
  };
}

/** Limiters pré-configurados para rotas sensíveis */
export const authLimiter     = createRateLimiter({ max: 10, windowSec: 60,   prefix: 'rl:auth' });
export const paymentLimiter  = createRateLimiter({ max: 10, windowSec: 60,   prefix: 'rl:pay' });
export const apiLimiter      = createRateLimiter({ max: 60, windowSec: 60,   prefix: 'rl:api' });
export const uploadLimiter   = createRateLimiter({ max: 10, windowSec: 3600, prefix: 'rl:upload' });
export const reviewLimiter   = createRateLimiter({ max: 5,  windowSec: 3600, prefix: 'rl:review' });
export const supportChatLimiter = createRateLimiter({ max: 10, windowSec: 3600, prefix: 'rl:support' });
export const orderLimiter    = createRateLimiter({ max: 10, windowSec: 60,   prefix: 'rl:order' });
