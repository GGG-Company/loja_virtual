'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/product-card';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';

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
    <div className="bg-white rounded-sm shadow-md border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export function RecentlyViewed() {
  const { getIds } = useRecentlyViewed();
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ids, setIds] = useState<string[]>([]);

  // Read from localStorage only on the client
  useEffect(() => {
    const stored = getIds();
    setIds(stored);
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch each product individually since the API doesn't have a bulk ids endpoint
    Promise.all(
      ids.map((id) =>
        fetch(`/api/products/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => data?.product ?? null)
          .catch(() => null)
      )
    )
      .then((results) => {
        const valid = results.filter(Boolean) as RecentProduct[];
        setProducts(valid);
      })
      .finally(() => setIsLoading(false));
  }, [ids]);

  // Don't render anything when there are no viewed products
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-metallic-900 mb-6">Vistos Recentemente</h2>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: Math.min(ids.length || 3, 6) }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
