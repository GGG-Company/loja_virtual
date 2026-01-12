'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  RotateCcw, 
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

type Return = {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  reasonDetails?: string;
  refundAmount?: number;
  createdAt: string;
  order: {
    orderNumber: string;
    total: number;
    shippingAddress: any;
  };
  user: {
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
  }>;
};

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'REQUESTED', label: 'Solicitados' },
  { value: 'PENDING_REVIEW', label: 'Em Análise' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'LABEL_GENERATED', label: 'Etiqueta Gerada' },
  { value: 'IN_TRANSIT', label: 'Em Trânsito' },
  { value: 'RECEIVED', label: 'Recebidos' },
  { value: 'INSPECTING', label: 'Em Inspeção' },
  { value: 'REFUND_PENDING', label: 'Reembolso Pendente' },
  { value: 'REFUNDED', label: 'Reembolsados' },
  { value: 'REJECTED', label: 'Rejeitados' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  REQUESTED: { label: 'Solicitado', color: 'bg-blue-100 text-blue-800', icon: Clock },
  PENDING_REVIEW: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  LABEL_GENERATED: { label: 'Etiqueta Gerada', color: 'bg-purple-100 text-purple-800', icon: Package },
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
  WRONG_PRODUCT: 'Produto errado',
  NOT_AS_DESCRIBED: 'Diferente do anunciado',
  DAMAGED_SHIPPING: 'Danificado no transporte',
  CHANGED_MIND: 'Arrependimento',
  SIZE_ISSUE: 'Tamanho incorreto',
  OTHER: 'Outro',
};

export default function AdminDevolucoesPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();

  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (authStatus === 'authenticated') {
      loadReturns();
    }
  }, [authStatus, statusFilter, pagination.page, router]);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/admin/returns?${params}`);
      const data = await response.json();

      if (response.ok) {
        setReturns(data.returns || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        }));
        setStats(data.stats || {});
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadReturns();
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Contar pendentes (requer ação)
  const pendingCount = (stats.REQUESTED || 0) + (stats.PENDING_REVIEW || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/gerenciamento">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RotateCcw className="h-7 w-7" />
              Devoluções
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie solicitações de devolução e reembolsos
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {statusOptions.slice(1, 7).map((opt) => {
          const count = stats[opt.value] || 0;
          const statusInfo = statusLabels[opt.value];
          return (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`p-4 rounded-lg border transition-colors ${
                statusFilter === opt.value 
                  ? 'border-primary-600 bg-primary-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-gray-600">{opt.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número, pedido, cliente..."
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 border rounded-lg bg-white"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button type="submit">
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
        </form>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : returns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <RotateCcw className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhuma devolução encontrada</h2>
          <p className="text-gray-600">
            {statusFilter !== 'all' 
              ? 'Tente alterar o filtro de status' 
              : 'Ainda não há solicitações de devolução'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Devolução
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Motivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {returns.map((ret) => {
                  const statusInfo = statusLabels[ret.status] || statusLabels.REQUESTED;
                  const StatusIcon = statusInfo.icon;
                  const totalItems = ret.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <motion.tr
                      key={ret.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{ret.returnNumber}</div>
                        <div className="text-xs text-gray-500">{totalItems} item(ns)</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium">{ret.user.name}</div>
                        <div className="text-xs text-gray-500">{ret.user.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium">{ret.order.orderNumber}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">{reasonLabels[ret.reason] || ret.reason}</div>
                      </td>
                      <td className="px-4 py-4">
                        {ret.refundAmount ? (
                          <div className="font-medium text-green-600">
                            R$ {ret.refundAmount.toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(ret.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/admin/gerenciamento/devolucoes/${ret.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
