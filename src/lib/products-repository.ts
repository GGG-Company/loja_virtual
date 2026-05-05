import { prisma } from '@/lib/prisma';

// ── Trigram similarity (mirrors pg_trgm algorithm) ─────────────────────────
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

// Best word-level similarity — useful for "furadira" → "furadeira"
function bestWordSimilarity(text: string, search: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  let best = 0;
  for (const word of words) {
    const sim = trigramSimilarity(word, search.toLowerCase());
    if (sim > best) best = sim;
  }
  const fullSim = trigramSimilarity(text, search);
  return Math.max(best, fullSim);
}

// ── Fuzzy threshold — 0.18 catches multi-letter typos ("maquita"→"makita") ──
const FUZZY_THRESHOLD = 0.18;

function dedup<T extends { id: unknown }>(items: T[]): T[] {
  const seen = new Set<unknown>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export type ListProductsParams = {
  featured?: boolean;
  promo?: boolean;
  categorySlug?: string | null;
  grupoSlug?: string | null;
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
  const { featured, promo, categorySlug, grupoSlug, limit, search } = params;

  if (isExternalEnabled()) {
    try {
      const base = externalBase();
      const url = new URL(base + '/products');
      if (featured) url.searchParams.set('featured', 'true');
      if (promo) url.searchParams.set('promo', 'true');
      if (categorySlug) url.searchParams.set('category', categorySlug);
      if (grupoSlug) url.searchParams.set('grupo', grupoSlug);
      if (limit) url.searchParams.set('limit', String(limit));
      if (search) url.searchParams.set('search', search);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('External products API error');
      const data = await res.json();
      const arr = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);
      return dedup(arr.map(mapExternalProduct));
    } catch (e) {
      console.warn('[products-repository] external list failed, falling back to local:', e);
    }
  }

  // ── Local Prisma path ────────────────────────────────────────────────────
  const where: any = { isActive: true };
  if (featured) where.isFeatured = true;
  if (promo) where.isPromo = true;
  if (categorySlug) where.category = { slug: categorySlug };
  if (grupoSlug) where.grupo = grupoSlug;

  if (search) {
    const cap = limit ?? 40;

    // Step 1 — Full-Text Search via tsvector GIN index (O(log n), dicionário PT)
    // Wrapped in try/catch: se a coluna searchVector ainda não existir no banco
    // (migration pendente), cai graciosamente no Step 2 (ILIKE).
    try {
      const ftsResults = await prisma.$queryRaw<any[]>`
        SELECT
          p.id, p.sku, p.slug, p.name, p.description, p."shortDescription",
          p."imageUrl", p.price, p."compareAtPrice", p."promotionalPrice",
          p.stock, p."isFeatured", p."isPromo", p."isActive",
          p.specs, p."categoryId", p."createdAt", p."updatedAt",
          row_to_json(c.*) AS category,
          row_to_json(b.*) AS brand,
          (
            SELECT json_agg(pi.*)
            FROM (
              SELECT url, alt, "order" FROM "product_images"
              WHERE "productId" = p.id
              ORDER BY "order" ASC
              LIMIT 1
            ) pi
          ) AS images,
          ts_rank(p."searchVector", plainto_tsquery('portuguese', ${search})) AS rank
        FROM "products" p
        LEFT JOIN "categories" c ON c.id = p."categoryId"
        LEFT JOIN "brands" b ON b.id = p."brandId"
        WHERE
          p."isActive" = true
          AND p."searchVector" @@ plainto_tsquery('portuguese', ${search})
        ORDER BY rank DESC
        LIMIT ${cap}
      `;

      if (ftsResults.length > 0) return dedup(ftsResults);
    } catch (e: any) {
      // Código 42703 = coluna inexistente; qualquer outro erro de DB também cai aqui
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[products-repository] FTS falhou, usando ILIKE:', e?.message);
      }
    }

    // Step 2 — ILIKE fallback (short terms, brand names, SKUs)
    const ilikeResults = await prisma.product.findMany({
      where: {
        ...where,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku:  { contains: search, mode: 'insensitive' } },
          { brand: { name: { contains: search, mode: 'insensitive' } } },
        ],
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: { take: 1, select: { url: true, alt: true, order: true } },
      },
      take: cap,
      orderBy: { createdAt: 'desc' },
    });

    if (ilikeResults.length > 0) return dedup(ilikeResults);

    // Step 3 — Fuzzy (trigram JS) — catches typos like "furadira" → "furadeira"
    // Fetch a broad candidate set (name + sku only) and rank in-process
    const candidates = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        price: true,
        promotionalPrice: true,
        imageUrl: true,
        stock: true,
        isFeatured: true,
        isPromo: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: { take: 1, select: { url: true, alt: true, order: true } },
      },
      take: 300, // limit candidate pool to avoid OOM
    });

    const scored = candidates
      .map(p => ({
        ...p,
        _score: Math.max(
          bestWordSimilarity(p.name, search),
          p.sku ? bestWordSimilarity(p.sku, search) : 0,
          p.brand?.name ? bestWordSimilarity(p.brand.name, search) : 0,
        ),
      }))
      .filter(p => p._score >= FUZZY_THRESHOLD)
      .sort((a, b) => b._score - a._score)
      .slice(0, cap);

    return dedup(scored);
  }

  return prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      images: { take: 1, select: { url: true, alt: true, order: true } },
    },
    take: limit ?? undefined,
    orderBy: { createdAt: 'desc' },
  });
}

// ── Listagem paginada com filtros server-side ─────────────────────────────────
export type PaginatedListParams = {
  categorySlug?: string | null;
  categorySlugs?: string[];
  grupoSlug?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
  brands?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  sortBy?: string | null;
  onSale?: boolean | null;
  inStock?: boolean | null;
};

const INCLUDE_LIST = {
  category: { select: { id: true, name: true, slug: true } },
  brand:    { select: { id: true, name: true, slug: true } },
  images:   { take: 1, select: { url: true, alt: true, order: true } },
} as const;

export async function listProductsPaginated(params: PaginatedListParams) {
  const {
    categorySlug, categorySlugs, grupoSlug, search,
    page = 1, pageSize = 24,
    brands, minPrice, maxPrice, sortBy,
    onSale, inStock,
  } = params;

  const skip = (Math.max(1, page) - 1) * pageSize;

  const where: any = { isActive: true };

  // Categoria: multi-select tem prioridade sobre single
  if (categorySlugs?.length) {
    where.category = { slug: { in: categorySlugs } };
  } else if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (grupoSlug)      where.grupo = grupoSlug;
  if (brands?.length) where.brand = { name: { in: brands } };

  // Filtro de preço sobre o preço efetivo (promocional > normal)
  const hasPriceFilter = minPrice != null || maxPrice != null;
  if (hasPriceFilter) {
    const pf: any = {};
    if (minPrice != null) pf.gte = minPrice;
    if (maxPrice != null) pf.lte = maxPrice;
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { promotionalPrice: { not: null, ...pf } },
          { AND: [{ promotionalPrice: null }, { price: pf }] },
        ],
      },
    ];
  }

  if (onSale) {
    where.AND = [...(where.AND ?? []), { promotionalPrice: { not: null } }];
  }

  if (inStock) {
    where.AND = [...(where.AND ?? []), { stock: { gt: 0 } }];
  }

  if (search) {
    const searchOr = {
      OR: [
        { name:  { contains: search, mode: 'insensitive' as const } },
        { sku:   { contains: search, mode: 'insensitive' as const } },
        { brand: { name: { contains: search, mode: 'insensitive' as const } } },
      ],
    };
    where.AND = [...(where.AND ?? []), searchOr];
  }

  const orderBy =
    sortBy === 'price-asc'  ? { price: 'asc'  as const } :
    sortBy === 'price-desc' ? { price: 'desc' as const } :
    sortBy === 'name'       ? { name:  'asc'  as const } :
    { createdAt: 'desc' as const };

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, include: INCLUDE_LIST, skip, take: pageSize, orderBy }),
    prisma.product.count({ where }),
  ]);

  return { products, total, pages: Math.max(1, Math.ceil(total / pageSize)), page, pageSize };
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
    }
  }

  return prisma.product.findFirst({
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
}
