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

const installmentsCache = new Map<number, { data: InstallmentOption[]; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// BINs dos cartões de teste oficiais do Mercado Pago
const TEST_CARDS = [
  { bin: '503143', paymentMethodId: 'master' }, // Mastercard aprovado (5031 4332 1540 6351)
  { bin: '450995', paymentMethodId: 'visa' },    // Visa aprovado (4509 9535 6623 3704)
  { bin: '503175', paymentMethodId: 'master' },  // Mastercard alternativo
];

function parseCosts(payerCosts: any[]): InstallmentOption[] {
  return payerCosts.map((cost: any) => {
    const n: number = cost.installments;
    const installmentAmount: number = Number(cost.installment_amount);
    const totalAmount: number = Number(cost.total_amount);
    const isInterestFree: boolean = Number(cost.installment_rate) === 0;
    const installmentFmt = installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalFmt = totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      installments: n,
      installmentAmount,
      totalAmount,
      interestFree: isInterestFree,
      label: isInterestFree
        ? `${n}x de R$ ${installmentFmt} sem juros`
        : `${n}x de R$ ${installmentFmt} (total R$ ${totalFmt})`,
    };
  });
}

async function fetchFromMercadoPago(amount: number): Promise<InstallmentOption[] | null> {
  const publicKey = (process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || '').replace(/['"]/g, '').trim();
  if (!publicKey || publicKey.length < 10) return null;

  // Tenta cada BIN de teste até encontrar um que retorne múltiplas parcelas
  for (const card of TEST_CARDS) {
    try {
      const url = `https://api.mercadopago.com/v1/payment_methods/installments?payment_method_id=${card.paymentMethodId}&amount=${amount.toFixed(2)}&bin=${card.bin}&public_key=${publicKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;

      const data = await res.json();
      const payerCosts: any[] = data?.[0]?.payer_costs;
      if (!Array.isArray(payerCosts) || payerCosts.length <= 1) continue;

      return parseCosts(payerCosts);
    } catch {
      continue;
    }
  }

  return null;
}

async function calculateFallbackInstallments(amount: number): Promise<InstallmentOption[]> {
  let maxInstallments = 12;
  let interestRate = 0;
  let minValue = 5;

  try {
    const config = await prisma.financialConfig.findUnique({
      where: { id: 'singleton' },
      select: { maxInstallments: true, creditCardInterestRate: true, minInstallmentValue: true },
    });
    if (config) {
      maxInstallments = config.maxInstallments;
      interestRate = Number(config.creditCardInterestRate);
      minValue = Number(config.minInstallmentValue);
    }
  } catch { }

  const options: InstallmentOption[] = [];

  for (let n = 1; n <= maxInstallments; n++) {
    let installmentAmount: number;
    let totalAmount: number;
    let isInterestFree: boolean;

    if (interestRate === 0 || n === 1) {
      installmentAmount = amount / n;
      totalAmount = amount;
      isInterestFree = true;
    } else {
      // PMT com juros compostos: PV * r / (1 - (1+r)^-n)
      const r = interestRate / 100;
      installmentAmount = (amount * r) / (1 - Math.pow(1 + r, -n));
      totalAmount = installmentAmount * n;
      isInterestFree = false;
    }

    if (n > 1 && installmentAmount < minValue) break;

    const installmentFmt = installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalFmt = totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    options.push({
      installments: n,
      installmentAmount,
      totalAmount,
      interestFree: isInterestFree,
      label: isInterestFree
        ? `${n}x de R$ ${installmentFmt} sem juros`
        : `${n}x de R$ ${installmentFmt} (total R$ ${totalFmt})`,
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

  let installments = await fetchFromMercadoPago(amount);

  // Fallback para config financeira quando MP não retorna múltiplas opções (sandbox / sem config)
  if (!installments || installments.length <= 1) {
    installments = await calculateFallbackInstallments(amount);
  }

  if (!installments || installments.length === 0) {
    return NextResponse.json({ installments: [] });
  }

  installmentsCache.set(amountCents, { data: installments, expiresAt: Date.now() + CACHE_TTL_MS });
  return NextResponse.json({ installments });
}
