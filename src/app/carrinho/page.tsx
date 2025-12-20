'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import { ShoppingCart, Package, Check, Truck, CreditCard, Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const steps = [
  { icon: ShoppingCart, label: 'Carrinho', active: true },
  { icon: Package, label: 'Dados', active: false },
  { icon: Truck, label: 'Entrega', active: false },
  { icon: CreditCard, label: 'Pagamento', active: false },
  { icon: Check, label: 'Confirmação', active: false },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  selectedVoltage?: string;
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(cart);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    const updatedCart = cartItems.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (id: string) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50 py-12">
        <div className="container mx-auto px-4">
          {/* Steps */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-center gap-4 overflow-x-auto pb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex flex-col items-center ${
                        step.active ? 'text-primary-600' : 'text-metallic-400'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          step.active
                            ? 'bg-primary-600 text-white'
                            : 'bg-metallic-200'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-2 font-medium">
                        {step.label}
                      </span>
                    </motion.div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 w-12 mx-2 ${
                          step.active ? 'bg-primary-600' : 'bg-metallic-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Cart Items */}
          {cartItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-lg shadow p-4 flex gap-4"
                  >
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <Image
                        src={!item.imageUrl || item.imageUrl.includes('/products/') ? '/placeholder.svg' : item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover rounded"
                        unoptimized={!item.imageUrl || item.imageUrl.includes('/products/')}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.selectedVoltage && (
                        <p className="text-sm text-gray-600">Voltagem: {item.selectedVoltage}</p>
                      )}
                      <p className="text-primary-600 font-bold mt-2">
                        R$ {item.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>

                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-lg shadow p-6 sticky top-24"
                >
                  <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>
                  
                  <div className="space-y-2 mb-4 pb-4 border-b">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>R$ {total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Frete</span>
                      <span className="text-green-600">Grátis</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xl font-bold mb-6">
                    <span>Total</span>
                    <span className="text-primary-600">R$ {total.toFixed(2)}</span>
                  </div>

                  <Button className="w-full" size="lg" onClick={() => router.push('/checkout')}>
                    Finalizar Compra
                  </Button>

                  <Link href="/produtos">
                    <Button variant="outline" className="w-full mt-3">
                      Continuar Comprando
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          )}

          {/* Empty Cart */}
          {cartItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-32 h-32 mx-auto mb-6 bg-metallic-100 rounded-full flex items-center justify-center"
                >
                  <ShoppingCart className="h-16 w-16 text-metallic-400" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-metallic-900 mb-4"
                >
                  Seu carrinho está vazio
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-metallic-600 mb-8 text-lg"
                >
                  Adicione produtos incríveis e comece suas compras!
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link href="/produtos">
                    <Button size="lg" className="px-8">
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Começar a Comprar
                    </Button>
                  </Link>
                </motion.div>

                {/* Suggested Categories */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-12 pt-8 border-t border-metallic-200"
                >
                  <p className="text-sm text-metallic-600 mb-4">
                    Sugestões para você:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      'Ferramentas Elétricas',
                      'Parafusadeiras',
                      'Furadeiras',
                      'EPIs',
                    ].map((cat, i) => (
                      <motion.div
                        key={cat}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                      >
                        <Link href="/produtos">
                          <span className="px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer">
                            {cat}
                          </span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
