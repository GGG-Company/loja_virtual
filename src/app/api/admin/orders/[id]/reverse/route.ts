import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";
import {
  addReverseToMelhorEnvioCart,
  createReverseShippingForOrder,
  checkoutMelhorEnvio,
  generateMelhorEnvioLabel,
  printMelhorEnvioLabel,
} from '@/lib/melhorenvio-shipping';

/**
 * POST /api/admin/orders/[id]/reverse
 * Criar logística reversa para um pedido
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
    const { 
      newSenderEmail, 
      newSenderPhone,
      mode = 'auto', // 'auto' = usa ID do pedido original, 'manual' = dados completos
      // Dados para modo manual (envio original não foi pelo Melhor Envio)
      from,
      to,
      products,
      packageData,
      serviceId = 1, // 1 = PAC, 2 = SEDEX
    } = body;

    logger.info({
      orderId: params.id,
      mode,
      newSenderEmail,
      newSenderPhone,
    }, '[ADMIN_REVERSE] Solicitação de logística reversa');

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, weight: true, dimensions: true, price: true }
            }
          }
        },
        user: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Modo automático: usa o ID do Melhor Envio do pedido original
    if (mode === 'auto') {
      if (!order.melhorEnvioOrderId) {
        return NextResponse.json({ 
          error: 'Pedido não possui etiqueta do Melhor Envio. Use modo manual.' 
        }, { status: 400 });
      }

      if (!newSenderEmail || !newSenderPhone) {
        return NextResponse.json({ 
          error: 'Email e telefone do novo remetente são obrigatórios' 
        }, { status: 400 });
      }

      const result = await createReverseShippingForOrder(
        params.id,
        newSenderEmail,
        newSenderPhone
      );

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Logística reversa criada com sucesso' : result.error,
        data: result,
      });
    }

    // Modo manual: dados completos para envio que não foi pelo Melhor Envio
    if (mode === 'manual') {
      if (!from || !to || !products || !packageData) {
        return NextResponse.json({ 
          error: 'Dados incompletos. Informe: from, to, products e packageData' 
        }, { status: 400 });
      }

      if (!newSenderEmail || !newSenderPhone) {
        return NextResponse.json({ 
          error: 'Email e telefone do novo remetente são obrigatórios' 
        }, { status: 400 });
      }

      // Calcular valor segurado
      const insuranceValue = products.reduce(
        (sum: number, p: any) => sum + (p.unitary_value * p.quantity), 
        0
      );

      const cartResult = await addReverseToMelhorEnvioCart({
        serviceId: serviceId as 1 | 2,
        newSenderEmail,
        newSenderPhone,
        insuranceValue,
        from,
        to,
        products,
        package: packageData,
      });

      if (!cartResult.success || !cartResult.orderId) {
        return NextResponse.json({
          success: false,
          error: cartResult.error,
          data: cartResult,
        }, { status: 400 });
      }

      // Fazer checkout
      const checkoutResult = await checkoutMelhorEnvio([cartResult.orderId]);
      if (!checkoutResult.success) {
        return NextResponse.json({
          success: false,
          error: checkoutResult.error,
          data: { cart: cartResult, checkout: checkoutResult },
        }, { status: 400 });
      }

      // Verificar se é sandbox
      const isSandbox = (process.env.MELHOR_ENVIO_SANDBOX || 'true').toLowerCase() !== 'false';
      
      if (isSandbox) {
        return NextResponse.json({
          success: true,
          message: 'Logística reversa adicionada ao carrinho (Sandbox: geração de etiqueta não disponível)',
          data: {
            orderId: cartResult.orderId,
            status: 'pending_reverse_sandbox',
            warning: 'Em sandbox, não é possível gerar a etiqueta de devolução. Use produção.',
          },
        });
      }

      // Gerar etiqueta em produção
      const generateResult = await generateMelhorEnvioLabel([cartResult.orderId]);
      if (!generateResult.success) {
        return NextResponse.json({
          success: false,
          error: generateResult.error,
          data: { cart: cartResult, checkout: checkoutResult, generate: generateResult },
        }, { status: 400 });
      }

      // Obter URL de impressão
      const printResult = await printMelhorEnvioLabel([cartResult.orderId]);

      return NextResponse.json({
        success: true,
        message: 'Logística reversa criada com sucesso',
        data: {
          orderId: cartResult.orderId,
          trackingCode: generateResult.trackingCode,
          labelUrl: printResult.url,
          status: 'generated_reverse',
        },
      });
    }

    return NextResponse.json({ error: 'Modo inválido. Use "auto" ou "manual"' }, { status: 400 });

  } catch (error) {
    logger.error(error, '[ADMIN_REVERSE]');
    return NextResponse.json({ error: 'Erro ao processar logística reversa' }, { status: 500 });
  }
}
