'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FinancialLoadingSkeleton } from '@/components/loading/financial-loading';
import Link from 'next/link';
import type { FinancialReportSummary } from '@/types/financial-report';
import { buildFinancialReportExcel } from '@/lib/export/excel';
import { generateFinancialReportPdf } from '@/lib/export/pdf';

type Summary = FinancialReportSummary;

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const percent = (v: number) => `${(v * 100).toFixed(1)}%`;

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    DELIVERED: 'Entregue',
    SHIPPED: 'Enviado',
    CONFIRMED: 'Confirmado',
    PROCESSING: 'Em separação',
    PENDING: 'Pendente',
    REFUNDED: 'Reembolsado',
    CANCELLED: 'Cancelado',
  };
  return map[status] || status;
};


export default function FinancialReportsPage() {
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

  const exportPdf = () => {
    if (!data) return;
    generateFinancialReportPdf(data).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio-financeiro.pdf';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const exportExcel = () => {
    if (!data) return;
    buildFinancialReportExcel(data).then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'relatorio-financeiro.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const hasOrders = includeOrders && data?.ordersCount !== null;
  const conversion = hasOrders && data && data.ordersCount && data.ordersCount > 0 && data.pendingCount !== null && data.refundedCount !== null
    ? (data.ordersCount - data.pendingCount - data.refundedCount) / data.ordersCount
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios Financeiros</h1>
          <p className="text-sm text-gray-600">Gere relatórios customizados por período e status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/financial">Voltar ao resumo</Link>
          </Button>
          <Button variant="outline" onClick={exportExcel}>Exportar Excel</Button>
          <Button onClick={exportPdf}>Exportar PDF</Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white/90 shadow-sm px-4 py-3 md:px-6 md:py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm bg-white font-sans focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="ALL">Todos</option>
              <option value="COMPLETED">Concluídos</option>
              <option value="PENDING">Pendentes</option>
              <option value="REFUNDED">Reembolsados/Cancelados</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Valor mín. (pedido)</label>
            <input
              type="number"
              min={0}
              value={minTotal}
              onChange={(e) => setMinTotal(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Valor máx. (pedido)</label>
            <input
              type="number"
              min={0}
              value={maxTotal}
              onChange={(e) => setMaxTotal(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-2">
            <label className="text-sm font-medium text-gray-700">Filtrar top produtos (nome contém)</label>
            <input
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Ex: furadeira"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2 lg:col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeOrders}
                onChange={(e) => setIncludeOrders(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Incluir pedidos/faturamento
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeStatusBreakdown}
                onChange={(e) => setIncludeStatusBreakdown(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Detalhar status dos pedidos
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeStock}
                onChange={(e) => setIncludeStock(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Incluir saúde do estoque
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={criticalOnly}
                onChange={(e) => setCriticalOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Apenas itens críticos
            </label>
          </div>

          <div className="flex md:justify-end md:col-span-1">
            <Button onClick={fetchData} disabled={loading} className="h-10 px-4 w-full md:w-auto">
              {loading ? 'Gerando...' : 'Aplicar filtros'}
            </Button>
          </div>
        </div>
      </div>

      {data && (
        <div className="flex flex-wrap gap-2 text-xs text-gray-700">
          {(() => {
            const fmtDate = (s?: string) => {
              if (!s) return '---';
              const d = new Date(s);
              return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
            };
            const map: Record<string, string> = { ALL: 'Todos', COMPLETED: 'Concluídos', PENDING: 'Pendentes', REFUNDED: 'Reembolsados/Cancelados' };
            const statusLabel = (s?: string) => (s ? (map[s] ?? s) : 'Todos');
            return (
              <>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Período: {fmtDate(data.filters?.startDate)} a {fmtDate(data.filters?.endDate)}</span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Status: {statusLabel(data.filters?.status)}</span>
              </>
            );
          })()}
          {data.filters?.minTotal !== undefined && data.filters?.minTotal !== null && data.filters?.minTotal !== '' && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Mín: {Number(data.filters?.minTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          )}
          {data.filters?.maxTotal !== undefined && data.filters?.maxTotal !== null && data.filters?.maxTotal !== '' && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Máx: {Number(data.filters?.maxTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          )}
          {data.filters?.productQuery && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Produto contém: {data.filters?.productQuery}</span>
          )}
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Pedidos: {includeOrders ? 'incluídos' : 'ocultos'}</span>
          {includeStatusBreakdown && <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Detalhe de status</span>}
          {includeStock && <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Saúde do estoque</span>}
          {criticalOnly && <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Apenas críticos</span>}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-indigo-700 space-y-4">
          <div className="font-semibold">Gerando relatório...</div>
          <FinancialLoadingSkeleton showFilters compact />
        </div>
      )}

      {!loading && !data && !error && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-gray-600">
          <p className="font-semibold text-gray-800">Nenhum relatório gerado ainda.</p>
          <p className="text-sm">Ajuste os filtros acima e clique em "Aplicar filtros" para montar o relatório.</p>
        </div>
      )}

      {error && (
        <div className="text-red-600">{error}</div>
      )}

      {data && (
        <>
          {!hasOrders && !includeStock && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4">
              Selecione pelo menos uma seção: marque "Incluir pedidos/faturamento" e/ou "Incluir saúde do estoque" e aplique os filtros novamente.
            </div>
          )}

          {hasOrders && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm text-gray-500">Receita</h3>
                <p className="text-2xl font-bold text-green-600">{currency(data.totalRevenue || 0)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm text-gray-500">Ticket médio</h3>
                <p className="text-2xl font-bold text-blue-600">{currency(data.avgTicket || 0)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm text-gray-500">Pedidos pendentes</h3>
                <p className="text-2xl font-bold text-yellow-600">{data.pendingCount ?? 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm text-gray-500">Conversão</h3>
                <p className="text-2xl font-bold text-indigo-600">{percent(conversion || 0)}</p>
              </div>
            </div>
          )}

          {hasOrders && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Faturamento mensal</h2>
                  <span className="text-xs text-gray-500">Período filtrado</span>
                </div>
                <div className="space-y-3">
                  {data.monthlyRevenue.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sem dados no período.</p>
                  ) : (
                    data.monthlyRevenue.map((m) => (
                      <div key={m.month} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{m.month}</p>
                          <p className="text-xs text-gray-500">{m.orders} pedidos</p>
                        </div>
                        <p className="font-semibold">{currency(m.total)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Top produtos por receita</h2>
                  <span className="text-xs text-gray-500">Período filtrado</span>
                </div>
                <div className="space-y-3">
                  {data.topProducts.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sem vendas no período.</p>
                  ) : (
                    data.topProducts.map((p) => (
                      <div key={p.productId} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.qty} unidades</p>
                        </div>
                        <p className="font-semibold">{currency(p.revenue)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {includeStatusBreakdown && hasOrders && data.statusBreakdown && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Status dos pedidos</h2>
                <span className="text-xs text-gray-500">Período filtrado</span>
              </div>
              <div className="space-y-2">
                {Object.entries(data.statusBreakdown).map(([s, v]) => (
                  <div key={s} className="flex items-center justify-between">
                    <span className="font-medium">{statusLabel(s)}</span>
                    <span className="text-sm text-gray-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {includeStock && data.stockSummary && (
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Saúde do estoque</h2>
                <span className="text-xs text-gray-500">Instantâneo</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Itens cadastrados</p>
                  <p className="text-xl font-bold">{data.stockSummary.totalItems}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Baixo estoque / Zerados</p>
                  <p className="text-xl font-bold">{data.stockSummary.lowStockCount} / {data.stockSummary.zeroStockCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor potencial</p>
                  <p className="text-xl font-bold">{currency(data.stockSummary.totalStockValue)}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Itens críticos (top 20)</h3>
                {data.lowStockItems && data.lowStockItems.length ? (
                  <div className="space-y-2">
                    {data.lowStockItems.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-gray-500">SKU: {p.sku || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{p.stock} un</p>
                          <p className="text-gray-500">Min: {p.minStock}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Nenhum item crítico.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
