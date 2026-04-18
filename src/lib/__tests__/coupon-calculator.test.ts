import { describe, it, expect } from 'vitest';
import { calculateDiscount } from '../coupon-calculator';
import type { CouponInput } from '../coupon-calculator';

// ── helpers ───────────────────────────────────────────────────────────────
const pct = (value: number, maxDiscount: number | null = null): CouponInput => ({
  discountType: 'PERCENTAGE',
  value,
  maxDiscount,
});

const fixed = (value: number, maxDiscount: number | null = null): CouponInput => ({
  discountType: 'FIXED',
  value,
  maxDiscount,
});

// ── PERCENTAGE ────────────────────────────────────────────────────────────
describe('PERCENTAGE discount', () => {
  it('calculates 10% off R$100', () => {
    const r = calculateDiscount(pct(10), 100);
    expect(r.discount).toBe(10);
    expect(r.finalTotal).toBe(90);
  });

  it('calculates 15% off R$200', () => {
    const r = calculateDiscount(pct(15), 200);
    expect(r.discount).toBe(30);
    expect(r.finalTotal).toBe(170);
  });

  it('rounds to 2 decimal places', () => {
    // 33% de R$100 = R$33.00
    const r = calculateDiscount(pct(33), 100);
    expect(r.discount).toBe(33);
    // 10% de R$33.33 = R$3.333… arredondado para R$3.33
    const r2 = calculateDiscount(pct(10), 33.33);
    expect(r2.discount).toBe(3.33);
  });

  it('100% coupon zeroes the cart', () => {
    const r = calculateDiscount(pct(100), 250);
    expect(r.discount).toBe(250);
    expect(r.finalTotal).toBe(0);
  });

  it('applies maxDiscount cap when percentage exceeds it', () => {
    // 50% de R$200 = R$100, mas teto é R$30
    const r = calculateDiscount(pct(50, 30), 200);
    expect(r.discount).toBe(30);
    expect(r.finalTotal).toBe(170);
  });

  it('does not cap when percentage is below maxDiscount', () => {
    // 5% de R$100 = R$5, teto R$30 — não aplica teto
    const r = calculateDiscount(pct(5, 30), 100);
    expect(r.discount).toBe(5);
  });

  it('precision: 0.1% of R$1.00 = R$0.00 (rounds down)', () => {
    const r = calculateDiscount(pct(0.1), 1);
    expect(r.discount).toBe(0); // 0.001 → 0.00
  });
});

// ── FIXED ─────────────────────────────────────────────────────────────────
describe('FIXED discount', () => {
  it('applies fixed R$20 off R$100', () => {
    const r = calculateDiscount(fixed(20), 100);
    expect(r.discount).toBe(20);
    expect(r.finalTotal).toBe(80);
  });

  it('caps discount at cart total when fixed exceeds it', () => {
    // R$50 de desconto num carrinho de R$30
    const r = calculateDiscount(fixed(50), 30);
    expect(r.discount).toBe(30);
    expect(r.finalTotal).toBe(0);
  });

  it('discount equal to cart total results in R$0', () => {
    const r = calculateDiscount(fixed(99.99), 99.99);
    expect(r.discount).toBe(99.99);
    expect(r.finalTotal).toBe(0);
  });

  it('applies maxDiscount cap when fixed exceeds it', () => {
    // Cupom fixo de R$50, teto R$25
    const r = calculateDiscount(fixed(50, 25), 200);
    expect(r.discount).toBe(25);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────
describe('edge cases', () => {
  it('zero value coupon produces zero discount', () => {
    expect(calculateDiscount(pct(0), 100).discount).toBe(0);
    expect(calculateDiscount(fixed(0), 100).discount).toBe(0);
  });

  it('finalTotal is never negative', () => {
    const r = calculateDiscount(fixed(9999), 1);
    expect(r.finalTotal).toBeGreaterThanOrEqual(0);
  });

  it('both discount and finalTotal are finite numbers', () => {
    const r = calculateDiscount(pct(100), 0);
    expect(Number.isFinite(r.discount)).toBe(true);
    expect(Number.isFinite(r.finalTotal)).toBe(true);
  });

  it('maxDiscount of 0 results in zero discount', () => {
    const r = calculateDiscount(pct(50, 0), 100);
    expect(r.discount).toBe(0);
    expect(r.finalTotal).toBe(100);
  });
});
