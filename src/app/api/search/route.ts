import { NextRequest, NextResponse } from 'next/server';
import { listProducts } from '@/lib/products-repository';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [] });
  }

  try {
    const raw = await listProducts({ search: q, limit: 8 });

    const products = raw.slice(0, 6).map((p: any) => ({
      id: String(p.id),
      name: String(p.name),
      slug: String(p.slug || p.id),
      price: Number(p.price),
      promotionalPrice: p.promotionalPrice ? Number(p.promotionalPrice) : null,
      imageUrl: p.imageUrl || (Array.isArray(p.images) && p.images[0]?.url) || null,
      category: p.category
        ? {
            id: String(p.category.id),
            name: String(p.category.name),
            slug: String(p.category.slug),
          }
        : null,
    }));

    const catMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
    for (const p of raw as any[]) {
      if (p.category?.id) {
        const key = String(p.category.id);
        const existing = catMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          catMap.set(key, {
            id: key,
            name: String(p.category.name),
            slug: String(p.category.slug),
            count: 1,
          });
        }
      }
    }

    const categories = [...catMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return NextResponse.json(
      { products, categories },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    logger.error(err as Error, '[SMART_SEARCH]');
    return NextResponse.json({ error: 'Erro na busca' }, { status: 500 });
  }
}
