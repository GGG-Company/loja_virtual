import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendWebhook } from '@/lib/webhooks';
import logger from '@/lib/logger';
import { toNum } from '@/lib/decimal-helpers';

// Gerar número da devolução
function formatReturnNumber(seq: number) {
  const year = new Date().getFullYear();
  return `DEV-${year}-${String(seq).padStart(6, '0')}`;
}

// Schema de validação para criar devolução
const createReturnSchema = z.object({
  orderId: z.string(),
  reason: z.enum([
    'DEFECTIVE',
    'WRONG_PRODUCT',
    'NOT_AS_DESCRIBED',
    'DAMAGED_SHIPPING',
    'CHANGED_MIND',
    'SIZE_ISSUE',
    'OTHER',
  ]),
  reasonDetails: z.string().optional(),
  items: z.array(z.object({
    orderItemId: z.string(),
    productId: z.string(),
    quantity: z.number().int().positive(),
    reason: z.string().optional(),
  })).min(1),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
});

/**
 * GET /api/returns
 * Listar devoluções do usuário logado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const returns = await prisma.return.findMany({
      where: { userId: user.id },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            createdAt: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, returns });
  } catch (error) {
    logger.error(error as Error, '[RETURNS_LIST]');
    return NextResponse.json({ error: 'Erro ao listar devoluções' }, { status: 500 });
  }
}

/**
 * POST /api/returns
 * Criar nova solicitação de devolução
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createReturnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Dados inválidos', 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { orderId, reason, reasonDetails, items, imageUrl, videoUrl } = parsed.data;

    if (!imageUrl && !videoUrl) {
      return NextResponse.json({ 
        error: 'É obrigatório enviar uma foto ou vídeo mostrando o defeito ou problema do produto.' 
      }, { status: 400 });
    }

    // Verificar se o pedido existe e pertence ao usuário
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verificar se o pedido pode ter devolução (deve estar entregue ou pelo menos enviado)
    if (!['DELIVERED', 'SHIPPED'].includes(order.status)) {
      return NextResponse.json({ 
        error: 'Devolução só pode ser solicitada para pedidos enviados ou entregues' 
      }, { status: 400 });
    }

    // Verificar prazo de 7 dias para arrependimento (CDC)
    const deliveredDate = order.deliveredAt || order.shippedAt || order.createdAt;
    const daysSinceDelivery = Math.floor(
      (Date.now() - new Date(deliveredDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (reason === 'CHANGED_MIND' && daysSinceDelivery > 7) {
      return NextResponse.json({ 
        error: 'O prazo de 7 dias para arrependimento expirou' 
      }, { status: 400 });
    }

    // Verificar se já existe devolução pendente para este pedido
    const existingReturn = await prisma.return.findFirst({
      where: {
        orderId,
        status: {
          notIn: ['REJECTED', 'CANCELLED', 'REFUNDED'],
        },
      },
    });

    if (existingReturn) {
      return NextResponse.json({ 
        error: 'Já existe uma solicitação de devolução em andamento para este pedido',
        returnNumber: existingReturn.returnNumber,
      }, { status: 400 });
    }

    // Validar quantidade solicitada vs quantidade comprada
    for (const item of items) {
      const orderItem = order.items.find(oi => oi.id === item.orderItemId);
      if (!orderItem) {
        return NextResponse.json({ error: 'Item não encontrado no pedido' }, { status: 400 });
      }
      if (item.quantity > orderItem.quantity) {
        return NextResponse.json({
          error: `Quantidade de devolução (${item.quantity}) excede o comprado (${orderItem.quantity})`,
        }, { status: 400 });
      }
    }

    // Calcular valor do reembolso
    let refundAmount = 0;
    for (const item of items) {
      const orderItem = order.items.find(oi => oi.id === item.orderItemId)!;
      refundAmount += toNum(orderItem.price) * item.quantity;
    }

    // Criar devolução com notificação
    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.return.count();
      const returnNumber = formatReturnNumber(count + 1);

      const newReturn = await tx.return.create({
        data: {
          returnNumber,
          orderId,
          userId: user.id,
          status: 'REQUESTED',
          reason,
          reasonDetails,
          refundAmount,
          imageUrl,
          videoUrl,
          items: {
            create: items.map(item => ({
              orderItemId: item.orderItemId,
              productId: item.productId,
              quantity: item.quantity,
              reason: item.reason,
            })),
          },
        },
        include: {
          items: true,
          order: {
            select: { orderNumber: true },
          },
        },
      });

      // Criar notificação para o usuário
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'RETURN_STATUS',
          title: 'Devolução Solicitada',
          message: `Sua solicitação de devolução ${returnNumber} foi criada com sucesso e está aguardando análise.`,
          data: JSON.stringify({
            returnId: newReturn.id,
            returnNumber: newReturn.returnNumber,
            orderId: order.id,
            orderNumber: order.orderNumber,
          }),
        },
      });

      return newReturn;
    });

    // Enviar webhook de forma assíncrona
    try {
      await sendWebhook('returns.created', {
        returnId: result.id,
        returnNumber: result.returnNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: user.id,
        status: 'REQUESTED',
        reason,
        reasonDetails,
        refundAmount,
        items: result.items,
        imageUrl,
        videoUrl,
        createdAt: result.createdAt,
      });
    } catch (webhookError) {
      logger.error(webhookError as Error, '[RETURNS_WEBHOOK_ERROR]');
      // Não falha a requisição se o webhook falhar
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Solicitação de devolução criada com sucesso',
      return: result,
    }, { status: 201 });

  } catch (error) {
    logger.error(error as Error, '[RETURNS_CREATE]');
    return NextResponse.json({ error: 'Erro ao criar devolução' }, { status: 500 });
  }
}
