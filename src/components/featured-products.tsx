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
const MOBILE_PAGE_SIZE = 2;

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Desktop carousel
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autoplayPlugin = useRef(Autoplay({ delay: 15000, stopOnInteraction: false }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplayPlugin.current]);

  // Mobile carousel
  const [mobileSelectedIndex, setMobileSelectedIndex] = useState(0);
  const mobileAutoplayPlugin = useRef(Autoplay({ delay: 15000, stopOnInteraction: false }));
  const [mobileEmblaRef, mobileEmblaApi] = useEmblaCarousel({ loop: true }, [mobileAutoplayPlugin.current]);

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

  const onMobileSelect = useCallback(() => {
    if (!mobileEmblaApi) return;
    setMobileSelectedIndex(mobileEmblaApi.selectedScrollSnap());
  }, [mobileEmblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!mobileEmblaApi) return;
    onMobileSelect();
    mobileEmblaApi.on('select', onMobileSelect);
    return () => { mobileEmblaApi.off('select', onMobileSelect); };
  }, [mobileEmblaApi, onMobileSelect]);

  const prev = useCallback(() => {
    emblaApi?.scrollPrev();
    autoplayPlugin.current.reset();
  }, [emblaApi]);
  const next = useCallback(() => {
    emblaApi?.scrollNext();
    autoplayPlugin.current.reset();
  }, [emblaApi]);

  const mobilePrev = useCallback(() => {
    mobileEmblaApi?.scrollPrev();
    mobileAutoplayPlugin.current.reset();
  }, [mobileEmblaApi]);
  const mobileNext = useCallback(() => {
    mobileEmblaApi?.scrollNext();
    mobileAutoplayPlugin.current.reset();
  }, [mobileEmblaApi]);

  // Divide os produtos em grupos de PAGE_SIZE (desktop=4, mobile=2)
  const pages: Product[][] = [];
  for (let i = 0; i < products.length; i += PAGE_SIZE) {
    pages.push(products.slice(i, i + PAGE_SIZE));
  }
  const mobilePages: Product[][] = [];
  for (let i = 0; i < products.length; i += MOBILE_PAGE_SIZE) {
    mobilePages.push(products.slice(i, i + MOBILE_PAGE_SIZE));
  }

  return (
    <section className="py-6 sm:py-10 lg:py-16 bg-white">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-5 sm:mb-8 lg:mb-12"
        >
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-1 h-6 sm:h-8 bg-[#CC1020] rounded-full" />
              <p className="text-[10px] sm:text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                Destaques
              </p>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] uppercase mb-1 sm:mb-2">
              Produtos em Destaque
            </h2>
            <p className="text-gray-500 font-body max-w-2xl text-sm sm:text-base">
              Confira nossa seleção especial de ferramentas profissionais com os melhores preços
            </p>
          </div>

          {!isLoading && !hasError && pages.length > 1 && (
            <div className="hidden lg:flex items-center gap-2 shrink-0 ml-4">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
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
            {/* Mobile — 2 por slide, setas próprias (< lg) */}
            <div className="lg:hidden">
              <div ref={mobileEmblaRef} className="overflow-hidden">
                <div className="flex">
                  {mobilePages.map((group, pageIdx) => (
                    <div key={pageIdx} className="flex-none w-full">
                      <div className="grid grid-cols-2 gap-3">
                        {group.map((product, idx) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            priority={pageIdx === 0 && idx < 2}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Controles mobile */}
              {mobilePages.length > 1 && (
                <div className="flex justify-center items-center gap-3 mt-5">
                  <button onClick={mobilePrev} aria-label="Anterior" className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors rounded-sm">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {mobilePages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => mobileEmblaApi?.scrollTo(i)}
                        aria-label={`Página ${i + 1}`}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === mobileSelectedIndex ? 'w-6 bg-[#CC1020]' : 'w-2 bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                  <button onClick={mobileNext} aria-label="Próxima" className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors rounded-sm">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Desktop — 4 por slide (≥ lg) */}
            <div className="hidden lg:block">
              <div ref={emblaRef} className="overflow-hidden">
                <div className="flex">
                  {pages.map((group, pageIdx) => (
                    <div key={pageIdx} className="flex-none w-full">
                      <div className="grid grid-cols-4 gap-6">
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
            </div>
          </>
        )}
      </div>
    </section>
  );
}
