import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Print server-side so it appears in terminal where Next.js runs
    console.log('[DEV-LOG]', JSON.stringify(data));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DEV-LOG] error', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
