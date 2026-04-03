'use client';

import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FinancialLoadingSkeleton } from '@/components/loading/financial-loading';
import Link from 'next/link';
import type { FinancialReportSummary } from '@/types/financial-report';
import {
  Filter, Calendar, DollarSign, Search, Package,
  BarChart2, AlertCircle, Check, TrendingUp,
  FileSpreadsheet, FileDown, ArrowLeft,
} from 'lucide-react';

type Summary = FinancialReportSummary;

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_OPTIONS = [
  { value: 'ALL',      label: 'Todos os status' },
  { value: 'COMPLETED', label: 'Concluídos' },
  { value: 'PENDING',   label: 'Pendentes' },
  { value: 'REFUNDED',  label: 'Reembolsados / Cancelados' },
];

const STATUS_LABELS: Record<string, string> = {
  DELIVERED: 'Entregue', SHIPPED: 'Enviado', CONFIRMED: 'Confirmado',
  PROCESSING: 'Em separação', PENDING: 'Pendente', REFUNDED: 'Reembolsado',
  CANCELLED: 'Cancelado', ALL: 'Todos', COMPLETED: 'Concluídos',
};
const statusLabel = (s?: string) => (s ? (STATUS_LABELS[s] ?? s) : 'Todos');

const STATUS_COLOR: Record<string, string> = {
  DELIVERED: 'bg-green-500', COMPLETED: 'bg-green-500',
  SHIPPED: 'bg-metallic-500', CONFIRMED: 'bg-metallic-700',
  PROCESSING: 'bg-amber-400', PENDING: 'bg-orange-400',
  REFUNDED: 'bg-primary-300', CANCELLED: 'bg-primary-500',
};

const fmtDate = (s?: string) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

const inputClass =
  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200';

// ── Toggle checkbox (styled as pill) ─────────────────────────────────────────
function ToggleCheck({
  id, checked, onChange, label,
}: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none text-sm ${
        checked
          ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
          checked ? 'bg-primary-500 border-primary-500' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
const KPI_BORDER: Record<string, string> = {
  green:   'border-l-green-500',
  amber:   'border-l-amber-500',
  primary: 'border-l-primary-500',
  dark:    'border-l-metallic-700',
};
const KPI_TEXT: Record<string, string> = {
  green:   'text-green-700',
  amber:   'text-amber-700',
  primary: 'text-primary-700',
  dark:    'text-metallic-700',
};

function KpiCard({ label, value, color, icon }: {
  label: string; value: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${KPI_BORDER[color]} shadow-sm p-4 flex items-center gap-4`}>
      <div className="p-2 rounded-lg bg-gray-50 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${KPI_TEXT[color]}`}>{value}</p>
      </div>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ id, title, badge, children }: {
  id: string; title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 id={id} className="text-base font-semibold text-gray-900">{title}</h2>
        {badge && (
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FinancialReportsPage() {
  // Accessibility IDs
  const startDateId = useId();
  const endDateId = useId();
  const statusId = useId();
  const minTotalId = useId();
  const maxTotalId = useId();
  const productQueryId = useId();
  const includeOrdersId = useId();
  const includeStatusBreakdownId = useId();
  const includeStockId = useId();
  const criticalOnlyId = useId();

  const monthlyHeadingId = useId();
  const productsHeadingId = useId();
  const statusHeadingId = useId();
  const stockHeadingId = useId();

  // State
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5, 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('ALL');
  const [includeOrders, setIncludeOrders] = useState(true);
  const [includeStock, setIncludeStock] = useState(true);
  const [includeStatusBreakdown, setIncludeStatusBreakdown] = useState(true);
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [criticalOnly, setCriticalOnly] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (status) params.set('status', status);
    if (minTotal) params.set('minTotal', minTotal);
    if (maxTotal) params.set('maxTotal', maxTotal);
    if (productQuery) params.set('productQuery', productQuery);
    if (criticalOnly) params.set('criticalOnly', 'true');
    params.set('includeOrders', includeOrders ? 'true' : 'false');
    if (includeStock) params.set('includeStock', 'true');
    if (includeStatusBreakdown) params.set('includeStatusBreakdown', 'true');
    return params.toString();
  }, [startDate, endDate, status, minTotal, maxTotal, productQuery, criticalOnly, includeOrders, includeStock, includeStatusBreakdown]);

  const fetchData = async () => {
    setLoading(true);
    const started = performance.now();
    toast.dismiss('financial-report');
    toast.loading('Gerando relatório...', { id: 'financial-report' });
    setError(null);
    try {
      const res = await fetch(`/api/admin/financial/summary?${queryString}`);
      if (!res.ok) throw new Error('Falha ao carregar resumo financeiro');
      const json = await res.json();
      setData(json);
      toast.success('Relatório atualizado', { id: 'financial-report', duration: 2000 });
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
      toast.error(e?.message || 'Erro ao carregar', { id: 'financial-report', duration: 2800 });
    } finally {
      const elapsed = performance.now() - started;
      const remaining = 2000 - elapsed;
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      setLoading(false);
    }
  };

  const exportFile = (format: 'xlsx' | 'pdf') => {
    const params = new URLSearchParams(queryString);
    params.set('format', format);
    window.location.href = `/api/admin/financial/export?${params.toString()}`;
  };

  const hasOrders = includeOrders && data?.ordersCount !== null;
  const conversion =
    hasOrders && data && data.ordersCount && data.ordersCount > 0
    && data.pendingCount !== null && data.refundedCount !== null
      ? (data.ordersCount - data.pendingCount - data.refundedCount) / data.ordersCount
      : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/financial"
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Voltar ao resumo financeiro"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios Financeiros</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">
            Gere relatórios customizados por período, status e filtros avançados.
          </p>
        </div>
        {data && (
          <div className="flex flex-wrap gap-2 ml-7 md:ml-0">
            <Button variant="outline" onClick={() => exportFile('xlsx')} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Excel
            </Button>
            <Button onClick={() => exportFile('pdf')} className="gap-2">
              <FileDown className="h-4 w-4" aria-hidden="true" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {/* ── Filter panel ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <Filter className="h-4 w-4 text-primary-500" aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-700">Filtros do Relatório</span>
        </div>

        <div className="p-5 space-y-5">
          {/* Row 1: Period | Values | Product */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Period */}
            <fieldset>
              <legend className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                <Calendar className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                Período e status
              </legend>
              <div className="space-y-2">
                <div>
                  <label htmlFor={startDateId} className="block text-sm font-medium text-gray-700 mb-1">
                    Data inicial
                  </label>
                  <input
                    id={startDateId}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={endDateId} className="block text-sm font-medium text-gray-700 mb-1">
                    Data final
                  </label>
                  <input
                    id={endDateId}
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={statusId} className="block text-sm font-medium text-gray-700 mb-1">
                    Status dos pedidos
                  </label>
                  <select
                    id={statusId}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`${inputClass} font-sans`}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Value range */}
            <fieldset>
              <legend className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                <DollarSign className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                Valor do pedido (R$)
              </legend>
              <div className="space-y-2">
                <div>
                  <label htmlFor={minTotalId} className="block text-sm font-medium text-gray-700 mb-1">
                    Valor mínimo
                  </label>
                  <input
                    id={minTotalId}
                    type="number"
                    min={0}
                    step="0.01"
                    value={minTotal}
                    onChange={(e) => setMinTotal(e.target.value)}
                    className={inputClass}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label htmlFor={maxTotalId} className="block text-sm font-medium text-gray-700 mb-1">
                    Valor máximo
                  </label>
                  <input
                    id={maxTotalId}
                    type="number"
                    min={0}
                    step="0.01"
                    value={maxTotal}
                    onChange={(e) => setMaxTotal(e.target.value)}
                    className={inputClass}
                    placeholder="Sem limite"
                  />
                </div>
              </div>
            </fieldset>

            {/* Product search */}
            <fieldset>
              <legend className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                <Search className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                Busca por produto
              </legend>
              <div>
                <label htmlFor={productQueryId} className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do produto contém
                </label>
                <input
                  id={productQueryId}
                  type="search"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  className={inputClass}
                  placeholder="Ex: furadeira, makita…"
                />
              </div>
            </fieldset>
          </div>

          {/* Row 2: Content toggles */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Incluir no relatório
            </p>
            <div className="flex flex-wrap gap-2">
              <ToggleCheck id={includeOrdersId} checked={includeOrders} onChange={setIncludeOrders} label="Pedidos e faturamento" />
              <ToggleCheck id={includeStatusBreakdownId} checked={includeStatusBreakdown} onChange={setIncludeStatusBreakdown} label="Detalhar por status" />
              <ToggleCheck id={includeStockId} checked={includeStock} onChange={setIncludeStock} label="Saúde do estoque" />
              <ToggleCheck id={criticalOnlyId} checked={criticalOnly} onChange={setCriticalOnly} label="Apenas itens críticos" />
            </div>
          </div>

          {/* Row 3: Apply */}
          <div className="border-t border-gray-100 pt-4 flex justify-end">
            <Button onClick={fetchData} disabled={loading} className="gap-2 min-w-44">
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                  Gerando…
                </>
              ) : (
                <>
                  <BarChart2 className="h-4 w-4" aria-hidden="true" />
                  Gerar relatório
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Active filter pills ──────────────────────────────────────────── */}
      {data && (
        <div role="status" aria-label="Filtros aplicados" className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Filtros ativos:</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs text-primary-700">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {fmtDate(data.filters?.startDate)} → {fmtDate(data.filters?.endDate)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
            Status: {statusLabel(data.filters?.status)}
          </span>
          {data.filters?.minTotal && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
              Min: {currency(Number(data.filters.minTotal))}
            </span>
          )}
          {data.filters?.maxTotal && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
              Máx: {currency(Number(data.filters.maxTotal))}
            </span>
          )}
          {data.filters?.productQuery && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
              Produto: &ldquo;{data.filters.productQuery}&rdquo;
            </span>
          )}
          {includeStock && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              Estoque incluído
            </span>
          )}
          {criticalOnly && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700">
              Apenas críticos
            </span>
          )}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Gerando relatório"
          className="rounded-xl border border-primary-100 bg-primary-50 p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-primary-700 font-semibold">
            <span className="h-4 w-4 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" aria-hidden="true" />
            Gerando relatório…
          </div>
          <FinancialLoadingSkeleton showFilters compact />
        </div>
      )}

      {/* ── Empty initial state ──────────────────────────────────────────── */}
      {!loading && !data && !error && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 flex flex-col items-center text-center gap-4">
          <div className="p-4 bg-primary-50 rounded-2xl">
            <BarChart2 className="h-10 w-10 text-primary-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Nenhum relatório gerado ainda</h2>
            <p className="text-sm text-gray-500 max-w-sm">
              Ajuste os filtros acima e clique em <strong>Gerar relatório</strong> para visualizar os dados financeiros.
            </p>
          </div>
          <Button onClick={fetchData} className="gap-2">
            <BarChart2 className="h-4 w-4" aria-hidden="true" />
            Gerar com filtros atuais
          </Button>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Erro ao gerar relatório</p>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {data && !loading && (
        <div className="space-y-6">

          {/* Nothing selected warning */}
          {!hasOrders && !includeStock && (
            <div role="alert" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <p>
                Selecione pelo menos uma seção:{' '}
                <strong>Pedidos e faturamento</strong> e/ou <strong>Saúde do estoque</strong>.
              </p>
            </div>
          )}

          {/* KPI cards */}
          {hasOrders && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                label="Receita total"
                value={currency(data.totalRevenue || 0)}
                color="green"
                icon={<TrendingUp className="h-5 w-5 text-green-600" aria-hidden="true" />}
              />
              <KpiCard
                label="Ticket médio"
                value={currency(data.avgTicket || 0)}
                color="blue"
                icon={<DollarSign className="h-5 w-5 text-blue-600" aria-hidden="true" />}
              />
              <KpiCard
                label="Pedidos pendentes"
                value={String(data.pendingCount ?? 0)}
                color="amber"
                icon={<Package className="h-5 w-5 text-amber-600" aria-hidden="true" />}
              />
              <KpiCard
                label="Taxa de conversão"
                value={`${((conversion || 0) * 100).toFixed(1)}%`}
                color="primary"
                icon={<BarChart2 className="h-5 w-5 text-primary-600" aria-hidden="true" />}
              />
            </div>
          )}

          {/* Monthly + Top Products */}
          {hasOrders && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard id={monthlyHeadingId} title="Faturamento mensal" badge="Período filtrado">
                {data.monthlyRevenue.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Sem dados no período.</p>
                ) : (() => {
                  const max = Math.max(0, ...data.monthlyRevenue.map((r) => r.total));
                  return (
                    <div className="space-y-4">
                      {data.monthlyRevenue.map((m) => (
                        <div key={m.month}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{m.month}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">{m.orders} pedidos</span>
                              <span className="text-sm font-semibold text-gray-900">{currency(m.total)}</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-primary-500 transition-all duration-700"
                              style={{ width: `${max ? (m.total / max) * 100 : 0}%` }}
                              role="presentation"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </SectionCard>

              <SectionCard id={productsHeadingId} title="Top produtos por receita" badge="Período filtrado">
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Sem vendas no período.</p>
                ) : (
                  <div className="space-y-1">
                    {data.topProducts.map((p, i) => (
                      <div key={p.productId} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.qty} unidades</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{currency(p.revenue)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {/* Status breakdown */}
          {includeStatusBreakdown && hasOrders && data.statusBreakdown && Object.keys(data.statusBreakdown).length > 0 && (
            <SectionCard id={statusHeadingId} title="Status dos pedidos" badge="Período filtrado">
              {(() => {
                const entries = Object.entries(data.statusBreakdown!);
                const total = entries.reduce((s, [, v]) => s + v, 0);
                const max = Math.max(1, ...entries.map(([, v]) => v));
                return (
                  <div className="space-y-3">
                    {entries.map(([s, v]) => (
                      <div key={s}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{statusLabel(s)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{v}</span>
                            <span className="text-xs text-gray-400 w-9 text-right">
                              {total > 0 ? `${((v / total) * 100).toFixed(0)}%` : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-700 ${STATUS_COLOR[s] || 'bg-gray-400'}`}
                            style={{ width: `${(v / max) * 100}%` }}
                            role="presentation"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </SectionCard>
          )}

          {/* Stock health */}
          {includeStock && data.stockSummary && (
            <section aria-labelledby={stockHeadingId} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 id={stockHeadingId} className="text-base font-semibold text-gray-900">Saúde do estoque</h2>
                <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded-full">Instantâneo atual</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Itens cadastrados</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stockSummary.totalItems}</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs text-amber-600 mb-1">Baixo estoque / Zerados</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {data.stockSummary.lowStockCount}
                    <span className="text-lg text-amber-300 mx-1">/</span>
                    {data.stockSummary.zeroStockCount}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-xs text-green-600 mb-1">Valor potencial</p>
                  <p className="text-2xl font-bold text-green-700">{currency(data.stockSummary.totalStockValue)}</p>
                </div>
              </div>

              {data.lowStockItems && data.lowStockItems.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    Itens críticos
                    <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold w-5 h-5">
                      {data.lowStockItems.length}
                    </span>
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produto</th>
                          <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                          <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Estoque</th>
                          <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Mínimo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {data.lowStockItems.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                            <td className="px-4 py-2.5 text-gray-500">{p.sku || '—'}</td>
                            <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                              {p.stock}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{p.minStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
