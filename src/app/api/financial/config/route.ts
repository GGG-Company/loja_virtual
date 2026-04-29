import logger from "@/lib/logger";
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/financial/config
 * 
 * Retorna configuração financeira pública (sem dados sensíveis).
 * Usado pelo hook usePrice no frontend.
 */
export async function GET() {
  try {
    const config = await prisma.financialConfig.findUnique({
      where: { id: 'singleton' },
      select: {
        creditCardInterestRate: true,
        maxInstallments: true,
        minInstallmentValue: true,
        freeShippingMinValue: true,
      },
    });

    if (!config) {
      // Retornar valores padrão se não configurado
      return NextResponse.json({
        creditCardInterestRate: 0,
        maxInstallments: 12,
        minInstallmentValue: 5,
        freeShippingMinValue: 299,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    logger.error(error, '[FINANCIAL CONFIG ERROR]');
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session?.user || (role !== 'ADMIN' && role !== 'OWNER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const maxInstallments     = Math.min(24, Math.max(1, parseInt(body.maxInstallments)     || 12));
    const creditCardInterestRate = Math.max(0, parseFloat(body.creditCardInterestRate)       ?? 0);
    const minInstallmentValue = Math.max(1, parseFloat(body.minInstallmentValue)             || 5);
    const freeShippingMinValue = Math.max(0, parseFloat(body.freeShippingMinValue)           || 0);

    const config = await prisma.financialConfig.upsert({
      where: { id: 'singleton' },
      update: { maxInstallments, creditCardInterestRate, minInstallmentValue, freeShippingMinValue },
      create: { id: 'singleton', maxInstallments, creditCardInterestRate, minInstallmentValue, freeShippingMinValue },
    });


    return NextResponse.json(config);
  } catch (error) {
    logger.error(error, '[FINANCIAL CONFIG PUT]');
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
  }
}
