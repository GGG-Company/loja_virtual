'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FinancialLoadingSkeleton } from '@/components/loading/financial-loading';
import { statusToPt } from '@/lib/i18n';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus,
  FileSpreadsheet, FileDown, BarChart2,
  ShoppingCart, Package, CreditCard, Clock,
} from 'lucide-react';

type Summary = {
  totalRevenue: number;
  ordersCount: number;
  avgTicket: number;
  pendingCount: number;
  refundedCount: number;
  productsSold: number;
  // Previous period
  prevRevenue: number;
  prevOrdersCount: number;
  prevAvgTicket: number;
  prevPendingCount: number;
  prevProductsSold: number;
  // Charts
  monthlyRevenue: { month: string; total: number; orders: number; avgTicket: number }[];
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  statusBreakdown?: Record<string, number>;
  filters?: { startDate?: string; endDate?: string; status?: string };
};

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const currencyCompact = (v: number) => {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function deltaPercent(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const up = delta >= 0;
  const zero = delta === 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        zero
          ? 'bg-metallic-100 text-metallic-500'
          : up
          ? 'bg-green-100 text-green-700'
          : 'bg-primary-100 text-primary-700'
      }`}
      aria-label={`${up ? 'Aumento' : 'Queda'} de ${Math.abs(delta).toFixed(2)}%`}
    >
      {zero ? (
        <Minus className="h-3 w-3" aria-hidden="true" />
      ) : up ? (
        <TrendingUp className="h-3 w-3" aria-hidden="true" />
      ) : (
        <TrendingDown className="h-3 w-3" aria-hidden="true" />
      )}
      {up && delta !== 0 ? '+' : ''}{delta.toFixed(2)}%
    </span>
  );
}

// ── KPI card (NuvemShop style) ────────────────────────────────────────────────
function KpiCard({
  label, value, prevLabel, delta, icon,
}: {
  label: string;
  value: string;
  prevLabel: string;
  delta: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        <span className="p-1.5 rounded-lg bg-gray-50 text-gray-400">{icon}</span>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-3xl font-extrabold text-gray-900 leading-none">{value}</span>
        <DeltaBadge delta={delta} />
      </div>
      <p className="text-xs text-gray-400">{prevLabel} no período anterior</p>
    </div>
  );
}

// ── Custom tooltip for Recharts ───────────────────────────────────────────────
function ChartTooltip({ active, payload, label, isCurrency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-xs">
          {p.name}: <strong>{isCurrency ? currency(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Status color map ──────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  DELIVERED: 'bg-green-500', COMPLETED: 'bg-green-500',
  SHIPPED: 'bg-metallic-500', CONFIRMED: 'bg-metallic-700',
  PROCESSING: 'bg-amber-400', PENDING: 'bg-orange-400',
  REFUNDED: 'bg-primary-300', CANCELLED: 'bg-primary-500',
};
const STATUS_TEXT: Record<string, string> = {
  DELIVERED: 'text-green-700', COMPLETED: 'text-green-700',
  SHIPPED: 'text-metallic-600', CONFIRMED: 'text-metallic-700',
  PROCESSING: 'text-amber-700', PENDING: 'text-orange-700',
  REFUNDED: 'text-primary-400', CANCELLED: 'text-primary-600',
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminFinancialPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryString = useMemo(() => 'includeStatusBreakdown=true', []);

  useEffect(() => {
    const load = async () => {
      const started = performance.now();
      toast.dismiss('financial-feedback');
      toast.loading('Carregando dados financeiros...', { id: 'financial-feedback' });
      try {
        const res = await fetch(`/api/admin/financial/summary?${queryString}`);
        if (!res.ok) throw new Error('Falha ao carregar resumo financeiro');
        const json = await res.json();
        setData(json);
        toast.success('Resumo atualizado', { id: 'financial-feedback', duration: 2000 });
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar');
        toast.error(e?.message || 'Erro ao carregar', { id: 'financial-feedback', duration: 2800 });
      } finally {
        const elapsed = performance.now() - started;
        const remaining = 2000 - elapsed;
        if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
        setLoading(false);
      }
    };
    load();
  }, [queryString]);

  const exportFile = (format: 'xlsx' | 'pdf') => {
    const params = new URLSearchParams(queryString);
    params.set('format', format);
    params.set('includeStatusBreakdown', 'true');
    window.location.href = `/api/admin/financial/export?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <FinancialLoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const conversion = data.ordersCount > 0
    ? (data.ordersCount - data.pendingCount - data.refundedCount) / data.ordersCount
    : 0;

  const kpis = [
    {
      label: 'Receita',
      value: currency(data.totalRevenue || 0),
      prevLabel: currency(data.prevRevenue || 0),
      delta: deltaPercent(data.totalRevenue || 0, data.prevRevenue || 0),
      icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: 'Pedidos',
      value: String(data.ordersCount || 0),
      prevLabel: String(data.prevOrdersCount || 0),
      delta: deltaPercent(data.ordersCount || 0, data.prevOrdersCount || 0),
      icon: <ShoppingCart className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: 'Ticket Médio',
      value: currency(data.avgTicket || 0),
      prevLabel: currency(data.prevAvgTicket || 0),
      delta: deltaPercent(data.avgTicket || 0, data.prevAvgTicket || 0),
      icon: <BarChart2 className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: 'Produtos Vendidos',
      value: String(data.productsSold || 0),
      prevLabel: String(data.prevProductsSold || 0),
      delta: deltaPercent(data.productsSold || 0, data.prevProductsSold || 0),
      icon: <Package className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: 'Pendentes',
      value: String(data.pendingCount || 0),
      prevLabel: String(data.prevPendingCount || 0),
      delta: deltaPercent(data.pendingCount || 0, data.prevPendingCount || 0),
      icon: <Clock className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: 'Taxa de Conversão',
      value: `${(conversion * 100).toFixed(1)}%`,
      prevLabel: '—',
      delta: null,
      icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  // Format month label for chart (e.g. "2026-01" → "Jan")
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData = data.monthlyRevenue.map((m) => {
    const parts = m.month.split('-');
    const monthIdx = parseInt(parts[1], 10) - 1;
    return {
      ...m,
      label: `${monthNames[monthIdx]}/${parts[0].slice(2)}`,
    };
  });

  const maxRevenue = Math.max(0, ...chartData.map((d) => d.total));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 space-y-8 max-w-7xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão Financeira</h1>
            <p className="text-sm text-gray-500 mt-0.5">Resumo dos últimos 6 meses</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/financial/reports">Relatórios avançados</Link>
            </Button>
            <Button variant="outline" onClick={() => exportFile('xlsx')} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Excel
            </Button>
            <Button onClick={() => exportFile('pdf')} className="gap-2">
              <FileDown className="h-4 w-4" aria-hidden="true" />
              PDF
            </Button>
          </div>
        </div>

        {/* ── KPI grid ───────────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          role="region"
          aria-label="Indicadores financeiros"
        >
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Revenue + Ticket chart */}
          <section aria-labelledby="chart-revenue-heading" className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 id="chart-revenue-heading" className="text-sm font-semibold text-gray-700">
                Receita e ticket médio ao longo do tempo
              </h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Últimos 6 meses</p>

            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                Sem dados no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => currencyCompact(v).replace('R$', '')}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => currencyCompact(v).replace('R$', '')}
                  />
                  <Tooltip content={<ChartTooltip isCurrency />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="total"
                    name="Receita"
                    fill="#CC1020"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="avgTicket"
                    name="Ticket Médio"
                    fill="#334155"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Orders per month chart */}
          <section aria-labelledby="chart-orders-heading" className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 id="chart-orders-heading" className="text-sm font-semibold text-gray-700">
                Pedidos ao longo do tempo
              </h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Últimos 6 meses</p>

            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                Sem dados no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip isCurrency={false} />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Bar
                    dataKey="orders"
                    name="Pedidos"
                    fill="#CC1020"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>
        </div>

        {/* ── Desempenho dos Produtos ────────────────────────────────────── */}
        {data.topProducts.length > 0 && (
          <section aria-labelledby="products-heading" className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 id="products-heading" className="text-sm font-semibold text-gray-700">
                  Desempenho dos Produtos
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Top produtos por receita — últimos 6 meses</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produto</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidades</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Receita</th>
                    <th scope="col" className="px-4 py-3 pr-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Participação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.topProducts.map((p, i) => {
                    const share = data.totalRevenue > 0 ? (p.revenue / data.totalRevenue) * 100 : 0;
                    return (
                      <tr key={p.productId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="font-medium text-gray-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">{p.qty}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">{currency(p.revenue)}</td>
                        <td className="px-4 py-3 pr-5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-1.5 rounded-full bg-primary-500"
                                style={{ width: `${Math.min(100, share)}%` }}
                                role="presentation"
                              />
                            </div>
                            <span className="text-xs tabular-nums text-gray-500 w-10 text-right">
                              {share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Status breakdown ────────────────────────────────────────────── */}
        {data.statusBreakdown && Object.keys(data.statusBreakdown).length > 0 && (
          <section aria-labelledby="status-heading" className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 id="status-heading" className="text-sm font-semibold text-gray-700">Status dos Pedidos</h2>
                <p className="text-xs text-gray-400 mt-0.5">Distribuição por status — últimos 6 meses</p>
              </div>
            </div>
            {(() => {
              const entries = Object.entries(data.statusBreakdown!);
              const total = entries.reduce((s, [, v]) => s + v, 0);
              const max = Math.max(1, ...entries.map(([, v]) => v));
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {entries.map(([s, v]) => (
                    <div key={s}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLOR[s] || 'bg-gray-400'}`} aria-hidden="true" />
                          <span className="text-sm text-gray-700">{statusToPt(s)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{v}</span>
                          <span className="text-xs text-gray-400 w-9 text-right">
                            {total > 0 ? `${((v / total) * 100).toFixed(0)}%` : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${STATUS_COLOR[s] || 'bg-gray-400'} transition-all duration-700`}
                          style={{ width: `${(v / max) * 100}%` }}
                          role="presentation"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
        )}
      </div>
    </div>
  );
}
