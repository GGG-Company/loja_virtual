/**
 * ExcelReportService
 * Recebe dados já prontos (FinancialReportSummary) e devolve um Buffer XLSX.
 * Não busca nada no banco — responsabilidade única de formatação.
 *
 * Características:
 * - Multi-aba: Resumo | Faturamento | Produtos | Status* | Estoque*
 * - Header congelado na linha 1 (ySplit: 1), fundo cinza, texto negrito
 * - Colunas financeiras com numFmt nativo (R$ #,##0.00) — não texto
 * - Auto-width calculado dinamicamente por conteúdo
 * - Linha de Totalizador ao final de cada tabela de dados
 * - Retorna Buffer (usado pelo API route server-side, nunca no browser)
 */
import ExcelJS from 'exceljs';
import type { FinancialReportSummary } from '@/types/financial-report';
import { statusToPt } from '@/lib/i18n';

// ── Paleta ────────────────────────────────────────────────────────────────
const COLOR = {
  headerBg:     'FFE5E7EB', // cinza claro — fundo do cabeçalho de coluna
  headerFont:   'FF111827', // quase preto
  titleBg:      'FF0F172A', // navy — seção título
  titleFont:    'FFF8FAFC',
  totalBg:      'FFD1FAE5', // verde claro — linha totalizador
  totalFont:    'FF065F46',
  border:       'FFD1D5DB',
  rowOdd:       'FFFFFFFF',
  rowEven:      'FFF9FAFB',
};

const CURRENCY_FMT = '"R$"#,##0.00';

// ── Helpers ───────────────────────────────────────────────────────────────
function headerStyle(cell: ExcelJS.Cell) {
  cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headerBg } };
  cell.font   = { bold: true, color: { argb: COLOR.headerFont } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = thinBorder();
}

function thinBorder(): ExcelJS.Borders {
  const s = { style: 'thin' as const, color: { argb: COLOR.border } };
  return { top: s, left: s, bottom: s, right: s, diagonal: {} } as ExcelJS.Borders;
}

function totalStyle(cell: ExcelJS.Cell, isCurrency = false) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.totalBg } };
  cell.font = { bold: true, color: { argb: COLOR.totalFont } };
  cell.border = thinBorder();
  if (isCurrency) cell.numFmt = CURRENCY_FMT;
  cell.alignment = { horizontal: isCurrency ? 'right' : 'center', vertical: 'middle' };
}

function dataStyle(cell: ExcelJS.Cell, isCurrency = false, rowIndex = 0) {
  cell.fill = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: rowIndex % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven },
  };
  cell.border = thinBorder();
  if (isCurrency) {
    cell.numFmt    = CURRENCY_FMT;
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  } else {
    cell.alignment = { horizontal: typeof cell.value === 'number' ? 'right' : 'left', vertical: 'middle' };
  }
}

/** Calcula a largura ideal de cada coluna com base no conteúdo inserido. */
function autoWidth(sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 60) {
  sheet.columns.forEach(col => {
    if (!col?.eachCell) return;
    let max = minWidth;
    col.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value != null ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 3, maxWidth);
  });
}

function fmtDate(s?: string) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
}

// ── Aba: Resumo ───────────────────────────────────────────────────────────
function buildResumoSheet(wb: ExcelJS.Workbook, summary: FinancialReportSummary) {
  const ws = wb.addWorksheet('Resumo');
  ws.properties.defaultRowHeight = 22;

  const filterStatusPt = (s?: string) => ({
    ALL: 'Todos', COMPLETED: 'Concluídos', PENDING: 'Pendentes', REFUNDED: 'Reembolsados/Cancelados',
  }[s ?? 'ALL'] ?? 'Todos');

  // Título
  ws.mergeCells('A1:D1');
  const titleCell = ws.getCell('A1');
  titleCell.value     = 'Relatório Financeiro — Feira das Ferramentas';
  titleCell.font      = { bold: true, size: 16, color: { argb: COLOR.titleFont } };
  titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.titleBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  // Info
  ws.mergeCells('A2:D2');
  const infoCell = ws.getCell('A2');
  infoCell.value = [
    `Período: ${fmtDate(summary.filters?.startDate)} a ${fmtDate(summary.filters?.endDate)}`,
    `Status: ${filterStatusPt(summary.filters?.status)}`,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
  ].join('   ·   ');
  infoCell.font      = { size: 10, color: { argb: 'FF374151' } };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.addRow([]);

  if (summary.totalRevenue !== null) {
    const conversion = summary.ordersCount && summary.ordersCount > 0
      ? ((summary.ordersCount - (summary.pendingCount ?? 0) - (summary.refundedCount ?? 0)) / summary.ordersCount * 100)
      : 0;

    const kpis = [
      { label: 'Receita Total',  value: summary.totalRevenue, currency: true },
      { label: 'Ticket Médio',   value: summary.avgTicket ?? 0, currency: true },
      { label: 'Qtd Pedidos',    value: summary.ordersCount ?? 0, currency: false },
      { label: 'Taxa Conversão', value: Number(conversion.toFixed(1)), currency: false },
    ];

    // Header KPIs
    const hRow = ws.addRow(kpis.map(k => k.label));
    hRow.height = 24;
    hRow.eachCell(c => headerStyle(c));

    // Valores KPIs
    const vRow = ws.addRow(kpis.map(k => k.value));
    vRow.height = 28;
    vRow.eachCell((c, col) => {
      dataStyle(c, kpis[col - 1].currency);
      c.font = { bold: true, size: 13 };
      if (col === 4) { c.numFmt = '0.0"%"'; c.alignment = { horizontal: 'right', vertical: 'middle' }; }
    });
  }

  ws.columns = [
    { key: 'a', width: 28 },
    { key: 'b', width: 22 },
    { key: 'c', width: 18 },
    { key: 'd', width: 18 },
  ];
}

// ── Aba de dados genérica ─────────────────────────────────────────────────
interface ColDef { header: string; key: string; currency?: boolean; pct?: boolean }

function buildDataSheet(
  wb: ExcelJS.Workbook,
  name: string,
  cols: ColDef[],
  rows: (string | number)[][],
  totals?: (number | string | null)[],   // null = célula vazia no totalizador
) {
  const ws = wb.addWorksheet(name);
  ws.properties.defaultRowHeight = 20;

  // Definir colunas (sem header automático — adicionamos manualmente)
  ws.columns = cols.map(c => ({ key: c.key, width: 16 }));

  // Linha 1: header congelado, fundo cinza, negrito
  const hRow = ws.addRow(cols.map(c => c.header));
  hRow.height = 24;
  hRow.eachCell(c => headerStyle(c));
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Linhas de dados com zebra
  rows.forEach((r, i) => {
    const dr = ws.addRow(r);
    dr.height = 19;
    dr.eachCell((cell, colNum) => {
      const def = cols[colNum - 1];
      dataStyle(cell, def?.currency, i);
      if (def?.pct) {
        cell.numFmt    = '0.0"%"';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  });

  // Linha totalizador
  if (totals && totals.length) {
    const totalLabel = ['TOTAL', ...totals.slice(1)];
    const tRow = ws.addRow(totalLabel);
    tRow.height = 22;
    tRow.eachCell((cell, colNum) => {
      const def = cols[colNum - 1];
      if (colNum === 1) {
        cell.value = 'TOTAL';
      } else if (totals[colNum - 1] !== null) {
        cell.value = totals[colNum - 1];
      }
      totalStyle(cell, def?.currency);
    });
  }

  // Auto-width após todos os dados estarem inseridos
  autoWidth(ws);
}

// ── Entry point público ───────────────────────────────────────────────────
export async function buildFinancialReportExcel(summary: FinancialReportSummary): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Feira das Ferramentas';
  wb.created  = new Date();
  wb.modified = new Date();

  // ── Aba 1: Resumo ─────────────────────────────────────────────────────
  buildResumoSheet(wb, summary);

  // ── Aba 2: Faturamento Mensal ─────────────────────────────────────────
  if (summary.monthlyRevenue.length > 0) {
    const monthRows = summary.monthlyRevenue.map(m => [m.month, m.orders, m.total]);
    const totalOrders  = summary.monthlyRevenue.reduce((s, m) => s + m.orders, 0);
    const totalRevenue = summary.monthlyRevenue.reduce((s, m) => s + m.total, 0);

    buildDataSheet(
      wb,
      'Faturamento Mensal',
      [
        { header: 'Mês',        key: 'mes' },
        { header: 'Pedidos',    key: 'pedidos' },
        { header: 'Faturamento (R$)', key: 'fat', currency: true },
      ],
      monthRows,
      [null, totalOrders, totalRevenue],
    );
  }

  // ── Aba 3: Top Produtos ───────────────────────────────────────────────
  if (summary.topProducts.length > 0) {
    const prodRows  = summary.topProducts.map(p => [p.name, p.qty, p.revenue]);
    const totalQty  = summary.topProducts.reduce((s, p) => s + p.qty, 0);
    const totalRev  = summary.topProducts.reduce((s, p) => s + p.revenue, 0);

    buildDataSheet(
      wb,
      'Top Produtos',
      [
        { header: 'Produto',          key: 'produto' },
        { header: 'Qtd Vendida',      key: 'qty' },
        { header: 'Receita (R$)',     key: 'receita', currency: true },
      ],
      prodRows,
      [null, totalQty, totalRev],
    );
  }

  // ── Aba 4: Status (opcional) ──────────────────────────────────────────
  if (summary.statusBreakdown && Object.keys(summary.statusBreakdown).length > 0) {
    const statusRows = Object.entries(summary.statusBreakdown).map(([s, v]) => [statusToPt(s), v]);
    const totalCount = statusRows.reduce((s, r) => s + (r[1] as number), 0);

    buildDataSheet(
      wb,
      'Status dos Pedidos',
      [
        { header: 'Status', key: 'status' },
        { header: 'Qtd',    key: 'qty' },
      ],
      statusRows,
      [null, totalCount],
    );
  }

  // ── Aba 5: Estoque (opcional) ─────────────────────────────────────────
  if (summary.stockSummary) {
    const ss = summary.stockSummary;
    buildDataSheet(
      wb,
      'Saúde do Estoque',
      [
        { header: 'Total Itens',         key: 'total' },
        { header: 'Baixo Estoque',       key: 'low' },
        { header: 'Zerados',             key: 'zero' },
        { header: 'Negativos',           key: 'neg' },
        { header: 'Valor Potencial (R$)', key: 'val', currency: true },
      ],
      [[ss.totalItems, ss.lowStockCount, ss.zeroStockCount, ss.negativeStockCount, ss.totalStockValue]],
    );

    if (summary.lowStockItems && summary.lowStockItems.length > 0) {
      buildDataSheet(
        wb,
        'Itens Críticos',
        [
          { header: 'Produto',   key: 'produto' },
          { header: 'SKU',       key: 'sku' },
          { header: 'Estoque',   key: 'stock' },
          { header: 'Mínimo',   key: 'min' },
        ],
        summary.lowStockItems.map(p => [p.name, p.sku ?? '—', p.stock, p.minStock]),
      );
    }
  }

  // Retorna Buffer (consumido pelo API route — nunca Blob, que é browser-only)
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
