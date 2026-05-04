import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = (searchParams.get('search') || '').trim();
    const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';

    const where: any = {
      status: {
        in: ['CONFIRMED', 'PROCESSING'],
      },
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' as const } },
              { user: { name: { contains: search, mode: 'insensitive' as const } } },
              { user: { email: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  stockLocation: true,
                  imageUrl: true,
                  sku: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: sort,
        },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=15' },
    });
  } catch (error) {
    logger.error(error, '[ADMIN_PICKING_GET]');
    return NextResponse.json({ error: 'Erro ao buscar picking' }, { status: 500 });
  }
}
