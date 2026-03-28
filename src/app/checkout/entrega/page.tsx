'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, MapPin } from 'lucide-react';
import { CheckoutProgress } from '@/components/checkout-progress';

// ── Mask ──────────────────────────────────────────────────────────────────
function maskCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

type ShippingOption = {
  id: string;
  name: string;
  price: number;
  delivery_time: number;
};

export default function CheckoutEntregaPage() {
  const router = useRouter();
  const { status } = useSession();
  const [formData, setFormData] = useState({
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para continuar');
      router.push('/auth/login');
    }
    const dados = localStorage.getItem('checkoutDados');
    if (!dados) {
      toast.error('Preencha seus dados pessoais primeiro');
      router.push('/checkout/dados');
    }
  }, [status, router]);

  // ── ViaCEP autofill ──────────────────────────────────────────────────────
  const lookupCep = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado. Verifique o número e tente novamente.');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
      toast.success('Endereço preenchido automaticamente!');
      // Auto-calculate shipping
      calculateShipping(digits);
    } catch {
      toast.error('Não foi possível buscar o CEP. Verifique sua conexão.');
    } finally {
      setCepLoading(false);
    }
  };

  // ── Shipping calc ────────────────────────────────────────────────────────
  const calculateShipping = async (cepDigits: string) => {
    setLoadingShipping(true);
    setShippingOptions([]);
    setSelectedShipping(null);
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (cart.length === 0) { toast.error('Carrinho vazio'); return; }

      const items = cart.map((item: any) => ({
        productId: item.id,
        quantity: item.quantity,
        weightKg: item.weight || 0.5,
        dimensions: item.dimensions || { height: 10, width: 15, length: 20 },
        price: item.price,
      }));

      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationZip: cepDigits, items }),
      });
      const data = await response.json();

      if (response.ok && data.options?.length > 0) {
        const options: ShippingOption[] = data.options.map((opt: any) => ({
          id: opt.id.toString(),
          name: opt.service || opt.name,
          price: opt.price,
          delivery_time: opt.etaDays ?? opt.delivery_time ?? 0,
        }));
        setShippingOptions(options);
      } else {
        toast.error(data.error || 'Nenhuma opção de frete disponível para este CEP');
      }
    } catch {
      toast.error('Erro ao calcular frete. Tente novamente.');
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipping) {
      toast.error('Selecione uma opção de frete para continuar');
      return;
    }
    localStorage.setItem('checkoutEntrega', JSON.stringify(formData));
    localStorage.setItem('checkoutFrete', JSON.stringify(selectedShipping));
    toast.success('Endereço e frete salvos!');
    router.push('/checkout/pagamento');
  };

  const setField = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (key === 'cep') val = maskCep(val);
    setFormData((prev) => ({ ...prev, [key]: val }));
    if (key === 'cep') {
      const digits = val.replace(/\D/g, '');
      if (digits.length === 8) lookupCep(digits);
    }
  };

  if (status === 'loading') {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC1020]" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <CheckoutProgress currentStep={2} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-sm shadow-md border-t-4 border-[#CC1020] p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-7 bg-[#CC1020] rounded-full" />
              <h1 className="font-display text-2xl font-bold text-[#1A1A1A] uppercase">
                Endereço de Entrega
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* CEP */}
              <div>
                <Label htmlFor="cep">CEP *</Label>
                <div className="relative mt-1">
                  <Input
                    id="cep"
                    inputMode="numeric"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={setField('cep')}
                    className="h-12 pr-10"
                    required
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#CC1020]" />
                  )}
                  {!cepLoading && formData.cidade && (
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  O endereço será preenchido automaticamente
                </p>
              </div>

              {/* Endereco + Numero */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="endereco">Endereço *</Label>
                  <Input
                    id="endereco"
                    placeholder="Rua, Avenida..."
                    value={formData.endereco}
                    onChange={setField('endereco')}
                    className="h-12 mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    placeholder="Nº"
                    value={formData.numero}
                    onChange={setField('numero')}
                    className="h-12 mt-1"
                    required
                  />
                </div>
              </div>

              {/* Complemento + Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    placeholder="Apto, Bloco... (opcional)"
                    value={formData.complemento}
                    onChange={setField('complemento')}
                    className="h-12 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={setField('bairro')}
                    className="h-12 mt-1"
                    required
                  />
                </div>
              </div>

              {/* Cidade + Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={setField('cidade')}
                    className="h-12 mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="estado">Estado *</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={setField('estado')}
                    maxLength={2}
                    placeholder="UF"
                    className="h-12 mt-1 uppercase"
                    required
                  />
                </div>
              </div>

              {/* Shipping options */}
              <div className="pt-4 border-t border-gray-100">
                <Label className="text-base font-semibold text-[#1A1A1A] mb-3 block">
                  Opção de Frete *
                </Label>

                {loadingShipping && (
                  <div className="flex items-center gap-3 py-6 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin text-[#CC1020]" />
                    <span className="text-sm">Calculando opções de frete...</span>
                  </div>
                )}

                {!loadingShipping && shippingOptions.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-800">
                    Digite um CEP válido para calcular as opções de frete automaticamente.
                  </div>
                )}

                {!loadingShipping && shippingOptions.length > 0 && (
                  <div className="space-y-2">
                    {shippingOptions.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center gap-4 border rounded-sm p-4 cursor-pointer transition-all ${
                          selectedShipping?.id === option.id
                            ? 'border-[#CC1020] bg-red-50 ring-2 ring-red-100'
                            : 'border-gray-200 hover:border-[#CC1020]/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShipping?.id === option.id}
                          onChange={() => setSelectedShipping(option)}
                          className="accent-[#CC1020]"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-[#1A1A1A] text-sm">{option.name}</p>
                          <p className="text-xs text-gray-500">
                            Entrega em até {option.delivery_time} dias úteis
                          </p>
                        </div>
                        <p className="font-bold text-[#CC1020]">
                          {option.price === 0
                            ? 'Grátis'
                            : `R$ ${option.price.toFixed(2).replace('.', ',')}`}
                        </p>
                      </label>
                    ))}
                  </div>
                )}

                {!selectedShipping && shippingOptions.length > 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    Selecione uma opção de frete para continuar
                  </p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/checkout/dados')}
                >
                  ← Voltar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12"
                  disabled={!selectedShipping}
                >
                  {!selectedShipping
                    ? 'Selecione o frete para continuar'
                    : 'Continuar para Pagamento →'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
