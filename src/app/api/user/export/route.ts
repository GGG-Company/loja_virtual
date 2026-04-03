import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { logActivity } from '@/lib/activity-log';

/**
 * GET /api/user/export
 *
 * LGPD Art. 18, V — Direito à portabilidade de dados.
 * Retorna todos os dados pessoais do titular autenticado em formato JSON.
 * O titular pode usar este arquivo para migrar para outro serviço.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    const [user, orders, reviews, returns, activityLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cpf: true,
          cnpj: true,
          birthDate: true,
          addressZip: true,
          addressStreet: true,
          addressNumber: true,
          addressComplement: true,
          addressNeighborhood: true,
          addressCity: true,
          addressState: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { userId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentMethod: true,
          subtotal: true,
          shipping: true,
          discount: true,
          total: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              price: true,
              subtotal: true,
              product: { select: { name: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.findMany({
        where: { userId },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          product: { select: { name: true } },
        },
      }),
      prisma.return.findMany({
        where: { userId },
        select: {
          id: true,
          returnNumber: true,
          status: true,
          reason: true,
          reasonDetails: true,
          refundAmount: true,
          refundMethod: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              productId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        select: {
          action: true,
          entity: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      dataSubject: {
        ...user,
        // CPF mascarado — disponível apenas na versão completa se solicitado por escrito
        cpf: user.cpf ? `***.***.***-${user.cpf.replace(/\D/g, '').slice(-2)}` : null,
      },
      orders: orders.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping),
        discount: Number(o.discount),
        total: Number(o.total),
        items: o.items.map((i) => ({
          ...i,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      })),
      reviews,
      returns: returns.map((r) => ({
        ...r,
        refundAmount: r.refundAmount ? Number(r.refundAmount) : null,
      })),
      activityLog: activityLogs,
    };

    await logActivity({
      userId,
      action: 'DATA_EXPORTED',
      entity: 'User',
      entityId: userId,
    });

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="meus-dados-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error(error as Error, '[DATA_EXPORT]');
    return NextResponse.json({ error: 'Erro ao exportar dados' }, { status: 500 });
  }
}
