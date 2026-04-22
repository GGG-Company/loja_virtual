import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: { select: { id: true, name: true } },
        images: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    logger.error(error as Error, '[ADMIN_PRODUCT_GET]');
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      price,
      promotionalPrice,
      stock,
      status,
      imageUrl,
      isFeatured,
      isPromo,
      stockLocation,
      categoryId,
      brandId,
      ean,
    } = body;

    // Garante que o produto existe e captura categoryId atual para fallback
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, categoryId: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Valida se a categoria existe, caso categoryId seja fornecido
    let validCategoryId = existing.categoryId; // fallback para categoria atual
    if (categoryId && categoryId.trim() !== '') {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (categoryExists) {
        validCategoryId = categoryId;
      } else {
        logger.warn(`[ADMIN_PRODUCT_PUT] Categoria ${categoryId} não encontrada, mantendo categoria atual`);
      }
    }

    const normalizedImage = imageUrl === '' || imageUrl === null ? null : imageUrl;

    const updateData: any = {
      name,
      description,
      price,
      promotionalPrice: promotionalPrice || null,
      isFeatured: isFeatured ?? false,
      isPromo: isPromo ?? false,
      stock,
      isActive: status === 'ACTIVE' ? true : status === 'INACTIVE' ? false : existing.isActive,
      stockLocation: stockLocation?.trim() || null,
      categoryId: validCategoryId,
      brandId: brandId || null,
      ean: ean?.trim() || null,
      ...(imageUrl !== undefined && { imageUrl: normalizedImage }),
    };

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    logger.error(error as Error, '[ADMIN_PRODUCT_PUT]');
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        isFeatured: false,
      },
    });

    return NextResponse.json({ success: true, id: product.id, softDeleted: true });
  } catch (error) {
    logger.error(error as Error, '[ADMIN_PRODUCT_DELETE]');
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}
