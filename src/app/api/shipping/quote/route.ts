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

    const options = await getShippingOptions({ items, destinationZip });

    return NextResponse.json({ success: true, options });
  } catch (error) {
    console.error('[SHIPPING_QUOTE]', error);
    return NextResponse.json({ error: 'Erro ao calcular frete' }, { status: 500 });
  }
}
