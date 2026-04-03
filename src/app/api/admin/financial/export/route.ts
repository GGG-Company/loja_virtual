/**
 * GET /api/admin/financial/export
 *
 * Gera e retorna relatório financeiro em Excel ou PDF via streaming server-side.
 * Nunca transfere lógica de geração para o browser — o arquivo nasce no servidor.
 *
 * Query params:
 *   format        = "xlsx" | "pdf"   (obrigatório)
 *   startDate     = ISO string
 *   endDate       = ISO string
 *   status        = ALL | COMPLETED | PENDING | REFUNDED
 *   minTotal      = number
 *   maxTotal      = number
 *   productQuery  = string
 *   criticalOnly  = "true"
 *   includeOrders = "false"  (default: true)
 *   includeStock  = "true"
 *   includeStatusBreakdown = "true"
 *
 * Response:
 *   Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 *              ou application/pdf
 *   Content-Disposition: attachment; filename="relatorio-financeiro-maio-2025.xlsx"
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import logger from '@/lib/logger';
import { fetchFinancialReport } from '@/lib/services/financial-report.service';
import { buildFinancialReportExcel } from '@/lib/export/excel';
import { generateFinancialReportPdf } from '@/lib/export/pdf';

export const dynamic = 'force-dynamic';

// ── Nome dinâmico do arquivo (ex: "relatorio-financeiro-maio-2025") ───────
function buildFilename(format: string): string {
  const now  = new Date();
  const mes  = now.toLocaleDateString('pt-BR', { month: 'long' }); // "maio"
  const ano  = now.getFullYear();
  return `relatorio-financeiro-${mes}-${ano}.${format}`;
}

export async function GET(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // ── Query params ────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') ?? 'xlsx').toLowerCase();

    if (format !== 'xlsx' && format !== 'pdf') {
      return NextResponse.json({ error: 'format deve ser "xlsx" ou "pdf"' }, { status: 400 });
    }

    // ── Busca dados (separado da geração do arquivo) ─────────────────────
    const summary = await fetchFinancialReport({
      startDate:             searchParams.get('startDate')              ?? undefined,
      endDate:               searchParams.get('endDate')                ?? undefined,
      status:                searchParams.get('status')                 ?? undefined,
      minTotal:              searchParams.get('minTotal')               ?? undefined,
      maxTotal:              searchParams.get('maxTotal')               ?? undefined,
      productQuery:          searchParams.get('productQuery')           ?? undefined,
      criticalOnly:          searchParams.get('criticalOnly')  === 'true',
      includeOrders:         searchParams.get('includeOrders') !== 'false',
      includeStock:          searchParams.get('includeStock')  === 'true',
      includeStatusBreakdown: searchParams.get('includeStatusBreakdown') === 'true',
    });

    const filename = buildFilename(format);

    // ── Excel ────────────────────────────────────────────────────────────
    if (format === 'xlsx') {
      const buffer = await buildFinancialReportExcel(summary);

      return new Response(buffer, {
        headers: {
          'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length':      String(buffer.byteLength),
          'Cache-Control':       'no-store',
        },
      });
    }

    // ── PDF ──────────────────────────────────────────────────────────────
    const buffer = await generateFinancialReportPdf(summary);

    return new Response(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(buffer.byteLength),
        'Cache-Control':       'no-store',
      },
    });

  } catch (error) {
    logger.error(error as Error, '[FINANCIAL_EXPORT]');
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 });
  }
}
