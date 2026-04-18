import path from 'path';
import { config as loadEnv } from 'dotenv';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendOrderStatusUpdate, sendWebhook } from '@/lib/webhooks';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

loadEnv({ path: path.join(process.cwd(), '.env') });

// Pedido fictício base reutilizado em todos os eventos
const FAKE_ORDER = {
  orderId: 'TEST-ORDER-ID',
  orderNumber: 'ORD-TEST-001',
  total: 199.9,
  user: {
    id: 'TEST-USER-ID',
    name: 'Webhook Teste',
    email: 'webhook+teste@feiradeferramentas.com.br',
    phone: '(75) 98159-8195',
  },
  shippingAddress: {
    street: 'Rua Vitorino Gouveia, 35',
    city: 'Feira de Santana',
    state: 'BA',
    country: 'BR',
    zip: '44002-264',
  },
  items: [
    { productId: 'TEST-PROD-1', quantity: 2, price: 89.95, subtotal: 179.9, product: { name: 'Furadeira de Impacto Bosch 650W', sku: 'BOSCH-GSB-650' } },
  ],
  paymentMethod: 'PIX',
  paidAt: new Date().toISOString(),
  extra: { source: 'admin-webhook-test' },
};

const FAKE_RETURN = {
  returnId: 'TEST-RETURN-ID',
  returnNumber: 'RET-TEST-001',
  orderId: 'TEST-ORDER-ID',
  orderNumber: 'ORD-TEST-001',
  userId: 'TEST-USER-ID',
  reason: 'DEFECTIVE',
  reasonDetails: 'Produto com defeito de fabricação',
  refundAmount: 199.9,
  items: [{ productId: 'TEST-PROD-1', quantity: 1 }],
  createdAt: new Date().toISOString(),
};

type EventResult = { event: string; label: string; ok: boolean; statusCode?: number; error?: string };

// Todos os eventos reais que o sistema dispara
const ALL_EVENTS = [
  'order.PENDING',
  'order.QUOTE',
  'order.CONFIRMED',
  'order.PROCESSING',
  'order.SHIPPED',
  'order.DELIVERED',
  'order.CANCELLED',
  'order.REFUNDED',
  'returns.created',
  'returns.approved',
  'returns.rejected',
  'shipping.label_ready',
] as const;

type EventKey = (typeof ALL_EVENTS)[number];

const EVENT_LABELS: Record<EventKey, string> = {
  'order.PENDING':    'order.status.update — PENDING (pedido criado)',
  'order.QUOTE':      'order.status.update — QUOTE (orçamento)',
  'order.CONFIRMED':  'order.status.update — CONFIRMED (pagamento confirmado)',
  'order.PROCESSING': 'order.status.update — PROCESSING (em separação)',
  'order.SHIPPED':    'order.status.update — SHIPPED (enviado)',
  'order.DELIVERED':  'order.status.update — DELIVERED (entregue)',
  'order.CANCELLED':  'order.status.update — CANCELLED (cancelado)',
  'order.REFUNDED':   'order.status.update — REFUNDED (reembolsado)',
  'returns.created':  'returns.created (devolução aberta)',
  'returns.approved': 'returns.approved (devolução aprovada)',
  'returns.rejected': 'returns.rejected (devolução rejeitada)',
  'shipping.label_ready': 'shipping.label_ready (etiqueta enviada ao cliente)',
};

async function fireEvent(eventKey: EventKey): Promise<EventResult> {
  const label = EVENT_LABELS[eventKey];
  try {
    if (eventKey.startsWith('order.')) {
      const status = eventKey.replace('order.', '') as any;
      await sendOrderStatusUpdate({
        ...FAKE_ORDER,
        status,
        ...(status === 'SHIPPED' ? { trackingCode: 'BR123456789XX', shippedAt: new Date().toISOString() } : {}),
        ...(status === 'DELIVERED' ? { deliveredAt: new Date().toISOString() } : {}),
      });
    } else if (eventKey === 'returns.created') {
      await sendWebhook('returns.created', { ...FAKE_RETURN, status: 'REQUESTED' });
    } else if (eventKey === 'returns.approved') {
      await sendWebhook('returns.approved', { ...FAKE_RETURN, status: 'APPROVED', adminNotes: 'Aprovado via teste' });
    } else if (eventKey === 'returns.rejected') {
      await sendWebhook('returns.rejected', { ...FAKE_RETURN, status: 'REJECTED', adminNotes: 'Rejeitado via teste' });
    } else if (eventKey === 'shipping.label_ready') {
      await sendWebhook('shipping.label_ready', {
        orderId: FAKE_ORDER.orderId,
        orderNumber: FAKE_ORDER.orderNumber,
        userId: FAKE_ORDER.user.id,
        userName: FAKE_ORDER.user.name,
        userEmail: FAKE_ORDER.user.email,
        labelUrl: 'https://melhorenvio.com.br/etiquetas/TEST',
        trackingCode: 'BR123456789XX',
        trackingUrl: 'https://www.correios.com.br/rastreamento/BR123456789XX',
        sentAt: new Date().toISOString(),
      });
    }
    return { event: eventKey, label, ok: true };
  } catch (err) {
    return { event: eventKey, label, ok: false, error: String(err) };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const role = (session.user as { role?: string })?.role;
    if (role !== 'ADMIN' && role !== 'OWNER') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

    const webhookUrl = process.env.N8N_ORDERS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook não configurado. Defina N8N_ORDERS_WEBHOOK_URL ou N8N_WEBHOOK_URL no .env.' },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    // Se vier um evento específico, dispara só ele; senão dispara todos
    const requested: EventKey[] = body.event
      ? [body.event as EventKey]
      : (ALL_EVENTS as unknown as EventKey[]);

    const invalid = requested.filter((e) => !ALL_EVENTS.includes(e));
    if (invalid.length) {
      return NextResponse.json({ error: `Evento(s) inválido(s): ${invalid.join(', ')}` }, { status: 400 });
    }

    const results: EventResult[] = [];
    for (const key of requested) {
      const result = await fireEvent(key);
      results.push(result);
      logger.info({ event: key, ok: result.ok }, '[WEBHOOK_TEST]');
    }

    const allOk = results.every((r) => r.ok);
    return NextResponse.json({
      message: allOk ? 'Todos os eventos enviados com sucesso.' : 'Alguns eventos falharam.',
      results,
    });
  } catch (error) {
    logger.error(error as Error, '[ADMIN_WEBHOOK_TEST]');
    return NextResponse.json({ error: 'Erro ao enviar webhook de teste.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ events: ALL_EVENTS, labels: EVENT_LABELS });
}
