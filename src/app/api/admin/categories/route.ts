import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";

/** Verifica se o usuário é admin ou owner */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) };
  }
  return { session };
}

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page  = Math.max(1, parseInt(url.searchParams.get('page')  || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '8', 10)));
    const search = url.searchParams.get('search')?.trim() || '';

    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { slug: { contains: search, mode: 'insensitive' as const } }] }
      : {};

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { products: true } } },
      }),
      prisma.category.count({ where }),
    ]);

    return NextResponse.json({
      categories,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error(error as Error, '[API][GET] /api/admin/categories');
    return NextResponse.json({ error: 'Erro ao listar categorias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, description, image } = body || {};
    if (!name || !slug) {
      return NextResponse.json({ error: 'name e slug são obrigatórios' }, { status: 400 });
    }

    // Verifica slug único
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (exists) {
      return NextResponse.json({ error: 'Slug já existe' }, { status: 409 });
    }

    const created = await prisma.category.create({ data: { name, slug, description: description || null, image: image || null } });
    return NextResponse.json({ category: created }, { status: 201 });
  } catch (error) {
    logger.error(error as Error, '[API][POST] /api/admin/categories');
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, slug, description, image } = body || {};
    if (!id || !name || !slug) return NextResponse.json({ error: 'id, name e slug obrigatórios' }, { status: 400 });

    const exists = await prisma.category.findUnique({ where: { id } });
    if (!exists) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });

    const updated = await prisma.category.update({ where: { id }, data: { name, slug, description: description || null, image: image || null } });
    return NextResponse.json({ category: updated });
  } catch (error) {
    logger.error(error as Error, '[API][PUT] /api/admin/categories');
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(error as Error, '[API][DELETE] /api/admin/categories');
    return NextResponse.json({ error: 'Erro ao deletar categoria' }, { status: 500 });
  }
}
