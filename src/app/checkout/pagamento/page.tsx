'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Check, CreditCard, Barcode, Smartphone, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { buildPixCode, generateQrDataUrl } from '@/lib/pix';

export default function CheckoutPagamentoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();

  const orderId = searchParams?.get('orderId');
  const method = searchParams?.get('method') || 'pix';
  const total = searchParams?.get('total') || '';
  const number = searchParams?.get('number') || '';

  const [pixCode, setPixCode] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [expired, setExpired] = useState<boolean>(false);
  const TOTAL_SECONDS = 15 * 60;

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para continuar');
      router.push('/auth/login');
    }
  }, [status, router]);

  // Gerar QR Code PIX simulado baseado no valor e número do pedido
  useEffect(() => {
    const generatePixQr = async () => {
      if (method !== 'pix') {
        setQrDataUrl('');
        setPixCode('');
        return;
      }
      const cents = total ? Math.round(Number(total.replace(',', '.')) * 100) : 0;
      const code = buildPixCode(cents);
      setPixCode(code);
      try {
        const dataUrl = await generateQrDataUrl(code, 256);
        setQrDataUrl(dataUrl);
      } catch (e) {
        console.error('[PIX_QR_GENERATION_ERROR]', e);
        setQrDataUrl('');
      }
    };
    generatePixQr();
  }, [method, total, number]);

  // Buscar createdAt do pedido para contagem regressiva (15min)
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      try {
        const response = await apiClient.get(`/api/user/orders/${orderId}`);
        const created = new Date(response.data.createdAt).getTime();
        const expiresAt = created + 15 * 60 * 1000;
        const now = Date.now();
        const initial = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(initial);
        setExpired(initial <= 0);
      } catch (e) {
        console.error('Erro ao buscar pedido:', e);
      }
    };
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || timeLeft <= 0) return;
    const interval = setInterval(() => {
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
  }, [orderId, timeLeft]);

  const formatMMSS = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  useEffect(() => {
    if (expired) {
      toast.error('Tempo de pagamento expirado. Pedido cancelado.');
      setTimeout(() => router.push('/minha-conta'), 1500);
    }
  }, [expired, router]);

  if (status === 'loading') {
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

  if (!orderId) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="bg-white shadow rounded-lg p-6 text-center space-y-3">
            <p className="font-semibold">Pedido não encontrado.</p>
            <Button onClick={() => router.push('/')}>Voltar</Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pedido</p>
                <h1 className="text-2xl font-bold">{number || orderId}</h1>
              </div>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold flex items-center gap-2">
                <Check className="h-4 w-4" /> Criado
              </span>
            </div>

            <div className="bg-metallic-50 border border-metallic-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor</p>
                <p className="text-2xl font-bold text-primary-700">R$ {total || '0,00'}</p>
              </div>
              <div className="text-sm text-gray-600 text-right">
                <p>Método selecionado</p>
                <p className="font-semibold uppercase">{method}</p>
                <div className="mt-2">
                  <span className="text-xs text-gray-600">Tempo para pagar: </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${expired ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {expired ? 'Expirado' : formatMMSS(timeLeft)}
                  </span>
                  {!expired && (
                    <span className="ml-2 text-xs text-gray-600">
                      Expira às {timeLeft ? new Date(Date.now() + timeLeft * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  )}
                  {!expired && (
                    <div className="mt-2">
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
            </div>

            {method === 'pix' && (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary-100 text-primary-700">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold">PIX</p>
                    <p className="text-sm text-gray-600">Aqui entra o QR Code / copia e cola do gateway.</p>
                    {qrDataUrl ? (
                      <div className="flex justify-center">
                        <img src={qrDataUrl} alt="QR Code PIX" className="w-48 h-48 border rounded-lg bg-white p-2" />
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-metallic-100 border border-dashed border-metallic-300 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                        QR Code do gateway PIX
                      </div>
                    )}
                    <div className="bg-metallic-100 border border-metallic-300 rounded-lg p-3 text-xs font-mono break-all">
                      {pixCode || 'Código PIX não disponível'}
                    </div>
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

            {method === 'boleto' && (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary-100 text-primary-700">
                    <Barcode className="h-5 w-5" />
                  </div>
                  <div className="space-y-2 w-full">
                    <p className="font-semibold">Boleto Bancário</p>
                    <p className="text-sm text-gray-600">Linha digitável e PDF gerados pelo gateway entram aqui.</p>
                    <div className="w-full bg-metallic-100 border border-dashed border-metallic-300 rounded-lg p-3 text-sm text-gray-600">
                      00000.00000 00000.000000 00000.000000 0 00000000000000
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline">Copiar linha digitável</Button>
                      <Button variant="outline">Baixar PDF</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {method === 'cartao' && (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary-100 text-primary-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="space-y-2 w-full">
                    <p className="font-semibold">Cartão de Crédito</p>
                    <p className="text-sm text-gray-600">Aqui você conecta o redirect ou iframe do gateway.</p>
                    <div className="w-full h-32 bg-metallic-100 border border-dashed border-metallic-300 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                      Placeholder do checkout do gateway
                    </div>
                    <Button className="w-full">Pagar no gateway</Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => router.push('/')}>Voltar para a loja</Button>
              <div className="flex gap-2">
                {expired && (
                  <Button variant="outline" onClick={() => router.push('/produtos')}>Refazer pedido</Button>
                )}
                <Button onClick={() => router.push('/admin/orders')} disabled={expired}>Ver no Admin</Button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
