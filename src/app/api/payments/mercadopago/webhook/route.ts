import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import logger from "@/lib/logger";
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { notifyOrderStatusChange, notifyPaymentStatus } from '@/lib/notifications';
import type { OrderStatus as OrderStatusType } from '@/lib/i18n';
import { MercadoPagoConfig, Payment } from 'mercadopago';

/**
 * Verifica a assinatura HMAC-SHA256 do webhook do Mercado Pago.
 * Retorna true se a assinatura for válida ou se a verificação estiver desabilitada.
 */
function verifyWebhookSignature(req: NextRequest, rawBody: string): boolean {
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn('MERCADO_PAGO_WEBHOOK_SECRET não configurado — aceitando webhook sem verificação');
    return true;
  }

  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';

  if (!xSignature || !xRequestId) {
    logger.warn('Webhook sem headers x-signature ou x-request-id');
    return false;
  }

  // Extrair ts e v1 do header x-signature (formato: "ts=...,v1=...")
  const parts = Object.fromEntries(
    xSignature.split(',').map(p => {
      const [k, ...rest] = p.trim().split('=');
      return [k, rest.join('=')];
    })
  );

  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // Extrair data.id do body
  let dataId = '';
  try {
    const parsed = JSON.parse(rawBody);
    dataId = parsed?.data?.id ? String(parsed.data.id) : '';
  } catch { /* ignore */ }

  // Montar template conforme docs do MP
  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', webhookSecret).update(template).digest('hex');

  return hash === v1;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verificar assinatura do webhook
    if (!verifyWebhookSignature(req, rawBody)) {
      logger.warn('Webhook Mercado Pago com assinatura inválida — rejeitado');
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    logger.info({ body }, "Webhook Mercado Pago recebido");

    // Verificar se é uma notificação de pagamento
    if (body.type !== "payment") {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID não encontrado" }, { status: 400 });
    }

    // Buscar credenciais
    const { accessToken } = getMercadoPagoKeys();

    if (!accessToken) {
      return NextResponse.json({ error: "Mercado Pago não configurado" }, { status: 500 });
    }

    // Configurar SDK
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken 
    });

    // Buscar detalhes do pagamento
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    // Atualizar pedido baseado no status do pagamento
    const orderId = paymentInfo.external_reference;

    if (orderId) {
      // 1. Buscar o pedido ANTES de atualizar para verificar o estado atual
      const currentOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!currentOrder) {
        return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
      }

      let orderStatus: OrderStatus = OrderStatus.PENDING;

      switch (paymentInfo.status) {
        case "approved":
          orderStatus = OrderStatus.CONFIRMED;
          break;
        case "rejected":
          orderStatus = OrderStatus.CANCELLED;
          break;
        case "cancelled":
          orderStatus = OrderStatus.CANCELLED;
          break;
        case "refunded":
          orderStatus = OrderStatus.REFUNDED;
          break;
        default:
          orderStatus = OrderStatus.PENDING;
      }

      // Validar transição de estado — evitar regressão de status por webhooks atrasados
      const VALID_TRANSITIONS: Record<string, string[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
        PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
        SHIPPED: ['DELIVERED', 'CANCELLED', 'REFUNDED'],
        DELIVERED: ['REFUNDED'],
      };

      const allowedNext = VALID_TRANSITIONS[currentOrder.status as string];
      if (allowedNext && !allowedNext.includes(orderStatus)) {
        logger.warn({ orderId, currentStatus: currentOrder.status, attemptedStatus: orderStatus }, 'Transição de estado inválida via webhook — ignorado');
        return NextResponse.json({ received: true, ignored: true });
      }

      // 2. Só disparar webhooks se o status mudou OU se o status de pagamento do MP mudou
      const statusChanged = currentOrder.status !== orderStatus;
      const paymentStatusChanged = currentOrder.paymentStatus !== paymentInfo.status;

      if (!statusChanged && !paymentStatusChanged) {
        logger.info({ orderId, orderStatus }, `Pedido ${orderId} já está com status ${orderStatus}. Ignorando duplicata.`);
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
              product: {
                select: { id: true, name: true, sku: true, imageUrl: true },
              },
            },
          },
        },
      });

      // 3. Só enviar para o n8n se o status do pedido mudou
      if (statusChanged) {
        await sendOrderStatusUpdate({
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          status: orderStatus as any,
          total: updated.total,
          user: updated.user,
          paymentMethod: updated.paymentMethod,
          items: updated.items,
        });

        // Criar notificação de status do pedido
        await notifyOrderStatusChange({
          userId: updated.userId,
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          status: orderStatus as OrderStatusType,
        });
      }

      // 4. Criar notificação de pagamento (só se o status do MP mudou)
      if (paymentStatusChanged) {
        await notifyPaymentStatus({
          userId: updated.userId,
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          status: paymentInfo.status === "approved" ? "approved" : paymentInfo.status === "rejected" ? "rejected" : paymentInfo.status === "refunded" ? "refunded" : "pending",
          amount: updated.total,
          paymentMethod: updated.paymentMethod,
        });
      }

      logger.info({ orderId, orderStatus, previousStatus: currentOrder.status }, `Pedido ${orderId} atualizado para ${orderStatus} (Antes: ${currentOrder.status})`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error(error as Error, 'Erro ao processar webhook');
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}
