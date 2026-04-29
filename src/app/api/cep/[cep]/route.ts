import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cep: string }> }
) {
  const { cep } = await params;
  const cepLimpo = cep.replace(/\D/g, '');

  if (!/^\d{8}$/.test(cepLimpo)) {
    return NextResponse.json({ erro: true }, { status: 400 });
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
      next: { revalidate: 86400 }, // cache 24h — CEPs raramente mudam
    });

    if (!res.ok) {
      return NextResponse.json({ erro: true }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ erro: true }, { status: 502 });
  }
}
