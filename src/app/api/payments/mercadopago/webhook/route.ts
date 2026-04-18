/**
 * POST /api/payments/mercadopago/webhook
 *
 * Responsabilidades DESTE HANDLER (mínimas, intencionalmente):
 *   1. Verificar assinatura HMAC-SHA256
 *   2. Enfileirar o payload no BullMQ
 *   3. Retornar 200 OK em <50ms
 *
 * Todo o processamento de negócio (buscar pagamento no MP, atualizar pedido,
 * disparar notificações) acontece de forma assíncrona no worker.
 *
 * Fallback: se Redis/BullMQ indisponível, processa de forma síncrona (mantém
 * compatibilidade com ambiente de desenvolvimento sem Redis).
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { getMercadoPagoConfig } from '@/lib/mercadopago-config';
import { getWebhookQueue } from '@/lib/queue';
import { processWebhookPayment } from '@/lib/webhook-processor';

/**
 * Verifica a assinatura HMAC-SHA256 do webhook do Mercado Pago.
 * Formato: "ts=<timestamp>,v1=<hash>"
 * Template: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
async function verifyWebhookSignature(
  req: NextRequest,
  rawBody: string,
): Promise<boolean> {
  const webhookSecret =
    process.env.MERCADO_PAGO_WEBHOOK_SECRET ||
    process.env.MP_WEBHOOK_SECRET ||
    (await getMercadoPagoConfig())?.webhookSecret;

  if (!webhookSecret) {
    logger.warn('[WEBHOOK] Secret não configurado — aceitando sem verificação');
    return true;
  }

  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';

  if (!xSignature || !xRequestId) {
    logger.warn('[WEBHOOK] Headers x-signature ou x-request-id ausentes');
    return false;
  }

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [k, ...rest] = p.trim().split('=');
      return [k, rest.join('=')];
    }),
  );

  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  let dataId = '';
  try {
    dataId = String(JSON.parse(rawBody)?.data?.id ?? '');
  } catch { /* ignore */ }

  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', webhookSecret).update(template).digest('hex');
  return hash === v1;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    if (!await verifyWebhookSignature(req, rawBody)) {
      logger.warn('[WEBHOOK] Assinatura inválida — rejeitado');
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    logger.info({ type: body.type, dataId: body.data?.id }, '[WEBHOOK] Recebido');

    if (body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID ausente' }, { status: 400 });
    }

    // ── Tentar enfileirar no BullMQ ───────────────────────────────────────
    const queue = getWebhookQueue();

    if (queue) {
      await queue.add('process-payment', {
        paymentId: String(paymentId),
        rawBody,
        type: body.type,
        receivedAt: new Date().toISOString(),
      }, {
        jobId: `mp-${paymentId}`, // deduplicação nativa do BullMQ
      });

      logger.info({ paymentId }, '[WEBHOOK] Enfileirado para processamento assíncrono');
      return NextResponse.json({ received: true, queued: true });
    }

    // ── Fallback: sem Redis → processar sincronamente ─────────────────────
    logger.warn('[WEBHOOK] BullMQ indisponível — processando de forma síncrona (fallback)');
    const result = await processWebhookPayment(paymentId);
    logger.info({ paymentId, result }, '[WEBHOOK] Processado via fallback síncrono');
    return NextResponse.json({ received: true, queued: false, result });

  } catch (error) {
    logger.error(error as Error, '[WEBHOOK] Erro ao receber webhook');
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}
