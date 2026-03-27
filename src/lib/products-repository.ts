import { prisma } from '@/lib/prisma';

// Trigram similarity in JS (same algorithm as pg_trgm)
function trigrams(str: string): Set<string> {
  const s = `  ${str.toLowerCase().trim()}  `;
  const set = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) {
    set.add(s.substring(i, i + 3));
  }
  return set;
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Compare search term against each word in the text — returns best match
function bestWordSimilarity(text: string, search: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  let best = 0;
  for (const word of words) {
    const sim = trigramSimilarity(word, search.toLowerCase());
    if (sim > best) best = sim;
  }
  // Also check the full text (for multi-word search terms)
  const fullSim = trigramSimilarity(text, search);
  return Math.max(best, fullSim);
}

export type ListProductsParams = {
  featured?: boolean;
  promo?: boolean;
  categorySlug?: string | null;
  limit?: number | null;
  search?: string | null;
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
    ean: p.ean ?? p.gtin ?? null,
    slug: p.slug ?? p.id ?? '',
    name: p.name ?? p.titulo ?? '',
    description: p.description ?? p.descricao ?? null,
    shortDescription: p.shortDescription ?? null,
    imageUrl: p.imageUrl ?? p.imagemUrl ?? null,
    price: typeof p.price === 'number' ? p.price : Number(p.price ?? 0),
    promotionalPrice: p.promotionalPrice ? Number(p.promotionalPrice) : null,
    compareAtPrice: p.compareAtPrice ?? null,
    stock: typeof p.stock === 'number' ? p.stock : Number(p.stock ?? 0),
    ncm: p.ncm ?? null,
    origin: p.origin ?? p.origem ?? null,
    isFeatured: !!(p.isFeatured ?? p.destaque),
    category: p.category ?? p.categoria ?? null,
    images: Array.isArray(p.images) ? p.images : (p.imagens || []).map((url: string, i: number) => ({ url, alt: p.name || '', order: i })),
    createdAt: p.createdAt ?? new Date().toISOString(),
  };
}

export async function listProducts(params: ListProductsParams) {
  const { featured, promo, categorySlug, limit, search } = params;

  if (isExternalEnabled()) {
    try {
      const base = externalBase();
      const url = new URL(base + '/products');
      if (featured) url.searchParams.set('featured', 'true');
      if (promo) url.searchParams.set('promo', 'true');
      if (categorySlug) url.searchParams.set('category', categorySlug);
      if (limit) url.searchParams.set('limit', String(limit));
      if (search) url.searchParams.set('search', search);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeoutId);
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
  if (promo) where.isPromo = true;
  if (categorySlug) where.category = { slug: categorySlug };

  // Fuzzy search: first try exact contains, then fuzzy match in JS
  if (search) {
    // Step 1: Try exact substring match first
    const exactWhere: any = { ...where };
    exactWhere.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];

    const exactResults = await prisma.product.findMany({
      where: exactWhere,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { take: 1, select: { url: true, alt: true, order: true } },
      },
      take: limit ?? undefined,
      orderBy: { createdAt: 'desc' },
    });

    if (exactResults.length > 0) return exactResults;

    // Step 2: No exact match — do fuzzy search in JS
    // Fetch all active products (with filters) and rank by similarity
    const allProducts = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { take: 1, select: { url: true, alt: true, order: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const searchLower = search.toLowerCase();
    const scored = allProducts
      .map(p => {
        const nameSim = bestWordSimilarity(p.name || '', searchLower);
        const descSim = bestWordSimilarity((p.description || '').substring(0, 300), searchLower);
        const skuSim = bestWordSimilarity(p.sku || '', searchLower);
        const score = Math.max(nameSim, descSim * 0.7, skuSim);
        return { product: p, score };
      })
      .filter(({ score }) => score > 0.25)
      .sort((a, b) => b.score - a.score);

    const results = scored.map(s => s.product);
    return limit ? results.slice(0, limit) : results;
  }

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${base}/products/${encodeURIComponent(idOrSlug)}`, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeoutId);
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
