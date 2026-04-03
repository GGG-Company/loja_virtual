'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePrice } from '@/hooks/use-price';
import { Heart, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useCart } from '@/contexts/cart-context';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug?: string;
    price: number;
    promotionalPrice?: number | null;
    compareAtPrice?: number | null;
    imageUrl?: string | null;
    images?: { url: string; alt?: string | null }[];
    isFeatured?: boolean;
  };
  className?: string;
  priority?: boolean;
}

export function ProductCard({ product, className, priority = false }: ProductCardProps) {
  const finalPrice = product.promotionalPrice ?? product.price;
  const { formatPrice, bestInstallmentText } = usePrice(finalPrice);
  const { addItem } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [heartAnimate, setHeartAnimate] = useState(false);
  const addingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (addingTimerRef.current) clearTimeout(addingTimerRef.current);
    };
  }, []);

  const imageSrc = (() => {
    const candidate = product.imageUrl || product.images?.[0]?.url;
    if (!candidate) return '/placeholder.svg';
    if (candidate.includes('/products/')) return '/placeholder.svg';
    return candidate;
  })();
  const productUrl = `/produtos/${product.slug || product.id}`;

  const discount =
    product.promotionalPrice && product.promotionalPrice < product.price
      ? Math.round(((product.price - product.promotionalPrice) / product.price) * 100)
      : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdding) return;
    setIsAdding(true);

    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      imageUrl: imageSrc,
    });

    toast.success('Produto adicionado ao carrinho!');
    addingTimerRef.current = setTimeout(() => setIsAdding(false), 800);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite((prev) => !prev);
    setHeartAnimate(true);
  };

  return (
    <Link href={productUrl}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -6 }}
        transition={{ duration: 0.25 }}
        className={cn(
          'group relative bg-white rounded-sm shadow-md hover:shadow-xl overflow-hidden cursor-pointer border border-gray-100 transition-shadow duration-300',
          className
        )}
      >
        {/* ── Image area ───────────────────────────────── */}
        <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">

          {/* Featured badge — top-left */}
          {product.isFeatured && (
            <div className="absolute top-0 left-0 z-10 bg-[#CC1020] text-white px-3 py-1 text-xs font-display font-bold tracking-widest uppercase">
              Destaque
            </div>
          )}

          {/* Discount badge — top-left below featured, or top-left when no featured */}
          {discount > 0 && (
            <div
              className={cn(
                'badge-wiggle absolute left-2 z-10 bg-[#CC1020] text-white px-2.5 py-1 text-xs font-display font-bold rounded-sm shadow',
                product.isFeatured ? 'top-8' : 'top-2'
              )}
            >
              -{discount}%
            </div>
          )}

          {/* Heart button — top-right, always visible, pops on click */}
          <button
            onClick={handleFavorite}
            onAnimationEnd={() => setHeartAnimate(false)}
            className={cn(
              'absolute top-2 right-2 z-20 p-2 bg-white/85 group-hover:bg-white backdrop-blur-sm rounded-full shadow-md',
              'opacity-50 group-hover:opacity-100 transition-all duration-200 hover:scale-110',
              heartAnimate && 'heart-pop'
            )}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-colors duration-150',
                isFavorite ? 'fill-[#CC1020] text-[#CC1020]' : 'text-gray-400 group-hover:text-gray-600'
              )}
            />
          </button>

          {/* Product image */}
          <div className="card-img-zoom relative w-full h-full p-4">
            <Image
              src={imageSrc}
              alt={product.images?.[0]?.alt || product.name}
              fill
              className="object-contain drop-shadow-sm"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+"
            />
          </div>

        </div>

        {/* ── Content ───────────────────────────────────── */}
        <div className="p-4 space-y-2">
          <h3 className="font-body font-semibold text-sm text-[#1A1A1A] line-clamp-2 min-h-[2.8rem] leading-snug">
            {product.name}
          </h3>

          <div className="space-y-0.5">
            {product.promotionalPrice && product.promotionalPrice < product.price && (
              <p className="text-xs text-gray-400 line-through font-body">
                {formatPrice(product.price)}
              </p>
            )}
            <p className="text-xl font-display font-bold text-[#CC1020]">
              {formatPrice(finalPrice)}
            </p>
            <p className="text-[11px] text-gray-500 font-body">
              {bestInstallmentText()}
            </p>
          </div>

          <button
            className="cart-icon-bounce btn-fill w-full mt-2 bg-[#1A1A1A] text-white font-display font-bold text-sm tracking-wide uppercase py-2.5 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
            onClick={handleAddToCart}
            disabled={isAdding}
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            {isAdding ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Adicionando...</>
            ) : (
              'Adicionar ao Carrinho'
            )}
          </button>
        </div>
      </motion.div>
    </Link>
  );
}
