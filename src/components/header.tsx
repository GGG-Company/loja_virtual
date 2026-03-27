'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, Search, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { NotificationBell } from './notification-bell';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

export function Header() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; price: number; promotionalPrice?: number | null; imageUrl?: string | null; images?: Array<{ url: string }> }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { data: session } = useSession();
  type UserRole = "CUSTOMER" | "ADMIN" | "OWNER";
  const role = (session?.user as { role?: UserRole } | undefined)?.role;

  // Conectar ao Socket.io para buscas
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!url) return;

    const socket = io(url, { transports: ['websocket'], reconnectionAttempts: 3 });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const total = cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    setCartCount(total);
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener("cartUpdated", updateCartCount);
    return () => window.removeEventListener("cartUpdated", updateCartCount);
  }, []);

  useEffect(() => {
    updateCartCount();
  }, [session]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca via Socket.io com debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        // Fallback para fetch se socket não estiver conectado
        fetchSearchFallback(value.trim());
        return;
      }

      setIsSearching(true);
      socket.emit('product_search', { query: value.trim() }, (response: { products: Array<{ id: string; name: string; price: number; promotionalPrice?: number | null; imageUrl?: string | null }> }) => {
        const results = (response?.products || []).slice(0, 6);
        setSearchResults(results);
        setShowResults(results.length > 0);
        setIsSearching(false);
      });
    }, 300);
  };

  // Fallback caso socket não esteja disponível
  const fetchSearchFallback = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results = (data.products || []).slice(0, 6);
      setSearchResults(results);
      setShowResults(results.length > 0);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowResults(false);
      router.push(`/produtos?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const goToProduct = (id: string) => {
    setShowResults(false);
    setSearchQuery('');
    router.push(`/produtos/${id}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-metallic-200 shadow-sm">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl">🔨</div>
            <div>
              <h1 className="text-xl font-bold text-metallic-900">Shopping das Ferramentas</h1>
              <p className="text-xs text-metallic-600">Qualidade Profissional</p>
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                placeholder="Buscar ferramentas, marcas..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="w-full px-4 py-2.5 pl-10 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Search className="absolute left-3 top-3 h-5 w-5 text-metallic-400" />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Dropdown de resultados */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-metallic-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => goToProduct(product.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-metallic-50 transition-colors text-left"
                    >
                      {(product.imageUrl || product.images?.[0]?.url) && (
                        <img
                          src={product.imageUrl || product.images?.[0]?.url}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-metallic-900 truncate">{product.name}</p>
                        <p className="text-sm text-primary-600 font-semibold">
                          R$ {(product.promotionalPrice ?? product.price).toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit(new Event('submit') as any)}
                    className="w-full px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 font-medium border-t border-metallic-100"
                  >
                    Ver todos os resultados para &ldquo;{searchQuery}&rdquo;
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <NotificationBell />

                <Link href="/minha-conta">
                  <Button variant="ghost" size="sm">
                    <User className="h-5 w-5 mr-2" />
                    <span className="hidden lg:inline">{session.user?.name?.split(" ")[0]}</span>
                  </Button>
                </Link>

                {role !== "CUSTOMER" && role && (
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

            <Link href="/carrinho">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{cartCount}</span>}
              </Button>
            </Link>

            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
            {/* Mobile Search Bar */}
            <div className="md:hidden mb-4" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Buscar ferramentas, marcas..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  className="w-full px-4 py-2.5 pl-10 border border-metallic-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Search className="absolute left-3 top-3 h-5 w-5 text-metallic-400" />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-metallic-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => { goToProduct(product.id); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-metallic-50 transition-colors text-left"
                      >
                        {(product.imageUrl || product.images?.[0]?.url) && (
                          <img
                            src={product.imageUrl || product.images?.[0]?.url}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-metallic-900 truncate">{product.name}</p>
                          <p className="text-sm text-primary-600 font-semibold">
                            R$ {(product.promotionalPrice ?? product.price).toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { handleSearchSubmit(new Event('submit') as any); setIsMenuOpen(false); }}
                      className="w-full px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 font-medium border-t border-metallic-100"
                    >
                      Ver todos os resultados para &ldquo;{searchQuery}&rdquo;
                    </button>
                  </div>
                )}
              </form>
            </div>

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
