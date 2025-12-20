import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
        id: params.id,
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

      // Cancelar automaticamente se passou de 15 minutos pendente
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (order.status === 'PENDING' && order.createdAt < fifteenMinutesAgo) {
        const cancelled = await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
          include: {
            items: {
              include: {
                product: { select: { name: true, imageUrl: true } },
              },
            },
          },
        });

        return NextResponse.json(cancelled);
      }

    return NextResponse.json(order);
  } catch (error) {
    console.error('[USER_ORDER_GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 });
  }
}
