import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendOrderStatusUpdate } from '@/lib/webhooks';

const customerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  stateRegistration: z.string().optional(),
});

const bodySchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().int().min(1),
  })).min(1),
  shippingOption: z.object({
    id: z.string(),
    service: z.string(),
    carrier: z.string(),
    price: z.number(),
    etaDays: z.number().optional(),
    pickup: z.boolean().optional(),
  }).optional(),
  destinationZip: z.string().optional(),
  validityDays: z.number().int().min(1).max(30).default(7),
  notes: z.string().optional(),
  customer: customerSchema,
});

function formatOrderNumber(seq: number) {
  const year = new Date().getFullYear();
  return `QTE-${year}-${String(seq).padStart(6, '0')}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const { items, shippingOption, validityDays, notes, customer, destinationZip } = parsed.data;
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = shippingOption?.price || 0;
    const total = subtotal + shipping;

    const order = await prisma.$transaction(async (tx) => {
      const seq = await tx.order.count();
      const orderNumber = formatOrderNumber(seq + 1);
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          status: 'QUOTE',
          subtotal,
          discount: 0,
          shipping,
          total,
          paymentMethod: 'PIX',
          installments: 1,
          shippingAddress: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            taxId: customer.taxId,
            stateRegistration: customer.stateRegistration,
            zip: destinationZip,
            deliveryMethod: shippingOption?.service || 'Retirada / A combinar',
          },
          notes,
          adminNotes: `Orçamento válido por ${validityDays} dias`,
          items: {
            create: items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.price * item.quantity,
            })),
          },
        },
        include: { items: true },
      });
      return created;
    });

    await sendOrderStatusUpdate({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'QUOTE',
      total,
      user: { id: session.user.id, name: customer.name, email: customer.email, phone: customer.phone ?? null },
      shippingAddress: order.shippingAddress,
      extra: { validityDays },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('[ORDER_QUOTE]', error);
    return NextResponse.json({ error: 'Erro ao gerar orçamento' }, { status: 500 });
  }
}
