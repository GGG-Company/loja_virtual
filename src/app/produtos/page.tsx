'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { SkeletonCard } from "@/components/skeleton-card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Suspense } from "react";

// Helper to forward client logs to server for debugging in VSCode terminal
async function sendServerLog(tag: string, payload: any) {
  try {
    // fire-and-forget, don't await to avoid blocking UI
    fetch("/api/dev/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag, payload, ts: new Date().toISOString() }),
    }).catch(() => {});
  } catch (e) {
    // ignore
  }
}

type ProductListItem = {
  id: string;
  name: string;
  price: number;
  promotionalPrice?: number | null;
  imageUrl?: string | null;
  images?: { url: string; alt?: string | null }[];
  category?: {
    id?: string;
    name?: string;
    slug?: string;
  };
  specs?: any;
  createdAt?: string;
};

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]); // raw fetched list
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [tempRange, setTempRange] = useState<number[]>([0, 5000]);
  const [sortBy, setSortBy] = useState("recent");

  // Controlled filter states
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedVoltages, setSelectedVoltages] = useState<string[]>([]);

  const searchKey = useMemo(() => searchParams?.toString() ?? "", [searchParams]);

  // Fetch only the raw product list (no filtering here)
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const categoria = searchParams?.get("categoria");
      let url = "/api/products";
      if (categoria) {
        url += `?categoria=${categoria}`;
      }
      const response = await apiClient.get<{ products: ProductListItem[] }>(url);
      const arr = response.data.products ?? [];
      console.log("[PLP] fetchProducts -> fetched", arr.length, "products", { categoria, url });
      sendServerLog("fetchProducts", { count: arr.length, categoria, url });
      setAllProducts(arr);
      // By default show all fetched products (user can apply filters)
      setProducts(arr);

      // Initialize priceRange from URL if present
      const minParam = searchParams?.get("minPrice");
      const maxParam = searchParams?.get("maxPrice");
      const minP = minParam ? parseInt(minParam, 10) : 0;
      const maxP = maxParam ? parseInt(maxParam, 10) : 5000;
      const normalizedMin = Number.isFinite(minP) ? minP : 0;
      const normalizedMax = Number.isFinite(maxP) ? maxP : 5000;
      setPriceRange([normalizedMin, normalizedMax]);
      setTempRange([normalizedMin, normalizedMax]);

      // Initialize brands/voltages from URL if present
      const brandsParam = searchParams?.get("brands");
      const voltsParam = searchParams?.get("voltages");
      if (brandsParam) {
        setSelectedBrands(brandsParam.split(","));
        console.log("[PLP] init brands from URL", brandsParam.split(","));
      }
      if (voltsParam) {
        setSelectedVoltages(voltsParam.split(","));
        console.log("[PLP] init voltages from URL", voltsParam.split(","));
      }

      // If URL already has filter params, apply them immediately (avoid showing full list after router.push)
      const sortParam = searchParams?.get("sort") ?? undefined;
      const hasFiltersInUrl = !!(minParam || maxParam || brandsParam || voltsParam || sortParam);
      if (hasFiltersInUrl) {
        const min = Math.min(minP, maxP);
        const max = Math.max(minP, maxP);
        const brandsArr = brandsParam ? brandsParam.split(",") : [];
        const voltsArr = voltsParam ? voltsParam.split(",") : [];

        // filter
        const filteredFromUrl = arr.filter((p) => {
          const finalPrice = p.promotionalPrice ?? p.price ?? 0;
          if (finalPrice < min || finalPrice > max) return false;
          if (brandsArr.length > 0) {
            const brandFromSpecs = (p.specs && (p.specs.marca || p.specs.brand)) || "";
            const nameMatches = brandsArr.some((b) => p.name?.toLowerCase().includes(b.toLowerCase()));
            const specsMatches = brandsArr.some((b) => String(brandFromSpecs).toLowerCase().includes(b.toLowerCase()));
            if (!nameMatches && !specsMatches) return false;
          }
          if (voltsArr.length > 0) {
            const volFromSpecs = (p.specs && (p.specs.voltagem || p.specs.voltage)) || "";
            const nameMatches = voltsArr.some((v) => p.name?.toLowerCase().includes(v.toLowerCase()));
            const specsMatches = voltsArr.some((v) => String(volFromSpecs).toLowerCase().includes(v.toLowerCase()));
            if (!nameMatches && !specsMatches) return false;
          }
          return true;
        });

        // sort
        const sortedFromUrl = [...filteredFromUrl].sort((a, b) => {
          const priceA = a.promotionalPrice ?? a.price ?? 0;
          const priceB = b.promotionalPrice ?? b.price ?? 0;
          switch (sortParam) {
            case "price-asc":
              return priceA - priceB;
            case "price-desc":
              return priceB - priceA;
            case "name":
              return (a.name || "").localeCompare(b.name || "");
            case "recent":
            default:
              if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              return 0;
          }
        });

        console.log("[PLP] fetchProducts -> applied URL filters, resulting", sortedFromUrl.length);
        setProducts(sortedFromUrl);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    // Fetch when category (search params) change — do NOT refetch on slider moves
    fetchProducts();
  }, [fetchProducts, searchKey]);

  // Toggle brand selection
  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      const next = prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand];
      console.log("[PLP] toggleBrand ->", brand, { next });
      sendServerLog("toggleBrand", { brand, next });
      return next;
    });
  };

  // Toggle voltage selection
  const toggleVoltage = (vol: string) => {
    setSelectedVoltages((prev) => {
      const next = prev.includes(vol) ? prev.filter((v) => v !== vol) : [...prev, vol];
      console.log("[PLP] toggleVoltage ->", vol, { next });
      sendServerLog("toggleVoltage", { vol, next });
      return next;
    });
  };

  // Apply client-side filters using the raw fetched list
  const applyFilters = () => {
    // Use current slider temp values (commit immediately for this run)
    const [minTemp, maxTemp] = tempRange;
    const min = Math.min(minTemp, maxTemp);
    const max = Math.max(minTemp, maxTemp);
    // update committed state so UI reflects chosen range
    setPriceRange([min, max]);

    const params = new URLSearchParams();
    const categoria = searchParams?.get("categoria");
    if (categoria) params.set("categoria", categoria);
    if (sortBy) params.set("sort", sortBy);
    if (min !== 0) params.set("minPrice", String(min));
    if (max !== 5000) params.set("maxPrice", String(max));
    if (selectedBrands.length) params.set("brands", selectedBrands.join(","));
    if (selectedVoltages.length) params.set("voltages", selectedVoltages.join(","));

    console.log("[PLP] applyFilters -> params", { min, max, selectedBrands, selectedVoltages, sortBy });
    sendServerLog("applyFiltersParams", { min, max, selectedBrands, selectedVoltages, sortBy });

    const paramString = params.toString();
    if (paramString) router.push(`/produtos?${paramString}`);
    else router.push("/produtos");

    // Filter from allProducts (raw data) using min/max
    const filtered = allProducts.filter((p) => {
      const finalPrice = p.promotionalPrice ?? p.price ?? 0;
      if (finalPrice < min || finalPrice > max) return false;

      if (selectedBrands.length > 0) {
        const brandFromSpecs = (p.specs && (p.specs.marca || p.specs.brand)) || "";
        const nameMatches = selectedBrands.some((b) => p.name?.toLowerCase().includes(b.toLowerCase()));
        const specsMatches = selectedBrands.some((b) => String(brandFromSpecs).toLowerCase().includes(b.toLowerCase()));
        if (!nameMatches && !specsMatches) return false;
      }

      if (selectedVoltages.length > 0) {
        const volFromSpecs = (p.specs && (p.specs.voltagem || p.specs.voltage)) || "";
        const nameMatches = selectedVoltages.some((v) => p.name?.toLowerCase().includes(v.toLowerCase()));
        const specsMatches = selectedVoltages.some((v) => String(volFromSpecs).toLowerCase().includes(v.toLowerCase()));
        if (!nameMatches && !specsMatches) return false;
      }

      return true;
    });

    console.log("[PLP] applyFilters -> filteredCount", filtered.length, "from", allProducts.length);
    sendServerLog("applyFiltersFiltered", { count: filtered.length, from: allProducts.length });

    // Apply sorting to filtered results
    const sorted = [...filtered].sort((a, b) => {
      const priceA = a.promotionalPrice ?? a.price ?? 0;
      const priceB = b.promotionalPrice ?? b.price ?? 0;
      switch (sortBy) {
        case "price-asc":
          return priceA - priceB;
        case "price-desc":
          return priceB - priceA;
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "recent":
        default:
          if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return 0;
      }
    });

    console.log(
      "[PLP] applyFilters -> sortedCount",
      sorted.length,
      "exampleIds",
      sorted.slice(0, 5).map((p) => p.id)
    );
    sendServerLog("applyFiltersSorted", { count: sorted.length, exampleIds: sorted.slice(0, 5).map((p) => p.id) });

    setProducts(sorted);
  };

  // When sort changes we reorder current shown products (no refetch)
  const handleSortChange = (value: string) => {
    setSortBy(value);
    const sorted = [...products].sort((a, b) => {
      const priceA = a.promotionalPrice ?? a.price ?? 0;
      const priceB = b.promotionalPrice ?? b.price ?? 0;
      switch (value) {
        case "price-asc":
          return priceA - priceB;
        case "price-desc":
          return priceB - priceA;
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "recent":
        default:
          if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return 0;
      }
    });
    setProducts(sorted);
  };

  // Commit tempRange on pointer up (user released the thumb)
  const commitTempRange = () => {
    // Normalize so min <= max
    const [a, b] = tempRange;
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    setPriceRange([min, max]);
    // Also update tempRange normalized
    setTempRange([min, max]);
    console.log("[PLP] commitTempRange ->", { min, max });
    sendServerLog("commitTempRange", { min, max });
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50">
        {/* Hero */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">Nossos Produtos</h1>
            <p className="text-lg text-primary-100">Encontre as melhores ferramentas profissionais</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className={`lg:col-span-1 ${showFilters ? "block" : "hidden lg:block"}`}>
              <div className="bg-white rounded-lg shadow-md p-6 space-y-6 sticky top-24">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-metallic-900">Filtros</h2>
                  <button onClick={() => setShowFilters(false)} className="lg:hidden text-metallic-600">
                    ✕
                  </button>
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <Label>Faixa de Preço</Label>
                  <Slider value={tempRange} onValueChange={(v: number[]) => setTempRange(v)} onPointerUp={commitTempRange} max={5000} step={50} className="my-4" />
                  <div className="flex justify-between text-sm text-metallic-600">
                    <span>R$ {tempRange[0]}</span>
                    <span>R$ {tempRange[1]}</span>
                  </div>
                </div>

                {/* Brands */}
                <div className="space-y-3">
                  <Label>Marcas</Label>
                  <div className="space-y-2">
                    {["Makita", "Bosch", "DeWalt", "Black+Decker", "Tramontina"].map((brand) => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-metallic-300" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} />
                        <span className="text-sm text-metallic-700">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Voltage */}
                <div className="space-y-3">
                  <Label>Voltagem</Label>
                  <div className="space-y-2">
                    {["110V", "220V", "Bivolt", "Bateria"].map((voltage) => (
                      <label key={voltage} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-metallic-300" checked={selectedVoltages.includes(voltage)} onChange={() => toggleVoltage(voltage)} />
                        <span className="text-sm text-metallic-700">{voltage}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={applyFilters}>
                  Aplicar Filtros
                </Button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              {/* Toolbar */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="lg:hidden">
                  <SlidersHorizontal className="h-5 w-5 mr-2" />
                  Filtros
                </Button>

                <div className="hidden lg:block text-sm text-metallic-600">{products.length} produtos encontrados</div>

                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    handleSortChange(e.target.value);
                  }}
                  className="border border-metallic-300 rounded-md px-4 py-2 text-sm"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                  <option value="name">Nome A-Z</option>
                </select>
              </div>

              {/* Products */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </>
                ) : products.length > 0 ? (
                  products.map((product, index) => (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-metallic-600 text-lg">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Carregando produtos...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
