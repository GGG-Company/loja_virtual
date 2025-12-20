'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Package, MapPin, Phone, Mail, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { statusToPt, statusBadgeClass } from '@/lib/i18n';

type PickingItem = {
  id: string;
  quantity: number;
  product: {
    name: string;
    stockLocation: string | null;
    imageUrl?: string | null;
    sku?: string | null;
  };
};

type PickingOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  shippingAddress?: any;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items: PickingItem[];
};

const statusLabel: Record<string, string> = {
  CONFIRMED: 'Confirmado (pronto para separar)',
  PROCESSING: 'Em separação',
};

export default function AdminPickingPage() {
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPicking = async () => {
      try {
        const response = await apiClient.get<PickingOrder[]>('/api/admin/picking');
        setOrders(response.data);
      } catch (error) {
        console.error('Erro ao carregar picking:', error);
        toast.error('Erro ao carregar pedidos para separação');
      } finally {
        setLoading(false);
      }
    };

    fetchPicking();
  }, []);

  const formatLocation = (location?: string | null) => {
    if (!location) return 'Sem localização cadastrada';
    return location;
  };

  const formatAddress = (address: any) => {
    if (!address) return 'Endereço não cadastrado';
    const parts = [address.street, address.number, address.neighborhood, address.city, address.state, address.zip];
    return parts.filter(Boolean).join(', ');
  };

  const updateStatus = async (orderId: string, status: 'PROCESSING' | 'SHIPPED') => {
    setUpdatingId(orderId);
    try {
      const response = await apiClient.patch(`/api/admin/picking/${orderId}`, { status });
      const updated = response.data;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: updated.status, shippedAt: updated.shippedAt } : o)));
      toast.success(status === 'PROCESSING' ? 'Pedido marcado em separação' : 'Pedido enviado para ponto de coleta');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Não foi possível atualizar o status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-metallic-900">Separação de Pedidos</h1>
        <p className="text-sm text-metallic-600">Pedidos confirmados ou em separação</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 flex items-center gap-3 text-metallic-700">
          <Package className="h-5 w-5 text-metallic-500" />
          Nenhum pedido aguardando separação.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-5 border border-metallic-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-metallic-600">Pedido</p>
                  <h2 className="text-xl font-semibold text-metallic-900">{order.orderNumber}</h2>
                  <p className="text-sm text-metallic-600">
                    Criado em {new Date(order.createdAt).toLocaleString('pt-BR')}
                  </p>
                  {order.user?.name && (
                    <p className="text-sm text-metallic-700 mt-1">Cliente: {order.user.name}</p>
                  )}
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass(order.status)}`}>
                  {statusLabel[order.status] || statusToPt(order.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 bg-metallic-50 border border-metallic-100 rounded-lg p-3">
                <div className="flex items-start gap-2 text-sm text-metallic-700">
                  <Phone className="h-4 w-4 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-metallic-900">Contato</p>
                    <p>{order.user?.phone || 'Sem telefone'}</p>
                    <div className="flex items-center gap-1 text-xs text-metallic-600">
                      <Mail className="h-3 w-3" />
                      <span>{order.user?.email || 'Sem e-mail'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-metallic-700">
                  <MapPinned className="h-4 w-4 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-metallic-900">Endereço de entrega</p>
                    <p>{formatAddress(order.shippingAddress)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-metallic-100 pt-4 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-start">
                    <div className="w-16 h-16 rounded-lg bg-metallic-100 flex items-center justify-center overflow-hidden">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-metallic-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-metallic-900">{item.product.name}</p>
                        {item.product.sku && (
                          <span className="text-xs text-metallic-500">SKU: {item.product.sku}</span>
                        )}
                      </div>
                      <p className="text-sm text-metallic-600">Qtd: {item.quantity}</p>
                      <div className="flex items-center gap-2 text-sm text-metallic-700 mt-2">
                        <MapPin className="h-4 w-4 text-primary-600" />
                        <span>{formatLocation(item.product.stockLocation)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                {order.status === 'CONFIRMED' && (
                  <Button
                    onClick={() => updateStatus(order.id, 'PROCESSING')}
                    disabled={updatingId === order.id}
                    className="flex-1"
                  >
                    {updatingId === order.id ? 'Atualizando...' : 'Marcar em separação'}
                  </Button>
                )}
                {['CONFIRMED', 'PROCESSING'].includes(order.status) && (
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(order.id, 'SHIPPED')}
                    disabled={updatingId === order.id}
                    className="flex-1"
                  >
                    {updatingId === order.id ? 'Atualizando...' : 'Enviar ao ponto de coleta'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
