'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText, Scale, PencilLine } from 'lucide-react';

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
    icon: Scale,
    title: '2. Bases Legais para o Tratamento (Art. 7 LGPD)',
    content: [
      'Execução de contrato (Art. 7, V): processamos seus dados para cumprir o contrato de compra e venda — processar pedidos, emitir notas fiscais e realizar entregas.',
      'Consentimento (Art. 7, I): para cookies de analytics e marketing, solicitamos seu consentimento explícito, que pode ser revogado a qualquer momento.',
      'Legítimo interesse (Art. 7, IX): usamos dados de navegação para prevenir fraudes e melhorar a segurança da plataforma.',
      'Cumprimento de obrigação legal (Art. 7, II): mantemos dados fiscais e de transações pelo prazo exigido pela legislação tributária.',
    ],
  },
  {
    icon: Lock,
    title: '3. Uso das Informações',
    content: [
      'Suas informações são utilizadas para processar pedidos e enviar produtos.',
      'Enviamos comunicações sobre seus pedidos e ofertas personalizadas (você pode optar por não receber).',
      'Melhoramos nossos serviços com base em análises de comportamento de navegação.',
      'Nunca vendemos suas informações pessoais para terceiros.',
    ],
  },
  {
    icon: Eye,
    title: '4. Compartilhamento de Dados',
    content: [
      'Compartilhamos dados com parceiros logísticos apenas para entrega de produtos.',
      'Processadores de pagamento recebem dados necessários para transações seguras.',
      'Podemos compartilhar dados quando exigido por lei ou para proteger nossos direitos.',
    ],
  },
  {
    icon: PencilLine,
    title: '5. Direito à Retificação (Art. 18, III)',
    content: [
      'Você pode corrigir dados incompletos, inexatos ou desatualizados a qualquer momento acessando Minha Conta → Perfil.',
      'Alterações de nome, e-mail, telefone, endereço e data de nascimento ficam disponíveis imediatamente.',
      'Para corrigir dados que não podem ser alterados pelo painel (ex.: CPF), envie solicitação ao DPO com documento comprobatório.',
      'O prazo de resposta para correções via DPO é de até 15 dias úteis (Art. 18, §3º da LGPD).',
    ],
  },
  {
    icon: FileText,
    title: '6. Seus Demais Direitos (Art. 18 LGPD)',
    content: [
      'Acesso: confirmar a existência de tratamento e obter cópia dos seus dados.',
      'Portabilidade: exportar todos os seus dados em formato JSON via Minha Conta → Exportar Dados.',
      'Exclusão: solicitar a anonimização ou eliminação dos dados tratados com base no consentimento via Minha Conta → Excluir Conta.',
      'Revogação de consentimento: alterar preferências de cookies a qualquer momento pelo banner ou entrando em contato com o DPO.',
      'Para exercer seus direitos, acesse Minha Conta ou envie e-mail para: privacidade@feiradeferramentas.com.br',
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
              className="bg-white rounded-sm shadow-md p-8 mt-8 border-l-4 border-[#CC1020]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                <h2 className="font-display text-xl font-bold text-[#1A1A1A] uppercase">
                  7. Uso de Cookies
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed font-body mb-4">
                Utilizamos cookies e tecnologias similares para:
              </p>
              <ul className="space-y-3">
                {[
                  'Manter você conectado ao fazer login (cookies essenciais)',
                  'Lembrar suas preferências e itens no carrinho',
                  'Analisar o tráfego do site e melhorar a experiência do usuário (apenas com consentimento)',
                  'Personalizar conteúdo e comunicações de marketing (apenas com consentimento)',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-600 leading-relaxed font-body">
                    <span className="flex-shrink-0 w-2 h-2 bg-[#CC1020] rounded-full mt-2" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-gray-600 leading-relaxed font-body mt-4">
                Você pode ajustar suas preferências de cookies a qualquer momento pelo banner
                exibido no rodapé do site.
              </p>
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-sm shadow-md p-8 mt-8 border-l-4 border-[#CC1020]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                <h2 className="font-display text-xl font-bold text-[#1A1A1A] uppercase">
                  8. Segurança dos Dados
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed font-body mb-4">
                Implementamos medidas de segurança técnicas e organizacionais para proteger
                suas informações pessoais contra acesso não autorizado, alteração, divulgação
                ou destruição, incluindo criptografia em trânsito (TLS) e controle de acesso
                baseado em funções (RBAC).
              </p>
              <p className="text-gray-600 leading-relaxed font-body">
                No entanto, nenhum método de transmissão pela internet ou armazenamento
                eletrônico é 100% seguro. Em caso de incidente de segurança que possa
                afetar seus dados, você será notificado nos prazos previstos pela LGPD.
              </p>
            </motion.div>

            {/* Encarregado de Dados (DPO) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-sm shadow-md p-8 mt-8 border-l-4 border-[#CC1020]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                <h2 className="font-display text-xl font-bold text-[#1A1A1A] uppercase">
                  7. Encarregado de Dados (DPO)
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed font-body mb-4">
                Nos termos do Art. 41 da LGPD, designamos um Encarregado pelo Tratamento de Dados
                Pessoais (Data Protection Officer — DPO), responsável por atuar como canal de
                comunicação entre a empresa, os titulares dos dados e a Autoridade Nacional de
                Proteção de Dados (ANPD).
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-sm p-4 space-y-2">
                <p className="text-sm font-semibold text-[#1A1A1A]">Encarregado: Equipe de Privacidade — Feira das Ferramentas</p>
                <p className="text-sm text-gray-600">E-mail: <a href="mailto:dpo@feiradeferramentas.com.br" className="text-[#CC1020] underline">dpo@feiradeferramentas.com.br</a></p>
                <p className="text-sm text-gray-600">Telefone: (75) 98159-8195</p>
                <p className="text-sm text-gray-500">Prazo de resposta: até 15 dias úteis (conforme Art. 18, §3º da LGPD)</p>
              </div>
              <p className="text-gray-600 leading-relaxed font-body mt-4 text-sm">
                Para exercer seus direitos (acesso, correção, portabilidade, exclusão, revogação de
                consentimento), acesse <a href="/minha-conta" className="text-[#CC1020] underline">Minha Conta</a>{' '}
                ou envie sua solicitação ao DPO pelo e-mail acima.
              </p>
            </motion.div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#CC1020] text-white rounded-sm shadow-lg p-8 mt-8 text-center"
            >
              <h2 className="font-display text-2xl font-bold uppercase mb-4">Dúvidas?</h2>
              <p className="mb-6 text-red-100">
                Se você tiver perguntas sobre esta Política de Privacidade,
                entre em contato conosco:
              </p>
              <div className="space-y-2">
                <p className="font-semibold">
                  E-mail: <a href="mailto:privacidade@feiradeferramentas.com.br" className="underline">privacidade@feiradeferramentas.com.br</a>
                </p>
                <p className="font-semibold">DPO: <a href="mailto:dpo@feiradeferramentas.com.br" className="underline">dpo@feiradeferramentas.com.br</a></p>
                <p className="font-semibold">Telefone: (75) 98159-8195</p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
