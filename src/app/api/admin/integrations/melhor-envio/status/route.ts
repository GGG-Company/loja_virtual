import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const row = await (prisma as any).melhorEnvioToken?.findUnique({ where: { id: 'singleton' } });
    if (!row || !row.accessToken) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      environment: row.environment || 'sandbox',
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      scope: row.scope || null,
    });
  } catch (e) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }
}
