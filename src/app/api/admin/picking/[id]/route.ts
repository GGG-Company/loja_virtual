import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { notifyOrderStatusChange } from '@/lib/notifications';
import type { OrderStatus } from '@/lib/i18n';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    if (role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { status, trackingCode, trackingUrl } = body as {
      status: 'PROCESSING' | 'SHIPPED';
      trackingCode?: string;
      trackingUrl?: string;
    };

    if (!status) {
      return NextResponse.json({ error: 'Status é obrigatório' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { 
        status: true, 
        trackingCode: true, 
        trackingUrl: true,
        melhorEnvioLabelUrl: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Regras simples de transição
    const fromStatus = order.status;
    if (status === 'PROCESSING' && fromStatus !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Só pedidos confirmados podem ir para separação' }, { status: 400 });
    }

    if (status === 'SHIPPED' && !['CONFIRMED', 'PROCESSING'].includes(fromStatus)) {
      return NextResponse.json({ error: 'Só pedidos confirmados ou em separação podem ser enviados' }, { status: 400 });
    }

    // Se não foi informado código de rastreio, usar o existente do pedido (gerado pelo Melhor Envio)
    const finalTrackingCode = trackingCode || order.trackingCode || undefined;
    
    // Gerar URL de rastreio se tiver código mas não tiver URL
    let finalTrackingUrl = trackingUrl || order.trackingUrl || undefined;
    if (finalTrackingCode && !finalTrackingUrl) {
      finalTrackingUrl = `https://www.melhorrastreio.com.br/rastreio/${finalTrackingCode}`;
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        shippedAt: status === 'SHIPPED' ? new Date() : undefined,
        trackingCode: status === 'SHIPPED' ? finalTrackingCode : undefined,
        trackingUrl: status === 'SHIPPED' ? finalTrackingUrl : undefined,
      },
      include: {
        user: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, imageUrl: true }
            }
          }
        }
      },
    });

    await sendOrderStatusUpdate({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status,
      shippedAt: updated.shippedAt,
      trackingCode: updated.trackingCode,
      trackingUrl: updated.trackingUrl,
      user: updated.user,
      total: updated.total,
      items: updated.items,
    });

    // Criar notificação para o usuário
    await notifyOrderStatusChange({
      userId: updated.userId,
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: status as OrderStatus,
      trackingCode: updated.trackingCode,
      trackingUrl: updated.trackingUrl,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[ADMIN_PICKING_UPDATE]', error);
    return NextResponse.json({ error: 'Erro ao atualizar status do pedido' }, { status: 500 });
  }
}
