import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toNum } from '@/lib/parse-decimal';

export const dynamic = 'force-dynamic';

const TOTAL_SLOTS = 12;

const SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  shortDescription: true,
  price: true,
  promotionalPrice: true,
  compareAtPrice: true,
  imageUrl: true,
  stock: true,
  isFeatured: true,
  isPromo: true,
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  images: { take: 1, orderBy: { order: 'asc' as const }, select: { url: true, alt: true } },
  _count: { select: { reviews: true, orderItems: true } },
  reviews: { where: { isApproved: true, rating: { gte: 4 } }, select: { id: true } },
};

function serialize(p: any) {
  const { reviews, _count, ...rest } = p;
  return {
    ...rest,
    price: toNum(rest.price),
    promotionalPrice: rest.promotionalPrice != null ? toNum(rest.promotionalPrice) : null,
    compareAtPrice: rest.compareAtPrice != null ? toNum(rest.compareAtPrice) : null,
    imageUrl: rest.imageUrl || rest.images?.[0]?.url || null,
    positiveReviews: reviews.length,
    totalReviews: _count.reviews,
    orderCount: _count.orderItems,
  };
}

// Retorna o número da semana do ano (0-based) — muda todo domingo
function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

// PRNG determinístico baseado em semente (mulberry32)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates com semente determinística
function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  const rand = seededRandom(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Lógica híbrida:
// 1. Produtos com isFeatured=true entram sempre (escolha manual do admin)
// 2. Vagas restantes são preenchidas pelos de maior score (trending automático)
//    com rotação semanal: pega o top 3× de vagas por score e embaralha com
//    semente da semana — garante variedade visual sem ignorar popularidade.
// Score = avaliações_positivas(4-5★)*15 + vezes_comprado*8
export async function GET() {
  try {
    const [pinned, candidates] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        select: SELECT,
        take: TOTAL_SLOTS,
      }),
      // Limita a 100 candidatos pelos mais comprados — evita carregar 20k+ produtos em memória
      // Apenas produtos vinculados ao Hiper entram no automático
      prisma.product.findMany({
        where: {
          isActive: true,
          isFeatured: false,
          stock: { gt: 0 },
          externalIdHiper: { not: null },
        },
        select: SELECT,
        orderBy: { orderItems: { _count: 'desc' } },
        take: 100,
      }),
    ]);

    const remaining = TOTAL_SLOTS - pinned.length;

    // Ordena pelo score e pega os top (remaining * 3) melhores como pool
    const pool = candidates
      .map((p) => ({
        ...p,
        _score: p.reviews.length * 15 + p._count.orderItems * 8,
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, remaining * 3);

    // Embaralha o pool com semente da semana e pega os primeiros `remaining`
    const weekSeed = getWeekNumber() * 2654435761; // multiplicador primo para melhor dispersão
    const auto = shuffleSeeded(pool, weekSeed).slice(0, remaining);

    const result = [...pinned, ...auto].map(serialize);

    return NextResponse.json(
      { products: result },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch (err) {
    console.error('[trending]', err);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
