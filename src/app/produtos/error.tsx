'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PackageX } from 'lucide-react';

export default function ProdutosError({
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-[#CC1020]/20 flex items-center justify-center">
            <PackageX className="h-10 w-10 text-[#CC1020]" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Erro ao carregar produtos</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Nao foi possivel carregar a lista de produtos no momento.
            Tente novamente ou navegue por outra categoria.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-[#CC1020] hover:bg-[#a80816] text-white"
          >
            Tentar novamente
          </Button>
          <Link href="/">
            <Button variant="outline" className="border-[#CC1020] text-[#CC1020] hover:bg-red-50 w-full sm:w-auto">
              Voltar ao inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
