"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { statusToPt, statusBadgeClass, paymentToPt } from '@/lib/i18n';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  createdAt: string;
  paymentMethod: string;
  shippingAddress: any;
  user: { name: string | null; email: string };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    subtotal: number;
    product: { name: string; imageUrl?: string | null; price: number };
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/admin/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => setOrder(data))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div className="container mx-auto p-6">Carregando pedido...</div>;
  if (!order) return <div className="container mx-auto p-6">Pedido não encontrado</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Pedido</p>
          <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500 mt-1">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
        </div>
        <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass(order.status)}`}
            >
              {statusToPt(order.status)}
            </span>
          <Link href="/admin/orders" className="text-primary-600 text-sm hover:underline">
            Voltar
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Itens</h2>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">Qtd: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Preço: R$ {item.price.toFixed(2)}</p>
                    <p className="font-semibold">Subtotal: R$ {item.subtotal.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Endereço de Entrega</h2>
            <p className="text-sm text-gray-700">{order.shippingAddress?.name}</p>
            <p className="text-sm text-gray-700">{order.shippingAddress?.email}</p>
            <p className="text-sm text-gray-700">{order.shippingAddress?.phone}</p>
            <p className="text-sm text-gray-700">CPF: {order.shippingAddress?.cpf}</p>
            <p className="text-sm text-gray-700 mt-2">
              {order.shippingAddress?.street}, {order.shippingAddress?.number}
              {order.shippingAddress?.complement ? ` - ${order.shippingAddress?.complement}` : ''}
            </p>
            <p className="text-sm text-gray-700">
              {order.shippingAddress?.neighborhood} - {order.shippingAddress?.city}/{order.shippingAddress?.state}
            </p>
            <p className="text-sm text-gray-700">CEP: {order.shippingAddress?.zip}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Pagamento</h2>
            <p className="text-sm text-gray-700">{paymentToPt(order.paymentMethod)}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 space-y-2">
            <h2 className="text-lg font-semibold mb-1">Resumo</h2>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Subtotal</span>
              <span>R$ {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Frete</span>
              <span>R$ {order.shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Descontos</span>
              <span>R$ {order.discount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-base font-bold">
              <span>Total</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
