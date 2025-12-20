'use client';

import { useEffect, useState } from 'react';
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

/**
 * Hook personalizado para cálculo de preços com parcelamento
 * 
 * Features:
 * - Lê configuração financeira do backend
 * - Calcula parcelas com juros
 * - Exibe opções de parcelamento formatadas
 * 
 * Uso:
 * ```tsx
 * const { installmentOptions, formatPrice } = usePrice(product.price);
 * ```
 */
export function usePrice(basePrice: number) {
  const [config, setConfig] = useState<FinancialConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialConfig();
  }, []);

  const fetchFinancialConfig = async () => {
    try {
      const { data } = await apiClient.get('/api/financial/config');
      setConfig(data);
    } catch (error) {
      console.error('Erro ao carregar configuração financeira', error);
      // Fallback
      setConfig({
        creditCardInterestRate: 1.99,
        maxInstallments: 12,
        minInstallmentValue: 50,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateInstallments = (): InstallmentOption[] => {
    if (!config) return [];

    const options: InstallmentOption[] = [];
    const monthlyRate = config.creditCardInterestRate / 100;

    for (let i = 1; i <= config.maxInstallments; i++) {
      let total = basePrice;
      let installmentValue = basePrice / i;

      // Aplicar juros a partir de 3x (exemplo de regra)
      if (i >= 3) {
        // Fórmula de juros compostos: M = C * (1 + i)^n
        total = basePrice * Math.pow(1 + monthlyRate, i);
        installmentValue = total / i;
      }

      // Verificar se parcela é >= valor mínimo
      if (installmentValue < config.minInstallmentValue) {
        break;
      }

      options.push({
        installments: i,
        installmentValue,
        total,
        interestFree: i < 3,
      });
    }

    return options;
  };

  const formatPrice = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const bestInstallmentText = (): string => {
    const options = calculateInstallments();
    if (options.length === 0) return '';

    const best = options[options.length - 1];
    return `${best.installments}x de ${formatPrice(best.installmentValue)} ${
      best.interestFree ? 'sem juros' : 'com juros'
    }`;
  };

  const bestInstallment = (): InstallmentOption | null => {
    const options = calculateInstallments();
    if (options.length === 0) return null;
    return options[options.length - 1];
  };

  return {
    installmentOptions: calculateInstallments(),
    formatPrice,
    bestInstallmentText,
    bestInstallment: bestInstallment(),
    loading,
    config,
  };
}
