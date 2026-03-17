import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";

// GET - Buscar cupom por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 });
    }

    return NextResponse.json(coupon);
  } catch (error) {
    logger.error(error as Error, '[ADMIN_COUPON_GET]');
    return NextResponse.json({ error: 'Erro ao buscar cupom' }, { status: 500 });
  }
}

// DELETE - Excluir cupom
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await prisma.coupon.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(error as Error, '[ADMIN_COUPON_DELETE]');
    return NextResponse.json({ error: 'Erro ao excluir cupom' }, { status: 500 });
  }
}

// PUT - Atualizar cupom
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        description: body.description,
        discountType: body.discountType,
        value: parseFloat(body.value),
        scope: body.scope,
        scopeValues: body.scopeValues ? body.scopeValues : null,
        minPurchase: body.minPurchase ? parseFloat(body.minPurchase) : null,
        maxDiscount: body.maxDiscount ? parseFloat(body.maxDiscount) : null,
        usageLimit: body.usageLimit ? parseInt(body.usageLimit) : null,
        usagePerUser: body.usagePerUser ? parseInt(body.usagePerUser) : null,
        isActive: body.isActive,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    logger.error(error as Error, '[ADMIN_COUPON_PUT]');
    return NextResponse.json({ error: 'Erro ao atualizar cupom' }, { status: 500 });
  }
}
