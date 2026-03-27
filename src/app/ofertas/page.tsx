'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import { Tag, Percent, Gift, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from "next/image";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  promotionalPrice: number | null;
  compareAtPrice: number | null;
  imageUrl: string | null;
}

export default function OffersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products?promo=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProducts(data.products);
        }
      })
      .catch((err) => console.error("Erro ao buscar ofertas:", err))
      .finally(() => setLoading(false));
  }, []);

  const calculateDiscount = (price: number, compareAt: number | null) => {
    if (!compareAt) return 0;
    return Math.round(((compareAt - price) / compareAt) * 100);
  };

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
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
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
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-[#CC1020]" />
              <p className="text-metallic-600 mt-4">Buscando as melhores ofertas...</p>
            </div>
          ) : (
            <>
              {products.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {products.map((product, index) => {
                    const price = product.promotionalPrice || product.price;
                    const originalPrice = product.compareAtPrice || product.price;
                    const discount = calculateDiscount(price, originalPrice);

                    return (
                      <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ y: -6 }} className="bg-white rounded-sm shadow-md hover:shadow-xl transition-all overflow-hidden group border border-gray-100 border-t-4 border-t-[#CC1020]">
                        <Link href={`/produtos/${product.slug}`}>
                          {/* Image */}
                          <div className="relative aspect-square bg-white flex items-center justify-center p-8 overflow-hidden">
                            {product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="256px" className="object-contain group-hover:scale-110 transition-transform duration-500" /> : <p className="text-8xl group-hover:scale-110 transition-transform duration-500">🔨</p>}

                            {/* Badge */}
                            <div className="absolute top-4 right-4">
                              <span className="px-4 py-2 bg-red-600 text-white font-bold rounded-full text-sm shadow-lg animate-pulse">OFERTA</span>
                            </div>

                            {/* Discount Badge */}
                            {discount > 0 && (
                              <div className="absolute bottom-4 left-4 bg-[#CC1020] text-white px-3 py-1.5 font-display font-bold shadow-lg text-sm">
                                <Percent className="inline h-4 w-4 mr-1" />
                                {discount}% OFF
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-6 space-y-4">
                            <h3 className="font-body font-semibold text-[#1A1A1A] line-clamp-2 h-14 text-sm group-hover:text-[#CC1020] transition-colors">{product.name}</h3>

                            <div>
                              {originalPrice > price && <p className="text-sm text-gray-400 line-through">De R$ {originalPrice.toFixed(2)}</p>}
                              <p className="font-display text-3xl font-bold text-[#CC1020]">R$ {price.toFixed(2)}</p>
                              <p className="text-xs text-gray-500 mt-1">ou 12x de R$ {(price / 12).toFixed(2)}</p>
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                              <p className="text-sm text-green-600 font-semibold flex items-center gap-2">
                                <Gift className="h-4 w-4" />
                                Confira agora mesmo
                              </p>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                  <Tag className="h-24 w-24 text-metallic-300 mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-metallic-900 mb-4">Nenhuma oferta disponível no momento</h2>
                  <p className="text-metallic-600">Fique atento! Novas promoções chegam em breve.</p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
