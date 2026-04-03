import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";
import { toNum } from '@/lib/decimal-helpers';

export const dynamic = 'force-dynamic';

const COMPLETED_STATUS = ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'];
const PENDING_STATUS = ['PENDING'];
const REFUND_STATUS = ['REFUNDED', 'CANCELLED'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function calcMetrics(orders: { id: string; status: string; total: any }[]) {
  let revenue = 0;
  let completed = 0;
  let pending = 0;
  let refunded = 0;

  for (const o of orders) {
    if (COMPLETED_STATUS.includes(o.status)) { revenue += toNum(o.total); completed++; }
    if (PENDING_STATUS.includes(o.status)) pending++;
    if (REFUND_STATUS.includes(o.status)) refunded++;
  }

  return {
    revenue,
    ordersCount: orders.length,
    completedCount: completed,
    pendingCount: pending,
    refundedCount: refunded,
    avgTicket: completed > 0 ? revenue / completed : 0,
  };
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

    // Previous period: same duration, ending just before startDate
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - periodMs);

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

    const valueWhere = {
      ...(minTotal !== undefined ? { total: { gte: minTotal } } : {}),
      ...(maxTotal !== undefined ? { total: { lte: maxTotal } } : {}),
    };

    // ── Current period ────────────────────────────────────────────────────────
    const [orders, prevOrders] = await Promise.all([
      includeOrders
        ? prisma.order.findMany({
            where: { createdAt: { gte: startDate, lte: endDate }, ...statusWhere, ...valueWhere },
            select: { id: true, status: true, total: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
      includeOrders
        ? prisma.order.findMany({
            where: { createdAt: { gte: prevStart, lte: prevEnd }, ...statusWhere, ...valueWhere },
            select: { id: true, status: true, total: true },
          })
        : Promise.resolve([]),
    ]);

    const orderIds = orders.map((o) => o.id);
    const prevOrderIds = prevOrders.map((o) => o.id);

    const [items, prevItems] = await Promise.all([
      includeOrders && orderIds.length
        ? prisma.orderItem.findMany({
            where: { orderId: { in: orderIds } },
            select: {
              orderId: true,
              productId: true,
              quantity: true,
              subtotal: true,
              product: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      includeOrders && prevOrderIds.length
        ? prisma.orderItem.findMany({
            where: { orderId: { in: prevOrderIds } },
            select: { quantity: true },
          })
        : Promise.resolve([]),
    ]);

    // ── Current metrics ───────────────────────────────────────────────────────
    const curr = calcMetrics(orders);
    const prev = calcMetrics(prevOrders);

    const productsSold = items.reduce((sum, i) => sum + i.quantity, 0);
    const prevProductsSold = prevItems.reduce((sum, i) => sum + i.quantity, 0);

    const statusBreakdown: Record<string, number> = {};
    const monthlyMap: Record<string, { total: number; orders: number }> = {};

    for (const o of orders) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;

      const key = monthKey(o.createdAt);
      if (!monthlyMap[key]) monthlyMap[key] = { total: 0, orders: 0 };
      monthlyMap[key].total += toNum(o.total);
      monthlyMap[key].orders += 1;
    }

    const monthlyRevenue = Object.entries(monthlyMap)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, d]) => ({
        month,
        total: d.total,
        orders: d.orders,
        avgTicket: d.orders > 0 ? d.total / d.orders : 0,
      }));

    // ── Top products ──────────────────────────────────────────────────────────
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const item of items) {
      if (!productMap[item.productId]) {
        productMap[item.productId] = { name: item.product?.name || 'Produto removido', qty: 0, revenue: 0 };
      }
      productMap[item.productId].qty += item.quantity;
      productMap[item.productId].revenue += toNum(item.subtotal);
    }

    let topProducts = Object.entries(productMap)
      .map(([productId, d]) => ({ productId, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    if (productQuery) {
      const q = productQuery.toLowerCase();
      topProducts = topProducts.filter((p) => p.name.toLowerCase().includes(q));
    }

    // ── Stock ────────────────────────────────────────────────────────────────
    let stockSummary: any = null;
    let lowStockItems: any[] = [];

    if (includeStock) {
      const products = await prisma.product.findMany({
        select: { id: true, name: true, sku: true, stock: true, minStock: true, price: true },
      });

      let lowStockCount = 0;
      let zeroStockCount = 0;
      let negativeStockCount = 0;
      let totalStockValue = 0;

      for (const p of products) {
        if (p.stock <= p.minStock && p.stock > 0) lowStockCount++;
        if (p.stock === 0) zeroStockCount++;
        if (p.stock < 0) negativeStockCount++;
        totalStockValue += toNum(p.price) * p.stock;
      }

      lowStockItems = products
        .filter((p) => p.stock <= p.minStock)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 20);

      stockSummary = { totalItems: products.length, lowStockCount, zeroStockCount, negativeStockCount, totalStockValue };
    }

    return NextResponse.json({
      // Current period
      totalRevenue: includeOrders ? curr.revenue : null,
      ordersCount: includeOrders ? curr.ordersCount : null,
      avgTicket: includeOrders ? curr.avgTicket : null,
      pendingCount: includeOrders ? curr.pendingCount : null,
      refundedCount: includeOrders ? curr.refundedCount : null,
      productsSold: includeOrders ? productsSold : null,
      // Previous period (for comparison badges)
      prevRevenue: includeOrders ? prev.revenue : null,
      prevOrdersCount: includeOrders ? prev.ordersCount : null,
      prevAvgTicket: includeOrders ? prev.avgTicket : null,
      prevPendingCount: includeOrders ? prev.pendingCount : null,
      prevProductsSold: includeOrders ? prevProductsSold : null,
      // Charts
      monthlyRevenue: includeOrders ? monthlyRevenue : [],
      topProducts: includeOrders ? topProducts : [],
      statusBreakdown: includeOrders && includeStatusBreakdown ? statusBreakdown : undefined,
      // Stock
      stockSummary: includeStock ? stockSummary : undefined,
      lowStockItems: includeStock ? lowStockItems : undefined,
      // Meta
      filters: { startDate, endDate, status, minTotal, maxTotal, productQuery, criticalOnly, includeOrders, includeStock, includeStatusBreakdown },
    });
  } catch (error) {
    logger.error(error as Error, '[FINANCIAL_SUMMARY_GET]');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
