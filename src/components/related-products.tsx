'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/product-card';

interface RelatedProduct {
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

interface RelatedProductsProps {
  productId: string;
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

export function RelatedProducts({ productId }: RelatedProductsProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;

    setIsLoading(true);
    fetch(`/api/products/${productId}/related`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.products)) {
          setProducts(data.products);
        }
      })
      .catch(() => {
        // silently fail — related products are non-critical
      })
      .finally(() => setIsLoading(false));
  }, [productId]);

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-metallic-900 mb-6">Produtos Relacionados</h2>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
