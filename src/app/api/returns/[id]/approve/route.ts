import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendWebhook } from '@/lib/webhooks';
import { notifyReturnStatusChange } from '@/lib/notifications';
import type { ReturnStatus } from '@/lib/i18n';

/**
 * PUT /api/returns/[id]/approve
 * Aprovar devolução (apenas admin/owner) e enviar webhook
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

    const body = await request.json();
    const { adminNotes } = body;

    const returnRequest = await prisma.return.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        order: {
          select: { id: true, orderNumber: true },
        },
        items: true,
      },
    });

    if (!returnRequest) {
      return NextResponse.json({ error: 'Devolução não encontrada' }, { status: 404 });
    }

    // Verificar se a devolução está em status que pode ser aprovado
    if (returnRequest.status !== 'REQUESTED' && returnRequest.status !== 'PENDING_REVIEW') {
      return NextResponse.json({
        error: 'Esta devolução não pode ser aprovada no status atual',
      }, { status: 400 });
    }

    // Atualizar devolução como aprovada
    const updated = await prisma.$transaction(async (tx) => {
      const updatedReturn = await tx.return.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          adminNotes,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          order: {
            select: { id: true, orderNumber: true },
          },
          items: true,
        },
      });

      // Criar notificação para o cliente sobre a aprovação
      await tx.notification.create({
        data: {
          userId: returnRequest.user.id,
          type: 'RETURN_STATUS',
          title: 'Devolução Aprovada',
          message: `Sua solicitação de devolução ${returnRequest.returnNumber} foi aprovada! Aguarde a geração da etiqueta de devolução.`,
          data: JSON.stringify({
            returnId: updatedReturn.id,
            returnNumber: updatedReturn.returnNumber,
            orderId: returnRequest.order.id,
            orderNumber: returnRequest.order.orderNumber,
            status: 'APPROVED',
          }),
        },
      });

      return updatedReturn;
    });

    // Enviar webhook de forma assíncrona
    try {
      await sendWebhook('returns.approved', {
        returnId: updated.id,
        returnNumber: updated.returnNumber,
        orderId: returnRequest.order.id,
        orderNumber: returnRequest.order.orderNumber,
        userId: returnRequest.user.id,
        userName: returnRequest.user.name,
        userEmail: returnRequest.user.email,
        status: 'APPROVED',
        refundAmount: updated.refundAmount,
        items: updated.items,
        adminNotes,
        approvedAt: updated.reviewedAt,
        approvedBy: user.id,
      });
    } catch (webhookError) {
      console.error('[RETURNS_APPROVE_WEBHOOK_ERROR]', webhookError);
      // Não falha a requisição se o webhook falhar
    }

    return NextResponse.json({
      success: true,
      message: 'Devolução aprovada com sucesso',
      return: updated,
    });
  } catch (error) {
    console.error('[RETURN_APPROVE]', error);
    return NextResponse.json({ error: 'Erro ao aprovar devolução' }, { status: 500 });
  }
}

/**
 * DELETE /api/returns/[id]/approve
 * Rejeitar devolução (apenas admin/owner) e enviar webhook
 */
export async function DELETE(
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
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se é admin ou owner
    if (!['ADMIN', 'OWNER'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { adminNotes } = body;

    const returnRequest = await prisma.return.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        order: {
          select: { id: true, orderNumber: true },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json({ error: 'Devolução não encontrada' }, { status: 404 });
    }

    // Verificar se a devolução está em status que pode ser rejeitada
    if (returnRequest.status !== 'REQUESTED' && returnRequest.status !== 'PENDING_REVIEW') {
      return NextResponse.json({
        error: 'Esta devolução não pode ser rejeitada no status atual',
      }, { status: 400 });
    }

    // Atualizar devolução como rejeitada
    const updated = await prisma.$transaction(async (tx) => {
      const rejectedReturn = await tx.return.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          adminNotes,
        },
      });

      // Criar notificação para o cliente sobre a rejeição
      await tx.notification.create({
        data: {
          userId: returnRequest.user.id,
          type: 'RETURN_STATUS',
          title: 'Devolução Rejeitada',
          message: `Sua solicitação de devolução ${returnRequest.returnNumber} foi rejeitada. ${adminNotes ? 'Motivo: ' + adminNotes : ''}`,
          data: JSON.stringify({
            returnId: rejectedReturn.id,
            returnNumber: rejectedReturn.returnNumber,
            orderId: returnRequest.order.id,
            orderNumber: returnRequest.order.orderNumber,
            status: 'REJECTED',
          }),
        },
      });

      return rejectedReturn;
    });

    // Enviar webhook de forma assíncrona
    try {
      await sendWebhook('returns.rejected', {
        returnId: updated.id,
        returnNumber: updated.returnNumber,
        orderId: returnRequest.order.id,
        orderNumber: returnRequest.order.orderNumber,
        userId: returnRequest.user.id,
        userName: returnRequest.user.name,
        userEmail: returnRequest.user.email,
        status: 'REJECTED',
        adminNotes,
        rejectedAt: updated.reviewedAt,
        rejectedBy: user.id,
      });
    } catch (webhookError) {
      console.error('[RETURNS_REJECT_WEBHOOK_ERROR]', webhookError);
      // Não falha a requisição se o webhook falhar
    }

    return NextResponse.json({
      success: true,
      message: 'Devolução rejeitada com sucesso',
      return: updated,
    });
  } catch (error) {
    console.error('[RETURN_REJECT]', error);
    return NextResponse.json({ error: 'Erro ao rejeitar devolução' }, { status: 500 });
  }
}
