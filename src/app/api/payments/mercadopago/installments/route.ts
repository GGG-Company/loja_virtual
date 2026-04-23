import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface InstallmentOption {
  installments: number;
  installmentAmount: number;
  totalAmount: number;
  interestFree: boolean;
  label: string;
}

export const installmentsCache = new Map<number, { data: InstallmentOption[]; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

const DEFAULT = { maxInstallments: 12, freeInstallments: 12, interestRate: 0, minInstallmentValue: 5 };

async function getFinancialConfig() {
  try {
    const config = await prisma.financialConfig.findUnique({ where: { id: 'singleton' } });
    if (!config) return DEFAULT;
    const maxInstallments = Number(config.maxInstallments) || 12;
    const interestRate = Number(config.creditCardInterestRate) || 0;
    // Se houver taxa de juros, nenhuma parcela é sem juros; caso contrário, todas são
    const freeInstallments = interestRate > 0 ? 0 : maxInstallments;
    return {
      maxInstallments,
      freeInstallments,
      interestRate,
      minInstallmentValue: Number(config.minInstallmentValue) || 5,
    };
  } catch {
    return DEFAULT;
  }
}

function buildInstallments(
  amount: number,
  maxInstallments: number,
  freeInstallments: number,
  interestRate: number,
  minInstallmentValue: number,
): InstallmentOption[] {
  const options: InstallmentOption[] = [];

  for (let i = 1; i <= maxInstallments; i++) {
    const isFree = i <= freeInstallments;
    let installmentAmount: number;
    let totalAmount: number;

    if (isFree) {
      installmentAmount = amount / i;
      totalAmount = amount;
    } else {
      const rate = interestRate / 100;
      totalAmount = amount * Math.pow(1 + rate, i);
      installmentAmount = totalAmount / i;
    }

    if (installmentAmount < minInstallmentValue) break;

    options.push({
      installments: i,
      installmentAmount,
      totalAmount,
      interestFree: isFree,
      label: isFree
        ? `${i}x de R$ ${installmentAmount.toFixed(2)} sem juros`
        : `${i}x de R$ ${installmentAmount.toFixed(2)} (total R$ ${totalAmount.toFixed(2)})`,
    });
  }

  return options;
}

export async function GET(req: NextRequest) {
  const amount = parseFloat(req.nextUrl.searchParams.get('amount') ?? '0');
  if (!amount || amount <= 0) return NextResponse.json({ installments: [] });

  const amountCents = Math.round(amount * 100);
  const cached = installmentsCache.get(amountCents);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ installments: cached.data });
  }

  const config = await getFinancialConfig();
  const installments = buildInstallments(
    amount,
    config.maxInstallments,
    config.freeInstallments,
    config.interestRate,
    config.minInstallmentValue,
  );

  installmentsCache.set(amountCents, { data: installments, expiresAt: Date.now() + CACHE_TTL_MS });
  return NextResponse.json({ installments });
}
