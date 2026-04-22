import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN' && role !== 'OWNER') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) };
  }
  return { session };
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const skip = (page - 1) * limit;

    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { slug: { contains: search, mode: 'insensitive' as const } }] }
      : {};

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit, include: { _count: { select: { products: true } } } }),
      prisma.brand.count({ where }),
    ]);

    return NextResponse.json({ brands, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error(err as Error, '[API][GET] /api/admin/brands');
    return NextResponse.json({ error: 'Erro ao listar marcas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { name, slug, description, logoUrl, isActive } = body || {};
    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

    const finalSlug = (slug || toSlug(name));
    const exists = await prisma.brand.findUnique({ where: { slug: finalSlug } });
    if (exists) return NextResponse.json({ error: 'Slug já existe' }, { status: 409 });

    const brand = await prisma.brand.create({
      data: { name: name.trim(), slug: finalSlug, description: description || null, logoUrl: logoUrl || null, isActive: isActive ?? true },
    });
    return NextResponse.json({ brand }, { status: 201 });
  } catch (err) {
    logger.error(err as Error, '[API][POST] /api/admin/brands');
    return NextResponse.json({ error: 'Erro ao criar marca' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { id, name, slug, description, logoUrl, isActive } = body || {};
    if (!id || !name) return NextResponse.json({ error: 'id e nome são obrigatórios' }, { status: 400 });

    const exists = await prisma.brand.findUnique({ where: { id } });
    if (!exists) return NextResponse.json({ error: 'Marca não encontrada' }, { status: 404 });

    const finalSlug = slug || toSlug(name);
    if (finalSlug !== exists.slug) {
      const slugConflict = await prisma.brand.findUnique({ where: { slug: finalSlug } });
      if (slugConflict) return NextResponse.json({ error: 'Slug já existe' }, { status: 409 });
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: { name: name.trim(), slug: finalSlug, description: description || null, logoUrl: logoUrl || null, isActive: isActive ?? true },
    });
    return NextResponse.json({ brand });
  } catch (err) {
    logger.error(err as Error, '[API][PUT] /api/admin/brands');
    return NextResponse.json({ error: 'Erro ao atualizar marca' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const brand = await prisma.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!brand) return NextResponse.json({ error: 'Marca não encontrada' }, { status: 404 });
    if (brand._count.products > 0) {
      return NextResponse.json({ error: `Não é possível excluir: ${brand._count.products} produto(s) vinculado(s)` }, { status: 409 });
    }

    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error(err as Error, '[API][DELETE] /api/admin/brands');
    return NextResponse.json({ error: 'Erro ao deletar marca' }, { status: 500 });
  }
}
