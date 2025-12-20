import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/products
 * 
 * Lista produtos com paginação e filtros.
 * Requer role: ADMIN ou OWNER
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { take: 1, orderBy: { order: 'asc' } },
          _count: { select: { variants: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[ADMIN PRODUCTS ERROR]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products
 * 
 * Criar novo produto.
 * Requer role: ADMIN ou OWNER
 */
export async function POST(request: Request) {
  // Criação de produtos foi desabilitada: catálogo vem do banco externo.
  // Admin pode apenas editar campos locais (overlay) via PUT em /api/admin/products/[id].
  return NextResponse.json(
    { error: 'Product creation disabled. Use PUT /api/admin/products/[id] to edit local fields.' },
    { status: 405 }
  );
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
