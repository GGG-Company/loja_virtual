/**
 * PDF Reports — Feira das Ferramentas
 * Gerado server-side com @react-pdf/renderer.
 * Exporta: generateFinancialReportPdf, generatePickingReportPdf
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

// ── Logo ──────────────────────────────────────────────────────────────────
function loadLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo_shopping_das_ferramentas.jpg');
    const buf = fs.readFileSync(logoPath);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

// ── Paleta ────────────────────────────────────────────────────────────────
const C = {
  red:        '#CC1020',
  redLight:   '#FFF0F1',
  redMid:     '#F85555',
  dark:       '#1A1A1A',
  navy:       '#0F172A',
  slate:      '#334155',
  slateLight: '#64748B',
  bg:         '#F8FAFC',
  border:     '#E2E8F0',
  white:      '#FFFFFF',
  greenBg:    '#ECFDF5',
  greenText:  '#065F46',
  greenBorder:'#A7F3D0',
  text:       '#1E293B',
  textMuted:  '#64748B',
  infoBg:     '#EFF6FF',
  infoBorder: '#BFDBFE',
  infoText:   '#1E40AF',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────
const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (s?: string) => {
  if (!s) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const d = new Date(s.includes('T') ? s : s + 'T12:00:00');
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

const fmtMonth = (key: string) => {
  const [year, month] = key.split('-');
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const m = parseInt(month, 10) - 1;
  return `${MONTHS[m] ?? month}/${year.slice(2)}`;
};

const filterStatusPt = (s?: string) =>
  ({ ALL: 'Todos', COMPLETED: 'Concluídos', PENDING: 'Pendentes', REFUNDED: 'Reembolsados' }
    [s ?? 'ALL'] ?? 'Todos');

// ── Estilos compartilhados ────────────────────────────────────────────────
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

  // ── Header fixo ──────────────────────────────────────────────────────────
  header: {
    position:          'absolute',
    top: 0, left: 0, right: 0,
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
    height: 36, width: 130,
    marginRight: 10,
    objectFit: 'contain' as any,
  },
  headerLogoWrap: { flexDirection: 'row', alignItems: 'center' },
  headerCompany: {
    fontSize: 13, fontFamily: 'Helvetica-Bold',
    color: C.white, letterSpacing: 0.3,
  },
  headerSub:    { fontSize: 7.5, color: '#94A3B8', marginTop: 3 },
  headerRight:  { alignItems: 'flex-end' },
  headerPeriod: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#E2E8F0' },
  headerGenDate:{ fontSize: 7.5, color: '#64748B', marginTop: 3 },

  // ── Footer fixo ──────────────────────────────────────────────────────────
  footer: {
    position:          'absolute',
    bottom: 0, left: 0, right: 0,
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

  // ── KPI grid ─────────────────────────────────────────────────────────────
  kpiGrid:  { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 6, padding: 10,
    borderLeftWidth: 3, borderLeftColor: C.red,
  },
  kpiCardDark: { borderLeftColor: C.slate },
  kpiLabel: {
    fontSize: 7, fontFamily: 'Helvetica-Bold',
    color: C.slateLight, textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 4,
  },
  kpiValue: {
    fontSize: 13, fontFamily: 'Helvetica-Bold',
    color: C.dark, lineHeight: 1,
  },
  kpiSub: { fontSize: 7, color: C.textMuted, marginTop: 3 },

  // ── Info box (filtros) ────────────────────────────────────────────────────
  infoBox: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            6,
    marginBottom:   12,
    padding:        8,
    backgroundColor: C.infoBg,
    borderWidth:    1, borderColor: C.infoBorder,
    borderRadius:   5,
  },
  infoItem: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
  },
  infoLabel: {
    fontSize:   7, fontFamily: 'Helvetica-Bold',
    color:      C.infoText, textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: { fontSize: 7.5, color: C.slate },
  infoDot: {
    width: 3, height: 3,
    borderRadius: 2,
    backgroundColor: C.infoBorder,
    marginHorizontal: 2,
  },

  // ── Seção ─────────────────────────────────────────────────────────────────
  section:       { marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  sectionAccent: { width: 3, height: 14, backgroundColor: C.red, borderRadius: 2 },
  sectionTitle:  {
    fontSize: 9, fontFamily: 'Helvetica-Bold',
    color: C.dark, textTransform: 'uppercase', letterSpacing: 0.6,
  },

  // ── Tabela ────────────────────────────────────────────────────────────────
  table: {
    width: '100%',
    borderWidth: 1, borderColor: C.border,
    borderRadius: 5, overflow: 'hidden',
    backgroundColor: C.white,
  },
  tHead:     { flexDirection: 'row', backgroundColor: C.red, minHeight: 22 },
  tRow:      { flexDirection: 'row', minHeight: 20 },
  tRowEven:  { backgroundColor: C.white },
  tRowOdd:   { backgroundColor: C.bg },
  tRowTotal: {
    backgroundColor: C.greenBg,
    borderTopWidth: 1, borderTopColor: C.greenBorder,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRightWidth: 1, borderRightColor: C.border,
    justifyContent: 'center',
  },
  cellLast:      { borderRightWidth: 0 },
  cellTh:        { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white },
  cellThCenter:  { textAlign: 'center' },
  cellTd:        { fontSize: 8, color: C.text },
  cellRight:     { textAlign: 'right' },
  cellBold:      { fontFamily: 'Helvetica-Bold' },
  cellTotal:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.greenText },
  cellTotalRight:{ textAlign: 'right' },

  // ── Stock ─────────────────────────────────────────────────────────────────
  stockRow:  { flexDirection: 'row', gap: 8, marginBottom: 10 },
  stockCard: {
    flex: 1, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 6, padding: 8,
  },
  stockLabel: {
    fontSize: 7, fontFamily: 'Helvetica-Bold',
    color: C.slateLight, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 4,
  },
  stockValue:     { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark },
  stockValueWarn: { color: C.red },
});

// ── Componentes ───────────────────────────────────────────────────────────
interface ColDef {
  label:   string;
  flex?:   number;
  right?:  boolean;
  bold?:   boolean;
  center?: boolean;
}

function Table({ cols, rows, totals }: {
  cols:    ColDef[];
  rows:    (string | number)[][];
  totals?: (string | number | null)[];
}) {
  return (
    <View style={S.table}>
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
            <Text style={[S.cellTh, (col.center || col.right) ? S.cellThCenter : {}]}>
              {col.label}
            </Text>
          </View>
        ))}
      </View>

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
                col.right ? S.cellRight : {},
                col.bold  ? S.cellBold  : {},
              ]}>
                {String(row[ci] ?? '—')}
              </Text>
            </View>
          ))}
        </View>
      ))}

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

function PageHeader({
  logoSrc,
  subtitle,
  periodLine,
  genDate,
}: {
  logoSrc:    string | null;
  subtitle:   string;
  periodLine: string;
  genDate:    string;
}) {
  return (
    <View style={S.header} fixed>
      <View style={S.headerAccent} />
      <View style={S.headerLogoWrap}>
        {logoSrc && <Image src={logoSrc} style={S.headerLogo} />}
        <View>
          <Text style={S.headerCompany}>Feira das Ferramentas</Text>
          <Text style={S.headerSub}>{subtitle}</Text>
        </View>
      </View>
      <View style={S.headerRight}>
        <Text style={S.headerPeriod}>{periodLine}</Text>
        <Text style={S.headerGenDate}>Gerado em {genDate}</Text>
      </View>
    </View>
  );
}

function PageFooter({ label }: { label: string }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>{label}</Text>
      <Text
        style={S.footerPage}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Relatório Financeiro
// ═══════════════════════════════════════════════════════════════════════════
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

  // Filtros aplicados para exibição
  const filterTags: { label: string; value: string }[] = [
    { label: 'Período', value: period },
    { label: 'Status',  value: statusPt },
    ...(summary.filters?.minTotal != null
      ? [{ label: 'Mínimo', value: currency(Number(summary.filters.minTotal)) }]
      : []),
    ...(summary.filters?.maxTotal != null
      ? [{ label: 'Máximo', value: currency(Number(summary.filters.maxTotal)) }]
      : []),
    ...(summary.filters?.productQuery
      ? [{ label: 'Produto', value: summary.filters.productQuery }]
      : []),
  ];

  return (
    <Document title="Relatório Financeiro" author="Feira das Ferramentas">
      <Page size="A4" style={S.page}>

        <PageHeader
          logoSrc={logoSrc}
          subtitle={`Relatório Financeiro  ·  Status: ${statusPt}`}
          periodLine={period}
          genDate={genDate}
        />
        <PageFooter label="Feira das Ferramentas — Confidencial" />

        {/* Filtros aplicados */}
        <View style={S.infoBox}>
          {filterTags.map((f, i) => (
            <View key={i} style={S.infoItem}>
              {i > 0 && <View style={S.infoDot} />}
              <Text style={S.infoLabel}>{f.label}: </Text>
              <Text style={S.infoValue}>{f.value}</Text>
            </View>
          ))}
        </View>

        {/* KPIs */}
        {includeOrders && (
          <View style={S.kpiGrid}>
            {[
              { label: 'Receita Total',     value: currency(summary.totalRevenue ?? 0), sub: 'no período',             dark: false },
              { label: 'Ticket Médio',      value: currency(summary.avgTicket    ?? 0), sub: 'por pedido',             dark: false },
              { label: 'Total de Pedidos',  value: String(summary.ordersCount    ?? 0), sub: 'no período',             dark: true  },
              { label: 'Taxa de Conversão', value: `${conversion.toFixed(1)}%`,         sub: 'concluídos / total',     dark: true  },
            ].map((kpi, i) => (
              <View key={i} style={[S.kpiCard, kpi.dark ? S.kpiCardDark : {}]}>
                <Text style={S.kpiLabel}>{kpi.label}</Text>
                <Text style={S.kpiValue}>{kpi.value}</Text>
                <Text style={S.kpiSub}>{kpi.sub}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Faturamento Mensal */}
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

        {/* Top Produtos */}
        {includeOrders && productRows.length > 0 && (
          <View style={S.section} break>
            <SectionTitle>Top Produtos por Receita</SectionTitle>
            <Table
              cols={[
                { label: 'Produto', flex: 5 },
                { label: 'Qtd',     flex: 1, right: true },
                { label: 'Receita', flex: 2, right: true },
              ]}
              rows={productRows}
              totals={productTotals}
            />
          </View>
        )}

        {/* Status dos Pedidos */}
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

        {/* Saúde do Estoque */}
        {summary.stockSummary && (
          <View style={S.section} break>
            <SectionTitle>Saúde do Estoque</SectionTitle>

            <View style={S.stockRow}>
              {[
                { label: 'Total de Itens',  value: String(summary.stockSummary.totalItems),        warn: false },
                { label: 'Baixo Estoque',   value: String(summary.stockSummary.lowStockCount),     warn: summary.stockSummary.lowStockCount > 0 },
                { label: 'Zerados',         value: String(summary.stockSummary.zeroStockCount),    warn: summary.stockSummary.zeroStockCount > 0 },
                { label: 'Valor Potencial', value: currency(summary.stockSummary.totalStockValue), warn: false },
              ].map((card, i) => (
                <View key={i} style={S.stockCard}>
                  <Text style={S.stockLabel}>{card.label}</Text>
                  <Text style={[S.stockValue, card.warn ? S.stockValueWarn : {}]}>
                    {card.value}
                  </Text>
                </View>
              ))}
            </View>

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
                    { label: 'Mínimo',  flex: 1, right: true },
                  ]}
                  rows={summary.lowStockItems.map(p => [p.name, p.sku ?? '—', p.stock, p.minStock])}
                />
              </View>
            )}
          </View>
        )}

      </Page>
    </Document>
  );
}

export async function generateFinancialReportPdf(summary: FinancialReportSummary): Promise<Buffer> {
  const buffer = await renderToBuffer(<FinancialReportDocument summary={summary} />);
  return Buffer.from(buffer);
}

// ═══════════════════════════════════════════════════════════════════════════
// Relatório de Picking
// ═══════════════════════════════════════════════════════════════════════════
export interface PickingPdfItem {
  id:       string;
  name:     string;
  sku?:     string | null;
  location: string;
  quantity: number;
  orders?:  Array<{ orderNumber: string; quantity: number }>;
}

export interface PickingPdfOrder {
  orderNumber: string;
  customerName?: string;
  createdAt?: string;
  items: Array<{
    name: string;
    sku?: string | null;
    location: string;
    quantity: number;
  }>;
}

export function PickingReportDocument({ orders }: { orders: PickingPdfOrder[] }) {
  const logoSrc = loadLogoBase64();
  const genDate = new Date().toLocaleString('pt-BR');

  const totalOrders = orders.length;
  const totalItems  = orders.reduce((s, o) => s + o.items.length, 0);
  const totalUnits  = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);

  return (
    <Document title="Relatório de Picking" author="Feira das Ferramentas">
      <Page size="A4" style={S.page}>

        <PageHeader
          logoSrc={logoSrc}
          subtitle="Relatório de Picking  ·  Separação de Pedidos"
          periodLine={`${totalOrders} pedido(s)  ·  ${totalItems} produto(s)  ·  ${totalUnits} unidade(s)`}
          genDate={genDate}
        />
        <PageFooter label="Feira das Ferramentas — Picking" />

        {/* KPIs */}
        <View style={S.kpiGrid}>
          {[
            { label: 'Pedidos',        value: String(totalOrders), sub: 'para separar',       dark: false },
            { label: 'Produtos',       value: String(totalItems),  sub: 'linhas de produto',  dark: false },
            { label: 'Unidades',       value: String(totalUnits),  sub: 'total a separar',    dark: true  },
          ].map((kpi, i) => (
            <View key={i} style={[S.kpiCard, kpi.dark ? S.kpiCardDark : {}]}>
              <Text style={S.kpiLabel}>{kpi.label}</Text>
              <Text style={S.kpiValue}>{kpi.value}</Text>
              <Text style={S.kpiSub}>{kpi.sub}</Text>
            </View>
          ))}
        </View>

        {/* Um bloco por pedido */}
        {orders.map((order, oi) => (
          <View key={oi} style={S.section}>
            <SectionTitle>
              {order.orderNumber}
              {order.customerName ? `  ·  ${order.customerName}` : ''}
              {order.createdAt ? `  ·  ${order.createdAt}` : ''}
            </SectionTitle>
            <Table
              cols={[
                { label: 'Produto',             flex: 4 },
                { label: 'SKU',                 flex: 1.5 },
                { label: 'Endereço no Estoque', flex: 2.5 },
                { label: 'Qtd',                 flex: 0.8, right: true },
              ]}
              rows={order.items.map(i => [i.name, i.sku || '—', i.location, i.quantity])}
              totals={['TOTAL', null, null, order.items.reduce((s, i) => s + i.quantity, 0)]}
            />
          </View>
        ))}

      </Page>
    </Document>
  );
}

export async function generatePickingReportPdf(orders: PickingPdfOrder[]): Promise<Buffer> {
  const buffer = await renderToBuffer(<PickingReportDocument orders={orders} />);
  return Buffer.from(buffer);
}
