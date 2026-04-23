import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAbandonedCartEmail } from '@/lib/mailer';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ABANDON_HOURS = 2; // horas de inatividade antes de enviar o e-mail
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://feiradeferramentas.com.br';

// Protegido por CRON_SECRET
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const threshold = new Date(Date.now() - ABANDON_HOURS * 60 * 60 * 1000);

  // Carrinhos com itens, de usuários autenticados, sem e-mail enviado,
  // com última atividade há mais de ABANDON_HOURS horas
  const carts = await prisma.cart.findMany({
    where: {
      userId: { not: null },
      abandonedEmailSentAt: null,
      updatedAt: { lte: threshold },
      items: { some: {} },
    },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, price: true, promotionalPrice: true, imageUrl: true, stock: true } },
        },
      },
    },
    take: 100,
  });

  let sent = 0;
  let skipped = 0;

  for (const cart of carts) {
    const email = cart.user?.email;
    const name = cart.user?.name ?? 'Cliente';
    if (!email) { skipped++; continue; }

    // Só enviar se algum item ainda tem estoque
    const activeItems = cart.items.filter(i => i.product.stock > 0);
    if (activeItems.length === 0) { skipped++; continue; }

    // Verificar se o usuário fez um pedido depois de abandonar o carrinho
    const recentOrder = await prisma.order.findFirst({
      where: { userId: cart.userId!, createdAt: { gte: threshold } },
      select: { id: true },
    });
    if (recentOrder) { skipped++; continue; }

    const total = activeItems.reduce((sum, i) => {
      return sum + Number(i.product.promotionalPrice ?? i.product.price) * i.quantity;
    }, 0);

    try {
      await sendAbandonedCartEmail(email, {
        userName: name,
        cartUrl: `${BASE_URL}/carrinho`,
        total,
        items: activeItems.map(i => ({
          name: i.product.name,
          quantity: i.quantity,
          price: Number(i.product.promotionalPrice ?? i.product.price),
          imageUrl: i.product.imageUrl ?? undefined,
        })),
      });

      await prisma.cart.update({
        where: { id: cart.id },
        data: { abandonedEmailSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      logger.error(err as Error, '[ABANDONED_CART] Erro ao enviar para %s', email);
    }
  }

  logger.info('[ABANDONED_CART] Concluído — enviados:%d ignorados:%d', sent, skipped);
  return NextResponse.json({ sent, skipped });
}
