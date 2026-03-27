import { NextResponse, NextRequest } from 'next/server';
import { updateMercadoPagoConfig } from '@/lib/mercadopago-config';
import { auth } from '@/auth';
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    // Defesa em profundidade — proxy já protege /api/admin mas valida aqui também
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { publicKey, accessToken, environment } = body;

    if (!publicKey || !accessToken) {
      return NextResponse.json(
        { error: 'publicKey e accessToken são obrigatórios' },
        { status: 400 }
      );
    }

    const config = await updateMercadoPagoConfig({
      publicKey,
      accessToken,
      environment: environment || 'sandbox',
      active: true,
    });

    return NextResponse.json({
      connected: true,
      environment: config.environment,
      updatedAt: config.updatedAt?.toISOString(),
    });
  } catch (error) {
    logger.error(error, 'Erro ao configurar Mercado Pago');
    return NextResponse.json(
      { error: 'Erro ao configurar Mercado Pago' },
      { status: 500 }
    );
  }
}
