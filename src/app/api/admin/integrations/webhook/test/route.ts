import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import logger from "@/lib/logger";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const envPath = path.join(process.cwd(), '.env');
const envLoaded = loadEnv({ path: envPath });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    if (role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const webhookUrl = process.env.N8N_ORDERS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.warn({
        hasN8NOrders: Boolean(process.env.N8N_ORDERS_WEBHOOK_URL),
        hasN8N: Boolean(process.env.N8N_WEBHOOK_URL),
        cwd: process.cwd(),
        envPath,
        envExists: fs.existsSync(envPath),
        envLoaded,
      }, '[WEBHOOK_TEST_ENV]');
      return NextResponse.json(
        {
          error: 'Webhook não configurado. Defina N8N_ORDERS_WEBHOOK_URL ou N8N_WEBHOOK_URL.',
          hasN8NOrders: Boolean(process.env.N8N_ORDERS_WEBHOOK_URL),
          hasN8N: Boolean(process.env.N8N_WEBHOOK_URL),
          cwd: process.cwd(),
          envPath,
          envExists: fs.existsSync(envPath),
          envLoaded,
          envSample: {
            N8N_ORDERS_WEBHOOK_URL: (process.env.N8N_ORDERS_WEBHOOK_URL || '').slice(0, 12),
            N8N_WEBHOOK_URL: (process.env.N8N_WEBHOOK_URL || '').slice(0, 12),
          },
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const payload = typeof body === 'object' && body !== null ? body : {};

    await sendOrderStatusUpdate({
      orderId: 'TEST-ORDER-ID',
      orderNumber: 'ORD-TEST-001',
      status: 'CONFIRMED',
      total: 199.9,
      user: {
        id: 'TEST-USER-ID',
        name: 'Webhook Teste',
        email: 'webhook+teste@example.com',
      },
      shippingAddress: {
        street: 'Av. Teste, 123',
        city: 'São Paulo',
        state: 'SP',
        country: 'BR',
      },
      paymentMethod: 'test',
      paidAt: new Date(),
      extra: {
        source: 'admin-settings',
        ...(payload as any).extra,
      },
      ...(payload as any),
    });

    return NextResponse.json({ message: 'Webhook de teste enviado.' });
  } catch (error) {
    logger.error(error as Error, '[ADMIN_WEBHOOK_TEST]');
    return NextResponse.json({ error: 'Erro ao enviar webhook de teste.' }, { status: 500 });
  }
}
