'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative bg-[#1A1A1A] text-white overflow-hidden">
      {/* Diagonal red accent stripe — brand visual language */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -55deg,
            #CC1020 0px,
            #CC1020 2px,
            transparent 2px,
            transparent 28px
          )`,
        }}
      />

      {/* Red top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#CC1020]" />

      {/* Background geometric */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden pointer-events-none hidden lg:block">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, transparent 30%, rgba(204,16,32,0.08) 100%)',
            clipPath: 'polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-10 lg:py-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Promo badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC1020] rounded-sm"
            >
              <Tag className="h-4 w-4" />
              <span className="text-sm font-display font-bold tracking-widest uppercase">
                Lançamento — Até 50% OFF
              </span>
            </motion.div>

            {/* Main title */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] uppercase"
              >
                <span className="text-white">As Melhores</span>
                <br />
                <span className="text-[#CC1020]">Ferramentas</span>
                <br />
                <span className="text-white">Profissionais</span>
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-400 text-lg max-w-lg font-body"
            >
              Equipamentos de alta performance para profissionais e entusiastas.
              Makita, Bosch, DeWalt e muito mais — com os melhores preços.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-3"
            >
              <Link href="/produtos">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-fill flex items-center gap-2 bg-[#CC1020] text-white px-8 py-4 font-display font-bold text-lg tracking-wide uppercase transition-colors"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Ver Produtos
                </motion.button>
              </Link>
              <Link href="/ofertas">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 border-2 border-white/30 hover:border-[#CC1020] hover:text-[#CC1020] text-white px-8 py-4 font-display font-bold text-lg tracking-wide uppercase transition-colors"
                >
                  🔥 Ofertas
                </motion.button>
              </Link>
            </motion.div>

            {/* 20+ anos no mercado */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-4 pt-6 border-t border-white/10"
            >
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-4xl lg:text-5xl text-white leading-none">20</span>
                <span className="font-display font-bold text-4xl lg:text-5xl text-[#CC1020] leading-none">+</span>
              </div>
              <div className="h-10 w-px bg-white/15" />
              <div>
                <p className="font-display font-bold text-lg text-white uppercase tracking-wide leading-none">Anos no mercado</p>
                <p className="text-sm text-gray-400 font-body mt-1">Fundada em 2004 · Feira de Santana, BA</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[480px] hidden lg:block hero-float"
          >
            {/* Red corner accents — pulsing */}
            <div className="corner-pulse absolute -top-4 -right-4 w-24 h-24 bg-[#CC1020] rounded-sm" />
            <div className="corner-pulse-delayed absolute -bottom-4 -left-4 w-16 h-16 bg-[#CC1020] rounded-sm" />

            {/* Image container with scan line */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.35 }}
              className="hero-scan-wrap relative h-full rounded-sm border border-white/10 shadow-2xl overflow-hidden"
            >
              {/* Red diagonal gradient overlay */}
              <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, rgba(204,16,32,0.22) 0%, transparent 45%)',
                }}
              />

              {/* Dark vignette bottom */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
              />

              <Image
                src="/img.jpg"
                alt="Ferramentas Profissionais de Alta Performance"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
                sizes="(max-width: 768px) 100vw, 60vw"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzFhMWExYSIvPjwvc3ZnPg=="
              />

              {/* Red accent lines — industrial feel */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#CC1020] z-20" />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CC1020]/60 z-20" />
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
