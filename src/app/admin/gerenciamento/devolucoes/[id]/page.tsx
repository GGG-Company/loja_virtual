'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft,
  Package,
  User,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  AlertCircle,
  FileText,
  DollarSign,
  ExternalLink,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

type ReturnDetail = {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  reasonDetails?: string;
  refundAmount?: number;
  shippingRefund?: number;
  melhorEnvioOrderId?: string;
  melhorEnvioLabelUrl?: string;
  trackingCode?: string;
  trackingUrl?: string;
  adminNotes?: string;
  reviewedAt?: string;
  refundMethod?: string;
  refundedAt?: string;
  refundReference?: string;
  shippedAt?: string;
  receivedAt?: string;
  inspectedAt?: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    total: number;
    shippingAddress: any;
    melhorEnvioOrderId?: string;
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      product: {
        id: string;
        name: string;
        imageUrl?: string;
        price: number;
      };
    }>;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    addressZip?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressComplement?: string;
    addressNeighborhood?: string;
    addressCity?: string;
    addressState?: string;
  };
  items: Array<{
    id: string;
    orderItemId: string;
    productId: string;
    quantity: number;
    reason?: string;
    condition?: string;
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
  REFUND_PENDING: { label: 'Reembolso Pendente', color: 'bg-yellow-100 text-yellow-800', icon: DollarSign },
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

export default function AdminDevolucaoDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const returnId = params.id as string;
  const { status: authStatus } = useSession();

  const [returnData, setReturnData] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReference, setRefundReference] = useState('');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (authStatus === 'authenticated' && returnId) {
      loadReturn();
    }
  }, [authStatus, returnId, router]);

  const loadReturn = async () => {
    try {
      const response = await fetch(`/api/admin/returns/${returnId}`);
      const data = await response.json();

      if (response.ok) {
        setReturnData(data.return);
        setAdminNotes(data.return.adminNotes || '');
        setRefundAmount(data.return.refundAmount?.toString() || '');
      } else {
        toast.error(data.error || 'Erro ao carregar devolução');
        router.push('/admin/gerenciamento/devolucoes');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar devolução');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string, extraData: any = {}) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/returns/${returnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNotes, ...extraData }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Ação realizada com sucesso');
        loadReturn();
      } else {
        toast.error(data.error || 'Erro ao realizar ação');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao realizar ação');
    } finally {
      setActionLoading(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!returnData) {
    return null;
  }

  const statusInfo = statusLabels[returnData.status] || statusLabels.REQUESTED;
  const StatusIcon = statusInfo.icon;
  const shippingAddr = returnData.order.shippingAddress;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/gerenciamento/devolucoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {returnData.returnNumber}
            </h1>
            <p className="text-gray-600">
              Solicitado em {new Date(returnData.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full font-medium flex items-center gap-2 ${statusInfo.color}`}>
          <StatusIcon className="h-5 w-5" />
          {statusInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Itens da Devolução */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens para Devolução
            </h2>
            <div className="space-y-4">
              {returnData.items.map((item) => {
                const orderItem = returnData.order.items.find(
                  (oi) => oi.id === item.orderItemId
                );
                const product = orderItem?.product;

                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                      {product?.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name || ''}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{product?.name || 'Produto'}</p>
                      <p className="text-sm text-gray-600">
                        Quantidade: {item.quantity} | 
                        Valor unitário: R$ {orderItem?.price.toFixed(2) || '0.00'}
                      </p>
                      {item.reason && (
                        <p className="text-sm text-orange-600 mt-1">
                          Motivo específico: {item.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        R$ {((orderItem?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Motivo Geral */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Motivo da devolução:</p>
              <p className="text-gray-900">{reasonLabels[returnData.reason] || returnData.reason}</p>
              {returnData.reasonDetails && (
                <p className="text-gray-600 mt-2 italic">"{returnData.reasonDetails}"</p>
              )}
            </div>
          </motion.div>

          {/* Rastreamento */}
          {returnData.trackingCode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Rastreamento da Devolução
              </h2>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Código de rastreio:</p>
                  <p className="text-lg font-bold text-blue-800">{returnData.trackingCode}</p>
                </div>
                {returnData.trackingUrl && (
                  <a href={returnData.trackingUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Rastrear
                    </Button>
                  </a>
                )}
              </div>
            </motion.div>
          )}

          {/* Ações */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Ações</h2>

            {/* Notas Admin */}
            <div className="mb-4">
              <Label>Notas Internas (Admin)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes(e.target.value)}
                placeholder="Adicione notas sobre esta devolução..."
                rows={3}
              />
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => performAction('update_notes')}
                disabled={actionLoading}
              >
                Salvar Notas
              </Button>
            </div>

            <div className="border-t pt-4 space-y-4">
              {/* Aprovar */}
              {['REQUESTED', 'PENDING_REVIEW'].includes(returnData.status) && (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => performAction('approve')}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar Devolução
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      if (!adminNotes) {
                        toast.error('Informe o motivo da rejeição nas notas');
                        return;
                      }
                      performAction('reject');
                    }}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              )}

              {/* Gerar Etiqueta */}
              {returnData.status === 'APPROVED' && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    O pedido original {returnData.order.melhorEnvioOrderId ? 'possui' : 'não possui'} etiqueta do Melhor Envio.
                  </p>
                  <Button 
                    onClick={() => performAction('generate_label')}
                    disabled={actionLoading || !returnData.order.melhorEnvioOrderId}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Etiqueta de Devolução
                  </Button>
                  {!returnData.order.melhorEnvioOrderId && (
                    <p className="text-xs text-red-500 mt-1">
                      Não é possível gerar etiqueta reversa pois o pedido original não usou Melhor Envio.
                    </p>
                  )}
                </div>
              )}

              {/* Imprimir Etiqueta */}
              {returnData.melhorEnvioLabelUrl && (
                <a href={returnData.melhorEnvioLabelUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir Etiqueta
                  </Button>
                </a>
              )}

              {/* Marcar como Recebido */}
              {returnData.status === 'IN_TRANSIT' && (
                <Button 
                  onClick={() => performAction('mark_received')}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Marcar como Recebido
                </Button>
              )}

              {/* Iniciar Inspeção */}
              {returnData.status === 'RECEIVED' && (
                <Button 
                  onClick={() => performAction('start_inspection')}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Iniciar Inspeção
                </Button>
              )}

              {/* Aprovar Reembolso */}
              {returnData.status === 'INSPECTING' && (
                <div className="space-y-3">
                  <div>
                    <Label>Valor do Reembolso</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <Button 
                    onClick={() => performAction('approve_refund', { refundAmount: parseFloat(refundAmount) })}
                    disabled={actionLoading || !refundAmount}
                    className="w-full"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Aprovar Reembolso
                  </Button>
                </div>
              )}

              {/* Finalizar Reembolso */}
              {returnData.status === 'REFUND_PENDING' && (
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      Valor a reembolsar: <strong>R$ {returnData.refundAmount?.toFixed(2)}</strong>
                    </p>
                  </div>
                  <div>
                    <Label>Referência do Reembolso (ID da transação)</Label>
                    <Input
                      value={refundReference}
                      onChange={(e) => setRefundReference(e.target.value)}
                      placeholder="Ex: PIX123456"
                    />
                  </div>
                  <Button 
                    onClick={() => performAction('complete_refund', { refundReference })}
                    disabled={actionLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Reembolso Realizado
                  </Button>
                </div>
              )}

              {/* Finalizado */}
              {returnData.status === 'REFUNDED' && (
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Devolução Concluída</p>
                  <p className="text-sm text-green-600">
                    Reembolso de R$ {returnData.refundAmount?.toFixed(2)} realizado em{' '}
                    {returnData.refundedAt ? new Date(returnData.refundedAt).toLocaleDateString('pt-BR') : '-'}
                  </p>
                  {returnData.refundReference && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ref: {returnData.refundReference}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cliente */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{returnData.user.name}</p>
              <p className="text-gray-600">{returnData.user.email}</p>
              {returnData.user.phone && (
                <p className="text-gray-600">{returnData.user.phone}</p>
              )}
            </div>
          </motion.div>

          {/* Endereço de Coleta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço de Coleta
            </h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>{shippingAddr?.street}, {shippingAddr?.number}</p>
              {shippingAddr?.complement && <p>{shippingAddr.complement}</p>}
              <p>{shippingAddr?.neighborhood}</p>
              <p>{shippingAddr?.city} - {shippingAddr?.state}</p>
              <p className="font-medium">CEP: {shippingAddr?.zip}</p>
            </div>
          </motion.div>

          {/* Pedido Original */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Pedido Original</h2>
            <div className="text-sm space-y-2">
              <p>
                <span className="text-gray-600">Número:</span>{' '}
                <Link href={`/admin/orders/${returnData.order.id}`} className="text-primary-600 hover:underline">
                  {returnData.order.orderNumber}
                </Link>
              </p>
              <p>
                <span className="text-gray-600">Total:</span>{' '}
                <span className="font-medium">R$ {returnData.order.total.toFixed(2)}</span>
              </p>
              <p>
                <span className="text-gray-600">Valor devolução:</span>{' '}
                <span className="font-medium text-green-600">
                  R$ {returnData.refundAmount?.toFixed(2) || '0.00'}
                </span>
              </p>
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium">Solicitação criada</p>
                  <p className="text-gray-500">{new Date(returnData.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              {returnData.reviewedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="font-medium">Analisado</p>
                    <p className="text-gray-500">{new Date(returnData.reviewedAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              )}
              {returnData.shippedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="font-medium">Enviado pelo cliente</p>
                    <p className="text-gray-500">{new Date(returnData.shippedAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              )}
              {returnData.receivedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="font-medium">Recebido pela loja</p>
                    <p className="text-gray-500">{new Date(returnData.receivedAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              )}
              {returnData.inspectedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="font-medium">Inspecionado</p>
                    <p className="text-gray-500">{new Date(returnData.inspectedAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              )}
              {returnData.refundedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="font-medium">Reembolsado</p>
                    <p className="text-gray-500">{new Date(returnData.refundedAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
