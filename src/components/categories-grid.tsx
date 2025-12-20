'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Drill, Wrench, Hammer, Shield } from 'lucide-react';

const categories = [
  {
    name: 'Ferramentas Elétricas',
    icon: Drill,
    slug: 'ferramentas-eletricas',
    color: 'from-primary-500 to-primary-600',
    count: 45,
  },
  {
    name: 'Ferramentas Manuais',
    icon: Wrench,
    slug: 'ferramentas-manuais',
    color: 'from-metallic-600 to-metallic-700',
    count: 38,
  },
  {
    name: 'Jardinagem',
    icon: Hammer,
    slug: 'jardinagem',
    color: 'from-green-500 to-green-600',
    count: 22,
  },
  {
    name: 'EPIs',
    icon: Shield,
    slug: 'epis',
    color: 'from-orange-500 to-orange-600',
    count: 31,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function CategoriesGrid() {
  return (
    <section className="py-16 bg-metallic-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-metallic-900 mb-4">
            Navegue por Categoria
          </h2>
          <p className="text-metallic-600 text-lg">
            Encontre exatamente o que você precisa
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
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
                    whileHover={{ scale: 1.05, rotate: 1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 h-48"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-90 group-hover:opacity-100 transition-opacity`}
                    />

                    <div className="relative h-full flex flex-col items-center justify-center text-white p-6">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <Icon className="h-16 w-16 mb-4" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-center mb-2">
                        {category.name}
                      </h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="text-sm text-white/90"
                      >
                        {category.count} produtos
                      </motion.p>
                    </div>

                    {/* Efeito de brilho no hover */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
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
