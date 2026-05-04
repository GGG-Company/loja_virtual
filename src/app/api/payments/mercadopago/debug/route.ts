import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoConfig, getMercadoPagoKeys } from '@/lib/mercadopago-config';

// Endpoint de debug — apenas disponível em desenvolvimento
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Desabilitado em produção' }, { status: 403 });
  }

  const body = await req.json();
  const { token, amount = 0.01 } = body;

  const report: Record<string, any> = {};

  // 1. Credenciais
  const dbConfig = await getMercadoPagoConfig();
  const envKeys = getMercadoPagoKeys();
  const accessToken = dbConfig?.accessToken?.trim() || envKeys.accessToken;
  const publicKey = dbConfig?.publicKey?.trim() || envKeys.publicKey;

  report.credentials = {
    source: dbConfig?.accessToken ? 'db' : 'env',
    publicKey_full: publicKey,
    accessToken_prefix: accessToken?.slice(0, 20),
    accessToken_suffix: accessToken?.slice(-13), // user_id no final
    environment: dbConfig?.environment ?? (envKeys.sandbox ? 'sandbox' : 'production'),
    keys_match_same_user:
      accessToken && publicKey
        ? accessToken.split('-').pop() === publicKey.split('-')[1]
        : null,
  };

  // 2. Testar access token (/users/me)
  try {
    const meRes = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json();
    report.users_me = {
      httpStatus: meRes.status,
      id: meData.id,
      email: meData.email ? '[REDACTED]' : null,
      account_type: meData.mercadopago_account_type,
      site_id: meData.site_id,
      billing_allow: meData.status?.billing?.allow,
      sell_allow: meData.status?.sell?.allow,
      error: meData.error ?? null,
      message: meData.message ?? null,
    };
  } catch (e: any) {
    report.users_me = { error: e.message };
  }

  // 3. Validar token do cartão (se fornecido)
  if (token) {
    try {
      const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens/${token}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const tokenData = await tokenRes.json();
      report.card_token = {
        httpStatus: tokenRes.status,
        token_id: tokenData.id,
        first_six: tokenData.first_six_digits,
        last_four: tokenData.last_four_digits,
        expiry: tokenData.expiration_month != null
          ? `${tokenData.expiration_month}/${tokenData.expiration_year}`
          : 'N/A',
        cardholder_name: tokenData.cardholder?.name,
        live_mode: tokenData.live_mode,
        luhn_validation: tokenData.luhn_validation,
        public_key_used: tokenData.public_key,
        public_key_matches_config: tokenData.public_key === publicKey,
        error: tokenData.error ?? null,
        message: tokenData.message ?? null,
        cause: tokenData.cause ?? null,
      };
    } catch (e: any) {
      report.card_token = { error: e.message };
    }

    // 4. Tentar pagamento minimal
    try {
      const paymentBody = {
        transaction_amount: Number(amount),
        token,
        description: 'DEBUG TEST',
        installments: 1,
        payment_method_id: 'master',
        payer: {
          email: 'debug_test_payer@sandbox.test',
          identification: { type: 'CPF', number: '12345678909' },
        },
      };

      report.payment_request_body = paymentBody;

      const payRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `debug-${Date.now()}`,
        },
        body: JSON.stringify(paymentBody),
      });
      const payData = await payRes.json();
      report.payment_response = {
        httpStatus: payRes.status,
        status: payData.status,
        status_detail: payData.status_detail,
        id: payData.id,
        error: payData.error ?? null,
        message: payData.message ?? null,
        cause: payData.cause ?? [],
        full_response: payData,
      };
    } catch (e: any) {
      report.payment_response = { error: e.message };
    }
  } else {
    report.card_token = 'Não fornecido — envie { "token": "TOKEN_DO_BRICK" } no body';
    report.payment_response = 'Aguardando token';
  }

  return NextResponse.json(report, { status: 200 });
}
