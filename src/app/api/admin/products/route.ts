import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

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
    logger.error(error, '[ADMIN PRODUCTS ERROR]');
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
  try {
    const session = await auth();

    if (!session?.user || session.user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      price, 
      promotionalPrice,
      stock, 
      categoryId, 
      imageUrl,
      isFeatured,
      isPromo,
      stockLocation
    } = body;

    if (!name || !price || !categoryId) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const slug = generateSlug(name) + '-' + Math.random().toString(36).substring(2, 7);
    const sku = 'SKU-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        description,
        price,
        promotionalPrice: promotionalPrice ? parseFloat(promotionalPrice) : null,
        stock: parseInt(stock) || 0,
        categoryId,
        imageUrl: imageUrl || null,
        isFeatured: isFeatured ?? false,
        isPromo: isPromo ?? false,
        stockLocation: stockLocation || null,
        isActive: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    logger.error(error, '[ADMIN_PRODUCT_POST]');
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
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
