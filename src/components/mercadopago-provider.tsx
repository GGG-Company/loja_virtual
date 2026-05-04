'use client';

import { initMercadoPago } from '@mercadopago/sdk-react';
import { useEffect, useState, createContext, useContext } from 'react';

const MP_KEY_STORAGE = 'mp_sdk_public_key';

const MercadoPagoContext = createContext({ initialized: false, publicKey: '' });

export const useMercadoPago = () => useContext(MercadoPagoContext);

export function MercadoPagoProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    fetch('/api/payments/mercadopago/public-key', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const key = data?.publicKey?.replace(/['"]/g, '').trim();
        if (!key || key.length < 10) return;

        // Se o browser já inicializou o SDK com uma chave diferente,
        // limpar e recarregar para garantir que o brick use a chave correta.
        const storedKey = localStorage.getItem(MP_KEY_STORAGE);
        if (storedKey && storedKey !== key) {
          console.warn('[MP] Public key alterada — recarregando página para reinicializar SDK');
          localStorage.setItem(MP_KEY_STORAGE, key);
          window.location.reload();
          return;
        }

        localStorage.setItem(MP_KEY_STORAGE, key);

        try {
          initMercadoPago(key, { locale: 'pt-BR' });
        } catch {
          // SDK já inicializado — ok
        }

        setPublicKey(key);
        setInitialized(true);
      })
      .catch(() => {});
  }, []);

  return (
    <MercadoPagoContext.Provider value={{ initialized, publicKey }}>
      {children}
    </MercadoPagoContext.Provider>
  );
}

