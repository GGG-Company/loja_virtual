import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, saveToken } from '@/lib/melhorenvio-oauth';
import { getRedisPublisher } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code) {
    logger.warn({ url: req.url, state }, '[melhorenvio][callback] code ausente');
    return NextResponse.json({ error: 'code ausente' }, { status: 400 });
  }

  // Verificar state via Redis ou fallback no banco
  const redis = getRedisPublisher();
  let stateValid = false;

  if (redis) {
    const redisKey = `me_oauth_state:${state}`;
    const exists = await redis.get(redisKey);
    if (exists) {
      await redis.del(redisKey);
      stateValid = true;
    }
  }

  if (!stateValid) {
    // Fallback: verificar no banco (usado quando Redis estava indisponível no authorize)
    const dbToken = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: 'me_oauth_state', token: state ?? '' } },
    }).catch(() => null);

    if (dbToken && dbToken.expires > new Date()) {
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: 'me_oauth_state', token: state ?? '' } },
      }).catch(() => null);
      stateValid = true;
    } else if (dbToken) {
      // Expirado — limpar
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: 'me_oauth_state', token: state ?? '' } },
      }).catch(() => null);
    }
  }

  if (!stateValid) {
    logger.warn({ state }, '[melhorenvio][callback] state inválido ou expirado (CSRF)');
    return NextResponse.json({ error: 'State inválido' }, { status: 400 });
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
    
    // Usar APP_URL para evitar problema com proxy reverso retornando endereço interno
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') 
      || `${new URL(req.url).protocol}//${new URL(req.url).host}`;
    return NextResponse.redirect(`${baseUrl}/admin/settings`);
  } catch (e: any) {
    logger.error(e as Error, '[melhorenvio][callback] erro ao trocar code por token');
    return NextResponse.json({ error: e?.message || 'Erro ao trocar code por token', state }, { status: 400 });
  }
}
