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
  { icon: Package, label: 'Dados', href: '/checkout/dados', active: true },
  { icon: Truck, label: 'Entrega', href: '/checkout/entrega' },
  { icon: CreditCard, label: 'Pagamento', href: '/checkout/pagamento' },
  { icon: Check, label: 'Confirmação', href: '/checkout/confirmacao' },
];

export default function CheckoutDadosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para continuar');
      router.push('/auth/login');
    }

    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        nome: session.user.name || '',
        email: session.user.email || '',
      }));
    }
  }, [session, status, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Salva dados no localStorage
    localStorage.setItem('checkoutDados', JSON.stringify(formData));
    toast.success('Dados salvos com sucesso!');
    router.push('/checkout/entrega');
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
                      <div className={`h-0.5 w-12 mx-2 ${
                        step.active ? 'bg-primary-600' : 'bg-metallic-200'
                      }`} />
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
            <h1 className="text-2xl font-bold mb-6">Dados Pessoais</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button type="button" variant="outline" onClick={() => router.push('/carrinho')}>
                  Voltar
                </Button>
                <Button type="submit" className="flex-1">
                  Continuar para Entrega
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
