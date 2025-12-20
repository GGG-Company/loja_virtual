'use client';

import { useEffect, useState } from 'react';
import { statusBadgeClass, statusToPt, paymentToPt } from '@/lib/i18n';
import { Package, Truck, User, Mail, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    sku?: string | null;
    specs?: any;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  shipping: number;
  discount: number;
  createdAt: string;
  shippingAddress: any;
  paymentMethod: string;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items: OrderItem[];
}

export default function ShippedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/orders/shipped')
      .then((res) => res.json())
      .then((data) => setOrders(data))
      .finally(() => setLoading(false));
  }, []);

  const formatAddress = (address: any) => {
    if (!address) return 'Endereço não informado';
    const parts = [address.street, address.number, address.neighborhood, address.city, address.state, address.zip];
    return parts.filter(Boolean).join(', ');
  };

  if (loading) {
    return <div className="container mx-auto p-6">Carregando pedidos enviados...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-metallic-900">Pedidos Enviados</h1>
          <p className="text-sm text-metallic-600">Inclui enviados, entregues e cancelados</p>
        </div>
        <Link href="/admin/orders" className="text-primary-600 text-sm hover:underline">Voltar para pedidos</Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 flex items-center gap-3 text-metallic-700">
          <Truck className="h-5 w-5 text-metallic-500" />
          Nenhum pedido enviado até o momento.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-5 border border-metallic-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <p className="text-sm text-metallic-600">Pedido</p>
                  <h2 className="text-xl font-semibold text-metallic-900">{order.orderNumber}</h2>
                  <p className="text-sm text-metallic-600">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass(order.status)}`}>
                    {statusToPt(order.status)}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-3 bg-metallic-50 border border-metallic-100 rounded-lg p-3">
                <div className="flex items-start gap-2 text-sm text-metallic-700">
                  <User className="h-4 w-4 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-metallic-900">Cliente</p>
                    <p>{order.user?.name || 'Sem nome'}</p>
                    <div className="flex items-center gap-1 text-xs text-metallic-600">
                      <Mail className="h-3 w-3" />
                      <span>{order.user?.email || 'Sem e-mail'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-metallic-600">
                      <Phone className="h-3 w-3" />
                      <span>{order.user?.phone || 'Sem telefone'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-metallic-700">
                  <MapPin className="h-4 w-4 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-metallic-900">Entrega</p>
                    <p>{formatAddress(order.shippingAddress)}</p>
                    {order.trackingCode && (
                      <p className="text-xs text-metallic-600 mt-1">Rastreio: {order.trackingCode}</p>
                    )}
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-700 underline"
                      >
                        Ver rastreio
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid md:grid-cols-3 gap-3">
                <div className="bg-metallic-50 rounded-lg p-3 border border-metallic-100">
                  <p className="text-sm text-metallic-600">Pagamento</p>
                  <p className="font-semibold text-metallic-900">{paymentToPt(order.paymentMethod)}</p>
                </div>
                <div className="bg-metallic-50 rounded-lg p-3 border border-metallic-100">
                  <p className="text-sm text-metallic-600">Total</p>
                  <p className="font-semibold text-metallic-900">R$ {order.total.toFixed(2)}</p>
                </div>
                <div className="bg-metallic-50 rounded-lg p-3 border border-metallic-100">
                  <p className="text-sm text-metallic-600">Frete / Desconto</p>
                  <p className="font-semibold text-metallic-900">Frete R$ {order.shipping.toFixed(2)} | Desc R$ {order.discount.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-metallic-100 pt-3 space-y-2">
                <p className="font-semibold text-metallic-900">Itens</p>
                {order.items.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-metallic-700">
                    <div className="flex-1">
                      <span className="font-medium text-metallic-900">{item.product.name}</span>
                      {item.product.sku && <span className="ml-2 text-xs text-metallic-500">SKU: {item.product.sku}</span>}
                      {item.product.specs && (
                        <span className="ml-2 text-xs text-metallic-500">Specs: {JSON.stringify(item.product.specs)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 sm:mt-0">
                      <span>Qtd: {item.quantity}</span>
                      <span>Preço: R$ {item.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
