import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/financial/config
 * 
 * Retorna configuração completa (incluindo markup e custo).
 * Requer role: OWNER apenas
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = await prisma.financialConfig.findUnique({
      where: { id: 'singleton' },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('[FINANCIAL_CONFIG_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/financial/config
 * 
 * Atualizar configuração financeira.
 * Requer role: OWNER apenas
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const updated = await prisma.financialConfig.update({
      where: { id: 'singleton' },
      data: {
        ...body,
        updatedBy: session.user.id,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[FINANCIAL_CONFIG_PUT]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
