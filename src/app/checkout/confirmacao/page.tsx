'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ShoppingCart, Package, Check, Truck, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const steps = [
  { icon: ShoppingCart, label: 'Carrinho', href: '/carrinho' },
  { icon: Package, label: 'Dados', href: '/checkout/dados' },
  { icon: Truck, label: 'Entrega', href: '/checkout/entrega' },
  { icon: CreditCard, label: 'Pagamento', href: '/checkout/pagamento' },
  { icon: Check, label: 'Confirmação', href: '/checkout/confirmacao', active: true },
];

export default function CheckoutConfirmacaoPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para continuar');
      router.push('/auth/login');
      return;
    }

    const dados = localStorage.getItem('checkoutDados');
    const entrega = localStorage.getItem('checkoutEntrega');
    const pagamento = localStorage.getItem('checkoutPagamento');
    
    if (!dados || !entrega || !pagamento) {
      toast.error('Complete todas as etapas do checkout');
      router.push('/checkout/dados');
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(cart);
  }, [status, router]);

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleConfirmarPedido = async () => {
    setLoading(true);

    try {
      // Simula processamento do pedido
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Limpa carrinho e dados do checkout
      localStorage.removeItem('cart');
      localStorage.removeItem('checkoutDados');
      localStorage.removeItem('checkoutEntrega');
      localStorage.removeItem('checkoutPagamento');
      
      window.dispatchEvent(new Event('cartUpdated'));
      
      toast.success('Pedido realizado com sucesso!');
      router.push('/');
    } catch (error) {
      toast.error('Erro ao processar pedido');
      setLoading(false);
    }
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
                        step.active ? 'bg-primary-600 text-white' : 'bg-green-500 text-white'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-2 font-medium">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`h-0.5 w-12 mx-2 bg-green-500`} />
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
            <h1 className="text-2xl font-bold mb-6">Confirmar Pedido</h1>

            {/* Resumo dos Produtos */}
            <div className="mb-6">
              <h2 className="font-semibold mb-4">Produtos</h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                    <div className="relative w-16 h-16">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-primary-600">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-primary-600">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/checkout/pagamento')}
                disabled={loading}
              >
                Voltar
              </Button>
              <Button 
                onClick={handleConfirmarPedido} 
                className="flex-1"
                disabled={loading}
              >
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
        </div>
      </main>
      <Footer />
    </>
  );
}
