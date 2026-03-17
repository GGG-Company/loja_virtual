import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/returns/[id]
 * Obter detalhes de uma devolução
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const returnRequest = await prisma.return.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            shippingAddress: true,
            createdAt: true,
            deliveredAt: true,
            melhorEnvioOrderId: true,
          },
        },
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json({ error: 'Devolução não encontrada' }, { status: 404 });
    }

    // Verificar se o usuário tem permissão (dono da devolução ou admin)
    const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER';
    if (!isAdmin && returnRequest.userId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json({ success: true, return: returnRequest });
  } catch (error) {
    logger.error(error as Error, '[RETURN_GET]');
    return NextResponse.json({ error: 'Erro ao buscar devolução' }, { status: 500 });
  }
}

/**
 * PUT /api/returns/[id]
 * Cancelar devolução (cliente) - apenas se status for REQUESTED
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    const returnRequest = await prisma.return.findUnique({
      where: { id },
    });

    if (!returnRequest) {
      return NextResponse.json({ error: 'Devolução não encontrada' }, { status: 404 });
    }

    // Verificar se é o dono da devolução
    if (returnRequest.userId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (action === 'cancel') {
      // Só pode cancelar se estiver em REQUESTED ou PENDING_REVIEW
      if (!['REQUESTED', 'PENDING_REVIEW'].includes(returnRequest.status)) {
        return NextResponse.json({ 
          error: 'Esta devolução não pode mais ser cancelada' 
        }, { status: 400 });
      }

      const updated = await prisma.return.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Devolução cancelada',
        return: updated,
      });
    }

    if (action === 'mark_shipped') {
      // Cliente marca que enviou o produto
      if (returnRequest.status !== 'LABEL_GENERATED') {
        return NextResponse.json({ 
          error: 'Aguarde a geração da etiqueta de devolução' 
        }, { status: 400 });
      }

      const updated = await prisma.return.update({
        where: { id },
        data: { 
          status: 'IN_TRANSIT',
          shippedAt: new Date(),
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Devolução marcada como enviada',
        return: updated,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    logger.error(error as Error, '[RETURN_UPDATE]');
    return NextResponse.json({ error: 'Erro ao atualizar devolução' }, { status: 500 });
  }
}
