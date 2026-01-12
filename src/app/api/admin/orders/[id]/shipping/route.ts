import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  createShippingLabelForOrder,
  printMelhorEnvioLabel,
  previewMelhorEnvioLabel,
  getMelhorEnvioOrderStatus,
  generateMelhorEnvioLabel,
  checkoutMelhorEnvio,
} from '@/lib/melhorenvio-shipping';

/**
 * GET /api/admin/orders/[id]/shipping
 * Retorna dados da etiqueta de envio do pedido
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        trackingCode: true,
        trackingUrl: true,
        melhorEnvioOrderId: true,
        melhorEnvioLabelId: true,
        melhorEnvioStatus: true,
        melhorEnvioService: true,
        melhorEnvioLabelUrl: true,
        shippingServiceId: true,
        shippingAddress: true,
        shipping: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Se tem ID do Melhor Envio, buscar status atualizado
    let melhorEnvioDetails = null;
    if (order.melhorEnvioOrderId) {
      const statusResult = await getMelhorEnvioOrderStatus(order.melhorEnvioOrderId);
      if (statusResult.success) {
        melhorEnvioDetails = {
          status: statusResult.status,
          tracking: statusResult.tracking,
          raw: statusResult.rawResponse,
        };
      }
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        trackingCode: order.trackingCode,
        trackingUrl: order.trackingUrl,
        shipping: order.shipping,
        shippingAddress: order.shippingAddress,
        shippingServiceId: order.shippingServiceId,
      },
      melhorEnvio: {
        orderId: order.melhorEnvioOrderId,
        labelId: order.melhorEnvioLabelId,
        status: order.melhorEnvioStatus,
        service: order.melhorEnvioService,
        labelUrl: order.melhorEnvioLabelUrl,
        details: melhorEnvioDetails,
      },
    });
  } catch (error) {
    console.error('[ADMIN_SHIPPING_GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar dados de envio' }, { status: 500 });
  }
}

/**
 * POST /api/admin/orders/[id]/shipping
 * Ações: criar etiqueta, gerar, imprimir, etc.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    console.log('[ADMIN_SHIPPING] Ação solicitada:', action, 'para pedido:', params.id);

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        orderNumber: true,
        melhorEnvioOrderId: true,
        melhorEnvioStatus: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    switch (action) {
      case 'create_label': {
        // Criar etiqueta completa (adicionar ao carrinho + checkout + gerar)
        console.log('[ADMIN_SHIPPING] Criando etiqueta para pedido:', order.orderNumber);
        const result = await createShippingLabelForOrder(params.id);
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            message: 'Etiqueta criada com sucesso',
            data: result,
          });
        } else {
          return NextResponse.json({
            success: false,
            error: result.error,
            data: result,
          }, { status: 400 });
        }
      }

      case 'checkout': {
        // Apenas fazer checkout (comprar frete)
        if (!order.melhorEnvioOrderId) {
          return NextResponse.json({ error: 'Pedido não está no carrinho do Melhor Envio' }, { status: 400 });
        }
        const result = await checkoutMelhorEnvio([order.melhorEnvioOrderId]);
        return NextResponse.json({ success: result.success, error: result.error, data: result });
      }

      case 'generate': {
        // Apenas gerar etiqueta
        if (!order.melhorEnvioOrderId) {
          return NextResponse.json({ error: 'Pedido não está no carrinho do Melhor Envio' }, { status: 400 });
        }
        const result = await generateMelhorEnvioLabel([order.melhorEnvioOrderId]);
        
        if (result.success && result.trackingCode) {
          await prisma.order.update({
            where: { id: params.id },
            data: {
              trackingCode: result.trackingCode,
              melhorEnvioStatus: 'generated',
            },
          });
        }
        
        return NextResponse.json({ success: result.success, error: result.error, data: result });
      }

      case 'print': {
        // Obter URL de impressão
        if (!order.melhorEnvioOrderId) {
          return NextResponse.json({ error: 'Etiqueta não encontrada' }, { status: 400 });
        }
        const mode = body.mode === 'public' ? 'public' : 'private';
        const result = await printMelhorEnvioLabel([order.melhorEnvioOrderId], mode);
        
        if (result.success && result.url) {
          await prisma.order.update({
            where: { id: params.id },
            data: { melhorEnvioLabelUrl: result.url },
          });
        }
        
        return NextResponse.json({ success: result.success, url: result.url, error: result.error });
      }

      case 'preview': {
        // Pré-visualizar etiqueta
        if (!order.melhorEnvioOrderId) {
          return NextResponse.json({ error: 'Pedido não está no carrinho do Melhor Envio' }, { status: 400 });
        }
        const result = await previewMelhorEnvioLabel([order.melhorEnvioOrderId]);
        return NextResponse.json({ success: result.success, url: result.url, error: result.error });
      }

      case 'status': {
        // Consultar status
        if (!order.melhorEnvioOrderId) {
          return NextResponse.json({ error: 'Etiqueta não encontrada' }, { status: 400 });
        }
        const result = await getMelhorEnvioOrderStatus(order.melhorEnvioOrderId);
        
        if (result.success) {
          await prisma.order.update({
            where: { id: params.id },
            data: {
              melhorEnvioStatus: result.status,
              trackingCode: result.tracking || undefined,
            },
          });
        }
        
        return NextResponse.json({ success: result.success, status: result.status, tracking: result.tracking, error: result.error });
      }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    console.error('[ADMIN_SHIPPING_POST]', error);
    return NextResponse.json({ error: 'Erro ao processar ação de envio' }, { status: 500 });
  }
}
