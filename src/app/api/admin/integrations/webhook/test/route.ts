import path from 'path';
import { config as loadEnv } from 'dotenv';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendOrderStatusUpdate, sendWebhook } from '@/lib/webhooks';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

loadEnv({ path: path.join(process.cwd(), '.env') });

// ── Dados fictícios base ──────────────────────────────────────────────────────

const NOW = new Date().toISOString();
const YEAR = new Date().getFullYear();

const FAKE_USER = {
  id: 'TEST-USER-ID',
  name: 'João Silva (Teste)',
  email: 'webhook+teste@feiradeferramentas.com.br',
  phone: '(75) 98159-8195',
};

const FAKE_ITEMS = [
  {
    id: 'TEST-ITEM-1',
    productId: 'TEST-PROD-1',
    quantity: 2,
    price: 89.95,
    discount: 0,
    subtotal: 179.90,
    product: { id: 'TEST-PROD-1', name: 'Furadeira de Impacto Bosch 650W', sku: 'BOSCH-GSB-650', imageUrl: null },
  },
  {
    id: 'TEST-ITEM-2',
    productId: 'TEST-PROD-2',
    quantity: 1,
    price: 49.90,
    discount: 0,
    subtotal: 49.90,
    product: { id: 'TEST-PROD-2', name: 'Disco de Corte Inox 4.1/2"', sku: 'DISCO-INOX-45', imageUrl: null },
  },
];

const FAKE_SHIPPING_ADDRESS = {
  street: 'Rua Vitorino Gouveia, 35',
  complement: 'Loja A',
  neighborhood: 'Centro',
  city: 'Feira de Santana',
  state: 'BA',
  country: 'BR',
  zip: '44002-264',
};

const FAKE_RETURN = {
  returnId: 'TEST-RETURN-ID',
  returnNumber: `RET-${YEAR}-000001`,
  orderId: 'TEST-ORDER-ID',
  orderNumber: `ORD-${YEAR}-000001`,
  userId: FAKE_USER.id,
  userName: FAKE_USER.name,
  userEmail: FAKE_USER.email,
};

// ── Payloads exatos por evento (mesmos campos das rotas reais) ────────────────

type EventKey =
  | 'order.PENDING'
  | 'order.QUOTE'
  | 'order.CONFIRMED'
  | 'order.PROCESSING'
  | 'order.SHIPPED'
  | 'order.DELIVERED'
  | 'order.CANCELLED'
  | 'order.REFUNDED'
  | 'returns.created'
  | 'returns.approved'
  | 'returns.rejected'
  | 'shipping.label_ready';

const ALL_EVENTS: EventKey[] = [
  'order.PENDING', 'order.QUOTE', 'order.CONFIRMED', 'order.PROCESSING',
  'order.SHIPPED', 'order.DELIVERED', 'order.CANCELLED', 'order.REFUNDED',
  'returns.created', 'returns.approved', 'returns.rejected', 'shipping.label_ready',
];

const EVENT_LABELS: Record<EventKey, string> = {
  'order.PENDING':        'order.status.update — PENDING (pedido criado)',
  'order.QUOTE':          'order.status.update — QUOTE (orçamento)',
  'order.CONFIRMED':      'order.status.update — CONFIRMED (pagamento confirmado)',
  'order.PROCESSING':     'order.status.update — PROCESSING (em separação)',
  'order.SHIPPED':        'order.status.update — SHIPPED (enviado)',
  'order.DELIVERED':      'order.status.update — DELIVERED (entregue)',
  'order.CANCELLED':      'order.status.update — CANCELLED (cancelado)',
  'order.REFUNDED':       'order.status.update — REFUNDED (reembolsado)',
  'returns.created':      'returns.created (devolução aberta)',
  'returns.approved':     'returns.approved (devolução aprovada)',
  'returns.rejected':     'returns.rejected (devolução rejeitada)',
  'shipping.label_ready': 'shipping.label_ready (etiqueta enviada ao cliente)',
};

type EventResult = { event: EventKey; label: string; ok: boolean; error?: string };

async function fireEvent(key: EventKey): Promise<EventResult> {
  const label = EVENT_LABELS[key];
  const orderId = 'TEST-ORDER-ID';
  const orderNumber = `ORD-${YEAR}-000001`;
  const total = 229.80;

  try {
    switch (key) {
      // ── PENDING: campos enviados em src/app/api/orders/route.ts ──────────
      case 'order.PENDING':
        await sendOrderStatusUpdate({
          orderId,
          orderNumber,
          status: 'PENDING',
          total,
          user: FAKE_USER,
          paymentMethod: 'PIX',
          shippingAddress: FAKE_SHIPPING_ADDRESS,
          items: FAKE_ITEMS,
        });
        break;

      // ── QUOTE: campos enviados em src/app/api/orders/quote/route.ts ──────
      case 'order.QUOTE':
        await sendOrderStatusUpdate({
          orderId,
          orderNumber,
          status: 'QUOTE',
          total,
          user: FAKE_USER,
          shippingAddress: FAKE_SHIPPING_ADDRESS,
          items: FAKE_ITEMS,
          extra: { validityDays: 7 },
        });
        break;

      // ── CONFIRMED: campos de src/app/api/orders/[id]/payment/route.ts ───
      case 'order.CONFIRMED':
        await sendOrderStatusUpdate({
          orderId,
          orderNumber,
          status: 'CONFIRMED',
          total,
          user: FAKE_USER,
          paymentMethod: 'PIX',
          paidAt: NOW,
          items: FAKE_ITEMS,
        });
        break;

      // ── PROCESSING: campos de src/app/api/admin/picking/[id]/route.ts ───
      case 'order.PROCESSING':
        await sendOrderStatusUpdate({
          orderId,
          orderNumber,
          status: 'PROCESSING',
          total,
          user: FAKE_USER,
          shippedAt: null,
          trackingCode: null,
          trackingUrl: null,
          items: FAKE_ITEMS,
        });
        break;

      // ── SHIPPED: campos de src/app/api/admin/picking/[id]/route.ts ──────
      case 'order.SHIPPED':
        await sendOrderStatusUpdate({
          orderId,
          orderNumber,
          status: 'SHIPPED',
          total,
          user: FAKE_USER,
          shippedAt: NOW,
          trackingCode: 'BR123456789XX',
          trackingUrl: 'https://www.melhorrastreio.com.br/rastreio/BR123456789XX',
          items: FAKE_ITEMS,
        });
        break;

      // ── DELIVERED: campos de confirm-delivery/route.ts ───────────────────
      case 'order.DELIVERED':
        await sendOrderStatusUpdate({
          orderId,
          orderNumber,
          status: 'DELIVERED',
          total,
          user: FAKE_USER,
          deliveredAt: NOW,
          items: FAKE_ITEMS,
        });
        break;

      // ── CANCELLED: campos de src/app/api/user/orders/[id]/route.ts ──────
      case 'order.CANCELLED':
        await sendOrderStatusUpdate({
          orderId,
          orderNumber,
          status: 'CANCELLED',
          total,
          user: FAKE_USER,
          items: FAKE_ITEMS,
        });
        break;

      // ── REFUNDED: campos de src/lib/webhook-processor.ts ────────────────
      case 'order.REFUNDED':
        await sendOrderStatusUpdate({
          orderId,
          orderNumber,
          status: 'REFUNDED',
          total,
          user: FAKE_USER,
          paymentMethod: 'PIX',
          items: FAKE_ITEMS,
        });
        break;

      // ── returns.created: campos de src/app/api/returns/route.ts ─────────
      case 'returns.created':
        await sendWebhook('returns.created', {
          ...FAKE_RETURN,
          status: 'REQUESTED',
          reason: 'DEFECTIVE',
          reasonDetails: 'Produto com defeito de fabricação (teste)',
          refundAmount: total,
          items: [{ productId: 'TEST-PROD-1', quantity: 1 }],
          imageUrl: null,
          videoUrl: null,
          createdAt: NOW,
        });
        break;

      // ── returns.approved: campos de src/app/api/returns/[id]/approve ────
      case 'returns.approved':
        await sendWebhook('returns.approved', {
          ...FAKE_RETURN,
          status: 'APPROVED',
          refundAmount: total,
          items: [{ productId: 'TEST-PROD-1', quantity: 1 }],
          adminNotes: 'Aprovado — produto com defeito confirmado (teste)',
          approvedAt: NOW,
          approvedBy: 'TEST-ADMIN-ID',
        });
        break;

      // ── returns.rejected: campos de src/app/api/returns/[id]/approve ────
      case 'returns.rejected':
        await sendWebhook('returns.rejected', {
          ...FAKE_RETURN,
          status: 'REJECTED',
          adminNotes: 'Rejeitado — fora do prazo de devolução (teste)',
          rejectedAt: NOW,
          rejectedBy: 'TEST-ADMIN-ID',
        });
        break;

      // ── shipping.label_ready: campos de admin/orders/[id]/send-label ────
      case 'shipping.label_ready':
        await sendWebhook('shipping.label_ready', {
          orderId,
          orderNumber,
          userId: FAKE_USER.id,
          userName: FAKE_USER.name,
          userEmail: FAKE_USER.email,
          labelUrl: 'https://melhorenvio.com.br/etiquetas/TEST-LABEL',
          trackingCode: 'BR123456789XX',
          trackingUrl: 'https://www.melhorrastreio.com.br/rastreio/BR123456789XX',
          sentAt: NOW,
          sentBy: 'TEST-ADMIN-ID',
        });
        break;
    }

    return { event: key, label, ok: true };
  } catch (err) {
    return { event: key, label, ok: false, error: String(err) };
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const role = (session.user as { role?: string })?.role;
    if (role !== 'ADMIN' && role !== 'OWNER') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

    const webhookUrl = process.env.N8N_ORDERS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook não configurado. Defina N8N_ORDERS_WEBHOOK_URL no .env.' },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const requested: EventKey[] = body.event
      ? [body.event as EventKey]
      : ALL_EVENTS;

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
