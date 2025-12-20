import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { listProducts, isExternalEnabled } from '@/lib/products-repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const category = searchParams.get('categoria');
    const limit = searchParams.get('limit');

    const products = await listProducts({
      featured: featured === 'true',
      categorySlug: category,
      limit: limit ? parseInt(limit) : null,
    });

    return NextResponse.json({
      success: true,
      source: isExternalEnabled() ? 'external' : 'local',
      message: isExternalEnabled() ? undefined : 'Fonte externa não configurada; usando base local.',
      products,
    });
  } catch (error) {
    console.error('[PRODUCTS_GET]', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produtos' },
      { status: 500 }
    );
  }
}
