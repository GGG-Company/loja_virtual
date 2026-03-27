import logger from "@/lib/logger";
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getShippingOptions } from '@/lib/shipping-calculator';

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

    const rawOptions = await getShippingOptions({ items: formattedItems, destinationZip });
    
    // Se só tem retirada em loja e não é intencional, avisar o frontend
    const hasShippingOptions = rawOptions.some(opt => !opt.pickup);
    
    // Mapear para o formato esperado pelo frontend (carrinho e checkout)
    const options = rawOptions.map((opt) => ({
      id: opt.id,
      name: opt.service || opt.carrier || 'Frete',
      service: opt.service || opt.carrier || 'Frete',
      carrier: opt.carrier || 'Correios',
      price: opt.price,
      delivery_time: opt.etaDays || 0,
      etaDays: opt.etaDays || 0,
      company: opt.carrier ? { name: opt.carrier } : undefined,
      pickup: opt.pickup || false,
      notes: opt.notes || undefined,
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
