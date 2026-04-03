import { NextRequest, NextResponse } from 'next/server';
import { listProducts, isExternalEnabled } from '@/lib/products-repository';
import logger from '@/lib/logger';

// Buscas com query param `search` são dinâmicas; listagens simples usam ISR via
// Cache-Control no response. `force-dynamic` é removido para permitir caching.
export const dynamic = 'auto';

export async function GET(request: NextRequest) {
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

    const response = NextResponse.json({
      success: true,
      source: isExternalEnabled() ? 'external' : 'local',
      products,
    });

    // Buscas não são cacheáveis (resultado depende do termo)
    // Listagens estáticas (featured, promo, categ) podem ser cacheadas pelo CDN
    if (!search) {
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=60'
      );
    } else {
      response.headers.set('Cache-Control', 'no-store');
    }

    return response;
  } catch (error) {
    logger.error(error as Error, '[PRODUCTS_GET]');
    return NextResponse.json(
      { error: 'Erro ao buscar produtos' },
      { status: 500 }
    );
  }
}
