'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePrice } from '@/hooks/use-price';
import { Heart, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
}

export function ProductCard({ product, className }: ProductCardProps) {
  // Usar preço promocional se existir, senão usar preço normal
  const finalPrice = product.promotionalPrice || product.price;
  const { formatPrice, bestInstallmentText } = usePrice(finalPrice);
  const [isFavorite, setIsFavorite] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const imageSrc = (() => {
    const candidate = product.imageUrl || product.images?.[0]?.url;
    if (!candidate) return '/placeholder.svg';
    if (candidate.includes('/products/')) return '/placeholder.svg';
    return candidate;
  })();
  const productUrl = `/produtos/${product.slug || product.id}`;

  // Calcular desconto apenas se houver preço promocional
  const discount = product.promotionalPrice && product.promotionalPrice < product.price
    ? Math.round(
        ((product.price - product.promotionalPrice) / product.price) * 100
      )
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Verifica se usuário está logado
    if (!session) {
      toast.error('Faça login para adicionar produtos ao carrinho');
      router.push('/auth/login');
      return;
    }
    
    // Adiciona ao carrinho no localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item: any) => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: finalPrice,
        imageUrl: imageSrc,
        quantity: 1,
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    toast.success('Produto adicionado ao carrinho!');
    
    // Dispara evento customizado para atualizar o header
    window.dispatchEvent(new Event('cartUpdated'));
  };

  return (
    <Link href={productUrl}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden cursor-pointer',
          className
        )}
      >
      {/* Badge de Destaque */}
      {product.isFeatured && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-3 left-3 z-10 bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
        >
          Destaque
        </motion.div>
      )}

      {/* Badge de Desconto */}
      {discount > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-3 right-3 z-10 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
        >
          -{discount}%
        </motion.div>
      )}

      {/* Favorite Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          setIsFavorite(!isFavorite);
        }}
        className="absolute top-3 left-3 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Heart
          className={`h-5 w-5 ${
            isFavorite ? 'fill-red-500 text-red-500' : 'text-metallic-600'
          }`}
        />
      </motion.button>

      {/* Imagem */}
      <div className="relative h-64 bg-metallic-100 overflow-hidden">
        <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
          <Image
            src={imageSrc}
            alt={product.images?.[0]?.alt || product.name}
            fill
            className="object-cover"
          />
        </motion.div>

        {/* Quick Add Button on Hover */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-white text-metallic-900 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-metallic-100 transition-colors"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4" />
            Adicionar
          </motion.button>
        </motion.div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-lg text-metallic-900 line-clamp-2 min-h-[3.5rem]">
          {product.name}
        </h3>

        <div className="space-y-1">
          {product.promotionalPrice && product.promotionalPrice < product.price && (
            <p className="text-sm text-metallic-500 line-through">
              {formatPrice(product.price)}
            </p>
          )}
          <p className="text-2xl font-bold text-primary-600">
            {formatPrice(finalPrice)}
          </p>
          <p className="text-xs text-metallic-600">
            {bestInstallmentText()}
          </p>
        </div>

        {/* Botão Optimistic */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-full mt-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 rounded-md transition-colors"
          onClick={handleAddToCart}
        >
          Adicionar ao Carrinho
        </motion.button>
      </div>
    </motion.div>
    </Link>
  );
}
