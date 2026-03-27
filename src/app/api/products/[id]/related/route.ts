import logger from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getProduct, listProducts } from '@/lib/products-repository';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await getProduct(id);

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const categorySlug =
      (product as any).category?.slug ?? null;

    const allInCategory = await listProducts({
      categorySlug,
      limit: 20,
    });

    const related = allInCategory
      .filter((p: any) => p.id !== id && p.id !== product.id)
      .slice(0, 4);

    return NextResponse.json({ products: related });
  } catch (error) {
    logger.error(error as Error, '[PRODUCTS_RELATED_GET]');
    return NextResponse.json({ error: 'Erro ao buscar produtos relacionados' }, { status: 500 });
  }
}
