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
      console.log('[MercadoPago] Validando credenciais...');

      // 1. Tenta pegar do ambiente (apenas se foi definido no build)
      let publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
      
      // Limpeza de valores "falsos" que o build do Next.js pode injetar
      if (!publicKey || publicKey === 'undefined' || publicKey === 'null' || publicKey.length < 10) {
        publicKey = undefined;
      }

      // 2. Se falhar, busca na API do servidor (que pega do Banco de Dados ou .env real do servidor)
      if (!publicKey) {
        console.log('[MercadoPago] Buscando chave dinâmica do servidor...');
        try {
          const res = await fetch('/api/payments/mercadopago/public-key', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            publicKey = data.publicKey;
          }
        } catch (error) {
          console.error('[MercadoPago] Erro ao buscar chave da API:', error);
        }
      }

      // 3. Inicializa se tiver uma chave válida
      if (publicKey && publicKey.length > 10) {
        const cleanKey = publicKey.replace(/['"]/g, '').trim();
        console.log('[MercadoPago] Inicializando com:', cleanKey.startsWith('TEST') ? 'Ambiente de TESTE' : 'Ambiente de PRODUÇÃO');
        
        try {
          initMercadoPago(cleanKey, { locale: 'pt-BR' });
          setInitialized(true);
          console.log('[MercadoPago] SDK Pronto.');
        } catch (e) {
          console.error('[MercadoPago] Falha no initMercadoPago:', e);
          initStarted.current = false;
        }
      } else {
        console.error('[MercadoPago] Nenhuma chave válida encontrada. O checkout não carregará.');
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
