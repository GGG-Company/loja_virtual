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

    const body = await request.json();
    const { paymentMethod } = body;

    // Verificar se o pedido existe e pertence ao usuário
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        total: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verificar se o pedido está pendente e dentro do prazo de 15 minutos
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (order.status === 'PENDING' && order.createdAt < fifteenMinutesAgo) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json(
        { error: 'Tempo de pagamento expirado. O pedido foi cancelado.' },
        { status: 400 }
      );
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Este pedido não está pendente de pagamento' },
        { status: 400 }
      );
    }

    // Simulação local de pagamento
    const now = new Date();
    const paymentPayload: any = { method: paymentMethod };

    if (paymentMethod === 'PIX') {
      paymentPayload.qrcode = '00020126360014BR.GOV.BCB.PIX0114+5511999999995204000053039865405150.005802BR5909LOJA TEST6009Sao Paulo62070503***6304ABCD';
      paymentPayload.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }

    if (paymentMethod === 'BOLETO') {
      paymentPayload.linhaDigitavel = '23790.50403 60004.302046 01000.123456 1 94580000100000';
      paymentPayload.pdfUrl = 'https://example.com/boleto.pdf'; // mock
    }

    // Atualizar o pedido com o método de pagamento e marcar como pago/confirmado
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        paymentMethod: paymentMethod,
        status: 'CONFIRMED',
        paidAt: now,
      },
    });

    await sendOrderStatusUpdate({
      orderId: (updatedOrder as any).id,
      status: 'CONFIRMED',
      total: (updatedOrder as any).total,
      paymentMethod: (updatedOrder as any).paymentMethod,
      paidAt: (updatedOrder as any).paidAt,
    });

    return NextResponse.json({ 
      success: true,
      order: updatedOrder,
      payment: paymentPayload,
    });
  } catch (error) {
    console.error('[PROCESS_PAYMENT]', error);
    return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
  }
}
