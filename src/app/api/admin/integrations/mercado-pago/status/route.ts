import { NextResponse } from 'next/server';
import { getMercadoPagoConfig } from '@/lib/mercadopago-config';

export async function GET() {
  try {
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
