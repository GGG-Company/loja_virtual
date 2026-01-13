'use client';

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Check, CreditCard, Barcode, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { MercadoPagoProvider } from '@/components/mercadopago-provider';
import { MercadoPagoPaymentBrick } from '@/components/mercadopago-payment-brick';
import Image from "next/image";

function CheckoutPagamentoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const orderId = searchParams?.get("orderId");
  const method = searchParams?.get("method") || "pix";
  const total = searchParams?.get("total") || "";
  const number = searchParams?.get("number") || "";

  const [pixCode, setPixCode] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [boletoUrl, setBoletoUrl] = useState<string>("");
  const [boletoBarcode, setBoletoBarcode] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [expired, setExpired] = useState<boolean>(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const TOTAL_SECONDS = 30;

  // Memoizar dados do usuário para evitar re-renderizações
  const userEmail = useMemo(() => session?.user?.email || "", [session?.user?.email]);
  const userFirstName = useMemo(() => session?.user?.name?.split(" ")[0] || "Cliente", [session?.user?.name]);
  const userLastName = useMemo(() => session?.user?.name?.split(" ").slice(1).join(" ") || "Azura", [session?.user?.name]);

  const amountNumber = useMemo(() => {
    if (!total) return 0;
    // Remove qualquer caractere que não seja número, ponto ou vírgula
    const cleaned = total.replace(/[^\d.,]/g, "");
    let val = 0;

    // Se tiver vírgula e ponto (ex: 1.409,11), remove o ponto e troca vírgula por ponto
    if (cleaned.includes(".") && cleaned.includes(",")) {
      val = Number(cleaned.replace(/\./g, "").replace(",", "."));
    }
    // Se tiver apenas vírgula (ex: 1409,11), troca por ponto
    else if (cleaned.includes(",")) {
      val = Number(cleaned.replace(",", "."));
    }
    // Se tiver apenas ponto ou for número puro
    else {
      val = Number(cleaned);
    }

    // Arredondar para 2 casas decimais (essencial para o Mercado Pago)
    const finalVal = Math.max(0, Math.round(val * 100) / 100);
    return finalVal;
  }, [total]);

  // Callbacks estáveis
  const handlePaymentSuccess = useCallback(
    (paymentId: string) => {
      toast.success("Pagamento aprovado!");
      setTimeout(() => {
        router.push(`/checkout/confirmacao?orderId=${orderId}&paymentId=${paymentId}`);
      }, 1500);
    },
    [orderId, router]
  );

  const handlePaymentError = useCallback((error: any) => {
    console.error("Erro no pagamento:", error);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Faça login para continuar");
      router.push("/auth/login");
    }
  }, [status, router]);

  // Gerar PIX via Mercado Pago
  useEffect(() => {
    const generatePixMercadoPago = async () => {
      if (method !== "pix" || !orderId) return;

      setLoadingPayment(true);
      try {
        const response = await fetch("/api/payments/mercadopago/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            amount: amountNumber,
            userEmail: session?.user?.email,
            userName: session?.user?.name,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setPixCode(data.qrCode || "");
          setQrDataUrl(data.qrCodeBase64 ? `data:image/png;base64,${data.qrCodeBase64}` : "");
        } else {
          toast.error(data.error || "Erro ao gerar PIX");
        }
      } catch (error) {
        console.error("Erro ao gerar PIX:", error);
        toast.error("Erro ao gerar PIX");
      } finally {
        setLoadingPayment(false);
      }
    };

    generatePixMercadoPago();
  }, [method, orderId, amountNumber, session]);

  // Gerar Boleto via Mercado Pago
  useEffect(() => {
    const generateBoletoMercadoPago = async () => {
      if (method !== "boleto" || !orderId) return;

      setLoadingPayment(true);
      try {
        const response = await fetch("/api/payments/mercadopago/boleto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            amount: amountNumber,
            userEmail: session?.user?.email,
            userName: session?.user?.name,
            userCpf: session?.user?.cpf || "12345678909",
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setBoletoUrl(data.boletoUrl || "");
          setBoletoBarcode(data.barcode || "");
        } else {
          toast.error(data.error || "Erro ao gerar Boleto");
        }
      } catch (error) {
        console.error("Erro ao gerar Boleto:", error);
        toast.error("Erro ao gerar Boleto");
      } finally {
        setLoadingPayment(false);
      }
    };

    generateBoletoMercadoPago();
  }, [method, orderId, amountNumber, session]);

  // Buscar createdAt do pedido para contagem regressiva (1 minuto)
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      try {
        const response = await apiClient.get(`/api/user/orders/${orderId}`);
        const created = new Date(response.data.createdAt).getTime();
        const expiresAt = created + 120 * 1000; // 2 minutos
        const now = Date.now();
        const initial = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(initial);
        setExpired(initial <= 0);
      } catch (e) {
        console.error("Erro ao buscar pedido:", e);
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
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${ss}`;
  };

  useEffect(() => {
    if (expired) {
      toast.error("Tempo de pagamento expirado. Pedido cancelado.");
      setTimeout(() => router.push("/minha-conta"), 1500);
    }
  }, [expired, router]);

  if (status === "loading") {
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
            <Button onClick={() => router.push("/")}>Voltar</Button>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow p-8 space-y-6">
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
                <p className="text-2xl font-bold text-primary-700">R$ {total || "0,00"}</p>
              </div>
              <div className="text-sm text-gray-600 text-right">
                <p>Método selecionado</p>
                <p className="font-semibold uppercase">{method}</p>
                <div className="mt-2">
                  <span className="text-xs text-gray-600">Tempo para pagar: </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${expired ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{expired ? "Expirado" : formatMMSS(timeLeft)}</span>
                  {!expired && <span className="ml-2 text-xs text-gray-600">Expira às {timeLeft ? new Date(Date.now() + timeLeft * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>}
                  {!expired && (
                    <div className="mt-2">
                      <div className="h-2 w-full bg-metallic-100 rounded">
                        <div className="h-2 bg-yellow-500 rounded" style={{ width: `${Math.max(0, Math.min(100, (timeLeft / TOTAL_SECONDS) * 100))}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {method === "pix" && (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary-100 text-primary-700">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="space-y-2 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">PIX</p>
                      <span className="text-xs text-gray-500">via</span>
                      <Image src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/5.21.11/mercadopago/logo__large@2x.png" alt="Mercado Pago" width={80} height={20} className="h-5" />
                    </div>
                    <p className="text-sm text-gray-600">{loadingPayment ? "Gerando QR Code PIX..." : "Escaneie o QR Code ou copie o código PIX."}</p>
                    {loadingPayment ? (
                      <div className="w-full h-48 bg-metallic-100 border border-metallic-300 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      </div>
                    ) : qrDataUrl ? (
                      <div className="flex justify-center">
                        <div className="w-64 h-64 border rounded-lg bg-white p-2">
                          <Image src={qrDataUrl} alt="QR Code PIX" width={256} height={256} className="w-64 h-64 object-contain" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-red-50 border border-red-300 rounded-lg flex items-center justify-center text-red-600 text-sm">Erro ao gerar QR Code PIX</div>
                    )}
                    {pixCode && (
                      <>
                        <div className="bg-metallic-100 border border-metallic-300 rounded-lg p-3 text-xs font-mono break-all max-h-32 overflow-y-auto">{pixCode}</div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            navigator.clipboard.writeText(pixCode);
                            toast.success("Código PIX copiado!");
                          }}
                          disabled={expired || loadingPayment}
                        >
                          Copiar código PIX
                        </Button>
                        <p className="text-xs text-gray-500 text-center">Pagamento identificado automaticamente. Após pagar, aguarde a confirmação.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {method === "boleto" && (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary-100 text-primary-700">
                    <Barcode className="h-5 w-5" />
                  </div>
                  <div className="space-y-2 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">Boleto Bancário</p>
                      <span className="text-xs text-gray-500">via</span>
                      <Image src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/5.21.11/mercadopago/logo__large@2x.png" alt="Mercado Pago" width={80} height={20} className="h-5" />
                    </div>
                    <p className="text-sm text-gray-600">{loadingPayment ? "Gerando boleto..." : "Pague até o vencimento (3 dias úteis)."}</p>
                    {loadingPayment ? (
                      <div className="w-full h-32 bg-metallic-100 border border-metallic-300 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      </div>
                    ) : boletoBarcode ? (
                      <>
                        <div className="w-full bg-metallic-100 border border-metallic-300 rounded-lg p-3 text-sm font-mono break-all">{boletoBarcode}</div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(boletoBarcode);
                              toast.success("Linha digitável copiada!");
                            }}
                          >
                            Copiar linha digitável
                          </Button>
                          {boletoUrl && (
                            <Button variant="outline" onClick={() => window.open(boletoUrl, "_blank")}>
                              Abrir/Imprimir Boleto
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Após o pagamento, a confirmação pode levar até 2 dias úteis.</p>
                      </>
                    ) : (
                      <div className="w-full h-32 bg-red-50 border border-red-300 rounded-lg flex items-center justify-center text-red-600 text-sm">Erro ao gerar boleto</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {method === "cartao" && (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary-100 text-primary-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="space-y-2 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">Cartão de Crédito/Débito</p>
                      <span className="text-xs text-gray-500">via</span>
                      <Image src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/5.21.11/mercadopago/logo__large@2x.png" alt="Mercado Pago" width={80} height={20} className="h-5" />
                    </div>
                    <p className="text-sm text-gray-600">Preencha os dados do cartão abaixo.</p>
                    {orderId && amountNumber > 0 ? (
                      <div className="mt-4">
                        <MercadoPagoPaymentBrick amount={amountNumber} orderId={orderId} userEmail={userEmail} userFirstName={userFirstName} userLastName={userLastName} onPaymentSuccess={handlePaymentSuccess} onPaymentError={handlePaymentError} />
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-metallic-100 border border-dashed border-metallic-300 rounded-lg flex items-center justify-center text-gray-500 text-sm">{amountNumber <= 0 ? "Valor do pedido inválido para processamento." : "Carregando checkout do Mercado Pago..."}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => router.push("/")}>
                Voltar para a loja
              </Button>
              <div className="flex gap-2">
                {expired && (
                  <Button variant="outline" onClick={() => router.push("/produtos")}>
                    Refazer pedido
                  </Button>
                )}
                <Button onClick={() => router.push("/admin/orders")} disabled={expired}>
                  Ver no Admin
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
export default function CheckoutPagamentoPage() {
  return (
    <MercadoPagoProvider>
      <Suspense fallback={
        <>
          <Header />
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
          <Footer />
        </>
      }>
        <CheckoutPagamentoContent />
      </Suspense>
    </MercadoPagoProvider>
  );
}