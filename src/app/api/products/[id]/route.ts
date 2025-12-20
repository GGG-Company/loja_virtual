import { NextResponse } from 'next/server';
import { getProduct, isExternalEnabled } from '@/lib/products-repository';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProduct(params.id);

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, source: isExternalEnabled() ? 'external' : 'local', product });
  } catch (error) {
    console.error('[PRODUCT_GET]', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    );
  }
}
