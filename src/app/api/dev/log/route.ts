import logger from "@/lib/logger";
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Bloquear em produção
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint desabilitado' }, { status: 403 });
  }
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await req.json();
    // Print server-side so it appears in terminal where Next.js runs
    logger.info({ data }, '[DEV-LOG]');
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(error as Error, '[DEV-LOG] error');
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
