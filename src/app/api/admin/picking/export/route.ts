import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import logger from '@/lib/logger';
import { generatePickingReportPdf, type PickingPdfItem } from '@/lib/export/pdf';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const items: PickingPdfItem[] = Array.isArray(body?.items) ? body.items : [];

    const buffer = await generatePickingReportPdf(items);

    const now  = new Date();
    const mes  = now.toLocaleDateString('pt-BR', { month: 'long' });
    const ano  = now.getFullYear();
    const filename = `picking-${mes}-${ano}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(buffer.byteLength),
        'Cache-Control':       'no-store',
      },
    });
  } catch (error) {
    logger.error(error as Error, '[PICKING_EXPORT]');
    return NextResponse.json({ error: 'Erro ao gerar relatório de picking' }, { status: 500 });
  }
}
