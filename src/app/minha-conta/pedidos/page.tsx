'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, XCircle, ArrowLeft, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus?: string;
  paymentMethod: string;
  createdAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
}

const statusConfig = {
  PENDING: { label: 'Pendente', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
  CONFIRMED: { label: 'Confirmado', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  PROCESSING: { label: 'Processando', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package },
  SHIPPED: { label: 'Enviado', color: 'text-purple-600', bg: 'bg-purple-50', icon: Package },
  DELIVERED: { label: 'Entregue', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  REFUNDED: { label: 'Reembolsado', color: 'text-gray-600', bg: 'bg-gray-50', icon: XCircle },
  QUOTE: { label: 'Orçamento', color: 'text-orange-600', bg: 'bg-orange-50', icon: Package },
};

export default function MeusPedidosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para ver seus pedidos');
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadOrders();
    }
  }, [status]);

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/user/orders');
      if (!response.ok) throw new Error('Erro ao carregar pedidos');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-metallic-50">
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
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link href="/minha-conta">
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Minha Conta
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-metallic-900">Meus Pedidos</h1>
            <p className="text-metallic-600 mt-2">
              Acompanhe o status dos seus pedidos e orçamentos
            </p>
          </motion.div>

          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow p-12 text-center"
            >
              <Package className="h-16 w-16 mx-auto mb-4 text-metallic-400" />
              <h2 className="text-xl font-bold text-metallic-900 mb-2">
                Nenhum pedido encontrado
              </h2>
              <p className="text-metallic-600 mb-6">
                Você ainda não fez nenhum pedido em nossa loja
              </p>
              <Link href="/produtos">
                <Button>
                  <Package className="h-4 w-4 mr-2" />
                  Começar a Comprar
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => {
                const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
                const StatusIcon = statusInfo.icon;

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">
                              Pedido #{order.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {order.paymentStatus && (
                            <span className="text-xs text-gray-600">
                              Pagamento: {order.paymentStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t pt-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Forma de Pagamento</p>
                            <p className="font-medium capitalize">{order.paymentMethod}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="font-bold text-xl text-primary-600">
                              R$ {order.total.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-2">Itens</p>
                          <div className="space-y-1">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <p key={idx} className="text-sm">
                                {item.quantity}x {item.productName} - R$ {(item.price * item.quantity).toFixed(2)}
                              </p>
                            ))}
                            {order.items.length > 3 && (
                              <p className="text-sm text-gray-500">
                                +{order.items.length - 3} item(s)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Link href={`/minha-conta/pedidos/${order.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </Link>
                        {(order.status === 'PENDING' && order.paymentMethod !== 'quote') && (
                          <Link 
                            href={`/checkout/pagamento?orderId=${order.id}&method=${order.paymentMethod}&total=${order.total.toFixed(2)}&number=${order.orderNumber}`}
                            className="flex-1"
                          >
                            <Button className="w-full">
                              Continuar Pagamento
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
