import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createHiperOrder, getHiperOrder, cancelHiperOrder } from '@/lib/hiper';
import { toNum } from '@/lib/decimal-helpers';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === 'ADMIN' || role === 'OWNER';
}

// GET — consulta o status do pedido no Hiper
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { hiperOrderId: true, orderNumber: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  if (!order.hiperOrderId) {
    return NextResponse.json({ error: 'Pedido não enviado ao Hiper' }, { status: 404 });
  }

  const hiperData = await getHiperOrder(order.hiperOrderId);
  if (!hiperData) {
    return NextResponse.json({ error: 'Falha ao consultar Hiper' }, { status: 502 });
  }

  return NextResponse.json({ hiperOrderId: order.hiperOrderId, orderNumber: order.orderNumber, hiper: hiperData });
}

// POST — envia (ou reenvia) o pedido ao Hiper
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: {
          product: { select: { id: true, name: true, externalIdHiper: true } },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  const addr = order.shippingAddress as any;

  const itemsWithHiper = order.items.filter((i) => i.product.externalIdHiper);
  const itemsWithoutHiper = order.items.filter((i) => !i.product.externalIdHiper).map((i) => i.product.name);

  if (!itemsWithHiper.length) {
    return NextResponse.json({
      error: 'Nenhum item possui vínculo com produto do Hiper. Sincronize os produtos primeiro.',
      missing: itemsWithoutHiper,
    }, { status: 400 });
  }

  const result = await createHiperOrder({
    orderNumber: order.orderNumber,
    total: toNum(order.total),
    shipping: toNum(order.shipping),
    installments: order.installments,
    paymentMethod: order.paymentMethod,
    customer: {
      name: order.user?.name || addr?.name || 'Cliente',
      email: order.user?.email || addr?.email || '',
      cpf: addr?.cpf || '',
    },
    address: {
      street: addr?.street || '',
      number: addr?.number || 'S/N',
      complement: addr?.complement,
      neighborhood: addr?.neighborhood || '',
      city: addr?.city || '',
      state: addr?.state || '',
      zip: addr?.zip || '',
    },
    items: itemsWithHiper.map((item) => ({
      hiperProductId: item.product.externalIdHiper!,
      quantity: item.quantity,
      unitPrice: toNum(item.price),
      netPrice: toNum(item.subtotal) / item.quantity,
    })),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { hiperOrderId: result.hiperOrderId },
  });

  logger.info('[HIPER_ORDER] Pedido %s enviado manualmente → hiper:%s', order.orderNumber, result.hiperOrderId);

  return NextResponse.json({
    ok: true,
    hiperOrderId: result.hiperOrderId,
    skippedItems: itemsWithoutHiper,
  });
}

// DELETE — cancela o pedido no Hiper
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { hiperOrderId: true, orderNumber: true },
  });

  if (!order?.hiperOrderId) {
    return NextResponse.json({ error: 'Pedido não vinculado ao Hiper' }, { status: 404 });
  }

  const result = await cancelHiperOrder(order.hiperOrderId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
