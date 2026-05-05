'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { trackAddToCart } from '@/lib/analytics';

const CART_KEY = 'cart';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  selectedVoltage?: string;
  sku?: string | null;
  ean?: string | null;
  weightKg?: number | null;
  dimensions?: Record<string, unknown> | null;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: any[] = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return parsed.map((i) => ({ ...i, price: Number(i.price) }));
  } catch {
    return [];
  }
}

function writeToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // storage unavailable — fail silently
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    setItems(readFromStorage());
    setHydrated(true);
  }, []);

  // Persist to localStorage only after initial hydration to avoid overwriting with empty array
  useEffect(() => {
    if (!hydrated) return;
    writeToStorage(items);
    // Sync to DB (fire-and-forget) para detecção de carrinho abandonado
    fetch('/api/cart/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(i => ({ id: i.id, quantity: i.quantity })) }),
    }).catch(() => {});
  }, [items, hydrated]);

  const addItem = useCallback((incoming: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const qty = incoming.quantity ?? 1;
    const item = { ...incoming, price: Number(incoming.price) };
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
    trackAddToCart({ id: item.id, name: item.name, price: item.price, quantity: qty });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, count, total, addItem, removeItem, updateQuantity, clearCart }),
    [items, count, total, addItem, removeItem, updateQuantity, clearCart]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
