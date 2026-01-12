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
import { ShoppingCart, Package, Check, Truck, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const steps = [
  { icon: ShoppingCart, label: 'Carrinho', href: '/carrinho' },
  { icon: Package, label: 'Dados', href: '/checkout/dados' },
  { icon: Truck, label: 'Entrega', href: '/checkout/entrega', active: true },
  { icon: CreditCard, label: 'Pagamento', href: '/checkout/pagamento' },
  { icon: Check, label: 'Confirmação', href: '/checkout/confirmacao' },
];

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
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para continuar');
      router.push('/auth/login');
    }

    // Verifica se os dados pessoais foram preenchidos
    const dados = localStorage.getItem('checkoutDados');
    if (!dados) {
      toast.error('Preencha seus dados pessoais primeiro');
      router.push('/checkout/dados');
    }
  }, [status, router]);

  // Calcular frete quando CEP for preenchido
  const calculateShipping = async (cep: string) => {
    if (cep.replace(/\D/g, '').length !== 8) return;
    
    setLoadingShipping(true);
    setShippingOptions([]);
    setSelectedShipping(null);
    
    try {
      // Buscar itens do carrinho
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (cart.length === 0) {
        toast.error('Carrinho vazio');
        return;
      }

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
        body: JSON.stringify({
          destinationZip: cep.replace(/\D/g, ''),
          items,
        }),
      });

      const data = await response.json();

      if (response.ok && data.options && data.options.length > 0) {
        const options: ShippingOption[] = data.options.map((opt: any) => ({
          id: opt.id.toString(),
          name: opt.name,
          price: opt.price,
          delivery_time: opt.delivery_time,
        }));
        setShippingOptions(options);
        toast.success('Opções de frete calculadas!');
      } else {
        toast.error(data.error || 'Nenhuma opção de frete disponível');
      }
    } catch (error) {
      console.error('[ENTREGA] Erro ao calcular frete:', error);
      toast.error('Erro ao calcular frete');
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedShipping) {
      toast.error('Selecione uma opção de frete para continuar!');
      return;
    }
    
    localStorage.setItem('checkoutEntrega', JSON.stringify(formData));
    localStorage.setItem('checkoutFrete', JSON.stringify(selectedShipping));
    toast.success('Endereço e frete salvos!');
    router.push('/checkout/pagamento');
  };

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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4 overflow-x-auto pb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex items-center">
                    <div className={`flex flex-col items-center ${
                      step.active ? 'text-primary-600' : 'text-metallic-400'
                    }`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        step.active ? 'bg-primary-600 text-white' : 'bg-metallic-200'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-2 font-medium">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`h-0.5 w-12 mx-2 bg-metallic-200`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-8"
          >
            <h1 className="text-2xl font-bold mb-6">Endereço de Entrega</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, cep: value });
                    if (value.replace(/\D/g, '').length === 8) {
                      calculateShipping(value);
                    }
                  }}
                  placeholder="00000-000"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Digite o CEP para calcular o frete</p>
              </div>

              <div>
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    maxLength={2}
                    placeholder="UF"
                    required
                  />
                </div>
              </div>

              {/* Opções de Frete */}
              <div className="pt-6 border-t">
                <Label className="text-lg font-semibold mb-4 block">Escolha o Frete *</Label>
                
                {loadingShipping && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600">Calculando opções de frete...</span>
                  </div>
                )}

                {!loadingShipping && shippingOptions.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                    Digite um CEP válido para calcular as opções de frete
                  </div>
                )}

                {!loadingShipping && shippingOptions.length > 0 && (
                  <div className="space-y-3">
                    {shippingOptions.map((option) => (
                      <div
                        key={option.id}
                        onClick={() => setSelectedShipping(option)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedShipping?.id === option.id
                            ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600'
                            : 'border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedShipping?.id === option.id
                                ? 'border-primary-600 bg-primary-600'
                                : 'border-gray-300'
                            }`}>
                              {selectedShipping?.id === option.id && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{option.name}</p>
                              <p className="text-sm text-gray-600">
                                Entrega em até {option.delivery_time} dias úteis
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary-700">
                              R$ {option.price.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!selectedShipping && shippingOptions.length > 0 && (
                  <p className="text-sm text-red-600 mt-2">* Selecione uma opção de frete para continuar</p>
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <Button type="button" variant="outline" onClick={() => router.push('/checkout/dados')}>
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={!selectedShipping}
                >
                  {!selectedShipping ? 'Selecione o frete para continuar' : 'Continuar para Pagamento'}
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
