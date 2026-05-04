import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toNum } from '@/lib/parse-decimal';

export const dynamic = 'force-dynamic';

// Total de slots exibidos na página de ofertas
const TOTAL_SLOTS = 16;

const SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  promotionalPrice: true,
  compareAtPrice: true,
  imageUrl: true,
  stock: true,
  isPromo: true,
  category: { select: { id: true, name: true, slug: true } },
  images: { take: 1, orderBy: { order: 'asc' as const }, select: { url: true, alt: true } },
  _count: { select: { reviews: true } },
};

function serialize(p: any) {
  const { _count, ...rest } = p;
  const price = toNum(rest.price);
  const promotionalPrice = rest.promotionalPrice != null ? toNum(rest.promotionalPrice) : null;
  const compareAtPrice = rest.compareAtPrice != null ? toNum(rest.compareAtPrice) : null;

  // O preço efetivo de venda é o menor entre promotionalPrice e price
  const salePrice = promotionalPrice != null ? Math.min(promotionalPrice, price) : price;
  // O preço de referência (riscado) é compareAtPrice ou o price original se há desconto
  const refPrice = compareAtPrice ?? (promotionalPrice != null ? price : null);
  const discountPct =
    refPrice != null && refPrice > salePrice
      ? Math.round(((refPrice - salePrice) / refPrice) * 100)
      : 0;

  return {
    ...rest,
    price,
    promotionalPrice,
    compareAtPrice,
    imageUrl: rest.imageUrl || rest.images?.[0]?.url || null,
    totalReviews: _count.reviews,
    salePrice,
    refPrice,
    discountPct,
  };
}

/**
 * Lógica híbrida de ofertas:
 * 1. Produtos com isPromo=true entram sempre (fixados pelo admin)
 * 2. Vagas restantes preenchidas por produtos com promotionalPrice definido,
 *    ordenados pelo maior percentual de desconto (automático)
 */
export async function GET() {
  try {
    const [pinned, autoCandidates] = await Promise.all([
      // Pinned: admin marcou isPromo=true
      prisma.product.findMany({
        where: { isActive: true, isPromo: true, stock: { gt: 0 } },
        select: SELECT,
        take: TOTAL_SLOTS,
      }),
      // Auto: tem preço promocional definido, mas não está manualmente marcado como promo
      prisma.product.findMany({
        where: {
          isActive: true,
          isPromo: false,
          stock: { gt: 0 },
          promotionalPrice: { not: null },
        },
        select: SELECT,
        take: 200, // carrega candidatos suficientes para ordenar por desconto
      }),
    ]);

    const remaining = TOTAL_SLOTS - pinned.length;

    // Serializa e ordena candidatos automáticos pelo maior % de desconto
    const autoSerialized = autoCandidates
      .map(serialize)
      .filter((p) => p.discountPct > 0) // só entra se há desconto real
      .sort((a, b) => b.discountPct - a.discountPct)
      .slice(0, remaining);

    const result = [...pinned.map(serialize), ...autoSerialized];

    return NextResponse.json(
      { products: result },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      },
    );
  } catch (err) {
    console.error('[offers]', err);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
