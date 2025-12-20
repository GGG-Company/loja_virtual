'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingCart, Zap, Shield, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-metallic-900 via-metallic-800 to-primary-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            <div className="inline-block px-4 py-2 bg-primary-500/20 backdrop-blur-sm rounded-full border border-primary-400/30">
              <span className="text-sm font-semibold text-primary-300">
                🔥 Lançamento: Parafusadeira Makita 50% OFF
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              As Melhores Ferramentas
              <span className="text-primary-400"> Profissionais</span>
            </h1>

            <p className="text-lg text-metallic-300 max-w-xl">
              Equipamentos de alta performance para profissionais e entusiastas. 
              Marcas confiáveis como Makita, Bosch e DeWalt com os melhores preços.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="h-14 px-8 text-lg">
                <Link href="/produtos">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Ver Produtos
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg bg-white/10 hover:bg-white/20 text-white border-white/30">
                <Link href="/categorias">
                  Explorar Categorias
                </Link>
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-8">
              <div className="flex items-center gap-2">
                <Truck className="h-8 w-8 text-primary-400" />
                <div>
                  <p className="font-semibold text-sm">Frete Grátis</p>
                  <p className="text-xs text-metallic-400">Acima de R$ 299</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary-400" />
                <div>
                  <p className="font-semibold text-sm">Garantia</p>
                  <p className="text-xs text-metallic-400">12 meses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-8 w-8 text-primary-400" />
                <div>
                  <p className="font-semibold text-sm">Entrega Rápida</p>
                  <p className="text-xs text-metallic-400">24-48h BA</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative h-[500px] hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-transparent rounded-3xl" />
            <div className="relative h-full flex items-center justify-center">
              <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 flex items-center justify-center">
                <p className="text-6xl">🔨</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
