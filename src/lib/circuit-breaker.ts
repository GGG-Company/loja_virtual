/**
 * Circuit Breaker simples com backend Redis.
 *
 * Estados:
 *   CLOSED  — operações normais
 *   OPEN    — falhas acima do threshold; rejeita imediatamente sem chamar fn
 *   HALF    — após cooldown, deixa UMA chamada passar para testar recuperação
 *
 * Uso:
 *   const result = await withCircuitBreaker('melhor-envio', callMelhorEnvio, null, {
 *     failThreshold: 5,    // abre após 5 falhas consecutivas
 *     cooldownSec: 60,     // tenta se recuperar após 60s
 *   });
 */

import { getRedisPublisher } from './redis';
import logger from './logger';

interface CircuitBreakerOpts {
  /** Número de falhas consecutivas para abrir o circuito */
  failThreshold?: number;
  /** Segundos até tentar fechar o circuito novamente */
  cooldownSec?: number;
}

export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: T,
  opts: CircuitBreakerOpts = {},
): Promise<T> {
  const { failThreshold = 5, cooldownSec = 60 } = opts;
  const failKey  = `cb:fail:${name}`;
  const openKey  = `cb:open:${name}`;
  const halfKey  = `cb:half:${name}`;

  const redis = getRedisPublisher();

  if (redis) {
    // Circuito aberto?
    const isOpen = await redis.exists(openKey);
    if (isOpen) {
      // Verificar se já passou o cooldown e podemos testar com HALF
      const halfSet = await redis.set(halfKey, '1', 'EX', cooldownSec, 'NX');
      if (!halfSet) {
        // Cooldown ainda não expirou — rejeitar sem chamar fn
        logger.warn({ name }, '[CB] Circuito aberto — usando fallback');
        return fallback;
      }
      // halfSet === OK → somos a sondagem do HALF_OPEN — deixar passar
      logger.info({ name }, '[CB] Circuito HALF_OPEN — sondando recuperação');
    }
  }

  try {
    const result = await fn();

    // Sucesso → resetar contadores
    if (redis) {
      await Promise.allSettled([
        redis.del(failKey),
        redis.del(openKey),
        redis.del(halfKey),
      ]);
    }

    return result;
  } catch (err) {
    if (redis) {
      const failures = await redis.incr(failKey);
      // TTL só na primeira falha (janela deslizante de 2× cooldown)
      if (failures === 1) await redis.expire(failKey, cooldownSec * 2);

      if (failures >= failThreshold) {
        await redis.set(openKey, '1', 'EX', cooldownSec * 2);
        logger.error({ name, failures }, '[CB] Circuito ABERTO após falhas consecutivas');
      } else {
        logger.warn({ name, failures, failThreshold }, '[CB] Falha registrada');
      }
    }

    return fallback;
  }
}
