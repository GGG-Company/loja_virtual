'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export type SearchProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  promotionalPrice?: number | null;
  imageUrl?: string | null;
  category?: { id: string; name: string; slug: string } | null;
};

export type SearchCategory = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

const HISTORY_KEY = 'fdf_search_history';
const MAX_HISTORY = 5;
const DEBOUNCE_MS = 350;
const CACHE_TTL = 60_000;
const INITIAL_DISPLAY = 5;
const DISPLAY_STEP = 5;

type CacheEntry = {
  data: { products: SearchProduct[]; categories: SearchCategory[] };
  ts: number;
};

// Module-level LRU cache — shared across all hook instances and survives re-renders
const searchCache = new Map<string, CacheEntry>();

function getCached(key: string): CacheEntry['data'] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: CacheEntry['data']): void {
  if (searchCache.size >= 50) {
    const oldest = [...searchCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) searchCache.delete(oldest[0]);
  }
  searchCache.set(key, { data, ts: Date.now() });
}

export function useSmartSearch() {
  const [query, setQueryState] = useState('');
  // allProducts holds the full result from the API; products is the visible slice
  const [allProducts, setAllProducts] = useState<SearchProduct[]>([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Derived — visible slice and pagination flags
  const products = useMemo(
    () => allProducts.slice(0, displayCount),
    [allProducts, displayCount],
  );
  const hasMore = displayCount < allProducts.length;
  const loadMore = useCallback(() => {
    setDisplayCount(prev => Math.min(prev + DISPLAY_STEP, allProducts.length));
  }, [allProducts.length]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const saveToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    setHistory(prev => {
      const next = [
        trimmed,
        ...prev.filter(h => h.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }, []);

  const executeSearch = useCallback(async (q: string) => {
    const cacheKey = q.toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) {
      setAllProducts(cached.products);
      setDisplayCount(INITIAL_DISPLAY);
      setCategories(cached.categories);
      setIsLoading(false);
      setIsError(false);
      setIsEmpty(cached.products.length === 0);
      setIsOpen(true);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setIsError(false);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error('search_failed');
      const data = await res.json();
      const prods: SearchProduct[] = data.products ?? [];
      const cats: SearchCategory[] = data.categories ?? [];
      setCache(cacheKey, { products: prods, categories: cats });
      setAllProducts(prods);
      setDisplayCount(INITIAL_DISPLAY);
      setCategories(cats);
      setIsEmpty(prods.length === 0);
      setIsError(false);
      setIsOpen(true);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setIsError(true);
      setIsEmpty(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQueryState(value);
      setActiveIndex(-1);
      if (timerRef.current) clearTimeout(timerRef.current);

      const trimmed = value.trim();
      if (trimmed.length < 2) {
        if (abortRef.current) abortRef.current.abort();
        setAllProducts([]);
        setDisplayCount(INITIAL_DISPLAY);
        setCategories([]);
        setIsLoading(false);
        setIsError(false);
        setIsEmpty(false);
        setIsOpen(true);
        return;
      }

      timerRef.current = setTimeout(() => executeSearch(trimmed), DEBOUNCE_MS);
    },
    [executeSearch],
  );

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const resetQuery = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    setQueryState('');
    setAllProducts([]);
    setDisplayCount(INITIAL_DISPLAY);
    setCategories([]);
    setIsLoading(false);
    setIsError(false);
    setIsEmpty(false);
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      onSelectProduct: (p: SearchProduct) => void,
      onSubmit: () => void,
    ) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex(prev => Math.min(prev + 1, products.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && products[activeIndex]) {
            onSelectProduct(products[activeIndex]);
          } else {
            onSubmit();
          }
          break;
      }
    },
    [isOpen, products, activeIndex, close],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    query,
    products,       // visible slice (INITIAL_DISPLAY + loaded pages)
    hasMore,        // true when allProducts has more than what's displayed
    loadMore,       // call to reveal the next DISPLAY_STEP items
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
    setIsOpen,
  };
}
