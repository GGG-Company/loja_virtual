'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Package, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { statusToPt, statusBadgeClass } from '@/lib/i18n';

export default function MyAccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'perfil' | 'pedidos' | 'enderecos'>('perfil');
  type Order = {
    id: string;
    createdAt: string;
    status: string;
    total: number;
  };

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (activeTab === 'pedidos') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      const response = await apiClient.get('/api/user/orders');
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!session) {
    return null;
  }

  const tabs = [
    { id: 'perfil' as const, label: 'Meu Perfil', icon: User },
    { id: 'pedidos' as const, label: 'Meus Pedidos', icon: Package },
    { id: 'enderecos' as const, label: 'Endereços', icon: MapPin },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            <h1 className="text-4xl font-bold text-metallic-900 mb-8">
              Minha Conta
            </h1>

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-metallic-100 text-metallic-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-lg shadow-md p-8">
                  {activeTab === 'perfil' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-metallic-900">
                        Informações Pessoais
                      </h2>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome Completo</Label>
                          <Input
                            id="name"
                            defaultValue={session.user?.name || ''}
                            className="h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            defaultValue={session.user?.email || ''}
                            disabled
                            className="h-12 bg-metallic-50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="(71) 99999-0000"
                            className="h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            placeholder="000.000.000-00"
                            className="h-12"
                          />
                        </div>
                      </div>

                      <Button className="h-12 px-8">
                        Salvar Alterações
                      </Button>
                    </div>
                  )}

                  {activeTab === 'pedidos' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-metallic-900">
                        Histórico de Pedidos
                      </h2>

                      {orders.length === 0 ? (
                        <div className="text-center py-12">
                          <Package className="h-16 w-16 text-metallic-300 mx-auto mb-4" />
                          <p className="text-metallic-600">
                            Você ainda não fez nenhum pedido
                          </p>
                          <Button asChild className="mt-4">
                            <a href="/produtos">Começar a Comprar</a>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.map((order) => (
                            <div
                              key={order.id}
                              className="border border-metallic-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="font-semibold text-lg">
                                    Pedido #{order.id.slice(0, 8)}
                                  </p>
                                  <p className="text-sm text-metallic-600">
                                    {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                                  {statusToPt(order.status)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-3 justify-between items-center">
                                <p className="text-2xl font-bold text-primary-600">
                                  R$ {order.total.toFixed(2)}
                                </p>
                                <div className="flex gap-2">
                                  {order.status === 'PENDING' && (
                                    <Button
                                      size="sm"
                                      asChild
                                    >
                                      <a href={`/pagamento/${order.id}`}>
                                        Pagar Agora
                                      </a>
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                  >
                                    <a href={`/minha-conta/pedidos/${order.id}`}>
                                      Ver Detalhes
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'enderecos' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-metallic-900">
                          Endereços de Entrega
                        </h2>
                        <Button>Adicionar Endereço</Button>
                      </div>

                      <div className="text-center py-12">
                        <MapPin className="h-16 w-16 text-metallic-300 mx-auto mb-4" />
                        <p className="text-metallic-600">
                          Nenhum endereço cadastrado
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
