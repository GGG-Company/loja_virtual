'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

type Category = {
  id: string;
  name: string;
};

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  scope: 'GLOBAL' | 'CATEGORY' | 'PRODUCT' | 'STATE';
  scopeValues: any;
  minPurchase: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usagePerUser: number | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
};

export default function EditarCupomPage() {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
    scope: 'GLOBAL' as 'GLOBAL' | 'CATEGORY' | 'PRODUCT' | 'STATE',
    scopeValues: [] as string[],
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    usagePerUser: '',
    isActive: true,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, couponRes] = await Promise.all([
          apiClient.get<{ categories: Category[] }>('/api/categories'),
          apiClient.get<Coupon>(`/api/admin/coupons/${params.id}`),
        ]);

        setCategories(categoriesRes.data.categories);
        const couponData = couponRes.data;
        setCoupon(couponData);

        // Parse scopeValues se for JSON string
        let parsedScopeValues: string[] = [];
        if (couponData.scopeValues) {
          try {
            parsedScopeValues = typeof couponData.scopeValues === 'string' 
              ? JSON.parse(couponData.scopeValues)
              : couponData.scopeValues;
          } catch {
            parsedScopeValues = [];
          }
        }

        setFormData({
          code: couponData.code,
          description: couponData.description || '',
          discountType: couponData.discountType,
          value: couponData.value.toString(),
          scope: couponData.scope,
          scopeValues: parsedScopeValues,
          minPurchase: couponData.minPurchase?.toString() || '',
          maxDiscount: couponData.maxDiscount?.toString() || '',
          usageLimit: couponData.usageLimit?.toString() || '',
          usagePerUser: couponData.usagePerUser?.toString() || '',
          isActive: couponData.isActive,
          startDate: couponData.startDate ? new Date(couponData.startDate).toISOString().split('T')[0] : '',
          endDate: couponData.endDate ? new Date(couponData.endDate).toISOString().split('T')[0] : '',
        });
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar cupom');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        description: formData.description || null,
        discountType: formData.discountType,
        value: parseFloat(formData.value),
        scope: formData.scope,
        scopeValues: formData.scopeValues.length > 0 ? formData.scopeValues : null,
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : null,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        usagePerUser: formData.usagePerUser ? parseInt(formData.usagePerUser) : null,
        isActive: formData.isActive,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      await apiClient.put(`/api/admin/coupons/${params.id}`, payload);
      toast.success('Cupom atualizado com sucesso!');
      router.push('/admin/cupons');
    } catch (error: any) {
      console.error('Erro ao atualizar cupom:', error);
      toast.error(error.response?.data?.error || 'Erro ao atualizar cupom');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-metallic-600">Cupom não encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center text-metallic-600 hover:text-metallic-900 mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </button>

      <h1 className="text-3xl font-bold text-metallic-900 mb-8">Editar Cupom</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Código (readonly) */}
        <div>
          <Label htmlFor="code">Código do Cupom</Label>
          <input
            id="code"
            type="text"
            value={formData.code}
            disabled
            className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg bg-gray-100 cursor-not-allowed font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">O código não pode ser alterado</p>
        </div>

        {/* Descrição */}
        <div>
          <Label htmlFor="description">Descrição</Label>
          <input
            id="description"
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Cupom de boas-vindas"
            className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Tipo e Valor do Desconto */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discountType">Tipo de Desconto*</Label>
            <select
              id="discountType"
              required
              value={formData.discountType}
              onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="PERCENTAGE">Porcentagem (%)</option>
              <option value="FIXED">Valor Fixo (R$)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="value">Valor do Desconto*</Label>
            <input
              id="value"
              type="number"
              step="0.01"
              required
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '50.00'}
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Escopo */}
        <div>
          <Label htmlFor="scope">Escopo do Cupom*</Label>
          <select
            id="scope"
            required
            value={formData.scope}
            onChange={(e) => setFormData({ ...formData, scope: e.target.value as any, scopeValues: [] })}
            className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="GLOBAL">Global (todos os produtos)</option>
            <option value="CATEGORY">Por Categoria</option>
            <option value="STATE">Por Estado</option>
          </select>
        </div>

        {/* Categoria (se scope = CATEGORY) */}
        {formData.scope === 'CATEGORY' && (
          <div>
            <Label htmlFor="category">Categoria*</Label>
            <select
              id="category"
              required
              value={formData.scopeValues[0] || ''}
              onChange={(e) => setFormData({ ...formData, scopeValues: [e.target.value] })}
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Estados (se scope = STATE) */}
        {formData.scope === 'STATE' && (
          <div>
            <Label htmlFor="states">Estados (separados por vírgula)*</Label>
            <input
              id="states"
              type="text"
              required
              value={formData.scopeValues.join(',')}
              onChange={(e) => setFormData({ ...formData, scopeValues: e.target.value.split(',').map(s => s.trim()) })}
              placeholder="SP,RJ,MG"
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Limites */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minPurchase">Compra Mínima (R$)</Label>
            <input
              id="minPurchase"
              type="number"
              step="0.01"
              value={formData.minPurchase}
              onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
              placeholder="100.00"
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <Label htmlFor="maxDiscount">Desconto Máximo (R$)</Label>
            <input
              id="maxDiscount"
              type="number"
              step="0.01"
              value={formData.maxDiscount}
              onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
              placeholder="200.00"
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="usageLimit">Limite de Uso Total</Label>
            <input
              id="usageLimit"
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
              placeholder="100"
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <Label htmlFor="usagePerUser">Limite por Usuário</Label>
            <input
              id="usagePerUser"
              type="number"
              value={formData.usagePerUser}
              onChange={(e) => setFormData({ ...formData, usagePerUser: e.target.value })}
              placeholder="1"
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Validade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Data Início</Label>
            <input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <Label htmlFor="endDate">Data Fim</Label>
            <input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full mt-1 px-4 py-2 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Ativo */}
        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-metallic-300 rounded"
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Cupom ativo
          </Label>
        </div>

        {/* Botões */}
        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
