import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          {/* Big 404 */}
          <div className="relative mb-8 select-none">
            <p
              className="font-display text-[180px] lg:text-[220px] font-bold leading-none text-gray-100 tracking-tight"
              aria-hidden="true"
            >
              404
            </p>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white border-t-4 border-[#CC1020] rounded-sm shadow-xl p-8 max-w-sm w-full mx-4">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                  <p className="text-xs font-display font-bold text-[#CC1020] tracking-widest uppercase">
                    Página não encontrada
                  </p>
                  <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                </div>

                <h1 className="font-display text-2xl font-bold text-[#1A1A1A] uppercase mb-2">
                  Ops! Essa página não existe
                </h1>
                <p className="text-gray-500 text-sm mb-6 font-body leading-relaxed">
                  A página que você está procurando pode ter sido movida,
                  removida ou nunca existiu. Vamos te ajudar a encontrar o que
                  precisa.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/"
                    className="flex-1 bg-[#CC1020] hover:bg-[#a80816] text-white font-display font-bold uppercase tracking-wide py-3 px-6 text-sm text-center transition-colors"
                  >
                    Ir para a Home
                  </Link>
                  <Link
                    href="/produtos"
                    className="flex-1 bg-[#1A1A1A] hover:bg-[#333] text-white font-display font-bold uppercase tracking-wide py-3 px-6 text-sm text-center transition-colors"
                  >
                    Ver Produtos
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {[
              { label: 'Ferramentas Elétricas', href: '/produtos?categoria=eletrica' },
              { label: 'Ferramentas Manuais', href: '/produtos?categoria=manual' },
              { label: 'EPIs', href: '/produtos?categoria=epi' },
              { label: 'Contato', href: '/contato' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-white border border-gray-200 text-sm text-gray-600 hover:border-[#CC1020] hover:text-[#CC1020] transition-colors rounded-sm font-body"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
