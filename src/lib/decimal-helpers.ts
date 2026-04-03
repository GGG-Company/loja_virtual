import type { Prisma } from '@prisma/client';

/** Converte Prisma.Decimal, number ou null/undefined para number primitivo */
export function toNum(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return v.toNumber();
}

/**
 * Serializa os campos Decimal de um OrderItem para number primitivo.
 * Útil ao passar items para sendOrderStatusUpdate / notifyPaymentStatus.
 */
export function serializeItems<
  T extends {
    id?: string;
    productId?: string;
    quantity?: number;
    price?: Prisma.Decimal | number;
    discount?: Prisma.Decimal | number;
    subtotal?: Prisma.Decimal | number;
    product?: any;
  },
>(items: T[]): Array<Omit<T, 'price' | 'discount' | 'subtotal'> & { price: number; discount: number; subtotal: number }> {
  return items.map((item) => ({
    ...item,
    price:    toNum(item.price),
    discount: toNum(item.discount),
    subtotal: toNum(item.subtotal),
  }));
}
