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
} from 'lucide-react';

const stats = [
  { label: 'Anos de Mercado', value: '15+', icon: TrendingUp },
  { label: 'Clientes Satisfeitos', value: '50k+', icon: Users },
  { label: 'Produtos no Catálogo', value: '5k+', icon: Award },
  { label: 'Taxa de Satisfação', value: '98%', icon: Heart },
];

const values = [
  {
    icon: Shield,
    title: 'Qualidade Garantida',
    description:
      'Trabalhamos apenas com marcas renomadas e produtos certificados.',
  },
  {
    icon: Zap,
    title: 'Entrega Rápida',
    description:
      'Logística eficiente para receber seus produtos com agilidade.',
  },
  {
    icon: Target,
    title: 'Foco no Cliente',
    description:
      'Atendimento personalizado e suporte técnico especializado.',
  },
  {
    icon: Award,
    title: 'Melhores Preços',
    description:
      'Preços competitivos e condições especiais para profissionais.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-metallic-900 text-white py-24 relative overflow-hidden">
          <motion.div
            className="absolute inset-0 opacity-10"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
                className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Award className="h-10 w-10" />
              </motion.div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Sobre Nós
              </h1>
              <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
                Sua parceira de confiança em ferramentas e equipamentos
                profissionais
              </p>
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <div className="container mx-auto px-4 -mt-12 relative z-20">
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
                  whileHover={{ y: -8 }}
                  className="bg-white rounded-2xl shadow-xl p-6 text-center"
                >
                  <Icon className="h-10 w-10 text-primary-600 mx-auto mb-3" />
                  <p className="text-3xl md:text-4xl font-bold text-metallic-900 mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-metallic-600">{stat.label}</p>
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
              <h2 className="text-4xl font-bold text-metallic-900 mb-6">
                Nossa História
              </h2>
              <div className="space-y-4 text-metallic-700 text-lg leading-relaxed">
                <p>
                  Há mais de <strong>15 anos</strong> no mercado, a Shopping
                  das Ferramentas nasceu com o propósito de democratizar o
                  acesso a ferramentas profissionais de alta qualidade.
                </p>
                <p>
                  O que começou como uma pequena loja física em Salvador se
                  transformou em uma das maiores plataformas online de
                  ferramentas do Brasil, atendendo desde profissionais da
                  construção civil até entusiastas de DIY.
                </p>
                <p>
                  Hoje, contamos com um catálogo de mais de <strong>5 mil
                  produtos</strong>, parceria com as principais marcas do
                  mercado e uma equipe especializada pronta para oferecer a
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
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="text-metallic-700">{item}</span>
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
              <div className="aspect-square bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
                <p className="text-9xl">🏗️</p>
              </div>
              <motion.div
                className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-center p-6"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div>
                  <p className="text-5xl font-bold mb-2">98%</p>
                  <p className="text-sm">Satisfação</p>
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
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold text-metallic-900 mb-4">
                Nossos Valores
              </h2>
              <p className="text-metallic-600 text-lg">
                Princípios que guiam nosso trabalho todos os dias
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="bg-metallic-50 rounded-2xl p-8 text-center"
                  >
                    <motion.div
                      className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Icon className="h-8 w-8 text-primary-600" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-metallic-900 mb-3">
                      {value.title}
                    </h3>
                    <p className="text-metallic-600">{value.description}</p>
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
