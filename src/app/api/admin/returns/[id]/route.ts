import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createReverseShippingForOrder } from '@/lib/melhorenvio-shipping';
import { notifyReturnStatusChange } from '@/lib/notifications';
import type { ReturnStatus } from '@/lib/i18n';

/**
 * GET /api/admin/returns/[id]
 * Obter detalhes de uma devolução
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const returnRequest = await prisma.return.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, imageUrl: true, price: true },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            addressZip: true,
            addressStreet: true,
            addressNumber: true,
            addressComplement: true,
            addressNeighborhood: true,
            addressCity: true,
            addressState: true,
          },
        },
        items: true,
      },
    });

    if (!returnRequest) {
      return NextResponse.json({ error: 'Devolução não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, return: returnRequest });
  } catch (error) {
    logger.error(error, '[ADMIN_RETURN_GET]');
    return NextResponse.json({ error: 'Erro ao buscar devolução' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/returns/[id]
 * Atualizar status da devolução (admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!adminUser || (adminUser.role !== 'ADMIN' && adminUser.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { action, adminNotes, refundMethod, refundAmount } = body;

    const returnRequest = await prisma.return.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (!returnRequest) {
      return NextResponse.json({ error: 'Devolução não encontrada' }, { status: 404 });
    }

    const shippingAddr = returnRequest.order.shippingAddress as any;

    // Ações disponíveis
    switch (action) {
      case 'approve': {
        // Aprovar devolução
        if (!['REQUESTED', 'PENDING_REVIEW'].includes(returnRequest.status)) {
          return NextResponse.json({ error: 'Status inválido para aprovação' }, { status: 400 });
        }

        const updated = await prisma.return.update({
          where: { id: params.id },
          data: {
            status: 'APPROVED',
            adminNotes,
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
          },
        });

        // Notificar o cliente
        await notifyReturnStatusChange({
          userId: returnRequest.user.id,
          returnId: updated.id,
          returnNumber: updated.returnNumber,
          orderId: returnRequest.orderId,
          status: 'APPROVED' as ReturnStatus,
        });

        return NextResponse.json({
          success: true,
          message: 'Devolução aprovada. Próximo passo: gerar etiqueta reversa.',
          return: updated,
        });
      }

      case 'reject': {
        // Rejeitar devolução
        if (!['REQUESTED', 'PENDING_REVIEW'].includes(returnRequest.status)) {
          return NextResponse.json({ error: 'Status inválido para rejeição' }, { status: 400 });
        }

        if (!adminNotes) {
          return NextResponse.json({ error: 'Informe o motivo da rejeição' }, { status: 400 });
        }

        const updated = await prisma.return.update({
          where: { id: params.id },
          data: {
            status: 'REJECTED',
            adminNotes,
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
          },
        });

        // Notificar o cliente
        await notifyReturnStatusChange({
          userId: returnRequest.user.id,
          returnId: updated.id,
          returnNumber: updated.returnNumber,
          orderId: returnRequest.orderId,
          status: 'REJECTED' as ReturnStatus,
        });

        return NextResponse.json({
          success: true,
          message: 'Devolução rejeitada',
          return: updated,
        });
      }

      case 'generate_label': {
        // Gerar etiqueta de logística reversa
        if (returnRequest.status !== 'APPROVED') {
          return NextResponse.json({ error: 'Devolução precisa estar aprovada' }, { status: 400 });
        }

        // Verificar se o pedido original tem ID no Melhor Envio
        if (!returnRequest.order.melhorEnvioOrderId) {
          return NextResponse.json({ 
            error: 'Pedido original não possui etiqueta do Melhor Envio. Use logística manual.' 
          }, { status: 400 });
        }

        // Dados do cliente (que vai enviar o produto de volta)
        const clientEmail = shippingAddr?.email || returnRequest.user.email;
        const clientPhone = (shippingAddr?.phone || returnRequest.user.phone || '').replace(/\D/g, '');

        if (!clientEmail || !clientPhone) {
          return NextResponse.json({ 
            error: 'Email e telefone do cliente são necessários para gerar a etiqueta reversa' 
          }, { status: 400 });
        }

        logger.info('[ADMIN_RETURN] Gerando etiqueta reversa para:', returnRequest.returnNumber);

        const labelResult = await createReverseShippingForOrder(
          returnRequest.orderId,
          clientEmail,
          clientPhone
        );

        if (!labelResult.success) {
          return NextResponse.json({
            success: false,
            error: labelResult.error,
            details: labelResult,
          }, { status: 400 });
        }

        const updated = await prisma.return.update({
          where: { id: params.id },
          data: {
            status: 'LABEL_GENERATED',
            melhorEnvioOrderId: labelResult.orderId,
            melhorEnvioLabelUrl: labelResult.labelUrl,
            trackingCode: labelResult.trackingCode,
          },
        });

        // Notificar o cliente sobre a etiqueta gerada
        await notifyReturnStatusChange({
          userId: returnRequest.user.id,
          returnId: updated.id,
          returnNumber: updated.returnNumber,
          orderId: returnRequest.orderId,
          status: 'LABEL_GENERATED' as ReturnStatus,
          labelUrl: labelResult.labelUrl,
          trackingCode: labelResult.trackingCode,
        });

        return NextResponse.json({
          success: true,
          message: 'Etiqueta reversa gerada com sucesso',
          return: updated,
          label: labelResult,
        });
      }

      case 'mark_received': {
        // Marcar produto como recebido
        if (returnRequest.status !== 'IN_TRANSIT') {
          return NextResponse.json({ error: 'Produto precisa estar em trânsito' }, { status: 400 });
        }

        const updated = await prisma.return.update({
          where: { id: params.id },
          data: {
            status: 'RECEIVED',
            receivedAt: new Date(),
          },
        });

        // Notificar o cliente que o produto foi recebido
        await notifyReturnStatusChange({
          userId: returnRequest.user.id,
          returnId: updated.id,
          returnNumber: updated.returnNumber,
          orderId: returnRequest.orderId,
          status: 'RECEIVED' as ReturnStatus,
        });

        return NextResponse.json({
          success: true,
          message: 'Produto marcado como recebido',
          return: updated,
        });
      }

      case 'start_inspection': {
        // Iniciar inspeção
        if (returnRequest.status !== 'RECEIVED') {
          return NextResponse.json({ error: 'Produto precisa ter sido recebido' }, { status: 400 });
        }

        const updated = await prisma.return.update({
          where: { id: params.id },
          data: {
            status: 'INSPECTING',
          },
        });

        // Notificar o cliente que a inspeção foi iniciada
        await notifyReturnStatusChange({
          userId: returnRequest.user.id,
          returnId: updated.id,
          returnNumber: updated.returnNumber,
          orderId: returnRequest.orderId,
          status: 'INSPECTING' as ReturnStatus,
        });

        return NextResponse.json({
          success: true,
          message: 'Inspeção iniciada',
          return: updated,
        });
      }

      case 'approve_refund': {
        // Aprovar reembolso
        if (returnRequest.status !== 'INSPECTING') {
          return NextResponse.json({ error: 'Produto precisa estar em inspeção' }, { status: 400 });
        }

        const updated = await prisma.return.update({
          where: { id: params.id },
          data: {
            status: 'REFUND_PENDING',
            inspectedAt: new Date(),
            refundMethod: refundMethod || 'original_payment',
            refundAmount: refundAmount || returnRequest.refundAmount,
            adminNotes,
          },
        });

        // Notificar o cliente sobre o reembolso aprovado
        await notifyReturnStatusChange({
          userId: returnRequest.user.id,
          returnId: updated.id,
          returnNumber: updated.returnNumber,
          orderId: returnRequest.orderId,
          status: 'REFUND_PENDING' as ReturnStatus,
          refundAmount: updated.refundAmount,
        });

        return NextResponse.json({
          success: true,
          message: 'Reembolso aprovado. Processe o pagamento.',
          return: updated,
        });
      }

      case 'complete_refund': {
        // Finalizar reembolso
        if (returnRequest.status !== 'REFUND_PENDING') {
          return NextResponse.json({ error: 'Reembolso precisa estar pendente' }, { status: 400 });
        }

        const { refundReference } = body;

        const updated = await prisma.return.update({
          where: { id: params.id },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date(),
            refundReference,
          },
        });

        // Atualizar status do pedido original
        await prisma.order.update({
          where: { id: returnRequest.orderId },
          data: { status: 'REFUNDED' },
        });

        // Notificar o cliente sobre o reembolso concluído
        await notifyReturnStatusChange({
          userId: returnRequest.user.id,
          returnId: updated.id,
          returnNumber: updated.returnNumber,
          orderId: returnRequest.orderId,
          status: 'REFUNDED' as ReturnStatus,
          refundAmount: returnRequest.refundAmount,
        });

        return NextResponse.json({
          success: true,
          message: 'Reembolso concluído',
          return: updated,
        });
      }

      case 'update_notes': {
        // Apenas atualizar notas
        const updated = await prisma.return.update({
          where: { id: params.id },
          data: { adminNotes },
        });

        return NextResponse.json({
          success: true,
          message: 'Notas atualizadas',
          return: updated,
        });
      }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    logger.error(error, '[ADMIN_RETURN_UPDATE]');
    return NextResponse.json({ error: 'Erro ao atualizar devolução' }, { status: 500 });
  }
}
