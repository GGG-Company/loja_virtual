import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendStockAlertEmail } from '@/lib/mailer';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Protegido por CRON_SECRET — chamar com Authorization: Bearer <secret>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://feiradeferramentas.com.br';

  // Alertas pendentes para produtos que voltaram ao estoque
  const alerts = await prisma.stockAlert.findMany({
    where: { notifiedAt: null },
    include: {
      product: {
        select: { id: true, name: true, slug: true, imageUrl: true, price: true, promotionalPrice: true, stock: true, isActive: true },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const alert of alerts) {
    const p = alert.product;
    // Só notifica se o produto realmente tem estoque agora
    if (!p.isActive || p.stock <= 0) { skipped++; continue; }

    const price = Number(p.promotionalPrice ?? p.price);
    try {
      await sendStockAlertEmail(alert.email, {
        productName: p.name,
        productUrl: `${BASE_URL}/produtos/${p.slug ?? p.id}`,
        productImageUrl: p.imageUrl ?? undefined,
        productPrice: `R$ ${price.toFixed(2).replace('.', ',')}`,
      });

      await prisma.stockAlert.update({
        where: { id: alert.id },
        data: { notifiedAt: new Date() },
      });
      sent++;
    } catch (err) {
      logger.error(err as Error, '[STOCK_ALERT] Erro ao enviar para %s', alert.email);
    }
  }

  logger.info('[STOCK_ALERT] Concluído — enviados:%d ignorados:%d', sent, skipped);
  return NextResponse.json({ sent, skipped });
}
