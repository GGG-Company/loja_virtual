'use client';

import { initMercadoPago } from '@mercadopago/sdk-react';
import { useEffect, useState, createContext, useContext, useRef } from 'react';

const MercadoPagoContext = createContext({ initialized: false });

export const useMercadoPago = () => useContext(MercadoPagoContext);

export function MercadoPagoProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const initStarted = useRef(false);

  useEffect(() => {
    // Se já foi inicializado com sucesso, não faz nada
    if (initialized) return;
    
    // Evita múltiplas tentativas simultâneas
    if (initStarted.current) return;
    initStarted.current = true;

    async function init() {
      // 1. Tenta pegar do ambiente (apenas se foi definido no build)
      let publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
      
      // Limpeza de valores "falsos" que o build do Next.js pode injetar
      if (!publicKey || publicKey === 'undefined' || publicKey === 'null' || publicKey.length < 10) {
        publicKey = undefined;
      }

      // 2. Se falhar, busca na API do servidor (que pega do Banco de Dados ou .env real do servidor)
      if (!publicKey) {
        try {
          const res = await fetch('/api/payments/mercadopago/public-key', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            publicKey = data.publicKey;
          }
        } catch (error) {
          // Mantém apenas erros críticos em log silenciado ou opcional
        }
      }

      // 3. Inicializa se tiver uma chave válida
      if (publicKey && publicKey.length > 10) {
        const cleanKey = publicKey.replace(/['"]/g, '').trim();
        
        try {
          initMercadoPago(cleanKey, { locale: 'pt-BR' });
          setInitialized(true);
        } catch (e) {
          initStarted.current = false;
        }
      } else {
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
