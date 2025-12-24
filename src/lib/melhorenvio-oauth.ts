import { prisma } from '@/lib/prisma';
import { Buffer } from 'node:buffer';

function melhorEnvioBaseUrl() {
  const isSandbox = (process.env.MELHOR_ENVIO_SANDBOX || 'true').toLowerCase() !== 'false';
  return isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
}

function userAgentHeader() {
  const ua = process.env.MELHOR_ENVIO_USER_AGENT || 'Loja Virtual (contato@exemplo.com)';
  return ua;
}

function basicAuthHeader() {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID || '';
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET || '';
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${token}`;
}

export const ME_SCOPES = (
  process.env.MELHOR_ENVIO_SCOPES || 'shipping-calculate shipping-tracking ecommerce-shipping shipping-companies orders-read users-read'
).trim();

export function buildAuthorizeUrl(state: string = 'state') {
  const base = melhorEnvioBaseUrl();
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const redirectUri = process.env.MELHOR_ENVIO_CALLBACK || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/melhor-envio/callback`;
  if (!clientId) throw new Error('MELHOR_ENVIO_CLIENT_ID ausente');

  const url = new URL(`${base}/oauth/authorize`);
  url.searchParams.set('client_id', String(clientId));
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', ME_SCOPES);
  return url.toString();
}

type TokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
  scope?: string;
};

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const base = melhorEnvioBaseUrl();
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  const redirectUri = process.env.MELHOR_ENVIO_CALLBACK || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/melhor-envio/callback`;
  if (!clientId || !clientSecret) throw new Error('Client ID/Secret ausentes');

  // OAuth token endpoints geralmente exigem x-www-form-urlencoded
  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('client_id', String(clientId).trim());
  params.set('client_secret', String(clientSecret));
  params.set('redirect_uri', redirectUri);
  params.set('code', code);

  console.info('[melhorenvio][token] requisitando token', {
    base,
    clientId: String(clientId).trim(),
    redirectUri,
    grant: 'authorization_code',
  });

  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgentHeader(),
      Authorization: basicAuthHeader(),
    },
    body: params.toString(),
  });
  const raw = await res.text().catch(() => '');
  console.info('[melhorenvio][token] resposta token', {
    status: res.status,
    ok: res.ok,
    bodyPreview: raw.slice(0, 500),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${raw.slice(0, 800)}`);
  }
  let data: any = {};
  try { data = JSON.parse(raw); } catch { data = {}; }
  return data as TokenResponse;
}

export async function refreshAccessToken(): Promise<TokenResponse> {
  const base = melhorEnvioBaseUrl();
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Client ID/Secret ausentes');

  let current: { refreshToken?: string } | null = null;
  try {
    current = await (prisma as any).melhorEnvioToken?.findUnique({ where: { id: 'singleton' } });
  } catch (e) {
    console.warn('[melhorenvio] prisma model not available (refresh)', e);
    current = null;
  }
  if (!current?.refreshToken) throw new Error('Refresh token ausente');

  const params = new URLSearchParams();
  params.set('grant_type', 'refresh_token');
  params.set('client_id', String(clientId).trim());
  params.set('client_secret', String(clientSecret));
  params.set('refresh_token', String(current.refreshToken));

  console.info('[melhorenvio][refresh] requisitando refresh', {
    base,
    clientId: String(clientId).trim(),
    grant: 'refresh_token',
  });

  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgentHeader(),
      Authorization: basicAuthHeader(),
    },
    body: params.toString(),
  });
  const raw = await res.text().catch(() => '');
  console.info('[melhorenvio][refresh] resposta refresh', {
    status: res.status,
    ok: res.ok,
    bodyPreview: raw.slice(0, 500),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${raw.slice(0, 800)}`);
  }
  let data: any = {};
  try { data = JSON.parse(raw); } catch { data = {}; }
  return data as TokenResponse;
}

export async function saveToken(tr: TokenResponse) {
  const expiresAt = new Date(Date.now() + (tr.expires_in || 0) * 1000);
  const environment = (process.env.MELHOR_ENVIO_SANDBOX || 'true').toLowerCase() !== 'false' ? 'sandbox' : 'production';
  try {
    await (prisma as any).melhorEnvioToken?.upsert({
    where: { id: 'singleton' },
    update: {
      accessToken: tr.access_token,
      refreshToken: tr.refresh_token,
      expiresAt,
      scope: tr.scope,
      environment,
    },
    create: {
      id: 'singleton',
      accessToken: tr.access_token,
      refreshToken: tr.refresh_token,
      expiresAt,
      scope: tr.scope,
      environment,
    },
    });
  } catch (e) {
    console.warn('[melhorenvio] prisma model not available (saveToken)', e);
  }
}

export async function getAccessToken(): Promise<string | null> {
  // Prefer explicit env token for simplicity if provided
  const direct = process.env.MELHOR_ENVIO_TOKEN;
  if (direct) return direct;

  let row: { accessToken?: string; expiresAt?: Date } | null = null;
  try {
    row = await (prisma as any).melhorEnvioToken?.findUnique({ where: { id: 'singleton' } });
  } catch (e) {
    console.warn('[melhorenvio] prisma model not available (getAccessToken)', e);
    row = null;
  }
  if (!row?.accessToken) return null;
  const now = Date.now();
  const exp = row.expiresAt ? new Date(row.expiresAt).getTime() : 0;
  if (exp && exp - now < 60_000) {
    try {
      const refreshed = await refreshAccessToken();
      await saveToken(refreshed);
      return refreshed.access_token;
    } catch (e) {
      console.warn('[melhorenvio] token refresh failed', e);
      return row.accessToken;
    }
  }
  return row.accessToken;
}

export function commonHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': userAgentHeader(),
  } as Record<string, string>;
}
