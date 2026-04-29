import { NextRequest, NextResponse } from 'next/server';
import logger from "@/lib/logger";
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { paymentLimiter } from '@/lib/rate-limit';
import { toNum } from '@/lib/decimal-helpers';

export async function POST(req: NextRequest) {
  try {
    const blocked = await paymentLimiter.check(req);
    if (blocked) return blocked;

    const body = await req.json();
    const { orderId, amount, userEmail, userName } = body;

    if (!orderId || !amount) {
      return NextResponse.json({ error: "orderId e amount são obrigatórios" }, { status: 400 });
    }

    // Validar valor no servidor — nunca confiar no amount do client
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { total: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (Math.abs(Number(amount) - toNum(order.total)) > 0.01) {
      logger.warn({ clientAmount: amount, serverAmount: toNum(order.total), orderId }, 'Tentativa de manipulação de preço detectada (PIX)');
      return NextResponse.json({ error: 'Valor do pagamento não confere com o pedido' }, { status: 400 });
    }

    const serverAmount = toNum(order.total);

    const { accessToken } = getMercadoPagoKeys();

    if (!accessToken) {
      return NextResponse.json({ error: "Mercado Pago não configurado" }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ 
      accessToken: accessToken 
    });

    const payment = new Payment(client);
    
    const paymentData = {
      transaction_amount: Number(serverAmount),
      description: `Pedido #${orderId}`,
      payment_method_id: "pix",
      payer: {
        email: userEmail || "test@test.com",
        first_name: userName?.split(" ")[0] || "Cliente",
        last_name: userName?.split(" ").slice(1).join(" ") || "Teste",
      },
      external_reference: orderId,
      ...(process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
        ? { notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mercadopago/webhook` }
        : {}),
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
    logger.error(error as Error, 'Erro ao gerar PIX');
    return NextResponse.json(
      { error: 'Erro ao gerar PIX. Tente novamente ou contate o suporte.' },
      { status: 500 }
    );
  }
}
