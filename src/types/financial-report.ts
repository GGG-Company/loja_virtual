export type StatusBreakdown = Record<string, number>;

export interface StockSummary {
  totalItems: number;
  lowStockCount: number;
  zeroStockCount: number;
  negativeStockCount: number;
  totalStockValue: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  minStock: number;
}

export interface FinancialReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  minTotal?: number | string;
  maxTotal?: number | string;
  productQuery?: string;
  criticalOnly?: boolean;
  includeOrders?: boolean;
  includeStock?: boolean;
  includeStatusBreakdown?: boolean;
}

export interface FinancialReportSummary {
  totalRevenue: number | null;
  pendingCount: number | null;
  refundedCount: number | null;
  avgTicket: number | null;
  ordersCount: number | null;
  productsSold: number | null;
  // Previous period comparison
  prevRevenue: number | null;
  prevOrdersCount: number | null;
  prevAvgTicket: number | null;
  prevPendingCount: number | null;
  prevProductsSold: number | null;
  // Charts
  monthlyRevenue: { month: string; total: number; orders: number; avgTicket: number }[];
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  statusBreakdown?: StatusBreakdown;
  stockSummary?: StockSummary | null;
  lowStockItems?: LowStockItem[];
  filters?: FinancialReportFilters;
}
