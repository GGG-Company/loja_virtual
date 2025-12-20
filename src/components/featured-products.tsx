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

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await apiClient.get<{ products: Product[] }>('/api/products?featured=true&limit=4');
        const normalized = response.data.products.map((product) => ({
          ...product,
          imageUrl: product.imageUrl || product.images?.[0]?.url || null,
        }));
        setProducts(normalized);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-metallic-900 mb-4">
            Produtos em Destaque
          </h2>
          <p className="text-metallic-600 max-w-2xl mx-auto">
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
          ) : (
            products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
