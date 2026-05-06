'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User, Menu, X, Heart, Search, LogOut, LayoutDashboard, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { NotificationBell } from './notification-bell';
import { SmartSearchBar } from './SmartSearchBar';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/contexts/cart-context';

const NAV_LINKS = [
  { href: '/produtos', label: 'Todos os Produtos' },
  { href: '/produtos?grupo=ferramentas-eletricas', label: 'Elétricas' },
  { href: '/produtos?grupo=ferramentas-manuais', label: 'Manuais' },
  { href: '/produtos?grupo=jardinagem', label: 'Jardinagem' },
  { href: '/produtos?grupo=casa', label: 'Casa' },
  { href: '/produtos?grupo=epis', label: 'EPIs' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { count: cartCount } = useCart();
  const { data: session } = useSession();
  type UserRole = 'CUSTOMER' | 'ADMIN' | 'OWNER';
  const role = (session?.user as { role?: UserRole } | undefined)?.role;
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fecha busca ao clicar fora
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isSearchOpen]);

  // Fecha menu/busca no resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 transition-shadow duration-200 ${
        isScrolled ? 'shadow-lg' : 'shadow-sm'
      }`}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="bg-[#CC1020] text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-1.5 text-xs font-medium">
            <span className="hidden sm:block tracking-wide opacity-90">
              📍 Feira de Santana, BA &nbsp;|&nbsp; DESDE 2004
            </span>
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <a href="tel:+5575981598195" className="hover:underline tracking-wide">
                ☎ (75) 98159-8195
              </a>
              <a href="mailto:contato@feiradeferramentas.com.br" className="hidden sm:block hover:underline truncate">
                ✉ contato@feiradeferramentas.com.br
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main header ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b-2 border-[#CC1020]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-2.5 gap-3">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={closeMenu}>
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 logo-stamp logo-shine logo-pulse">
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
                <p className="text-[10px] font-semibold text-[#CC1020] tracking-widest uppercase mt-0.5">
                  Onde você encontra tudo!
                </p>
              </div>
            </Link>

            {/* Search — Desktop */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-2">
              <SmartSearchBar enableSlashShortcut />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">

              {/* Search toggle — Mobile only */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-[#1A1A1A] hover:text-[#CC1020] hover:bg-red-50 p-2"
                onClick={() => { setIsSearchOpen((v) => !v); setIsMenuOpen(false); }}
                aria-label="Abrir busca"
              >
                {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </Button>

              {session ? (
                <>
                  <NotificationBell />

                  <Link href="/minha-conta/favoritos" aria-label="Meus favoritos" className="hidden sm:block">
                    <Button variant="ghost" size="sm" className="text-[#1A1A1A] hover:text-[#CC1020] hover:bg-red-50 p-2">
                      <Heart className="h-5 w-5" />
                    </Button>
                  </Link>

                  <Link href="/minha-conta" className="hidden lg:block">
                    <Button variant="ghost" size="sm" className="text-[#1A1A1A] hover:text-[#CC1020] hover:bg-red-50">
                      <User className="h-4 w-4 mr-1.5" />
                      <span className="text-sm font-semibold">{session.user?.name?.split(' ')[0]}</span>
                    </Button>
                  </Link>

                  {role !== 'CUSTOMER' && role && (
                    <Link href="/admin" className="hidden lg:block">
                      <Button variant="outline" size="sm" className="border-[#CC1020] text-[#CC1020] hover:bg-[#CC1020] hover:text-white text-xs font-bold">
                        Admin
                      </Button>
                    </Link>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="hidden lg:inline-flex text-metallic-500 hover:text-[#CC1020] text-xs"
                  >
                    Sair
                  </Button>
                </>
              ) : (
                <Link href="/auth/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="text-[#1A1A1A] hover:text-[#CC1020] hover:bg-red-50">
                    <User className="h-5 w-5 mr-1.5" />
                    <span className="hidden lg:inline text-sm font-semibold">Entrar</span>
                  </Button>
                </Link>
              )}

              {/* Cart */}
              <Link
                href="/carrinho"
                aria-label={`Carrinho${cartCount > 0 ? ` — ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : ''}`}
              >
                <Button variant="ghost" size="sm" className="relative text-[#1A1A1A] hover:text-[#CC1020] hover:bg-red-50 p-2">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      className="absolute -top-1 -right-1 bg-[#CC1020] text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center leading-none"
                    >
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Hamburger — Mobile / Tablet */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-[#1A1A1A] hover:bg-red-50 p-2"
                onClick={() => { setIsMenuOpen((v) => !v); setIsSearchOpen(false); }}
                aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Search expandível — Mobile */}
        {isSearchOpen && (
          <div ref={searchRef} className="md:hidden border-t border-gray-100 px-4 py-3 bg-white">
            <SmartSearchBar
              placeholder="Buscar ferramentas, marcas..."
              autoFocus
            />
          </div>
        )}
      </div>

      {/* ── Navigation — Desktop ──────────────────────────────────────────── */}
      <nav className="hidden lg:block bg-[#1A1A1A]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-0">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-sm font-display font-bold text-white hover:bg-[#CC1020] transition-colors tracking-wide uppercase whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
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

      {/* ── Mobile Menu ───────────────────────────────────────────────────── */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-2xl max-h-[85vh] overflow-y-auto">

          {/* Conta — logado */}
          {session ? (
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#CC1020] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {session.user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#1A1A1A] truncate">{session.user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/minha-conta" onClick={closeMenu} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1A1A1A] bg-white border border-gray-200 rounded-lg hover:border-[#CC1020] hover:text-[#CC1020] transition-colors">
                  <User className="h-3.5 w-3.5" /> Minha Conta
                </Link>
                <Link href="/minha-conta/favoritos" onClick={closeMenu} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1A1A1A] bg-white border border-gray-200 rounded-lg hover:border-[#CC1020] hover:text-[#CC1020] transition-colors">
                  <Heart className="h-3.5 w-3.5" /> Favoritos
                </Link>
                {role !== 'CUSTOMER' && role && (
                  <Link href="/admin" onClick={closeMenu} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#CC1020] bg-red-50 border border-[#CC1020]/30 rounded-lg hover:bg-[#CC1020] hover:text-white transition-colors">
                    <LayoutDashboard className="h-3.5 w-3.5" /> Admin
                  </Link>
                )}
                <button onClick={() => { closeMenu(); signOut(); }} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-500 transition-colors">
                  <LogOut className="h-3.5 w-3.5" /> Sair
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <Link href="/auth/login" onClick={closeMenu} className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-white bg-[#CC1020] rounded-lg hover:bg-[#a80816] transition-colors">
                <span className="flex items-center gap-2"><User className="h-4 w-4" /> Entrar / Criar Conta</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Navegação */}
          <div className="py-2">
            <p className="px-5 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categorias</p>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="flex items-center justify-between px-5 py-3 text-sm font-semibold text-[#1A1A1A] hover:bg-red-50 hover:text-[#CC1020] border-b border-gray-50 transition-colors"
              >
                {link.label}
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </Link>
            ))}
            {[
              { href: '/sobre', label: 'Sobre Nós' },
              { href: '/contato', label: 'Contato' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="flex items-center justify-between px-5 py-3 text-sm font-semibold text-[#1A1A1A] hover:bg-red-50 hover:text-[#CC1020] border-b border-gray-50 transition-colors"
              >
                {link.label}
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </Link>
            ))}
            <Link
              href="/ofertas"
              onClick={closeMenu}
              className="flex items-center justify-between px-5 py-3.5 text-sm font-bold text-white bg-[#CC1020] hover:bg-[#a80816] transition-colors mt-1"
            >
              🔥 Ofertas Imperdíveis
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
