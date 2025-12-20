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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    localStorage.setItem('checkoutEntrega', JSON.stringify(formData));
    toast.success('Endereço de entrega salvo!');
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
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  placeholder="00000-000"
                  required
                />
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

              <div className="flex gap-4 pt-6">
                <Button type="button" variant="outline" onClick={() => router.push('/checkout/dados')}>
                  Voltar
                </Button>
                <Button type="submit" className="flex-1">
                  Continuar para Pagamento
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
