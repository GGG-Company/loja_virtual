/**
 * ExcelReportService — Feira das Ferramentas
 * Recebe FinancialReportSummary e devolve um Buffer XLSX estilizado.
 *
 * Abas: Resumo | Faturamento Mensal | Top Produtos | Status dos Pedidos | Saúde do Estoque | Itens Críticos
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import type { FinancialReportSummary } from '@/types/financial-report';
import { statusToPt } from '@/lib/i18n';

// ── Paleta (espelha o PDF) ────────────────────────────────────────────────────
const C = {
  red:        'FFCC1020',
  redLight:   'FFFFF0F1',
  dark:       'FF1A1A1A',
  slate:      'FF334155',
  slateLight: 'FF64748B',
  white:      'FFFFFFFF',
  headerBg:   'FFCC1020', // vermelho — cabeçalho de coluna
  headerFont: 'FFFFFFFF', // branco
  sectionBg:  'FF1A1A1A', // dark — título de seção
  sectionFont:'FFFFFFFF',
  totalBg:    'FFECFDF5',
  totalFont:  'FF065F46',
  rowOdd:     'FFFFFFFF',
  rowEven:    'FFFFF8F8', // leve tom avermelhado
  border:     'FFE2E8F0',
  kpiBg:      'FFFFF0F1',
  kpiBorder:  'FFFFCDD0',
  infoBg:     'FFF1F5F9',
  muted:      'FF64748B',
  prevBg:     'FFFFFBEB',
  prevFont:   'FF92400E',
};

const CURRENCY_FMT = '"R$"#,##0.00';

// ── Logo ──────────────────────────────────────────────────────────────────────
function loadLogoBase64(): { base64: string; ext: 'jpeg' | 'png' } | null {
  const candidates = [
    { file: 'logo_shopping_das_ferramentas.jpg', ext: 'jpeg' as const },
    { file: 'logo_feira_ferramentas.ico',        ext: 'png'  as const },
  ];
  for (const { file, ext } of candidates) {
    try {
      const buf = fs.readFileSync(path.join(process.cwd(), 'public', file));
      return { base64: buf.toString('base64'), ext };
    } catch { /* try next */ }
  }
  return null;
}

// ── Helpers de borda ──────────────────────────────────────────────────────────
function thinBorder(color = C.border): ExcelJS.Borders {
  const s = { style: 'thin' as const, color: { argb: color } };
  return { top: s, left: s, bottom: s, right: s, diagonal: {} } as ExcelJS.Borders;
}

function bottomBorder(color: string): ExcelJS.Borders {
  return { bottom: { style: 'medium' as const, color: { argb: color } }, diagonal: {} } as ExcelJS.Borders;
}

// ── Estilos de célula ─────────────────────────────────────────────────────────
function applyHeader(cell: ExcelJS.Cell) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  cell.font      = { bold: true, color: { argb: C.headerFont }, size: 10 };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
  cell.border    = thinBorder('FFAA0010');
}

function applySection(cell: ExcelJS.Cell, text: string) {
  cell.value     = text;
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sectionBg } };
  cell.font      = { bold: true, color: { argb: C.sectionFont }, size: 10, name: 'Calibri' };
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  cell.border    = bottomBorder(C.red);
}

function applyData(cell: ExcelJS.Cell, opts: { currency?: boolean; pct?: boolean; bold?: boolean; rowIdx?: number }) {
  const isEven = (opts.rowIdx ?? 0) % 2 === 1;
  cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? C.rowEven : C.rowOdd } };
  cell.border = thinBorder();
  cell.font   = { size: 9, bold: opts.bold };
  if (opts.currency) {
    cell.numFmt    = CURRENCY_FMT;
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  } else if (opts.pct) {
    cell.numFmt    = '0.0"%"';
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  } else {
    cell.alignment = {
      horizontal: typeof cell.value === 'number' ? 'right' : 'left',
      vertical: 'middle',
    };
  }
}

function applyTotal(cell: ExcelJS.Cell, currency = false) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.totalBg } };
  cell.font      = { bold: true, color: { argb: C.totalFont }, size: 9 };
  cell.border    = thinBorder('FF6EE7B7');
  cell.alignment = { horizontal: currency ? 'right' : typeof cell.value === 'number' ? 'right' : 'center', vertical: 'middle' };
  if (currency) cell.numFmt = CURRENCY_FMT;
}

// ── Auto-width ────────────────────────────────────────────────────────────────
function autoWidth(ws: ExcelJS.Worksheet, min = 10, max = 55) {
  ws.columns.forEach(col => {
    if (!col?.eachCell) return;
    let w = min;
    col.eachCell({ includeEmpty: false }, c => {
      const len = c.value != null ? String(c.value).length : 0;
      if (len > w) w = len;
    });
    col.width = Math.min(w + 4, max);
  });
}

function fmtDate(s?: string) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
}

function fmtMonth(key: string) {
  const [year, month] = key.split('-');
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${MONTHS[(parseInt(month, 10) - 1)] ?? month}/${year.slice(2)}`;
}

const filterStatusPt = (s?: string) =>
  ({ ALL: 'Todos', COMPLETED: 'Concluídos', PENDING: 'Pendentes', REFUNDED: 'Reembolsados/Cancelados' }
    [s ?? 'ALL'] ?? 'Todos');

// ── Aba Resumo ────────────────────────────────────────────────────────────────
function buildResumoSheet(wb: ExcelJS.Workbook, summary: FinancialReportSummary) {
  const ws = wb.addWorksheet('Resumo');
  ws.properties.defaultRowHeight = 20;

  const COLS = 6;
  const mergeRange = (r1: number, c1: number, r2: number, c2: number) =>
    ws.mergeCells(r1, c1, r2, c2);

  // ── Cabeçalho ─────────────────────────────────────────────────────────
  // Linha 1: fundo escuro com logo + título (altura grande para a logo)
  // Linha 2: fundo cinza claro com info de período
  // Linha 3: barra vermelha fina

  ws.getRow(1).height = 72; // altura suficiente para logo de ~55px
  ws.getRow(2).height = 22;
  ws.getRow(3).height =  7;

  // Fundo escuro em toda a linha 1 (A até F)
  for (let c = 1; c <= COLS; c++) {
    ws.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dark } };
  }

  // Título (B1:F1) — ao lado da logo
  mergeRange(1, 2, 1, COLS);
  const titleCell = ws.getCell(1, 2);
  titleCell.value     = 'RELATÓRIO FINANCEIRO — FEIRA DAS FERRAMENTAS';
  titleCell.font      = { bold: true, size: 18, color: { argb: C.white }, name: 'Calibri' };
  titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dark } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Info (A2:F2)
  mergeRange(2, 1, 2, COLS);
  const subCell = ws.getCell(2, 1);
  subCell.value = [
    `Período: ${fmtDate(summary.filters?.startDate)} a ${fmtDate(summary.filters?.endDate)}`,
    `Filtro: ${filterStatusPt(summary.filters?.status)}`,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
  ].join('   |   ');
  subCell.font      = { size: 9, italic: true, color: { argb: C.muted } };
  subCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.infoBg } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Barra vermelha (linha 3)
  for (let c = 1; c <= COLS; c++) {
    ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.red } };
  }

  // Logo: posição fixa em pixels (col A, linha 1) — sobreposta ao fundo escuro
  const logo = loadLogoBase64();
  if (logo) {
    try {
      const imgId = wb.addImage({ base64: logo.base64, extension: logo.ext });
      // tl = canto superior esquerdo da célula A1 com pequeno padding
      ws.addImage(imgId, {
        tl: { col: 0.08, row: 0.12 } as any,
        ext: { width: 58, height: 58 },     // tamanho fixo em pixels
      });
    } catch { /* logo opcional */ }
  }

  ws.addRow([]); // espaço entre cabeçalho e conteúdo

  // ── KPIs ────────────────────────────────────────────────────────────────
  if (summary.totalRevenue !== null) {
    const confirmed = (summary.ordersCount ?? 0) - (summary.pendingCount ?? 0) - (summary.refundedCount ?? 0);
    const convRate  = summary.ordersCount && summary.ordersCount > 0
      ? (confirmed / summary.ordersCount) * 100 : 0;

    // Título da seção
    const secRow = ws.addRow([]);
    secRow.height = 22;
    mergeRange(secRow.number, 1, secRow.number, COLS);
    applySection(ws.getCell(secRow.number, 1), '  📊  KPIs DO PERÍODO');

    // KPI headers
    const kpiHeaders = ['Receita Total', 'Ticket Médio', 'Total Pedidos', 'Confirmados', 'Pendentes', 'Taxa de Conversão'];
    const hRow = ws.addRow(kpiHeaders);
    hRow.height = 22;
    hRow.eachCell(c => applyHeader(c));

    // KPI values
    const kpiVals = [
      summary.totalRevenue,
      summary.avgTicket ?? 0,
      summary.ordersCount ?? 0,
      confirmed,
      summary.pendingCount ?? 0,
      Number(convRate.toFixed(1)),
    ];
    const vRow = ws.addRow(kpiVals);
    vRow.height = 30;
    vRow.eachCell((c, col) => {
      c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.kpiBg } };
      c.border    = thinBorder(C.kpiBorder);
      c.font      = { bold: true, size: 14, color: { argb: C.dark } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      if (col <= 2) { c.numFmt = CURRENCY_FMT; c.alignment = { horizontal: 'center', vertical: 'middle' }; }
      if (col === 6) { c.numFmt = '0.0"%"'; }
    });

    // Comparativo período anterior
    if (summary.prevRevenue !== null) {
      ws.addRow([]);
      const prevSecRow = ws.addRow([]);
      prevSecRow.height = 22;
      mergeRange(prevSecRow.number, 1, prevSecRow.number, COLS);
      applySection(ws.getCell(prevSecRow.number, 1), '  📈  COMPARATIVO COM PERÍODO ANTERIOR');

      const prevHRow = ws.addRow(['', 'Receita', 'Pedidos', 'Ticket Médio', 'Pendentes', 'Variação Receita']);
      prevHRow.height = 22;
      prevHRow.eachCell(c => applyHeader(c));

      const revDiff = summary.prevRevenue && summary.prevRevenue > 0
        ? ((((summary.totalRevenue ?? 0) - summary.prevRevenue) / summary.prevRevenue) * 100).toFixed(1)
        : '—';

      const prevCurRow  = ws.addRow(['Período atual', summary.totalRevenue, summary.ordersCount ?? 0, summary.avgTicket ?? 0, summary.pendingCount ?? 0, Number(revDiff) || 0]);
      prevCurRow.height = 22;
      prevCurRow.eachCell((c, col) => {
        applyData(c, { currency: col === 2 || col === 4, pct: col === 6, rowIdx: 0 });
        c.font = { bold: true, size: 9 };
      });

      const prevOldRow = ws.addRow(['Período anterior', summary.prevRevenue, summary.prevOrdersCount ?? 0, summary.prevAvgTicket ?? 0, summary.prevPendingCount ?? 0, '']);
      prevOldRow.height = 22;
      prevOldRow.eachCell((c, col) => {
        applyData(c, { currency: col === 2 || col === 4, rowIdx: 1 });
        c.font = { italic: true, color: { argb: C.muted }, size: 9 };
      });
    }
  }

  // ── Faturamento Mensal embutido ───────────────────────────────────────────
  if (summary.monthlyRevenue.length > 0) {
    ws.addRow([]);
    const mSecRow = ws.addRow([]);
    mSecRow.height = 22;
    mergeRange(mSecRow.number, 1, mSecRow.number, COLS);
    applySection(ws.getCell(mSecRow.number, 1), '  📅  FATURAMENTO MENSAL');

    const mHRow = ws.addRow(['Mês', 'Pedidos', 'Faturamento (R$)', 'Ticket Médio (R$)', '', '']);
    mHRow.height = 22;
    mHRow.eachCell(c => applyHeader(c));

    summary.monthlyRevenue.forEach((m, i) => {
      const r = ws.addRow([fmtMonth(m.month), m.orders, m.total, m.avgTicket ?? 0, '', '']);
      r.height = 20;
      r.eachCell((c, col) => applyData(c, { currency: col === 3 || col === 4, rowIdx: i }));
    });

    // Totalizador
    const totalOrders  = summary.monthlyRevenue.reduce((s, m) => s + m.orders, 0);
    const totalRevenue = summary.monthlyRevenue.reduce((s, m) => s + m.total, 0);
    const tRow = ws.addRow(['TOTAL', totalOrders, totalRevenue, '', '', '']);
    tRow.height = 22;
    tRow.eachCell((c, col) => applyTotal(c, col === 3));
  }

  // ── Status dos Pedidos embutido ───────────────────────────────────────────
  if (summary.statusBreakdown && Object.keys(summary.statusBreakdown).length > 0) {
    ws.addRow([]);
    const sSecRow = ws.addRow([]);
    sSecRow.height = 22;
    mergeRange(sSecRow.number, 1, sSecRow.number, COLS);
    applySection(ws.getCell(sSecRow.number, 1), '  📋  STATUS DOS PEDIDOS');

    const sHRow = ws.addRow(['Status', 'Quantidade', '', '', '', '']);
    sHRow.height = 22;
    sHRow.eachCell(c => applyHeader(c));

    Object.entries(summary.statusBreakdown).forEach(([s, v], i) => {
      const r = ws.addRow([statusToPt(s), v, '', '', '', '']);
      r.height = 20;
      r.eachCell((c, col) => applyData(c, { rowIdx: i }));
    });

    const totalSt = Object.values(summary.statusBreakdown).reduce((a, b) => a + b, 0);
    const sTRow = ws.addRow(['TOTAL', totalSt, '', '', '', '']);
    sTRow.height = 22;
    sTRow.eachCell((c, col) => applyTotal(c, false));
  }

  // ── Estoque resumido ──────────────────────────────────────────────────────
  if (summary.stockSummary) {
    const ss = summary.stockSummary;
    ws.addRow([]);
    const eSecRow = ws.addRow([]);
    eSecRow.height = 22;
    mergeRange(eSecRow.number, 1, eSecRow.number, COLS);
    applySection(ws.getCell(eSecRow.number, 1), '  📦  SAÚDE DO ESTOQUE');

    const eHRow = ws.addRow(['Total Itens', 'Baixo Estoque', 'Zerados', 'Negativos', 'Valor Potencial (R$)', '']);
    eHRow.height = 22;
    eHRow.eachCell(c => applyHeader(c));

    const eVRow = ws.addRow([ss.totalItems, ss.lowStockCount, ss.zeroStockCount, ss.negativeStockCount, ss.totalStockValue, '']);
    eVRow.height = 24;
    eVRow.eachCell((c, col) => {
      applyData(c, { currency: col === 5, rowIdx: 0 });
      c.font = { bold: true, size: 10 };
    });
  }

  // Rodapé
  ws.addRow([]);
  const footRow = ws.addRow([]);
  footRow.height = 16;
  mergeRange(footRow.number, 1, footRow.number, COLS);
  const footCell = ws.getCell(footRow.number, 1);
  footCell.value = `Feira das Ferramentas — Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`;
  footCell.font      = { size: 8, italic: true, color: { argb: C.muted } };
  footCell.alignment = { horizontal: 'center', vertical: 'middle' };
  footCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.infoBg } };

  // Larguras: col A estreita (logo), B-F mais largas
  ws.columns = [
    { key: 'a', width: 10 },
    { key: 'b', width: 24 },
    { key: 'c', width: 20 },
    { key: 'd', width: 20 },
    { key: 'e', width: 20 },
    { key: 'f', width: 20 },
  ];
}

// ── Aba de dados ──────────────────────────────────────────────────────────────
interface ColDef { header: string; key: string; currency?: boolean; pct?: boolean }

function buildDataSheet(
  wb: ExcelJS.Workbook,
  name: string,
  cols: ColDef[],
  rows: (string | number)[][],
  totals?: (number | string | null)[],
) {
  const ws = wb.addWorksheet(name);
  ws.properties.defaultRowHeight = 20;
  ws.columns = cols.map(c => ({ key: c.key, width: 16 }));

  // Header vermelho
  const hRow = ws.addRow(cols.map(c => c.header));
  hRow.height = 24;
  hRow.eachCell(c => applyHeader(c));
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Dados com zebra
  rows.forEach((r, i) => {
    const dr = ws.addRow(r);
    dr.height = 19;
    dr.eachCell((cell, colNum) => {
      const def = cols[colNum - 1];
      applyData(cell, { currency: def?.currency, pct: def?.pct, rowIdx: i });
    });
  });

  // Totalizador
  if (totals?.length) {
    const tRow = ws.addRow(['TOTAL', ...totals.slice(1)]);
    tRow.height = 22;
    tRow.eachCell((cell, colNum) => {
      if (colNum > 1 && totals[colNum - 1] !== null) cell.value = totals[colNum - 1];
      else if (colNum === 1) cell.value = 'TOTAL';
      applyTotal(cell, cols[colNum - 1]?.currency);
    });
  }

  autoWidth(ws);
}

// ── Entry point público ───────────────────────────────────────────────────────
export async function buildFinancialReportExcel(summary: FinancialReportSummary): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Feira das Ferramentas';
  wb.created  = new Date();
  wb.modified = new Date();

  // ── Resumo (aba principal rica) ─────────────────────────────────────────
  buildResumoSheet(wb, summary);

  // ── Faturamento Mensal ──────────────────────────────────────────────────
  if (summary.monthlyRevenue.length > 0) {
    buildDataSheet(
      wb,
      'Faturamento Mensal',
      [
        { header: 'Mês',              key: 'mes' },
        { header: 'Pedidos',          key: 'pedidos' },
        { header: 'Faturamento (R$)', key: 'fat',    currency: true },
        { header: 'Ticket Médio (R$)',key: 'ticket', currency: true },
      ],
      summary.monthlyRevenue.map(m => [fmtMonth(m.month), m.orders, m.total, m.avgTicket ?? 0]),
      [null,
        summary.monthlyRevenue.reduce((s, m) => s + m.orders, 0),
        summary.monthlyRevenue.reduce((s, m) => s + m.total, 0),
        null,
      ],
    );
  }

  // ── Top Produtos ────────────────────────────────────────────────────────
  if (summary.topProducts.length > 0) {
    buildDataSheet(
      wb,
      'Top Produtos',
      [
        { header: 'Produto',       key: 'produto' },
        { header: 'Qtd Vendida',   key: 'qty' },
        { header: 'Receita (R$)',  key: 'receita', currency: true },
      ],
      summary.topProducts.map(p => [p.name, p.qty, p.revenue]),
      [null,
        summary.topProducts.reduce((s, p) => s + p.qty, 0),
        summary.topProducts.reduce((s, p) => s + p.revenue, 0),
      ],
    );
  }

  // ── Status dos Pedidos ──────────────────────────────────────────────────
  if (summary.statusBreakdown && Object.keys(summary.statusBreakdown).length > 0) {
    const statusRows = Object.entries(summary.statusBreakdown).map(([s, v]) => [statusToPt(s), v]);
    buildDataSheet(
      wb,
      'Status dos Pedidos',
      [
        { header: 'Status', key: 'status' },
        { header: 'Qtd',    key: 'qty' },
      ],
      statusRows,
      [null, statusRows.reduce((s, r) => s + (r[1] as number), 0)],
    );
  }

  // ── Saúde do Estoque ────────────────────────────────────────────────────
  if (summary.stockSummary) {
    const ss = summary.stockSummary;
    buildDataSheet(
      wb,
      'Saúde do Estoque',
      [
        { header: 'Total Itens',           key: 'total' },
        { header: 'Baixo Estoque',         key: 'low' },
        { header: 'Zerados',               key: 'zero' },
        { header: 'Negativos',             key: 'neg' },
        { header: 'Valor Potencial (R$)',  key: 'val', currency: true },
      ],
      [[ss.totalItems, ss.lowStockCount, ss.zeroStockCount, ss.negativeStockCount, ss.totalStockValue]],
    );
  }

  // ── Itens Críticos (estoque baixo) ──────────────────────────────────────
  if (summary.lowStockItems && summary.lowStockItems.length > 0) {
    buildDataSheet(
      wb,
      'Itens Críticos',
      [
        { header: 'Produto', key: 'produto' },
        { header: 'SKU',     key: 'sku' },
        { header: 'Estoque', key: 'stock' },
        { header: 'Mínimo',  key: 'min' },
      ],
      summary.lowStockItems.map(p => [p.name, p.sku ?? '—', p.stock, p.minStock]),
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
