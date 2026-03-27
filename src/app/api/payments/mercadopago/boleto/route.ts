import { NextRequest, NextResponse } from 'next/server';
import logger from "@/lib/logger";
import { getMercadoPagoKeys } from '@/lib/mercadopago-config';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { paymentLimiter } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const blocked = await paymentLimiter.check(req);
    if (blocked) return blocked;

    const body = await req.json();
    const { orderId, amount, userEmail, userName, userCpf } = body;

    if (!orderId || !amount) {
      return NextResponse.json({ error: "orderId e amount são obrigatórios" }, { status: 400 });
    }

    // Buscar dados do pedido e validar valor no servidor
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        total: true,
        shippingAddress: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // Nunca confiar no amount do client
    if (Math.abs(Number(amount) - order.total) > 0.01) {
      logger.warn({ clientAmount: amount, serverAmount: order.total, orderId }, 'Tentativa de manipulação de preço detectada (boleto)');
      return NextResponse.json({ error: 'Valor do pagamento não confere com o pedido' }, { status: 400 });
    }

    const serverAmount = order.total;

    // Extrair endereço do JSON
    const address = order.shippingAddress as any;

    const { accessToken } = getMercadoPagoKeys();

    if (!accessToken) {
      return NextResponse.json({ error: "Mercado Pago não configurado" }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ 
      accessToken: accessToken 
    });

    const payment = new Payment(client);
    
    // Data de vencimento: 3 dias úteis
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const paymentData = {
      transaction_amount: Number(serverAmount),
      description: `Pedido #${orderId}`,
      payment_method_id: "bolbradesco",
      payer: {
        email: userEmail || "test@test.com",
        first_name: userName?.split(" ")[0] || "Cliente",
        last_name: userName?.split(" ").slice(1).join(" ") || "Teste",
        identification: {
          type: "CPF",
          number: userCpf?.replace(/\D/g, "") || "12345678909",
        },
        address: {
          zip_code: address?.zipCode?.replace(/\D/g, "") || "01310100",
          street_name: address?.street || "Rua Exemplo",
          street_number: address?.number || "123",
          neighborhood: address?.neighborhood || "Centro",
          city: address?.city || "São Paulo",
          federal_unit: address?.state || "SP",
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
      boletoUrl: (response as any).point_of_interaction?.transaction_data?.ticket_url || (response as any).transaction_details?.external_resource_url,
      barcode: (response as any).point_of_interaction?.transaction_data?.barcode?.content,
      dueDate: response.date_of_expiration,
    });
  } catch (error: any) {
    logger.error(error as Error, "Erro ao gerar Boleto");
    return NextResponse.json({ error: 'Erro ao gerar boleto. Tente novamente ou contate o suporte.' }, { status: 500 });
  }
}
