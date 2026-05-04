import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import logger from '@/lib/logger';
import { toNum, serializeItems } from '@/lib/decimal-helpers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    if (role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { action } = await req.json() as { action: 'approve' | 'reject' };
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action deve ser "approve" ou "reject"' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, paymentId: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (!order.paymentId?.startsWith('sandbox-pending-')) {
      return NextResponse.json(
        { error: 'Este pedido não é um sandbox pendente' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'CONFIRMED' : 'CANCELLED';
    const newPaymentStatus = action === 'approve' ? 'approved' : 'rejected';
    const simulatedPaymentId = `sandbox-simulated-${action}-${id}`;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus as any,
        paymentId: simulatedPaymentId,
        paymentStatus: newPaymentStatus,
        ...(action === 'approve' ? { paidAt: new Date() } : {}),
      },
      include: {
        user: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, imageUrl: true },
            },
          },
        },
      },
    });

    await sendOrderStatusUpdate({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status as any,
      total: toNum(updated.total),
      user: updated.user,
      paymentMethod: updated.paymentMethod,
      paidAt: updated.paidAt,
      items: serializeItems(updated.items),
    });

    logger.info(
      { orderId: id, action, newStatus, simulatedPaymentId },
      '[ADMIN] Sandbox payment simulation',
    );

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    logger.error(error as Error, '[ADMIN_SIMULATE_PAYMENT]');
    return NextResponse.json({ error: 'Erro ao simular pagamento' }, { status: 500 });
  }
}
