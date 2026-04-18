/**
 * Lógica pura de cálculo de desconto por cupom.
 * Extraída do handler HTTP para permitir testes unitários independentes.
 *
 * Regras de negócio:
 * 1. PERCENTAGE: discount = cartTotal × (value / 100)
 * 2. FIXED: discount = value
 * 3. Se maxDiscount definido: discount = min(discount, maxDiscount)
 * 4. O desconto nunca excede o total do carrinho
 * 5. O resultado é arredondado para 2 casas decimais
 */

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface CouponInput {
  discountType: DiscountType;
  /** Valor do cupom — percentual (0–100) ou fixo em BRL */
  value: number;
  /** Teto máximo do desconto em BRL (null = sem teto) */
  maxDiscount: number | null;
}

export interface DiscountResult {
  discount: number;
  /** Valor final do carrinho após desconto */
  finalTotal: number;
}

export function calculateDiscount(
  coupon: CouponInput,
  cartTotal: number,
): DiscountResult {
  let discount: number;

  if (coupon.discountType === 'PERCENTAGE') {
    discount = (cartTotal * coupon.value) / 100;
  } else {
    discount = coupon.value;
  }

  // Aplicar teto de desconto
  if (coupon.maxDiscount !== null && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }

  // Desconto nunca supera o total do carrinho
  if (discount > cartTotal) {
    discount = cartTotal;
  }

  discount = parseFloat(discount.toFixed(2));

  return {
    discount,
    finalTotal: parseFloat((cartTotal - discount).toFixed(2)),
  };
}
