'use client';

import { useId, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Search,
  Clock,
  X,
  Loader2,
  Tag,
  ChevronRight,
  AlertCircle,
  PackageSearch,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmartSearch, type SearchProduct } from '@/hooks/useSmartSearch';
import { cn } from '@/lib/utils';

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function ProductSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-md shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-gray-200 rounded-full w-3/4" />
        <div className="h-3 bg-gray-200 rounded-full w-1/3" />
      </div>
      <div className="h-4 w-4 bg-gray-200 rounded" />
    </div>
  );
}

type SmartSearchBarProps = {
  className?: string;
  placeholder?: string;
  enableSlashShortcut?: boolean;
  autoFocus?: boolean;
};

export function SmartSearchBar({
  className,
  placeholder = 'Buscar ferramentas, marcas... (pressione / para focar)',
  enableSlashShortcut = false,
  autoFocus = false,
}: SmartSearchBarProps) {
  const router = useRouter();
  const uid = useId();
  const inputId = `smart-search-input-${uid}`;
  const listboxId = `smart-search-listbox-${uid}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLLIElement | null>(null);

  const {
    query,
    products,
    categories,
    isLoading,
    isError,
    isEmpty,
    isOpen,
    activeIndex,
    history,
    handleQueryChange,
    handleFocus,
    handleKeyDown,
    close,
    resetQuery,
    saveToHistory,
    clearHistory,
  } = useSmartSearch();

  // Scroll active keyboard item into view
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // "/" global shortcut to focus the search input
  useEffect(() => {
    if (!enableSlashShortcut) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableSlashShortcut]);

  // Close dropdown when clicking outside the component
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [close]);

  const handleSubmit = () => {
    const q = query.trim();
    if (!q) return;
    saveToHistory(q);
    close();
    router.push(`/produtos?search=${encodeURIComponent(q)}`);
  };

  const handleSelectProduct = (p: SearchProduct) => {
    saveToHistory(query.trim());
    resetQuery();
    router.push(`/produtos/${p.slug || p.id}`);
  };

  const handleSelectHistory = (term: string) => {
    handleQueryChange(term);
    inputRef.current?.focus();
  };

  const showHistory = isOpen && query.trim().length < 2 && history.length > 0;
  const showResults = isOpen && query.trim().length >= 2;
  const showDropdown =
    isOpen &&
    (showHistory || (showResults && (isLoading || isError || isEmpty || products.length > 0)));

  const activeDescendant =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* ── Input row ───────────────────────────────────────────────────────── */}
      <div className="flex">
        <label htmlFor={inputId} className="sr-only">
          Buscar produtos
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          aria-label="Buscar produtos"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          placeholder={placeholder}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={e => handleKeyDown(e, handleSelectProduct, handleSubmit)}
          className="w-full px-4 py-2.5 border-2 border-[#CC1020] rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#CC1020]/30 font-body text-sm bg-white"
        />
        <button
          type="button"
          onClick={handleSubmit}
          aria-label="Buscar"
          className="bg-[#CC1020] hover:bg-[#a80816] text-white px-4 rounded-r-md transition-colors flex items-center gap-2 font-display font-bold text-sm tracking-wide shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Search className="h-4 w-4" aria-hidden />
          )}
          <span className="hidden lg:block">BUSCAR</span>
        </button>
      </div>

      {/* ── Dropdown ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-2xl z-50 max-h-[480px] overflow-y-auto"
          >
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Sugestões de busca"
              className="py-1"
            >
              {/* ── Recent History ────────────────────────────────────────────── */}
              {showHistory && (
                <>
                  <li role="presentation">
                    <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                      <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                        Buscas Recentes
                      </span>
                      <button
                        onClick={clearHistory}
                        className="text-[10px] text-gray-400 hover:text-[#CC1020] transition-colors flex items-center gap-0.5"
                        aria-label="Limpar histórico de buscas"
                      >
                        <X className="h-2.5 w-2.5" />
                        Limpar
                      </button>
                    </div>
                  </li>
                  {history.map((term) => (
                    <li
                      key={term}
                      role="option"
                      aria-selected={false}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 cursor-pointer group transition-colors"
                      onClick={() => handleSelectHistory(term)}
                    >
                      <Clock
                        className="h-3.5 w-3.5 text-gray-400 shrink-0"
                        aria-hidden
                      />
                      <span className="text-sm text-gray-700 flex-1">{term}</span>
                      <ChevronRight
                        className="h-3 w-3 text-gray-300 group-hover:text-[#CC1020] transition-colors"
                        aria-hidden
                      />
                    </li>
                  ))}
                  <li role="presentation" aria-hidden>
                    <div className="border-t border-gray-100 my-1" />
                  </li>
                </>
              )}

              {/* ── Loading Skeletons ─────────────────────────────────────────── */}
              {isLoading && (
                <>
                  <li role="presentation">
                    <div className="px-4 pt-2 pb-1">
                      <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                        Buscando...
                      </span>
                    </div>
                  </li>
                  {[0, 1, 2].map(i => (
                    <li key={i} role="presentation" aria-hidden>
                      <ProductSkeleton />
                    </li>
                  ))}
                </>
              )}

              {/* ── Error State ───────────────────────────────────────────────── */}
              {isError && !isLoading && (
                <li
                  role="presentation"
                  className="flex items-center gap-3 px-4 py-5 text-sm text-red-600"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Erro ao buscar. Verifique sua conexão e tente novamente.
                  </span>
                </li>
              )}

              {/* ── Empty State ───────────────────────────────────────────────── */}
              {isEmpty && !isLoading && !isError && (
                <li role="presentation" className="px-4 py-6 text-center">
                  <PackageSearch
                    className="h-8 w-8 text-gray-300 mx-auto mb-2"
                    aria-hidden
                  />
                  <p className="text-sm font-semibold text-gray-700">
                    Nenhum produto encontrado
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Nenhum resultado para{' '}
                    <span className="font-medium text-gray-800">
                      &quot;{query}&quot;
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Tente um termo diferente ou verifique a grafia
                  </p>
                </li>
              )}

              {/* ── Categories ───────────────────────────────────────────────── */}
              {categories.length > 0 && !isLoading && (
                <>
                  <li role="presentation">
                    <div className="px-4 pt-2 pb-1.5">
                      <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                        Categorias
                      </span>
                    </div>
                  </li>
                  <li role="presentation">
                    <div className="flex flex-wrap gap-2 px-4 pb-2.5">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            close();
                            router.push(`/produtos?categoria=${cat.slug}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 hover:bg-[#CC1020] text-[#CC1020] hover:text-white text-xs font-semibold transition-colors border border-[#CC1020]/20"
                        >
                          <Tag className="h-3 w-3" aria-hidden />
                          {cat.name}
                          <span className="opacity-60">({cat.count})</span>
                        </button>
                      ))}
                    </div>
                  </li>
                  <li role="presentation" aria-hidden>
                    <div className="border-t border-gray-100 my-1" />
                  </li>
                </>
              )}

              {/* ── Products ─────────────────────────────────────────────────── */}
              {products.length > 0 && !isLoading && (
                <>
                  <li role="presentation">
                    <div className="px-4 pt-2 pb-1">
                      <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                        Produtos
                      </span>
                    </div>
                  </li>
                  {products.map((product, i) => {
                    const isActive = activeIndex === i;
                    const displayPrice = product.promotionalPrice ?? product.price;
                    const originalPrice = product.promotionalPrice ? product.price : null;

                    return (
                      <li
                        key={product.id}
                        id={`${listboxId}-option-${i}`}
                        ref={isActive ? activeItemRef : null}
                        role="option"
                        aria-selected={isActive}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                          isActive ? 'bg-red-50' : 'hover:bg-gray-50',
                        )}
                        onClick={() => handleSelectProduct(product)}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-gray-100 border border-gray-100">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized={product.imageUrl.startsWith('http')}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Search
                                className="h-4 w-4 text-gray-300"
                                aria-hidden
                              />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium truncate leading-tight">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={cn(
                                'text-sm font-bold',
                                product.promotionalPrice
                                  ? 'text-[#CC1020]'
                                  : 'text-gray-700',
                              )}
                            >
                              {formatBRL(displayPrice)}
                            </span>
                            {originalPrice && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatBRL(originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive ? 'text-[#CC1020]' : 'text-gray-300',
                          )}
                          aria-hidden
                        />
                      </li>
                    );
                  })}
                </>
              )}

              {/* ── Footer: See all results ───────────────────────────────────── */}
              {products.length > 0 && !isLoading && (
                <>
                  <li role="presentation" aria-hidden>
                    <div className="border-t border-gray-100" />
                  </li>
                  <li role="presentation">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-[#CC1020] hover:bg-red-50 transition-colors"
                    >
                      <Search className="h-3.5 w-3.5" aria-hidden />
                      Ver todos os resultados para &quot;{query}&quot;
                    </button>
                  </li>
                </>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
