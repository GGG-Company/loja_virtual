import { prisma } from '@/lib/prisma';

export async function getMercadoPagoConfig() {
  try {
    const config = await (prisma as any).mercadoPagoConfig?.findUnique({
      where: { id: 'singleton' },
    });
    return config || null;
  } catch {
    return null;
  }
}

export async function updateMercadoPagoConfig(data: {
  publicKey?: string;
  accessToken?: string;
  environment?: string;
  webhookSecret?: string;
  active?: boolean;
}) {
  try {
    const config = await (prisma as any).mercadoPagoConfig?.upsert({
      where: { id: 'singleton' },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        id: 'singleton',
        ...data,
      },
    });
    return config;
  } catch (error) {
    console.error('Erro ao atualizar configuração do Mercado Pago:', error);
    throw error;
  }
}

export function getMercadoPagoKeys() {
  const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY || '';
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  const sandbox = (process.env.MERCADO_PAGO_SANDBOX || 'true').toLowerCase() !== 'false';
  
  return {
    publicKey,
    accessToken,
    sandbox,
  };
}
