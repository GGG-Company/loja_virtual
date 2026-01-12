'use client';

import { initMercadoPago } from '@mercadopago/sdk-react';
import { useEffect, useState, createContext, useContext } from 'react';

const MercadoPagoContext = createContext({ initialized: false });

export const useMercadoPago = () => useContext(MercadoPagoContext);

export function MercadoPagoProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      if (initialized) return;

      let publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
      
      // Se não estiver no ambiente, tenta buscar da API (banco de dados)
      if (!publicKey) {
        try {
          const res = await fetch('/api/payments/mercadopago/public-key');
          if (res.ok) {
            const data = await res.json();
            publicKey = data.publicKey;
          }
        } catch (error) {
          console.error('Erro ao buscar chave pública do Mercado Pago:', error);
        }
      }

      if (publicKey) {
        initMercadoPago(publicKey, {
          locale: 'pt-BR',
        });
        setInitialized(true);
      } else {
        console.warn('Mercado Pago Public Key não encontrada no ambiente nem no banco.');
      }
    }

    init();
  }, [initialized]);

  return (
    <MercadoPagoContext.Provider value={{ initialized }}>
      {children}
    </MercadoPagoContext.Provider>
  );
}
