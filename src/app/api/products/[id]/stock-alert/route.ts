import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.string().email() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, stock: true },
  });
  if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  if (product.stock > 0) return NextResponse.json({ error: 'Produto em estoque' }, { status: 400 });

  await prisma.stockAlert.upsert({
    where: { productId_email: { productId: id, email: parsed.data.email } },
    create: {
      productId: id,
      email: parsed.data.email,
      userId: session?.user?.id ?? null,
    },
    update: { notifiedAt: null },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });

  const { id } = await params;
  await prisma.stockAlert.deleteMany({
    where: { productId: id, email: parsed.data.email },
  });

  return NextResponse.json({ ok: true });
}
