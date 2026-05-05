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

  // Desktop carousel (Embla — 4 por página)
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autoplayPlugin = useRef(Autoplay({ delay: 15000, stopOnInteraction: false }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplayPlugin.current]);

  // Mobile scroll ref
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await apiClient.get<{ products: Product[] }>('/api/products/trending');
        setProducts(
          response.data.products.map((p) => ({
            ...p,
            imageUrl: p.imageUrl || p.images?.[0]?.url || null,
          }))
        );
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Desktop carousel — dots
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

  const prev = useCallback(() => { emblaApi?.scrollPrev(); autoplayPlugin.current.reset(); }, [emblaApi]);
  const next = useCallback(() => { emblaApi?.scrollNext(); autoplayPlugin.current.reset(); }, [emblaApi]);

  // Mobile scroll — botões
  const updateMobileScroll = () => {
    const el = mobileScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    updateMobileScroll();
    el.addEventListener('scroll', updateMobileScroll, { passive: true });
    const ro = new ResizeObserver(updateMobileScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateMobileScroll); ro.disconnect(); };
  }, [products]);

  const mobileScroll = (dir: 'left' | 'right') => {
    mobileScrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  // Desktop — páginas de 4
  const pages: Product[][] = [];
  for (let i = 0; i < products.length; i += PAGE_SIZE) {
    pages.push(products.slice(i, i + PAGE_SIZE));
  }

  return (
    <section className="py-6 sm:py-10 lg:py-16 bg-white">
      <div className="container mx-auto px-3 sm:px-4">

        {/* Cabeçalho */}
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

          {/* Setas desktop */}
          {!isLoading && !hasError && pages.length > 1 && (
            <div className="hidden lg:flex items-center gap-2 shrink-0 ml-4">
              <button onClick={prev} aria-label="Página anterior" className="w-10 h-10 flex items-center justify-center border border-gray-200 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors rounded-sm">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={next} aria-label="Próxima página" className="w-10 h-10 flex items-center justify-center border border-gray-200 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors rounded-sm">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Setas mobile */}
          {!isLoading && !hasError && products.length > 2 && (
            <div className="lg:hidden flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => mobileScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Anterior"
                className="p-1.5 rounded-full border border-gray-200 text-gray-400 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => mobileScroll('right')}
                disabled={!canScrollRight}
                aria-label="Próximo"
                className="p-1.5 rounded-full border border-gray-200 text-gray-400 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Conteúdo */}
        {isLoading ? (
          <>
            {/* Skeleton mobile */}
            <div className="lg:hidden flex gap-3 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="shrink-0 w-[calc(50%-6px)]">
                  <SkeletonCard />
                </div>
              ))}
            </div>
            {/* Skeleton desktop */}
            <div className="hidden lg:grid grid-cols-4 gap-6">
              {[...Array(PAGE_SIZE)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        ) : hasError ? (
          <div className="text-center py-10">
            <p className="text-gray-500 font-body">
              Não foi possível carregar os produtos. Tente recarregar a página.
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile — scroll individual card a card ─────────────────── */}
            <div className="lg:hidden relative">
              <div
                ref={mobileScrollRef}
                className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory
                  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {products.map((product, idx) => (
                  <div
                    key={product.id}
                    className="snap-start shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)]"
                  >
                    <ProductCard product={product} priority={idx < 2} />
                  </div>
                ))}
              </div>

              {/* Fade nas bordas */}
              {canScrollLeft && (
                <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none" />
              )}
              {canScrollRight && (
                <div className="absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
              )}
            </div>

            {/* Indicador deslize */}
            {products.length > 2 && (
              <p className="lg:hidden text-center text-xs text-gray-400 mt-3">
                Deslize para ver mais →
              </p>
            )}

            {/* ── Desktop — Embla, 4 por página ──────────────────────────── */}
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
