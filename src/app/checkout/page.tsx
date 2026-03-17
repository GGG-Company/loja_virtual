'use client';

import logger from "@/lib/logger";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Package, Check, Truck, CreditCard, Barcode, CheckCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { MercadoPagoProvider } from '@/components/mercadopago-provider';
import { MercadoPagoPaymentBrick } from '@/components/mercadopago-payment-brick';

const steps = [
  { id: 1, icon: Package, label: 'Dados' },
  { id: 2, icon: Truck, label: 'Entrega' },
  { id: 3, icon: CreditCard, label: 'Pagamento' },
  { id: 4, icon: Check, label: 'Confirmação' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  // Dados do formulário
  const [dadosForm, setDadosForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
  });

  const [entregaForm, setEntregaForm] = useState({
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [loadingCep, setLoadingCep] = useState(false);
  const [showPaymentBrick, setShowPaymentBrick] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [boletoUrl, setBoletoUrl] = useState('');
  const [boletoBarcode, setBoletoBarcode] = useState('');
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Estados para frete
  const [shippingOptions, setShippingOptions] = useState<Array<{
    id: number;
    name: string;
    price: number;
    delivery_time: number;
    company: { name: string; picture: string };
  }>>([]);
  const [selectedShipping, setSelectedShipping] = useState<{
    id: number;
    name: string;
    price: number;
    delivery_time: number;
  } | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // Persistência do progresso do checkout
  useEffect(() => {
    try {
      const saved = localStorage.getItem("checkoutState");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (typeof parsed.currentStep === "number") setCurrentStep(parsed.currentStep);
          if (parsed.dadosForm) setDadosForm((prev) => ({ ...prev, ...parsed.dadosForm }));
          if (parsed.entregaForm) setEntregaForm((prev) => ({ ...prev, ...parsed.entregaForm }));
          if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
          if (Array.isArray(parsed.cartItems)) setCartItems(parsed.cartItems);
        }
      }
      // Restaurar frete salvo no carrinho (se houver) para evitar divergência
      const savedFrete = localStorage.getItem("checkoutFrete");
      if (savedFrete) {
        try {
          const parsedFrete = JSON.parse(savedFrete);
          if (parsedFrete && typeof parsedFrete.price === "number") {
            setSelectedShipping({
              id: parsedFrete.id,
              name: parsedFrete.name,
              price: parsedFrete.price,
              delivery_time: parsedFrete.delivery_time || parsedFrete.etaDays || 0,
            });
          }
        } catch (e) {
          // ignore invalid saved frete
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();

      setDadosForm((prev) => ({
        ...prev,
        nome: prev.nome || data.name || "",
        email: prev.email || data.email || "",
        telefone: prev.telefone || data.phone || "",
        cpf: prev.cpf || data.cpf || "",
      }));

      setEntregaForm((prev) => ({
        ...prev,
        cep: prev.cep || data.addressZip || "",
        endereco: prev.endereco || data.addressStreet || "",
        numero: prev.numero || data.addressNumber || "",
        complemento: prev.complemento || data.addressComplement || "",
        bairro: prev.bairro || data.addressNeighborhood || "",
        cidade: prev.cidade || data.addressCity || "",
        estado: prev.estado || data.addressState || "",
      }));
    } catch (error) {
      logger.error(error, 'Erro ao carregar perfil');
    }
  };

  const persistProfile = async () => {
    try {
      const payload = {
        name: dadosForm.nome,
        phone: dadosForm.telefone,
        cpf: dadosForm.cpf,
        addressZip: entregaForm.cep,
        addressStreet: entregaForm.endereco,
        addressNumber: entregaForm.numero,
        addressComplement: entregaForm.complemento,
        addressNeighborhood: entregaForm.bairro,
        addressCity: entregaForm.cidade,
        addressState: entregaForm.estado,
      };

      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      logger.error(error, 'Erro ao salvar perfil');
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Faça login para continuar");
      router.push("/auth/login");
      return;
    }

    if (session?.user) {
      setDadosForm((prev) => ({
        ...prev,
        nome: session.user.name || "",
        email: session.user.email || "",
      }));
    }

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (cart.length === 0) {
      toast.error("Seu carrinho está vazio");
      router.push("/carrinho");
      return;
    }
    if (cartItems.length === 0) {
      setCartItems(cart);
    }
  }, [session, status, router, cartItems.length]);

  useEffect(() => {
    if (status === "authenticated") {
      loadProfile();
    }
  }, [status]);

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = selectedShipping?.price || 0;
  const totalWithShipping = total + shippingCost;

  // Função para calcular frete via Melhor Envio
  const calcularFrete = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8 || cartItems.length === 0) return;

    setLoadingShipping(true);
    setShippingOptions([]);
    setSelectedShipping(null);

    try {
      const items = cartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        weightKg: item.weight || 0.5,
        dimensions: item.dimensions || { height: 10, width: 15, length: 20 },
        price: item.price,
      }));

      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationZip: cepLimpo,
          items,
        }),
      });

      const data = await response.json();

      if (response.ok && data.options && data.options.length > 0) {
        setShippingOptions(data.options);
        // Selecionar a primeira opção automaticamente
        const firstOption = data.options[0];
        setSelectedShipping({
          id: firstOption.id,
          name: firstOption.name,
          price: firstOption.price,
          delivery_time: firstOption.delivery_time,
        });
        toast.success("Frete calculado com sucesso!");
      } else {
        toast.error(data.error || "Nenhuma opção de frete disponível");
      }
    } catch (error) {
      logger.error(error, '[CHECKOUT] Erro ao calcular frete');
      toast.error('Erro ao calcular frete');
    } finally {
      setLoadingShipping(false);
    }
  };

  const buscarCep = async (cep: string) => {
    // Remove caracteres não numéricos
    const cepLimpo = cep.replace(/\D/g, "");

    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setEntregaForm({
        ...entregaForm,
        cep: cep,
        endereco: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        estado: data.uf || "",
      });

      toast.success("Endereço encontrado!");

      // Calcular frete automaticamente após encontrar o CEP
      await calcularFrete(cep);
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    // Formata o CEP enquanto digita
    let formatted = value.replace(/\D/g, "");
    if (formatted.length > 8) formatted = formatted.slice(0, 8);
    if (formatted.length > 5) {
      formatted = `${formatted.slice(0, 5)}-${formatted.slice(5)}`;
    }

    setEntregaForm({ ...entregaForm, cep: formatted });

    // Busca automaticamente quando completar 8 dígitos
    if (formatted.replace(/\D/g, "").length === 8) {
      buscarCep(formatted);
    }
  };

  const handleNextStep = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (currentStep === 1) {
      if (!dadosForm.nome || !dadosForm.email || !dadosForm.telefone || !dadosForm.cpf) {
        toast.error("Preencha todos os campos");
        return;
      }
    } else if (currentStep === 2) {
      if (!entregaForm.cep || !entregaForm.endereco || !entregaForm.numero || !entregaForm.bairro || !entregaForm.cidade || !entregaForm.estado) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }
      if (!selectedShipping) {
        // Não bloqueamos mais o avanço caso o usuário não tenha calculado o frete;
        // mostramos apenas um aviso e deixamos o cálculo para o próximo passo/pedido.
        toast.warning("Você não selecionou frete. O valor será calculado posteriormente.");
      }
    }

    setCurrentStep(currentStep + 1);
  };

  const generatePixPayment = async (orderId: string, amount: number) => {
    setLoadingPayment(true);
    try {
      const response = await fetch("/api/payments/mercadopago/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: amount,
          userEmail: dadosForm.email,
          userName: dadosForm.nome,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPixCode(data.qrCode || "");
        setQrDataUrl(data.qrCodeBase64 ? `data:image/png;base64,${data.qrCodeBase64}` : "");
        setShowPaymentBrick(true);
        toast.success("PIX gerado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao gerar PIX");
      }
    } catch (error) {
      logger.error(error, 'Erro ao gerar PIX');
      toast.error('Erro ao gerar PIX');
    } finally {
      setLoadingPayment(false);
    }
  };

  const generateBoletoPayment = async (orderId: string, amount: number) => {
    setLoadingPayment(true);
    try {
      const response = await fetch("/api/payments/mercadopago/boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: amount,
          userEmail: dadosForm.email,
          userName: dadosForm.nome,
          userCpf: dadosForm.cpf || "12345678909",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBoletoUrl(data.boletoUrl || "");
        setBoletoBarcode(data.barcode || "");
        setShowPaymentBrick(true);
        toast.success("Boleto gerado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao gerar Boleto");
      }
    } catch (error) {
      logger.error(error, 'Erro ao gerar Boleto');
      toast.error('Erro ao gerar Boleto');
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleConfirmarPedido = async () => {
    setLoading(true);

    try {
      const payload = {
        items: cartItems,
        dados: dadosForm,
        entrega: entregaForm,
        paymentMethod,
        // Dados do frete selecionado
        shipping: selectedShipping
          ? {
              serviceId: selectedShipping.id,
              serviceName: selectedShipping.name,
              price: selectedShipping.price,
              deliveryTime: selectedShipping.delivery_time,
            }
          : null,
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar pedido");
      }

      const order = await response.json();

      await persistProfile();

      // Limpa carrinho
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
      // Limpa progresso do checkout
      localStorage.removeItem("checkoutState");

      toast.success("Pedido criado! Finalize o pagamento para confirmar.");
      const query = new URLSearchParams({
        orderId: order.id,
        method: paymentMethod,
        total: totalWithShipping.toFixed(2),
        number: order.orderNumber || "",
      }).toString();
      router.push(`/checkout/pagamento?${query}`);
    } catch (error) {
      toast.error("Erro ao processar pedido");
      setLoading(false);
    }
  };

  // Salva o progresso quando houver mudanças relevantes
  useEffect(() => {
    try {
      const snapshot = {
        currentStep,
        dadosForm,
        entregaForm,
        paymentMethod,
        cartItems,
      };
      localStorage.setItem("checkoutState", JSON.stringify(snapshot));
    } catch (e) {
      // ignore
    }
  }, [currentStep, dadosForm, entregaForm, paymentMethod, cartItems]);

  return (
    <MercadoPagoProvider>
      <Header />
      <main className="min-h-screen bg-metallic-50 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Steps Indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4 overflow-x-auto pb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex flex-col items-center ${isActive ? "text-primary-600" : isCompleted ? "text-green-600" : "text-metallic-400"}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive ? "bg-primary-600 text-white scale-110" : isCompleted ? "bg-green-500 text-white" : "bg-metallic-200"}`}>{isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}</div>
                      <span className="text-xs mt-2 font-medium">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && <div className={`h-0.5 w-12 mx-2 transition-all ${isCompleted ? "bg-green-500" : "bg-metallic-200"}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {/* Step 1: Dados Pessoais */}
                {currentStep === 1 && (
                  <motion.div key="dados" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-lg shadow p-8">
                    <h2 className="text-2xl font-bold mb-6">Dados Pessoais</h2>
                    <form onSubmit={handleNextStep} className="space-y-4">
                      <div>
                        <Label htmlFor="nome">Nome Completo</Label>
                        <Input id="nome" value={dadosForm.nome} onChange={(e) => setDadosForm({ ...dadosForm, nome: e.target.value })} required />
                      </div>

                      <div>
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" type="email" value={dadosForm.email} onChange={(e) => setDadosForm({ ...dadosForm, email: e.target.value })} required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="telefone">Telefone</Label>
                          <Input
                            id="telefone"
                            type="tel"
                            value={dadosForm.telefone}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, "");
                              if (value.length > 11) value = value.slice(0, 11);
                              if (value.length > 6) {
                                value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                              } else if (value.length > 2) {
                                value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                              } else if (value.length > 0) {
                                value = `(${value}`;
                              }
                              setDadosForm({ ...dadosForm, telefone: value });
                            }}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            value={dadosForm.cpf}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, "");
                              if (value.length > 11) value = value.slice(0, 11);
                              if (value.length > 9) {
                                value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
                              } else if (value.length > 6) {
                                value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
                              } else if (value.length > 3) {
                                value = `${value.slice(0, 3)}.${value.slice(3)}`;
                              }
                              setDadosForm({ ...dadosForm, cpf: value });
                            }}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            required
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 pt-6">
                        <Button type="button" variant="outline" onClick={() => router.push("/carrinho")}>
                          Voltar
                        </Button>
                        <Button type="submit" className="flex-1">
                          Continuar
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Step 2: Endereço de Entrega */}
                {currentStep === 2 && (
                  <motion.div key="entrega" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-lg shadow p-8">
                    <h2 className="text-2xl font-bold mb-6">Endereço de Entrega</h2>
                    <form onSubmit={handleNextStep} className="space-y-4">
                      <div>
                        <Label htmlFor="cep">CEP</Label>
                        <div className="relative">
                          <Input id="cep" value={entregaForm.cep} onChange={(e) => handleCepChange(e.target.value)} placeholder="00000-000" maxLength={9} required />
                          {loadingCep && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Digite o CEP para preencher automaticamente</p>
                      </div>

                      <div>
                        <Label htmlFor="endereco">Endereço</Label>
                        <Input id="endereco" value={entregaForm.endereco} onChange={(e) => setEntregaForm({ ...entregaForm, endereco: e.target.value })} required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="numero">Número</Label>
                          <Input
                            id="numero"
                            value={entregaForm.numero}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              setEntregaForm({ ...entregaForm, numero: value });
                            }}
                            maxLength={10}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="complemento">Complemento</Label>
                          <Input id="complemento" value={entregaForm.complemento} onChange={(e) => setEntregaForm({ ...entregaForm, complemento: e.target.value })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="bairro">Bairro</Label>
                          <Input id="bairro" value={entregaForm.bairro} onChange={(e) => setEntregaForm({ ...entregaForm, bairro: e.target.value })} required />
                        </div>

                        <div>
                          <Label htmlFor="cidade">Cidade</Label>
                          <Input id="cidade" value={entregaForm.cidade} onChange={(e) => setEntregaForm({ ...entregaForm, cidade: e.target.value })} required />
                        </div>

                        <div>
                          <Label htmlFor="estado">Estado</Label>
                          <Input id="estado" value={entregaForm.estado} onChange={(e) => setEntregaForm({ ...entregaForm, estado: e.target.value })} maxLength={2} placeholder="UF" required />
                        </div>
                      </div>

                      {/* Seleção de Frete */}
                      <div className="pt-6 border-t mt-6">
                        <Label className="text-lg font-semibold mb-4 block">Opções de Frete *</Label>

                        {loadingShipping && (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            <span className="ml-3 text-gray-600">Calculando opções de frete...</span>
                          </div>
                        )}

                        {!loadingShipping && shippingOptions.length === 0 && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">{entregaForm.cep.replace(/\D/g, "").length === 8 ? "Nenhuma opção de frete disponível para este CEP" : "Digite um CEP válido para calcular as opções de frete"}</div>}

                        {!loadingShipping && shippingOptions.length > 0 && (
                          <div className="space-y-3">
                            {shippingOptions.map((option) => (
                              <div
                                key={option.id}
                                onClick={() =>
                                  setSelectedShipping({
                                    id: option.id,
                                    name: option.name,
                                    price: option.price,
                                    delivery_time: option.delivery_time,
                                  })
                                }
                                className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedShipping?.id === option.id ? "border-primary-600 bg-primary-50 ring-2 ring-primary-600" : "border-gray-300 hover:border-primary-400"}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedShipping?.id === option.id ? "border-primary-600 bg-primary-600" : "border-gray-300"}`}>{selectedShipping?.id === option.id && <div className="w-2 h-2 bg-white rounded-full" />}</div>
                                    {option.company?.picture && <Image src={option.company.picture} alt={option.company.name || option.name} width={40} height={40} className="object-contain" />}
                                    <div>
                                      <p className="font-semibold text-gray-900">{option.name}</p>
                                      <p className="text-sm text-gray-600">Entrega em até {option.delivery_time} dias úteis</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-primary-700">{option.price === 0 ? "Grátis" : `R$ ${option.price.toFixed(2).replace(".", ",")}`}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {!selectedShipping && shippingOptions.length > 0 && <p className="text-sm text-red-600 mt-2">* Selecione uma opção de frete para continuar</p>}
                      </div>

                      <div className="flex gap-4 pt-6">
                        <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                          Voltar
                        </Button>
                        <Button type="submit" className="flex-1" disabled={loadingShipping}>
                          Continuar
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Step 3: Pagamento */}
                {currentStep === 3 && (
                  <motion.div key="pagamento" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-lg shadow p-8">
                    <h2 className="text-2xl font-bold mb-6">Forma de Pagamento</h2>
                    <div className="space-y-4">
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${paymentMethod === "pix" ? "border-primary-600 bg-primary-50" : "border-gray-200"}`}>
                        <input type="radio" name="payment" value="pix" checked={paymentMethod === "pix"} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-4" />
                        <Smartphone className="h-6 w-6 mr-3 text-primary-600" />
                        <div className="flex-1">
                          <p className="font-semibold">PIX</p>
                          <p className="text-sm text-gray-600">Aprovação imediata</p>
                        </div>
                      </label>

                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${paymentMethod === "boleto" ? "border-primary-600 bg-primary-50" : "border-gray-200"}`}>
                        <input type="radio" name="payment" value="boleto" checked={paymentMethod === "boleto"} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-4" />
                        <Barcode className="h-6 w-6 mr-3 text-primary-600" />
                        <div className="flex-1">
                          <p className="font-semibold">Boleto Bancário</p>
                          <p className="text-sm text-gray-600">Vencimento em 3 dias úteis</p>
                        </div>
                      </label>

                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${paymentMethod === "cartao" ? "border-primary-600 bg-primary-50" : "border-gray-200"}`}>
                        <input type="radio" name="payment" value="cartao" checked={paymentMethod === "cartao"} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-4" />
                        <CreditCard className="h-6 w-6 mr-3 text-primary-600" />
                        <div className="flex-1">
                          <p className="font-semibold">Cartão de Crédito</p>
                          <p className="text-sm text-gray-600">Parcelamento em até 12x</p>
                        </div>
                      </label>
                    </div>

                    <div className="flex gap-4 pt-6">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                        Voltar
                      </Button>
                      <Button onClick={() => handleNextStep()} className="flex-1">
                        Continuar
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Confirmação */}
                {currentStep === 4 && (
                  <motion.div key="confirmacao" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-lg shadow p-8">
                    <h2 className="text-2xl font-bold mb-6">Confirmar Pedido</h2>

                    <div className="space-y-6">
                      {/* Resumo dos Produtos */}
                      <div>
                        <h3 className="font-semibold mb-3">Produtos</h3>
                        <div className="space-y-3">
                          {cartItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                              <div className="relative w-16 h-16">
                                <Image src={!item.imageUrl || item.imageUrl.includes("/products/") ? "/placeholder.svg" : item.imageUrl} alt={item.name} fill className="object-cover rounded" unoptimized={!item.imageUrl || item.imageUrl.includes("/products/")} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                              </div>
                              <p className="font-bold text-primary-600">R$ {(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dados */}
                      <div>
                        <h3 className="font-semibold mb-2">Dados Pessoais</h3>
                        <p className="text-sm text-gray-600">{dadosForm.nome}</p>
                        <p className="text-sm text-gray-600">{dadosForm.email}</p>
                      </div>

                      {/* Endereço */}
                      <div>
                        <h3 className="font-semibold mb-2">Endereço de Entrega</h3>
                        <p className="text-sm text-gray-600">
                          {entregaForm.endereco}, {entregaForm.numero}
                          {entregaForm.complemento && ` - ${entregaForm.complemento}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {entregaForm.bairro} - {entregaForm.cidade}/{entregaForm.estado}
                        </p>
                        <p className="text-sm text-gray-600">CEP: {entregaForm.cep}</p>
                      </div>

                      {/* Pagamento */}
                      <div>
                        <h3 className="font-semibold mb-2">Forma de Pagamento</h3>
                        <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-lg border border-primary-200">
                          {paymentMethod === "pix" && <Smartphone className="h-5 w-5 text-primary-600" />}
                          {paymentMethod === "boleto" && <Barcode className="h-5 w-5 text-primary-600" />}
                          {paymentMethod === "cartao" && <CreditCard className="h-5 w-5 text-primary-600" />}
                          <span className="font-medium text-primary-700">
                            {paymentMethod === "pix" && "PIX - Aprovação imediata"}
                            {paymentMethod === "boleto" && "Boleto Bancário - Vencimento em 3 dias"}
                            {paymentMethod === "cartao" && "Cartão de Crédito - Parcelamento em até 12x"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(3)} disabled={loading}>
                        Voltar
                      </Button>
                      <Button onClick={handleConfirmarPedido} variant="outline" className="flex-1" disabled={loading}>
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Confirmar Pedido
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow p-6 sticky top-24">
                <h3 className="text-xl font-bold mb-4">Resumo</h3>

                <div className="space-y-2 mb-4 pb-4 border-b">
                  <div className="flex justify-between text-sm">
                    <span>
                      Subtotal ({cartItems.length} {cartItems.length === 1 ? "item" : "itens"})
                    </span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Frete</span>
                    {loadingShipping ? <span className="text-gray-400">Calculando...</span> : selectedShipping ? <span className={selectedShipping.price === 0 ? "text-green-600" : ""}>{selectedShipping.price === 0 ? "Grátis" : `R$ ${selectedShipping.price.toFixed(2)}`}</span> : <span className="text-gray-400">Não selecionado</span>}
                  </div>
                  {selectedShipping ? (
                    <div className="text-xs text-gray-500">
                      {selectedShipping.name} - até {selectedShipping.delivery_time} dias úteis
                      <div className="mt-1">Estimativa — o valor final será calculado na confirmação do pedido e pode variar.</div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Frete será calculado no momento da confirmação do pedido.</p>
                  )}
                </div>

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">R$ {totalWithShipping.toFixed(2)}</span>
                </div>
                {!selectedShipping && <p className="text-xs text-gray-500 mt-2">Total exibido não inclui frete — o valor final será atualizado na confirmação do pedido.</p>}

                <div className="mt-6 text-xs text-gray-500">
                  <p>✓ Compra 100% segura</p>
                  <p>✓ Envio via Melhor Envio</p>
                  <p>✓ Garantia de 90 dias</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </MercadoPagoProvider>
  );
}
