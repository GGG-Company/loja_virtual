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
import { SlidersHorizontal, PackageSearch } from 'lucide-react';
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

const VOLTAGE_OPTIONS = ['110V', '220V', 'Bivolt', 'Bateria'];

function extractBrand(p: ProductListItem): string | null {
  if (p.brand?.name) return p.brand.name;
  const s = String(p.specs?.marca || p.specs?.brand || '').trim();
  if (s && s !== 'undefined' && s !== 'null') return s;
  return null;
}

function extractVoltages(p: ProductListItem): string[] {
  const s = String(p.specs?.voltagem || p.specs?.voltage || '').trim();
  if (s && s !== 'undefined') return [s];
  const name = (p.name || '').toLowerCase();
  return VOLTAGE_OPTIONS.filter((v) => name.includes(v.toLowerCase()));
}

// ── Sorting helper ────────────────────────────────────────────────────────────
function sortProducts(list: ProductListItem[], sortVal: string): ProductListItem[] {
  return [...list].sort((a, b) => {
    const pA = a.promotionalPrice ?? a.price ?? 0;
    const pB = b.promotionalPrice ?? b.price ?? 0;
    switch (sortVal) {
      case 'price-asc':  return pA - pB;
      case 'price-desc': return pB - pA;
      case 'name':       return (a.name || '').localeCompare(b.name || '');
      default:
        if (a.createdAt && b.createdAt)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return 0;
    }
  });
}

function parseIntSafe(v: string | null, fallback: number) {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

type DbBrand = { id: string; name: string; slug: string; _count: { products: number } };

// ── Page content ──────────────────────────────────────────────────────────────
function ProductsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]);
  const [dbBrands,    setDbBrands]    = useState<DbBrand[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Only re-fetch when categoria/grupo or search changes — NOT when filter params change
  const categoria = searchParams?.get('categoria') ?? null;
  const grupo     = searchParams?.get('grupo')     ?? null;
  const search    = searchParams?.get('search')    ?? null;

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoria) params.set('categoria', categoria);
      if (grupo)     params.set('grupo', grupo);
      if (search)    params.set('search', search);
      const url = params.toString() ? `/api/products?${params}` : '/api/products';
      const res = await apiClient.get<{ products: ProductListItem[] }>(url);
      setAllProducts(res.data.products ?? []);
    } catch (err) {
      logger.error(err, '[PLP] fetchProducts failed');
    } finally {
      setIsLoading(false);
    }
  }, [categoria, grupo, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((d) => setDbBrands(d.brands ?? []))
      .catch(() => {});
  }, []);

  // ── Dynamic filter options from loaded products ───────────────────────────
  const brandCounts = useMemo<FilterCounts>(() => {
    const counts: FilterCounts = {};
    for (const b of dbBrands) counts[b.name] = 0;
    for (const p of allProducts) {
      const brandName = p.brand?.name;
      if (brandName && Object.prototype.hasOwnProperty.call(counts, brandName)) {
        counts[brandName]++;
      }
    }
    return counts;
  }, [allProducts, dbBrands]);

  const voltageCounts = useMemo<FilterCounts>(() => {
    const counts: FilterCounts = {};
    for (const p of allProducts) {
      for (const v of extractVoltages(p)) {
        counts[v] = (counts[v] ?? 0) + 1;
      }
    }
    return counts;
  }, [allProducts]);

  // ── Reactive client-side filtering — URL is the single source of truth ────
  const filteredProducts = useMemo(() => {
    const minPrice     = parseIntSafe(searchParams?.get('minPrice'), PRICE_MIN);
    const maxPrice     = parseIntSafe(searchParams?.get('maxPrice'), PRICE_MAX);
    const brandFilter  = (searchParams?.get('brands')   ?? '').split(',').filter(Boolean);
    const voltFilter   = (searchParams?.get('voltages') ?? '').split(',').filter(Boolean);
    const sortVal      = searchParams?.get('sort') ?? 'recent';

    const filtered = allProducts.filter((p) => {
      const price = p.promotionalPrice ?? p.price ?? 0;
      if (price < minPrice || price > maxPrice) return false;

      if (brandFilter.length > 0) {
        const brandName = extractBrand(p) || '';
        const ok = brandFilter.some(
          (b) => brandName.toLowerCase() === b.toLowerCase(),
        );
        if (!ok) return false;
      }

      if (voltFilter.length > 0) {
        const vol = String(p.specs?.voltagem || p.specs?.voltage || '');
        const ok = voltFilter.some(
          (v) =>
            p.name?.toLowerCase().includes(v.toLowerCase()) ||
            vol.toLowerCase().includes(v.toLowerCase()),
        );
        if (!ok) return false;
      }

      return true;
    });

    return sortProducts(filtered, sortVal);
  }, [allProducts, searchParams]);

  // ── Sort selector (toolbar) — updates URL directly ───────────────────────
  const currentSort = searchParams?.get('sort') ?? 'recent';

  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (value === 'recent') params.delete('sort');
      else params.set('sort', value);
      const str = params.toString();
      router.replace(str ? `/produtos?${str}` : '/produtos', { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="relative bg-[#1A1A1A] text-white py-8 lg:py-14 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(-55deg, #CC1020 0px, #CC1020 2px, transparent 2px, transparent 28px)`,
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#CC1020]" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-[#CC1020] rounded-full" />
              <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                Catálogo
              </p>
            </div>
            <h1 className="font-display text-4xl font-bold uppercase mb-1">Nossos Produtos</h1>
            <p className="text-gray-300 font-body">Encontre as melhores ferramentas profissionais</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Breadcrumb items={[{ label: 'Produtos', href: '/produtos' }]} className="mb-6" />

          <div className="grid lg:grid-cols-4 gap-6">
            {/* ── Filter Sidebar ── */}
            <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <ProductFilters
                brandCounts={brandCounts}
                voltageCounts={voltageCounts}
                onClose={() => setShowFilters(false)}
              />
            </div>

            {/* ── Product Grid ── */}
            <div className="lg:col-span-3">
              {/* Toolbar */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                </Button>

                <span className="hidden lg:block text-sm text-gray-500">
                  {isLoading ? (
                    <span className="animate-pulse bg-gray-200 rounded h-4 w-28 inline-block" />
                  ) : (
                    <>{filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}</>
                  )}
                </span>

                <select
                  value={currentSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="ml-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC1020]/30 focus:border-[#CC1020]"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                  <option value="name">Nome A-Z</option>
                </select>
              </div>

              {/* Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
