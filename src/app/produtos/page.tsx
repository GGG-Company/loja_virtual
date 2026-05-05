'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProductCard } from '@/components/product-card';
import { SkeletonCard } from '@/components/skeleton-card';
import { ProductFilters, type FilterCounts } from '@/components/ProductFilters';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, PackageSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Breadcrumb } from '@/components/breadcrumb';
import logger from '@/lib/logger';
import { PRICE_MIN, PRICE_MAX } from '@/hooks/useFilters';

type ProductListItem = {
  id: string;
  name: string;
  price: number;
  promotionalPrice?: number | null;
  imageUrl?: string | null;
  images?: { url: string; alt?: string | null }[];
  category?: { id?: string; name?: string; slug?: string };
  brand?: { id?: string; name?: string; slug?: string } | null;
  specs?: Record<string, unknown>;
  createdAt?: string;
};

type Pagination = { page: number; pages: number; total: number; pageSize: number };

const VOLTAGE_OPTIONS = ['110V', '220V', 'Bivolt', 'Bateria'];

function extractVoltages(p: ProductListItem): string[] {
  const s = String(p.specs?.voltagem || p.specs?.voltage || '').trim();
  if (s && s !== 'undefined') return [s];
  const name = (p.name || '').toLowerCase();
  return VOLTAGE_OPTIONS.filter((v) => name.includes(v.toLowerCase()));
}

function parseIntSafe(v: string | null, fallback: number) {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

type DbBrand = { id: string; name: string; slug: string; _count: { products: number } };

function ProductsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [products,    setProducts]    = useState<ProductListItem[]>([]);
  const [pagination,  setPagination]  = useState<Pagination>({ page: 1, pages: 1, total: 0, pageSize: 24 });
  const [dbBrands,    setDbBrands]    = useState<DbBrand[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Parâmetros da URL — fonte única de verdade
  const categoria   = searchParams?.get('categoria')  ?? null;
  const grupo       = searchParams?.get('grupo')       ?? null;
  const search      = searchParams?.get('search')      ?? null;
  const currentPage = parseIntSafe(searchParams?.get('page'), 1);
  const brands      = useMemo(() => (searchParams?.get('brands') ?? '').split(',').filter(Boolean), [searchParams]);
  const voltages    = useMemo(() => (searchParams?.get('voltages') ?? '').split(',').filter(Boolean), [searchParams]);
  const minPrice    = parseIntSafe(searchParams?.get('minPrice'), PRICE_MIN);
  const maxPrice    = parseIntSafe(searchParams?.get('maxPrice'), PRICE_MAX);
  const currentSort = searchParams?.get('sort') ?? 'recent';
  const onSale      = searchParams?.get('onSale') === 'true';
  const inStock     = searchParams?.get('inStock') === 'true';

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoria)       params.set('categoria', categoria);
      if (grupo)           params.set('grupo', grupo);
      if (search)          params.set('search', search);
      if (currentPage > 1) params.set('page', String(currentPage));
      if (brands.length)   params.set('brands', brands.join(','));
      if (minPrice > PRICE_MIN) params.set('minPrice', String(minPrice));
      if (maxPrice < PRICE_MAX) params.set('maxPrice', String(maxPrice));
      if (currentSort !== 'recent') params.set('sort', currentSort);
      if (onSale)   params.set('onSale', 'true');
      if (inStock)  params.set('inStock', 'true');

      const res = await apiClient.get<{ products: ProductListItem[]; pagination: Pagination }>(
        `/api/products?${params}`,
      );
      setProducts(res.data.products ?? []);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch (err) {
      logger.error(err, '[PLP] fetchProducts failed');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, grupo, search, currentPage, brands.join(','), minPrice, maxPrice, currentSort, onSale, inStock]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    fetch('/api/brands?limit=200')
      .then((r) => r.json())
      .then((d) => setDbBrands(d.brands ?? []))
      .catch(() => {});
  }, []);

  // Voltagem: filtro client-side sobre a página atual (campo não estruturado)
  const filteredProducts = useMemo(() => {
    if (voltages.length === 0) return products;
    return products.filter((p) => {
      const vol = String(p.specs?.voltagem || p.specs?.voltage || '');
      return voltages.some(
        (v) =>
          p.name?.toLowerCase().includes(v.toLowerCase()) ||
          vol.toLowerCase().includes(v.toLowerCase()),
      );
    });
  }, [products, voltages]);

  // Counts para o sidebar — marcas: total do banco; voltagens: da página atual
  const brandCounts = useMemo<FilterCounts>(() => {
    const counts: FilterCounts = {};
    for (const b of dbBrands) counts[b.name] = b._count.products;
    return counts;
  }, [dbBrands]);

  const voltageCounts = useMemo<FilterCounts>(() => {
    const counts: FilterCounts = {};
    for (const p of products) {
      for (const v of extractVoltages(p)) {
        counts[v] = (counts[v] ?? 0) + 1;
      }
    }
    return counts;
  }, [products]);

  function goToPage(p: number) {
    const next = Math.max(1, Math.min(p, pagination.pages));
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    router.push(params.toString() ? `/produtos?${params}` : '/produtos', { scroll: true });
  }

  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.delete('page');
      if (value === 'recent') params.delete('sort');
      else params.set('sort', value);
      router.replace(params.toString() ? `/produtos?${params}` : '/produtos', { scroll: false });
    },
    [router, searchParams],
  );

  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end   = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="relative bg-[#1A1A1A] text-white py-5 sm:py-8 lg:py-14 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(-55deg, #CC1020 0px, #CC1020 2px, transparent 2px, transparent 28px)`,
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#CC1020]" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="w-1 h-5 sm:h-8 bg-[#CC1020] rounded-full" />
              <p className="text-[10px] sm:text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                Catálogo
              </p>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold uppercase mb-1">Nossos Produtos</h1>
            <p className="text-gray-300 font-body text-sm sm:text-base">Encontre as melhores ferramentas profissionais</p>
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <Breadcrumb items={[{ label: 'Produtos', href: '/produtos' }]} className="mb-6" />

          <div className="grid lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Sidebar de filtros */}
            <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <ProductFilters
                brandCounts={brandCounts}
                voltageCounts={voltageCounts}
                onClose={() => setShowFilters(false)}
              />
            </div>

            {/* Grid de produtos */}
            <div className="lg:col-span-3">
              {/* Toolbar */}
              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4 sm:mb-6 flex items-center justify-between gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden h-9 px-3 text-sm"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                  Filtros
                </Button>

                <span className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                  {isLoading ? (
                    <span className="animate-pulse bg-gray-200 rounded h-4 w-28 inline-block" />
                  ) : pagination.total > 0 ? (
                    <>
                      Mostrando {start}–{end} de {pagination.total} produto{pagination.total !== 1 ? 's' : ''}
                    </>
                  ) : (
                    'Nenhum produto encontrado'
                  )}
                </span>

                <select
                  value={currentSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="ml-auto border border-gray-300 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#CC1020]/30 focus:border-[#CC1020]"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                  <option value="name">Nome A-Z</option>
                </select>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {isLoading ? (
                  [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PackageSearch className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="font-display text-lg font-bold text-[#1A1A1A] uppercase mb-1">
                      Nenhum produto encontrado
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      {search
                        ? `Nenhum resultado para "${search}". Tente outro termo ou remova os filtros.`
                        : 'Tente ajustar os filtros ou explore outras categorias.'}
                    </p>
                    <Button variant="outline" onClick={() => router.push('/produtos')}>
                      Ver todos os produtos
                    </Button>
                  </div>
                )}
              </div>

              {/* Paginação */}
              {!isLoading && pagination.pages > 1 && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-xs text-gray-600 hover:border-[#CC1020] hover:text-[#CC1020] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      «
                    </button>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:border-[#CC1020] hover:text-[#CC1020] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const startPage = Math.max(1, Math.min(currentPage - 2, pagination.pages - 4));
                      return startPage + i;
                    }).map((p) => (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={`h-7 w-7 flex items-center justify-center rounded border text-xs font-medium transition-colors ${
                          p === currentPage
                            ? 'border-[#CC1020] bg-[#CC1020] text-white'
                            : 'border-gray-200 text-gray-600 hover:border-[#CC1020] hover:text-[#CC1020]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === pagination.pages}
                      className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:border-[#CC1020] hover:text-[#CC1020] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => goToPage(pagination.pages)}
                      disabled={currentPage === pagination.pages}
                      className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-xs text-gray-600 hover:border-[#CC1020] hover:text-[#CC1020] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      »
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Página {currentPage} de {pagination.pages}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#CC1020]" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
