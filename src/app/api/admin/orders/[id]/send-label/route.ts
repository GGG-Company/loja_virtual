import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendWebhook } from '@/lib/webhooks';
import logger from "@/lib/logger";

/**
 * POST /api/admin/orders/[id]/send-label
 * Enviar etiqueta de envio para o cliente via webhook e notificação
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se é admin ou owner
    if (!['ADMIN', 'OWNER'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verificar se tem etiqueta gerada
    if (!order.melhorEnvioLabelUrl) {
      return NextResponse.json(
        { error: 'Etiqueta de envio não foi gerada ainda' },
        { status: 400 }
      );
    }

    // Criar notificação para o cliente
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: 'ORDER_STATUS',
        title: 'Etiqueta de Envio Disponível',
        message: `Seu pedido ${order.orderNumber} já saiu para entrega! Clique aqui para visualizar/imprimir a etiqueta de rastreamento.`,
        data: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          labelUrl: order.melhorEnvioLabelUrl,
          trackingCode: order.trackingCode,
        }),
      },
    });

    // Enviar webhook
    try {
      await sendWebhook('shipping.label_ready', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        userName: order.user.name,
        userEmail: order.user.email,
        labelUrl: order.melhorEnvioLabelUrl,
        trackingCode: order.trackingCode,
        trackingUrl: order.trackingUrl,
        sentAt: new Date(),
        sentBy: user.id,
      });
    } catch (webhookError) {
      logger.error(webhookError as Error, '[SEND_LABEL_WEBHOOK_ERROR]');
      // Não falha a requisição se o webhook falhar
    }

    return NextResponse.json({
      success: true,
      message: 'Etiqueta enviada para o cliente com sucesso',
    });
  } catch (error) {
    logger.error(error as Error, '[SEND_LABEL]');
    return NextResponse.json(
      { error: 'Erro ao enviar etiqueta' },
      { status: 500 }
    );
  }
}
