'use client';

import { initMercadoPago } from '@mercadopago/sdk-react';
import { useEffect, useState, createContext, useContext } from 'react';

const MercadoPagoContext = createContext({ initialized: false });

export const useMercadoPago = () => useContext(MercadoPagoContext);

export function MercadoPagoProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const publicKey = (process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || '')
      .replace(/['"]/g, '')
      .trim();

    if (publicKey && publicKey.length > 10) {
      try {
        initMercadoPago(publicKey, { locale: 'pt-BR' });
        setInitialized(true);
      } catch {
        // will retry on next render if initialized stays false
      }
      return;
    }

    // Fallback: busca da API do servidor
    fetch('/api/payments/mercadopago/public-key', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const key = data?.publicKey?.replace(/['"]/g, '').trim();
        if (key && key.length > 10) {
          initMercadoPago(key, { locale: 'pt-BR' });
          setInitialized(true);
        }
      })
      .catch(() => {});
  }, [initialized]);

  return (
    <MercadoPagoContext.Provider value={{ initialized }}>
      {children}
    </MercadoPagoContext.Provider>
  );
}
