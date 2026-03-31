'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (searchParams?.get('welcome') === '1') {
      toast.success('Conta criada com sucesso! Faça login para continuar.', { duration: 5000 });
    }
  }, [searchParams]);

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
        // Pequeno delay para garantir que a sessão foi criada
        setTimeout(() => {
          // Atualiza o header/carrinho a partir do localStorage
          try {
            window.dispatchEvent(new Event("cartUpdated"));
          } catch {}
          router.push("/");
          router.refresh();
        }, 100);
      }
    } catch (error) {
      console.error('[LOGIN]', error);
      toast.error('Erro ao fazer login');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white shadow-2xl p-8 space-y-6 border-t-4 border-[#CC1020]">
          {/* Logo e Título */}
          <div className="text-center space-y-2">
            <div className="font-display text-2xl font-bold leading-tight">
              <span className="text-[#CC1020]">Feira</span>{' '}
              <span className="text-[#1A1A1A]">das Ferramentas</span>
            </div>
            <p className="text-gray-500 font-body text-sm">
              Faça login para continuar
            </p>
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-metallic-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-metallic-500">
                ou continue com email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete="email"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                autoComplete="current-password"
                spellCheck={false}
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Links */}
          <div className="text-center space-y-2">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Esqueceu sua senha?
            </Link>
            <p className="text-sm text-metallic-600">
              Não tem uma conta?{' '}
              <Link
                href="/auth/register"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Cadastre-se
              </Link>
            </p>
          </div>


          {/* Credenciais de Teste */}
          {/* <div className="mt-6 p-4 bg-metallic-50 rounded-lg">
            <p className="text-xs text-metallic-600 font-semibold mb-2">
              Credenciais de teste:
            </p>
            <div className="text-xs text-metallic-700 space-y-1">
              <p>👑 Owner: dono@loja.com / senha123</p>
              <p>🛡️ Admin: gerente@loja.com / senha123</p>
              <p>👤 Cliente: cliente@gmail.com / senha123</p>
            </div>
          </div> */}
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC1020]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
