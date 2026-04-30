'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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
  created: number;
  unmatched: number;
  stockUpdated: number;
  deactivated: number;
  errors: number;
  totalFromHiper: number;
  processedOffset: number;
  processedCount: number;
  hasMore: boolean;
  nextOffset: number | null;
  nextPontoDeSincronizacao: number;
}

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ half: 1 | 2; done: number; total: number } | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadProducts = useCallback((p: number, s: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (s) params.set('search', s);

    fetch(`/api/admin/products?${params}`)
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data?.products) ? data.products : [];
        setProducts(raw.map((p: any) => ({
          ...p,
          price: parseFloat(String(p.price ?? 0)),
          promotionalPrice: p.promotionalPrice != null ? parseFloat(String(p.promotionalPrice)) : null,
        })));
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.pages ?? 1);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadProducts(page, search); }, [loadProducts, page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function goToPage(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    setSyncProgress(null);

    const acc = { matched: 0, created: 0, unmatched: 0, stockUpdated: 0, deactivated: 0, errors: 0 };

    async function callSync(offset: number, limit: number, half: 1 | 2, total: number) {
      const res = await fetch('/api/admin/integrations/hiper/sync-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pontoDeSincronizacao: 0, syncStock: true, offset, limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao sincronizar');

      acc.matched      += data.matched      ?? 0;
      acc.created      += data.created      ?? 0;
      acc.unmatched    += data.unmatched    ?? 0;
      acc.stockUpdated += data.stockUpdated ?? 0;
      acc.deactivated  += data.deactivated  ?? 0;
      acc.errors       += data.errors       ?? 0;

      setSyncProgress({ half, done: offset + (data.processedCount ?? limit), total: data.totalFromHiper ?? total });
      return data as { totalFromHiper: number; hasMore: boolean; processedCount: number };
    }

    try {
      // 1ª metade — usa limit grande; a resposta traz o total real
      setSyncProgress({ half: 1, done: 0, total: 0 });
      const first = await callSync(0, 15000, 1, 0);

      if (first.hasMore) {
        // 2ª metade — processa o restante exato
        const secondOffset = first.processedCount;
        const secondLimit  = first.totalFromHiper - secondOffset;
        setSyncProgress({ half: 2, done: secondOffset, total: first.totalFromHiper });
        await callSync(secondOffset, secondLimit, 2, first.totalFromHiper);
      }

      setSyncResult({ ...acc, totalFromHiper: first.totalFromHiper, hasMore: false, processedOffset: 0, processedCount: first.totalFromHiper, nextOffset: null, nextPontoDeSincronizacao: 0 });
      loadProducts(1, search);
      setPage(1);
    } catch (err: any) {
      setSyncError(err.message ?? 'Falha na comunicação com o servidor');
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {total} produto{total !== 1 ? 's' : ''} no total
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing
              ? syncProgress
                ? `${syncProgress.half === 1 ? '1ª metade' : '2ª metade'}… ${syncProgress.done}/${syncProgress.total}`
                : 'Buscando produtos...'
              : 'Sincronizar Hiper'}
          </Button>
        </div>
      </div>

      {/* Sync feedback */}
      {syncResult && (
        <div className="mb-4 p-4 rounded-lg border border-green-200 bg-green-50 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div className="text-sm text-green-800">
            <p className="font-semibold mb-1">Sincronização concluída — {syncResult.totalFromHiper} produtos no Hiper</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span><strong>{syncResult.matched}</strong> vinculados</span>
              {syncResult.created > 0 && <span><strong>{syncResult.created}</strong> criados</span>}
              <span><strong>{syncResult.stockUpdated}</strong> estoques atualizados</span>
              {syncResult.deactivated > 0 && <span className="text-gray-600"><strong>{syncResult.deactivated}</strong> desativados</span>}
              {syncResult.unmatched > 0 && <span className="text-amber-700"><strong>{syncResult.unmatched}</strong> sem correspondência</span>}
              {syncResult.errors > 0 && <span className="text-red-700"><strong>{syncResult.errors}</strong> erros</span>}
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

      {/* Busca */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">Buscar</Button>
        {search && (
          <Button type="button" variant="ghost" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
            Limpar
          </Button>
        )}
      </form>

      {/* Tabela */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Carregando produtos...</div>
      ) : (
        <>
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
                      {search ? `Nenhum produto encontrado para "${search}"` : 'Nenhum produto cadastrado'}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{product.name}</span>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs text-gray-400">{product.sku}</span>
                            {product.isPromo && (
                              <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-1.5 rounded">Em Oferta</span>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.stock}</td>
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                {total > 0 ? `Mostrando ${start}–${end} de ${total} produtos` : 'Nenhum resultado'}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => goToPage(1)} disabled={page === 1} className="px-2">
                  «
                </Button>
                <Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page === 1} className="px-2">
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  return start + i;
                }).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => goToPage(p)}
                    className="w-8 px-0"
                  >
                    {p}
                  </Button>
                ))}

                <Button variant="outline" size="sm" onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="px-2">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="px-2">
                  »
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
