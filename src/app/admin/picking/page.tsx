'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Package, MapPin, Phone, Mail, MapPinned, Search, FileText, Printer, RefreshCw, Send } from 'lucide-react';
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

const statusLabel: Record<string, string> = {
  CONFIRMED: 'Confirmado (pronto para separar)',
  PROCESSING: 'Em separação',
};

export default function AdminPickingPage() {
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

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Header + filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-metallic-900">Separação de Pedidos</h1>
          <p className="text-sm text-metallic-600">Pedidos confirmados ou em separação</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value as 'desc' | 'asc'); setPage(1); }}
            className="px-3 py-2 border border-metallic-200 rounded-md text-sm bg-white text-metallic-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="desc">Mais recentes primeiro</option>
            <option value="asc">Mais antigos primeiro</option>
          </select>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-metallic-400" />
            <Input
              placeholder="Buscar pedido ou cliente"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Picking report */}
      <PickingReportTable
        report={pickingReport}
        preview
        onExportPdf={exportPdf}
        onShowAll={() => setShowAllModal(true)}
      />

      {/* Orders list */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        )}

        {orders.length === 0 && !loading ? (
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 bg-gray-50 border border-metallic-100 rounded-lg p-3">
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
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            width={64}
                            height={64}
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
                          <span>{item.product.stockLocation || 'Sem localização cadastrada'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {order.shipping > 0 && (
                  <div className="mt-4 border-t border-metallic-100 pt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-primary-600" />
                        <span className="font-medium text-metallic-900">Etiqueta de Envio</span>
                        {order.trackingCode && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {order.trackingCode}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {order.melhorEnvioLabelUrl ? (
                          <>
                            <Button size="sm" onClick={() => printLabel(order.melhorEnvioLabelUrl)}>
                              <Printer className="h-4 w-4 mr-1" />
                              Imprimir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendLabelToCustomer(order.id)}
                              disabled={sendingLabelId === order.id}
                            >
                              <Send className={`h-4 w-4 mr-1 ${sendingLabelId === order.id ? 'animate-pulse' : ''}`} />
                              Enviar ao Cliente
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateLabel(order.id)}
                              disabled={generatingLabelId === order.id}
                            >
                              <RefreshCw className={`h-4 w-4 mr-1 ${generatingLabelId === order.id ? 'animate-spin' : ''}`} />
                              Regenerar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => generateLabel(order.id)}
                            disabled={generatingLabelId === order.id}
                          >
                            {generatingLabelId === order.id ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-1" />
                                Gerar Etiqueta
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
                      onClick={() => openTrackingModal(order.id, order.orderNumber)}
                      disabled={updatingId === order.id}
                      className="flex-1"
                    >
                      {updatingId === order.id ? 'Atualizando...' : 'Marcar como Enviado'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && (
        <div className="flex items-center justify-between text-sm text-metallic-600">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-md border disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            <button
              className="px-3 py-2 rounded-md border disabled:opacity-50"
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages}
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
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
