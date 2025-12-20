import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    console.error('[FINANCIAL CONFIG ERROR]', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configuração' },
      { status: 500 }
    );
  }
}
