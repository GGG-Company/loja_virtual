import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getMercadoPagoConfig } from '@/lib/mercadopago-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const config = await getMercadoPagoConfig();
    
    if (!config || !config.accessToken || !config.publicKey) {
      return NextResponse.json({ 
        connected: false,
        environment: process.env.MERCADO_PAGO_SANDBOX === 'false' ? 'production' : 'sandbox'
      });
    }

    return NextResponse.json({
      connected: config.active || true,
      environment: config.environment || 'sandbox',
      updatedAt: config.updatedAt ? new Date(config.updatedAt).toISOString() : null,
    });
  } catch (e) {
    return NextResponse.json({ 
      connected: false,
      environment: process.env.MERCADO_PAGO_SANDBOX === 'false' ? 'production' : 'sandbox'
    }, { status: 200 });
  }
}
