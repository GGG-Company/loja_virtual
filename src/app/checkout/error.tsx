'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white rounded-lg shadow p-10">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-[#CC1020]/20 flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-[#CC1020]" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Erro no checkout</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Ocorreu um problema ao processar seu pedido. Seus dados do carrinho
            estao seguros. Tente novamente ou volte ao carrinho.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={reset}
            className="bg-[#CC1020] hover:bg-[#a80816] text-white w-full"
          >
            Tentar novamente
          </Button>
          <Link href="/carrinho">
            <Button variant="outline" className="border-[#CC1020] text-[#CC1020] hover:bg-red-50 w-full">
              Voltar ao carrinho
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="text-gray-500 hover:text-[#CC1020] w-full text-sm">
              Ir para a pagina inicial
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
