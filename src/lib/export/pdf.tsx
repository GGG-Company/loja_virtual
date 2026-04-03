/**
 * PDF Report — Shopping das Ferramentas
 * Gerado server-side com @react-pdf/renderer.
 * Retorna Buffer consumido pelo API route.
 */
import React from 'react';
import path from 'path';
import fs from 'fs';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { FinancialReportSummary } from '@/types/financial-report';
import { statusToPt } from '@/lib/i18n';

function loadLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo_shopping_das_ferramentas.jpg');
    const buf = fs.readFileSync(logoPath);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

// ── Paleta de cores (brand) ───────────────────────────────────────────────
const C = {
  red:        '#CC1020',   // primary brand
  redLight:   '#FFF0F1',   // primary-50
  redMid:     '#F85555',   // primary-400
  dark:       '#1A1A1A',   // brand.black
  navy:       '#0F172A',   // metallic-900
  slate:      '#334155',   // metallic-700
  slateLight: '#64748B',   // metallic-500
  bg:         '#F8FAFC',   // metallic-50
  border:     '#E2E8F0',   // metallic-200
  white:      '#FFFFFF',
  greenBg:    '#ECFDF5',
  greenText:  '#065F46',
  greenBorder:'#A7F3D0',
  text:       '#1E293B',   // metallic-800
  textMuted:  '#64748B',   // metallic-500
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────
const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (s?: string) => {
  if (!s) return '—';
  // Already pt-BR formatted (e.g. "01/10/2025")
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // ISO or YYYY-MM-DD
  const d = new Date(s.includes('T') ? s : s + 'T12:00:00');
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

const fmtMonth = (key: string) => {
  // key = "2026-03"
  const [year, month] = key.split('-');
  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const m = parseInt(month, 10) - 1;
  return `${MONTHS[m] ?? month}/${year.slice(2)}`;
};

const filterStatusPt = (s?: string) =>
  ({ ALL: 'Todos', COMPLETED: 'Concluídos', PENDING: 'Pendentes', REFUNDED: 'Reembolsados' }
    [s ?? 'ALL'] ?? 'Todos');

// ── Estilos ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontSize:          9,
    color:             C.text,
    paddingTop:        68,
    paddingBottom:     40,
    paddingHorizontal: 30,
    fontFamily:        'Helvetica',
    backgroundColor:   C.bg,
  },

  // Header fixo
  header: {
    position:          'absolute',
    top:               0, left: 0, right: 0,
    height:            58,
    backgroundColor:   C.dark,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 30,
  },
  headerAccent: {
    position:        'absolute',
    top: 0, left: 0,
    width:           4,
    bottom:          0,
    backgroundColor: C.red,
  },
  headerLogo: {
    height:       36,
    width:        130,
    marginRight:  10,
    objectFit:    'contain' as any,
  },
  headerLogoWrap: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  headerCompany: {
    fontSize:   13,
    fontFamily: 'Helvetica-Bold',
    color:      C.white,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize:  7.5,
    color:     '#94A3B8',
    marginTop: 3,
  },
  headerRight: { alignItems: 'flex-end' },
  headerPeriod: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      '#E2E8F0',
  },
  headerGenDate: {
    fontSize:  7.5,
    color:     '#64748B',
    marginTop: 3,
  },

  // Footer fixo
  footer: {
    position:          'absolute',
    bottom:            0, left: 0, right: 0,
    height:            28,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 30,
    backgroundColor:   C.white,
    borderTopWidth:    1,
    borderTopColor:    C.border,
  },
  footerText: { fontSize: 7.5, color: C.slateLight },
  footerPage: { fontSize: 7.5, color: C.slate, fontFamily: 'Helvetica-Bold' },

  // KPI grid
  kpiGrid: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  16,
  },
  kpiCard: {
    flex:            1,
    backgroundColor: C.white,
    borderWidth:     1,
    borderColor:     C.border,
    borderRadius:    6,
    padding:         10,
    borderLeftWidth: 3,
    borderLeftColor: C.red,
  },
  kpiCardDark: {
    borderLeftColor: C.slate,
  },
  kpiLabel: {
    fontSize:      7,
    fontFamily:    'Helvetica-Bold',
    color:         C.slateLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom:  5,
  },
  kpiValue: {
    fontSize:   13,
    fontFamily: 'Helvetica-Bold',
    color:      C.dark,
    lineHeight: 1,
  },

  // Section
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   8,
    gap:            6,
  },
  sectionAccent: {
    width:           3,
    height:          14,
    backgroundColor: C.red,
    borderRadius:    2,
  },
  sectionTitle: {
    fontSize:      10,
    fontFamily:    'Helvetica-Bold',
    color:         C.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Table
  table: {
    width:        '100%',
    borderWidth:  1,
    borderColor:  C.border,
    borderRadius: 5,
    overflow:     'hidden',
    backgroundColor: C.white,
  },
  tHead: {
    flexDirection:   'row',
    backgroundColor: C.red,
    minHeight:       22,
  },
  tRow: { flexDirection: 'row', minHeight: 20 },
  tRowEven: { backgroundColor: C.white },
  tRowOdd:  { backgroundColor: C.bg },
  tRowTotal: {
    backgroundColor: C.greenBg,
    borderTopWidth:  1,
    borderTopColor:  C.greenBorder,
  },
  cell: {
    flex:              1,
    paddingHorizontal: 8,
    paddingVertical:   5,
    borderRightWidth:  1,
    borderRightColor:  C.border,
    justifyContent:    'center',
  },
  cellLast: { borderRightWidth: 0 },
  cellTh: {
    fontSize:   8,
    fontFamily: 'Helvetica-Bold',
    color:      C.white,
  },
  cellThCenter: { textAlign: 'center' },
  cellTd: { fontSize: 8.5, color: C.text },
  cellRight: { textAlign: 'right' },
  cellBold: { fontFamily: 'Helvetica-Bold' },
  cellTotal: {
    fontSize:   8.5,
    fontFamily: 'Helvetica-Bold',
    color:      C.greenText,
  },
  cellTotalRight: { textAlign: 'right' },

  // Stock summary row
  stockRow: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  10,
  },
  stockCard: {
    flex:            1,
    backgroundColor: C.white,
    borderWidth:     1,
    borderColor:     C.border,
    borderRadius:    6,
    padding:         8,
  },
  stockLabel: {
    fontSize:      7,
    fontFamily:    'Helvetica-Bold',
    color:         C.slateLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  4,
  },
  stockValue: {
    fontSize:   12,
    fontFamily: 'Helvetica-Bold',
    color:      C.dark,
  },
  stockValueWarn: { color: C.red },
});

// ── Componentes ───────────────────────────────────────────────────────────
interface ColDef {
  label: string;
  flex?: number;
  right?: boolean;
  bold?: boolean;
  center?: boolean;
}

function Table({ cols, rows, totals }: {
  cols:    ColDef[];
  rows:    (string | number)[][];
  totals?: (string | number | null)[];
}) {
  return (
    <View style={S.table}>
      {/* Header */}
      <View style={S.tHead} wrap={false}>
        {cols.map((col, i) => (
          <View
            key={i}
            style={[
              S.cell,
              col.flex != null ? { flex: col.flex } : {},
              i === cols.length - 1 ? S.cellLast : {},
            ]}
          >
            <Text style={[S.cellTh, col.center || col.right ? S.cellThCenter : {}]}>
              {col.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Rows */}
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={[S.tRow, ri % 2 === 0 ? S.tRowEven : S.tRowOdd]}
          wrap={false}
        >
          {cols.map((col, ci) => (
            <View
              key={ci}
              style={[
                S.cell,
                col.flex != null ? { flex: col.flex } : {},
                ci === cols.length - 1 ? S.cellLast : {},
              ]}
            >
              <Text style={[
                S.cellTd,
                col.right  ? S.cellRight : {},
                col.bold   ? S.cellBold  : {},
              ]}>
                {String(row[ci] ?? '—')}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {/* Totals */}
      {totals && (
        <View style={[S.tRow, S.tRowTotal]} wrap={false}>
          {cols.map((col, ci) => (
            <View
              key={ci}
              style={[
                S.cell,
                col.flex != null ? { flex: col.flex } : {},
                ci === cols.length - 1 ? S.cellLast : {},
              ]}
            >
              {totals[ci] != null && (
                <Text style={[S.cellTotal, ci > 0 ? S.cellTotalRight : {}]}>
                  {String(totals[ci])}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View style={S.sectionHeader}>
      <View style={S.sectionAccent} />
      <Text style={S.sectionTitle}>{children}</Text>
    </View>
  );
}

// ── Documento ─────────────────────────────────────────────────────────────
export function FinancialReportDocument({ summary }: { summary: FinancialReportSummary }) {
  const logoSrc  = loadLogoBase64();
  const period   = `${fmtDate(summary.filters?.startDate)} a ${fmtDate(summary.filters?.endDate)}`;
  const genDate  = new Date().toLocaleString('pt-BR');
  const statusPt = filterStatusPt(summary.filters?.status);

  const includeOrders = summary.totalRevenue !== null;

  const conversion = summary.ordersCount && summary.ordersCount > 0
    ? ((summary.ordersCount - (summary.pendingCount ?? 0) - (summary.refundedCount ?? 0))
        / summary.ordersCount * 100)
    : 0;

  const monthlyRows = summary.monthlyRevenue.map(m => [
    fmtMonth(m.month), m.orders, currency(m.total),
  ]);
  const monthlyTotals = [
    'TOTAL',
    summary.monthlyRevenue.reduce((s, m) => s + m.orders, 0),
    currency(summary.monthlyRevenue.reduce((s, m) => s + m.total, 0)),
  ];

  const productRows = summary.topProducts.map((p, i) => [
    `${i + 1}. ${p.name}`, p.qty, currency(p.revenue),
  ]);
  const productTotals = [
    'TOTAL',
    summary.topProducts.reduce((s, p) => s + p.qty, 0),
    currency(summary.topProducts.reduce((s, p) => s + p.revenue, 0)),
  ];

  const statusRows = summary.statusBreakdown
    ? Object.entries(summary.statusBreakdown).map(([s, v]) => [statusToPt(s), v])
    : [];

  const statusTotal = statusRows.reduce((sum, r) => sum + (Number(r[1]) || 0), 0);

  return (
    <Document title="Relatório Financeiro" author="Shopping das Ferramentas">
      <Page size="A4" style={S.page}>

        {/* ── Header fixo ─────────────────────────────────────────────── */}
        <View style={S.header} fixed>
          <View style={S.headerAccent} />
          <View style={S.headerLogoWrap}>
            {logoSrc && <Image src={logoSrc} style={S.headerLogo} />}
            <View>
              <Text style={S.headerCompany}>Shopping das Ferramentas</Text>
              <Text style={S.headerSub}>Relatório Financeiro  ·  Status: {statusPt}</Text>
            </View>
          </View>
          <View style={S.headerRight}>
            <Text style={S.headerPeriod}>{period}</Text>
            <Text style={S.headerGenDate}>Gerado em {genDate}</Text>
          </View>
        </View>

        {/* ── Footer fixo ─────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Shopping das Ferramentas — Confidencial</Text>
          <Text
            style={S.footerPage}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

        {/* ── KPIs ────────────────────────────────────────────────────── */}
        {includeOrders && (
          <View style={S.kpiGrid}>
            {[
              { label: 'Receita Total',    value: currency(summary.totalRevenue ?? 0), dark: false },
              { label: 'Ticket Médio',     value: currency(summary.avgTicket    ?? 0), dark: false },
              { label: 'Total de Pedidos', value: String(summary.ordersCount    ?? 0), dark: true  },
              { label: 'Taxa de Conversão',value: `${conversion.toFixed(1)}%`,         dark: true  },
            ].map((kpi, i) => (
              <View key={i} style={[S.kpiCard, kpi.dark ? S.kpiCardDark : {}]}>
                <Text style={S.kpiLabel}>{kpi.label}</Text>
                <Text style={S.kpiValue}>{kpi.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Faturamento Mensal ───────────────────────────────────────── */}
        {includeOrders && monthlyRows.length > 0 && (
          <View style={S.section}>
            <SectionTitle>Faturamento Mensal</SectionTitle>
            <Table
              cols={[
                { label: 'Mês',         flex: 3 },
                { label: 'Pedidos',     flex: 1, right: true },
                { label: 'Faturamento', flex: 2, right: true },
              ]}
              rows={monthlyRows}
              totals={monthlyTotals}
            />
          </View>
        )}

        {/* ── Top Produtos ─────────────────────────────────────────────── */}
        {includeOrders && productRows.length > 0 && (
          <View style={S.section}>
            <SectionTitle>Top Produtos por Receita</SectionTitle>
            <Table
              cols={[
                { label: 'Produto',  flex: 5 },
                { label: 'Qtd',      flex: 1, right: true },
                { label: 'Receita',  flex: 2, right: true },
              ]}
              rows={productRows}
              totals={productTotals}
            />
          </View>
        )}

        {/* ── Status dos Pedidos ───────────────────────────────────────── */}
        {statusRows.length > 0 && (
          <View style={S.section}>
            <SectionTitle>Status dos Pedidos</SectionTitle>
            <Table
              cols={[
                { label: 'Status', flex: 4 },
                { label: 'Qtd',    flex: 1, right: true },
              ]}
              rows={statusRows}
              totals={['TOTAL', statusTotal]}
            />
          </View>
        )}

        {/* ── Saúde do Estoque ─────────────────────────────────────────── */}
        {summary.stockSummary && (
          <View style={S.section}>
            <SectionTitle>Saúde do Estoque</SectionTitle>

            {/* Cards de resumo */}
            <View style={S.stockRow}>
              {[
                { label: 'Total de Itens',       value: String(summary.stockSummary.totalItems),       warn: false },
                { label: 'Baixo Estoque',         value: String(summary.stockSummary.lowStockCount),    warn: summary.stockSummary.lowStockCount > 0 },
                { label: 'Zerados',               value: String(summary.stockSummary.zeroStockCount),   warn: summary.stockSummary.zeroStockCount > 0 },
                { label: 'Valor Potencial',        value: currency(summary.stockSummary.totalStockValue), warn: false },
              ].map((card, i) => (
                <View key={i} style={S.stockCard}>
                  <Text style={S.stockLabel}>{card.label}</Text>
                  <Text style={[S.stockValue, card.warn ? S.stockValueWarn : {}]}>
                    {card.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Itens críticos */}
            {summary.lowStockItems && summary.lowStockItems.length > 0 && (
              <View>
                <View style={[S.sectionHeader, { marginTop: 4, marginBottom: 6 }]}>
                  <View style={[S.sectionAccent, { backgroundColor: C.redMid }]} />
                  <Text style={[S.sectionTitle, { fontSize: 8.5, color: C.red }]}>
                    Itens Críticos — {summary.lowStockItems.length} produto(s)
                  </Text>
                </View>
                <Table
                  cols={[
                    { label: 'Produto', flex: 4 },
                    { label: 'SKU',     flex: 2 },
                    { label: 'Estoque', flex: 1, right: true },
                    { label: 'Mínimo', flex: 1, right: true },
                  ]}
                  rows={summary.lowStockItems.map(p => [
                    p.name, p.sku ?? '—', p.stock, p.minStock,
                  ])}
                />
              </View>
            )}
          </View>
        )}

      </Page>
    </Document>
  );
}

/** Gera o PDF server-side e retorna um Buffer (consumido pelo API route). */
export async function generateFinancialReportPdf(summary: FinancialReportSummary): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <FinancialReportDocument summary={summary} />
  );
  return Buffer.from(buffer);
}
