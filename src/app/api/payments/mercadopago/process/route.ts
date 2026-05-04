import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoKeys, getMercadoPagoConfig } from '@/lib/mercadopago-config';
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

    // Buscar credenciais — DB tem prioridade sobre env vars (mesma lógica da public-key route)
    const [dbConfig, envKeys] = await Promise.all([getMercadoPagoConfig(), Promise.resolve(getMercadoPagoKeys())]);
    const accessToken = dbConfig?.accessToken?.trim() || envKeys.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Mercado Pago não configurado' },
        { status: 500 }
      );
    }

    const publicKey = dbConfig?.publicKey?.trim() || getMercadoPagoKeys().publicKey;
    logger.info(
      {
        source:            dbConfig?.accessToken ? 'db' : 'env',
        environment:       dbConfig?.environment ?? (envKeys.sandbox ? 'sandbox' : 'production'),
        token_prefix:      accessToken.slice(0, 8),
        publicKey_prefix:  publicKey ? publicKey.slice(0, 8) : '(não definida)',
      },
      '[MP] Credenciais',
    );

    // Verificar se o access token é válido e obter info da conta
    let ownerEmail: string | null = null;
    {
      const meRes = await fetch('https://api.mercadopago.com/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      ownerEmail = meData.email ?? null;
      logger.info(
        {
          httpStatus: meRes.status,
          account_id: meData.id,
          email:      '[REDACTED]',
          site_id:    meData.site_id,
          status:     meData.status,
          error:      meData.error ?? null,
          message:    meData.message ?? null,
        },
        '[MP] Info da conta',
      );
    }

    // Extrair os dados reais do formData (pode estar aninhado)
    const paymentFormData = formData.formData || formData;

    // Em sandbox, rejeitar se o email do pagador for o mesmo do dono da conta
    if (accessToken.startsWith('TEST-') && ownerEmail) {
      const payerEmail = paymentFormData.payer?.email || '';
      if (payerEmail.toLowerCase() === ownerEmail.toLowerCase()) {
        return NextResponse.json(
          {
            error: 'Email inválido para teste. Use um email diferente do seu cadastro no Mercado Pago.',
            detail: 'Sandbox: o email do pagador não pode ser o mesmo email do vendedor.',
          },
          { status: 422 },
        );
      }
    }

    // Nota: a validação prévia via GET /v1/card_tokens/{token} foi removida.
    // O endpoint retorna 500 em contas pessoais sandbox e pode invalidar o token
    // antes do pagamento. Tokens inválidos são rejeitados pela API de pagamento
    // com causa específica (causa 324 / bad_filled_card_number etc.).

    const paymentData = {
      transaction_amount: Number(serverAmount),
      token: paymentFormData.token,
      description: `Pedido #${orderId}`,
      installments: Number(paymentFormData.installments),
      payment_method_id: paymentFormData.payment_method_id,
      // issuer_id causa internal_error no sandbox — omitir em ambiente de teste
      ...(paymentFormData.issuer_id && !accessToken.startsWith('TEST-')
        ? { issuer_id: Number(paymentFormData.issuer_id) }
        : {}),
      payer: {
        email: paymentFormData.payer?.email || 'cliente@exemplo.com',
        identification: {
          type: paymentFormData.payer?.identification?.type || paymentFormData.identificationType || 'CPF',
          number: paymentFormData.payer?.identification?.number || paymentFormData.identificationNumber || '00000000000',
        },
      },
      external_reference: orderId,
      ...(process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
        ? { notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mercadopago/webhook` }
        : {}),
    };

    logger.info(
      {
        transaction_amount: paymentData.transaction_amount,
        payment_method_id:  paymentData.payment_method_id,
        installments:       paymentData.installments,
        payer_email:        paymentData.payer.email,
        payer_id_type:      paymentData.payer.identification.type,
        payer_id_number:    paymentData.payer.identification.number,
        token_preview:      paymentData.token ? `${String(paymentData.token).slice(0, 8)}…` : null,
        external_reference: paymentData.external_reference,
        notification_url:   (paymentData as any).notification_url ?? '(omitido — localhost)',
      },
      '[MP] Enviando pagamento',
    );

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    let mpResponse: any;
    try {
      mpResponse = await payment.create({
        body: paymentData,
        requestOptions: { idempotencyKey: `pay-${orderId}-${Date.now()}` },
      });
    } catch (sdkError: any) {
      // SDK lança erro com cause quando a API retorna 4xx/5xx
      const cause = sdkError?.cause ?? sdkError?.message ?? String(sdkError);
      logger.error({ cause, orderId }, '[MP] SDK erro ao criar pagamento');

      const isSandbox = accessToken.startsWith('TEST-');
      const isInternalError =
        isSandbox &&
        (String(cause).includes('internal_error') || sdkError?.status === 500 || sdkError?.statusCode === 500);

      const autoApprove = process.env.SANDBOX_AUTO_APPROVE === 'true';

      if (isInternalError) {
        const sandboxPaymentId = `sandbox-${autoApprove ? 'approved' : 'pending'}-${orderId}`;
        const newStatus = autoApprove ? 'CONFIRMED' : 'PENDING';
        const newPaymentStatus = autoApprove ? 'approved' : 'pending';

        const updated = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: newStatus as any,
            paymentId: sandboxPaymentId,
            paymentStatus: newPaymentStatus,
            ...(autoApprove ? { paidAt: new Date() } : {}),
          },
          include: {
            user: true,
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true, imageUrl: true } },
              },
            },
          },
        });

        if (autoApprove) {
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
          logger.info({ orderId, sandboxPaymentId }, '[MP] Sandbox auto-aprovado');
        } else {
          logger.warn({ orderId, sandboxPaymentId }, '[MP] Sandbox internal_error — pedido salvo como PENDING');
        }

        return NextResponse.json({
          status: newPaymentStatus,
          paymentId: sandboxPaymentId,
          statusDetail: autoApprove ? 'sandbox_auto_approved' : 'sandbox_pending_simulation',
        });
      }

      return NextResponse.json(
        { error: 'Erro ao processar pagamento. Tente novamente ou contate o suporte.',
          detail: process.env.NODE_ENV !== 'production' ? String(cause) : undefined },
        { status: 500 },
      );
    }

    logger.info(
      {
        mpStatus: mpResponse.status,
        mpDetail: mpResponse.status_detail,
        mpId:     mpResponse.id,
      },
      '[MP] Resposta da API',
    );

    // 1. Verificar se o webhook já processou este pedido enquanto esperávamos a resposta da API
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentStatus: true }
    });

    const newStatus = mpResponse.status === 'approved' ? 'CONFIRMED' : 'PENDING';

    // Se o status já é o que queremos ou se já foi confirmado por outro meio (webhook),
    // apenas retornamos a resposta sem disparar webhooks duplicados.
    const statusAlreadyUpdated = currentOrder?.status === newStatus && currentOrder?.paymentStatus === mpResponse.status;

    // Atualizar pedido com informações do pagamento
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus as any,
        paymentId: String(mpResponse.id),
        paymentStatus: mpResponse.status,
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
      status: mpResponse.status,
      paymentId: mpResponse.id,
      statusDetail: mpResponse.status_detail,
    });
  } catch (error: any) {
    logger.error({ message: error?.message ?? String(error) }, 'Erro crítico ao processar pagamento');

    return NextResponse.json(
      {
        error: 'Erro ao processar pagamento. Tente novamente ou contate o suporte.',
        detail: process.env.NODE_ENV !== 'production' ? String(error?.message ?? error) : undefined,
      },
      { status: 500 },
    );
  }
}
