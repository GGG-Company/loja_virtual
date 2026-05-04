import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Fire-and-forget — incrementa viewCount. Sem auth, sem rate limit pesado.
// O frontend chama isso uma vez por visita de página.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Produto não encontrado ou qualquer erro — ignora silenciosamente
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
