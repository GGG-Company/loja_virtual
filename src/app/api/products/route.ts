import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { listProducts, isExternalEnabled } from '@/lib/products-repository';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const promo = searchParams.get('promo');
    const category = searchParams.get('categoria');
    const limit = searchParams.get('limit');
    const search = searchParams.get('search');

    const products = await listProducts({
      featured: featured === 'true',
      promo: promo === 'true',
      categorySlug: category,
      limit: limit ? parseInt(limit) : null,
      search: search || null,
    });

    return NextResponse.json({
      success: true,
      source: isExternalEnabled() ? 'external' : 'local',
      message: isExternalEnabled() ? undefined : 'Fonte externa não configurada; usando base local.',
      products,
    });
  } catch (error) {
    logger.error(error as Error, '[PRODUCTS_GET]');
    return NextResponse.json(
      { error: 'Erro ao buscar produtos' },
      { status: 500 }
    );
  }
}
