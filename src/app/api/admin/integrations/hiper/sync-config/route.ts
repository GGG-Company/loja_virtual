import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function checkAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === 'ADMIN' || role === 'OWNER';
}

async function getConfig() {
  return prisma.hiperSyncConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  });
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { webhookEnabled, cronEnabled, cronIntervalMin } = body;

  const data: Record<string, unknown> = {};
  if (typeof webhookEnabled  === 'boolean') data.webhookEnabled  = webhookEnabled;
  if (typeof cronEnabled     === 'boolean') data.cronEnabled     = cronEnabled;
  if (typeof cronIntervalMin === 'number' && cronIntervalMin >= 5) {
    data.cronIntervalMin = cronIntervalMin;
  }

  const config = await prisma.hiperSyncConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data,
  });

  logger.info({ data }, '[HIPER_SYNC_CONFIG] Configuração atualizada');
  return NextResponse.json(config);
}
