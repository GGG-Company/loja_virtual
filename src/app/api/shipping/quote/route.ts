import logger from "@/lib/logger";
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getShippingOptions } from '@/lib/shipping-calculator';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  destinationZip: z.string().min(8),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    weightKg: z.number().optional(),
    dimensions: z.object({
      height: z.number().optional(),
      width: z.number().optional(),
      length: z.number().optional(),
    }).optional(),
    price: z.number().optional(),
  })),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const { destinationZip, items } = parsed.data;
    if (!items.length) {
      return NextResponse.json({ error: 'Nenhum item informado' }, { status: 400 });
    }

    // Cast seguro para ShippingItem tratando campos opcionais das dimensões
    const formattedItems = items.map(item => ({
      ...item,
      dimensions: item.dimensions ? {
        height: item.dimensions.height || 0,
        width: item.dimensions.width || 0,
        length: item.dimensions.length || 0,
      } : undefined
    }));

    // Verificar se subtotal qualifica para frete grátis
    const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    let freeShippingThreshold = 0;
    try {
      const financialConfig = await prisma.financialConfig.findUnique({ where: { id: 'singleton' } });
      freeShippingThreshold = financialConfig ? Number(financialConfig.freeShippingMinValue) || 0 : 0;
    } catch { /* usa 0 — sem frete grátis automático */ }

    const isFreeShipping = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;

    const rawOptions = await getShippingOptions({ items: formattedItems, destinationZip });

    // Se só tem retirada em loja e não é intencional, avisar o frontend
    const hasShippingOptions = rawOptions.some(opt => !opt.pickup);

    // Mapear para o formato esperado pelo frontend (carrinho e checkout)
    const options = rawOptions.map((opt) => ({
      id: opt.id,
      name: opt.service || opt.carrier || 'Frete',
      service: opt.service || opt.carrier || 'Frete',
      carrier: opt.carrier || 'Correios',
      price: isFreeShipping && !opt.pickup ? 0 : opt.price,
      delivery_time: opt.etaDays || 0,
      etaDays: opt.etaDays || 0,
      company: opt.carrier ? { name: opt.carrier } : undefined,
      pickup: opt.pickup || false,
      notes: isFreeShipping && !opt.pickup ? 'Frete grátis aplicado' : (opt.notes || undefined),
    }));

    return NextResponse.json({ 
      success: true, 
      options,
      warning: !hasShippingOptions ? 'Não foi possível obter cotações de frete para este CEP. Tente novamente.' : undefined,
    });
  } catch (error) {
    logger.error(error, '[SHIPPING_QUOTE]');
    return NextResponse.json({ error: 'Erro ao calcular frete' }, { status: 500 });
  }
}
