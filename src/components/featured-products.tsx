'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ProductCard } from './product-card';
import { SkeletonCard } from './skeleton-card';
import { apiClient } from '@/lib/api-client';

interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  images?: { url: string; alt?: string | null }[];
  category: {
    name: string;
  };
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await apiClient.get<{ products: Product[] }>('/api/products?featured=true&limit=4');
        const normalized = response.data.products.map((product) => ({
          ...product,
          imageUrl: product.imageUrl || product.images?.[0]?.url || null,
        }));
        setProducts(normalized);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return (
    <section className="py-10 lg:py-16 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 lg:mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-8 bg-[#CC1020] rounded-full" />
            <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
              Destaques
            </p>
          </div>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-[#1A1A1A] uppercase mb-2">
            Produtos em Destaque
          </h2>
          <p className="text-gray-500 font-body max-w-2xl">
            Confira nossa seleção especial de ferramentas profissionais com os melhores preços
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          ) : hasError ? (
            <div className="col-span-full text-center py-10">
              <p className="text-gray-500 font-body">Não foi possível carregar os produtos em destaque. Tente recarregar a página.</p>
            </div>
          ) : (
            products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <ProductCard product={product} priority={index < 4} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
