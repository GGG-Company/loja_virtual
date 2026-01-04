import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId obrigatório' }, { status: 400 });
    }

    // Buscar pedido pelo paymentId
    const order = await prisma.order.findFirst({
      where: { paymentId: String(paymentId) },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Simular aprovação do pagamento
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CONFIRMED,
        paymentStatus: 'approved',
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pagamento PIX aprovado (simulação)',
      orderId: order.id,
    });
  } catch (error: any) {
    console.error('Erro ao simular pagamento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao simular pagamento' },
      { status: 500 }
    );
  }
}
