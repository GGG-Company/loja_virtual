import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
