'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, FileText, Image as ImageIcon, Video, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { motion } from 'framer-motion';

type ReturnRequest = {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  reasonDetails?: string;
  refundAmount?: number;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  reviewedAt?: string;
  order: {
    orderNumber: string;
    total: number;
  };
  user: {
    id: string;
    name?: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    reason?: string;
  }>;
};

const statusColors: Record<string, string> = {
  REQUESTED: 'bg-blue-100 text-blue-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  LABEL_GENERATED: 'bg-purple-100 text-purple-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  RECEIVED: 'bg-cyan-100 text-cyan-800',
  REFUNDED: 'bg-emerald-100 text-emerald-800',
};

const statusLabels: Record<string, string> = {
  REQUESTED: 'Solicitado',
  PENDING_REVIEW: 'Aguardando Análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  LABEL_GENERATED: 'Etiqueta Gerada',
  IN_TRANSIT: 'Em Trânsito',
  RECEIVED: 'Recebido',
  REFUNDED: 'Reembolsado',
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('REQUESTED');
  const [search, setSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Buscar devoluções
  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/returns');
      
      if (!response.ok) throw new Error('Erro ao buscar devoluções');
      
      const data = await response.json();
      setReturns(data.returns || []);
    } catch (error) {
      console.error('[RETURNS_FETCH]', error);
      toast.error('Erro ao buscar devoluções');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  // Filtrar devoluções
  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      const matchesStatus = filter === 'ALL' || r.status === filter;
      const matchesSearch = 
        r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.user.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.user.email.toLowerCase().includes(search.toLowerCase()) ||
        r.order.orderNumber.toLowerCase().includes(search.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [returns, filter, search]);

  const handleApprove = async () => {
    if (!selectedReturn) return;

    try {
      setApproving(true);
      const response = await fetch(`/api/returns/${selectedReturn.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      });

      if (!response.ok) throw new Error('Erro ao aprovar devolução');

      toast.success('Devolução aprovada com sucesso');
      setShowDetails(false);
      setAdminNotes('');
      setSelectedReturn(null);
      await fetchReturns();
    } catch (error) {
      console.error('[APPROVE_RETURN]', error);
      toast.error('Erro ao aprovar devolução');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReturn) return;

    try {
      setRejecting(true);
      const response = await fetch(`/api/returns/${selectedReturn.id}/approve`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      });

      if (!response.ok) throw new Error('Erro ao rejeitar devolução');

      toast.success('Devolução rejeitada com sucesso');
      setShowDetails(false);
      setAdminNotes('');
      setSelectedReturn(null);
      await fetchReturns();
    } catch (error) {
      console.error('[REJECT_RETURN]', error);
      toast.error('Erro ao rejeitar devolução');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Devoluções</h1>
          <p className="text-gray-600 mt-2">Analise e aprove/rejeite solicitações de devolução</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar por número, cliente, email ou pedido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            <div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="REQUESTED">Solicitado</option>
                <option value="PENDING_REVIEW">Aguardando Análise</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
            </div>

            <Button onClick={fetchReturns} variant="outline">
              Atualizar
            </Button>
          </div>
        </div>

        {/* Returns List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">Nenhuma devolução encontrada</p>
            </div>
          ) : (
            filteredReturns.map((returnRequest) => (
              <motion.div
                key={returnRequest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {returnRequest.returnNumber}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusColors[returnRequest.status] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {statusLabels[returnRequest.status] || returnRequest.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Cliente:</span> {returnRequest.user.name} ({returnRequest.user.email})
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Pedido:</span> {returnRequest.order.orderNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Motivo:</span> {returnRequest.reason}
                      </p>
                      <p className="text-sm text-gray-900 font-semibold mt-2">
                        Reembolso: R$ {(returnRequest.refundAmount || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(returnRequest.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Media Icons */}
                  {(returnRequest.imageUrl || returnRequest.videoUrl) && (
                    <div className="flex gap-3 mb-4 pb-4 border-b border-gray-200">
                      {returnRequest.imageUrl && (
                        <a
                          href={returnRequest.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <ImageIcon className="h-4 w-4" />
                          Imagem
                        </a>
                      )}
                      {returnRequest.videoUrl && (
                        <a
                          href={returnRequest.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Video className="h-4 w-4" />
                          Vídeo
                        </a>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    {['REQUESTED', 'PENDING_REVIEW'].includes(returnRequest.status) && (
                      <>
                        <Button
                          onClick={() => {
                            setSelectedReturn(returnRequest);
                            setShowDetails(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Analisar
                        </Button>
                      </>
                    )}
                    {!['REQUESTED', 'PENDING_REVIEW'].includes(returnRequest.status) && (
                      <Button
                        onClick={() => {
                          setSelectedReturn(returnRequest);
                          setShowDetails(true);
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        Ver Detalhes
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {selectedReturn.returnNumber}
                </h2>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setAdminNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Cliente</label>
                  <p className="text-gray-900">{selectedReturn.user.name} ({selectedReturn.user.email})</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Motivo da Devolução</label>
                  <p className="text-gray-900">{selectedReturn.reason}</p>
                  {selectedReturn.reasonDetails && (
                    <p className="text-gray-600 text-sm mt-1">{selectedReturn.reasonDetails}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Itens</label>
                  <p className="text-gray-900">{selectedReturn.items.length} item(ns)</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Valor do Reembolso</label>
                  <p className="text-lg font-bold text-primary-600">R$ {(selectedReturn.refundAmount || 0).toFixed(2)}</p>
                </div>

                {selectedReturn.imageUrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Imagem do Produto</label>
                    <a
                      href={selectedReturn.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Ver imagem
                    </a>
                  </div>
                )}

                {selectedReturn.videoUrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Vídeo do Produto</label>
                    <a
                      href={selectedReturn.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                    >
                      <Video className="h-4 w-4" />
                      Ver vídeo
                    </a>
                  </div>
                )}

                <div>
                  <label htmlFor="notes" className="text-sm font-medium text-gray-700">Notas do Admin</label>
                  <textarea
                    id="notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Adicione suas notas sobre esta devolução..."
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                  />
                </div>
              </div>

              {['REQUESTED', 'PENDING_REVIEW'].includes(selectedReturn.status) && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={approving || rejecting}
                    className="flex-1"
                  >
                    {approving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Aprovando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Aprovar Devolução
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={approving || rejecting}
                    variant="destructive"
                    className="flex-1"
                  >
                    {rejecting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Rejeitando...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Rejeitar Devolução
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!['REQUESTED', 'PENDING_REVIEW'].includes(selectedReturn.status) && (
                <Button
                  onClick={() => {
                    setShowDetails(false);
                    setAdminNotes('');
                  }}
                  className="w-full"
                >
                  Fechar
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
