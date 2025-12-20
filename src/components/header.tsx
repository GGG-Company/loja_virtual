'use client';

import Link from 'next/link';
import { ShoppingCart, User, Search, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { data: session } = useSession();
  type UserRole = 'CUSTOMER' | 'ADMIN' | 'OWNER';
  const role = (session?.user as { role?: UserRole } | undefined)?.role;

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    setCartCount(total);
  };

  useEffect(() => {
    // Atualiza contagem inicial
    updateCartCount();

    // Escuta evento de atualização do carrinho
    window.addEventListener('cartUpdated', updateCartCount);
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-metallic-200 shadow-sm">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl">🔨</div>
            <div>
              <h1 className="text-xl font-bold text-metallic-900">
                Shopping das Ferramentas
              </h1>
              <p className="text-xs text-metallic-600">
                Qualidade Profissional
              </p>
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Buscar ferramentas, marcas..."
                className="w-full px-4 py-2.5 pl-10 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Search className="absolute left-3 top-3 h-5 w-5 text-metallic-400" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <Link href="/minha-conta">
                  <Button variant="ghost" size="sm">
                    <User className="h-5 w-5 mr-2" />
                    <span className="hidden lg:inline">{session.user?.name?.split(' ')[0]}</span>
                  </Button>
                </Link>
                
                {role !== 'CUSTOMER' && role && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      Admin
                    </Button>
                  </Link>
                )}
                
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  Sair
                </Button>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  <User className="h-5 w-5 mr-2" />
                  <span className="hidden lg:inline">Entrar</span>
                </Button>
              </Link>
            )}

            {session && (
              <Link href="/carrinho">
                <Button variant="ghost" size="sm" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center space-x-8 py-3 border-t border-metallic-100">
          <Link href="/produtos" className="text-sm font-medium text-metallic-700 hover:text-primary-600 transition-colors">
            Todos os Produtos
          </Link>
          <Link href="/produtos?categoria=ferramentas-eletricas" className="text-sm font-medium text-metallic-700 hover:text-primary-600 transition-colors">
            Ferramentas Elétricas
          </Link>
          <Link href="/produtos?categoria=ferramentas-manuais" className="text-sm font-medium text-metallic-700 hover:text-primary-600 transition-colors">
            Ferramentas Manuais
          </Link>
          <Link href="/produtos?categoria=jardinagem" className="text-sm font-medium text-metallic-700 hover:text-primary-600 transition-colors">
            Jardinagem
          </Link>
          <Link href="/produtos?categoria=epis" className="text-sm font-medium text-metallic-700 hover:text-primary-600 transition-colors">
            EPIs
          </Link>
          <Link href="/ofertas" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
            🔥 Ofertas
          </Link>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-metallic-100">
            <div className="flex flex-col space-y-3">
              <Link href="/produtos" className="text-sm font-medium text-metallic-700">
                Todos os Produtos
              </Link>
              <Link href="/ofertas" className="text-sm font-medium text-primary-600">
                🔥 Ofertas
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
