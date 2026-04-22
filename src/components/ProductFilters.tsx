'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useFilters, PRICE_MIN, PRICE_MAX } from '@/hooks/useFilters';
import { cn } from '@/lib/utils';

// ── Collapsible accordion section ────────────────────────────────────────────
function FilterSection({
  title,
  activeCount = 0,
  defaultOpen = true,
  children,
}: {
  title: string;
  activeCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between py-3 text-left group"
      >
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest text-gray-500 uppercase group-hover:text-[#CC1020] transition-colors">
            {title}
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-[#CC1020] text-white text-[10px] font-bold leading-none">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-gray-400 transition-transform duration-200 group-hover:text-[#CC1020]',
            isOpen && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-4 space-y-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Checkbox row with optional badge count ────────────────────────────────────
function FilterItem({
  id,
  label,
  checked,
  onCheckedChange,
  count,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
  count?: number;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-center gap-2.5 cursor-pointer rounded px-2 py-1.5 -mx-2 transition-colors select-none',
        checked ? 'bg-red-50' : 'hover:bg-gray-50',
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-[#CC1020] data-[state=checked]:border-[#CC1020] shrink-0"
      />
      <span
        className={cn(
          'flex-1 text-sm transition-colors',
          checked ? 'text-[#CC1020] font-semibold' : 'text-gray-700',
        )}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-400 tabular-nums font-medium">
          {count}
        </span>
      )}
    </label>
  );
}

// ── Price input with R$ prefix ────────────────────────────────────────────────
function PriceInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  // Keep raw in sync when the slider moves
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const n = parseInt(raw, 10);
    const clamped = Number.isFinite(n)
      ? Math.max(min, Math.min(max, n))
      : value;
    setRaw(String(clamped));
    onChange(clamped);
  };

  return (
    <div className="flex-1">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
        {label}
      </span>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
          R$
        </span>
        <Input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="h-8 pl-8 pr-2 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export type FilterCounts = Record<string, number>;

export type ProductFiltersProps = {
  /** brand → count derived from loaded products */
  brandCounts: FilterCounts;
  /** voltage → count derived from loaded products */
  voltageCounts: FilterCounts;
  /** called when the mobile close button is pressed */
  onClose?: () => void;
};

export function ProductFilters({
  brandCounts,
  voltageCounts,
  onClose,
}: ProductFiltersProps) {
  const {
    priceRange,
    setPriceRange,
    brands,
    toggleBrand,
    voltages,
    toggleVoltage,
    clearFilters,
    hasActiveFilters,
  } = useFilters();

  // Sorted lists: most-stocked first
  const brandList   = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
  const voltageList = Object.entries(voltageCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-sm shadow-md border-t-4 border-[#CC1020] p-4 sticky top-24">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-1">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#CC1020]" aria-hidden />
          <h2 className="font-display text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">
            Filtros
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-[#CC1020] hover:underline font-semibold"
                aria-label="Limpar todos os filtros"
              >
                <X className="h-3 w-3" aria-hidden />
                Limpar filtros
              </motion.button>
            )}
          </AnimatePresence>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-gray-600 ml-1"
              aria-label="Fechar filtros"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* ── Sections ── */}
      <div>
        {/* Price range */}
        <FilterSection title="Faixa de Preço">
          <Slider
            value={priceRange}
            onValueChange={(v) => setPriceRange(v as [number, number])}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={50}
            className="mb-4 mt-1"
          />
          <div className="flex items-end gap-2">
            <PriceInput
              label="Mínimo"
              value={priceRange[0]}
              min={PRICE_MIN}
              max={priceRange[1]}
              onChange={(v) => setPriceRange([v, priceRange[1]])}
            />
            <span className="pb-2 text-gray-300">—</span>
            <PriceInput
              label="Máximo"
              value={priceRange[1]}
              min={priceRange[0]}
              max={PRICE_MAX}
              onChange={(v) => setPriceRange([priceRange[0], v])}
            />
          </div>
        </FilterSection>

        {/* Brands */}
        {brandList.length > 0 && (
          <FilterSection title="Marcas" activeCount={brands.length}>
            {brandList.map(([brand, count]) => (
              <FilterItem
                key={brand}
                id={`brand-${brand}`}
                label={brand}
                checked={brands.includes(brand)}
                onCheckedChange={() => toggleBrand(brand)}
                count={count > 0 ? count : undefined}
              />
            ))}
          </FilterSection>
        )}

        {/* Voltages */}
        {voltageList.length > 0 && (
          <FilterSection title="Voltagem" activeCount={voltages.length}>
            {voltageList.map(([voltage, count]) => (
              <FilterItem
                key={voltage}
                id={`voltage-${voltage}`}
                label={voltage}
                checked={voltages.includes(voltage)}
                onCheckedChange={() => toggleVoltage(voltage)}
                count={count}
              />
            ))}
          </FilterSection>
        )}
      </div>
    </div>
  );
}
