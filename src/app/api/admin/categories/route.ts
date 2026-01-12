import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[API][GET] /api/admin/categories', error);
    return NextResponse.json({ error: 'Erro ao listar categorias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    console.error('[API][POST] /api/admin/categories', error);
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, slug, description, image } = body || {};
    if (!id || !name || !slug) return NextResponse.json({ error: 'id, name e slug obrigatórios' }, { status: 400 });

    const exists = await prisma.category.findUnique({ where: { id } });
    if (!exists) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });

    const updated = await prisma.category.update({ where: { id }, data: { name, slug, description: description || null, image: image || null } });
    return NextResponse.json({ category: updated });
  } catch (error) {
    console.error('[API][PUT] /api/admin/categories', error);
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API][DELETE] /api/admin/categories', error);
    return NextResponse.json({ error: 'Erro ao deletar categoria' }, { status: 500 });
  }
}
