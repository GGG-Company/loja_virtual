'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckoutProgress } from '@/components/checkout-progress';

// ── Masks ──────────────────────────────────────────────────────────────────
function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

// ── Validation helpers ─────────────────────────────────────────────────────
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  return phone.replace(/\D/g, '').length >= 10;
}

function validateCpf(cpf: string) {
  return cpf.replace(/\D/g, '').length === 11;
}

export default function CheckoutDadosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
  });
  const [touched, setTouched] = useState({
    nome: false,
    email: false,
    telefone: false,
    cpf: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('Faça login para continuar');
      router.push('/auth/login');
    }
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        nome: prev.nome || session.user.name || '',
        email: prev.email || session.user.email || '',
      }));
    }
  }, [session, status, router]);

  const errors = {
    nome: touched.nome && formData.nome.trim().length < 3
      ? 'Informe seu nome completo'
      : '',
    email: touched.email && !validateEmail(formData.email)
      ? 'E-mail inválido'
      : '',
    telefone: touched.telefone && !validatePhone(formData.telefone)
      ? 'Telefone inválido. Use o formato (00) 00000-0000'
      : '',
    cpf: touched.cpf && !validateCpf(formData.cpf)
      ? 'CPF inválido. Digite os 11 dígitos'
      : '',
  };

  const isValid =
    formData.nome.trim().length >= 3 &&
    validateEmail(formData.email) &&
    validatePhone(formData.telefone) &&
    validateCpf(formData.cpf);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nome: true, email: true, telefone: true, cpf: true });
    if (!isValid) return;
    localStorage.setItem('checkoutDados', JSON.stringify(formData));
    toast.success('Dados salvos!');
    router.push('/checkout/entrega');
  };

  const field = <K extends keyof typeof formData>(key: K) => ({
    value: formData[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (key === 'telefone') val = maskPhone(val);
      if (key === 'cpf') val = maskCpf(val);
      setFormData({ ...formData, [key]: val });
    },
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
  });

  if (status === 'loading') {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Carregando...">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC1020]" aria-hidden="true" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <CheckoutProgress currentStep={1} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-sm shadow-md border-t-4 border-[#CC1020] p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-7 bg-[#CC1020] rounded-full" />
              <h1 className="font-display text-2xl font-bold text-[#1A1A1A] uppercase">
                Dados Pessoais
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Nome */}
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  autoComplete="name"
                  placeholder="Seu nome completo"
                  aria-invalid={!!errors.nome}
                  aria-describedby={errors.nome ? 'nome-error' : undefined}
                  className={`h-12 mt-1 ${errors.nome ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
                  {...field('nome')}
                />
                {errors.nome && (
                  <p id="nome-error" role="alert" className="text-xs text-red-600 mt-1">{errors.nome}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`h-12 mt-1 ${errors.email ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
                  {...field('email')}
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="text-xs text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Telefone */}
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    aria-invalid={!!errors.telefone}
                    aria-describedby={errors.telefone ? 'telefone-error' : undefined}
                    className={`h-12 mt-1 ${errors.telefone ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
                    {...field('telefone')}
                  />
                  {errors.telefone && (
                    <p id="telefone-error" role="alert" className="text-xs text-red-600 mt-1">{errors.telefone}</p>
                  )}
                </div>

                {/* CPF */}
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    aria-invalid={!!errors.cpf}
                    aria-describedby={errors.cpf ? 'cpf-error' : undefined}
                    className={`h-12 mt-1 ${errors.cpf ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
                    {...field('cpf')}
                  />
                  {errors.cpf && (
                    <p id="cpf-error" role="alert" className="text-xs text-red-600 mt-1">{errors.cpf}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/carrinho')}
                >
                  ← Voltar
                </Button>
                <Button type="submit" className="flex-1 h-12" disabled={!isValid}>
                  Continuar para Entrega →
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
