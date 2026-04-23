import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Chamado pelo frontend sempre que o carrinho muda.
// Mantém o carrinho do DB sincronizado com localStorage para permitir
// detecção de abandono de carrinho.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false });

  const body = await req.json().catch(() => ({ items: [] }));
  const items: Array<{ id: string; quantity: number }> = body.items ?? [];

  // Resetar e-mail de abandono sempre que o usuário interage com o carrinho
  const cart = await prisma.cart.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      lastSeenAt: new Date(),
      abandonedEmailSentAt: null,
    },
    update: {
      lastSeenAt: new Date(),
      abandonedEmailSentAt: null,
      updatedAt: new Date(),
    },
  });

  if (items.length === 0) {
    // Carrinho vazio — remover itens do DB
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return NextResponse.json({ ok: true });
  }

  // Upsert itens válidos
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    ...items
      .filter(i => i.id && i.quantity > 0)
      .map(i =>
        prisma.cartItem.create({
          data: { cartId: cart.id, productId: i.id, quantity: i.quantity },
        }),
      ),
  ]);

  return NextResponse.json({ ok: true });
}
