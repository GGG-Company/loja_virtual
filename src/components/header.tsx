'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { NotificationBell } from './notification-bell';
import { SmartSearchBar } from './SmartSearchBar';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/contexts/cart-context';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { count: cartCount } = useCart();
  const { data: session } = useSession();
  type UserRole = 'CUSTOMER' | 'ADMIN' | 'OWNER';
  const role = (session?.user as { role?: UserRole } | undefined)?.role;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-shadow duration-200 ${
        isScrolled ? 'shadow-lg' : 'shadow-sm'
      }`}
    >
      {/* Top bar — brand red */}
      <div className="bg-[#CC1020] text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-2 text-xs font-medium">
            <span className="hidden sm:block tracking-wide">
              📍 Feira de Santana, BA &nbsp;|&nbsp; DESDE 2004
            </span>
            <div className="flex items-center gap-4">
              <span>☎ (75) 98159-8195</span>
              <span className="hidden sm:block">✉ contato@feiradeferramentas.com.br</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main header — white */}
      <div className="bg-white border-b-2 border-[#CC1020]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="relative w-14 h-14 logo-stamp logo-shine logo-pulse">
                <Image
                  src="/logo_shopping_das_ferramentas.jpg"
                  alt="Feira das Ferramentas"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <div className="font-display text-xl leading-none">
                  <span className="text-[#CC1020]">Feira</span>{' '}
                  <span className="text-[#1A1A1A]">das</span>
                </div>
                <div className="font-display text-xl leading-none text-[#1A1A1A]">
                  Ferramentas
                </div>
                <p className="text-[9px] font-semibold text-[#CC1020] tracking-widest uppercase mt-0.5">
                  Onde você encontra tudo!
                </p>
              </div>
            </Link>

            {/* Smart Search Bar — Desktop */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-4">
              <SmartSearchBar enableSlashShortcut />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {session ? (
                <div className="flex items-center gap-2">
                  <NotificationBell />

                  <Link href="/minha-conta">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#1A1A1A] hover:text-[#CC1020] hover:bg-red-50"
                    >
                      <User className="h-5 w-5 mr-1.5" />
                      <span className="hidden lg:inline text-sm font-semibold">
                        {session.user?.name?.split(' ')[0]}
                      </span>
                    </Button>
                  </Link>

                  {role !== 'CUSTOMER' && role && (
                    <Link href="/admin">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#CC1020] text-[#CC1020] hover:bg-[#CC1020] hover:text-white text-xs font-bold"
                      >
                        Admin
                      </Button>
                    </Link>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="text-metallic-500 hover:text-[#CC1020] text-xs"
                  >
                    Sair
                  </Button>
                </div>
              ) : (
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#1A1A1A] hover:text-[#CC1020] hover:bg-red-50"
                  >
                    <User className="h-5 w-5 mr-1.5" />
                    <span className="hidden lg:inline text-sm font-semibold">Entrar</span>
                  </Button>
                </Link>
              )}

              <Link
                href="/carrinho"
                aria-label={`Carrinho${cartCount > 0 ? ` — ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : ''}`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative text-[#1A1A1A] hover:text-[#CC1020] hover:bg-red-50"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      className="absolute -top-1 -right-1 bg-[#CC1020] text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center"
                    >
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-[#1A1A1A]"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation bar — dark */}
      <nav className="hidden lg:block bg-[#1A1A1A]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 py-0">
            <Link
              href="/produtos"
              className="px-4 py-3 text-sm font-display font-bold text-white hover:bg-[#CC1020] transition-colors tracking-wide uppercase"
            >
              Todos os Produtos
            </Link>
            <Link
              href="/produtos?grupo=ferramentas-eletricas"
              className="px-4 py-3 text-sm font-display font-bold text-white hover:bg-[#CC1020] transition-colors tracking-wide uppercase"
            >
              Elétricas
            </Link>
            <Link
              href="/produtos?grupo=ferramentas-manuais"
              className="px-4 py-3 text-sm font-display font-bold text-white hover:bg-[#CC1020] transition-colors tracking-wide uppercase"
            >
              Manuais
            </Link>
            <Link
              href="/produtos?grupo=jardinagem"
              className="px-4 py-3 text-sm font-display font-bold text-white hover:bg-[#CC1020] transition-colors tracking-wide uppercase"
            >
              Jardinagem
            </Link>
            <Link
              href="/produtos?grupo=casa"
              className="px-4 py-3 text-sm font-display font-bold text-white hover:bg-[#CC1020] transition-colors tracking-wide uppercase"
            >
              Casa
            </Link>
            <Link
              href="/produtos?grupo=epis"
              className="px-4 py-3 text-sm font-display font-bold text-white hover:bg-[#CC1020] transition-colors tracking-wide uppercase"
            >
              EPIs
            </Link>
            <div className="ml-auto">
              <Link
                href="/ofertas"
                className="flex items-center gap-1.5 px-5 py-3 bg-[#CC1020] text-white text-sm font-display font-bold tracking-widest uppercase hover:bg-[#a80816] transition-colors"
              >
                🔥 OFERTAS IMPERDÍVEIS
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-xl">
          {/* Mobile Smart Search */}
          <div className="p-4 border-b border-gray-100">
            <SmartSearchBar
              placeholder="Buscar ferramentas..."
              autoFocus
            />
          </div>
          <div className="flex flex-col">
            {[
              { href: '/produtos', label: 'Todos os Produtos' },
              { href: '/produtos?categoria=ferramentas-eletricas', label: 'Ferramentas Elétricas' },
              { href: '/produtos?categoria=ferramentas-manuais', label: 'Ferramentas Manuais' },
              { href: '/produtos?categoria=jardinagem', label: 'Jardinagem' },
              { href: '/produtos?categoria=casa', label: 'Casa' },
              { href: '/produtos?categoria=epis', label: 'EPIs' },
              { href: '/sobre', label: 'Sobre Nós' },
              { href: '/contato', label: 'Contato' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="px-5 py-3.5 text-sm font-semibold text-[#1A1A1A] hover:bg-red-50 hover:text-[#CC1020] border-b border-gray-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/ofertas"
              onClick={() => setIsMenuOpen(false)}
              className="px-5 py-3.5 text-sm font-bold text-white bg-[#CC1020] hover:bg-[#a80816] transition-colors"
            >
              🔥 Ofertas Imperdíveis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
