import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';

const MercadoPago = require('mercadopago');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, amount, userEmail, userName, userCpf } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'orderId e amount são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar dados do pedido para pegar endereço
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        shippingAddress: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    // Extrair endereço do JSON
    const address = order.shippingAddress as any;

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
    
    // Data de vencimento: 3 dias úteis
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    
    const paymentData = {
      transaction_amount: Number(amount),
      description: `Pedido #${orderId}`,
      payment_method_id: 'bolbradesco',
      payer: {
        email: userEmail || 'test@test.com',
        first_name: userName?.split(' ')[0] || 'Cliente',
        last_name: userName?.split(' ').slice(1).join(' ') || 'Teste',
        identification: {
          type: 'CPF',
          number: userCpf?.replace(/\D/g, '') || '12345678909',
        },
        address: {
          zip_code: address?.zipCode?.replace(/\D/g, '') || '01310100',
          street_name: address?.street || 'Rua Exemplo',
          street_number: address?.number || '123',
          neighborhood: address?.neighborhood || 'Centro',
          city: address?.city || 'São Paulo',
          federal_unit: address?.state || 'SP',
        },
      },
      date_of_expiration: dueDate.toISOString(),
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
      boletoUrl: response.transaction_details?.external_resource_url,
      barcode: response.barcode?.content,
      dueDate: response.date_of_expiration,
    });
  } catch (error: any) {
    console.error('Erro ao gerar Boleto:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar Boleto' },
      { status: 500 }
    );
  }
}
