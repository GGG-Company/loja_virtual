import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';

// SDK do Mercado Pago para backend
const MercadoPago = require('mercadopago');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { formData, orderId, amount } = body;

    console.log('[PAYMENT PROCESS] Dados recebidos:', { orderId, amount, formData });

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'orderId e amount são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar credenciais
    const { accessToken } = getMercadoPagoKeys();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Mercado Pago não configurado' },
        { status: 500 }
      );
    }

    // Configurar o SDK
    const client = new MercadoPago.MercadoPagoConfig({ 
      accessToken: accessToken 
    });

    // Criar pagamento
    const payment = new MercadoPago.Payment(client);
    
    // Extrair os dados reais do formData (pode estar aninhado)
    const paymentFormData = formData.formData || formData;
    
    const paymentData = {
      transaction_amount: Number(amount),
      token: paymentFormData.token,
      description: `Pedido #${orderId}`,
      installments: Number(paymentFormData.installments),
      payment_method_id: paymentFormData.payment_method_id,
      issuer_id: paymentFormData.issuer_id,
      payer: {
        email: paymentFormData.payer?.email || 'cliente@exemplo.com',
        identification: {
          type: paymentFormData.payer?.identification?.type || paymentFormData.identificationType || 'CPF',
          number: paymentFormData.payer?.identification?.number || paymentFormData.identificationNumber || '00000000000',
        },
      },
      external_reference: orderId,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mercadopago/webhook`,
    };

    const response = await payment.create({ body: paymentData });

    // 1. Verificar se o webhook já processou este pedido enquanto esperávamos a resposta da API
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentStatus: true }
    });

    const newStatus = response.status === 'approved' ? 'CONFIRMED' : 'PENDING';
    
    // Se o status já é o que queremos ou se já foi confirmado por outro meio (webhook),
    // apenas retornamos a resposta sem disparar webhooks duplicados.
    const statusAlreadyUpdated = currentOrder?.status === newStatus && currentOrder?.paymentStatus === response.status;

    // Atualizar pedido com informações do pagamento
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus as any,
        paymentId: String(response.id),
        paymentStatus: response.status,
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

    // 2. Só enviar para o n8n se o status mudou DE FATO ou se ainda não tinha sido atualizado.
    if (!statusAlreadyUpdated) {
      await sendOrderStatusUpdate({
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status as any,
        total: updated.total,
        user: updated.user,
        paymentMethod: updated.paymentMethod,
        paidAt: updated.paidAt,
        items: updated.items,
      });
    }

    return NextResponse.json({
      status: response.status,
      paymentId: response.id,
      statusDetail: response.status_detail,
    });
  } catch (error: any) {
    console.error('Erro ao processar pagamento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar pagamento' },
      { status: 500 }
    );
  }
}
