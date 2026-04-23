'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/contexts/cart-context';

type WishlistProduct = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: number;
  promotionalPrice: number | null;
  stock: number;
  isActive: boolean;
};

type WishlistItem = { product: WishlistProduct };

export default function FavoritosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addItem } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (status !== 'authenticated') return;
    fetch('/api/user/wishlist')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setItems(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, router]);

  const remove = async (productId: string) => {
    await fetch(`/api/user/wishlist/${productId}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.product.id !== productId));
    toast.success('Removido dos favoritos');
  };

  const addToCart = (p: WishlistProduct) => {
    addItem({
      id: p.id,
      name: p.name,
      price: Number(p.promotionalPrice ?? p.price),
      imageUrl: p.imageUrl || '/placeholder.jpg',
      quantity: 1,
      sku: null,
      ean: null,
    });
    toast.success('Adicionado ao carrinho!');
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="h-6 w-6 text-red-500 fill-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Meus Favoritos</h1>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-64" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">Nenhum favorito ainda</h2>
              <p className="text-gray-400 mb-6">Salve produtos que você gostou para encontrá-los facilmente depois.</p>
              <Button asChild>
                <Link href="/produtos">Explorar produtos</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(({ product: p }) => (
                <div key={p.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden group">
                  <Link href={`/produtos/${p.id}`} className="block relative aspect-square bg-gray-50">
                    <Image
                      src={p.imageUrl || '/placeholder.jpg'}
                      alt={p.name}
                      fill
                      className="object-contain p-2 group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                    {!p.isActive || p.stock === 0 ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded">
                          {p.stock === 0 ? 'Sem estoque' : 'Indisponível'}
                        </span>
                      </div>
                    ) : null}
                  </Link>
                  <div className="p-3 space-y-2">
                    <Link href={`/produtos/${p.id}`}>
                      <p className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-primary-600">{p.name}</p>
                    </Link>
                    <div>
                      {p.promotionalPrice ? (
                        <>
                          <p className="text-xs text-gray-400 line-through">R$ {Number(p.price).toFixed(2)}</p>
                          <p className="text-base font-bold text-primary-600">R$ {Number(p.promotionalPrice).toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="text-base font-bold text-primary-600">R$ {Number(p.price).toFixed(2)}</p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => addToCart(p)}
                        disabled={!p.isActive || p.stock === 0}
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Comprar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:border-red-300"
                        onClick={() => remove(p.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
