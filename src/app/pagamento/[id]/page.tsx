'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Smartphone, Barcode } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { buildPixCode, generateQrDataUrl } from '@/lib/pix';

type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
};

type PaymentInfo = {
  method: string;
  qrcode?: string;
  expiresAt?: string;
  linhaDigitavel?: string;
  pdfUrl?: string;
};

const paymentMethods = [
  { id: 'CREDIT_CARD', label: 'Cartão de Crédito', icon: CreditCard },
  { id: 'PIX', label: 'PIX', icon: Smartphone },
  { id: 'BOLETO', label: 'Boleto Bancário', icon: Barcode },
];

export default function PagamentoPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('PIX');
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0); // seconds
  const [expired, setExpired] = useState<boolean>(false);
  const TOTAL_SECONDS = 15 * 60;

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiClient.get<Order>(`/api/user/orders/${params.id}`);
        
        // Verificar se o pedido está pendente
        if (response.data.status !== 'PENDING') {
          toast.error('Este pedido já foi pago ou não pode ser pago');
          router.push('/minha-conta');
          return;
        }
        
        setOrder(response.data);
        // Inicializa contagem: 15 minutos a partir de createdAt
        const created = new Date(response.data.createdAt).getTime();
        const expiresAt = created + 15 * 60 * 1000;
        const now = Date.now();
        const initial = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(initial);
        setExpired(initial <= 0);
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
        toast.error('Erro ao carregar pedido');
        router.push('/minha-conta');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchOrder();
    }
  }, [params.id, router]);

  // Timer de contagem regressiva
  useEffect(() => {
    if (!order) return;
    const interval = setInterval(async () => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          setExpired(true);
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [order]);

  // Ao expirar, recarregar o pedido para refletir cancelamento automático
  useEffect(() => {
    const refreshOnExpire = async () => {
      if (expired && order) {
        try {
          const response = await apiClient.get<Order>(`/api/user/orders/${params.id}`);
          setOrder(response.data);
          toast.error('Tempo de pagamento expirado. Pedido cancelado.');
          // Redirecionar em seguida
          setTimeout(() => router.push('/minha-conta'), 1500);
        } catch {}
      }
    };
    refreshOnExpire();
  }, [expired, order, params.id]);

  const formatMMSS = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  // Gerar QR Code prévio para PIX (simulado) quando método selecionado for PIX
  useEffect(() => {
    const genPix = async () => {
      if (selectedMethod !== 'PIX') {
        setQrDataUrl(null);
        setPixCode('');
        return;
      }
      const code = buildPixCode(order ? Math.round(order.total * 100) : 0);
      setPixCode(code);
      try {
        const dataUrl = await generateQrDataUrl(code, 256);
        setQrDataUrl(dataUrl);
      } catch (e) {
        console.error('Falha ao gerar QR local:', e);
        setQrDataUrl(null);
      }
    };
    genPix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMethod, order?.total]);

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiClient.post<{ payment?: PaymentInfo }>(`/api/orders/${params.id}/payment`, {
        paymentMethod: selectedMethod,
      });

      setPaymentInfo(response.data.payment || null);
      if (response.data.payment?.method === 'PIX' && response.data.payment.qrcode) {
        const dataUrl = await generateQrDataUrl(response.data.payment.qrcode, 256);
        setQrDataUrl(dataUrl);
      } else {
        setQrDataUrl(null);
      }
      toast.success('Pagamento processado com sucesso!');

      // Para cartão confirmamos e encaminhamos direto
      if ((response.data.payment?.method || selectedMethod) === 'CREDIT_CARD') {
        router.push(`/minha-conta/pedidos/${params.id}`);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
        <Footer />
      </>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <button
            onClick={() => router.back()}
            className="flex items-center text-metallic-600 hover:text-metallic-900 mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6 space-y-6"
          >
            {/* Cabeçalho */}
            <div className="border-b border-metallic-200 pb-4">
              <h1 className="text-3xl font-bold text-metallic-900">
                Finalizar Pagamento
              </h1>
              <p className="text-metallic-600 mt-1">
                Pedido {order.orderNumber}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-metallic-700">Tempo para pagar:</span>
                <span className={`px-2 py-1 rounded text-sm font-semibold ${expired ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {expired ? 'Expirado' : formatMMSS(timeLeft)}
                </span>
                {!expired && order && (
                  <span className="text-xs text-metallic-600">
                    Expira às {new Date(new Date(order.createdAt).getTime() + 15 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {!expired && (
                  <div className="w-full mt-2">
                    <div className="h-2 w-full bg-metallic-100 rounded">
                      <div
                        className="h-2 bg-yellow-500 rounded"
                        style={{ width: `${Math.max(0, Math.min(100, (timeLeft / TOTAL_SECONDS) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resumo do Pedido */}
            <div className="bg-metallic-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-metallic-900">
                  Total a Pagar:
                </span>
                <span className="text-2xl font-bold text-primary-600">
                  R$ {order.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Métodos de Pagamento */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-metallic-900">
                Forma de Pagamento
              </h2>

              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full flex items-center gap-4 p-4 border-2 rounded-lg transition-all ${
                        selectedMethod === method.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-metallic-200 hover:border-metallic-300'
                      }`}
                    >
                      <div className={`p-3 rounded-lg ${
                        selectedMethod === method.id
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-metallic-100 text-metallic-600'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-metallic-900">
                          {method.label}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === method.id
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-metallic-300'
                      }`}>
                        {selectedMethod === method.id && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Informações sobre o método selecionado */}
            {selectedMethod === 'PIX' && !paymentInfo && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    ℹ️ QR Code PIX de simulação gerado abaixo. Após clicar em “Pagar Agora”, o pedido será confirmado localmente.
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-metallic-200 p-4">
                  <p className="text-sm font-semibold text-metallic-900 mb-2">QR Code do gateway PIX (simulado)</p>
                  {qrDataUrl ? (
                    <div className="flex justify-center">
                      <img src={qrDataUrl} alt="QR Code PIX" className="w-48 h-48 border rounded-lg bg-white p-2" />
                    </div>
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center border-2 border-dashed rounded-lg text-metallic-500">
                      QR Code do gateway PIX
                    </div>
                  )}
                  <div className="mt-3 bg-metallic-50 border border-metallic-200 rounded-lg p-3">
                    <p className="font-mono text-xs break-all text-metallic-900">{pixCode || 'Código PIX não disponível'}</p>
                  </div>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (pixCode) {
                          navigator.clipboard.writeText(pixCode);
                          toast.success('Código PIX copiado');
                        }
                      }}
                      disabled={expired}
                    >
                      Copiar código PIX
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'BOLETO' && !paymentInfo && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  ℹ️ Vamos gerar um boleto fictício (linha digitável e link). O pagamento é confirmado automaticamente.
                </p>
              </div>
            )}

            {/* Botão de Pagamento */}
            {!paymentInfo && (
              <>
                <Button
                  size="lg"
                  className="w-full h-14 text-lg"
                  onClick={handlePayment}
                  disabled={isProcessing || !selectedMethod || expired}
                >
                  {expired ? 'Prazo expirado' : isProcessing ? 'Processando...' : 'Pagar Agora'}
                </Button>

                <p className="text-xs text-center text-metallic-600">
                  {expired
                    ? 'O prazo de pagamento terminou. O pedido será cancelado.'
                    : 'Ao clicar em "Pagar Agora", você concorda com nossos termos e condições.'}
                </p>
                {expired && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push('/produtos')}
                    >
                      Refazer pedido
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Resultado da simulação de pagamento */}
            {paymentInfo && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-semibold mb-2">Pagamento confirmado localmente.</p>
                  {paymentInfo.method === 'PIX' && (
                    <div className="space-y-3">
                      <p className="text-sm text-green-800">Escaneie o QR Code abaixo ou copie o código para simular o pagamento.</p>
                      {qrDataUrl && (
                        <div className="flex justify-center">
                          <img
                            src={qrDataUrl}
                            alt="QR Code PIX"
                            className="w-48 h-48 border border-green-100 rounded-lg bg-white p-2"
                          />
                        </div>
                      )}
                      <div className="bg-white border border-green-100 rounded-lg p-4">
                        <p className="font-mono text-xs break-all text-green-900">{paymentInfo.qrcode}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (paymentInfo.qrcode) {
                              navigator.clipboard.writeText(paymentInfo.qrcode);
                              toast.success('Código PIX copiado');
                            }
                          }}
                        >
                          Copiar código
                        </Button>
                        {paymentInfo.expiresAt && (
                          <span className="text-xs text-green-900">
                            Expira em: {new Date(paymentInfo.expiresAt).toLocaleTimeString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentInfo.method === 'BOLETO' && (
                    <div className="space-y-3">
                      <p className="text-sm text-green-800">Use a linha digitável abaixo ou faça o download fictício do boleto.</p>
                      <div className="bg-white border border-green-100 rounded-lg p-4">
                        <p className="font-mono text-sm text-green-900 break-all">{paymentInfo.linhaDigitavel}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {paymentInfo.linhaDigitavel && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(paymentInfo.linhaDigitavel as string);
                              toast.success('Linha digitável copiada');
                            }}
                          >
                            Copiar linha digitável
                          </Button>
                        )}
                        {paymentInfo.pdfUrl && (
                          <a
                            href={paymentInfo.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-700 underline"
                          >
                            Abrir boleto (simulado)
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentInfo.method === 'CREDIT_CARD' && (
                    <p className="text-sm text-green-800">Cartão aprovado automaticamente no ambiente local.</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => router.push(`/minha-conta/pedidos/${params.id}`)}
                  >
                    Ver detalhes do pedido
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => router.push('/minha-conta')}
                  >
                    Ir para Meus Pedidos
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
