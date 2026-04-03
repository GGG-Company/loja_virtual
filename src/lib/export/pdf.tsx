/**
 * PdfReportService
 * Recebe dados já prontos (FinancialReportSummary) e devolve um Buffer PDF.
 * Usa @react-pdf/renderer — escolhido sobre Puppeteer porque:
 *   • Não exige headless browser (menor footprint de memória)
 *   • Paginação, quebras e repetição de cabeçalho via API declarativa
 *   • renderToBuffer roda em Node.js puro (compatível com Next.js App Router)
 *
 * Características:
 * - Cabeçalho fixo em todas as páginas (logo + período + data de geração)
 * - Rodapé fixo com "Página X de Y"
 * - Tabelas com zebra striping e bordas
 * - wrap={false} em cada linha — nunca quebra uma linha ao meio
 * - Retorna Buffer (usado pelo API route server-side)
 */
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from '@react-pdf/renderer';
import type { FinancialReportSummary } from '@/types/financial-report';
import { statusToPt } from '@/lib/i18n';

// ── Helpers ───────────────────────────────────────────────────────────────
const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (s?: string) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

const filterStatusPt = (s?: string) =>
  ({ ALL: 'Todos', COMPLETED: 'Concluídos', PENDING: 'Pendentes', REFUNDED: 'Reembolsados' }[s ?? 'ALL'] ?? 'Todos');

// ── Estilos ───────────────────────────────────────────────────────────────
const NAVY   = '#0F172A';
const GRAY50 = '#F9FAFB';
const GRAY   = '#E5E7EB';
const GRAY6  = '#6B7280';
const GREEN  = '#D1FAE5';
const GREEN9 = '#065F46';

const styles = StyleSheet.create({
  page: {
    fontSize:    9,
    color:       NAVY,
    paddingTop:  72,   // espaço para o header fixo
    paddingBottom: 36, // espaço para o footer fixo
    paddingHorizontal: 28,
    fontFamily:  'Helvetica',
  },

  // ── Header fixo ────────────────────────────────────────────────────────
  pageHeader: {
    position:    'absolute',
    top:         0,
    left:        0,
    right:       0,
    height:      58,
    backgroundColor: NAVY,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 28,
    paddingVertical:   12,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerCompany: {
    fontSize:   14,
    fontFamily: 'Helvetica-Bold',
    color:      '#FFFFFF',
  },
  headerSub: {
    fontSize: 8,
    color:    '#94A3B8',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerPeriod: {
    fontSize:  9,
    color:     '#CBD5E1',
    fontFamily: 'Helvetica-Bold',
  },
  headerGenDate: {
    fontSize: 8,
    color:    '#64748B',
    marginTop: 2,
  },

  // ── Footer fixo ────────────────────────────────────────────────────────
  pageFooter: {
    position:  'absolute',
    bottom:    0,
    left:      0,
    right:     0,
    height:    26,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    borderTopWidth: 1,
    borderTopColor: GRAY,
    backgroundColor: GRAY50,
  },
  footerText: {
    fontSize: 8,
    color:    GRAY6,
  },

  // ── Seções ─────────────────────────────────────────────────────────────
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize:    10,
    fontFamily:  'Helvetica-Bold',
    color:       NAVY,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── KPI cards ──────────────────────────────────────────────────────────
  kpiRow: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  14,
  },
  kpiCard: {
    flex:            1,
    borderWidth:     1,
    borderColor:     GRAY,
    borderRadius:    6,
    padding:         10,
    backgroundColor: GRAY50,
  },
  kpiLabel: {
    fontSize: 8,
    color:    GRAY6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom:  4,
  },
  kpiValue: {
    fontSize:   13,
    fontFamily: 'Helvetica-Bold',
    color:      NAVY,
  },

  // ── Tabela ─────────────────────────────────────────────────────────────
  table: {
    width:       '100%',
    borderWidth:  1,
    borderColor:  GRAY,
    borderRadius: 4,
    overflow:     'hidden',
  },
  tableHeaderRow: {
    flexDirection:   'row',
    backgroundColor: NAVY,
    minHeight:       22,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight:     18,
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: GRAY50,
  },
  tableRowTotal: {
    backgroundColor: GREEN,
    borderTopWidth:  1,
    borderTopColor:  '#A7F3D0',
  },
  cell: {
    flex:              1,
    paddingHorizontal: 6,
    paddingVertical:   4,
    borderRightWidth:  1,
    borderRightColor:  GRAY,
    justifyContent:    'center',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellText: {
    fontSize: 8.5,
    color:    NAVY,
  },
  cellTextHeader: {
    fontSize:   8.5,
    fontFamily: 'Helvetica-Bold',
    color:      '#F8FAFC',
    textAlign:  'center',
  },
  cellTextRight: {
    textAlign: 'right',
  },
  cellTextTotal: {
    fontSize:   8.5,
    fontFamily: 'Helvetica-Bold',
    color:      GREEN9,
    textAlign:  'right',
  },
  cellTextTotalLabel: {
    fontSize:   8.5,
    fontFamily: 'Helvetica-Bold',
    color:      GREEN9,
  },
});

// ── Sub-componentes ───────────────────────────────────────────────────────
interface ColConfig {
  label:    string;
  flex?:    number;
  right?:   boolean;
  bold?:    boolean;
}

interface TableProps {
  cols:    ColConfig[];
  rows:    (string | number)[][];
  totals?: (string | number | null)[];
}

function Table({ cols, rows, totals }: TableProps) {
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeaderRow} wrap={false}>
        {cols.map((col, i) => (
          <View
            key={i}
            style={[
              styles.cell,
              col.flex != null ? { flex: col.flex } : {},
              i === cols.length - 1 ? styles.cellLast : {},
            ]}
          >
            <Text style={styles.cellTextHeader}>{col.label}</Text>
          </View>
        ))}
      </View>

      {/* Data rows — wrap={false} garante que nenhuma linha seja cortada no fim de página */}
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={[styles.tableRow, ri % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
          wrap={false}
        >
          {cols.map((col, ci) => (
            <View
              key={ci}
              style={[
                styles.cell,
                col.flex != null ? { flex: col.flex } : {},
                ci === cols.length - 1 ? styles.cellLast : {},
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  col.right ? styles.cellTextRight : {},
                  col.bold  ? { fontFamily: 'Helvetica-Bold' } : {},
                ]}
              >
                {String(row[ci] ?? '—')}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {/* Linha totalizador */}
      {totals && (
        <View style={styles.tableRowTotal} wrap={false}>
          {cols.map((col, ci) => (
            <View
              key={ci}
              style={[
                styles.cell,
                col.flex != null ? { flex: col.flex } : {},
                ci === cols.length - 1 ? styles.cellLast : {},
              ]}
            >
              {totals[ci] != null ? (
                <Text
                  style={ci === 0 ? styles.cellTextTotalLabel : styles.cellTextTotal}
                >
                  {String(totals[ci])}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Documento principal ───────────────────────────────────────────────────
export function FinancialReportDocument({ summary }: { summary: FinancialReportSummary }) {
  const period   = `${fmtDate(summary.filters?.startDate)} a ${fmtDate(summary.filters?.endDate)}`;
  const genDate  = new Date().toLocaleString('pt-BR');
  const statusPt = filterStatusPt(summary.filters?.status);

  const includeOrders = summary.totalRevenue !== null;

  const conversion = summary.ordersCount && summary.ordersCount > 0
    ? ((summary.ordersCount - (summary.pendingCount ?? 0) - (summary.refundedCount ?? 0)) / summary.ordersCount * 100)
    : 0;

  // Linhas das tabelas
  const monthlyRows = summary.monthlyRevenue.map(m => [m.month, m.orders, currency(m.total)]);
  const monthlyTotals = [
    'TOTAL',
    summary.monthlyRevenue.reduce((s, m) => s + m.orders, 0),
    currency(summary.monthlyRevenue.reduce((s, m) => s + m.total, 0)),
  ];

  const productRows = summary.topProducts.map(p => [p.name, p.qty, currency(p.revenue)]);
  const productTotals = [
    'TOTAL',
    summary.topProducts.reduce((s, p) => s + p.qty, 0),
    currency(summary.topProducts.reduce((s, p) => s + p.revenue, 0)),
  ];

  const statusRows = summary.statusBreakdown
    ? Object.entries(summary.statusBreakdown).map(([s, v]) => [statusToPt(s), v])
    : [];

  return (
    <Document title="Relatório Financeiro" author="Shopping das Ferramentas">
      <Page size="A4" style={styles.page}>

        {/* ── Cabeçalho fixo — repete em cada página ──────────────────── */}
        <View style={styles.pageHeader} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.headerCompany}>Shopping das Ferramentas</Text>
            <Text style={styles.headerSub}>Relatório Financeiro  ·  Status: {statusPt}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerPeriod}>{period}</Text>
            <Text style={styles.headerGenDate}>Gerado em {genDate}</Text>
          </View>
        </View>

        {/* ── Rodapé fixo com numeração de páginas ────────────────────── */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerText}>Shopping das Ferramentas — Confidencial</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        {includeOrders && (
          <View style={styles.kpiRow}>
            {[
              { label: 'Receita Total',    value: currency(summary.totalRevenue ?? 0) },
              { label: 'Ticket Médio',     value: currency(summary.avgTicket    ?? 0) },
              { label: 'Total de Pedidos', value: String(summary.ordersCount    ?? 0) },
              { label: 'Taxa Conversão',   value: `${conversion.toFixed(1)}%` },
            ].map((kpi, i) => (
              <View key={i} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={styles.kpiValue}>{kpi.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Faturamento Mensal ───────────────────────────────────────── */}
        {includeOrders && monthlyRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Faturamento Mensal</Text>
            <Table
              cols={[
                { label: 'Mês',              flex: 3 },
                { label: 'Pedidos',          flex: 1, right: true },
                { label: 'Faturamento',      flex: 2, right: true },
              ]}
              rows={monthlyRows}
              totals={monthlyTotals}
            />
          </View>
        )}

        {/* ── Top Produtos ─────────────────────────────────────────────── */}
        {includeOrders && productRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Produtos por Receita</Text>
            <Table
              cols={[
                { label: 'Produto',          flex: 4 },
                { label: 'Qtd',              flex: 1, right: true },
                { label: 'Receita',          flex: 2, right: true },
              ]}
              rows={productRows}
              totals={productTotals}
            />
          </View>
        )}

        {/* ── Status dos Pedidos ───────────────────────────────────────── */}
        {statusRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status dos Pedidos</Text>
            <Table
              cols={[
                { label: 'Status',  flex: 4 },
                { label: 'Qtd',     flex: 1, right: true },
              ]}
              rows={statusRows}
              totals={[
                'TOTAL',
                statusRows.reduce((s, r) => s + (Number(r[1]) || 0), 0),
              ]}
            />
          </View>
        )}

        {/* ── Saúde do Estoque ─────────────────────────────────────────── */}
        {summary.stockSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saúde do Estoque</Text>
            <Table
              cols={[
                { label: 'Total Itens',         flex: 2 },
                { label: 'Baixo Estoque',       flex: 2, right: true },
                { label: 'Zerados',             flex: 1, right: true },
                { label: 'Negativos',           flex: 1, right: true },
                { label: 'Valor Potencial',     flex: 2, right: true },
              ]}
              rows={[[
                summary.stockSummary.totalItems,
                summary.stockSummary.lowStockCount,
                summary.stockSummary.zeroStockCount,
                summary.stockSummary.negativeStockCount,
                currency(summary.stockSummary.totalStockValue),
              ]]}
            />

            {summary.lowStockItems && summary.lowStockItems.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { fontSize: 8.5 }]}>
                  Itens Críticos ({summary.lowStockItems.length})
                </Text>
                <Table
                  cols={[
                    { label: 'Produto',  flex: 4 },
                    { label: 'SKU',      flex: 2 },
                    { label: 'Estoque',  flex: 1, right: true },
                    { label: 'Mínimo',  flex: 1, right: true },
                  ]}
                  rows={summary.lowStockItems.map(p => [
                    p.name,
                    p.sku ?? '—',
                    p.stock,
                    p.minStock,
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
