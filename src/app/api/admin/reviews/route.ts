import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Listar avaliações (admin)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10));
    const status = searchParams.get('status');
    const rating = searchParams.get('rating');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'pending') {
      where.isApproved = false;
    }

    if (rating) {
      where.rating = parseInt(rating);
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
        { title: { contains: search, mode: 'insensitive' as const } },
        { comment: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(error, '[ADMIN_REVIEWS_GET]');
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar avaliações' },
      { status: 500 }
    );
  }
}
