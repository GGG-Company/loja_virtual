import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { toNum, serializeItems } from '@/lib/decimal-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: user.id,
      },
        select: {
          id: true,
          createdAt: true,
          status: true,
          subtotal: true,
          discount: true,
          shipping: true,
          total: true,
          paymentMethod: true,
          installments: true,
          shippingAddress: true,
          trackingCode: true,
          trackingUrl: true,
          paidAt: true,
          shippedAt: true,
          deliveredAt: true,
          orderNumber: true,
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

      // Cancelar automaticamente se passou de 30 minutos pendente
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (order.status === 'PENDING' && order.createdAt < thirtyMinutesAgo) {
        const cancelled = await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
          include: {
            items: {
              include: {
                product: { select: { name: true, imageUrl: true } },
              },
            },
            user: true,
          },
        });

        await sendOrderStatusUpdate({
          orderId: cancelled.id,
          orderNumber: cancelled.orderNumber,
          status: 'CANCELLED',
          total: toNum(cancelled.total),
          user: cancelled.user,
          items: serializeItems(cancelled.items),
        });

        return NextResponse.json({
          ...cancelled,
          total: toNum(cancelled.total),
          subtotal: toNum(cancelled.subtotal),
          shipping: toNum(cancelled.shipping),
          discount: toNum(cancelled.discount),
          items: serializeItems(cancelled.items),
        });
      }

    return NextResponse.json({
      ...order,
      total: toNum(order.total),
      subtotal: toNum(order.subtotal),
      shipping: toNum(order.shipping),
      discount: toNum(order.discount),
      items: serializeItems(order.items),
    });
  } catch (error) {
    logger.error(error as Error, '[USER_ORDER_GET]');
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();

    if (body.action !== 'cancel') {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id, userId: user.id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: 'Apenas pedidos pendentes podem ser cancelados' }, { status: 400 });
    }

    // Restore stock for each item
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const cancelled = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: {
        items: { include: { product: { select: { name: true, imageUrl: true } } } },
        user: true,
      },
    });

    await sendOrderStatusUpdate({
      orderId: cancelled.id,
      orderNumber: cancelled.orderNumber,
      status: 'CANCELLED',
      total: toNum(cancelled.total),
      user: cancelled.user,
      items: serializeItems(cancelled.items),
    });

    return NextResponse.json({
      ...cancelled,
      total: toNum(cancelled.total),
      subtotal: toNum(cancelled.subtotal),
      shipping: toNum(cancelled.shipping),
      discount: toNum(cancelled.discount),
      items: serializeItems(cancelled.items),
    });
  } catch (error) {
    logger.error(error as Error, '[USER_ORDER_CANCEL]');
    return NextResponse.json({ error: 'Erro ao cancelar pedido' }, { status: 500 });
  }
}
