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
      <main className="min-h-screen bg-metallic-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white py-20 relative overflow-hidden">
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="inline-block mb-6">
                <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                  <p className="text-lg font-bold">🔥 OFERTAS IMPERDÍVEIS</p>
                </div>
              </motion.div>

              <h1 className="text-6xl font-bold mb-4">Grandes Descontos</h1>
              <p className="text-2xl text-white/90 mb-2">Promoções por tempo limitado</p>
              <p className="text-lg text-white/80">Aproveite as melhores ofertas em ferramentas profissionais</p>
            </motion.div>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="container mx-auto px-4 py-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-red-500" />
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
                      <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ y: -8 }} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group border border-metallic-100">
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
                              <div className="absolute bottom-4 left-4 bg-orange-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
                                <Percent className="inline h-4 w-4 mr-1" />
                                {discount}% OFF
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-6 space-y-4">
                            <h3 className="text-lg font-bold text-metallic-900 line-clamp-2 h-14 group-hover:text-red-600 transition-colors">{product.name}</h3>

                            <div>
                              {originalPrice > price && <p className="text-sm text-metallic-500 line-through">De R$ {originalPrice.toFixed(2)}</p>}
                              <p className="text-3xl font-bold text-red-600">R$ {price.toFixed(2)}</p>
                              <p className="text-xs text-metallic-600 mt-1">ou 12x de R$ {(price / 12).toFixed(2)}</p>
                            </div>

                            <div className="pt-2 border-t border-metallic-100">
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
