'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProductCard } from '@/components/product-card';
import { SkeletonCard } from '@/components/skeleton-card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SlidersHorizontal } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type ProductListItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  images?: { url: string; alt?: string | null }[];
  category?: {
    id?: string;
    name?: string;
    slug?: string;
  };
};

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [sortBy, setSortBy] = useState('recent');

  const searchKey = useMemo(() => searchParams?.toString() ?? '', [searchParams]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const categoria = searchParams?.get('categoria');
      let url = '/api/products';
      if (categoria) {
        url += `?categoria=${categoria}`;
      }
      const response = await apiClient.get<{ products: ProductListItem[] }>(url);
      setProducts(response.data.products);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, searchKey]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50">
        {/* Hero */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">Nossos Produtos</h1>
            <p className="text-lg text-primary-100">
              Encontre as melhores ferramentas profissionais
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white rounded-lg shadow-md p-6 space-y-6 sticky top-24">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-metallic-900">Filtros</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden text-metallic-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <Label>Faixa de Preço</Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={5000}
                    step={50}
                    className="my-4"
                  />
                  <div className="flex justify-between text-sm text-metallic-600">
                    <span>R$ {priceRange[0]}</span>
                    <span>R$ {priceRange[1]}</span>
                  </div>
                </div>

                {/* Brands */}
                <div className="space-y-3">
                  <Label>Marcas</Label>
                  <div className="space-y-2">
                    {['Makita', 'Bosch', 'DeWalt', 'Black+Decker', 'Tramontina'].map((brand) => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-metallic-300" />
                        <span className="text-sm text-metallic-700">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Voltage */}
                <div className="space-y-3">
                  <Label>Voltagem</Label>
                  <div className="space-y-2">
                    {['110V', '220V', 'Bivolt', 'Bateria'].map((voltage) => (
                      <label key={voltage} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-metallic-300" />
                        <span className="text-sm text-metallic-700">{voltage}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button className="w-full">Aplicar Filtros</Button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              {/* Toolbar */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden"
                >
                  <SlidersHorizontal className="h-5 w-5 mr-2" />
                  Filtros
                </Button>

                <div className="hidden lg:block text-sm text-metallic-600">
                  {products.length} produtos encontrados
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-metallic-300 rounded-md px-4 py-2 text-sm"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                  <option value="name">Nome A-Z</option>
                </select>
              </div>

              {/* Products */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </>
                ) : products.length > 0 ? (
                  products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-metallic-600 text-lg">
                      Nenhum produto encontrado
                    </p>
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
