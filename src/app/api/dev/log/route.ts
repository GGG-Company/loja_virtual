import logger from "@/lib/logger";
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Print server-side so it appears in terminal where Next.js runs
    logger.info('[DEV-LOG]', JSON.stringify(data));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(error, '[DEV-LOG] error');
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
