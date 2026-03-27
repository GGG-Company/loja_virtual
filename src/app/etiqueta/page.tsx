'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Suspense } from 'react';

interface LabelData {
  orderId: string;
  orderNumber: string;
  labelUrl: string;
  trackingCode?: string;
  trackingUrl?: string;
}

function LabelContent() {
  const searchParams = useSearchParams();
  const [labelData, setLabelData] = useState<LabelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const labelUrl = searchParams.get('labelUrl');
    const orderNumber = searchParams.get('orderNumber');
    const trackingCode = searchParams.get('trackingCode');
    const trackingUrl = searchParams.get('trackingUrl');

    if (labelUrl && orderNumber && orderId) {
      setLabelData({
        orderId,
        orderNumber,
        labelUrl,
        trackingCode: trackingCode || undefined,
        trackingUrl: trackingUrl || undefined,
      });
    }
    setLoading(false);
  }, [searchParams]);

  const downloadLabel = () => {
    if (labelData?.labelUrl) {
      const link = document.createElement('a');
      link.href = labelData.labelUrl;
      link.target = '_blank';
      link.download = `etiqueta-${labelData.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Baixando etiqueta...');
    }
  };

  const printLabel = () => {
    if (labelData?.labelUrl) {
      window.open(labelData.labelUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!labelData) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Etiqueta não encontrada</h1>
            <p className="text-gray-600 mb-6">
              Parece que há um problema ao acessar a etiqueta. Verifique o link ou tente novamente.
            </p>
            <Link href="/minha-conta/pedidos">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar aos pedidos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <Link href="/minha-conta/pedidos" className="inline-block mb-6">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos pedidos
          </Button>
        </Link>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Etiqueta de Envio Pronta!</h1>
            <p className="text-gray-600">
              Seu pedido <span className="font-bold">{labelData.orderNumber}</span> já está sendo preparado para entrega.
            </p>
          </div>

          {/* Tracking Info */}
          {labelData.trackingCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-600 font-medium">Código de Rastreamento</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                {labelData.trackingCode}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Use este código para acompanhar seu pedido no site da transportadora
              </p>
              {labelData.trackingUrl && (
                <a
                  href={labelData.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-3 inline-block"
                >
                  Acompanhar entrega →
                </a>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-900 mb-2">O que fazer agora?</h3>
            <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
              <li>Imprima ou baixe a etiqueta de envio</li>
              <li>Cole a etiqueta no pacote de forma visível</li>
              <li>Deixe o pacote em local seguro para coleta pela transportadora</li>
              <li>Acompanhe seu pedido pelo código de rastreamento</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={printLabel}
              className="flex-1"
              size="lg"
            >
              <Printer className="h-5 w-5 mr-2" />
              Imprimir Etiqueta
            </Button>
            <Button
              onClick={downloadLabel}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Baixar PDF
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Informações do Pedido</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Número do Pedido</p>
                <p className="font-bold text-gray-900">{labelData.orderNumber}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="font-bold text-green-600">Saiu para Entrega</p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Dúvidas Frequentes</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-gray-900">Como rastrear meu pedido?</p>
                <p className="text-gray-600 mt-1">
                  Use o código de rastreamento acima no site da transportadora ou clique em "Acompanhar entrega".
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Quanto tempo levará para chegar?</p>
                <p className="text-gray-600 mt-1">
                  O prazo de entrega foi estimado no momento da compra. Consulte os detalhes do pedido para mais informações.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900">E se a etiqueta não imprimir?</p>
                <p className="text-gray-600 mt-1">
                  Tente novamente ou entre em contato com nosso suporte. Você também pode acessar a etiqueta pelo seu pedido em "Minha Conta".
                </p>
              </div>
            </div>
          </div>
        </div>

        <Link href="/minha-conta/pedidos" className="block mt-6">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos pedidos
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function LabelPage() {
  return (
    <Suspense fallback={<div>Carregando etiqueta...</div>}>
      <LabelContent />
    </Suspense>
  );
}
