import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ categories });
  } catch (error) {
    logger.error(error as Error, '[API][GET] /api/admin/categories');
    return NextResponse.json({ error: 'Erro ao listar categorias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
