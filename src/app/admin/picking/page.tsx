'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Package, MapPin, Phone, Mail, MapPinned,
  Search, FileText, Printer, RefreshCw, Send,
  ChevronLeft, ChevronRight, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { statusToPt, statusBadgeClass } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { PickingReportTable, type PickingReportItem } from '@/components/admin/picking-report-table';
import { PickingReportModal } from '@/components/admin/picking-report-modal';
import { PickingTrackingModal } from '@/components/admin/picking-tracking-modal';

type PickingItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
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
  shipping: number;
  shippingAddress?: any;
  melhorEnvioLabelUrl?: string | null;
  melhorEnvioStatus?: string | null;
  trackingCode?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items: PickingItem[];
};

const STATUS_DISPLAY: Record<string, string> = {
  CONFIRMED: 'Pronto para separar',
  PROCESSING: 'Em separação',
};

export default function AdminPickingPage() {
  const searchId = useId();
  const sortId = useId();

  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [generatingLabelId, setGeneratingLabelId] = useState<string | null>(null);
  const [sendingLabelId, setSendingLabelId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showAllModal, setShowAllModal] = useState(false);

  const [trackingModal, setTrackingModal] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
  } | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  const pickingReport = useMemo<PickingReportItem[]>(() => {
    const map = new Map<string, PickingReportItem>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.product.id}-${item.product.stockLocation || 'sem-local'}`;
        const existing = map.get(key);
        map.set(key, {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          location: item.product.stockLocation || 'Sem localização cadastrada',
          quantity: (existing?.quantity || 0) + item.quantity,
        });
      });
    });
    return Array.from(map.values());
  }, [orders]);

  useEffect(() => {
    const fetchPicking = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<{
          orders: PickingOrder[];
          pagination?: { pages?: number };
        }>('/api/admin/picking', {
          params: { page, limit: 10, search: searchTerm || undefined, sort: sortOrder },
        });
        setOrders(response.data.orders || []);
        setTotalPages(response.data.pagination?.pages || 1);
      } catch (error) {
        console.error('Erro ao carregar picking:', error);
        toast.error('Erro ao carregar pedidos para separação');
      } finally {
        setLoading(false);
      }
    };
    fetchPicking();
  }, [page, searchTerm, sortOrder]);

  const formatAddress = (address: any) => {
    if (!address) return 'Endereço não cadastrado';
    return [address.street, address.number, address.neighborhood, address.city, address.state, address.zip]
      .filter(Boolean)
      .join(', ');
  };

  const updateStatus = async (
    orderId: string,
    status: 'PROCESSING' | 'SHIPPED',
    code?: string,
    url?: string
  ) => {
    setUpdatingId(orderId);
    try {
      const response = await apiClient.patch(`/api/admin/picking/${orderId}`, {
        status,
        trackingCode: code || undefined,
        trackingUrl: url || undefined,
      });
      const updated = response.data;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: updated.status, shippedAt: updated.shippedAt, trackingCode: updated.trackingCode }
            : o
        )
      );
      toast.success(
        status === 'PROCESSING' ? 'Pedido marcado em separação' : 'Pedido enviado para ponto de coleta'
      );
      if (trackingModal?.open) {
        setTrackingModal(null);
        setTrackingCode('');
        setTrackingUrl('');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Não foi possível atualizar o status');
    } finally {
      setUpdatingId(null);
    }
  };

  const openTrackingModal = (orderId: string, orderNumber: string) => {
    setTrackingModal({ open: true, orderId, orderNumber });
    setTrackingCode('');
    setTrackingUrl('');
  };

  const generateLabel = async (orderId: string) => {
    setGeneratingLabelId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/label`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Etiqueta gerada com sucesso!');
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, melhorEnvioLabelUrl: data.labelUrl, trackingCode: data.trackingCode, melhorEnvioStatus: 'generated' }
              : o
          )
        );
      } else {
        toast.error(data.error || 'Erro ao gerar etiqueta');
      }
    } catch (error) {
      console.error('Erro ao gerar etiqueta:', error);
      toast.error('Erro ao gerar etiqueta');
    } finally {
      setGeneratingLabelId(null);
    }
  };

  const printLabel = (url?: string | null) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('URL da etiqueta não disponível');
    }
  };

  const sendLabelToCustomer = async (orderId: string) => {
    setSendingLabelId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-label`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success('Etiqueta enviada para o cliente com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao enviar etiqueta');
      }
    } catch (error) {
      console.error('Erro ao enviar etiqueta:', error);
      toast.error('Erro ao enviar etiqueta para o cliente');
    } finally {
      setSendingLabelId(null);
    }
  };

  const exportPdf = async () => {
    if (pickingReport.length === 0) return;
    try {
      const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');
      const styles = StyleSheet.create({
        page: { padding: 24, fontSize: 9, color: '#111' },
        title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
        subtitle: { fontSize: 9, color: '#555', marginBottom: 12 },
        header: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#333', paddingBottom: 6, marginBottom: 6, backgroundColor: '#f5f5f5' },
        row: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderColor: '#ddd', minHeight: 20 },
        colName: { width: '40%', paddingRight: 8 },
        colSku: { width: '18%', paddingRight: 8 },
        colLocation: { width: '32%', paddingRight: 8 },
        colQty: { width: '10%', textAlign: 'right' },
        bold: { fontWeight: 'bold' },
      });
      const generatedAt = new Date().toLocaleString('pt-BR');
      const doc = (
        <Document>
          <Page size="A4" orientation="landscape" style={styles.page}>
            <Text style={styles.title}>Relatório de Picking</Text>
            <Text style={styles.subtitle}>Gerado em {generatedAt}</Text>
            <View style={styles.header}>
              <Text style={[styles.colName, styles.bold]}>Produto</Text>
              <Text style={[styles.colSku, styles.bold]}>SKU</Text>
              <Text style={[styles.colLocation, styles.bold]}>Endereço</Text>
              <Text style={[styles.colQty, styles.bold]}>Qtd</Text>
            </View>
            {pickingReport.map((item) => (
              <View key={`${item.id}-${item.location}`} style={styles.row} wrap={false}>
                <Text style={styles.colName}>{item.name}</Text>
                <Text style={styles.colSku}>{item.sku || '-'}</Text>
                <Text style={styles.colLocation}>{item.location}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
              </View>
            ))}
          </Page>
        </Document>
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `picking-report-${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF gerado');
    } catch (error) {
      console.error('Erro ao gerar PDF', error);
      toast.error('Não foi possível gerar o PDF');
    }
  };

  const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED').length;
  const processingCount = orders.filter((o) => o.status === 'PROCESSING').length;

  return (
    <div className="container mx-auto p-6 space-y-5">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Separação de Pedidos</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">Pedidos confirmados ou em separação</p>
            {!loading && (
              <div role="status" aria-live="polite" aria-label="Contagem de pedidos" className="flex items-center gap-2">
                {confirmedCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-semibold px-2.5 py-0.5">
                    {confirmedCount} confirmado{confirmedCount !== 1 ? 's' : ''}
                  </span>
                )}
                {processingCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5">
                    {processingCount} em separação
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div>
            <label htmlFor={sortId} className="sr-only">Ordenar por</label>
            <select
              id={sortId}
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value as 'desc' | 'asc'); setPage(1); }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              aria-label="Ordenar pedidos"
            >
              <option value="desc">Mais recentes primeiro</option>
              <option value="asc">Mais antigos primeiro</option>
            </select>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
            <label htmlFor={searchId} className="sr-only">Buscar pedido ou cliente</label>
            <Input
              id={searchId}
              placeholder="Buscar pedido ou cliente…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-10"
              aria-label="Buscar pedido ou cliente"
            />
          </div>
        </div>
      </div>

      {/* ── Picking report summary ───────────────────────────────────────── */}
      <PickingReportTable
        report={pickingReport}
        preview
        onExportPdf={exportPdf}
        onShowAll={() => setShowAllModal(true)}
      />

      {/* ── Orders list ─────────────────────────────────────────────────── */}
      <div className="relative min-h-24">
        {/* Loading overlay */}
        {loading && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Carregando pedidos"
            className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl"
          >
            <div className="flex items-center gap-2 text-gray-600">
              <span className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-primary-600 animate-spin" aria-hidden="true" />
              <span className="text-sm font-medium">Carregando…</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {orders.length === 0 && !loading && (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-xl">
              <Package className="h-8 w-8 text-gray-300" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">Nenhum pedido aguardando separação</p>
              <p className="text-sm text-gray-400 mt-0.5">
                {searchTerm ? 'Tente outro termo de busca.' : 'Todos os pedidos confirmados aparecerão aqui.'}
              </p>
            </div>
          </div>
        )}

        {/* Order cards */}
        {orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const isUpdating = updatingId === order.id;
              const isGenerating = generatingLabelId === order.id;
              const isSending = sendingLabelId === order.id;

              return (
                <article
                  key={order.id}
                  aria-label={`Pedido ${order.orderNumber}`}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Pedido</span>
                        <h2 className="text-lg font-bold text-gray-900">{order.orderNumber}</h2>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Criado em{' '}
                        <time dateTime={order.createdAt}>
                          {new Date(order.createdAt).toLocaleString('pt-BR')}
                        </time>
                        {order.user?.name && (
                          <> · <span className="text-gray-700 font-medium">{order.user.name}</span></>
                        )}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${statusBadgeClass(order.status)}`}
                      aria-label={`Status: ${STATUS_DISPLAY[order.status] || statusToPt(order.status)}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" aria-hidden="true" />
                      {STATUS_DISPLAY[order.status] || statusToPt(order.status)}
                    </span>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {/* Contact + Address */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                        <Phone className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div>
                          <p className="font-semibold text-gray-800 mb-0.5">Contato</p>
                          <p className="text-gray-600">{order.user?.phone || 'Sem telefone'}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Mail className="h-3 w-3" aria-hidden="true" />
                            <span>{order.user?.email || 'Sem e-mail'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                        <MapPinned className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div>
                          <p className="font-semibold text-gray-800 mb-0.5">Endereço de entrega</p>
                          <p className="text-gray-600">{formatAddress(order.shippingAddress)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Itens para separar ({order.items.length})
                      </p>
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex gap-3 items-start p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                            <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                              {item.product.imageUrl ? (
                                <Image
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  width={56}
                                  height={56}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-gray-400" aria-hidden="true" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-gray-900 text-sm">{item.product.name}</p>
                                {item.product.sku && (
                                  <span className="text-xs text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                                    SKU: {item.product.sku}
                                  </span>
                                )}
                                <span className="ml-auto text-xs font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                                  Qtd: {item.quantity}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600">
                                <MapPin className="h-3.5 w-3.5 text-primary-400 flex-shrink-0" aria-hidden="true" />
                                <span>{item.product.stockLocation || 'Sem localização cadastrada'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Label section */}
                    {order.shipping > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-primary-500" aria-hidden="true" />
                            <span className="font-medium text-gray-800">Etiqueta de envio</span>
                            {order.trackingCode && (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                {order.trackingCode}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {order.melhorEnvioLabelUrl ? (
                              <>
                                <Button size="sm" onClick={() => printLabel(order.melhorEnvioLabelUrl)} className="gap-1.5">
                                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                                  Imprimir
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendLabelToCustomer(order.id)}
                                  disabled={isSending}
                                  className="gap-1.5"
                                  aria-label="Enviar etiqueta ao cliente por e-mail"
                                >
                                  <Send className={`h-3.5 w-3.5 ${isSending ? 'animate-pulse' : ''}`} aria-hidden="true" />
                                  {isSending ? 'Enviando…' : 'Enviar ao cliente'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => generateLabel(order.id)}
                                  disabled={isGenerating}
                                  className="gap-1.5"
                                  aria-label="Regenerar etiqueta de envio"
                                >
                                  <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
                                  Regenerar
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => generateLabel(order.id)}
                                disabled={isGenerating}
                                className="gap-1.5"
                              >
                                {isGenerating ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                    Gerando…
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                    Gerar etiqueta
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status action buttons */}
                    {['CONFIRMED', 'PROCESSING'].includes(order.status) && (
                      <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-2">
                        {order.status === 'CONFIRMED' && (
                          <Button
                            onClick={() => updateStatus(order.id, 'PROCESSING')}
                            disabled={isUpdating}
                            className="flex-1 gap-2"
                          >
                            {isUpdating ? (
                              <>
                                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                                Atualizando…
                              </>
                            ) : (
                              'Iniciar separação'
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => openTrackingModal(order.id, order.orderNumber)}
                          disabled={isUpdating}
                          className="flex-1 gap-2"
                        >
                          {isUpdating ? 'Atualizando…' : 'Marcar como enviado'}
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <nav aria-label="Paginação de pedidos" className="flex items-center justify-between">
          <p className="text-sm text-gray-500" aria-live="polite">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages}
              aria-label="Próxima página"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Próxima
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showAllModal && (
        <PickingReportModal report={pickingReport} onClose={() => setShowAllModal(false)} />
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
          onConfirm={() => updateStatus(trackingModal.orderId, 'SHIPPED', trackingCode, trackingUrl)}
        />
      )}
    </div>
  );
}
