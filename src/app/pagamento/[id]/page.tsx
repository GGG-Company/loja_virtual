'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Smartphone, Barcode, Copy, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import Image from "next/image";
import { MercadoPagoProvider } from '@/components/mercadopago-provider';
import { MercadoPagoPaymentBrick } from '@/components/mercadopago-payment-brick';

type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  paymentMethod?: string | null;
  installments?: number | null;
  shippingAddress?: {
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
  } | null;
};

const paymentMethodInfo: Record<string, { label: string; Icon: React.ElementType; description: string }> = {
  PIX:         { label: "PIX",               Icon: Smartphone, description: "Aprovação imediata" },
  CREDIT_CARD: { label: "Cartão de Crédito", Icon: CreditCard, description: "Em até 12x" },
  BOLETO:      { label: "Boleto Bancário",   Icon: Barcode,    description: "Vence em 3 dias úteis" },
};

export default function PagamentoPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string>("PIX");

  // PIX
  const [pixQrCode, setPixQrCode] = useState("");
  const [pixQrBase64, setPixQrBase64] = useState("");
  const [pixLoading, setPixLoading] = useState(false);
  const [pixGenerated, setPixGenerated] = useState(false);

  // Boleto
  const [boletoUrl, setBoletoUrl] = useState("");
  const [boletoBarcode, setBoletoBarcode] = useState("");
  const [boletoLoading, setBoletoLoading] = useState(false);
  const [boletoGenerated, setBoletoGenerated] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiClient.get<Order>(`/api/user/orders/${params.id}`);
        if (response.data.status !== "PENDING") {
          toast.error("Este pedido já foi pago ou não pode ser pago");
          router.push("/minha-conta");
          return;
        }
        setOrder(response.data);

        // Usar o método de pagamento escolhido no checkout como padrão
        const pm = response.data.paymentMethod;
        if (pm === 'pix' || pm === 'PIX') setSelectedMethod('PIX');
        else if (pm === 'cartao' || pm === 'CREDIT_CARD') setSelectedMethod('CREDIT_CARD');
        else if (pm === 'boleto' || pm === 'BOLETO') setSelectedMethod('BOLETO');
      } catch {
        toast.error("Erro ao carregar pedido");
        router.push("/minha-conta");
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) fetchOrder();
  }, [params.id, router]);


  const handleGeneratePix = async () => {
    if (!order) return;
    setPixLoading(true);
    try {
      const addr = order.shippingAddress || {};
      const response = await fetch('/api/payments/mercadopago/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total,
          userEmail: addr.email || '',
          userName: addr.name || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar PIX');
      setPixQrCode(data.qrCode || '');
      setPixQrBase64(data.qrCodeBase64 ? `data:image/png;base64,${data.qrCodeBase64}` : '');
      clearCart();
      setPixGenerated(true);
      toast.success('PIX gerado! Escaneie o QR code para pagar.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar PIX');
    } finally {
      setPixLoading(false);
    }
  };

  const handleGenerateBoleto = async () => {
    if (!order) return;
    setBoletoLoading(true);
    try {
      const addr = order.shippingAddress || {};
      const response = await fetch('/api/payments/mercadopago/boleto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total,
          userEmail: addr.email || '',
          userName: addr.name || '',
          userCpf: addr.cpf || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar Boleto');
      setBoletoUrl(data.boletoUrl || '');
      setBoletoBarcode(data.barcode || '');
      clearCart();
      setBoletoGenerated(true);
      toast.success('Boleto gerado! Pague até a data de vencimento.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar Boleto');
    } finally {
      setBoletoLoading(false);
    }
  };

  const handleCardSuccess = (_paymentId: string, statusDetail?: string) => {
    clearCart();
    if (statusDetail === 'approved' || statusDetail === 'sandbox_auto_approved') {
      router.push(`/pagamento/sucesso?orderId=${params.id}`);
    } else {
      // pending — vai direto para o pedido
      router.push(`/minha-conta/pedidos/${params.id}`);
    }
  };

  const handleCardError = (_error: any) => {
    toast.error('Pagamento recusado. Verifique os dados e tente novamente.');
  };

  const clearCart = () => {
    localStorage.removeItem('cart');
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
        <Footer />
      </>
    );
  }

  if (!order) return null;

  return (
    <MercadoPagoProvider>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-xl">
          <button onClick={() => router.push('/checkout')} className="flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao checkout
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Cabeçalho */}
            <div className="bg-primary-600 text-white p-6">
              <h1 className="text-2xl font-bold">Finalizar Pagamento</h1>
              <p className="text-primary-100 text-sm mt-1">Pedido {order.orderNumber}</p>
              <p className="text-3xl font-bold mt-3">
                R$ {Number(order.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Método escolhido no checkout */}
              {(() => {
                const info = paymentMethodInfo[selectedMethod];
                if (!info) return null;
                const Icon = info.Icon;
                return (
                  <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary-600 bg-primary-50">
                    <Icon className="h-5 w-5 text-primary-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-primary-700">{info.label}</p>
                      <p className="text-xs text-gray-500">{info.description}</p>
                    </div>
                  </div>
                );
              })()}

              {/* PIX */}
              {selectedMethod === 'PIX' && (
                <div className="space-y-4">
                  {!pixGenerated ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        Após gerar o QR code, abra o app do seu banco e escaneie para pagar. A confirmação é instantânea.
                      </div>
                      <Button className="w-full h-12" onClick={handleGeneratePix} disabled={pixLoading}>
                        {pixLoading ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                        <Clock className="h-4 w-4 shrink-0" />
                        Aguardando pagamento. O pedido é confirmado automaticamente ao pagar.
                      </div>

                      {pixQrBase64 ? (
                        <div className="flex justify-center">
                          <Image src={pixQrBase64} alt="QR Code PIX" width={200} height={200} className="border rounded-lg bg-white p-2" />
                        </div>
                      ) : (
                        <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg text-gray-400 text-sm">
                          QR Code indisponível — use o código abaixo
                        </div>
                      )}

                      {pixQrCode && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Código PIX copia e cola</p>
                          <div className="bg-gray-50 rounded-lg p-3 border">
                            <p className="font-mono text-xs break-all text-gray-700 leading-relaxed">{pixQrCode}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 gap-2"
                            onClick={() => copyToClipboard(pixQrCode, 'Código PIX')}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar código
                          </Button>
                        </div>
                      )}

                      <Button variant="outline" className="w-full" onClick={() => router.push('/minha-conta')}>
                        Ver meus pedidos
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Boleto */}
              {selectedMethod === 'BOLETO' && (
                <div className="space-y-4">
                  {!boletoGenerated ? (
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                        O boleto vence em 3 dias úteis. Após o pagamento, a confirmação pode levar até 3 dias úteis.
                      </div>
                      <Button className="w-full h-12" onClick={handleGenerateBoleto} disabled={boletoLoading}>
                        {boletoLoading ? 'Gerando Boleto...' : 'Gerar Boleto'}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Boleto gerado! Pague antes do vencimento.
                      </div>

                      {boletoBarcode && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Código de barras</p>
                          <div className="bg-gray-50 rounded-lg p-3 border">
                            <p className="font-mono text-xs break-all text-gray-700 leading-relaxed">{boletoBarcode}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 gap-2"
                            onClick={() => copyToClipboard(boletoBarcode, 'Código de barras')}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar código
                          </Button>
                        </div>
                      )}

                      {boletoUrl && (
                        <a
                          href={boletoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full h-10 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Abrir / Imprimir Boleto
                        </a>
                      )}

                      <Button variant="outline" className="w-full" onClick={() => router.push('/minha-conta')}>
                        Ver meus pedidos
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Cartão — Payment Brick do Mercado Pago */}
              {selectedMethod === 'CREDIT_CARD' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    Seus dados de cartão são processados com segurança pelo Mercado Pago.
                  </div>
                  <MercadoPagoPaymentBrick
                    amount={order.total}
                    orderId={order.id}
                    onPaymentSuccess={handleCardSuccess}
                    onPaymentError={handleCardError}
                    userEmail={order.shippingAddress?.email || ''}
                    userFirstName={order.shippingAddress?.name?.split(' ')[0] || ''}
                    userLastName={order.shippingAddress?.name?.split(' ').slice(1).join(' ') || ''}
                    maxInstallments={order.installments || 12}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </MercadoPagoProvider>
  );
}
