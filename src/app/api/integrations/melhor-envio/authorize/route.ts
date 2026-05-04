import { NextResponse, NextRequest } from 'next/server';
import { buildAuthorizeUrl } from '@/lib/melhorenvio-oauth';
import { getRedisPublisher } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const state = crypto.randomUUID();

    const redis = getRedisPublisher();
    if (redis) {
      await redis.set(`me_oauth_state:${state}`, '1', 'EX', 600);
    } else {
      // Fallback: armazena no banco quando Redis está indisponível
      logger.warn('[melhorenvio][authorize] Redis indisponível — armazenando state no banco');
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
      await prisma.verificationToken.upsert({
        where: { identifier_token: { identifier: 'me_oauth_state', token: state } },
        create: { identifier: 'me_oauth_state', token: state, expires },
        update: { expires },
      });
    }

    const url = buildAuthorizeUrl(state);
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao iniciar autorização' }, { status: 400 });
  }
}
