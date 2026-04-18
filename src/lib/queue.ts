/**
 * BullMQ — Fila de processamento de webhooks.
 *
 * Por que uma fila?
 * O Mercado Pago considera qualquer webhook que não responda em ~5s como falha
 * e retenta exponencialmente. Nosso handler atual faz consultas ao MP API
 * e ao banco dentro do request cycle — o que pode estourar esse SLA em picos.
 *
 * Fluxo com fila:
 *   1. Webhook chega → valida HMAC → enfileira payload → retorna 200 em <50ms
 *   2. Worker consome a fila e executa a lógica de negócio de forma assíncrona
 *
 * Requisito: REDIS_URL deve apontar para o mesmo Redis já usado pelo projeto.
 * BullMQ exige maxRetriesPerRequest: null na conexão ioredis.
 */
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '@/lib/logger';

function createQueueConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('[QUEUE] REDIS_URL não configurada — fila de webhooks desabilitada');
    return null;
  }
  return new IORedis(url, {
    maxRetriesPerRequest: null, // obrigatório para BullMQ
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
}

export interface WebhookJobData {
  paymentId: string;
  rawBody: string;
  type: string;
  receivedAt: string;
}

let _webhookQueue: Queue<WebhookJobData> | null = null;

export function getWebhookQueue(): Queue<WebhookJobData> | null {
  if (_webhookQueue) return _webhookQueue;

  const connection = createQueueConnection();
  if (!connection) return null;

  _webhookQueue = new Queue<WebhookJobData>('webhook:mercadopago', {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  });

  return _webhookQueue;
}
