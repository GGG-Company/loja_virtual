'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  category: { name: string };
}

const PAGE_SIZE = 4;

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const autoplayPlugin = useRef(Autoplay({ delay: 15000, stopOnInteraction: false }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplayPlugin.current]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await apiClient.get<{ products: Product[] }>('/api/products/trending');
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

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  const prev = useCallback(() => {
    emblaApi?.scrollPrev();
    autoplayPlugin.current.reset();
  }, [emblaApi]);
  const next = useCallback(() => {
    emblaApi?.scrollNext();
    autoplayPlugin.current.reset();
  }, [emblaApi]);

  // Divide os produtos em grupos de PAGE_SIZE
  const pages: Product[][] = [];
  for (let i = 0; i < products.length; i += PAGE_SIZE) {
    pages.push(products.slice(i, i + PAGE_SIZE));
  }

  return (
    <section className="py-10 lg:py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-8 lg:mb-12"
        >
          <div>
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
          </div>

          {!isLoading && !hasError && pages.length > 1 && (
            <div className="hidden sm:flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={prev}
                aria-label="Página anterior"
                className="w-10 h-10 flex items-center justify-center border border-gray-200 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors rounded-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                aria-label="Próxima página"
                className="w-10 h-10 flex items-center justify-center border border-gray-200 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors rounded-sm"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(PAGE_SIZE)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : hasError ? (
          <div className="text-center py-10">
            <p className="text-gray-500 font-body">
              Não foi possível carregar os produtos em destaque. Tente recarregar a página.
            </p>
          </div>
        ) : (
          <>
            {/* Embla viewport */}
            <div ref={emblaRef} className="overflow-hidden">
              <div className="flex">
                {pages.map((group, pageIdx) => (
                  <div key={pageIdx} className="flex-none w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {group.map((product, idx) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          priority={pageIdx === 0 && idx < 4}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dots */}
            {pages.length > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => emblaApi?.scrollTo(i)}
                    aria-label={`Página ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === selectedIndex ? 'w-8 bg-[#CC1020]' : 'w-2 bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
