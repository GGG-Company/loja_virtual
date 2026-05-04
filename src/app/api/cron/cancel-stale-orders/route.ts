import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/cron/cancel-stale-orders
 *
 * Cancela pedidos PENDING sem pagamento iniciado após 30 minutos.
 * Deve ser invocado por um scheduler externo (Vercel Cron, n8n, etc.)
 * com o header Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error('[CRON] CRON_SECRET não configurado — rejeitando chamada');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutos

    const result = await prisma.order.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: threshold },
      },
      data: { status: 'CANCELLED' },
    });

    logger.info({ count: result.count }, '[CRON] Pedidos pendentes cancelados');
    return NextResponse.json({ cancelled: result.count });
  } catch (error) {
    logger.error(error as Error, '[CRON] cancel-stale-orders failed');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
