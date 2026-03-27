'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Drill, Wrench, Hammer, Shield, Home } from 'lucide-react';

const categories = [
  {
    name: 'Ferramentas Elétricas',
    icon: Drill,
    slug: 'ferramentas-eletricas',
    bg: '#CC1020',
    accent: '#a80816',
  },
  {
    name: 'Ferramentas Manuais',
    icon: Wrench,
    slug: 'ferramentas-manuais',
    bg: '#1A1A1A',
    accent: '#333333',
  },
  {
    name: 'Jardinagem',
    icon: Hammer,
    slug: 'jardinagem',
    bg: '#2d5a27',
    accent: '#1e3d1a',
  },
  {
    name: 'Casa',
    icon: Home,
    slug: 'casa',
    bg: '#7c4d1e',
    accent: '#5a3614',
  },
  {
    name: 'EPIs',
    icon: Shield,
    slug: 'epis',
    bg: '#1a3a5c',
    accent: '#102540',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function CategoriesGrid() {
  return (
    <section className="py-10 lg:py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-8 bg-[#CC1020] rounded-full" />
            <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
              Categorias
            </p>
          </div>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-[#1A1A1A] uppercase">
            Navegue por Categoria
          </h2>
          <p className="text-gray-500 mt-2 font-body">
            Encontre exatamente o que você precisa
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <motion.div key={category.slug} variants={item}>
                <Link
                  href={`/produtos?categoria=${category.slug}`}
                  className="block group"
                >
                  <motion.div
                    whileHover={{ y: -6 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative overflow-hidden rounded-sm h-36 sm:h-44 lg:h-48 shadow-md hover:shadow-xl transition-shadow duration-300"
                    style={{ background: category.bg }}
                  >
                    {/* Diagonal stripe overlay */}
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          -45deg,
                          rgba(255,255,255,0.15) 0px,
                          rgba(255,255,255,0.15) 1px,
                          transparent 1px,
                          transparent 12px
                        )`,
                      }}
                    />

                    {/* Hover accent */}
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: category.accent }}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 0.6 }}
                      transition={{ duration: 0.2 }}
                    />

                    {/* Sheen sweep on hover */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.5 }}
                    />

                    {/* Content */}
                    <div className="relative h-full flex flex-col items-center justify-center text-white p-5">
                      <div className="w-14 h-14 rounded-sm bg-white/15 flex items-center justify-center mb-4 group-hover:bg-white/25 transition-colors">
                        <Icon className="h-8 w-8" />
                      </div>
                      <h3 className="font-display font-bold text-sm sm:text-base lg:text-lg text-center uppercase leading-tight">
                        {category.name}
                      </h3>
                      <div className="mt-2 sm:mt-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase border border-white/50 px-2 sm:px-3 py-1 rounded-sm">
                          Ver tudo →
                        </span>
                      </div>
                    </div>

                    {/* Bottom red accent for first category */}
                    {category.slug === 'ferramentas-eletricas' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30" />
                    )}
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
