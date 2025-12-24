import { NextResponse } from 'next/server';
import { trackShipments } from '@/lib/shipping-calculator';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const trackingCodes: string[] = Array.isArray(body?.trackingCodes) ? body.trackingCodes : [];

  if (!trackingCodes.length) {
    return NextResponse.json({ error: 'trackingCodes is required' }, { status: 400 });
  }

  try {
    const result = await trackShipments({ trackingCodes });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[shipping][track]', err);
    return NextResponse.json({ error: 'Erro ao consultar rastreio' }, { status: 500 });
  }
}
