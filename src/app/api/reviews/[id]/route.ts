import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(100).optional(),
  comment: z.string().max(1000).optional(),
});

/**
 * GET /api/reviews/[id]
 * Obter uma avaliação específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    logger.error(error as Error, '[REVIEW_GET]');
    return NextResponse.json(
      { error: 'Erro ao buscar avaliação' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reviews/[id]
 * Atualizar uma avaliação (apenas o autor)
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
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
    }

    // Apenas o autor ou admin pode editar
    if (review.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.review.update({
      where: { id },
      data: parsed.data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Avaliação atualizada',
      review: updated,
    });
  } catch (error) {
    logger.error(error as Error, '[REVIEW_UPDATE]');
    return NextResponse.json(
      { error: 'Erro ao atualizar avaliação' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]
 * Deletar uma avaliação (apenas o autor ou admin)
 */
export async function DELETE(
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

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
    }

    // Apenas o autor ou admin pode deletar
    if (review.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    await prisma.review.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Avaliação removida',
    });
  } catch (error) {
    logger.error(error as Error, '[REVIEW_DELETE]');
    return NextResponse.json(
      { error: 'Erro ao deletar avaliação' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reviews/[id]
 * Marcar como útil ou resposta do vendedor
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const body = await request.json();
    const { action, sellerResponse } = body;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
    }

    // Ação: marcar como útil (não precisa estar logado)
    if (action === 'helpful' || action === 'unhelpful') {
      const delta = action === 'helpful' ? 1 : -1;
      const updated = await prisma.review.update({
        where: { id },
        data: { isHelpful: Math.max(0, review.isHelpful + delta) },
      });

      return NextResponse.json({
        success: true,
        message: action === 'helpful' ? 'Marcado como útil' : 'Voto removido',
        isHelpful: updated.isHelpful,
      });
    }

    // Ação: resposta do vendedor (apenas admin)
    if (action === 'seller_response') {
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { role: true },
      });

      if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }

      const updated = await prisma.review.update({
        where: { id },
        data: {
          sellerResponse,
          sellerResponseAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Resposta adicionada',
        review: updated,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    logger.error(error as Error, '[REVIEW_PATCH]');
    return NextResponse.json(
      { error: 'Erro ao processar ação' },
      { status: 500 }
    );
  }
}
