'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FinancialLoadingSkeleton } from '@/components/loading/financial-loading';
import type { FinancialReportSummary } from '@/types/financial-report';
import { buildFinancialReportExcel } from '@/lib/export/excel';
import { generateFinancialReportPdf } from '@/lib/export/pdf';
import { statusToPt } from '@/lib/i18n';

type Summary = {
  totalRevenue: number;
  pendingCount: number;
  refundedCount: number;
  avgTicket: number;
  ordersCount: number;
  monthlyRevenue: { month: string; total: number; orders: number }[];
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  filters?: { startDate?: string; endDate?: string; status?: string };
  statusBreakdown?: Record<string, number>;
};

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const percent = (v: number) => `${(v * 100).toFixed(1)}%`;

function printHtml(html: string) {
  let cleaned = false;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return cleanup();
    win.focus();
    win.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 2000);
    win.print();
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
}

const buildReportHtml = (data: Summary) => {
  const conversion = data.ordersCount > 0
    ? (data.ordersCount - data.pendingCount - data.refundedCount) / data.ordersCount
    : 0;

  const head = `
    <style>
      body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; margin: 24px; color: #111827; background: #F8FAFC; }
      h1 { margin: 0 0 6px; font-size: 26px; }
      h2 { margin: 18px 0 10px; font-size: 16px; }
      p { margin: 4px 0; }
      .muted { color: #6B7280; font-size: 12px; }
      .summary { width: 100%; border-collapse: collapse; margin-top: 12px; }
      .summary td { background: #fff; padding: 12px 14px; border: 1px solid #E5E7EB; font-size: 14px; }
      .summary .label { color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
      .summary .value { font-weight: 700; font-size: 18px; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; background: #fff; }
      th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; font-size: 13px; }
      th { background: #0F172A; color: #F8FAFC; font-weight: 600; letter-spacing: 0.01em; }
      tr:nth-child(even) td { background: #F8FAFC; }
      .right { text-align: right; }
      .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
      @media print { body { background: #fff; } }
    </style>
  `;

  const summary = `
    <table class="summary">
      <tr>
        <td><div class="label">Receita</div><div class="value">${currency(data.totalRevenue)}</div></td>
        <td><div class="label">Ticket médio</div><div class="value">${currency(data.avgTicket)}</div></td>
        <td><div class="label">Pendentes</div><div class="value">${data.pendingCount}</div></td>
        <td><div class="label">Conversão</div><div class="value">${percent(conversion)}</div></td>
      </tr>
    </table>
  `;

  const monthlyRows = data.monthlyRevenue
    .map((m) => `<tr><td>${m.month}</td><td class="right">${m.orders}</td><td class="right">${currency(m.total)}</td></tr>`)
    .join('') || '<tr><td colspan="3">Sem dados no período</td></tr>';

  const productsRows = data.topProducts
    .map((p) => `<tr><td>${p.name}</td><td class="right">${p.qty}</td><td class="right">${currency(p.revenue)}</td></tr>`)
    .join('') || '<tr><td colspan="3">Sem vendas no período</td></tr>';

  const tables = `
    <div class="wrap">
      <div>
        <h2>Faturamento mensal</h2>
        <table>
          <thead><tr><th>Mês</th><th class="right">Pedidos</th><th class="right">Faturamento</th></tr></thead>
          <tbody>${monthlyRows}</tbody>
        </table>
      </div>
      <div>
        <h2>Top produtos por receita</h2>
        <table>
          <thead><tr><th>Produto</th><th class="right">Qtd</th><th class="right">Receita</th></tr></thead>
          <tbody>${productsRows}</tbody>
        </table>
      </div>
    </div>
  `;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${head}</head><body>
    <h1>Relatório Financeiro</h1>
    <p class="muted">Período: ${data.filters?.startDate || 'Últimos 6 meses'} até ${data.filters?.endDate || 'Hoje'} · Status: ${data.filters?.status || 'ALL'} · Gerado em ${new Date().toLocaleString('pt-BR')}</p>
    ${summary}
    ${tables}
  </body></html>`;
};

export default function AdminFinancialPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryString = useMemo(() => 'includeStatusBreakdown=true', []); // default 6-month window handled by API

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

  const toFinancialSummary = (d: Summary): FinancialReportSummary => ({
    totalRevenue: d.totalRevenue,
    pendingCount: d.pendingCount,
    refundedCount: d.refundedCount,
    avgTicket: d.avgTicket,
    ordersCount: d.ordersCount,
    monthlyRevenue: d.monthlyRevenue,
    topProducts: d.topProducts,
    statusBreakdown: d.statusBreakdown || undefined,
    filters: { includeOrders: true, includeStock: false, includeStatusBreakdown: true, startDate: d.filters?.startDate, endDate: d.filters?.endDate, status: d.filters?.status ?? 'ALL' },
  });

  const exportPdf = () => {
    if (!data) return;
    const summary = toFinancialSummary(data);
    generateFinancialReportPdf(summary).then((blob) => {
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
    const summary = toFinancialSummary(data);
    buildFinancialReportExcel(summary).then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'relatorio-financeiro.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    });
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const conversion = data.ordersCount > 0 ? (data.ordersCount - data.pendingCount - data.refundedCount) / data.ordersCount : 0;

  const MonthlyBarChart = ({ rows }: { rows: { month: string; total: number }[] }) => {
    const max = Math.max(0, ...rows.map((r) => r.total));
    return (
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.month} className="flex items-center gap-3">
            <span className="w-24 text-sm text-gray-600">{r.month}</span>
            <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden">
              <div
                className="h-3 rounded bg-indigo-500"
                style={{ width: `${max ? (r.total / max) * 100 : 0}%` }}
              />
            </div>
            <span className="w-28 text-right text-sm font-medium">{currency(r.total)}</span>
          </div>
        ))}
      </div>
    );
  };

  const StatusLegend = ({ breakdown }: { breakdown?: Record<string, number> }) => {
    if (!breakdown || Object.keys(breakdown).length === 0) return null;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Status dos pedidos</h2>
          <span className="text-xs text-gray-500">Últimos 6 meses</span>
        </div>
        <div className="space-y-2">
          {Object.entries(breakdown).map(([s, v]) => (
            <div key={s} className="flex items-center justify-between">
              <span className="font-medium">{statusToPt(s)}</span>
              <span className="text-sm text-gray-700">{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão Financeira</h1>
          <p className="text-sm text-gray-600">Resumo padrão dos últimos 6 meses.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/financial/reports">Ir para relatórios</Link>
          </Button>
          <Button variant="outline" onClick={exportExcel}>Exportar Excel</Button>
          <Button onClick={exportPdf}>Exportar PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Receita (6 meses)</h3>
          <p className="text-2xl font-bold text-green-600">{currency(data.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Ticket médio</h3>
          <p className="text-2xl font-bold text-blue-600">{currency(data.avgTicket)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Pedidos pendentes</h3>
          <p className="text-2xl font-bold text-yellow-600">{data.pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Conversão</h3>
          <p className="text-2xl font-bold text-indigo-600">{(conversion * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Faturamento mensal</h2>
            <span className="text-xs text-gray-500">Últimos 6 meses</span>
          </div>
          <div className="space-y-3">
            {data.monthlyRevenue.length === 0 ? (
              <p className="text-gray-500 text-sm">Sem dados no período.</p>
            ) : (
              <MonthlyBarChart rows={data.monthlyRevenue.map(({ month, total }) => ({ month, total }))} />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top produtos por receita</h2>
            <span className="text-xs text-gray-500">Últimos 6 meses</span>
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

      {/* Status legend */}
      <StatusLegend breakdown={data.statusBreakdown} />
    </div>
  );
}
