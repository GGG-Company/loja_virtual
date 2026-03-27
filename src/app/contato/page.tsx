'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Mensagem enviada com sucesso! Retornaremos em breve.');
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

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

          <div className="container mx-auto px-4 relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-1 h-8 bg-[#CC1020] rounded-full" />
                <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                  Atendimento
                </p>
                <div className="w-1 h-8 bg-[#CC1020] rounded-full" />
              </div>
              <h1 className="font-display text-5xl font-bold uppercase mb-3">Entre em Contato</h1>
              <p className="text-gray-300 text-lg font-body">
                Estamos aqui para ajudar! Fale conosco
              </p>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-7 bg-[#CC1020] rounded-full" />
                  <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                    Fale Conosco
                  </p>
                </div>
                <h2 className="font-display text-3xl font-bold text-[#1A1A1A] uppercase mb-2">
                  Informações de Contato
                </h2>
                <p className="text-gray-500 font-body">
                  Nossa equipe está pronta para atender você com excelência.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: Phone,
                    title: 'Telefone',
                    content: '(75) 3333-4444',
                    subcontent: 'Seg - Sex, 8h às 18h',
                  },
                  {
                    icon: Mail,
                    title: 'Email',
                    content: 'contato@feiradeferramentas.com.br',
                    subcontent: 'Respondemos em até 24h',
                  },
                  {
                    icon: MapPin,
                    title: 'Endereço',
                    content: 'Av. Principal, 1234',
                    subcontent: 'Feira de Santana, BA — CEP 44002-264',
                  },
                  {
                    icon: Clock,
                    title: 'Horário de Atendimento',
                    content: 'Segunda a Sexta: 8h – 18h',
                    subcontent: 'Sábado: 8h – 12h',
                  },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex gap-4 p-5 bg-white rounded-sm shadow-sm border border-gray-100 hover:border-[#CC1020]/30 hover:shadow-md transition-all"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-11 h-11 bg-red-50 rounded-sm flex items-center justify-center">
                          <Icon className="h-5 w-5 text-[#CC1020]" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-[#1A1A1A] uppercase text-sm tracking-wide mb-0.5">
                          {item.title}
                        </h3>
                        <p className="text-gray-700 font-body">{item.content}</p>
                        <p className="text-sm text-gray-400 font-body">{item.subcontent}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white rounded-sm shadow-lg border-t-4 border-[#CC1020] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-7 bg-[#CC1020] rounded-full" />
                  <h2 className="font-display text-2xl font-bold text-[#1A1A1A] uppercase">
                    Envie sua Mensagem
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem *</Label>
                    <textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#CC1020] focus:border-[#CC1020] font-body text-sm"
                    />
                  </div>

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <button
                      type="submit"
                      className="w-full h-14 bg-[#CC1020] hover:bg-[#a80816] text-white font-display font-bold text-lg tracking-wide uppercase transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="h-5 w-5" />
                      Enviar Mensagem
                    </button>
                  </motion.div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
