import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import type { FinancialReportSummary } from '@/types/financial-report';
import { statusToPt } from '@/lib/i18n';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, color: '#0F172A' },
  h1: { fontSize: 20, marginBottom: 6, fontWeight: 700 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#E0F2FE', fontWeight: 600 },
  card: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 12 },
  titleSmall: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', marginBottom: 4 },
  table: { width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0, borderColor: '#E5E7EB' },
  tableRow: { flexDirection: 'row' },
  tableCol: { borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, borderColor: '#E5E7EB', padding: 6, flexGrow: 1 },
  tableColRight: { borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, borderColor: '#E5E7EB', padding: 6, width: 80, textAlign: 'right' },
  th: { backgroundColor: '#0F172A', color: '#F8FAFC', fontWeight: 700, textAlign: 'center' },
});

function Chips({ summary }: { summary: FinancialReportSummary }) {
  const chips: string[] = [];
  const fmtDate = (s?: string) => {
    if (!s) return '---';
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
  };
  chips.push(`Período: ${fmtDate(summary.filters?.startDate)} a ${fmtDate(summary.filters?.endDate)}`);
  const filterStatusPt = (s?: string) => {
    const map: Record<string, string> = {
      ALL: 'Todos',
      COMPLETED: 'Concluídos',
      PENDING: 'Pendentes',
      REFUNDED: 'Reembolsados/Cancelados',
    };
    return s ? (map[s] ?? s) : 'Todos';
  };
  chips.push(`Status: ${filterStatusPt(summary.filters?.status)}`);
  chips.push(summary.filters?.includeOrders === false ? 'Pedidos: oculto' : 'Pedidos incluídos');
  if (summary.filters?.includeStock) chips.push('Estoque incluído');
  if (summary.filters?.includeStatusBreakdown) chips.push('Detalhe de status');
  if (summary.filters?.minTotal) chips.push(`Mín: ${currency(Number(summary.filters.minTotal))}`);
  if (summary.filters?.maxTotal) chips.push(`Máx: ${currency(Number(summary.filters.maxTotal))}`);
  if (summary.filters?.productQuery) chips.push(`Produto contém: ${summary.filters.productQuery}`);
  if (summary.filters?.criticalOnly) chips.push('Apenas críticos');
  chips.push(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
  return (
    <View style={styles.chipRow}>
      {chips.map((c, i) => (
        <Text key={i} style={styles.chip}>{c}</Text>
      ))}
    </View>
  );
}

function SummaryCard({ summary }: { summary: FinancialReportSummary }) {
  if (summary.totalRevenue === null) return null;
  const conversion = summary.ordersCount && summary.pendingCount !== null && summary.refundedCount !== null && summary.ordersCount > 0
    ? (summary.ordersCount - summary.pendingCount - summary.refundedCount) / summary.ordersCount
    : 0;
  return (
    <View style={styles.card}>
      <Text style={styles.titleSmall}>Resumo de pedidos</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.th]}>
          <Text style={styles.tableCol}>Receita</Text>
          <Text style={styles.tableCol}>Ticket médio</Text>
          <Text style={styles.tableCol}>Pendentes</Text>
          <Text style={styles.tableCol}>Conversão</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCol}>{currency(summary.totalRevenue || 0)}</Text>
          <Text style={styles.tableCol}>{currency(summary.avgTicket || 0)}</Text>
          <Text style={styles.tableCol}>{String(summary.pendingCount ?? 0)}</Text>
          <Text style={styles.tableCol}>{(conversion * 100).toFixed(1)}%</Text>
        </View>
      </View>
    </View>
  );
}

function Table({ headers, rows, right = [], rightWidths = {}, widths = [] as (number | string | undefined)[] }: { headers: string[]; rows: (string | number)[][]; right?: number[]; rightWidths?: Record<number, number>; widths?: (number | string | undefined)[] }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.th]}>
        {headers.map((h, i) => (
          <Text key={i} style={[styles.tableCol, widths[i] ? { width: widths[i] } : {}, { textAlign: 'center' }]}>{h}</Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={styles.tableRow}>
          {r.map((c, j) => (
            <Text key={j} style={[right.includes(j) ? styles.tableColRight : styles.tableCol, right.includes(j) && rightWidths[j] ? { width: rightWidths[j] } : {}, widths[j] ? { width: widths[j] } : {}]}>{String(c)}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function FinancialReportDocument({ summary }: { summary: FinancialReportSummary }) {
  const includeOrders = summary.totalRevenue !== null;
  const monthlyRows = includeOrders
    ? summary.monthlyRevenue.map((m) => [m.month, m.orders, currency(m.total)])
    : [];
  const productsRows = includeOrders
    ? summary.topProducts.map((p) => [p.name, p.qty, currency(p.revenue)])
    : [];
  const statusRows = summary.statusBreakdown
    ? Object.entries(summary.statusBreakdown).map(([s, v]) => [statusToPt(s), v])
    : [];
  const stockRows = summary.stockSummary
    ? [[
      summary.stockSummary.totalItems,
      summary.stockSummary.lowStockCount,
      summary.stockSummary.zeroStockCount,
      summary.stockSummary.negativeStockCount,
      currency(summary.stockSummary.totalStockValue),
    ]]
    : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Relatório Financeiro</Text>
        <Chips summary={summary} />
        {includeOrders && (
          <>
            <SummaryCard summary={summary} />
            <View style={styles.card}>
              <Text style={styles.titleSmall}>Faturamento mensal</Text>
              <Table headers={["Mês", "Pedidos", "Faturamento"]} rows={monthlyRows as any} right={[1,2]} rightWidths={{2: 110}} widths={[120, 70, 110]} />
            </View>
            <View style={styles.card}>
              <Text style={styles.titleSmall}>Top por receita</Text>
              <Table headers={["Produto", "Qtd", "Receita"]} rows={productsRows as any} right={[1,2]} rightWidths={{2: 110}} widths={[250, 50, 110]} />
            </View>
          </>
        )}
        {statusRows.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.titleSmall}>Status dos pedidos</Text>
            <Table headers={["Status", "Qtd"]} rows={statusRows as any} right={[1]} widths={[200, 60]} />
          </View>
        )}
        {stockRows.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.titleSmall}>Saúde do estoque</Text>
            <Table headers={["Itens", "Baixo estoque", "Zerados", "Negativos", "Valor potencial"]} rows={stockRows as any} right={[4]} rightWidths={{4: 110}} widths={[60, 90, 70, 70, 120]} />
            {summary.lowStockItems && summary.lowStockItems.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Table headers={["Produto", "SKU", "Estoque", "Mínimo"]} rows={summary.lowStockItems.map((p) => [p.name, p.sku || '', p.stock, p.minStock]) as any} right={[2,3]} widths={[200, 90, 60, 60]} />
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function generateFinancialReportPdf(summary: FinancialReportSummary): Promise<Blob> {
  const instance = pdf(<FinancialReportDocument summary={summary} />);
  const blob = await instance.toBlob();
  return blob;
}
