'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Package, MapPin, Phone, Mail, MapPinned, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { statusToPt, statusBadgeClass } from '@/lib/i18n';
import { Input } from '@/components/ui/input';

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllModal, setShowAllModal] = useState(false);

  const pickingReport = useMemo(() => {
    const map = new Map<string, { id: string; name: string; location: string; sku?: string | null; quantity: number }>();
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

  const previewReport = useMemo(() => pickingReport.slice(0, 5), [pickingReport]);

  useEffect(() => {
    const fetchPicking = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<{ orders: PickingOrder[]; pagination?: { pages?: number } }>('/api/admin/picking', {
          params: { page, limit: 10, search: searchTerm || undefined },
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
  }, [page, searchTerm]);

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

  const exportPdf = async () => {
    if (pickingReport.length === 0) return;
    try {
      const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');

      const styles = StyleSheet.create({
        page: { padding: 24, fontSize: 10, color: '#111' },
        title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
        subtitle: { fontSize: 10, color: '#555', marginBottom: 12 },
        header: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd', paddingBottom: 6, marginBottom: 6 },
        row: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#eee' },
        colName: { width: '45%' },
        colSku: { width: '15%' },
        colLocation: { width: '25%' },
        colQty: { width: '15%', textAlign: 'right' },
        bold: { fontWeight: 'bold' },
      });

      const generatedAt = new Date().toLocaleString('pt-BR');

      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Relatório de Picking</Text>
            <Text style={styles.subtitle}>Gerado em {generatedAt}</Text>

            <View style={styles.header}>
              <Text style={[styles.colName, styles.bold]}>Produto</Text>
              <Text style={[styles.colSku, styles.bold]}>SKU</Text>
              <Text style={[styles.colLocation, styles.bold]}>Endereço</Text>
              <Text style={[styles.colQty, styles.bold]}>Qtd</Text>
            </View>

            {pickingReport.map((item) => (
              <View key={`${item.id}-${item.location}`} style={styles.row}>
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-metallic-900">Separação de Pedidos</h1>
          <p className="text-sm text-metallic-600">Pedidos confirmados ou em separação</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-metallic-400" />
          <Input
            placeholder="Buscar pedido ou cliente"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-metallic-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-metallic-900">Relatório de picking</p>
            <p className="text-sm text-metallic-600">Itens agrupados por produto e endereço no estoque</p>
            {pickingReport.length > 5 && (
              <p className="text-xs text-metallic-500 mt-1">Mostrando top 5 itens · Total: {pickingReport.length}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text = pickingReport
                  .map((item) => `${item.name} | Qtd: ${item.quantity} | Local: ${item.location}${item.sku ? ` | SKU: ${item.sku}` : ''}`)
                  .join('\n');
                navigator.clipboard?.writeText(text).then(() => toast.success('Relatório copiado')); 
              }}
              disabled={pickingReport.length === 0}
            >
              Copiar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const header = 'Produto,SKU,Localização,Quantidade\n';
                const rows = pickingReport
                  .map((item) => `${item.name.replace(/,/g, ' ')},${item.sku || ''},${item.location.replace(/,/g, ' ')},${item.quantity}`)
                  .join('\n');
                const csv = header + rows;
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'picking-report.csv';
                link.click();
                URL.revokeObjectURL(url);
              }}
              disabled={pickingReport.length === 0}
            >
              Exportar CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportPdf}
              disabled={pickingReport.length === 0}
            >
              Exportar PDF
            </Button>
            {pickingReport.length > 5 && (
              <Button size="sm" variant="ghost" onClick={() => setShowAllModal(true)}>
                Ver todos
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-metallic-600">
              <tr>
                <th className="py-2">Produto</th>
                <th className="py-2">SKU</th>
                <th className="py-2">Endereço no estoque</th>
                <th className="py-2 text-right">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-metallic-100">
              {previewReport.map((item) => (
                <tr key={`${item.id}-${item.location}`} className="align-top">
                  <td className="py-2 font-semibold text-metallic-900">{item.name}</td>
                  <td className="py-2 text-metallic-700">{item.sku || '-'}</td>
                  <td className="py-2 text-metallic-700">{item.location}</td>
                  <td className="py-2 text-right font-semibold text-metallic-900">{item.quantity}</td>
                </tr>
              ))}
              {pickingReport.length === 0 && (
                <tr>
                  <td className="py-3 text-metallic-600" colSpan={4}>Nenhum item para separar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {!loading && (
        <div className="flex items-center justify-between text-sm text-metallic-600">
          <span>Página {page} de {totalPages}</span>
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

      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] overflow-hidden border border-metallic-100">
            <div className="flex items-center justify-between p-4 border-b border-metallic-100">
              <div>
                <p className="text-lg font-semibold text-metallic-900">Todos os itens do relatório</p>
                <p className="text-sm text-metallic-600">{pickingReport.length} itens agrupados</p>
              </div>
              <button
                className="p-2 rounded-md hover:bg-metallic-50 text-metallic-600"
                aria-label="Fechar"
                onClick={() => setShowAllModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm">
                <thead className="text-left text-metallic-600 sticky top-0 bg-white border-b border-metallic-100">
                  <tr>
                    <th className="py-2 px-4">Produto</th>
                    <th className="py-2 px-4">SKU</th>
                    <th className="py-2 px-4">Endereço no estoque</th>
                    <th className="py-2 px-4 text-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-metallic-100">
                  {pickingReport.map((item) => (
                    <tr key={`${item.id}-${item.location}`} className="align-top">
                      <td className="py-2 px-4 font-semibold text-metallic-900">{item.name}</td>
                      <td className="py-2 px-4 text-metallic-700">{item.sku || '-'}</td>
                      <td className="py-2 px-4 text-metallic-700">{item.location}</td>
                      <td className="py-2 px-4 text-right font-semibold text-metallic-900">{item.quantity}</td>
                    </tr>
                  ))}
                  {pickingReport.length === 0 && (
                    <tr>
                      <td className="py-3 px-4 text-metallic-600" colSpan={4}>Nenhum item para separar</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-metallic-100">
              <Button variant="ghost" onClick={() => setShowAllModal(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
