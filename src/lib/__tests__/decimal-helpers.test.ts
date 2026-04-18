import { describe, it, expect } from 'vitest';
import { toNum, serializeItems } from '../decimal-helpers';

// Minimal Prisma.Decimal mock — apenas toNumber() é usado por toNum()
const decimal = (val: string | number) => ({
  toNumber: () => Number(val),
});

describe('toNum', () => {
  it('returns 0 for null', () => {
    expect(toNum(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(toNum(undefined)).toBe(0);
  });

  it('passes through a number unchanged', () => {
    expect(toNum(42.5)).toBe(42.5);
    expect(toNum(0)).toBe(0);
    expect(toNum(-1)).toBe(-1);
  });

  it('converts Decimal to number via toNumber()', () => {
    expect(toNum(decimal('99.99') as any)).toBe(99.99);
    expect(toNum(decimal('0.01') as any)).toBe(0.01);
    expect(toNum(decimal('1234567.89') as any)).toBe(1234567.89);
  });

  it('handles Decimal zero', () => {
    expect(toNum(decimal('0') as any)).toBe(0);
  });

  it('handles large monetary values without precision loss', () => {
    // R$ 100.000,00 — sem perda de precisão em ponto flutuante
    const result = toNum(decimal('100000.00') as any);
    expect(result).toBe(100000);
  });
});

describe('serializeItems', () => {
  const makeItem = (price: string, discount: string, subtotal: string) => ({
    id: 'item-1',
    productId: 'prod-1',
    quantity: 2,
    price: decimal(price) as any,
    discount: decimal(discount) as any,
    subtotal: decimal(subtotal) as any,
  });

  it('converts all Decimal fields to number primitives', () => {
    const items = [makeItem('29.90', '5.00', '24.90')];
    const [result] = serializeItems(items);

    expect(result.price).toBe(29.9);
    expect(result.discount).toBe(5);
    expect(result.subtotal).toBe(24.9);
  });

  it('preserves non-Decimal fields untouched', () => {
    const items = [makeItem('10.00', '0.00', '10.00')];
    const [result] = serializeItems(items);

    expect(result.id).toBe('item-1');
    expect(result.quantity).toBe(2);
    expect(result.productId).toBe('prod-1');
  });

  it('handles an empty array', () => {
    expect(serializeItems([])).toEqual([]);
  });

  it('handles multiple items', () => {
    const items = [
      makeItem('10.00', '0.00', '10.00'),
      makeItem('50.00', '10.00', '40.00'),
    ];
    const result = serializeItems(items);

    expect(result).toHaveLength(2);
    expect(result[1].price).toBe(50);
    expect(result[1].discount).toBe(10);
    expect(result[1].subtotal).toBe(40);
  });

  it('handles items where price is already a number', () => {
    const item = { id: '1', price: 19.9, discount: 0, subtotal: 19.9, quantity: 1 };
    const [result] = serializeItems([item]);
    expect(result.price).toBe(19.9);
  });
});
