'use client';

import { useEffect, useState, useRef } from 'react';
import { ProductCard } from '@/components/product-card';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RecentProduct {
  id: string;
  name: string;
  slug?: string;
  price: number;
  promotionalPrice?: number | null;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  images?: { url: string; alt?: string | null }[];
  isFeatured?: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-sm shadow-md border border-gray-100 overflow-hidden animate-pulse shrink-0 w-[160px] sm:w-[200px] lg:w-auto">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="h-8 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export function RecentlyViewed() {
  const { getIds } = useRecentlyViewed();
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ids, setIds] = useState<string[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIds(getIds());
  }, []);

  useEffect(() => {
    if (ids.length === 0) { setIsLoading(false); return; }
    setIsLoading(true);
    Promise.all(
      ids.map((id) =>
        fetch(`/api/products/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => data?.product ?? null)
          .catch(() => null)
      )
    )
      .then((results) => setProducts(results.filter(Boolean) as RecentProduct[]))
      .finally(() => setIsLoading(false));
  }, [ids]);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollButtons); ro.disconnect(); };
  }, [products]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  if (!isLoading && products.length === 0) return null;

  const count = isLoading ? Math.min(ids.length || 4, 6) : products.length;

  return (
    <section className="py-10 bg-gray-50">
      <div className="container mx-auto px-4">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1A1A1A] uppercase tracking-wide">
              Vistos Recentemente
            </h2>
          </div>

          {/* Botões prev/next — visíveis quando há scroll */}
          {!isLoading && products.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                aria-label="Anterior"
                className="p-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                aria-label="Próximo"
                className="p-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Carrossel com scroll horizontal */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory
              [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
              lg:grid lg:grid-cols-6 lg:overflow-visible"
          >
            {isLoading
              ? Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="snap-start shrink-0 w-[160px] sm:w-[200px] lg:w-auto lg:shrink">
                    <SkeletonCard />
                  </div>
                ))
              : products.map((product) => (
                  <div key={product.id} className="snap-start shrink-0 w-[160px] sm:w-[200px] lg:w-auto lg:shrink">
                    <ProductCard product={product} />
                  </div>
                ))
            }
          </div>

          {/* Fade nas bordas para indicar scroll em mobile */}
          {canScrollLeft && (
            <div className="lg:hidden absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none" />
          )}
          {canScrollRight && (
            <div className="lg:hidden absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Indicador de scroll — mobile */}
        {!isLoading && products.length > 2 && (
          <p className="lg:hidden text-center text-xs text-gray-400 mt-3">
            Deslize para ver mais →
          </p>
        )}
      </div>
    </section>
  );
}
