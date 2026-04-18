import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/consent
 *
 * LGPD Art. 7 — Registro auditável de consentimento de cookies.
 * Chamado pelo banner de cookies ao aceitar/recusar categorias.
 * Funciona para usuários autenticados e anônimos.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { essential, analytics, marketing, version } = body as {
      essential: boolean;
      analytics: boolean;
      marketing: boolean;
      version: string;
    };

    if (typeof analytics !== 'boolean' || typeof marketing !== 'boolean' || !version) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id ?? null;

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      null;

    const userAgent = req.headers.get('user-agent') ?? null;

    await prisma.consentRecord.create({
      data: {
        userId,
        essential: true, // sempre true
        analytics,
        marketing,
        ipAddress: ip,
        userAgent,
        version,
      },
    });

    logger.info({ userId, analytics, marketing, version }, '[CONSENT] Consentimento registrado');

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(error as Error, '[CONSENT]');
    return NextResponse.json({ error: 'Erro ao registrar consentimento' }, { status: 500 });
  }
}
