'use client';

import { useCallback, useEffect, useMemo, useState, useId } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Package, MapPin, Search, FileText, Printer,
  RefreshCw, Send, Truck, ClipboardList, ExternalLink,
  ArrowRight, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { statusBadgeClass, statusToPt } from '@/lib/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { PickingReportTable, type PickingReportItem } from '@/components/admin/picking-report-table';
import { PickingReportModal } from '@/components/admin/picking-report-modal';
import { PickingTrackingModal } from '@/components/admin/picking-tracking-modal';

type OrderItem = {
  id: string;
  quantity: number;
  price?: number;
  product: {
    id: string;
    name: string;
    sku?: string | null;
    stockLocation?: string | null;
    imageUrl?: string | null;
  };
};

type KanbanOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  shipping: number;
  total?: number;
  shippingAddress?: any;
  melhorEnvioLabelUrl?: string | null;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items: OrderItem[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function formatAddress(address: any) {
  if (!address) return '—';
  return [address.street, address.number, address.neighborhood, address.city, address.state]
    .filter(Boolean).join(', ');
}

// ─── Kanban column shell ─────────────────────────────────────────────────────

function KanbanColumn({
  title, count, headerClass, icon, extra, loading, children,
}: {
  title: string;
  count: number;
  headerClass: string;
  icon: React.ReactNode;
  extra?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-gray-50/50">
      <div className={`flex items-center justify-between px-4 py-3 border-b ${headerClass}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm">{title}</span>
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold bg-white/70">
            {count}
          </span>
        </div>
        {extra}
      </div>
      <div className="overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-280px)] lg:max-h-[calc(100vh-240px)]">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
      <Package className="h-8 w-8 mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── Card: Pedido confirmado ──────────────────────────────────────────────────

function ConfirmedCard({ order, isUpdating, onStart }: {
  order: KanbanOrder;
  isUpdating: boolean;
  onStart: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-blue-100 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <p className="font-bold text-sm text-gray-900">{order.orderNumber}</p>
          <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>
      {order.user?.name && (
        <p className="text-sm text-gray-700 font-medium truncate mb-1">{order.user.name}</p>
      )}
      {order.shippingAddress && (
        <p className="text-xs text-gray-400 truncate flex items-center gap-0.5 mb-2">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          {formatAddress(order.shippingAddress)}
        </p>
      )}
      <Button size="sm" className="w-full gap-1.5 mt-1" onClick={onStart} disabled={isUpdating}>
        {isUpdating
          ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Iniciando…</>
          : <><ArrowRight className="h-3.5 w-3.5" />Iniciar Separação</>}
      </Button>
    </div>
  );
}

// ─── Card: Em separação ───────────────────────────────────────────────────────

function ProcessingCard({
  order, isUpdating, isGenerating, isSending,
  onMarkShipped, onGenerateLabel, onPrintLabel, onSendLabel,
}: {
  order: KanbanOrder;
  isUpdating: boolean;
  isGenerating: boolean;
  isSending: boolean;
  onMarkShipped: () => void;
  onGenerateLabel: () => void;
  onPrintLabel: () => void;
  onSendLabel: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <p className="font-bold text-sm text-gray-900">{order.orderNumber}</p>
          <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
        </div>
        {order.user?.name && (
          <p className="text-xs text-gray-600 font-medium truncate max-w-[130px] flex-shrink-0">{order.user.name}</p>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-1.5 mb-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.product.imageUrl ? (
                <Image src={item.product.imageUrl} alt={item.product.name} width={28} height={28} className="object-cover w-full h-full" />
              ) : (
                <Package className="h-3 w-3 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate leading-tight">{item.product.name}</p>
              {item.product.stockLocation ? (
                <p className="text-gray-400 flex items-center gap-0.5 leading-tight">
                  <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                  {item.product.stockLocation}
                </p>
              ) : (
                <p className="text-gray-300 leading-tight italic">Sem localização</p>
              )}
            </div>
            <span className="font-bold text-gray-700 flex-shrink-0">×{item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Label section */}
      {order.shipping > 0 && (
        <div className="border-t border-gray-100 pt-2 mb-2">
          {order.trackingCode && (
            <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium mb-1.5">
              {order.trackingCode}
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {order.melhorEnvioLabelUrl ? (
              <>
                <Button size="sm" onClick={onPrintLabel} className="h-7 text-xs gap-1 px-2">
                  <Printer className="h-3 w-3" />Imprimir
                </Button>
                <Button size="sm" variant="outline" onClick={onSendLabel} disabled={isSending} className="h-7 text-xs gap-1 px-2">
                  <Send className="h-3 w-3" />{isSending ? 'Enviando…' : 'Enviar cliente'}
                </Button>
                <Button size="sm" variant="outline" onClick={onGenerateLabel} disabled={isGenerating} className="h-7 text-xs gap-1 px-2">
                  <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerar
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={onGenerateLabel} disabled={isGenerating} className="h-7 text-xs gap-1 px-2">
                <FileText className="h-3 w-3" />{isGenerating ? 'Gerando…' : 'Gerar etiqueta'}
              </Button>
            )}
          </div>
        </div>
      )}

      <Button size="sm" className="w-full gap-1.5" onClick={onMarkShipped} disabled={isUpdating}>
        {isUpdating
          ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Atualizando…</>
          : <><Truck className="h-3.5 w-3.5" />Marcar como Enviado</>}
      </Button>
    </div>
  );
}

// ─── Card: Enviado ────────────────────────────────────────────────────────────

function ShippedCard({ order }: { order: KanbanOrder }) {
  return (
    <div className="bg-white rounded-lg border border-green-200 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p className="font-bold text-sm text-gray-900">{order.orderNumber}</p>
          <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClass(order.status)}`}>
          {statusToPt(order.status)}
        </span>
      </div>
      {order.user?.name && (
        <p className="text-sm text-gray-700 font-medium truncate mb-1">{order.user.name}</p>
      )}
      {order.trackingCode && (
        <p className="text-xs text-gray-500 mb-1">
          Rastreio: <span className="font-mono text-gray-700">{order.trackingCode}</span>
        </p>
      )}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
        {order.trackingUrl && (
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />Ver rastreio
          </a>
        )}
        <Link
          href={`/admin/orders/${order.id}`}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 hover:underline ml-auto"
        >
          Detalhes
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OperadorPage() {
  const searchId = useId();

  const [pickingOrders, setPickingOrders] = useState<KanbanOrder[]>([]);
  const [shippedOrders, setShippedOrders] = useState<KanbanOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [generatingLabelId, setGeneratingLabelId] = useState<string | null>(null);
  const [sendingLabelId, setSendingLabelId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(false);

  const [trackingModal, setTrackingModal] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
  } | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pickingRes, shippedRes] = await Promise.all([
        apiClient.get<{ orders: KanbanOrder[]; pagination?: any }>('/api/admin/picking', {
          params: { limit: 50, sort: 'desc' },
        }),
        fetch('/api/admin/orders/shipped?limit=30&page=1').then((r) => r.json()),
      ]);
      setPickingOrders(pickingRes.data.orders || []);
      setShippedOrders(shippedRes.orders || []);
    } catch {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmedOrders = useMemo(
    () => pickingOrders.filter((o) => o.status === 'CONFIRMED'),
    [pickingOrders],
  );
  const processingOrders = useMemo(
    () => pickingOrders.filter((o) => o.status === 'PROCESSING'),
    [pickingOrders],
  );

  const filter = (list: KanbanOrder[]) =>
    !searchTerm
      ? list
      : list.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
        );

  const filteredConfirmed = useMemo(() => filter(confirmedOrders), [confirmedOrders, searchTerm]);
  const filteredProcessing = useMemo(() => filter(processingOrders), [processingOrders, searchTerm]);
  const filteredShipped = useMemo(() => filter(shippedOrders), [shippedOrders, searchTerm]);

  const pickingReport = useMemo<PickingReportItem[]>(() => {
    const map = new Map<string, PickingReportItem>();
    pickingOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.product.id}-${item.product.stockLocation || 'sem-local'}`;
        const existing = map.get(key);
        map.set(key, {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          location: item.product.stockLocation || 'Sem localização cadastrada',
          quantity: (existing?.quantity || 0) + item.quantity,
          orders: [...(existing?.orders || []), { orderNumber: order.orderNumber, quantity: item.quantity }],
        });
      });
    });
    return Array.from(map.values());
  }, [pickingOrders]);

  const updateStatus = async (orderId: string, status: 'PROCESSING' | 'SHIPPED', code?: string, url?: string) => {
    setUpdatingId(orderId);
    try {
      const res = await apiClient.patch(`/api/admin/picking/${orderId}`, {
        status,
        trackingCode: code || undefined,
        trackingUrl: url || undefined,
      });
      const updated = res.data;

      if (status === 'PROCESSING') {
        setPickingOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'PROCESSING' } : o)));
        toast.success('Pedido movido para Separação');
      } else {
        const order = pickingOrders.find((o) => o.id === orderId);
        setPickingOrders((prev) => prev.filter((o) => o.id !== orderId));
        if (order) {
          setShippedOrders((prev) => [
            { ...order, status: 'SHIPPED', trackingCode: updated.trackingCode, trackingUrl: updated.trackingUrl },
            ...prev,
          ]);
        }
        toast.success('Pedido marcado como Enviado');
      }

      setTrackingModal(null);
      setTrackingCode('');
      setTrackingUrl('');
    } catch {
      toast.error('Não foi possível atualizar o status');
    } finally {
      setUpdatingId(null);
    }
  };

  const openTrackingModal = (order: KanbanOrder) => {
    setTrackingModal({ open: true, orderId: order.id, orderNumber: order.orderNumber });
    setTrackingCode(order.trackingCode || '');
    setTrackingUrl(order.trackingUrl || '');
  };

  const generateLabel = async (orderId: string) => {
    setGeneratingLabelId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/label`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Etiqueta gerada!');
        setPickingOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, melhorEnvioLabelUrl: data.labelUrl, trackingCode: data.trackingCode }
              : o,
          ),
        );
      } else {
        toast.error(data.error || 'Erro ao gerar etiqueta');
      }
    } catch {
      toast.error('Erro ao gerar etiqueta');
    } finally {
      setGeneratingLabelId(null);
    }
  };

  const sendLabelToCustomer = async (orderId: string) => {
    setSendingLabelId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/send-label`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Etiqueta enviada ao cliente!');
      } else {
        toast.error(data.error || 'Erro ao enviar etiqueta');
      }
    } catch {
      toast.error('Erro ao enviar etiqueta');
    } finally {
      setSendingLabelId(null);
    }
  };

  const exportPdf = async () => {
    if (pickingOrders.length === 0) return;
    try {
      const pdfOrders = pickingOrders.map((o) => ({
        orderNumber: o.orderNumber,
        customerName: o.user?.name || undefined,
        createdAt: new Date(o.createdAt).toLocaleString('pt-BR'),
        items: o.items.map((i) => ({
          name: i.product.name,
          sku: i.product.sku,
          location: i.product.stockLocation || 'Sem localização cadastrada',
          quantity: i.quantity,
        })),
      }));
      const res = await fetch('/api/admin/picking/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: pdfOrders }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const disp = res.headers.get('Content-Disposition') ?? '';
      const match = disp.match(/filename="([^"]+)"/);
      link.download = match ? match[1] : `picking-${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF gerado com sucesso');
    } catch {
      toast.error('Não foi possível gerar o PDF');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operador</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de pedidos em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <label htmlFor={searchId} className="sr-only">Buscar pedido ou cliente</label>
            <Input
              id={searchId}
              placeholder="Buscar pedido ou cliente…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 whitespace-nowrap">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Coluna 1: Pedido confirmado ───────────────────────────────── */}
        <KanbanColumn
          title="Pedido confirmado"
          count={filteredConfirmed.length}
          headerClass="bg-blue-50 border-blue-200 text-blue-800"
          icon={<Package className="h-4 w-4" />}
          loading={loading}
        >
          {!loading && filteredConfirmed.length === 0 && <EmptyColumn text="Nenhum pedido confirmado" />}
          {filteredConfirmed.map((order) => (
            <ConfirmedCard
              key={order.id}
              order={order}
              isUpdating={updatingId === order.id}
              onStart={() => updateStatus(order.id, 'PROCESSING')}
            />
          ))}
        </KanbanColumn>

        {/* ── Coluna 2: Separação ───────────────────────────────────────── */}
        <KanbanColumn
          title="Separação"
          count={filteredProcessing.length}
          headerClass="bg-amber-50 border-amber-200 text-amber-800"
          icon={<ClipboardList className="h-4 w-4" />}
          loading={loading}
          extra={
            pickingReport.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReportExpanded((v) => !v)}
                className="h-7 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <FileText className="h-3.5 w-3.5" />
                Relatório de Picking
              </Button>
            ) : undefined
          }
        >
          {/* Relatório de picking expandível */}
          {reportExpanded && !loading && (
            <div className="mb-1">
              <PickingReportTable
                report={pickingReport}
                preview
                onExportPdf={exportPdf}
                onShowAll={() => setShowReportModal(true)}
              />
            </div>
          )}
          {!loading && filteredProcessing.length === 0 && <EmptyColumn text="Nenhum pedido em separação" />}
          {filteredProcessing.map((order) => (
            <ProcessingCard
              key={order.id}
              order={order}
              isUpdating={updatingId === order.id}
              isGenerating={generatingLabelId === order.id}
              isSending={sendingLabelId === order.id}
              onMarkShipped={() => openTrackingModal(order)}
              onGenerateLabel={() => generateLabel(order.id)}
              onPrintLabel={() => window.open(order.melhorEnvioLabelUrl!, '_blank')}
              onSendLabel={() => sendLabelToCustomer(order.id)}
            />
          ))}
        </KanbanColumn>

        {/* ── Coluna 3: Enviado ─────────────────────────────────────────── */}
        <KanbanColumn
          title="Enviado"
          count={filteredShipped.length}
          headerClass="bg-green-50 border-green-200 text-green-800"
          icon={<CheckCircle2 className="h-4 w-4" />}
          loading={loading}
        >
          {!loading && filteredShipped.length === 0 && <EmptyColumn text="Nenhum pedido enviado recente" />}
          {filteredShipped.map((order) => (
            <ShippedCard key={order.id} order={order} />
          ))}
        </KanbanColumn>

      </div>

      {/* Modals */}
      {showReportModal && (
        <PickingReportModal report={pickingReport} onClose={() => setShowReportModal(false)} />
      )}

      {trackingModal?.open && (
        <PickingTrackingModal
          orderNumber={trackingModal.orderNumber}
          orderId={trackingModal.orderId}
          trackingCode={trackingCode}
          trackingUrl={trackingUrl}
          isUpdating={updatingId === trackingModal.orderId}
          onClose={() => setTrackingModal(null)}
          onTrackingCodeChange={setTrackingCode}
          onTrackingUrlChange={setTrackingUrl}
          onConfirm={() =>
            updateStatus(trackingModal.orderId, 'SHIPPED', trackingCode, trackingUrl)
          }
        />
      )}
    </div>
  );
}
