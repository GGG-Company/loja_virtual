import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, saveToken } from '@/lib/melhorenvio-oauth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code) {
    logger.warn({ url: req.url, state }, '[melhorenvio][callback] code ausente');
    return NextResponse.json({ error: 'code ausente' }, { status: 400 });
  }

  try {
    logger.info({ state, codeLen: code.length }, '[melhorenvio][callback] iniciando troca de code por token');
    const token = await exchangeCodeForToken(code);
    logger.info({
      tokenType: token.token_type,
      expiresIn: token.expires_in,
      scope: token.scope,
      hasRefresh: !!token.refresh_token,
    }, '[melhorenvio][callback] token recebido');
    await saveToken(token);
    logger.info('[melhorenvio][callback] token salvo com sucesso');
    
    // Redireciona para o admin usando a URL base da requisição atual (mais seguro)
    const redirectUrl = new URL('/admin/settings', req.url);
    return NextResponse.redirect(redirectUrl);
  } catch (e: any) {
    logger.error(e as Error, '[melhorenvio][callback] erro ao trocar code por token');
    return NextResponse.json({ error: e?.message || 'Erro ao trocar code por token', state }, { status: 400 });
  }
}
