import ExcelJS from 'exceljs';
import type { FinancialReportSummary } from '@/types/financial-report';
import { statusToPt } from '@/lib/i18n';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export async function buildFinancialReportExcel(summary: FinancialReportSummary): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Relatório Financeiro');

  ws.properties.defaultRowHeight = 20;
  ws.columns = [
    { header: '', key: 'a', width: 30 },
    { header: '', key: 'b', width: 18 },
    { header: '', key: 'c', width: 18 },
    { header: '', key: 'd', width: 18 },
    { header: '', key: 'e', width: 18 },
  ];
  // Freeze title/info rows
  ws.views = [{ state: 'frozen', ySplit: 2 }];

  const filterStatusPt = (s?: string) => {
    const map: Record<string, string> = {
      ALL: 'Todos',
      COMPLETED: 'Concluídos',
      PENDING: 'Pendentes',
      REFUNDED: 'Reembolsados/Cancelados',
    };
    return s ? (map[s] ?? s) : 'Todos';
  };
  const fmtDate = (s?: string) => {
    if (!s) return '---';
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
  };
  const genInfo = `Período: ${fmtDate(summary.filters?.startDate)} a ${fmtDate(summary.filters?.endDate)} · Status: ${filterStatusPt(summary.filters?.status)} · Gerado em ${new Date().toLocaleString('pt-BR')}`;

  ws.mergeCells('A1:E1');
  const title = ws.getCell('A1');
  title.value = 'Relatório Financeiro';
  title.font = { bold: true, size: 18 }; ws.getRow(1).height = 26;

  ws.mergeCells('A2:E2');
  const info = ws.getCell('A2');
  info.value = genInfo; info.font = { size: 11, color: { argb: 'FF374151' } };

  // Summary (orders)
  if (summary.totalRevenue !== null) {
    ws.addRow([]);
    ws.mergeCells('A4:E4');
    const sTitle = ws.getCell('A4');
    sTitle.value = 'Resumo de pedidos'; sTitle.font = { bold: true, size: 12 };

    const headers = ['Receita', 'Ticket médio', 'Pendentes', 'Conversão'];
    const values = [
      currency(summary.totalRevenue || 0),
      currency(summary.avgTicket || 0),
      String(summary.pendingCount ?? 0),
      `${(((summary.ordersCount || 0) - (summary.pendingCount || 0) - (summary.refundedCount || 0)) / (summary.ordersCount || 1)) * 100 | 0}%`,
    ];

    ws.addRow(headers);
    ws.addRow(values);
    const hdrRow = ws.getRow(ws.rowCount - 1 - 1);
    hdrRow.eachCell((c) => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; c.font = { bold: true, color: { argb: 'FFF8FAFC' } }; c.alignment = { horizontal: 'center' }; });
  }

  const includeOrders = summary.totalRevenue !== null;
  // Monthly revenue
  if (includeOrders) {
    ws.addRow([]);
    ws.mergeCells(`A${ws.rowCount + 1}:E${ws.rowCount + 1}`);
    ws.getCell(`A${ws.rowCount}`).value = 'Visão por mês'; ws.getCell(`A${ws.rowCount}`).font = { bold: true };
    ws.addRow(['Mês', 'Pedidos', 'Faturamento']);
    const monthlyHeaderRow = ws.rowCount; // autoFilter over monthly table
    ws.autoFilter = {
      from: { row: monthlyHeaderRow, column: 1 },
      to: { row: monthlyHeaderRow, column: 3 },
    } as any;
    summary.monthlyRevenue.forEach((m) => {
      const row = ws.addRow([m.month, m.orders, m.total]);
      row.getCell(3).numFmt = '"R$" #,##0.00';
    });
  }

  // Top products
  if (includeOrders) {
    ws.addRow([]);
    ws.mergeCells(`A${ws.rowCount + 1}:E${ws.rowCount + 1}`);
    ws.getCell(`A${ws.rowCount}`).value = 'Top por receita'; ws.getCell(`A${ws.rowCount}`).font = { bold: true };
    ws.addRow(['Produto', 'Qtd', 'Receita']);
    summary.topProducts.forEach((p) => {
      const row = ws.addRow([p.name, p.qty, p.revenue]);
      row.getCell(3).numFmt = '"R$" #,##0.00';
    });
  }

  // Status breakdown
  if (summary.statusBreakdown) {
    ws.addRow([]);
    ws.mergeCells(`A${ws.rowCount + 1}:E${ws.rowCount + 1}`);
    ws.getCell(`A${ws.rowCount}`).value = 'Status dos pedidos'; ws.getCell(`A${ws.rowCount}`).font = { bold: true };
    ws.addRow(['Status', 'Qtd']);
    Object.entries(summary.statusBreakdown).forEach(([s, v]) => ws.addRow([statusToPt(s), v]));
  }

  // Stock summary
  if (summary.stockSummary) {
    ws.addRow([]);
    ws.mergeCells(`A${ws.rowCount + 1}:E${ws.rowCount + 1}`);
    ws.getCell(`A${ws.rowCount}`).value = 'Saúde do estoque'; ws.getCell(`A${ws.rowCount}`).font = { bold: true };
    ws.addRow(['Itens', 'Baixo estoque', 'Zerados', 'Negativos', 'Valor potencial']);
    {
      const row = ws.addRow([
        summary.stockSummary.totalItems,
        summary.stockSummary.lowStockCount,
        summary.stockSummary.zeroStockCount,
        summary.stockSummary.negativeStockCount,
        summary.stockSummary.totalStockValue,
      ]);
      row.getCell(5).numFmt = '"R$" #,##0.00';
    }

    if (summary.lowStockItems && summary.lowStockItems.length) {
      ws.addRow([]);
      ws.addRow(['Produto', 'SKU', 'Estoque', 'Mínimo']);
      summary.lowStockItems.forEach((p) => ws.addRow([p.name, p.sku || '', p.stock, p.minStock]));
    }
  }

  // Borders and alignment for data tables
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    row.eachCell((cell) => {
      const val = String(cell.value ?? '');
      if (val && !val.startsWith('Relatório') && !val.startsWith('Período:')) {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        const isNumber = typeof cell.value === 'number';
        const isCurrency = /^R\$\s?/i.test(val);
        const isPercent = /%$/.test(val);
        if (isNumber || isCurrency || isPercent) {
          cell.alignment = { horizontal: 'right' };
        }
      }
    });
  }

  // Make table section headers visually distinct
  const darkHeader = (rowIdx: number) => {
    const row = ws.getRow(rowIdx);
    row.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      c.font = { bold: true, color: { argb: 'FFF8FAFC' } };
      c.alignment = { horizontal: 'center' };
    });
  };
  // Apply to known header rows: after each section title we added headers immediately
  // Find rows where value equals known headers and style them
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const a = String(row.getCell(1).value ?? '');
    const b = String(row.getCell(2).value ?? '');
    const c = String(row.getCell(3).value ?? '');
    const d = String(row.getCell(4).value ?? '');
    const e = String(row.getCell(5).value ?? '');
    const isSummaryHeader = a === 'Receita' && b === 'Ticket médio' && c === 'Pendentes' && d === 'Conversão';
    const isMonthlyHeader = a === 'Mês' && b === 'Pedidos' && c === 'Faturamento';
    const isProductsHeader = a === 'Produto' && b === 'Qtd' && c === 'Receita';
    const isStatusHeader = a === 'Status' && b === 'Qtd' && !c && !d && !e;
    const isStockHeader = a === 'Itens' && b === 'Baixo estoque' && c === 'Zerados' && d === 'Negativos' && e === 'Valor potencial';
    if (isSummaryHeader || isMonthlyHeader || isProductsHeader || isStatusHeader || isStockHeader) darkHeader(r);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
