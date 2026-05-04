'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Suspense } from 'react';

function PagamentoSucessoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!orderId) {
      router.replace('/minha-conta');
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timeout = setTimeout(() => {
      router.replace(`/minha-conta/pedidos/${orderId}`);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [orderId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="text-center px-6">

        {/* Círculo pulsante de fundo */}
        <div className="relative flex items-center justify-center mb-8">
          <motion.div
            className="absolute rounded-full bg-green-200"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 160, height: 160 }}
          />
          <motion.div
            className="absolute rounded-full bg-green-300"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            style={{ width: 120, height: 120 }}
          />

          {/* Ícone de check */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="relative z-10 bg-green-500 rounded-full p-5 shadow-lg"
          >
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <CheckCircle className="h-14 w-14 text-white" strokeWidth={2} />
            </motion.div>
          </motion.div>
        </div>

        {/* Texto principal */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-3xl font-bold text-gray-800 mb-2"
        >
          Pagamento Aprovado!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="text-gray-500 text-base mb-8"
        >
          Seu pedido foi confirmado com sucesso.
        </motion.p>

        {/* Barra de progresso */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="w-64 mx-auto"
        >
          <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 3, ease: 'linear', delay: 0 }}
            />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-xs text-gray-400 mt-2"
          >
            Redirecionando em {countdown}s...
          </motion.p>
        </motion.div>

        {/* Partículas decorativas */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-green-400"
            style={{
              width: 8,
              height: 8,
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeInOut',
            }}
          />
        ))}

      </div>
    </div>
  );
}

export default function PagamentoSucessoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    }>
      <PagamentoSucessoContent />
    </Suspense>
  );
}
