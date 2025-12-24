import { NextResponse } from 'next/server';
import { getPickupPoints } from '@/lib/shipping-calculator';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const zip = searchParams.get('zip') || searchParams.get('cep');

  if (!zip) {
    return NextResponse.json({ error: 'zip is required' }, { status: 400 });
  }

  try {
    const points = await getPickupPoints({ destinationZip: zip });
    return NextResponse.json(points);
  } catch (err) {
    console.error('[shipping][pickups]', err);
    return NextResponse.json({ error: 'Erro ao buscar pontos de coleta' }, { status: 500 });
  }
}
