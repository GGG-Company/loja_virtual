import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().max(1000).optional(),
  orderId: z.string().optional(),
});

/**
 * GET /api/products/[id]/reviews
 * Listar avaliações de um produto com paginação
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const sortBy = searchParams.get('sortBy') || 'recent'; // recent, helpful, rating_high, rating_low
    const filterRating = searchParams.get('rating'); // 1, 2, 3, 4, 5

    const offset = (page - 1) * limit;

    // Construir ordenação
    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'helpful':
        orderBy = { isHelpful: 'desc' };
        break;
      case 'rating_high':
        orderBy = { rating: 'desc' };
        break;
      case 'rating_low':
        orderBy = { rating: 'asc' };
        break;
    }

    // Filtro por rating
    const where: any = {
      productId: id,
      isApproved: true,
    };
    
    if (filterRating) {
      where.rating = parseInt(filterRating, 10);
    }

    // Buscar reviews e estatísticas
    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        where: { productId: id, isApproved: true },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    // Distribuição de ratings
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId: id, isApproved: true },
      _count: { rating: true },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    // Define explicitamente o tipo para evitar erro de inferência caso o cliente não esteja gerado
    ratingDistribution.forEach((r: { rating: number; _count: { rating: number } }) => {
      distribution[r.rating] = r._count.rating;
    });

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating,
        distribution,
      },
    });
  } catch (error) {
    logger.error(error as Error, '[REVIEWS_LIST]');
    return NextResponse.json(
      { error: 'Erro ao buscar avaliações' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[id]/reviews
 * Criar uma avaliação
 */
export async function POST(
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

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Verificar se já avaliou
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId: id,
          userId: user.id,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'Você já avaliou este produto' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = createReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { rating, title, comment, orderId } = parsed.data;

    // Verificar se é compra verificada
    let isVerifiedPurchase = false;
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId: user.id,
          status: { in: ['DELIVERED', 'SHIPPED'] },
          items: { some: { productId: id } },
        },
      });
      isVerifiedPurchase = !!order;
    } else {
      // Verificar se comprou o produto em qualquer pedido
      const hasOrder = await prisma.order.findFirst({
        where: {
          userId: user.id,
          status: { in: ['DELIVERED', 'SHIPPED'] },
          items: { some: { productId: id } },
        },
      });
      isVerifiedPurchase = !!hasOrder;
    }

    const review = await prisma.review.create({
      data: {
        productId: id,
        userId: user.id,
        orderId: isVerifiedPurchase ? orderId : null,
        rating,
        title,
        comment,
        isVerifiedPurchase,
      },
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
      message: 'Avaliação criada com sucesso',
      review,
    }, { status: 201 });
  } catch (error) {
    logger.error(error as Error, '[REVIEW_CREATE]');
    return NextResponse.json(
      { error: 'Erro ao criar avaliação' },
      { status: 500 }
    );
  }
}
