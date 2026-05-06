'use client';

import { initMercadoPago } from '@mercadopago/sdk-react';
import { useEffect, useState, createContext, useContext } from 'react';

// Chave usada na inicialização atual do SDK (vive apenas na sessão da página)
let _initializedKey = '';

const MercadoPagoContext = createContext({ initialized: false, publicKey: '' });

export const useMercadoPago = () => useContext(MercadoPagoContext);

export function MercadoPagoProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    // Limpa chave antiga do localStorage para evitar problemas de cache entre sessões
    try { localStorage.removeItem('mp_sdk_public_key'); } catch { /* ok */ }

    fetch('/api/payments/mercadopago/public-key', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const key = data?.publicKey?.replace(/['"]/g, '').trim();
        if (!key || key.length < 10) return;

        // Se o SDK já foi inicializado com outra chave nesta sessão, recarregar
        if (_initializedKey && _initializedKey !== key) {
          console.warn('[MP] Public key alterada — recarregando para reinicializar SDK');
          _initializedKey = key;
          window.location.reload();
          return;
        }

        if (!_initializedKey) {
          initMercadoPago(key, { locale: 'pt-BR' });
          _initializedKey = key;
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

