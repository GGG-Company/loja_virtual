'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Truck, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    imageUrl?: string | null;
  };
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  paymentMethod: string;
  shippingAddress: any;
  trackingCode?: string | null;
  createdAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  items: OrderItem[];
};

type TrackingInfo = {
  code: string;
  lastStatus?: string;
  updatedAt?: string;
  events?: { status: string; description?: string; date?: string; }[];
};

const statusConfig = {
  PENDING: { label: 'Aguardando Pagamento', color: 'bg-yellow-100 text-yellow-800', icon: Package },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  PROCESSING: { label: 'Em Separação', color: 'bg-purple-100 text-purple-800', icon: Package },
  SHIPPED: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  DELIVERED: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
  REFUNDED: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  QUOTE: { label: 'Orçamento', color: 'bg-sky-100 text-sky-800', icon: Package },
};

const paymentMethodToPt: Record<string, string> = {
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CASH: 'Dinheiro',
};

export default function PedidoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiClient.get<Order>(`/api/user/orders/${params.id}`);
        setOrder(response.data);
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
        toast.error('Erro ao carregar pedido');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const handleTrackingRefresh = async () => {
    if (!order?.trackingCode) return;
    setIsTrackingLoading(true);
    try {
      const res = await apiClient.post('/api/shipping/track', {
        trackingCodes: [order.trackingCode],
      });
      const info = Array.isArray(res.data) ? res.data[0] : null;
      setTrackingInfo(info || null);
      if (info?.lastStatus) {
        toast.success('Status de rastreio atualizado');
      }
    } catch (error) {
      console.error('[TRACK]', error);
      toast.error('Não foi possível consultar o rastreio agora');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!confirm('Confirmar que você recebeu este pedido?')) return;

    setIsConfirming(true);
    try {
      await apiClient.post(`/api/user/orders/${params.id}/confirm-delivery`);
      toast.success('Recebimento confirmado!');
      // Recarregar pedido
      const response = await apiClient.get<Order>(`/api/user/orders/${params.id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Erro ao confirmar recebimento:', error);
      toast.error('Erro ao confirmar recebimento');
    } finally {
      setIsConfirming(false);
    }
  };

  const handlePayNow = () => {
    router.push(`/pagamento/${params.id}`);
  };

  if (isLoading) {
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

  if (!order) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Package className="h-16 w-16 text-metallic-300 mx-auto mb-4" />
            <p className="text-metallic-600">Pedido não encontrado</p>
            <Button onClick={() => router.push('/minha-conta')} className="mt-4">
              Voltar para Minha Conta
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const statusInfo = statusConfig[order.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo?.icon || Package;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50 py-8">
        <div className="container mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-metallic-600 hover:text-metallic-900 mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6 space-y-6"
          >
            {/* Cabeçalho do Pedido */}
            <div className="border-b border-metallic-200 pb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-metallic-900">
                    Pedido {order.orderNumber}
                  </h1>
                  <p className="text-metallic-600 mt-1">
                    Realizado em {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline do Pedido */}
            <div className="border-b border-metallic-200 pb-6">
              <h2 className="text-xl font-semibold text-metallic-900 mb-4">
                Status do Pedido
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${order.createdAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <p className="font-medium">Pedido Realizado</p>
                    {order.createdAt && (
                      <p className="text-sm text-metallic-600">
                        {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${order.paidAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <p className="font-medium">Pagamento Confirmado</p>
                    {order.paidAt && (
                      <p className="text-sm text-metallic-600">
                        {new Date(order.paidAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${order.shippedAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <p className="font-medium">Pedido Enviado</p>
                    {order.shippedAt && (
                      <p className="text-sm text-metallic-600">
                        {new Date(order.shippedAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                    {order.trackingCode && (
                      <div className="mt-2 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-metallic-600">
                          <span className="font-mono">Código de rastreio: {order.trackingCode}</span>
                          <Button size="sm" variant="outline" onClick={handleTrackingRefresh} disabled={isTrackingLoading}>
                            {isTrackingLoading ? 'Atualizando...' : 'Atualizar status'}
                          </Button>
                        </div>
                        {trackingInfo?.lastStatus && (
                          <div className="text-sm text-metallic-700">
                            <p className="font-semibold">{trackingInfo.lastStatus}</p>
                            {trackingInfo.updatedAt && (
                              <p className="text-xs text-metallic-600">Atualizado em {new Date(trackingInfo.updatedAt).toLocaleString('pt-BR')}</p>
                            )}
                          </div>
                        )}
                        {trackingInfo?.events?.slice(0, 3).map((ev, idx) => (
                          <div key={idx} className="text-xs text-metallic-600">
                            <span className="font-semibold">{ev.status}</span>
                            {ev.description && <span className="ml-1">- {ev.description}</span>}
                            {ev.date && <span className="ml-1 text-[11px]">({new Date(ev.date).toLocaleString('pt-BR')})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${order.deliveredAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <p className="font-medium">Pedido Entregue</p>
                    {order.deliveredAt && (
                      <p className="text-sm text-metallic-600">
                        {new Date(order.deliveredAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Produtos */}
            <div className="border-b border-metallic-200 pb-6">
              <h2 className="text-xl font-semibold text-metallic-900 mb-4">
                Itens do Pedido
              </h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-metallic-50 rounded-lg">
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-metallic-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-metallic-900">
                        {item.product.name}
                      </p>
                      <p className="text-sm text-metallic-600">
                        Quantidade: {item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-primary-600 mt-1">
                        R$ {item.price.toFixed(2)} cada
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-metallic-900">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo de Pagamento */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Endereço de Entrega */}
              <div>
                <h2 className="text-xl font-semibold text-metallic-900 mb-4">
                  Endereço de Entrega
                </h2>
                <div className="bg-metallic-50 p-4 rounded-lg space-y-1">
                  <p className="font-medium">{order.shippingAddress?.street}, {order.shippingAddress?.number}</p>
                  {order.shippingAddress?.complement && (
                    <p className="text-sm text-metallic-600">{order.shippingAddress.complement}</p>
                  )}
                  <p className="text-sm text-metallic-600">
                    {order.shippingAddress?.neighborhood} - {order.shippingAddress?.city}/{order.shippingAddress?.state}
                  </p>
                  <p className="text-sm text-metallic-600">CEP: {order.shippingAddress?.zipCode}</p>
                </div>
              </div>

              {/* Resumo de Valores */}
              <div>
                <h2 className="text-xl font-semibold text-metallic-900 mb-4">
                  Resumo de Valores
                </h2>
                <div className="bg-metallic-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-metallic-700">Subtotal:</span>
                    <span className="font-semibold">R$ {order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-metallic-700">Frete:</span>
                    <span className="font-semibold">R$ {order.shipping.toFixed(2)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto:</span>
                      <span className="font-semibold">- R$ {order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-metallic-300 pt-3 flex justify-between">
                    <span className="text-lg font-bold text-metallic-900">Total:</span>
                    <span className="text-lg font-bold text-primary-600">
                      R$ {order.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-metallic-200">
                    <p className="text-sm text-metallic-600">
                      Pagamento: {paymentMethodToPt[order.paymentMethod] || order.paymentMethod}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações do Pedido */}
            {(order.status === 'PENDING' || order.status === 'DELIVERED') && (
              <div className="border-t border-metallic-200 pt-6">
                <div className="flex flex-wrap gap-4 justify-center">
                  {order.status === 'PENDING' && (
                    <Button
                      size="lg"
                      onClick={handlePayNow}
                      className="min-w-[200px]"
                    >
                      💳 Pagar Agora
                    </Button>
                  )}
                  
                  {order.status === 'DELIVERED' && !order.deliveredAt && (
                    <Button
                      size="lg"
                      onClick={handleConfirmDelivery}
                      disabled={isConfirming}
                      className="min-w-[200px]"
                    >
                      {isConfirming ? 'Confirmando...' : '✓ Confirmar Recebimento'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
