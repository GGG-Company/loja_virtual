import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import logger from '@/lib/logger';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { paymentLimiter } from '@/lib/rate-limit';
import { toNum, serializeItems } from '@/lib/decimal-helpers';

export async function POST(req: NextRequest) {
  try {
    const blocked = await paymentLimiter.check(req);
    if (blocked) return blocked;

    const body = await req.json();
    const { formData, orderId, amount } = body;

    logger.info({ orderId, amount }, 'Processando novo pagamento');

    if (!orderId || !amount) {
      logger.warn({ orderId, amount }, 'Tentativa de pagamento com dados ausentes');
      return NextResponse.json(
        { error: 'orderId e amount são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar valor no servidor — nunca confiar no amount do client
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { total: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (Math.abs(Number(amount) - toNum(order.total)) > 0.01) {
      logger.warn({ clientAmount: amount, serverAmount: toNum(order.total), orderId }, 'Tentativa de manipulação de preço detectada');
      return NextResponse.json({ error: 'Valor do pagamento não confere com o pedido' }, { status: 400 });
    }

    const serverAmount = toNum(order.total);

    // Buscar credenciais
    const { accessToken } = getMercadoPagoKeys();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Mercado Pago não configurado' },
        { status: 500 }
      );
    }

    // Configurar o SDK
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken 
    });

    // Criar pagamento
    const payment = new Payment(client);
    
    // Extrair os dados reais do formData (pode estar aninhado)
    const paymentFormData = formData.formData || formData;
    
    const paymentData = {
      transaction_amount: Number(serverAmount),
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
        total: toNum(updated.total),
        user: updated.user,
        paymentMethod: updated.paymentMethod,
        paidAt: updated.paidAt,
        items: serializeItems(updated.items),
      });
    }

    return NextResponse.json({
      status: response.status,
      paymentId: response.id,
      statusDetail: response.status_detail,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Erro crítico ao processar pagamento no Mercado Pago');
    return NextResponse.json(
      { error: 'Erro ao processar pagamento. Tente novamente ou contate o suporte.' },
      { status: 500 }
    );
  }
}
