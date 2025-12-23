import { prisma } from '@/lib/prisma';

export type ListProductsParams = {
  featured?: boolean;
  categorySlug?: string | null;
  limit?: number | null;
};

function externalBase() {
  const base = process.env.EXTERNAL_PRODUCTS_API_BASE;
  return base?.replace(/\/$/, '') || '';
}

export function isExternalEnabled() {
  return !!externalBase();
}

function mapExternalProduct(p: any) {
  if (!p) return null;
  return {
    id: p.id ?? p.uuid ?? String(p.id || ''),
    sku: p.sku ?? null,
    slug: p.slug ?? p.id ?? '',
    name: p.name ?? p.titulo ?? '',
    description: p.description ?? p.descricao ?? null,
    shortDescription: p.shortDescription ?? null,
    imageUrl: p.imageUrl ?? p.imagemUrl ?? null,
    price: typeof p.price === 'number' ? p.price : Number(p.price ?? 0),
    promotionalPrice: p.promotionalPrice ? Number(p.promotionalPrice) : null,
    compareAtPrice: p.compareAtPrice ?? null,
    stock: typeof p.stock === 'number' ? p.stock : Number(p.stock ?? 0),
    isFeatured: !!(p.isFeatured ?? p.destaque),
    category: p.category ?? p.categoria ?? null,
    images: Array.isArray(p.images) ? p.images : (p.imagens || []).map((url: string, i: number) => ({ url, alt: p.name || '', order: i })),
    createdAt: p.createdAt ?? new Date().toISOString(),
  };
}

export async function listProducts(params: ListProductsParams) {
  const { featured, categorySlug, limit } = params;

  if (isExternalEnabled()) {
    try {
      const base = externalBase();
      const url = new URL(base + '/products');
      if (featured) url.searchParams.set('featured', 'true');
      if (categorySlug) url.searchParams.set('category', categorySlug);
      if (limit) url.searchParams.set('limit', String(limit));

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error('External products API error');
      const data = await res.json();
      const arr = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);
      return arr.map(mapExternalProduct);
    } catch (e) {
      console.warn('[products-repository] external list failed, falling back to local:', e);
      // fallback local
    }
  }

  // Local Prisma fallback
  const where: any = { isActive: true };
  if (featured) where.isFeatured = true;
  if (categorySlug) where.category = { slug: categorySlug };

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { take: 1, select: { url: true, alt: true, order: true } },
    },
    take: limit ?? undefined,
    orderBy: { createdAt: 'desc' },
  });
  return products;
}

export async function getProduct(idOrSlug: string) {
  if (isExternalEnabled()) {
    try {
      const base = externalBase();
      const res = await fetch(`${base}/products/${encodeURIComponent(idOrSlug)}`, { cache: 'no-store' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('External product API error');
      const data = await res.json();
      const product = data?.product ?? data;
      return mapExternalProduct(product);
    } catch (e) {
      console.warn('[products-repository] external get failed, falling back to local:', e);
      // fallback local
    }
  }

  // Local Prisma fallback
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ slug: idOrSlug }, { id: idOrSlug }],
      isActive: true,
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: { select: { id: true, price: true, name: true, stock: true, attributes: true } },
      images: { orderBy: { order: 'asc' }, select: { url: true, alt: true } },
    },
  });
  return product;
}
