import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';

const MercadoPago = require('mercadopago');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, amount, userEmail, userName } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'orderId e amount são obrigatórios' },
        { status: 400 }
      );
    }

    const { accessToken } = getMercadoPagoKeys();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Mercado Pago não configurado' },
        { status: 500 }
      );
    }

    const client = new MercadoPago.MercadoPagoConfig({ 
      accessToken: accessToken 
    });

    const payment = new MercadoPago.Payment(client);
    
    const paymentData = {
      transaction_amount: Number(amount),
      description: `Pedido #${orderId}`,
      payment_method_id: 'pix',
      payer: {
        email: userEmail || 'test@test.com',
        first_name: userName?.split(' ')[0] || 'Cliente',
        last_name: userName?.split(' ').slice(1).join(' ') || 'Teste',
      },
      external_reference: orderId,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mercadopago/webhook`,
    };

    const response = await payment.create({ body: paymentData });

    // Atualizar pedido
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentId: String(response.id),
        paymentStatus: response.status,
      },
    });

    return NextResponse.json({
      paymentId: response.id,
      status: response.status,
      qrCode: response.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64,
      ticketUrl: response.point_of_interaction?.transaction_data?.ticket_url,
    });
  } catch (error: any) {
    console.error('Erro ao gerar PIX:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar PIX' },
      { status: 500 }
    );
  }
}
