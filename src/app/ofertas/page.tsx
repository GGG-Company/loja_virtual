'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import { Tag, Percent, Gift, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SkeletonCard } from '@/components/skeleton-card';

interface OfferProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  promotionalPrice: number | null;
  compareAtPrice: number | null;
  imageUrl: string | null;
  salePrice: number;
  refPrice: number | null;
  discountPct: number;
  isPromo: boolean;
}

// Skeleton personalizado para o card de oferta (com borda vermelha no topo)
function OfferSkeletonCard() {
  return (
    <div className="bg-white rounded-sm shadow-md overflow-hidden border border-gray-100 border-t-4 border-t-[#CC1020] animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mt-2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function OffersPage() {
  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/products/offers')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar ofertas');
        return res.json();
      })
      .then((data) => {
        if (data.products) setProducts(data.products);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Hero — Dark Industrial */}
        <div className="relative bg-[#1A1A1A] text-white py-20 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(-55deg, #CC1020 0px, #CC1020 2px, transparent 2px, transparent 28px)`,
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#CC1020]" />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center gap-2 bg-[#CC1020] px-6 py-2 mb-6 font-display font-bold tracking-widest uppercase text-sm"
              >
                🔥 OFERTAS IMPERDÍVEIS
              </motion.div>

              <h1 className="font-display text-6xl font-bold uppercase mb-3">Grandes Descontos</h1>
              <p className="text-gray-300 text-xl mb-1 font-body">Promoções por tempo limitado</p>
              <p className="text-gray-400 font-body">Aproveite as melhores ofertas em ferramentas profissionais</p>
            </motion.div>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="container mx-auto px-4 py-16">
          {loading ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 16 }).map((_, i) => (
                <OfferSkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Erro ao carregar ofertas</h2>
              <p className="text-gray-500">Tente recarregar a página.</p>
            </motion.div>
          ) : products.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-sm shadow-md hover:shadow-xl transition-all overflow-hidden group border border-gray-100 border-t-4 border-t-[#CC1020]"
                >
                  <Link href={`/produtos/${product.slug}`}>
                    {/* Image */}
                    <div className="relative aspect-square bg-white flex items-center justify-center p-8 overflow-hidden">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-contain group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-8xl group-hover:scale-110 transition-transform duration-500">🔨</span>
                      )}

                      {/* Badge OFERTA */}
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1.5 bg-red-600 text-white font-bold rounded-full text-xs shadow-lg animate-pulse">
                          OFERTA
                        </span>
                      </div>

                      {/* Badge % de desconto */}
                      {product.discountPct > 0 && (
                        <div className="absolute bottom-4 left-4 bg-[#CC1020] text-white px-3 py-1.5 font-display font-bold shadow-lg text-sm">
                          <Percent className="inline h-4 w-4 mr-1" />
                          {product.discountPct}% OFF
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <h3 className="font-body font-semibold text-[#1A1A1A] line-clamp-2 text-sm group-hover:text-[#CC1020] transition-colors min-h-[2.5rem]">
                        {product.name}
                      </h3>

                      <div>
                        {product.refPrice != null && product.refPrice > product.salePrice && (
                          <p className="text-sm text-gray-400 line-through">
                            De R$ {product.refPrice.toFixed(2)}
                          </p>
                        )}
                        <p className="font-display text-2xl font-bold text-[#CC1020]">
                          R$ {product.salePrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          ou 12x de R$ {(product.salePrice / 12).toFixed(2)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5">
                          <Gift className="h-3.5 w-3.5" />
                          Confira agora mesmo
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Tag className="h-24 w-24 text-gray-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Nenhuma oferta disponível no momento</h2>
              <p className="text-gray-500">Fique atento! Novas promoções chegam em breve.</p>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
