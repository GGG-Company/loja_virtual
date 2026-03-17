import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";
import { 
  createShippingLabelForOrder, 
  printMelhorEnvioLabel,
  getMelhorEnvioOrderStatus 
} from '@/lib/melhorenvio-shipping';

// POST - Gerar etiqueta para um pedido
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verificar se já tem etiqueta
    if (order.melhorEnvioLabelUrl) {
      return NextResponse.json({
        success: true,
        message: 'Etiqueta já gerada anteriormente',
        labelUrl: order.melhorEnvioLabelUrl,
        trackingCode: order.trackingCode,
      });
    }

    // Verificar se tem frete (não é retirada na loja)
    if (order.shipping <= 0) {
      return NextResponse.json({ 
        error: 'Pedido sem frete (retirada na loja)' 
      }, { status: 400 });
    }

    // Gerar etiqueta
    const result = await createShippingLabelForOrder(order.id);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Erro ao gerar etiqueta' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Etiqueta gerada com sucesso',
      labelUrl: result.labelUrl,
      trackingCode: result.trackingCode,
      melhorEnvioOrderId: result.orderId,
    });

  } catch (error) {
    logger.error(error, '[ADMIN_ORDER_LABEL_POST]');
    return NextResponse.json({ error: 'Erro ao gerar etiqueta' }, { status: 500 });
  }
}

// GET - Obter URL de impressão da etiqueta
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        orderNumber: true,
        melhorEnvioOrderId: true,
        melhorEnvioLabelId: true,
        melhorEnvioLabelUrl: true,
        melhorEnvioStatus: true,
        melhorEnvioService: true,
        trackingCode: true,
        trackingUrl: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Se já temos URL, retornar
    if (order.melhorEnvioLabelUrl) {
      return NextResponse.json({
        success: true,
        hasLabel: true,
        labelUrl: order.melhorEnvioLabelUrl,
        trackingCode: order.trackingCode,
        trackingUrl: order.trackingUrl,
        melhorEnvioOrderId: order.melhorEnvioOrderId,
        melhorEnvioStatus: order.melhorEnvioStatus,
        melhorEnvioService: order.melhorEnvioService,
      });
    }

    // Se tem ID do Melhor Envio mas não tem URL, tentar buscar
    if (order.melhorEnvioOrderId) {
      try {
        const printResult = await printMelhorEnvioLabel([order.melhorEnvioOrderId]);
        if (printResult.success && printResult.url) {
          // Atualizar no banco
          await prisma.order.update({
            where: { id: params.id },
            data: { melhorEnvioLabelUrl: printResult.url },
          });

          return NextResponse.json({
            success: true,
            hasLabel: true,
            labelUrl: printResult.url,
            trackingCode: order.trackingCode,
            melhorEnvioOrderId: order.melhorEnvioOrderId,
          });
        }
      } catch (e) {
        logger.error(e, '[LABEL_PRINT_ERROR]');
      }
    }

    return NextResponse.json({
      success: true,
      hasLabel: false,
      melhorEnvioOrderId: order.melhorEnvioOrderId,
      melhorEnvioStatus: order.melhorEnvioStatus,
    });

  } catch (error) {
    logger.error(error, '[ADMIN_ORDER_LABEL_GET]');
    return NextResponse.json({ error: 'Erro ao buscar etiqueta' }, { status: 500 });
  }
}
