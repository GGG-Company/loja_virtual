import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import logger from "@/lib/logger";
import { getMercadoPagoKeys, getMercadoPagoConfig } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { notifyOrderStatusChange, notifyPaymentStatus } from '@/lib/notifications';
import type { OrderStatus as OrderStatusType } from '@/lib/i18n';
import { MercadoPagoConfig, Payment } from 'mercadopago';

async function verifyMercadoPagoSignature(req: NextRequest, paymentId: string | undefined): Promise<boolean> {
  const webhookSecret = process.env.MP_WEBHOOK_SECRET || (await getMercadoPagoConfig())?.webhookSecret;
  if (!webhookSecret) {
    logger.warn('MP_WEBHOOK_SECRET not configured — skipping signature verification');
    return true; // allow through but log the warning
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');

  if (!xSignature || !xRequestId) {
    return false;
  }

  // x-signature format: "ts=<timestamp>,v1=<hash>"
  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')));
  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) {
    return false;
  }

  // MercadoPago manifest format: id:<data.id>;request-date:<x-request-id>;ts:<ts>;
  const manifest = `id:${paymentId};request-date:${xRequestId};ts:${ts};`;
  const expectedHash = createHmac('sha256', webhookSecret).update(manifest).digest('hex');

  return expectedHash === v1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    logger.info({ body }, "Webhook Mercado Pago recebido");

    // Verificar assinatura do webhook
    const paymentId = body.data?.id;
    const signatureValid = await verifyMercadoPagoSignature(req, paymentId);
    if (!signatureValid) {
      logger.warn({ paymentId }, 'Webhook Mercado Pago com assinatura inválida ou ausente');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Verificar se é uma notificação de pagamento
    if (body.type !== "payment") {
      return NextResponse.json({ received: true });
    }

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

      // 2. Só disparar webhooks se o status mudou OU se o status de pagamento do MP mudou
      // Isso evita webhooks duplicados em notificações repetidas do Mercado Pago
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
  } catch (error) {
    logger.error(error as Error, 'Erro ao processar webhook');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}
