import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/returns
 * Listar todas as devoluções (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' as const } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' as const } } },
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              total: true,
              shippingAddress: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.return.count({ where }),
    ]);

    // Estatísticas
    const stats = await prisma.return.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusCounts = stats.reduce((acc: Record<string, number>, item: { status: string; _count: { status: number } }) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      returns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: statusCounts,
    });
  } catch (error) {
    logger.error(error, '[ADMIN_RETURNS_LIST]');
    return NextResponse.json({ error: 'Erro ao listar devoluções' }, { status: 500 });
  }
}
