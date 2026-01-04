'use client';

import { initMercadoPago } from '@mercadopago/sdk-react';
import { useEffect, useState } from 'react';

interface MercadoPagoProviderProps {
  children: React.ReactNode;
}

export function MercadoPagoProvider({ children }: MercadoPagoProviderProps) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
    
    if (publicKey && !initialized) {
      initMercadoPago(publicKey, {
        locale: 'pt-BR',
      });
      setInitialized(true);
    }
  }, [initialized]);

  return <>{children}</>;
}
