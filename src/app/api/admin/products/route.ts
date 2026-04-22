import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";
import { toNum } from '@/lib/decimal-helpers';

const CreateProductSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  price: z.number().positive('Preço deve ser positivo'),
  promotionalPrice: z.number().positive('Preço promocional deve ser positivo').optional().nullable(),
  stock: z.number().int().min(0, 'Estoque não pode ser negativo').optional(),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  brandId: z.string().optional().nullable(),
  ean: z.string().optional().nullable(),
  imageUrl: z.string().url('URL de imagem inválida').optional().nullable(),
  isFeatured: z.boolean().optional(),
  isPromo: z.boolean().optional(),
  stockLocation: z.string().optional().nullable(),
});

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

    if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role)) {
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
          brand: { select: { id: true, name: true } },
          images: { take: 1, orderBy: { order: 'asc' } },
          _count: { select: { variants: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    const normalized = products.map((p) => ({
      ...p,
      price: toNum(p.price),
      promotionalPrice: p.promotionalPrice != null ? toNum(p.promotionalPrice) : null,
      compareAtPrice: 'compareAtPrice' in p && p.compareAtPrice != null ? toNum((p as any).compareAtPrice) : null,
    }));

    return NextResponse.json({
      products: normalized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(error as Error, '[ADMIN PRODUCTS ERROR]');
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

    if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = CreateProductSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      price,
      promotionalPrice,
      stock,
      categoryId,
      brandId,
      ean,
      imageUrl,
      isFeatured,
      isPromo,
      stockLocation
    } = parsed.data;

    const slugBase = generateSlug(name);

    // SKU determinístico: slug truncado + timestamp hex para evitar colisão
    const tsPart = Date.now().toString(16).slice(-6).toUpperCase();
    const slugPart = slugBase.replace(/-/g, '').slice(0, 6).toUpperCase();
    const sku = `${slugPart}-${tsPart}`;

    // Sufixo numérico incremental para garantir slug único
    const existing = await prisma.product.count({ where: { slug: { startsWith: slugBase } } });
    const slug = existing > 0 ? `${slugBase}-${existing + 1}` : slugBase;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        ean: ean || null,
        description,
        price,
        promotionalPrice: promotionalPrice ?? null,
        stock: stock ?? 0,
        categoryId,
        brandId: brandId || null,
        imageUrl: imageUrl || null,
        isFeatured: isFeatured ?? false,
        isPromo: isPromo ?? false,
        stockLocation: stockLocation || null,
        isActive: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    logger.error(error as Error, '[ADMIN_PRODUCT_POST]');
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
