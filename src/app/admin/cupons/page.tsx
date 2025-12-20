'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  scope: 'GLOBAL' | 'CATEGORY' | 'PRODUCT' | 'STATE';
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  currentUsage: number;
  usageLimit: number | null;
};

export default function CuponsAdminPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await apiClient.get<{ coupons: Coupon[] }>('/api/admin/coupons');
      setCoupons(response.data.coupons);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      toast.error('Erro ao carregar cupons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

    try {
      await apiClient.delete(`/api/admin/coupons/${id}`);
      toast.success('Cupom excluído com sucesso');
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      toast.error('Erro ao excluir cupom');
    }
  };

  const filteredCoupons = coupons.filter((coupon) =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-metallic-900">Cupons de Desconto</h1>
          <p className="text-metallic-600 mt-1">Gerencie cupons de desconto</p>
        </div>
        <Button onClick={() => router.push('/admin/cupons/novo')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-metallic-400" />
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-metallic-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-metallic-600 uppercase">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-metallic-600 uppercase">
                Descrição
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-metallic-600 uppercase">
                Desconto
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-metallic-600 uppercase">
                Escopo
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-metallic-600 uppercase">
                Uso
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-metallic-600 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-metallic-600 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-metallic-200">
            {filteredCoupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-metallic-50">
                <td className="px-6 py-4">
                  <span className="font-mono font-semibold text-primary-600">
                    {coupon.code}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-metallic-700">
                    {coupon.description || '-'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold">
                    {coupon.discountType === 'PERCENTAGE' 
                      ? `${coupon.value}%` 
                      : `R$ ${coupon.value.toFixed(2)}`
                    }
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-metallic-600 capitalize">
                    {coupon.scope.toLowerCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-metallic-600">
                    {coupon.currentUsage} / {coupon.usageLimit || '∞'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {coupon.isActive ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      Inativo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/cupons/${coupon.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(coupon.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCoupons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-metallic-600">Nenhum cupom encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
