/**
 * FinancialReportService
 * Responsabilidade única: buscar e agregar dados financeiros do banco.
 * Completamente desacoplado de qualquer formato de saída (Excel/PDF/JSON).
 */
import { prisma } from '@/lib/prisma';
import { toNum } from '@/lib/decimal-helpers';
import type { FinancialReportSummary, FinancialReportFilters } from '@/types/financial-report';

const COMPLETED_STATUS = ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'];
const PENDING_STATUS   = ['PENDING'];
const REFUND_STATUS    = ['REFUNDED', 'CANCELLED'];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export async function fetchFinancialReport(
  filters: FinancialReportFilters,
): Promise<FinancialReportSummary> {
  const {
    startDate: startDateParam,
    endDate: endDateParam,
    status: statusParam,
    minTotal: minTotalParam,
    maxTotal: maxTotalParam,
    productQuery,
    criticalOnly = false,
    includeOrders = true,
    includeStock = false,
    includeStatusBreakdown = false,
  } = filters;

  // ── Date window ──────────────────────────────────────────────────────────
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setMonth(defaultStart.getMonth() - 5, 1);
  defaultStart.setHours(0, 0, 0, 0);

  const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
  const endDate   = endDateParam   ? new Date(endDateParam)   : now;
  endDate.setHours(23, 59, 59, 999);

  // ── Status filter ─────────────────────────────────────────────────────────
  const allowed = ['ALL', 'COMPLETED', 'PENDING', 'REFUNDED'];
  const status  = allowed.includes((statusParam ?? 'ALL').toUpperCase())
    ? (statusParam ?? 'ALL').toUpperCase()
    : 'ALL';

  const statusWhere = (() => {
    if (status === 'COMPLETED') return { status: { in: COMPLETED_STATUS as any } };
    if (status === 'PENDING')   return { status: { in: PENDING_STATUS   as any } };
    if (status === 'REFUNDED')  return { status: { in: REFUND_STATUS    as any } };
    return {};
  })();

  const minTotal = minTotalParam != null ? Number(minTotalParam) : undefined;
  const maxTotal = maxTotalParam != null ? Number(maxTotalParam) : undefined;

  // ── Orders query ──────────────────────────────────────────────────────────
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

  const orderIds = orders.map(o => o.id);

  const items = includeOrders && orderIds.length
    ? await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        select: {
          orderId:   true,
          productId: true,
          quantity:  true,
          subtotal:  true,
          product:   { select: { name: true } },
        },
      })
    : [];

  // ── Aggregate ─────────────────────────────────────────────────────────────
  let totalRevenue  = 0;
  let completedCount = 0;
  let pendingCount  = 0;
  let refundedCount = 0;
  const statusBreakdown: Record<string, number> = {};
  const monthlyMap: Record<string, { total: number; orders: number }> = {};

  for (const o of orders) {
    const isCompleted = COMPLETED_STATUS.includes(o.status as string);
    const isPending   = PENDING_STATUS.includes(o.status as string);
    const isRefunded  = REFUND_STATUS.includes(o.status as string);

    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;

    if (isCompleted) { totalRevenue += toNum(o.total); completedCount += 1; }
    if (isPending)   pendingCount  += 1;
    if (isRefunded)  refundedCount += 1;

    const key = monthKey(o.createdAt);
    if (!monthlyMap[key]) monthlyMap[key] = { total: 0, orders: 0 };
    monthlyMap[key].total  += toNum(o.total);
    monthlyMap[key].orders += 1;
  }

  const monthlyRevenue = Object.entries(monthlyMap)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([key, data]) => ({ month: monthLabel(key), total: data.total, orders: data.orders }));

  // ── Top products ──────────────────────────────────────────────────────────
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const item of items) {
    if (!productMap[item.productId]) {
      productMap[item.productId] = {
        name:    item.product?.name || 'Produto removido',
        qty:     0,
        revenue: 0,
      };
    }
    productMap[item.productId].qty     += item.quantity;
    productMap[item.productId].revenue += toNum(item.subtotal);
  }

  let topProducts = Object.entries(productMap)
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  if (productQuery) {
    const q = productQuery.toLowerCase();
    topProducts = topProducts.filter(p => p.name.toLowerCase().includes(q));
  }

  const avgTicket = completedCount > 0 ? totalRevenue / completedCount : 0;

  // ── Stock ─────────────────────────────────────────────────────────────────
  let stockSummary = null;
  let lowStockItems: any[] = [];

  if (includeStock) {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, sku: true, stock: true, minStock: true, price: true },
    });

    let lowStockCount = 0, zeroStockCount = 0, negativeStockCount = 0, totalStockValue = 0;

    for (const p of products) {
      if (p.stock > 0 && p.stock <= p.minStock) lowStockCount     += 1;
      if (p.stock === 0)                          zeroStockCount    += 1;
      if (p.stock < 0)                            negativeStockCount += 1;
      totalStockValue += toNum(p.price) * Math.max(p.stock, 0);
    }

    lowStockItems = products
      .filter(p => criticalOnly ? p.stock <= 0 : p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 20);

    stockSummary = { totalItems: products.length, lowStockCount, zeroStockCount, negativeStockCount, totalStockValue };
  }

  // ── Result ────────────────────────────────────────────────────────────────
  return {
    totalRevenue:    includeOrders ? totalRevenue  : null,
    pendingCount:    includeOrders ? pendingCount  : null,
    refundedCount:   includeOrders ? refundedCount : null,
    avgTicket:       includeOrders ? avgTicket     : null,
    ordersCount:     includeOrders ? orders.length : null,
    monthlyRevenue:  includeOrders ? monthlyRevenue : [],
    topProducts:     includeOrders ? topProducts    : [],
    statusBreakdown: includeOrders && includeStatusBreakdown ? statusBreakdown : undefined,
    stockSummary:    includeStock ? stockSummary   : undefined,
    lowStockItems:   includeStock ? lowStockItems  : undefined,
    filters: {
      startDate: startDate.toISOString(),
      endDate:   endDate.toISOString(),
      status,
      minTotal,
      maxTotal,
      productQuery:           productQuery ?? undefined,
      criticalOnly,
      includeOrders,
      includeStock,
      includeStatusBreakdown,
    },
  };
}
