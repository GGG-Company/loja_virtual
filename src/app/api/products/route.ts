import { NextRequest, NextResponse } from 'next/server';
import { listProducts, listProductsPaginated, isExternalEnabled } from '@/lib/products-repository';
import { toNum } from '@/lib/parse-decimal';
import logger from '@/lib/logger';
import { apiLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

function serializeProduct(p: any) {
  if (!p) return p;
  return {
    ...p,
    price:            toNum(p.price),
    promotionalPrice: p.promotionalPrice != null ? toNum(p.promotionalPrice) : null,
    compareAtPrice:   p.compareAtPrice   != null ? toNum(p.compareAtPrice)   : null,
  };
}

export async function GET(request: NextRequest) {
  const limited = await apiLimiter.check(request);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const featured  = searchParams.get('featured');
    const promo     = searchParams.get('promo');
    const category  = searchParams.get('categoria');
    const grupo     = searchParams.get('grupo');
    const search    = searchParams.get('search');
    const limit     = searchParams.get('limit');

    // Rotas especiais (featured/promo/limit) usam o listProducts legado
    if (featured || promo || limit) {
      const products = await listProducts({
        featured: featured === 'true',
        promo: promo === 'true',
        categorySlug: category,
        grupoSlug: grupo,
        limit: limit ? parseInt(limit) : null,
        search: search || null,
      });
      return NextResponse.json(
        { success: true, source: isExternalEnabled() ? 'external' : 'local', products: (products as any[]).map(serializeProduct) },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
      );
    }

    // Listagem principal paginada com filtros server-side
    const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1);
    const pageSize  = Math.min(48, Math.max(1, parseInt(searchParams.get('pageSize') ?? String(PAGE_SIZE)) || PAGE_SIZE));
    const brands         = (searchParams.get('brands')     ?? '').split(',').filter(Boolean);
    const categorySlugs  = (searchParams.get('categories') ?? '').split(',').filter(Boolean);
    const minPrice  = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
    const maxPrice  = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
    const sortBy    = searchParams.get('sort') ?? null;
    const onSale    = searchParams.get('onSale') === 'true' ? true : null;
    const inStock   = searchParams.get('inStock') === 'true' ? true : null;

    const result = await listProductsPaginated({
      categorySlug: category,
      categorySlugs,
      grupoSlug: grupo,
      search: search || null,
      page, pageSize, brands, minPrice, maxPrice, sortBy, onSale, inStock,
    });

    return NextResponse.json(
      {
        success: true,
        products: result.products.map(serializeProduct),
        pagination: { page: result.page, pageSize: result.pageSize, total: result.total, pages: result.pages },
      },
      { headers: { 'Cache-Control': search ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=30' } },
    );
  } catch (error) {
    logger.error(error as Error, '[PRODUCTS_GET]');
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}
