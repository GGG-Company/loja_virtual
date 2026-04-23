"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { statusToPt, statusBadgeClass, paymentToPt } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Truck, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
  shippingServiceId?: string | null;
  melhorEnvioOrderId?: string | null;
  melhorEnvioLabelUrl?: string | null;
  melhorEnvioStatus?: string | null;
  melhorEnvioService?: string | null;
  trackingCode?: string | null;
  trackingUrl?: string | null;
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
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [labelInfo, setLabelInfo] = useState<{
    hasLabel: boolean;
    labelUrl?: string;
    trackingCode?: string;
    melhorEnvioStatus?: string;
  } | null>(null);

  const checkLabelStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/label`);
      const data = await res.json();
      if (data.success) {
        setLabelInfo({
          hasLabel: data.hasLabel,
          labelUrl: data.labelUrl,
          trackingCode: data.trackingCode,
          melhorEnvioStatus: data.melhorEnvioStatus,
        });
      }
    } catch (e) {
      console.error("Erro ao verificar etiqueta:", e);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/admin/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        setOrder({
          ...data,
          total: parseFloat(String(data.total ?? 0)) || 0,
          subtotal: parseFloat(String(data.subtotal ?? 0)) || 0,
          shipping: parseFloat(String(data.shipping ?? 0)) || 0,
          discount: parseFloat(String(data.discount ?? 0)) || 0,
          items: (data.items ?? []).map((i: any) => ({
            ...i,
            price: parseFloat(String(i.price ?? 0)) || 0,
            subtotal: parseFloat(String(i.subtotal ?? 0)) || 0,
          })),
        });
        // Verificar info da etiqueta
        checkLabelStatus();
      })
      .finally(() => setLoading(false));
  }, [orderId, checkLabelStatus]);

  const handleGenerateLabel = async () => {
    setGeneratingLabel(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/label`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Etiqueta gerada com sucesso!");
        setLabelInfo({
          hasLabel: true,
          labelUrl: data.labelUrl,
          trackingCode: data.trackingCode,
        });
        // Recarregar pedido para atualizar dados
        const orderRes = await fetch(`/api/admin/orders/${orderId}`);
        const orderData = await orderRes.json();
        setOrder({
          ...orderData,
          total: parseFloat(String(orderData.total ?? 0)) || 0,
          subtotal: parseFloat(String(orderData.subtotal ?? 0)) || 0,
          shipping: parseFloat(String(orderData.shipping ?? 0)) || 0,
          discount: parseFloat(String(orderData.discount ?? 0)) || 0,
          items: (orderData.items ?? []).map((i: any) => ({
            ...i,
            price: parseFloat(String(i.price ?? 0)) || 0,
            subtotal: parseFloat(String(i.subtotal ?? 0)) || 0,
          })),
        });
      } else {
        toast.error(data.error || "Erro ao gerar etiqueta");
      }
    } catch (e) {
      console.error("Erro ao gerar etiqueta:", e);
      toast.error("Erro ao gerar etiqueta");
    } finally {
      setGeneratingLabel(false);
    }
  };

  const handlePrintLabel = () => {
    if (labelInfo?.labelUrl) {
      window.open(labelInfo.labelUrl, "_blank");
    } else if (order?.melhorEnvioLabelUrl) {
      window.open(order.melhorEnvioLabelUrl, "_blank");
    }
  };

  if (loading) return <div className="container mx-auto p-6">Carregando pedido...</div>;
  if (!order) return <div className="container mx-auto p-6">Pedido não encontrado</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Pedido</p>
          <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500 mt-1">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass(order.status)}`}>{statusToPt(order.status)}</span>
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
                    <p className="text-sm text-gray-500">Preço: R$ {Number(item.price).toFixed(2)}</p>
                    <p className="font-semibold">Subtotal: R$ {Number(item.subtotal).toFixed(2)}</p>
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
              {order.shippingAddress?.complement ? ` - ${order.shippingAddress?.complement}` : ""}
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

          {/* Seção de Etiqueta de Envio */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Etiqueta de Envio
            </h2>

            {order.trackingCode && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Rastreio:</strong> {order.trackingCode}
                </p>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink className="h-3 w-3" />
                    Ver rastreamento
                  </a>
                )}
              </div>
            )}

            {order.melhorEnvioService && (
              <p className="text-sm text-gray-600 mb-2">
                Serviço: <strong>{order.melhorEnvioService}</strong>
              </p>
            )}

            {labelInfo?.melhorEnvioStatus && (
              <p className="text-sm text-gray-600 mb-3">
                Status ME: <span className="font-medium">{labelInfo.melhorEnvioStatus}</span>
              </p>
            )}

            <div className="flex flex-col gap-2">
              {labelInfo?.hasLabel || order.melhorEnvioLabelUrl ? (
                <Button onClick={handlePrintLabel} className="w-full">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Etiqueta
                </Button>
              ) : order.shipping > 0 ? (
                <Button onClick={handleGenerateLabel} disabled={generatingLabel} className="w-full">
                  {generatingLabel ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Etiqueta
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-xs text-gray-500 text-center">Pedido sem frete (retirada na loja)</p>
              )}

              {(labelInfo?.hasLabel || order.melhorEnvioLabelUrl) && (
                <Button variant="outline" onClick={handleGenerateLabel} disabled={generatingLabel} size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${generatingLabel ? "animate-spin" : ""}`} />
                  Regenerar Etiqueta
                </Button>
              )}
            </div>
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
              <span>R$ {Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
