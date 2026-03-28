import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ValidateSchema = z.object({
  code: z.string().min(1, 'Código do cupom é obrigatório'),
  cartTotal: z.number().positive('Total do carrinho deve ser positivo'),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ValidateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, reason: 'Dados inválidos', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { code, cartTotal, userId } = parsed.data;

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, reason: 'Cupom não encontrado' });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, reason: 'Cupom inativo' });
    }

    const now = new Date();

    if (coupon.startDate && now < coupon.startDate) {
      return NextResponse.json({ valid: false, reason: 'Cupom ainda não está vigente' });
    }

    if (coupon.endDate && now > coupon.endDate) {
      return NextResponse.json({ valid: false, reason: 'Cupom expirado' });
    }

    if (coupon.usageLimit !== null && coupon.currentUsage >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, reason: 'Cupom atingiu o limite de uso' });
    }

    if (coupon.minPurchase !== null && cartTotal < coupon.minPurchase) {
      return NextResponse.json({
        valid: false,
        reason: `Valor mínimo de compra para este cupom é R$ ${coupon.minPurchase.toFixed(2).replace('.', ',')}`,
      });
    }

    // Verificar limite por usuário se userId informado
    if (userId && coupon.usagePerUser !== null) {
      const userUsageCount = await prisma.order.count({
        where: {
          userId,
          couponId: coupon.id,
        },
      });

      if (userUsageCount >= coupon.usagePerUser) {
        return NextResponse.json({
          valid: false,
          reason: 'Você já utilizou este cupom o número máximo de vezes permitido',
        });
      }
    }

    // Calcular desconto
    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = (cartTotal * coupon.value) / 100;
    } else {
      // FIXED
      discount = coupon.value;
    }

    // Aplicar teto de desconto se definido
    if (coupon.maxDiscount !== null && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    // O desconto não pode ser maior que o total do carrinho
    if (discount > cartTotal) {
      discount = cartTotal;
    }

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.value,
      discount: parseFloat(discount.toFixed(2)),
      description: coupon.description ?? null,
    });
  } catch (error) {
    logger.error(error, '[COUPONS_VALIDATE_POST]');
    return NextResponse.json({ valid: false, reason: 'Erro ao validar cupom' }, { status: 500 });
  }
}
