import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toNum } from '@/lib/parse-decimal';

export const dynamic = 'force-dynamic';

const TOTAL_SLOTS = 4;

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
  viewCount: true,
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

// Lógica híbrida:
// 1. Produtos com isFeatured=true entram sempre (escolha manual do admin)
// 2. Vagas restantes são preenchidas pelos de maior score (trending automático)
// Score = viewCount*1 + avaliações_positivas(4-5★)*15 + vezes_comprado*8
export async function GET() {
  const [pinned, candidates] = await Promise.all([
    // Fixados manualmente
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      select: SELECT,
      take: TOTAL_SLOTS,
    }),
    // Candidatos automáticos (não fixados, com estoque)
    prisma.product.findMany({
      where: { isActive: true, isFeatured: false, stock: { gt: 0 } },
      select: SELECT,
    }),
  ]);

  const remaining = TOTAL_SLOTS - pinned.length;

  const auto = candidates
    .map((p) => ({
      ...p,
      _score: p.viewCount * 1 + p.reviews.length * 15 + p._count.orderItems * 8,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, remaining);

  const result = [...pinned, ...auto].map(serialize);

  return NextResponse.json(
    { products: result },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
  );
}
