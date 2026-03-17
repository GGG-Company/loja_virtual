import logger from "@/lib/logger";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        creditCardInterestRate: 1.99,
        maxInstallments: 12,
        minInstallmentValue: 50,
        freeShippingMinValue: 200,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    logger.error(error, '[FINANCIAL CONFIG ERROR]');
    return NextResponse.json(
      { error: 'Erro ao buscar configuração' },
      { status: 500 }
    );
  }
}
