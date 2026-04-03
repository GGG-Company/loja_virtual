'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  Package, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck,
  RotateCcw,
  AlertCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

type Return = {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  reasonDetails?: string;
  refundAmount?: number;
  trackingCode?: string;
  trackingUrl?: string;
  melhorEnvioLabelUrl?: string;
  createdAt: string;
  shippedAt?: string;
  receivedAt?: string;
  refundedAt?: string;
  order: {
    orderNumber: string;
    total: number;
    createdAt: string;
  };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    reason?: string;
  }>;
};

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  REQUESTED: { label: 'Solicitado', color: 'bg-blue-100 text-blue-800', icon: Clock },
  PENDING_REVIEW: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  LABEL_GENERATED: { label: 'Etiqueta Gerada', color: 'bg-purple-100 text-purple-800', icon: FileText },
  IN_TRANSIT: { label: 'Em Trânsito', color: 'bg-blue-100 text-blue-800', icon: Truck },
  RECEIVED: { label: 'Recebido', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  INSPECTING: { label: 'Em Inspeção', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  REFUND_PENDING: { label: 'Reembolso Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  REFUNDED: { label: 'Reembolsado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

const reasonLabels: Record<string, string> = {
  DEFECTIVE: 'Produto com defeito',
  WRONG_PRODUCT: 'Produto errado enviado',
  NOT_AS_DESCRIBED: 'Diferente do anunciado',
  DAMAGED_SHIPPING: 'Danificado no transporte',
  CHANGED_MIND: 'Arrependimento',
  SIZE_ISSUE: 'Tamanho incorreto',
  OTHER: 'Outro motivo',
};

export default function MinhaContaDevolucoesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'authenticated') {
      loadReturns();
    }
  }, [status, router]);

  const loadReturns = async () => {
    try {
      const response = await fetch('/api/returns');
      const data = await response.json();
      
      if (response.ok) {
        setReturns(data.returns || []);
      } else {
        toast.error(data.error || 'Erro ao carregar devoluções');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar devoluções');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (returnId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação de devolução?')) {
      return;
    }

    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Solicitação cancelada');
        loadReturns();
      } else {
        toast.error(data.error || 'Erro ao cancelar');
      }
    } catch (error) {
      toast.error('Erro ao cancelar');
    }
  };

  const handleMarkShipped = async (returnId: string) => {
    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_shipped' }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Marcado como enviado!');
        loadReturns();
      } else {
        toast.error(data.error || 'Erro ao marcar como enviado');
      }
    } catch (error) {
      toast.error('Erro ao marcar como enviado');
    }
  };

  if (status === 'loading' || loading) {
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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/minha-conta">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Minhas Devoluções</h1>
                <p className="text-gray-600">Acompanhe suas solicitações de devolução</p>
              </div>
            </div>
          </div>

          {/* Lista de Devoluções */}
          {returns.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-8 text-center"
            >
              <RotateCcw className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nenhuma devolução</h2>
              <p className="text-gray-600 mb-4">
                Você ainda não solicitou nenhuma devolução.
              </p>
              <Link href="/minha-conta/pedidos">
                <Button>Ver Meus Pedidos</Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {returns.map((ret, index) => {
                const statusInfo = statusLabels[ret.status] || statusLabels.REQUESTED;
                const StatusIcon = statusInfo.icon;

                return (
                  <motion.div
                    key={ret.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg shadow p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{ret.returnNumber}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Pedido: <span className="font-medium">{ret.order.orderNumber}</span></p>
                          <p>Motivo: <span className="font-medium">{reasonLabels[ret.reason] || ret.reason}</span></p>
                          {ret.reasonDetails && (
                            <p className="text-gray-500 italic">"{ret.reasonDetails}"</p>
                          )}
                          <p>Solicitado em: {new Date(ret.createdAt).toLocaleDateString('pt-BR')}</p>
                          {ret.refundAmount && (
                            <p>Valor do reembolso: <span className="font-semibold text-green-600">
                              R$ {Number(ret.refundAmount).toFixed(2)}
                            </span></p>
                          )}
                        </div>

                        {/* Código de rastreio */}
                        {ret.trackingCode && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800">
                              Código de rastreio: {ret.trackingCode}
                            </p>
                            {ret.trackingUrl && (
                              <a 
                                href={ret.trackingUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                              >
                                Rastrear <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col gap-2">
                        {/* Imprimir etiqueta */}
                        {ret.melhorEnvioLabelUrl && ret.status === 'LABEL_GENERATED' && (
                          <a 
                            href={ret.melhorEnvioLabelUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" className="w-full">
                              <FileText className="h-4 w-4 mr-2" />
                              Imprimir Etiqueta
                            </Button>
                          </a>
                        )}

                        {/* Marcar como enviado */}
                        {ret.status === 'LABEL_GENERATED' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMarkShipped(ret.id)}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Marquei como Enviado
                          </Button>
                        )}

                        {/* Cancelar */}
                        {['REQUESTED', 'PENDING_REVIEW'].includes(ret.status) && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleCancel(ret.id)}
                          >
                            Cancelar Solicitação
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Timeline de Status */}
                    {ret.status !== 'CANCELLED' && ret.status !== 'REJECTED' && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <div className={`flex flex-col items-center ${['REQUESTED', 'PENDING_REVIEW', 'APPROVED', 'LABEL_GENERATED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'REFUND_PENDING', 'REFUNDED'].includes(ret.status) ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1 bg-white border-current">
                              <CheckCircle className="h-3 w-3" />
                            </div>
                            <span>Solicitado</span>
                          </div>
                          <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
                          <div className={`flex flex-col items-center ${['APPROVED', 'LABEL_GENERATED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'REFUND_PENDING', 'REFUNDED'].includes(ret.status) ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1 bg-white border-current">
                              <CheckCircle className="h-3 w-3" />
                            </div>
                            <span>Aprovado</span>
                          </div>
                          <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
                          <div className={`flex flex-col items-center ${['IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'REFUND_PENDING', 'REFUNDED'].includes(ret.status) ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1 bg-white border-current">
                              <Truck className="h-3 w-3" />
                            </div>
                            <span>Enviado</span>
                          </div>
                          <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
                          <div className={`flex flex-col items-center ${['RECEIVED', 'INSPECTING', 'REFUND_PENDING', 'REFUNDED'].includes(ret.status) ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1 bg-white border-current">
                              <Package className="h-3 w-3" />
                            </div>
                            <span>Recebido</span>
                          </div>
                          <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
                          <div className={`flex flex-col items-center ${ret.status === 'REFUNDED' ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1 bg-white border-current">
                              <CheckCircle className="h-3 w-3" />
                            </div>
                            <span>Reembolsado</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <h4 className="font-semibold mb-2">Como funciona a devolução?</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Solicite a devolução através do seu pedido</li>
              <li>Aguarde a análise e aprovação da nossa equipe</li>
              <li>Após aprovação, imprima a etiqueta de devolução</li>
              <li>Envie o produto pelos Correios usando a etiqueta</li>
              <li>Após recebermos e inspecionarmos, processamos o reembolso</li>
            </ol>
            <p className="mt-2 text-xs text-blue-600">
              * O prazo para arrependimento é de 7 dias após o recebimento (CDC Art. 49)
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
