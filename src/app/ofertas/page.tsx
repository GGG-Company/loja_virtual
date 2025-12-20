'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import { Tag, Percent, Gift } from 'lucide-react';

const offers = [
  {
    id: 1,
    title: 'Parafusadeira Makita DHP453Z',
    originalPrice: 899,
    salePrice: 629,
    discount: 30,
    image: null,
    badge: 'DESTAQUE',
  },
  {
    id: 2,
    title: 'Furadeira Bosch GSB 180-LI',
    originalPrice: 1299,
    salePrice: 909,
    discount: 30,
    image: null,
    badge: 'OFERTA',
  },
  {
    id: 3,
    title: 'Serra Circular DeWalt DCD996B',
    originalPrice: 2499,
    salePrice: 1749,
    discount: 30,
    image: null,
    badge: 'PROMOÇÃO',
  },
];

export default function OffersPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white py-20 relative overflow-hidden">
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-block mb-6"
              >
                <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                  <p className="text-lg font-bold">🔥 OFERTAS IMPERDÍVEIS</p>
                </div>
              </motion.div>

              <h1 className="text-6xl font-bold mb-4">
                Até 50% OFF
              </h1>
              <p className="text-2xl text-white/90 mb-2">
                Promoções por tempo limitado
              </p>
              <p className="text-lg text-white/80">
                Aproveite as melhores ofertas em ferramentas profissionais
              </p>
            </motion.div>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {offers.map((offer, index) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group"
              >
                {/* Image */}
                <div className="relative aspect-square bg-gradient-to-br from-metallic-100 to-metallic-200 flex items-center justify-center">
                  <p className="text-8xl">🔨</p>

                  {/* Badge */}
                  <motion.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="absolute top-4 right-4"
                  >
                    <span className="px-4 py-2 bg-red-600 text-white font-bold rounded-full text-sm shadow-lg">
                      {offer.badge}
                    </span>
                  </motion.div>

                  {/* Discount Badge */}
                  <div className="absolute bottom-4 left-4 bg-orange-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
                    <Percent className="inline h-4 w-4 mr-1" />
                    {offer.discount}% OFF
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-metallic-900 group-hover:text-primary-600 transition-colors">
                    {offer.title}
                  </h3>

                  <div>
                    <p className="text-sm text-metallic-500 line-through">
                      De R$ {offer.originalPrice.toFixed(2)}
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      R$ {offer.salePrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-metallic-600 mt-1">
                      ou 12x de R$ {(offer.salePrice / 12).toFixed(2)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-metallic-200">
                    <p className="text-sm text-green-600 font-semibold flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Economize R${' '}
                      {(offer.originalPrice - offer.salePrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Empty State se não houver ofertas */}
          {offers.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Tag className="h-24 w-24 text-metallic-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-metallic-900 mb-4">
                Nenhuma oferta disponível no momento
              </h2>
              <p className="text-metallic-600">
                Fique atento! Novas promoções chegam em breve.
              </p>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
