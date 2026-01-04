import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

const MercadoPago = require('mercadopago');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('Webhook Mercado Pago recebido:', body);

    // Verificar se é uma notificação de pagamento
    if (body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID não encontrado' }, { status: 400 });
    }

    // Buscar credenciais
    const { accessToken } = getMercadoPagoKeys();
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Configurar SDK
    const client = new MercadoPago.MercadoPagoConfig({ 
      accessToken: accessToken 
    });

    // Buscar detalhes do pagamento
    const payment = new MercadoPago.Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    // Atualizar pedido baseado no status do pagamento
    const orderId = paymentInfo.external_reference;
    
    if (orderId) {
      let orderStatus: OrderStatus = OrderStatus.PENDING;
      
      switch (paymentInfo.status) {
        case 'approved':
          orderStatus = OrderStatus.CONFIRMED;
          break;
        case 'rejected':
          orderStatus = OrderStatus.CANCELLED;
          break;
        case 'cancelled':
          orderStatus = OrderStatus.CANCELLED;
          break;
        case 'refunded':
          orderStatus = OrderStatus.REFUNDED;
          break;
        default:
          orderStatus = OrderStatus.PENDING;
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: orderStatus,
          paymentStatus: paymentInfo.status,
        },
      });

      console.log(`Pedido ${orderId} atualizado para ${orderStatus}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}
