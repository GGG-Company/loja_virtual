'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import {
  Award,
  Users,
  TrendingUp,
  Shield,
  Heart,
  Target,
  Zap,
  CheckCircle,
  Wrench,
} from 'lucide-react';

const stats = [
  { label: 'Anos de Mercado', value: '20+', icon: TrendingUp },
  { label: 'Clientes Satisfeitos', value: '50k+', icon: Users },
  { label: 'Produtos no Catálogo', value: '5k+', icon: Award },
  { label: 'Taxa de Satisfação', value: '98%', icon: Heart },
];

const values = [
  {
    icon: Shield,
    title: 'Qualidade Garantida',
    description: 'Trabalhamos apenas com marcas renomadas e produtos certificados.',
  },
  {
    icon: Zap,
    title: 'Entrega Rápida',
    description: 'Logística eficiente para receber seus produtos com agilidade.',
  },
  {
    icon: Target,
    title: 'Foco no Cliente',
    description: 'Atendimento personalizado e suporte técnico especializado.',
  },
  {
    icon: Award,
    title: 'Melhores Preços',
    description: 'Preços competitivos e condições especiais para profissionais.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Hero — Dark Industrial */}
        <div className="relative bg-[#1A1A1A] text-white py-24 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(-55deg, #CC1020 0px, #CC1020 2px, transparent 2px, transparent 28px)`,
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#CC1020]" />

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
                className="w-20 h-20 bg-[#CC1020]/20 border border-[#CC1020]/30 flex items-center justify-center mx-auto mb-6"
              >
                <Award className="h-10 w-10 text-[#CC1020]" />
              </motion.div>

              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-1 h-8 bg-[#CC1020] rounded-full" />
                <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                  A Nossa História
                </p>
                <div className="w-1 h-8 bg-[#CC1020] rounded-full" />
              </div>

              <h1 className="font-display text-5xl md:text-6xl font-bold uppercase mb-4">
                Sobre Nós
              </h1>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto font-body">
                Sua parceira de confiança em ferramentas e equipamentos profissionais desde 2004
              </p>
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <div className="container mx-auto px-4 -mt-10 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-sm shadow-xl p-6 text-center border-t-4 border-[#CC1020]"
                >
                  <Icon className="h-9 w-9 text-[#CC1020] mx-auto mb-3" />
                  <p className="font-display text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 font-body">{stat.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Nossa História */}
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 bg-[#CC1020] rounded-full" />
                <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                  Trajetória
                </p>
              </div>
              <h2 className="font-display text-4xl font-bold text-[#1A1A1A] uppercase mb-6">
                Nossa História
              </h2>
              <div className="space-y-4 text-gray-600 text-lg leading-relaxed font-body">
                <p>
                  Desde <strong className="text-[#1A1A1A]">2004</strong> no mercado, a{' '}
                  <strong className="text-[#CC1020]">Feira das Ferramentas</strong> nasceu com o
                  propósito de democratizar o acesso a ferramentas profissionais de alta qualidade.
                </p>
                <p>
                  O que começou como uma pequena loja física em Feira de Santana, BA, se
                  transformou em uma das maiores plataformas de ferramentas da região, atendendo
                  desde profissionais da construção civil até entusiastas de DIY.
                </p>
                <p>
                  Hoje, contamos com um catálogo de mais de{' '}
                  <strong className="text-[#1A1A1A]">5 mil produtos</strong>, parceria com as
                  principais marcas do mercado e uma equipe especializada pronta para oferecer a
                  melhor experiência de compra.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                {[
                  'Produtos certificados e garantia de fábrica',
                  'Atendimento especializado',
                  'Entrega para todo o Brasil',
                  'Parcelamento em até 12x sem juros',
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-600 font-body">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square bg-gray-100 rounded-sm border border-gray-200 flex items-center justify-center">
                <Wrench className="h-40 w-40 text-gray-300" />
              </div>
              <motion.div
                className="absolute -bottom-6 -right-6 w-44 h-44 bg-[#CC1020] flex items-center justify-center text-white text-center p-5 rounded-sm shadow-xl"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div>
                  <p className="font-display text-5xl font-bold mb-1">98%</p>
                  <p className="text-sm font-body font-semibold uppercase tracking-widest">Satisfação</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Nossos Valores */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-8 bg-[#CC1020] rounded-full" />
                <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                  O Que Nos Move
                </p>
              </div>
              <h2 className="font-display text-4xl font-bold text-[#1A1A1A] uppercase mb-2">
                Nossos Valores
              </h2>
              <p className="text-gray-500 font-body">Princípios que guiam nosso trabalho todos os dias</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -6 }}
                    className="bg-gray-50 rounded-sm p-8 text-center border border-gray-100 hover:border-[#CC1020]/20 hover:shadow-md transition-all"
                  >
                    <div className="w-14 h-14 bg-red-50 rounded-sm flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-7 w-7 text-[#CC1020]" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#1A1A1A] uppercase mb-2">
                      {value.title}
                    </h3>
                    <p className="text-gray-500 font-body text-sm">{value.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
