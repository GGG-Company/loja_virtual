import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, saveToken } from '@/lib/melhorenvio-oauth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code) {
    console.warn('[melhorenvio][callback] code ausente', { url: req.url, state });
    return NextResponse.json({ error: 'code ausente' }, { status: 400 });
  }

  try {
    console.info('[melhorenvio][callback] iniciando troca de code por token', {
      state,
      codeLen: code.length,
    });
    const token = await exchangeCodeForToken(code);
    console.info('[melhorenvio][callback] token recebido', {
      tokenType: token.token_type,
      expiresIn: token.expires_in,
      scope: token.scope,
      hasRefresh: !!token.refresh_token,
    });
    await saveToken(token);
    console.info('[melhorenvio][callback] token salvo com sucesso');
    // Redireciona para uma página de sucesso (admin), ou retorna JSON
    const redirect = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings` : '/admin/settings';
    // Prefer redirect for UX; but in dev, JSON can be handy
    return NextResponse.redirect(redirect);
  } catch (e: any) {
    console.error('[melhorenvio][callback] erro ao trocar code por token', {
      message: e?.message,
      state,
    });
    return NextResponse.json({ error: e?.message || 'Erro ao trocar code por token', state }, { status: 400 });
  }
}
