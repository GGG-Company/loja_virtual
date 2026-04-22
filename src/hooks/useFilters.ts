'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const PRICE_MIN = 0;
export const PRICE_MAX = 5000;
const PRICE_DEBOUNCE_MS = 500;

function parseIntSafe(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function useFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Read committed values from URL (single source of truth) ────────────
  const urlMin = parseIntSafe(searchParams.get('minPrice'), PRICE_MIN);
  const urlMax = parseIntSafe(searchParams.get('maxPrice'), PRICE_MAX);
  const brands   = (searchParams.get('brands')   ?? '').split(',').filter(Boolean);
  const voltages = (searchParams.get('voltages') ?? '').split(',').filter(Boolean);
  const sort     = searchParams.get('sort') ?? 'recent';

  // ── Local price — updates instantly for smooth slider UX, then debounces ─
  const [localPrice, setLocalPrice] = useState<[number, number]>([urlMin, urlMax]);
  const priceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local price in sync when URL changes externally (back/forward, clearFilters)
  useEffect(() => {
    setLocalPrice([urlMin, urlMax]);
  }, [urlMin, urlMax]);

  useEffect(() => () => {
    if (priceTimer.current) clearTimeout(priceTimer.current);
  }, []);

  // ── Core URL updater — preserves non-filter params (categoria, search) ──
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === '') params.delete(key);
        else params.set(key, val);
      }
      const str = params.toString();
      router.replace(str ? `/produtos?${str}` : '/produtos', { scroll: false });
    },
    [router, searchParams],
  );

  // ── Price (debounced) ────────────────────────────────────────────────────
  const setPriceRange = useCallback(
    (range: [number, number]) => {
      setLocalPrice(range);
      if (priceTimer.current) clearTimeout(priceTimer.current);
      priceTimer.current = setTimeout(() => {
        updateUrl({
          minPrice: range[0] !== PRICE_MIN ? String(range[0]) : null,
          maxPrice: range[1] !== PRICE_MAX ? String(range[1]) : null,
        });
      }, PRICE_DEBOUNCE_MS);
    },
    [updateUrl],
  );

  // ── Brands (immediate) ───────────────────────────────────────────────────
  const toggleBrand = useCallback(
    (brand: string) => {
      const next = brands.includes(brand)
        ? brands.filter((b) => b !== brand)
        : [...brands, brand];
      updateUrl({ brands: next.length ? next.join(',') : null });
    },
    [brands, updateUrl],
  );

  // ── Voltages (immediate) ─────────────────────────────────────────────────
  const toggleVoltage = useCallback(
    (voltage: string) => {
      const next = voltages.includes(voltage)
        ? voltages.filter((v) => v !== voltage)
        : [...voltages, voltage];
      updateUrl({ voltages: next.length ? next.join(',') : null });
    },
    [voltages, updateUrl],
  );

  // ── Sort (immediate) ─────────────────────────────────────────────────────
  const setSort = useCallback(
    (value: string) => updateUrl({ sort: value !== 'recent' ? value : null }),
    [updateUrl],
  );

  // ── Clear all filters — preserves categoria + search ────────────────────
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    const cat    = searchParams.get('categoria');
    const search = searchParams.get('search');
    if (cat)    params.set('categoria', cat);
    if (search) params.set('search', search);
    const str = params.toString();
    router.replace(str ? `/produtos?${str}` : '/produtos', { scroll: false });
  }, [router, searchParams]);

  const hasActiveFilters =
    brands.length > 0   ||
    voltages.length > 0 ||
    urlMin !== PRICE_MIN ||
    urlMax !== PRICE_MAX;

  return {
    // Price — localPrice drives slider UI; urlMin/urlMax drive filtering
    priceRange: localPrice,
    urlPriceRange: [urlMin, urlMax] as [number, number],
    setPriceRange,
    // Checkboxes
    brands,
    toggleBrand,
    voltages,
    toggleVoltage,
    // Sort
    sort,
    setSort,
    // Utils
    clearFilters,
    hasActiveFilters,
  };
}
