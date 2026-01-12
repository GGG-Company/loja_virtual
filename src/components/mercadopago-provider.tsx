'use client';

import { initMercadoPago } from '@mercadopago/sdk-react';
import { useEffect, useState, createContext, useContext, useRef } from 'react';

const MercadoPagoContext = createContext({ initialized: false });

export const useMercadoPago = () => useContext(MercadoPagoContext);

export function MercadoPagoProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const initStarted = useRef(false);

  useEffect(() => {
    if (initialized) return;
    if (initStarted.current) return;
    initStarted.current = true;

    async function init() {
      console.log('[MercadoPago] Verificando configuração...');

      let publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
      
      // Limpeza se vier como string literal inválida do build
      if (publicKey === 'undefined' || publicKey === 'null' || !publicKey) {
        publicKey = undefined;
      }

      // Se não estiver no ambiente browser, tenta buscar da API (banco de dados)
      if (!publicKey) {
        console.log('[MercadoPago] Buscando chave na API do servidor...');
        try {
          const res = await fetch('/api/payments/mercadopago/public-key', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            publicKey = data.publicKey;
          } else {
            console.error('[MercadoPago] API falhou:', res.status);
          }
        } catch (error) {
          console.error('[MercadoPago] Erro fetch API:', error);
        }
      }

      if (publicKey) {
        // Limpar aspas se existirem
        const cleanKey = publicKey.replace(/['"]/g, '').trim();
        console.log('[MercadoPago] Inicializando com chave:', '***' + cleanKey.slice(-5));
        
        try {
          initMercadoPago(cleanKey, { locale: 'pt-BR' });
          console.log('[MercadoPago] SDK inicializado.');
          setInitialized(true);
        } catch (e) {
          console.error('[MercadoPago] Erro initMercadoPago:', e);
          initStarted.current = false;
        }
      } else {
        console.warn('[MercadoPago] Nenhuma chave pública encontrada.');
        initStarted.current = false;
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
