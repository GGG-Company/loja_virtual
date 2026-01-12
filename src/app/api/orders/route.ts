import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { notifyOrderStatusChange } from '@/lib/notifications';

function formatOrderNumber(seq: number) {
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(seq).padStart(6, '0')}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    console.log('[ORDER_CREATE_SESSION]', {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { items, dados, entrega, paymentMethod, shipping: shippingData } = body as {
      items: Array<{ id: string; price: number; quantity: number; name: string; imageUrl?: string }>;
      dados: { nome: string; email: string; telefone: string; cpf: string };
      entrega: { cep: string; endereco: string; numero: string; complemento?: string; bairro: string; cidade: string; estado: string };
      paymentMethod: string;
      shipping?: { serviceId: string; serviceName: string; price: number; deliveryTime: number } | null;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 });
    }

    console.log('[ORDER_CREATE_ITEMS]', items);
    console.log('[ORDER_CREATE_SHIPPING]', shippingData);

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = shippingData?.price || 0;
    const discount = 0;
    const total = subtotal + shippingCost - discount;

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

    // Verificar se o usuário existe
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    });
    
    if (!userExists) {
      console.error('[ORDER_CREATE] Usuário não encontrado:', session.user.id);
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 400 });
    }

    // Verificar se todos os produtos existem
    const productIds = items.map(item => item.id);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true }
    });
    
    const existingProductIds = new Set(existingProducts.map(p => p.id));
    const missingProducts = productIds.filter(id => !existingProductIds.has(id));
    
    if (missingProducts.length > 0) {
      console.error('[ORDER_CREATE] Produtos não encontrados:', missingProducts);
      return NextResponse.json({ 
        error: 'Alguns produtos não foram encontrados', 
        missingProducts 
      }, { status: 400 });
    }

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
          shipping: shippingCost,
          total,
          paymentMethod: paymentMethod === 'boleto' ? 'BOLETO' : paymentMethod === 'cartao' ? 'CREDIT_CARD' : 'PIX',
          installments: 1,
          shippingAddress,
          // Dados do Melhor Envio para geração de etiqueta
          shippingServiceId: shippingData?.serviceId || null,
          melhorEnvioService: shippingData?.serviceName || null,
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
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, imageUrl: true }
              }
            }
          },
          user: true,
        },
      });

      return order;
    });

    // Enviar webhook para n8n quando pedido é criado (PENDING)
    await sendOrderStatusUpdate({
      orderId: result.id,
      orderNumber: result.orderNumber,
      status: 'PENDING',
      total: result.total,
      user: result.user,
      paymentMethod: result.paymentMethod,
      shippingAddress: result.shippingAddress,
      items: result.items,
    });

    // Criar notificação para o usuário
    await notifyOrderStatusChange({
      userId: result.userId,
      orderId: result.id,
      orderNumber: result.orderNumber,
      status: 'PENDING',
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[ORDER_CREATE]', error);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}
