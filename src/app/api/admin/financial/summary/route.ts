import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const COMPLETED_STATUS = ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'];
const PENDING_STATUS = ['PENDING'];
const REFUND_STATUS = ['REFUNDED', 'CANCELLED'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const statusParam = searchParams.get('status');
    const minTotalParam = searchParams.get('minTotal');
    const maxTotalParam = searchParams.get('maxTotal');
    const productQuery = searchParams.get('productQuery');
    const criticalOnly = searchParams.get('criticalOnly') === 'true';
    const includeOrders = searchParams.get('includeOrders') !== 'false';
    const includeStock = searchParams.get('includeStock') === 'true';
    const includeStatusBreakdown = searchParams.get('includeStatusBreakdown') === 'true';

    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setMonth(defaultStart.getMonth() - 5, 1);
    defaultStart.setHours(0, 0, 0, 0);

    const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
    const endDate = endDateParam ? new Date(endDateParam) : now;
    endDate.setHours(23, 59, 59, 999);

    const statusFilter = (statusParam || 'ALL').toUpperCase();
    const allowedStatus = ['ALL', 'COMPLETED', 'PENDING', 'REFUNDED'];
    const status = allowedStatus.includes(statusFilter) ? statusFilter : 'ALL';

    const statusWhere = (() => {
      if (status === 'COMPLETED') return { status: { in: COMPLETED_STATUS as any } };
      if (status === 'PENDING') return { status: { in: PENDING_STATUS as any } };
      if (status === 'REFUNDED') return { status: { in: REFUND_STATUS as any } };
      return {};
    })();

    const minTotal = minTotalParam ? Number(minTotalParam) : undefined;
    const maxTotal = maxTotalParam ? Number(maxTotalParam) : undefined;

    const orders = includeOrders
      ? await prisma.order.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            ...statusWhere,
            ...(minTotal !== undefined ? { total: { gte: minTotal } } : {}),
            ...(maxTotal !== undefined ? { total: { lte: maxTotal } } : {}),
          },
          select: { id: true, status: true, total: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const orderIds = orders.map((o) => o.id);

    const items = includeOrders && orderIds.length
      ? await prisma.orderItem.findMany({
          where: { orderId: { in: orderIds } },
          select: {
            orderId: true,
            productId: true,
            quantity: true,
            subtotal: true,
            product: { select: { name: true } },
          },
        })
      : [];

    let totalRevenue = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    const statusBreakdown: Record<string, number> = {};

    const monthlyMap: Record<string, { total: number; orders: number }> = {};

    for (const o of orders) {
      const isCompleted = COMPLETED_STATUS.includes(o.status as string);
      const isPending = PENDING_STATUS.includes(o.status as string);
      const isRefunded = REFUND_STATUS.includes(o.status as string);

      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;

      if (isCompleted) {
        totalRevenue += o.total;
        completedCount += 1;
      }
      if (isPending) pendingCount += 1;
      if (isRefunded) refundedCount += 1;

      const key = monthKey(o.createdAt);
      if (!monthlyMap[key]) monthlyMap[key] = { total: 0, orders: 0 };
      monthlyMap[key].total += o.total;
      monthlyMap[key].orders += 1;
    }

    const monthlyRevenue = Object.entries(monthlyMap)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, data]) => ({ month, ...data }));

    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const item of items) {
      const key = item.productId;
      if (!productMap[key]) {
        productMap[key] = {
          name: item.product?.name || 'Produto removido',
          qty: 0,
          revenue: 0,
        };
      }
      productMap[key].qty += item.quantity;
      productMap[key].revenue += item.subtotal;
    }

    let topProducts = Object.entries(productMap)
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    if (productQuery) {
      const q = productQuery.toLowerCase();
      topProducts = topProducts.filter((p) => p.name.toLowerCase().includes(q));
    }

    const avgTicket = completedCount > 0 ? totalRevenue / completedCount : 0;

    let stockSummary: any = null;
    let lowStockItems: any[] = [];

    if (includeStock) {
      const products = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          minStock: true,
          price: true,
        },
      });

      let totalItems = products.length;
      let lowStockCount = 0;
      let zeroStockCount = 0;
      let negativeStockCount = 0;
      let totalStockValue = 0;

      for (const p of products) {
        if (p.stock <= p.minStock && p.stock > 0) lowStockCount += 1;
        if (p.stock === 0) zeroStockCount += 1;
        if (p.stock < 0) negativeStockCount += 1;
        totalStockValue += (p.price || 0) * p.stock;
      }

      lowStockItems = products
        .filter((p) => p.stock <= p.minStock)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 20);

      if (criticalOnly) {
        stockSummary = {
          totalItems,
          lowStockCount,
          zeroStockCount,
          negativeStockCount,
          totalStockValue,
        };
        lowStockItems = lowStockItems.slice(0, 20);
      }

      stockSummary = {
        totalItems,
        lowStockCount,
        zeroStockCount,
        negativeStockCount,
        totalStockValue,
      };
    }

    return NextResponse.json({
      totalRevenue: includeOrders ? totalRevenue : null,
      pendingCount: includeOrders ? pendingCount : null,
      refundedCount: includeOrders ? refundedCount : null,
      avgTicket: includeOrders ? avgTicket : null,
      ordersCount: includeOrders ? orders.length : null,
      monthlyRevenue: includeOrders ? monthlyRevenue : [],
      topProducts: includeOrders ? topProducts : [],
      statusBreakdown: includeOrders && includeStatusBreakdown ? statusBreakdown : undefined,
      stockSummary: includeStock ? stockSummary : undefined,
      lowStockItems: includeStock ? lowStockItems : undefined,
      filters: {
        startDate,
        endDate,
        status,
        minTotal,
        maxTotal,
        productQuery,
        criticalOnly,
        includeOrders,
        includeStock,
        includeStatusBreakdown,
      },
    });
  } catch (error) {
    console.error('[FINANCIAL_SUMMARY_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
