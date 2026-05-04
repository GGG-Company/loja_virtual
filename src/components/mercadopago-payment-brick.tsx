'use client';

import logger from "@/lib/logger";
import { Payment } from '@mercadopago/sdk-react';
import { toast } from 'sonner';
import { memo, useCallback, useMemo, useRef } from 'react';
import { useMercadoPago } from './mercadopago-provider';

interface MercadoPagoPaymentBrickProps {
  amount: number;
  orderId: string;
  onPaymentSuccess: (paymentId: string, statusDetail?: string) => void;
  onPaymentError: (error: any) => void;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  maxInstallments?: number;
}

export const MercadoPagoPaymentBrick = memo(function MercadoPagoPaymentBrick({
  amount,
  orderId,
  onPaymentSuccess,
  onPaymentError,
  userEmail,
  userFirstName,
  userLastName,
  maxInstallments = 12,
}: MercadoPagoPaymentBrickProps) {
  const { initialized, publicKey } = useMercadoPago();
  // Flag para evitar toast duplo: onSubmit já tratou o resultado, ignorar onError do SDK
  const submittedRef = useRef(false);

  // Memoizar initialization para evitar re-criação
  // Em sandbox não pré-preenchemos o email — o brick exibe o campo e o usuário
  // pode digitar um test user. Em produção pré-preenchemos para facilitar o fluxo.
  const isSandbox = publicKey ? publicKey.startsWith('TEST-') : false;

  const initialization = useMemo(() => ({
    amount: amount,
    payer: isSandbox ? undefined : {
      email: userEmail,
      firstName: userFirstName,
      lastName: userLastName,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [amount, isSandbox, userEmail, userFirstName, userLastName]);

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
      maxInstallments,
    },
  }), [maxInstallments]);

  const onSubmit = useCallback(async (formData: any) => {
    submittedRef.current = false;
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
        const msg = data.error || 'Erro ao processar pagamento';
        const detail = data.detail ? ` — ${data.detail}` : '';
        throw new Error(process.env.NODE_ENV !== 'production' ? `${msg}${detail}` : msg);
      }

      if (data.status === 'approved') {
        submittedRef.current = true;
        toast.success('Pagamento aprovado!');
        onPaymentSuccess(data.paymentId, data.statusDetail ?? 'approved');
      } else if (data.status === 'pending') {
        submittedRef.current = true;
        if (data.statusDetail === 'sandbox_pending_simulation') {
          toast.info('Pedido recebido! Aguardando confirmação de pagamento.');
        } else {
          toast.info('Pagamento pendente de confirmação');
        }
        onPaymentSuccess(data.paymentId, data.statusDetail);
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
    // Se onSubmit já tratou o resultado (aprovado/pendente), ignorar este callback
    if (submittedRef.current) return;
    logger.error(error, 'Payment Brick Error');
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
