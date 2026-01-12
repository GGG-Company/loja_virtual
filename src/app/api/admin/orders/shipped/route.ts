import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    if (role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Garantir que pendentes expirados sejam cancelados antes de listar enviados/afins
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    await prisma.order.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: thirtySecondsAgo },
      },
      data: { status: 'CANCELLED' },
    });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const search = (searchParams.get('search') || '').trim();

    const where: any = {
      status: {
        in: ['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
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
                  name: true,
                  sku: true,
                  specs: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
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
    });
  } catch (error) {
    console.error('[ADMIN_SHIPPED_ORDERS_GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar pedidos enviados' }, { status: 500 });
  }
}
