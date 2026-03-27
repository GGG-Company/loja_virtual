'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Eye, Home } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Confetti from 'react-confetti';
import { CheckoutProgress } from '@/components/checkout-progress';

function ConfirmacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  
  const orderId = searchParams?.get('orderId');
  const paymentId = searchParams?.get('paymentId');
  
  const [orderNumber, setOrderNumber] = useState('');
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Limpa carrinho e checkout
    localStorage.removeItem('cart');
    localStorage.removeItem('checkoutState');
    window.dispatchEvent(new Event('cartUpdated'));

    // Tamanho da janela para confetti
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Para confetti após 5 segundos
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para continuar');
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (orderId) {
      // Buscar número do pedido
      fetch(`/api/user/orders/${orderId}`)
        .then(res => res.json())
        .then(data => setOrderNumber(data.orderNumber || orderId))
        .catch(() => setOrderNumber(orderId));
    }
  }, [orderId]);

  if (status === 'loading') {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
        />
      )}
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <CheckoutProgress currentStep={4} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center"
          >
            {/* Ícone de sucesso animado */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle className="h-14 w-14 text-green-600" />
            </motion.div>

            {/* Título */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Pagamento Aprovado!
            </motion.h1>

            {/* Mensagem */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-600 mb-8"
            >
              Seu pedido foi confirmado com sucesso e já está sendo processado.
            </motion.p>

            {/* Info do pedido */}
            {orderNumber && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-8"
              >
                <p className="text-sm text-gray-600 mb-1">Número do Pedido</p>
                <p className="text-2xl font-bold text-primary-700">{orderNumber}</p>
                {paymentId && (
                  <p className="text-xs text-gray-500 mt-2">
                    ID de Pagamento: {paymentId}
                  </p>
                )}
              </motion.div>
            )}

            {/* Próximos passos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-50 rounded-lg p-6 mb-8 text-left"
            >
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary-600" />
                Próximos Passos
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Você receberá um email de confirmação em breve</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Acompanhe o status do seu pedido na área "Meus Pedidos"</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Em breve você receberá o código de rastreamento</span>
                </li>
              </ul>
            </motion.div>

            {/* Botões de ação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {orderId && (
                <Link href={`/minha-conta/pedidos/${orderId}`} className="flex-1">
                  <Button className="w-full" size="lg">
                    <Eye className="h-5 w-5 mr-2" />
                    Ver Detalhes do Pedido
                  </Button>
                </Link>
              )}
              <Link href="/produtos" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">
                  <Package className="h-5 w-5 mr-2" />
                  Continuar Comprando
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6"
            >
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Voltar para Home
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function CheckoutConfirmacaoPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
        <Footer />
      </>
    }>
      <ConfirmacaoContent />
    </Suspense>
  );
}
