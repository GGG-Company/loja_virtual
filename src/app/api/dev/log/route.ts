import logger from "@/lib/logger";
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Bloquear em produção
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint desabilitado' }, { status: 403 });
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
