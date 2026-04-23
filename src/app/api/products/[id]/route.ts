import logger from "@/lib/logger";
import { NextResponse } from 'next/server';
import { getProduct, isExternalEnabled } from '@/lib/products-repository';
import { toNum } from '@/lib/parse-decimal';

export const dynamic = 'force-dynamic';

function serializeProduct(p: any) {
  if (!p) return p;
  return {
    ...p,
    price:            toNum(p.price),
    promotionalPrice: p.promotionalPrice != null ? toNum(p.promotionalPrice) : null,
    compareAtPrice:   p.compareAtPrice   != null ? toNum(p.compareAtPrice)   : null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getProduct(id);

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, source: isExternalEnabled() ? 'external' : 'local', product: serializeProduct(product) });
  } catch (error) {
    logger.error(error as Error, '[PRODUCT_GET]');
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    );
  }
}
