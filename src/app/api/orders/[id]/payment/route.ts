import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { createShippingLabelForOrder } from '@/lib/melhorenvio-shipping';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[PAYMENT] Iniciando processamento de pagamento');
    const session = await auth();


    if (!session?.user?.email) {
      console.warn('[PAYMENT] Usuário não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });


    if (!user) {
      console.warn('[PAYMENT] Usuário não encontrado:', session.user.email);
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }


    const body = await request.json();
    const { paymentMethod } = body;
    console.log('[PAYMENT] Método de pagamento recebido:', paymentMethod);

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
      console.warn('[PAYMENT] Pedido não encontrado:', params.id);
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verificar se o pedido está pendente e dentro do prazo de 2 minutos
    const twoMinutesAgo = new Date(Date.now() - 120 * 1000);

    if (order.status === 'PENDING' && order.createdAt < twoMinutesAgo) {
      console.warn('[PAYMENT] Pedido expirado, cancelando:', order.id);
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
      console.warn('[PAYMENT] Pedido não está pendente:', order.id, 'Status:', order.status);
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
      paymentPayload.expiresAt = new Date(Date.now() + 120 * 1000).toISOString();
    }

    if (paymentMethod === 'BOLETO') {
      paymentPayload.linhaDigitavel = '23790.50403 60004.302046 01000.123456 1 94580000100000';
      paymentPayload.pdfUrl = 'https://example.com/boleto.pdf'; // mock
    }

    // Atualizar o pedido com o método de pagamento e marcar como pago/confirmado
    console.log('[PAYMENT] Atualizando pedido para CONFIRMED:', params.id);
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        paymentMethod: paymentMethod,
        status: 'CONFIRMED',
        paidAt: now,
      },
      include: {
        user: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, imageUrl: true }
            }
          }
        }
      },
    });


    console.log('[PAYMENT] Pedido atualizado e confirmado:', updatedOrder.id);
    await sendOrderStatusUpdate({
      orderId: (updatedOrder as any).id,
      status: 'CONFIRMED',
      total: (updatedOrder as any).total,
      paymentMethod: (updatedOrder as any).paymentMethod,
      paidAt: (updatedOrder as any).paidAt,
      user: (updatedOrder as any).user,
      items: (updatedOrder as any).items,
    });
    console.log('[PAYMENT] Webhook de status enviado para pedido:', updatedOrder.id);

    // Gerar etiqueta do Melhor Envio automaticamente após pagamento confirmado
    console.log('[PAYMENT] Iniciando geração de etiqueta do Melhor Envio...');
    let shippingLabel = null;
    try {
      const labelResult = await createShippingLabelForOrder(updatedOrder.id);
      console.log('[PAYMENT] Resultado da geração de etiqueta:', JSON.stringify(labelResult, null, 2));
      
      if (labelResult.success) {
        shippingLabel = {
          melhorEnvioOrderId: labelResult.orderId,
          trackingCode: labelResult.trackingCode,
          labelUrl: labelResult.labelUrl,
          status: labelResult.status,
        };
        console.log('[PAYMENT] Etiqueta gerada com sucesso!', shippingLabel);
      } else {
        console.warn('[PAYMENT] Falha ao gerar etiqueta:', labelResult.error);
      }
    } catch (labelError) {
      console.error('[PAYMENT] Erro ao gerar etiqueta do Melhor Envio:', labelError);
      // Não bloquear o pagamento se a etiqueta falhar
    }

    console.log('[PAYMENT] Finalizando processamento de pagamento:', updatedOrder.id);
    return NextResponse.json({ 
      success: true,
      order: updatedOrder,
      payment: paymentPayload,
      shippingLabel,
    });
  } catch (error) {
    console.error('[PROCESS_PAYMENT]', error);
    return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
  }
}
