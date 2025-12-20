import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    const role = session?.user?.role as 'ADMIN' | 'OWNER' | undefined;

    if (!session || !role || !['ADMIN', 'OWNER'].includes(role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const [totalProducts, totalOrders, pendingOrders, totalRevenue, recentOrders, lowStockProducts] =
      await Promise.all([
        prisma.product.count(),
        prisma.order.count(),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.aggregate({
          where: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } },
          _sum: { total: true },
        }),
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.product.findMany({
          where: { stock: { lte: 10 } },
          take: 5,
          orderBy: { stock: 'asc' },
          select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
          },
        }),
      ]);

    return NextResponse.json({
      totalProducts,
      totalOrders,
      pendingOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      recentOrders,
      lowStockProducts,
    });
  } catch (error) {
    console.error('[ADMIN_STATS]', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
