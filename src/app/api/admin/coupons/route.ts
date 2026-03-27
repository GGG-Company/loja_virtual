import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";

// GET - Listar cupons
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const search = (searchParams.get('search') || '').trim();

    const where = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ]);

    return NextResponse.json({
      coupons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    logger.error(error as Error, '[ADMIN_COUPONS_GET]');
    return NextResponse.json({ error: 'Erro ao listar cupons' }, { status: 500 });
  }
}

// POST - Criar cupom
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      code,
      description,
      discountType,
      value,
      scope,
      scopeValues,
      minPurchase,
      maxDiscount,
      usageLimit,
      usagePerUser,
      isActive,
      startDate,
      endDate,
    } = body;

    // Validações
    if (!code || !discountType || !value || !scope) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      return NextResponse.json({ error: 'Valor do desconto deve ser positivo' }, { status: 400 });
    }

    if (discountType === 'PERCENTAGE' && parsedValue > 100) {
      return NextResponse.json({ error: 'Desconto percentual não pode exceder 100%' }, { status: 400 });
    }

    if (maxDiscount && parseFloat(maxDiscount) <= 0) {
      return NextResponse.json({ error: 'Desconto máximo deve ser positivo' }, { status: 400 });
    }

    if (usagePerUser && usageLimit && parseInt(usagePerUser) > parseInt(usageLimit)) {
      return NextResponse.json({ error: 'Uso por usuário não pode exceder o limite total' }, { status: 400 });
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json({ error: 'Data inicial deve ser anterior à data final' }, { status: 400 });
    }

    // Verifica se código já existe
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return NextResponse.json({ error: 'Código de cupom já existe' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType,
        value: parseFloat(value),
        scope,
        scopeValues: scopeValues ? scopeValues : null,
        minPurchase: minPurchase ? parseFloat(minPurchase) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        usagePerUser: usagePerUser ? parseInt(usagePerUser) : null,
        isActive: isActive ?? true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    logger.error(error as Error, '[ADMIN_COUPONS_POST]');
    return NextResponse.json({ error: 'Erro ao criar cupom' }, { status: 500 });
  }
}
