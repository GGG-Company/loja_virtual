import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { toNum, serializeItems } from '@/lib/decimal-helpers';

export async function POST(req: NextRequest) {
  try {
    // Bloquear em produção
    if (process.env.NODE_ENV === 'production' && process.env.MERCADO_PAGO_SANDBOX !== 'true') {
      return NextResponse.json({ error: 'Endpoint desabilitado em produção' }, { status: 403 });
    }

    // Requer autenticação de admin
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

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
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CONFIRMED,
        paymentStatus: 'approved',
        paidAt: new Date(),
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

    await sendOrderStatusUpdate({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: 'CONFIRMED',
      total: toNum(updated.total),
      user: updated.user,
      paidAt: updated.paidAt,
      items: serializeItems(updated.items),
    });

    return NextResponse.json({
      success: true,
      message: 'Pagamento PIX aprovado (simulação)',
      orderId: order.id,
    });
  } catch (error: any) {
    logger.error(error, 'Erro ao simular pagamento:');
    return NextResponse.json(
      { error: error.message || 'Erro ao simular pagamento' },
      { status: 500 }
    );
  }
}
