import { NextResponse } from 'next/server';
import { getMercadoPagoConfig } from '@/lib/mercadopago-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Tenta pegar do banco primeiro
    const config = await getMercadoPagoConfig();
    
    // Fallback para variáveis de ambiente (várias possibilidades)
    let publicKey = config?.publicKey || 
                    process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || 
                    process.env.MERCADO_PAGO_PUBLIC_KEY;

    // Limpeza de possíveis aspas ou espaços
    if (publicKey) {
      publicKey = publicKey.replace(/['"]/g, '').trim();
    }

    if (!publicKey || publicKey.length < 10) {
      return NextResponse.json({ error: 'Configuração não encontrada ou inválida' }, { status: 404 });
    }

    return NextResponse.json({ publicKey });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar chave pública' }, { status: 500 });
  }
}
