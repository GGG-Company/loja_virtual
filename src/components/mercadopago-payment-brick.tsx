'use client';

import logger from "@/lib/logger";
import { Payment } from '@mercadopago/sdk-react';
import { toast } from 'sonner';
import { memo, useCallback, useMemo } from 'react';
import { useMercadoPago } from './mercadopago-provider';

interface MercadoPagoPaymentBrickProps {
  amount: number;
  orderId: string;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: any) => void;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
}

export const MercadoPagoPaymentBrick = memo(function MercadoPagoPaymentBrick({
  amount,
  orderId,
  onPaymentSuccess,
  onPaymentError,
  userEmail,
  userFirstName,
  userLastName,
}: MercadoPagoPaymentBrickProps) {
  const { initialized } = useMercadoPago();

  // Memoizar initialization para evitar re-criação
  const initialization = useMemo(() => ({
    amount: amount,
    payer: {
      email: userEmail,
      firstName: userFirstName,
      lastName: userLastName,
    },
  }), [amount, userEmail, userFirstName, userLastName]);

  // Memoizar customization - APENAS CARTÃO (CRÉDITO/DÉBITO)
  const customization = useMemo(() => ({
    visual: {
      style: {
        theme: 'default' as const,
      },
    },
    paymentMethods: {
      creditCard: 'all' as const,
      debitCard: 'all' as const,
      maxInstallments: 12,
    },
  }), []);

  const onSubmit = useCallback(async (formData: any) => {
    try {
      // Enviar para sua API processar o pagamento
      const response = await fetch('/api/payments/mercadopago/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
          orderId,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      if (data.status === 'approved') {
        toast.success('Pagamento aprovado!');
        onPaymentSuccess(data.paymentId);
      } else if (data.status === 'pending') {
        toast.info('Pagamento pendente de confirmação');
        onPaymentSuccess(data.paymentId);
      } else {
        toast.error('Pagamento recusado');
        onPaymentError(data);
      }
    } catch (error: any) {
      logger.error(error, 'Erro ao processar pagamento');
      toast.error(error.message || 'Erro ao processar pagamento');
      onPaymentError(error);
    }
  }, [orderId, amount, onPaymentSuccess, onPaymentError]);

  const onError = useCallback(async (error: any) => {
    logger.error(error, 'Payment Brick Error');
    // Tenta extrair mensagem amigável
    const msg = error?.message || (typeof error === 'string' ? error : 'Erro desconhecido no Checkout');
    toast.error(`Erro ao carregar checkout: ${msg}`);
    onPaymentError(error);
  }, [onPaymentError]);

  const onReady = useCallback(async () => {
    // Quando o brick estiver pronto
    logger.info('Payment Brick carregado');
  }, []);

  if (!initialized) {
    return (
      <div className="w-full h-48 bg-metallic-100 animate-pulse rounded-lg flex items-center justify-center">
        <p className="text-sm text-gray-500">Inicializando Mercado Pago...</p>
      </div>
    );
  }

  return (
    <div className="mercadopago-payment-card-only">
      <style>{`
        /* Oculta opções de PIX e Boleto */
        .mercadopago-payment-card-only [data-testid*="pix"],
        .mercadopago-payment-card-only [data-testid*="ticket"],
        .mercadopago-payment-card-only [data-testid*="bank_transfer"],
        .mercadopago-payment-card-only button[value*="pix"],
        .mercadopago-payment-card-only button[value*="ticket"],
        .mercadopago-payment-card-only label:has(input[value*="pix"]),
        .mercadopago-payment-card-only label:has(input[value*="ticket"]) {
          display: none !important;
        }
      `}</style>
      <Payment
        initialization={initialization}
        onSubmit={onSubmit}
        onReady={onReady}
        onError={onError}
        customization={customization}
      />
    </div>
  );
});
