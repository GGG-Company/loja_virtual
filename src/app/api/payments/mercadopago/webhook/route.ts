import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import logger from "@/lib/logger";
import { getMercadoPagoKeys, getMercadoPagoConfig } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { notifyOrderStatusChange, notifyPaymentStatus } from '@/lib/notifications';
import type { OrderStatus as OrderStatusType } from '@/lib/i18n';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getRedisPublisher } from '@/lib/redis';
import { toNum, serializeItems } from '@/lib/decimal-helpers';

/**
 * Verifica a assinatura HMAC-SHA256 do webhook do Mercado Pago.
 * Formato do header x-signature: "ts=<timestamp>,v1=<hash>"
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
    logger.warn('Webhook secret não configurado — aceitando sem verificação');
    return true;
  }

  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';

  if (!xSignature || !xRequestId) {
    logger.warn('Webhook sem headers x-signature ou x-request-id');
    return false;
  }

  // Parsear "ts=...,v1=..."
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
    const parsed = JSON.parse(rawBody);
    dataId = parsed?.data?.id ? String(parsed.data.id) : '';
  } catch { /* ignore */ }

  // Template conforme documentação oficial do Mercado Pago
  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', webhookSecret).update(template).digest('hex');

  return hash === v1;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    if (!await verifyWebhookSignature(req, rawBody)) {
      logger.warn('Webhook Mercado Pago com assinatura inválida — rejeitado');
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    logger.info({ type: body.type, dataId: body.data?.id }, 'Webhook Mercado Pago recebido');

    if (body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID não encontrado' }, { status: 400 });
    }

    // ── Idempotência: evitar duplo processamento em retentativas do MP ──
    const redis = getRedisPublisher();
    if (redis) {
      const idempotencyKey = `webhook:mp:${paymentId}`;
      const set = await redis.set(idempotencyKey, '1', 'EX', 86400, 'NX');
      if (!set) {
        logger.info({ paymentId }, 'Webhook duplicado ignorado (idempotência Redis)');
        return NextResponse.json({ received: true, ignored: true });
      }
    }

    const { accessToken } = getMercadoPagoKeys();
    if (!accessToken) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    const orderId = paymentInfo.external_reference;
    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const currentOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!currentOrder) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    let orderStatus: OrderStatus = OrderStatus.PENDING;
    switch (paymentInfo.status) {
      case 'approved':  orderStatus = OrderStatus.CONFIRMED;  break;
      case 'rejected':  orderStatus = OrderStatus.CANCELLED;  break;
      case 'cancelled': orderStatus = OrderStatus.CANCELLED;  break;
      case 'refunded':  orderStatus = OrderStatus.REFUNDED;   break;
      default:          orderStatus = OrderStatus.PENDING;
    }

    // Prevenir regressão de status por webhooks atrasados
    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING:    ['CONFIRMED', 'CANCELLED'],
      CONFIRMED:  ['PROCESSING', 'CANCELLED', 'REFUNDED'],
      PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
      SHIPPED:    ['DELIVERED', 'CANCELLED', 'REFUNDED'],
      DELIVERED:  ['REFUNDED'],
    };

    const allowedNext = VALID_TRANSITIONS[currentOrder.status as string];
    if (allowedNext && !allowedNext.includes(orderStatus)) {
      logger.warn(
        { orderId, currentStatus: currentOrder.status, attemptedStatus: orderStatus },
        'Transição de estado inválida via webhook — ignorado',
      );
      return NextResponse.json({ received: true, ignored: true });
    }

    const statusChanged = currentOrder.status !== orderStatus;
    const paymentStatusChanged = currentOrder.paymentStatus !== paymentInfo.status;

    if (!statusChanged && !paymentStatusChanged) {
      logger.info({ orderId, orderStatus }, 'Status sem alteração — ignorando duplicata');
      return NextResponse.json({ received: true, ignored: true });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: orderStatus,
        paymentStatus: paymentInfo.status,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, imageUrl: true } },
          },
        },
      },
    });

    // ── Retornar 200 imediatamente; notificações em background ──
    // O MP considera qualquer demora > 5s como falha e retenta.
    const response = NextResponse.json({ received: true });

    Promise.allSettled([
      statusChanged
        ? sendOrderStatusUpdate({
            orderId: updated.id,
            orderNumber: updated.orderNumber,
            status: orderStatus as any,
            total: toNum(updated.total),
            user: updated.user,
            paymentMethod: updated.paymentMethod,
            items: serializeItems(updated.items),
          })
        : Promise.resolve(),

      statusChanged
        ? notifyOrderStatusChange({
            userId: updated.userId,
            orderId: updated.id,
            orderNumber: updated.orderNumber,
            status: orderStatus as OrderStatusType,
          })
        : Promise.resolve(),

      paymentStatusChanged
        ? notifyPaymentStatus({
            userId: updated.userId,
            orderId: updated.id,
            orderNumber: updated.orderNumber,
            status:
              paymentInfo.status === 'approved' ? 'approved'
              : paymentInfo.status === 'rejected' ? 'rejected'
              : paymentInfo.status === 'refunded' ? 'refunded'
              : 'pending',
            amount: toNum(updated.total),
            paymentMethod: updated.paymentMethod,
          })
        : Promise.resolve(),
    ]).then((results) => {
      results.forEach((r) => {
        if (r.status === 'rejected') {
          logger.error(r.reason, 'Post-webhook notification failed');
        }
      });
      logger.info(
        { orderId, orderStatus, previousStatus: currentOrder.status },
        `Pedido ${orderId} atualizado para ${orderStatus}`,
      );
    });

    return response;
  } catch (error) {
    logger.error(error as Error, 'Erro ao processar webhook');
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}
