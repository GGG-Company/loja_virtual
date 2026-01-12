import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { notifyOrderStatusChange, notifyPaymentStatus } from '@/lib/notifications';
import type { OrderStatus as OrderStatusType } from '@/lib/i18n';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Webhook Mercado Pago recebido:", body);

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

    // Configurar SDK dinamicamente
    const MercadoPagoModule = await import("mercadopago");
    const MercadoPagoLib = (MercadoPagoModule as any).default ?? MercadoPagoModule;
    const client = new (MercadoPagoLib as any).MercadoPagoConfig({ accessToken });
    // Buscar detalhes do pagamento
    const payment = new (MercadoPagoLib as any).Payment(client);
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
        console.log(`Pedido ${orderId} já está com status ${orderStatus}. Ignorando duplicata.`);
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

      console.log(`Pedido ${orderId} atualizado para ${orderStatus} (Antes: ${currentOrder.status})`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}
