/**
 * Worker BullMQ — Processador assíncrono de webhooks do Mercado Pago.
 *
 * Iniciar em produção:
 *   REDIS_URL=redis://... DATABASE_URL=postgresql://... npx tsx scripts/worker.ts
 *
 * Ou via npm:
 *   npm run worker
 *
 * O worker deve rodar como processo separado do servidor Next.js.
 * Em produção com PM2:
 *   pm2 start --name feira-worker --interpreter tsx scripts/worker.ts
 *
 * Estratégia de retentativas (configurada em src/lib/queue.ts):
 *   - 5 tentativas com backoff exponencial (2s, 4s, 8s, 16s, 32s)
 *   - Após 5 falhas o job vai para "failed" (visível no Bull Dashboard)
 */

// Resolve path aliases (@/*) sem o servidor Next.js
import { register } from 'tsconfig-paths';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const tsconfig = JSON.parse(readFileSync(resolve(__dirname, '../tsconfig.json'), 'utf8'));
register({
  baseUrl: resolve(__dirname, '..'),
  paths: tsconfig.compilerOptions.paths,
});

// ── Imports após registro dos paths ──────────────────────────────────────
import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { processWebhookPayment } from '../src/lib/webhook-processor';
import type { WebhookJobData } from '../src/lib/queue';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.stdout.isTTY
    ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname', translateTime: 'HH:MM:ss' } }
    : undefined,
});

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  logger.error('REDIS_URL não configurada — worker não pode iniciar');
  process.exit(1);
}

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // obrigatório para BullMQ
  enableReadyCheck: false,
});

const worker = new Worker<WebhookJobData>(
  'webhook:mercadopago',
  async (job: Job<WebhookJobData>) => {
    const { paymentId, receivedAt } = job.data;
    const latencyMs = Date.now() - new Date(receivedAt).getTime();

    logger.info({ jobId: job.id, paymentId, latencyMs }, '[WORKER] Processando job');

    const result = await processWebhookPayment(paymentId);

    logger.info({ jobId: job.id, paymentId, result }, '[WORKER] Job concluído');
    return result;
  },
  {
    connection,
    concurrency: 5,        // até 5 pagamentos em paralelo
    limiter: {
      max: 10,             // max 10 jobs
      duration: 1000,      // por segundo (respeita rate limit do MP API)
    },
  },
);

worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, '[WORKER] ✓ Concluído');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message, attempts: job?.attemptsMade }, '[WORKER] ✗ Falhou');
});

worker.on('error', (err) => {
  logger.error({ err: err.message }, '[WORKER] Erro de conexão');
});

process.on('SIGTERM', async () => {
  logger.info('[WORKER] SIGTERM recebido — graceful shutdown...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[WORKER] SIGINT recebido — encerrando...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

logger.info('[WORKER] Aguardando jobs na fila webhook:mercadopago...');
