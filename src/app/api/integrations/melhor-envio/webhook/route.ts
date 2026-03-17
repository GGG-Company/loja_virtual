import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusUpdate } from '@/lib/webhooks';
import { notifyOrderStatusChange } from '@/lib/notifications';
import type { OrderStatus } from '@/lib/i18n';

/**
 * Webhook do Melhor Envio para atualizar status de entrega
 * 
 * Como ativar:
 * 1. Vá para https://www.melhorenvio.com.br/configuracoes/webhooks
 * 2. Adicione este endpoint: https://seu-dominio.com/api/integrations/melhor-envio/webhook
 * 3. Selecione os eventos que deseja receber (ex: "shipment:delivery")
 * 4. Copie o token de verificação exibido
 * 5. Cole o token em: process.env.MELHOR_ENVIO_WEBHOOK_TOKEN
 * 
 * Eventos esperados:
 * - shipment:posted (Enviado)
 * - shipment:in_transit (Em trânsito)
 * - shipment:delivered (Entregue) ← Este atualiza o status para DELIVERED
 * - shipment:expired (Expirado)
 * - shipment:exception (Exceção/Problema)
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    logger.info('[MELHOR_ENVIO_WEBHOOK] Notificação recebida:', {
      event: body.type,
      serviceOrder: body.data?.service_order,
      status: body.data?.status,
    });

    // Validar token de segurança (opcional, mas recomendado)
    const webhookToken = process.env.MELHOR_ENVIO_WEBHOOK_TOKEN;
    if (webhookToken) {
      const headerToken = req.headers.get('x-webhook-token');
      if (headerToken !== webhookToken) {
        logger.warn('[MELHOR_ENVIO_WEBHOOK] Token inválido');
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
    }

    const { type, data } = body;

    // Se não temos código de rastreamento, não conseguimos atualizar
    if (!data?.service_order) {
      logger.warn('[MELHOR_ENVIO_WEBHOOK] service_order não encontrado');
      return NextResponse.json({ received: true });
    }

    const trackingCode = String(data.service_order);

    // Encontrar pedido pelo código de rastreamento
    const order = await prisma.order.findFirst({
      where: {
        trackingCode: {
          contains: trackingCode,
        },
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

    if (!order) {
      logger.warn('[MELHOR_ENVIO_WEBHOOK] Pedido não encontrado para tracking:', trackingCode);
      return NextResponse.json({ received: true });
    }

    // Mapear eventos do Melhor Envio para status do pedido
    let orderStatus = order.status;
    let shouldUpdate = false;

    switch (type) {
      case 'shipment:posted':
        // Pacote foi postado no Melhor Envio
        if (order.status !== 'SHIPPED' && order.status !== 'DELIVERED') {
          orderStatus = 'SHIPPED';
          shouldUpdate = true;
        }
        break;

      case 'shipment:in_transit':
        // Pacote está em trânsito
        if (order.status !== 'SHIPPED' && order.status !== 'DELIVERED') {
          orderStatus = 'SHIPPED';
          shouldUpdate = true;
        }
        break;

      case 'shipment:delivered':
        // Pacote foi entregue
        if (order.status !== 'DELIVERED') {
          orderStatus = 'DELIVERED';
          shouldUpdate = true;
        }
        break;

      case 'shipment:expired':
        // Pacote expirou (não foi retirado)
        if (order.status !== 'CANCELLED') {
          orderStatus = 'CANCELLED';
          shouldUpdate = true;
        }
        break;

      case 'shipment:exception':
        // Exceção/Problema na entrega
        // Não muda o status automaticamente, apenas registra
        logger.warn('[MELHOR_ENVIO_WEBHOOK] Exceção na entrega:', {
          trackingCode,
          reason: data.reason,
          message: data.message,
        });
        break;

      default:
        console.info('[MELHOR_ENVIO_WEBHOOK] Evento não mapeado:', type);
    }

    // Atualizar status se necessário
    if (shouldUpdate) {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: orderStatus,
          deliveredAt: orderStatus === 'DELIVERED' ? new Date() : undefined,
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

      // Disparar webhook do n8n com atualização de entrega
      await sendOrderStatusUpdate({
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: orderStatus as any,
        total: updated.total,
        user: updated.user,
        paymentMethod: updated.paymentMethod,
        trackingCode: updated.trackingCode,
        trackingUrl: updated.trackingUrl,
        deliveredAt: updated.deliveredAt,
        items: updated.items,
        extra: {
          source: 'melhor_envio',
          event: type,
          melhorEnvioStatus: data.status,
        },
      });

      // Notificar o cliente sobre a mudança de status
      await notifyOrderStatusChange({
        userId: updated.userId,
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: orderStatus as OrderStatus,
        trackingCode: updated.trackingCode,
        trackingUrl: updated.trackingUrl,
      });

      console.info('[MELHOR_ENVIO_WEBHOOK] Pedido atualizado:', {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: orderStatus,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error(error, '[MELHOR_ENVIO_WEBHOOK] Erro ao processar:');
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}
