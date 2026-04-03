/**
 * Converts any Prisma Decimal / string / number to a plain JS number.
 * Use at the API data boundary to prevent `.toFixed is not a function` errors.
 */
export const toNum = (v: unknown): number => parseFloat(String(v ?? 0)) || 0;

export const normalizeOrderItems = (items: any[] = []) =>
  items.map((item: any) => ({
    ...item,
    price: toNum(item.price),
    subtotal: toNum(item.subtotal),
  }));
