import logger from "@/lib/logger";
import { NextResponse } from 'next/server';
import { getProduct, isExternalEnabled } from '@/lib/products-repository';

export const dynamic = 'force-dynamic';

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

    return NextResponse.json({ success: true, source: isExternalEnabled() ? 'external' : 'local', product });
  } catch (error) {
    logger.error(error as Error, '[PRODUCT_GET]');
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    );
  }
}
