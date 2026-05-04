import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Home, Package, Phone, Wrench } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-start pt-16 pb-20 overflow-hidden relative">

        {/* Padrão de fundo listrado */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(-55deg, #CC1020 0px, #CC1020 2px, transparent 2px, transparent 28px)`,
          }}
        />

        {/* Faixa vermelha no topo */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#CC1020]" />

        {/* 404 gigante ao fundo */}
        <p
          className="absolute font-display font-bold text-[28vw] leading-none text-white/[0.03] select-none tracking-tighter pointer-events-none"
          aria-hidden="true"
        >
          404
        </p>

        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center gap-10">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#CC1020] px-5 py-2 font-display font-bold tracking-widest uppercase text-white text-xs">
            <Wrench className="h-4 w-4" />
            Página não encontrada
          </div>

          {/* Título */}
          <div className="space-y-4">
            <h1 className="font-display text-6xl md:text-8xl font-bold text-white uppercase leading-none tracking-tight">
              Ops!<br />
              <span className="text-[#CC1020]">Página</span> perdida
            </h1>
            <p className="text-gray-400 text-lg font-body max-w-md mx-auto leading-relaxed">
              A página que você está procurando pode ter sido movida, removida ou nunca existiu.
            </p>
          </div>

          {/* Botões principais */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-[#CC1020] hover:bg-[#a80816] text-white font-display font-bold uppercase tracking-wide py-4 px-8 text-sm transition-colors"
            >
              <Home className="h-4 w-4" />
              Ir para a Home
            </Link>
            <Link
              href="/produtos"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 font-display font-bold uppercase tracking-wide py-4 px-8 text-sm transition-colors"
            >
              <Package className="h-4 w-4" />
              Ver Produtos
            </Link>
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-4 w-full max-w-md">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs font-display uppercase tracking-widest">ou navegue por</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Ferramentas Elétricas', href: '/produtos?categoria=eletrica' },
              { label: 'Ferramentas Manuais', href: '/produtos?categoria=manual' },
              { label: 'EPIs', href: '/produtos?categoria=epi' },
              { label: 'Ofertas', href: '/ofertas' },
              { label: 'Contato', href: '/contato' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-white/5 border border-white/10 text-sm text-gray-400 hover:border-[#CC1020] hover:text-white transition-colors font-body"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Linha de suporte */}
          <Link
            href="/contato"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#CC1020] text-sm font-body transition-colors"
          >
            <Phone className="h-4 w-4" />
            Precisa de ajuda? Fale com a gente
          </Link>
        </div>

      </main>
      <Footer />
    </>
  );
}

