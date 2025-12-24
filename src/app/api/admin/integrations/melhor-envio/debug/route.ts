import { NextResponse } from 'next/server';
import { buildAuthorizeUrl, commonHeaders, ME_SCOPES } from '@/lib/melhorenvio-oauth';

export async function GET() {
  const sandbox = (process.env.MELHOR_ENVIO_SANDBOX || 'true').toLowerCase() !== 'false';
  const base = sandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
  const nextauthUrl = process.env.NEXTAUTH_URL || null;
  const callback = process.env.MELHOR_ENVIO_CALLBACK || `${nextauthUrl || 'http://localhost:3000'}/api/integrations/melhor-envio/callback`;
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  const userAgent = process.env.MELHOR_ENVIO_USER_AGENT || 'Loja Virtual (contato@exemplo.com)';
  const services = process.env.MELHOR_ENVIO_SERVICES || '1,2';
  const originZip = process.env.SHIPPING_ORIGIN_ZIP || '44002264';

  let authorizeUrl: string | null = null;
  let error: string | null = null;
  try {
    authorizeUrl = buildAuthorizeUrl('debug');
  } catch (e: any) {
    error = String(e?.message || e);
  }

  const headers = commonHeaders();

  return NextResponse.json({
    sandbox,
    base,
    nextauthUrl,
    callback,
    clientIdPresent: !!clientId,
    clientSecretPresent: !!clientSecret,
    userAgent,
    scopes: ME_SCOPES,
    services,
    originZip,
    headers,
    authorizeUrl,
    error,
  });
}
