'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function useWishlist() {
  const { data: session } = useSession();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/user/wishlist')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        setIds(new Set((data.items ?? []).map((i: { product: { id: string } }) => i.product.id)));
      })
      .catch(() => {});
  }, [session?.user]);

  const toggle = useCallback(async (productId: string, productName?: string) => {
    if (!session?.user) {
      toast.error('Faça login para salvar favoritos');
      return;
    }
    const inWishlist = ids.has(productId);
    // Optimistic update
    setIds(prev => {
      const next = new Set(prev);
      inWishlist ? next.delete(productId) : next.add(productId);
      return next;
    });
    setLoading(true);
    try {
      if (inWishlist) {
        await fetch(`/api/user/wishlist/${productId}`, { method: 'DELETE' });
        toast.success('Removido dos favoritos');
      } else {
        await fetch('/api/user/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        toast.success(productName ? `"${productName}" salvo nos favoritos` : 'Salvo nos favoritos');
      }
    } catch {
      // Revert on error
      setIds(prev => {
        const next = new Set(prev);
        inWishlist ? next.add(productId) : next.delete(productId);
        return next;
      });
      toast.error('Erro ao atualizar favoritos');
    } finally {
      setLoading(false);
    }
  }, [ids, session?.user]);

  return { ids, toggle, loading };
}
