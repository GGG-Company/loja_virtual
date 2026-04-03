'use client';

import logger from "@/lib/logger";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    phone: '',
    personType: 'CPF' as 'CPF' | 'CNPJ',
    cpf: '',
    cnpj: '',
    stateRegistration: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (!formData.birthDate) {
      toast.error('Data de nascimento é obrigatória');
      setIsLoading(false);
      return;
    }

    if (!acceptedTerms) {
      toast.error('Você deve aceitar os Termos de Serviço para continuar');
      setIsLoading(false);
      return;
    }

    const hasDoc =
      formData.personType === 'CPF'
        ? !!formData.cpf.trim()
        : !!formData.cnpj.trim();

    if (!hasDoc) {
      toast.error('Informe o documento selecionado');
      setIsLoading(false);
      return;
    }

    try {
      await apiClient.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        birthDate: formData.birthDate,
        phone: formData.phone,
        cpf: formData.personType === 'CPF' ? formData.cpf : undefined,
        cnpj: formData.personType === 'CNPJ' ? formData.cnpj : undefined,
        stateRegistration: formData.stateRegistration || undefined,
        acceptedTerms: true,
      });

      router.push('/auth/login?welcome=1');
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.error || 'Erro ao criar conta');
      } else {
        logger.error(error, '[REGISTER]');
        toast.error('Erro ao criar conta');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white shadow-2xl p-8 space-y-6 border-t-4 border-[#CC1020]">
          <div className="text-center space-y-2">
            <div className="font-display text-2xl font-bold leading-tight">
              <span className="text-[#CC1020]">Feira</span>{' '}
              <span className="text-[#1A1A1A]">das Ferramentas</span>
            </div>
            <h1 className="text-lg font-semibold text-[#1A1A1A] font-display">
              Criar Conta
            </h1>
            <p className="text-gray-500 font-body text-sm">
              Cadastre-se para começar a comprar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="João Silva"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(75) 99999-0000"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="h-12"
              />
            </div>

            <div className="space-y-3">
              <Label>Tipo de cadastro</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['CPF', 'CNPJ'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, personType: type })}
                    className={`h-11 rounded-sm border-2 transition font-body text-sm font-semibold ${
                      formData.personType === type
                        ? 'border-[#CC1020] bg-red-50 text-[#CC1020]'
                        : 'border-gray-200 hover:border-[#CC1020]/40 text-gray-700'
                    }`}
                  >
                    {type === 'CPF' ? 'Pessoa Física (CPF)' : 'Pessoa Jurídica (CNPJ)'}
                  </button>
                ))}
              </div>
            </div>

            {formData.personType === 'CPF' ? (
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  className="h-12"
                  required={formData.personType === 'CPF'}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="h-12"
                    required={formData.personType === 'CNPJ'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stateRegistration">Inscrição Estadual (PJ)</Label>
                  <Input
                    id="stateRegistration"
                    type="text"
                    placeholder="ISENTO ou número"
                    value={formData.stateRegistration}
                    onChange={(e) =>
                      setFormData({ ...formData, stateRegistration: e.target.value })
                    }
                    className="h-12"
                  />
                  <p className="text-xs text-metallic-600">
                    Obrigatório para B2B; informe "ISENTO" se não tiver.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                  .toISOString()
                  .split('T')[0]}
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                required
                className="h-12"
              />
              <p className="text-xs text-gray-500">Você deve ter 18 anos ou mais para se cadastrar.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={8}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                className="h-12"
              />
            </div>

            <div className="flex items-start gap-3 pt-1">
              <Checkbox
                id="acceptedTerms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                className="mt-0.5"
              />
              <Label htmlFor="acceptedTerms" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
                Li e aceito os{' '}
                <Link href="/termos" target="_blank" className="text-[#CC1020] underline hover:text-red-700">
                  Termos de Serviço
                </Link>{' '}
                e a{' '}
                <Link href="/privacidade" target="_blank" className="text-[#CC1020] underline hover:text-red-700">
                  Política de Privacidade
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isLoading || !acceptedTerms}
            >
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-metallic-600">
              Já tem uma conta?{' '}
              <Link
                href="/auth/login"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
