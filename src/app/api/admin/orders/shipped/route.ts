import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    if (role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Garantir que pendentes expirados sejam cancelados antes de listar enviados/afins
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await prisma.order.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: fifteenMinutesAgo },
      },
      data: { status: 'CANCELLED' },
    });

    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
                specs: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('[ADMIN_SHIPPED_ORDERS_GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar pedidos enviados' }, { status: 500 });
  }
}
