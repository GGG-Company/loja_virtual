import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se o pedido existe e pertence ao usuário
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verificar se o pedido está no status DELIVERED
    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'Apenas pedidos entregues podem ser confirmados' },
        { status: 400 }
      );
    }

    // Atualizar o pedido com a data de confirmação de entrega
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        deliveredAt: new Date(),
      },
    });

    await sendOrderStatusUpdate({
      orderId: (updatedOrder as any).id,
      status: 'DELIVERED',
      deliveredAt: (updatedOrder as any).deliveredAt,
    });

    await sendOrderStatusUpdate({
      orderId: (updatedOrder as any).id,
      status: 'DELIVERED',
      deliveredAt: (updatedOrder as any).deliveredAt,
    });

    return NextResponse.json({ 
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('[CONFIRM_DELIVERY]', error);
    return NextResponse.json({ error: 'Erro ao confirmar recebimento' }, { status: 500 });
  }
}
