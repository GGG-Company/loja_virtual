import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } },
    );
  } catch (error) {
    logger.error(error as Error, '[CATEGORIES_GET]');
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }
}
