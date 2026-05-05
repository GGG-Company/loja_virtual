'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, X, SlidersHorizontal, Tag, PackageCheck, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useFilters, PRICE_MIN, PRICE_MAX } from '@/hooks/useFilters';
import { cn } from '@/lib/utils';

const LIST_VISIBLE = 6;

// ── Collapsible section ───────────────────────────────────────────────────────
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

// ── Toggle pill ───────────────────────────────────────────────────────────────
function ToggleFilter({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm border text-sm font-semibold transition-all',
        checked
          ? 'bg-red-50 border-[#CC1020] text-[#CC1020]'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', checked ? 'text-[#CC1020]' : 'text-gray-400')} aria-hidden />
      {label}
      {checked && (
        <span className="ml-auto w-4 h-4 rounded-full bg-[#CC1020] flex items-center justify-center shrink-0">
          <X className="h-2.5 w-2.5 text-white" />
        </span>
      )}
    </button>
  );
}

// ── Checkbox row ──────────────────────────────────────────────────────────────
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
      <span className={cn('flex-1 text-sm transition-colors truncate', checked ? 'text-[#CC1020] font-semibold' : 'text-gray-700')}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-400 tabular-nums font-medium shrink-0">{count}</span>
      )}
    </label>
  );
}

// ── Price input ───────────────────────────────────────────────────────────────
function PriceInput({
  label, value, min, max, onChange,
}: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));
  const commit = () => {
    const n = parseInt(raw, 10);
    const clamped = Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : value;
    setRaw(String(clamped));
    onChange(clamped);
  };
  return (
    <div className="flex-1">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">{label}</span>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">R$</span>
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

// ── Active filter tags ────────────────────────────────────────────────────────
function ActiveTags({
  brands, voltages, categories, categoryOptions,
  onRemoveBrand, onRemoveVoltage, onRemoveCategory,
}: {
  brands: string[];
  voltages: string[];
  categories: string[];
  categoryOptions: CategoryOption[];
  onRemoveBrand: (b: string) => void;
  onRemoveVoltage: (v: string) => void;
  onRemoveCategory: (slug: string) => void;
}) {
  const slugToName = Object.fromEntries(categoryOptions.map((c) => [c.slug, c.name]));
  const all = [
    ...categories.map((slug) => ({ key: slug, label: slugToName[slug] ?? slug, onRemove: () => onRemoveCategory(slug) })),
    ...brands.map((b) => ({ key: `b-${b}`, label: b, onRemove: () => onRemoveBrand(b) })),
    ...voltages.map((v) => ({ key: `v-${v}`, label: v, onRemove: () => onRemoveVoltage(v) })),
  ];
  if (all.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pb-3 border-b border-gray-100">
      {all.map(({ key, label, onRemove }) => (
        <button
          key={key}
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-[#CC1020]/30 text-[#CC1020] text-xs font-semibold hover:bg-red-100 transition-colors"
        >
          {label}
          <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}

// ── Expandable list section ───────────────────────────────────────────────────
function ExpandableList({
  title,
  activeCount,
  items,
  checkedKeys,
  onToggle,
  idPrefix,
  searchPlaceholder,
}: {
  title: string;
  activeCount: number;
  items: Array<{ key: string; label: string; count?: number }>;
  checkedKeys: string[];
  onToggle: (key: string) => void;
  idPrefix: string;
  searchPlaceholder: string;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, search]);

  const visible = expanded || search ? filtered : filtered.slice(0, LIST_VISIBLE);
  const hiddenCount = filtered.length - LIST_VISIBLE;

  if (items.length === 0) return null;

  return (
    <FilterSection title={title} activeCount={activeCount}>
      {items.length > LIST_VISIBLE && (
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      )}
      {visible.map(({ key, label, count }) => (
        <FilterItem
          key={key}
          id={`${idPrefix}-${key}`}
          label={label}
          checked={checkedKeys.includes(key)}
          onCheckedChange={() => onToggle(key)}
          count={count && count > 0 ? count : undefined}
        />
      ))}
      {!search && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-[#CC1020] hover:underline"
        >
          {expanded ? 'Ver menos' : `Ver mais ${hiddenCount} ${hiddenCount === 1 ? 'item' : 'itens'}`}
        </button>
      )}
      {search && filtered.length === 0 && (
        <p className="text-xs text-gray-400 py-1">Nenhum resultado.</p>
      )}
    </FilterSection>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type FilterCounts = Record<string, number>;
export type CategoryOption = { slug: string; name: string; count: number };

export type ProductFiltersProps = {
  brandCounts: FilterCounts;
  voltageCounts: FilterCounts;
  categoryOptions: CategoryOption[];
  onClose?: () => void;
};

// ── Main component ────────────────────────────────────────────────────────────
export function ProductFilters({ brandCounts, voltageCounts, categoryOptions, onClose }: ProductFiltersProps) {
  const {
    priceRange, setPriceRange,
    brands, toggleBrand,
    voltages, toggleVoltage,
    categories, toggleCategory,
    onSale, toggleOnSale,
    inStock, toggleInStock,
    clearFilters, hasActiveFilters,
  } = useFilters();

  const brandItems = useMemo(
    () => Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ key: name, label: name, count })),
    [brandCounts],
  );

  const voltageItems = useMemo(
    () => Object.entries(voltageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ key: name, label: name, count })),
    [voltageCounts],
  );

  const categoryItems = useMemo(
    () => [...categoryOptions]
      .sort((a, b) => b.count - a.count)
      .map((c) => ({ key: c.slug, label: c.name, count: c.count })),
    [categoryOptions],
  );

  return (
    <div className="bg-white rounded-sm shadow-md border-t-4 border-[#CC1020] p-3 sm:p-4 lg:sticky lg:top-24 max-h-[80vh] lg:max-h-[calc(100vh-7rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-1">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#CC1020]" aria-hidden />
          <h2 className="font-display text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">Filtros</h2>
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
              >
                <X className="h-3 w-3" />
                Limpar
              </motion.button>
            )}
          </AnimatePresence>
          {onClose && (
            <button type="button" onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 ml-1" aria-label="Fechar filtros">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-0">
        {/* Tags de filtros ativos */}
        <ActiveTags
          brands={brands}
          voltages={voltages}
          categories={categories}
          categoryOptions={categoryOptions}
          onRemoveBrand={toggleBrand}
          onRemoveVoltage={toggleVoltage}
          onRemoveCategory={toggleCategory}
        />

        {/* Filtros rápidos */}
        <div className="py-3 border-b border-gray-100 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Filtros rápidos</p>
          <ToggleFilter icon={Tag} label="Somente em oferta" checked={onSale} onChange={toggleOnSale} />
          <ToggleFilter icon={PackageCheck} label="Somente em estoque" checked={inStock} onChange={toggleInStock} />
        </div>

        {/* Faixa de preço */}
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
            <PriceInput label="Mínimo" value={priceRange[0]} min={PRICE_MIN} max={priceRange[1]} onChange={(v) => setPriceRange([v, priceRange[1]])} />
            <span className="pb-2 text-gray-300">—</span>
            <PriceInput label="Máximo" value={priceRange[1]} min={priceRange[0]} max={PRICE_MAX} onChange={(v) => setPriceRange([priceRange[0], v])} />
          </div>
        </FilterSection>

        {/* Categorias */}
        <ExpandableList
          title="Categorias"
          activeCount={categories.length}
          items={categoryItems}
          checkedKeys={categories}
          onToggle={toggleCategory}
          idPrefix="cat"
          searchPlaceholder="Buscar categoria..."
        />

        {/* Marcas */}
        <ExpandableList
          title="Marcas"
          activeCount={brands.length}
          items={brandItems}
          checkedKeys={brands}
          onToggle={toggleBrand}
          idPrefix="brand"
          searchPlaceholder="Buscar marca..."
        />

        {/* Voltagem */}
        <ExpandableList
          title="Voltagem"
          activeCount={voltages.length}
          items={voltageItems}
          checkedKeys={voltages}
          onToggle={toggleVoltage}
          idPrefix="volt"
          searchPlaceholder="Buscar voltagem..."
        />
      </div>
    </div>
  );
}
