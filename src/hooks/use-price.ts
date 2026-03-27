'use client';

import logger from "@/lib/logger";
import { useEffect, useState, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';

interface FinancialConfig {
  creditCardInterestRate: number;
  maxInstallments: number;
  minInstallmentValue: number;
}

interface InstallmentOption {
  installments: number;
  installmentValue: number;
  total: number;
  interestFree: boolean;
}

// ── Module-level singleton cache ───────────────────────────────────────────
// Shared across all usePrice() calls — only one API request per page load.
let configCache: FinancialConfig | null = null;
let configPromise: Promise<FinancialConfig> | null = null;

const DEFAULT_CONFIG: FinancialConfig = {
  creditCardInterestRate: 1.99,
  maxInstallments: 12,
  minInstallmentValue: 50,
};

async function fetchConfig(): Promise<FinancialConfig> {
  if (configCache) return configCache;
  if (!configPromise) {
    configPromise = apiClient
      .get<FinancialConfig>('/api/financial/config')
      .then((r) => {
        configCache = r.data;
        return r.data;
      })
      .catch((err) => {
        logger.error(err, 'Erro ao carregar configuração financeira — usando fallback');
        configCache = DEFAULT_CONFIG;
        return DEFAULT_CONFIG;
      });
  }
  return configPromise;
}

/**
 * Hook para cálculo de preços e parcelamento.
 *
 * A configuração financeira é buscada UMA única vez por sessão de página
 * (cache em memória de módulo) e compartilhada entre todos os cards de produto.
 */
export function usePrice(basePrice: number) {
  const [config, setConfig] = useState<FinancialConfig | null>(configCache);
  const [loading, setLoading] = useState(!configCache);

  useEffect(() => {
    if (configCache) {
      setConfig(configCache);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchConfig().then((cfg) => {
      if (!cancelled) {
        setConfig(cfg);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const installmentOptions = useMemo((): InstallmentOption[] => {
    if (!config) return [];
    const opts: InstallmentOption[] = [];
    const rate = config.creditCardInterestRate / 100;

    for (let i = 1; i <= config.maxInstallments; i++) {
      let total = basePrice;
      let installmentValue = basePrice / i;

      if (i >= 3) {
        total = basePrice * Math.pow(1 + rate, i);
        installmentValue = total / i;
      }

      if (installmentValue < config.minInstallmentValue) break;

      opts.push({ installments: i, installmentValue, total, interestFree: i < 3 });
    }
    return opts;
  }, [config, basePrice]);

  const formatPrice = (value: number): string =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const bestInstallment = useMemo(
    () => (installmentOptions.length > 0 ? installmentOptions[installmentOptions.length - 1] : null),
    [installmentOptions]
  );

  const bestInstallmentText = (): string => {
    if (!bestInstallment) return '';
    return `${bestInstallment.installments}x de ${formatPrice(bestInstallment.installmentValue)} ${
      bestInstallment.interestFree ? 'sem juros' : 'com juros'
    }`;
  };

  return {
    installmentOptions,
    formatPrice,
    bestInstallmentText,
    bestInstallment,
    loading,
    config,
  };
}
