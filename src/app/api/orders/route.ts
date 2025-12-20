import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function formatOrderNumber(seq: number) {
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(seq).padStart(6, '0')}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { items, dados, entrega, paymentMethod } = body as {
      items: Array<{ id: string; price: number; quantity: number; name: string; imageUrl?: string }>;
      dados: { nome: string; email: string; telefone: string; cpf: string };
      entrega: { cep: string; endereco: string; numero: string; complemento?: string; bairro: string; cidade: string; estado: string };
      paymentMethod: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 });
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 0;
    const discount = 0;
    const total = subtotal + shipping - discount;

    const shippingAddress = {
      name: dados?.nome,
      email: dados?.email,
      phone: dados?.telefone,
      cpf: dados?.cpf,
      zip: entrega?.cep,
      street: entrega?.endereco,
      number: entrega?.numero,
      complement: entrega?.complemento,
      neighborhood: entrega?.bairro,
      city: entrega?.cidade,
      state: entrega?.estado,
    };

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.order.count();
      const orderNumber = formatOrderNumber(count + 1);

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          status: 'PENDING',
          subtotal,
          discount,
          shipping,
          total,
          paymentMethod: paymentMethod === 'boleto' ? 'BOLETO' : paymentMethod === 'cartao' ? 'CREDIT_CARD' : 'PIX',
          installments: 1,
          shippingAddress,
          items: {
            create: items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
              discount: 0,
              subtotal: item.price * item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return order;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[ORDER_CREATE]', error);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}
