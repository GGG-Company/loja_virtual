/**
 * Processador de webhooks do Mercado Pago.
 *
 * Lógica de negócio extraída do handler HTTP para ser consumida
 * tanto pelo worker BullMQ quanto (opcionalmente) de forma síncrona.
 *
 * Responsabilidades:
 * - Idempotência via Redis (evita duplo processamento em retentativas do MP)
 * - Buscar dados do pagamento na API do MP
 * - Validar transições de status (evita regressões por webhooks atrasados)
 * - Atualizar o pedido no banco
 * - Disparar notificações (n8n, in-app)
 */
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { notifyOrderStatusChange, notifyPaymentStatus } from '@/lib/notifications';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getRedisPublisher } from '@/lib/redis';
import { toNum, serializeItems } from '@/lib/decimal-helpers';
import { OrderStatus } from '@prisma/client';
import type { OrderStatus as OrderStatusType } from '@/lib/i18n';
import { createHiperOrder } from '@/lib/hiper';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED:    ['DELIVERED', 'CANCELLED', 'REFUNDED'],
  DELIVERED:  ['REFUNDED'],
};

export type ProcessResult =
  | { status: 'processed'; orderId: string; orderStatus: string }
  | { status: 'ignored'; reason: string }
  | { status: 'error'; reason: string };

export async function processWebhookPayment(
  paymentId: string | number,
): Promise<ProcessResult> {
  // ── Idempotência ──────────────────────────────────────────────────────
  const redis = getRedisPublisher();
  if (redis) {
    const idempotencyKey = `webhook:mp:${paymentId}`;
    const set = await redis.set(idempotencyKey, '1', 'EX', 86400, 'NX');
    if (!set) {
      logger.info({ paymentId }, '[WEBHOOK_PROC] Duplicata ignorada (idempotência Redis)');
      return { status: 'ignored', reason: 'duplicate' };
    }
  }

  // ── Buscar dados do pagamento no MP ───────────────────────────────────
  const { accessToken } = getMercadoPagoKeys();
  if (!accessToken) {
    return { status: 'error', reason: 'Mercado Pago não configurado' };
  }

  const client = new MercadoPagoConfig({ accessToken });
  const paymentAPI = new Payment(client);
  const paymentInfo = await paymentAPI.get({ id: String(paymentId) });

  const orderId = paymentInfo.external_reference;
  if (!orderId) {
    logger.info({ paymentId }, '[WEBHOOK_PROC] Sem external_reference — ignorado');
    return { status: 'ignored', reason: 'no external_reference' };
  }

  // ── Validar pedido ────────────────────────────────────────────────────
  const currentOrder = await prisma.order.findUnique({ where: { id: orderId } });
  if (!currentOrder) {
    return { status: 'error', reason: `Pedido ${orderId} não encontrado` };
  }

  // ── Mapear status ─────────────────────────────────────────────────────
  let orderStatus: OrderStatus = OrderStatus.PENDING;
  switch (paymentInfo.status) {
    case 'approved':  orderStatus = OrderStatus.CONFIRMED;  break;
    case 'rejected':  orderStatus = OrderStatus.CANCELLED;  break;
    case 'cancelled': orderStatus = OrderStatus.CANCELLED;  break;
    case 'refunded':  orderStatus = OrderStatus.REFUNDED;   break;
    default:          orderStatus = OrderStatus.PENDING;
  }

  // ── Validar transição ─────────────────────────────────────────────────
  const allowedNext = VALID_TRANSITIONS[currentOrder.status as string];
  if (allowedNext && !allowedNext.includes(orderStatus)) {
    logger.warn(
      { orderId, currentStatus: currentOrder.status, attemptedStatus: orderStatus },
      '[WEBHOOK_PROC] Transição inválida — ignorado',
    );
    return { status: 'ignored', reason: 'invalid_transition' };
  }

  const statusChanged = currentOrder.status !== orderStatus;
  const paymentStatusChanged = currentOrder.paymentStatus !== paymentInfo.status;

  if (!statusChanged && !paymentStatusChanged) {
    return { status: 'ignored', reason: 'no_change' };
  }

  // ── Atualizar pedido ──────────────────────────────────────────────────
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: orderStatus, paymentStatus: paymentInfo.status, updatedAt: new Date() },
    include: {
      user: true,
      items: {
        include: { product: { select: { id: true, name: true, sku: true, imageUrl: true, externalIdHiper: true } } },
      },
    },
  });

  // ── Notificações (fire-and-forget) ────────────────────────────────────
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
        logger.error(r.reason, '[WEBHOOK_PROC] Notificação pós-webhook falhou');
      }
    });
    logger.info({ orderId, orderStatus, previousStatus: currentOrder.status },
      `[WEBHOOK_PROC] Pedido ${orderId} → ${orderStatus}`);
  });

  // ── Enviar pedido ao Hiper quando confirmado ──────────────────────────
  if (orderStatus === OrderStatus.CONFIRMED && process.env.HIPER_API_SECRET_KEY) {
    const itemsWithHiper = updated.items.filter((i) => (i.product as any).externalIdHiper);

    if (itemsWithHiper.length > 0) {
      const addr = updated.shippingAddress as any;

      createHiperOrder({
        orderNumber: updated.orderNumber,
        total: toNum(updated.total),
        shipping: toNum(updated.shipping),
        installments: updated.installments,
        paymentMethod: updated.paymentMethod,
        customer: {
          name: updated.user?.name || addr?.name || 'Cliente',
          email: updated.user?.email || addr?.email || '',
          cpf: addr?.cpf || '',
        },
        address: {
          street: addr?.street || '',
          number: addr?.number || 'S/N',
          complement: addr?.complement,
          neighborhood: addr?.neighborhood || '',
          city: addr?.city || '',
          state: addr?.state || '',
          zip: addr?.zip || '',
        },
        items: itemsWithHiper.map((item) => ({
          hiperProductId: (item.product as any).externalIdHiper!,
          quantity: item.quantity,
          unitPrice: toNum(item.price),
          netPrice: toNum(item.subtotal) / item.quantity,
        })),
      }).then(async (hiperResult) => {
        if (hiperResult.success && hiperResult.hiperOrderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { hiperOrderId: hiperResult.hiperOrderId },
          });
          logger.info('[WEBHOOK_PROC] Pedido enviado ao Hiper: %s', hiperResult.hiperOrderId);
        } else {
          logger.warn('[WEBHOOK_PROC] Falha ao enviar pedido ao Hiper: %s', hiperResult.error);
        }
      }).catch((err) => {
        logger.error(err as Error, '[WEBHOOK_PROC] Exceção ao enviar pedido ao Hiper');
      });
    } else {
      logger.info('[WEBHOOK_PROC] Pedido %s sem itens vinculados ao Hiper — ignorado', orderId);
    }
  }

  return { status: 'processed', orderId, orderStatus };
}
