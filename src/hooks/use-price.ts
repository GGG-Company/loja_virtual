'use client';

import { useEffect, useState, useMemo } from 'react';
import type { InstallmentOption } from '@/app/api/payments/mercadopago/installments/route';

export interface PriceInstallment {
  installments: number;
  installmentValue: number;
  total: number;
  interestFree: boolean;
}

// Cache em memória por sessão — evita múltiplas chamadas para o mesmo valor
const sessionCache = new Map<number, InstallmentOption[]>();

async function fetchInstallments(amount: number): Promise<InstallmentOption[]> {
  const amountCents = Math.round(amount * 100);

  const hit = sessionCache.get(amountCents);
  if (hit) return hit;

  try {
    const res = await fetch(`/api/payments/mercadopago/installments?amount=${amount}`);
    if (!res.ok) return [];
    const data = await res.json();
    const list: InstallmentOption[] = data.installments ?? [];
    sessionCache.set(amountCents, list);
    return list;
  } catch {
    return [];
  }
}

export function usePrice(basePrice: number) {
  const [mpInstallments, setMpInstallments] = useState<InstallmentOption[]>(() =>
    sessionCache.get(Math.round(basePrice * 100)) ?? [],
  );
  const [loading, setLoading] = useState(mpInstallments.length === 0 && basePrice > 0);

  useEffect(() => {
    if (basePrice <= 0) {
      setMpInstallments([]);
      setLoading(false);
      return;
    }

    // Se já temos no cache, não busca novamente
    const cached = sessionCache.get(Math.round(basePrice * 100));
    if (cached) {
      setMpInstallments(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchInstallments(basePrice).then((list) => {
      if (!cancelled) {
        setMpInstallments(list);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [basePrice]);

  // Converte para o formato interno (compatível com os componentes existentes)
  const installmentOptions = useMemo((): PriceInstallment[] =>
    mpInstallments.map((c) => ({
      installments: c.installments,
      installmentValue: c.installmentAmount,
      total: c.totalAmount,
      interestFree: c.interestFree,
    })),
    [mpInstallments],
  );

  const bestInstallment = useMemo(
    () => installmentOptions.length > 0 ? installmentOptions[installmentOptions.length - 1] : null,
    [installmentOptions],
  );

  const formatPrice = (value: number): string =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const bestInstallmentText = (): string => {
    if (!bestInstallment) return '';
    return `${bestInstallment.installments}x de ${formatPrice(bestInstallment.installmentValue)} ${
      bestInstallment.interestFree ? 'sem juros' : 'com juros'
    }`;
  };

  return {
    installmentOptions,
    bestInstallment,
    bestInstallmentText,
    formatPrice,
    loading,
  };
}
