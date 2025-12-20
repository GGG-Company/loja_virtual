import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';

const UpdateStatusSchema = z.object({
  orderNumber: z.string(),
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ]),
  trackingCode: z.string().optional(),
  trackingUrl: z.string().url().optional(),
});

/**
 * POST /api/integrations/orders/update-status
 * 
 * Webhook para atualizar status de pedidos.
 * Usado por transportadoras, Mercado Livre, ou automações externas.
 * 
 * Body:
 * {
 *   "orderNumber": "ORD-2025-000001",
 *   "status": "SHIPPED",
 *   "trackingCode": "BR123456789",
 *   "trackingUrl": "https://rastreio.correios.com.br/..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { orderNumber, status, trackingCode, trackingUrl } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      return NextResponse.json(
        { error: `Pedido ${orderNumber} não encontrado` },
        { status: 404 }
      );
    }

    // Atualizar status e tracking
    const updated = await prisma.order.update({
      where: { orderNumber },
      data: {
        status,
        trackingCode: trackingCode || order.trackingCode,
        trackingUrl: trackingUrl || order.trackingUrl,
        shippedAt: status === 'SHIPPED' ? new Date() : order.shippedAt,
        deliveredAt: status === 'DELIVERED' ? new Date() : order.deliveredAt,
      },
    });

    await sendOrderStatusUpdate({
      orderNumber: (updated as any).orderNumber,
      orderId: (updated as any).id,
      status,
      trackingCode: (updated as any).trackingCode,
      trackingUrl: (updated as any).trackingUrl,
      shippedAt: (updated as any).shippedAt,
      deliveredAt: (updated as any).deliveredAt,
    });

    // Log da integração
    await prisma.integrationLog.create({
      data: {
        endpoint: '/api/integrations/orders/update-status',
        method: 'POST',
        source: 'WEBHOOK',
        requestBody: body,
        statusCode: 200,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: updated.orderNumber,
        status: updated.status,
        trackingCode: updated.trackingCode,
      },
    });
  } catch (error) {
    console.error('[ORDER STATUS UPDATE ERROR]', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status do pedido' },
      { status: 500 }
    );
  }
}
