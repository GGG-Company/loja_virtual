import { NextResponse } from 'next/server';
import { getMercadoPagoConfig } from '@/lib/mercadopago-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Tenta pegar do banco primeiro
    const config = await getMercadoPagoConfig();
    
    // Fallback para variável de ambiente
    const publicKey = config?.publicKey || process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

    if (!publicKey) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ publicKey });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar chave pública' }, { status: 500 });
  }
}
