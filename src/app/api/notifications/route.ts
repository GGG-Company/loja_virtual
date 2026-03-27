import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";

/**
 * GET /api/notifications
 * Obter notificações do usuário logado
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

    // Buscar parâmetros de query
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = Math.min(Math.max(parseInt(searchParams.get('offset') || '0', 10), 0), 10000);

    // Construir filtro
    const where = unreadOnly 
      ? { userId: user.id, isRead: false }
      : { userId: user.id };

    // Buscar notificações
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error(error as Error, '[NOTIFICATIONS_LIST]');
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/[id]
 * Marcar notificação como lida
 */
export async function PUT(request: NextRequest) {
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
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // Marcar todas as notificações como lidas
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Todas as notificações marcadas como lidas',
      });
    }

    if (notificationId) {
      // Marcar uma notificação específica como lida
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return NextResponse.json(
          { error: 'Notificação não encontrada' },
          { status: 404 }
        );
      }

      if (notification.userId !== user.id) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        notification: updated,
      });
    }

    return NextResponse.json(
      { error: 'Parâmetro notificationId ou markAllAsRead é obrigatório' },
      { status: 400 }
    );
  } catch (error) {
    logger.error(error as Error, '[NOTIFICATIONS_UPDATE]');
    return NextResponse.json(
      { error: 'Erro ao atualizar notificação' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/delete
 * Deletar notificações
 */
export async function DELETE(request: NextRequest) {
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
    const { notificationId, deleteAll } = body;

    if (deleteAll) {
      // Deletar todas as notificações lidas
      await prisma.notification.deleteMany({
        where: {
          userId: user.id,
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Notificações lidas deletadas com sucesso',
      });
    }

    if (notificationId) {
      // Deletar uma notificação específica
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return NextResponse.json(
          { error: 'Notificação não encontrada' },
          { status: 404 }
        );
      }

      if (notification.userId !== user.id) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      return NextResponse.json({
        success: true,
        message: 'Notificação deletada com sucesso',
      });
    }

    return NextResponse.json(
      { error: 'Parâmetro notificationId ou deleteAll é obrigatório' },
      { status: 400 }
    );
  } catch (error) {
    logger.error(error as Error, '[NOTIFICATIONS_DELETE]');
    return NextResponse.json(
      { error: 'Erro ao deletar notificação' },
      { status: 500 }
    );
  }
}
