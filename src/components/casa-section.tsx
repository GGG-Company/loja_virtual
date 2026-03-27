'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Home, ArrowRight } from 'lucide-react';
import { ProductCard } from './product-card';
import { SkeletonCard } from './skeleton-card';
import { apiClient } from '@/lib/api-client';

interface Product {
  id: string;
  name: string;
  slug?: string;
  price: number;
  promotionalPrice?: number | null;
  imageUrl?: string | null;
  images?: { url: string; alt?: string | null }[];
  isFeatured?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38 } },
};

export function CasaSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function fetchCasaProducts() {
      try {
        const response = await apiClient.get<{ products: Product[] }>(
          '/api/products?categoria=casa&limit=4'
        );
        const normalized = (response.data.products ?? []).map((p) => ({
          ...p,
          imageUrl: p.imageUrl || p.images?.[0]?.url || null,
        }));
        setProducts(normalized);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCasaProducts();
  }, []);

  // Não renderiza a seção se não houver produtos e não estiver carregando
  if (!isLoading && !hasError && products.length === 0) return null;

  return (
    <section className="py-10 lg:py-16 bg-[#1A1A1A] relative overflow-hidden">
      {/* Diagonal stripe background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -55deg,
            #CC1020 0px,
            #CC1020 2px,
            transparent 2px,
            transparent 28px
          )`,
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#CC1020]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-[#CC1020]/20 rounded flex items-center justify-center">
                <Home className="h-5 w-5 text-[#CC1020]" />
              </div>
              <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                Categoria
              </p>
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white uppercase">
              Para a sua <span className="text-[#CC1020]">Casa</span>
            </h2>
            <p className="text-gray-400 font-body mt-2 max-w-lg">
              Tudo que você precisa para deixar sua casa do jeito que sempre quis
            </p>
          </div>

          <Link
            href="/produtos?categoria=casa"
            className="hidden lg:flex items-center gap-2 text-sm font-display font-bold text-white hover:text-[#CC1020] tracking-wide uppercase transition-colors group shrink-0"
          >
            Ver todos
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : hasError ? (
          <div className="text-center py-10">
            <p className="text-gray-500 font-body">
              Não foi possível carregar os produtos. Tente recarregar a página.
            </p>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {products.map((product) => (
              <motion.div key={product.id} variants={cardItem}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Link mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center lg:hidden"
        >
          <Link
            href="/produtos?categoria=casa"
            className="inline-flex items-center gap-2 border border-white/20 hover:border-[#CC1020] hover:text-[#CC1020] text-white font-display font-bold text-sm tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Ver todos os produtos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
