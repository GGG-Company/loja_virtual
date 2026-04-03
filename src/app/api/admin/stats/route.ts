import logger from "@/lib/logger";
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
            orderNumber: true,
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
      totalRevenue: Number(totalRevenue._sum.total ?? 0),
      recentOrders: recentOrders.map(o => ({ ...o, total: Number(o.total) })),
      lowStockProducts,
    });
  } catch (error) {
    logger.error(error, '[ADMIN_STATS]');
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
