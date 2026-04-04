'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import { FileText, ShoppingCart, Truck, RotateCcw, AlertTriangle, Scale } from 'lucide-react';

const sections = [
  {
    icon: ShoppingCart,
    title: '1. Aceitação dos Termos',
    content: [
      'Ao acessar ou usar os serviços da Feira das Ferramentas, você concorda com estes Termos de Serviço.',
      'Se você não concordar com qualquer parte destes termos, não utilize nossos serviços.',
      'Reservamo-nos o direito de atualizar estes termos a qualquer momento, com notificação prévia por e-mail.',
      'O uso continuado dos serviços após alterações constitui aceitação dos novos termos.',
    ],
  },
  {
    icon: FileText,
    title: '2. Cadastro e Conta',
    content: [
      'Você deve ter pelo menos 18 anos de idade para criar uma conta.',
      'As informações fornecidas no cadastro devem ser verídicas e atualizadas.',
      'Você é responsável por manter a confidencialidade de sua senha.',
      'Notifique-nos imediatamente sobre qualquer uso não autorizado de sua conta.',
      'Reservamo-nos o direito de encerrar contas que violem estes termos.',
    ],
  },
  {
    icon: ShoppingCart,
    title: '3. Pedidos e Pagamentos',
    content: [
      'Todos os preços são em Reais (BRL) e incluem impostos aplicáveis.',
      'O pedido é confirmado somente após aprovação do pagamento.',
      'Reservamo-nos o direito de cancelar pedidos por falta de estoque ou erros de preço.',
      'Pagamentos são processados pelo Mercado Pago, sujeitos aos termos desse serviço.',
      'Em caso de fraude ou suspeita de fraude, o pedido será cancelado e o valor estornado.',
    ],
  },
  {
    icon: Truck,
    title: '4. Entrega e Frete',
    content: [
      'Os prazos de entrega são estimados e podem variar por fatores externos (greves, feriados, clima).',
      'O frete é calculado via Melhor Envio com base no endereço de entrega e peso dos produtos.',
      'O risco de danos ou perda passa ao transportador no momento da coleta.',
      'Em caso de extravio, abriremos disputa com a transportadora em seu favor.',
    ],
  },
  {
    icon: RotateCcw,
    title: '5. Devoluções e Trocas',
    content: [
      'Você tem direito de arrependimento em até 7 dias corridos após o recebimento (CDC Art. 49).',
      'Produtos com defeito têm garantia de 90 dias para produtos não duráveis e 180 dias para duráveis.',
      'Para solicitar devolução, acesse "Minha Conta > Devoluções" ou entre em contato conosco.',
      'O reembolso será processado em até 10 dias úteis após recebermos o produto.',
    ],
  },
  {
    icon: AlertTriangle,
    title: '6. Limitação de Responsabilidade',
    content: [
      'Não somos responsáveis por danos indiretos, incidentais ou consequentes.',
      'Nossa responsabilidade máxima é limitada ao valor pago no pedido em questão.',
      'Não garantimos que o site estará sempre disponível sem interrupções.',
      'Imagens dos produtos são ilustrativas e podem diferir levemente do produto real.',
    ],
  },
  {
    icon: Scale,
    title: '7. Lei Aplicável e Foro',
    content: [
      'Estes termos são regidos pela legislação brasileira.',
      'Fica eleito o foro da Comarca de Feira de Santana/BA para dirimir quaisquer controvérsias.',
      'Tentaremos resolver disputas de forma amigável antes de qualquer ação judicial.',
      'Para consumidores, aplica-se o Código de Defesa do Consumidor (Lei 8.078/90).',
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Hero */}
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
                <FileText className="h-10 w-10 text-[#CC1020]" />
              </motion.div>

              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">Legal</p>
                <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
              </div>

              <h1 className="font-display text-5xl font-bold uppercase mb-4">
                Termos de Serviço
              </h1>
              <p className="text-gray-300 font-body">
                Leia atentamente os termos e condições que regem o uso dos nossos serviços.
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
            {/* Intro */}
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
                Bem-vindo à <strong>Feira das Ferramentas</strong>. Estes Termos de Serviço
                constituem um contrato legal entre você e a Feira das Ferramentas (CNPJ em
                constituição), com sede em Feira de Santana, Bahia, Brasil.
              </p>
              <p className="text-gray-600 leading-relaxed font-body">
                Ao criar uma conta ou realizar uma compra, você confirma que leu, compreendeu
                e concorda com estes termos, bem como com nossa{' '}
                <a href="/privacidade" className="text-[#CC1020] underline">Política de Privacidade</a>.
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
                    transition={{ delay: index * 0.08 }}
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
                        <li key={i} className="flex items-start gap-3 text-gray-600 leading-relaxed font-body">
                          <span className="flex-shrink-0 w-2 h-2 bg-[#CC1020] rounded-full mt-2" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#CC1020] text-white rounded-sm shadow-lg p-8 mt-12 text-center"
            >
              <h2 className="font-display text-2xl font-bold uppercase mb-4">Dúvidas?</h2>
              <p className="mb-6 text-red-100">
                Em caso de dúvidas sobre estes Termos de Serviço, entre em contato:
              </p>
              <div className="space-y-2">
                <p className="font-semibold">E-mail: juridico@shopferramentas.com.br</p>
                <p className="font-semibold">Telefone: (75) 98159-8195</p>
                <p className="text-sm text-red-200 mt-4">
                  Seg–Sex: 08h–18h | Sáb: 08h–12h
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
