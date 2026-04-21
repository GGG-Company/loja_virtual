import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH — vincula ou desvincula um produto local a um produto do Hiper
// Body: { hiperProductId: string | null }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN' && role !== 'OWNER') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const { productId } = await params;
  const body = await req.json().catch(() => ({}));
  const hiperProductId: string | null = body.hiperProductId ?? null;

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { externalIdHiper: hiperProductId },
    select: { id: true, name: true, externalIdHiper: true },
  });

  return NextResponse.json(updated);
}
