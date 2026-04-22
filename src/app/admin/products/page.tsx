'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: number;
  promotionalPrice: number | null;
  stock: number;
  isActive: boolean;
  isPromo: boolean;
  externalIdHiper: string | null;
  category: { name: string };
  brand?: { name: string } | null;
}

interface SyncResult {
  matched: number;
  unmatched: number;
  stockUpdated: number;
  deactivated: number;
  errors: number;
  nextPontoDeSincronizacao: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadProducts = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/products?limit=100')
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);
        setProducts(
          raw.map((p: any) => ({
            ...p,
            price: parseFloat(String(p.price ?? 0)),
            promotionalPrice: p.promotionalPrice != null ? parseFloat(String(p.promotionalPrice)) : null,
          })),
        );
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch('/api/admin/integrations/hiper/sync-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pontoDeSincronizacao: 0, syncStock: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncError(data.error ?? 'Erro ao sincronizar');
      } else {
        setSyncResult(data);
        loadProducts();
      }
    } catch {
      setSyncError('Falha na comunicação com o servidor');
    } finally {
      setSyncing(false);
    }
  }

  const linked = products.filter((p) => p.externalIdHiper).length;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {linked} de {products.length} vinculados ao Hiper
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar do Hiper'}
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">Novo Produto</Link>
          </Button>
        </div>
      </div>

      {/* Resultado do sync */}
      {syncResult && (
        <div className="mb-4 p-4 rounded-lg border border-green-200 bg-green-50 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div className="text-sm text-green-800">
            <p className="font-semibold mb-1">Sincronização concluída</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span><strong>{syncResult.matched}</strong> produtos vinculados</span>
              <span><strong>{syncResult.stockUpdated}</strong> estoques atualizados</span>
              {syncResult.deactivated > 0 && (
                <span className="text-gray-600"><strong>{syncResult.deactivated}</strong> desativados (removido/inativo no Hiper)</span>
              )}
              {syncResult.unmatched > 0 && (
                <span className="text-amber-700"><strong>{syncResult.unmatched}</strong> sem correspondência local</span>
              )}
              {syncResult.errors > 0 && (
                <span className="text-red-700"><strong>{syncResult.errors}</strong> erros</span>
              )}
            </div>
          </div>
        </div>
      )}

      {syncError && (
        <div className="mb-4 p-4 rounded-lg border border-red-200 bg-red-50 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">{syncError}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Carregando produtos...
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hiper</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{product.name}</span>
                        <div className="flex gap-1 mt-1">
                          <span className="text-xs text-gray-400">{product.sku}</span>
                          {product.isPromo && (
                            <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-1.5 rounded">
                              Em Oferta
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.brand?.name
                        ? <span className="font-medium text-gray-700">{product.brand.name}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category?.name || 'S/ Categoria'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span>R$ {Number(product.price).toFixed(2)}</span>
                        {product.promotionalPrice && (
                          <span className="text-xs text-green-600 font-medium">
                            Promo: R$ {Number(product.promotionalPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.externalIdHiper ? (
                        <div className="flex items-center gap-1.5" title={product.externalIdHiper}>
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="text-xs text-green-700 font-medium">Vinculado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-gray-300 shrink-0" />
                          <span className="text-xs text-gray-400">Não vinculado</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {product.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/products/${product.id}`}>Editar</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
