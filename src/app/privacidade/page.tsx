'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

const sections = [
  {
    icon: Shield,
    title: '1. Coleta de Informações',
    content: [
      'Coletamos informações pessoais quando você se cadastra, faz pedidos ou navega em nosso site.',
      'As informações coletadas incluem: nome, e-mail, telefone, endereço de entrega e dados de pagamento.',
      'Também coletamos dados de navegação através de cookies para melhorar sua experiência.',
    ],
  },
  {
    icon: Lock,
    title: '2. Uso das Informações',
    content: [
      'Suas informações são utilizadas para processar pedidos e enviar produtos.',
      'Enviamos comunicações sobre seus pedidos e ofertas personalizadas (você pode optar por não receber).',
      'Melhoramos nossos serviços com base em análises de comportamento de navegação.',
      'Nunca vendemos suas informações pessoais para terceiros.',
    ],
  },
  {
    icon: Eye,
    title: '3. Compartilhamento de Dados',
    content: [
      'Compartilhamos dados com parceiros logísticos apenas para entrega de produtos.',
      'Processadores de pagamento recebem dados necessários para transações seguras.',
      'Podemos compartilhar dados quando exigido por lei ou para proteger nossos direitos.',
    ],
  },
  {
    icon: FileText,
    title: '4. Seus Direitos',
    content: [
      'Você tem direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento.',
      'Pode solicitar a portabilidade dos seus dados para outro serviço.',
      'Pode revogar consentimentos dados anteriormente.',
      'Para exercer seus direitos, entre em contato através do email: privacidade@shopferramentas.com.br',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Hero — Dark Industrial */}
        <div className="relative bg-[#1A1A1A] text-white py-20 overflow-hidden">
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
              className="text-center max-w-3xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-[#CC1020]/20 border border-[#CC1020]/30 flex items-center justify-center mx-auto mb-6"
              >
                <Shield className="h-10 w-10 text-[#CC1020]" />
              </motion.div>

              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">Legal</p>
                <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
              </div>

              <h1 className="font-display text-5xl font-bold uppercase mb-4">
                Política de Privacidade
              </h1>
              <p className="text-gray-300 font-body">
                Sua privacidade é importante para nós. Esta política descreve
                como coletamos, usamos e protegemos suas informações pessoais.
              </p>
              <p className="text-sm text-gray-500 mt-3">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Introduction */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-sm shadow-md border-t-4 border-[#CC1020] p-8 mb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                <h2 className="font-display text-xl font-bold text-[#1A1A1A] uppercase">Introdução</h2>
              </div>
              <p className="text-gray-600 leading-relaxed font-body mb-4">
                A <strong>Feira das Ferramentas</strong> está comprometida
                em proteger sua privacidade. Esta Política de Privacidade
                explica como suas informações pessoais são coletadas, usadas e
                divulgadas pela Feira das Ferramentas.
              </p>
              <p className="text-gray-600 leading-relaxed font-body">
                Ao usar nosso site, você concorda com a coleta e uso de
                informações de acordo com esta política. Se você não concordar
                com os termos desta política, por favor, não utilize nossos
                serviços.
              </p>
            </motion.div>

            {/* Sections */}
            <div className="space-y-8">
              {sections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-sm shadow-md p-8 border-l-4 border-[#CC1020]"
                  >
                    <div className="flex items-start gap-4 mb-5">
                      <div className="flex-shrink-0 w-11 h-11 bg-red-50 rounded-sm flex items-center justify-center">
                        <Icon className="h-6 w-6 text-[#CC1020]" />
                      </div>
                      <h2 className="font-display text-xl font-bold text-[#1A1A1A] uppercase mt-1">
                        {section.title}
                      </h2>
                    </div>

                    <ul className="space-y-3">
                      {section.content.map((item, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 + i * 0.05 }}
                          className="flex items-start gap-3 text-gray-600 leading-relaxed font-body"
                        >
                          <span className="flex-shrink-0 w-2 h-2 bg-[#CC1020] rounded-full mt-2" />
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>

            {/* Cookies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg p-8 mt-8"
            >
              <h2 className="text-2xl font-bold text-metallic-900 mb-4">
                5. Uso de Cookies
              </h2>
              <p className="text-metallic-700 leading-relaxed mb-4">
                Utilizamos cookies e tecnologias similares para:
              </p>
              <ul className="space-y-2 text-metallic-700">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2" />
                  <span>Manter você conectado ao fazer login</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2" />
                  <span>Lembrar suas preferências e itens no carrinho</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2" />
                  <span>
                    Analisar o tráfego do site e melhorar a experiência do
                    usuário
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2" />
                  <span>Personalizar conteúdo e anúncios</span>
                </li>
              </ul>
              <p className="text-metallic-700 leading-relaxed mt-4">
                Você pode configurar seu navegador para recusar cookies, mas
                isso pode afetar a funcionalidade do site.
              </p>
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg p-8 mt-8"
            >
              <h2 className="text-2xl font-bold text-metallic-900 mb-4">
                6. Segurança dos Dados
              </h2>
              <p className="text-metallic-700 leading-relaxed mb-4">
                Implementamos medidas de segurança técnicas e organizacionais
                para proteger suas informações pessoais contra acesso não
                autorizado, alteração, divulgação ou destruição.
              </p>
              <p className="text-metallic-700 leading-relaxed">
                No entanto, nenhum método de transmissão pela internet ou
                armazenamento eletrônico é 100% seguro. Embora nos esforcemos
                para proteger suas informações, não podemos garantir segurança
                absoluta.
              </p>
            </motion.div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-primary-600 text-white rounded-2xl shadow-lg p-8 mt-8 text-center"
            >
              <h2 className="text-2xl font-bold mb-4">Dúvidas?</h2>
              <p className="mb-6 text-primary-100">
                Se você tiver perguntas sobre esta Política de Privacidade,
                entre em contato conosco:
              </p>
              <div className="space-y-2">
                <p className="font-semibold">
                  Email: privacidade@shopferramentas.com.br
                </p>
                <p className="font-semibold">Telefone: (75) 3333-4444</p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
