import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { notifyOrderStatusChange } from '@/lib/notifications';
import type { OrderStatus } from '@/lib/i18n';

/** Transições válidas de status — evita pular etapas (ex: PENDING → DELIVERED) */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED', 'CANCELLED'],
  DELIVERED:  ['REFUNDED'],
  CANCELLED:  [],
  REFUNDED:   [],
};

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

export async function POST(request: NextRequest) {
  try {
    // Autenticação obrigatória via API key
    const apiKey = request.headers.get('X-INTERNAL-API-KEY');
    const validKey = process.env.X_INTERNAL_API_KEY;
    if (!validKey || !apiKey || apiKey !== validKey) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

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

    // Validar transição de estado
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Transição inválida: ${order.status} → ${status}` },
        { status: 422 }
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
      include: {
        user: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, imageUrl: true }
            }
          }
        }
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
      user: (updated as any).user,
      total: (updated as any).total,
      items: (updated as any).items,
    });

    // Notificar o cliente sobre a mudança de status
    await notifyOrderStatusChange({
      userId: updated.userId,
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: status as OrderStatus,
      trackingCode: updated.trackingCode,
      trackingUrl: updated.trackingUrl,
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
    logger.error(error instanceof Error ? error : new Error(String(error)), '[ORDER STATUS UPDATE ERROR]');
    return NextResponse.json(
      { error: 'Erro ao atualizar status do pedido' },
      { status: 500 }
    );
  }
}
