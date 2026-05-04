'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import logger from '@/lib/logger';
import {
  Mail, Lock, Eye, EyeOff, Wrench, ShieldCheck, Truck, Tag,
  User, FileText, Building2,
} from 'lucide-react';

type Tab = 'login' | 'register';

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      if (result?.error) {
        toast.error('Credenciais inválidas');
        setIsLoading(false);
        return;
      }
      if (result?.ok) {
        toast.success('Login realizado com sucesso!');
        setTimeout(() => {
          try { window.dispatchEvent(new Event('cartUpdated')); } catch {}
          router.push('/');
          router.refresh();
        }, 100);
      }
    } catch (error) {
      console.error('[LOGIN]', error);
      toast.error('Erro ao fazer login');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-[#1A1A1A]">Bem-vindo de volta</h2>
        <p className="text-gray-500 text-sm">Entre na sua conta para continuar</p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-11 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        onClick={() => signIn('google', { callbackUrl: '/' })}
      >
        <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continuar com Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white text-gray-400 uppercase tracking-wide">ou com email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">Email</Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input id="login-email" type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="h-11 pl-10" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">Senha</Label>
            <Link href="/auth/forgot-password" className="text-xs text-[#CC1020] hover:text-red-700">Esqueceu a senha?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className="h-11 pl-10 pr-10" />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
          {isLoading ? 'Entrando...' : 'Entrar na conta'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Não tem uma conta?{' '}
        <button type="button" onClick={onSwitch} className="text-[#CC1020] hover:text-red-700 font-semibold">
          Cadastre-se grátis
        </button>
      </p>
    </div>
  );
}

// ── Register form ─────────────────────────────────────────────────────────────
function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });

  const f = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error('As senhas não coincidem'); return; }
    if (!acceptedTerms) { toast.error('Você deve aceitar os Termos de Serviço para continuar'); return; }
    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        acceptedTerms: true,
      });
      toast.success('Conta criada! Faça login para continuar.', { duration: 5000 });
      onSwitch();
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
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-[#1A1A1A]">Criar conta</h2>
        <p className="text-gray-500 text-sm">Rápido e fácil — só o essencial por agora</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reg-name" className="text-sm font-medium text-gray-700">Nome Completo</Label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input id="reg-name" type="text" placeholder="João Silva" value={formData.name} onChange={f('name')} required className="h-11 pl-10" />
          </div>
        </div>

        <div>
          <Label htmlFor="reg-email" className="text-sm font-medium text-gray-700">Email</Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input id="reg-email" type="email" placeholder="seu@email.com" value={formData.email} onChange={f('email')} required className="h-11 pl-10" />
          </div>
        </div>

        <div>
          <Label htmlFor="reg-password" className="text-sm font-medium text-gray-700">Senha</Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={formData.password} onChange={f('password')} required minLength={8} className="h-11 pl-10 pr-10" />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="reg-confirm" className="text-sm font-medium text-gray-700">Confirmar Senha</Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input id="reg-confirm" type={showConfirm ? 'text' : 'password'} placeholder="Repita a senha" value={formData.confirmPassword} onChange={f('confirmPassword')} required className="h-11 pl-10 pr-10" />
            <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-gray-50 rounded-sm p-3 border border-gray-100">
          <Checkbox id="acceptedTerms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(!!v)} className="mt-0.5" />
          <Label htmlFor="acceptedTerms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
            Li e aceito os{' '}
            <Link href="/termos" target="_blank" className="text-[#CC1020] underline hover:text-red-700">Termos de Serviço</Link>{' '}
            e a{' '}
            <Link href="/privacidade" target="_blank" className="text-[#CC1020] underline hover:text-red-700">Política de Privacidade</Link>
          </Label>
        </div>

        <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading || !acceptedTerms}>
          {isLoading ? 'Criando conta...' : 'Criar Conta'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Já tem uma conta?{' '}
        <button type="button" onClick={onSwitch} className="text-[#CC1020] hover:text-red-700 font-semibold">Faça login</button>
      </p>
    </div>
  );
}

// ── Combined auth content ─────────────────────────────────────────────────────
function AuthContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() =>
    searchParams?.get('tab') === 'register' ? 'register' : 'login'
  );

  useEffect(() => {
    if (searchParams?.get('welcome') === '1') {
      toast.success('Conta criada com sucesso! Faça login para continuar.', { duration: 5000 });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex bg-[#f5f5f5]">
      {/* Painel esquerdo */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#1A1A1A] flex-col justify-between p-14 relative overflow-hidden">
        {/* Padrão diagonal */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
        {/* Círculo decorativo */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#CC1020]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-[#CC1020]/5 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/">
            <div className="font-display text-4xl font-bold leading-tight">
              <span className="text-[#CC1020]">Feira</span>{' '}
              <span className="text-white">das</span>
            </div>
            <div className="font-display text-4xl font-bold text-white leading-tight">
              Ferramentas
            </div>
          </Link>
          <p className="text-gray-400 text-sm mt-3 leading-relaxed max-w-xs">
            A maior loja de ferramentas do Brasil. Tudo que você precisa para trabalhar com qualidade.
          </p>
        </div>

        {/* Benefícios */}
        <div className="relative z-10 space-y-5">
          <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Por que comprar aqui?</p>
          {[
            { icon: Truck, title: 'Entrega para todo o Brasil', sub: 'Frete calculado no checkout com as melhores transportadoras' },
            { icon: Tag, title: 'Melhores preços', sub: 'Ferramentas de qualidade com preço justo e promoções semanais' },
            { icon: ShieldCheck, title: 'Compra 100% segura', sub: 'Pagamento protegido via Mercado Pago com criptografia SSL' },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#CC1020]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-5 w-5 text-[#CC1020]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{title}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="relative z-10 flex items-center gap-2 text-gray-600 text-xs">
          <Wrench className="h-3.5 w-3.5" />
          <span>© {new Date().getFullYear()} Feira das Ferramentas. Todos os direitos reservados.</span>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-6">
            <Link href="/">
              <div className="font-display text-2xl font-bold leading-tight">
                <span className="text-[#CC1020]">Feira</span>{' '}
                <span className="text-[#1A1A1A]">das Ferramentas</span>
              </div>
            </Link>
          </div>

          <div className="bg-white shadow-xl rounded-sm border-t-4 border-[#CC1020]">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(['login', 'register'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative ${
                    tab === t ? 'text-[#CC1020]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t === 'login' ? 'Entrar' : 'Criar conta'}
                  {tab === t && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CC1020]" />
                  )}
                </button>
              ))}
            </div>

            {/* Conteúdo animado */}
            <div className="p-7">
              <AnimatePresence mode="wait">
                {tab === 'login' ? (
                  <motion.div key="login" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
                    <LoginForm onSwitch={() => setTab('register')} />
                  </motion.div>
                ) : (
                  <motion.div key="register" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    <RegisterForm onSwitch={() => setTab('login')} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC1020]" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
