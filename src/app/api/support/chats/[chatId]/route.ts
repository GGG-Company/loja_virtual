import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import logger from '@/lib/logger';

// GET - Buscar mensagens de um chat
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const onlyLast = searchParams.get('onlyLast');
    const before = searchParams.get('before');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // lightweight check: return only the last message timestamp
    if (onlyLast) {
      // Verificar autorização antes de retornar dados
      const chat = await prisma.supportChat.findUnique({
        where: { id: chatId },
        select: { userId: true },
      });
      if (!chat) {
        return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });
      }
      const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER';
      const isOwner = session?.user?.id === chat.userId;
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      const lastMsg = await prisma.supportMessage.findFirst({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      return NextResponse.json({ lastMessageAt: lastMsg?.createdAt?.toISOString() || null });
    }

    // if no before param, return full chat with messages ascending
    if (!before) {
      const chat = await prisma.supportChat.findUnique({
        where: { id: chatId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          attendant: {
            select: {
              id: true,
              name: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!chat) {
        return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });
      }

      const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER';
      const isOwner = session?.user?.id === chat.userId;

      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      return NextResponse.json({ chat });
    }

    // Paginated fetch: messages before a given ISO timestamp
    // Verificar autorização
    const chatForPagination = await prisma.supportChat.findUnique({
      where: { id: chatId },
      select: { userId: true },
    });
    if (!chatForPagination) {
      return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });
    }
    const isAdminPaginated = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER';
    const isOwnerPaginated = session?.user?.id === chatForPagination.userId;
    if (!isAdminPaginated && !isOwnerPaginated) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const beforeDate = new Date(before);
    const cappedLimit = Math.min(limit, 100);
    const msgs = await prisma.supportMessage.findMany({
      where: {
        chatId,
        createdAt: { lt: beforeDate },
      },
      orderBy: { createdAt: 'desc' },
      take: cappedLimit,
    });

    // return messages ordered asc for UI
    return NextResponse.json({ messages: msgs.reverse() });

    
  } catch (error) {
    logger.error(error as Error, '[GET SUPPORT CHAT]');
    return NextResponse.json({ error: 'Erro ao buscar chat' }, { status: 500 });
  }
}

// POST - Enviar mensagem no chat
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const session = await auth();
    
    const body = await request.json();
    
    const { message, asAttendant } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
    }

    const chat = await prisma.supportChat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });
    }

    // Verifica permissão: admin ou owner do chat
    const isAdminPost = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER';
    const isOwnerPost = session?.user?.id === chat.userId;

    if (!isAdminPost && !isOwnerPost) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Determine sender. Allow admin UI to explicitly mark the message as
    // attendant via `asAttendant`. Otherwise, if the requester is an admin
    // and not the chat owner, treat as attendant. In all other cases treat
    // as customer.
    const sender = (isAdminPost && (asAttendant || !isOwnerPost)) ? 'attendant' : 'customer';

    const senderName = sender === 'attendant'
      ? (session?.user?.name || 'Atendente')
      : (session?.user?.name || chat.userName || 'Cliente');

    const newMessage = await prisma.supportMessage.create({
      data: {
        chatId,
        sender,
        senderName,
        message: message.trim(),
      },
    });

    try { console.debug('[SUPPORT] New message created', { chatId, messageId: newMessage.id, sender: newMessage.sender, senderName: newMessage.senderName }); } catch (e) {}

    // Publish lightweight event to Redis (if configured) so admin UIs can
    // receive realtime updates without polling.
    try {
      const { publish } = await import('@/lib/redis');
      // channel per chat
      const channel = `support:chat:${chatId}`;
      publish(channel, { type: 'new_message', message: {
        id: newMessage.id,
        sender: newMessage.sender,
        senderName: newMessage.senderName,
        message: newMessage.message,
        createdAt: newMessage.createdAt,
      }}).catch(() => {});
    } catch (e) {
      // swallow if redis not available
    }

    // Atualiza status do chat quando um atendente responde pela primeira vez
    if (chat.status === 'OPEN' && isAdminPost) {
      await prisma.supportChat.update({
        where: { id: chatId },
        data: {
          status: 'IN_PROGRESS',
          assignedTo: session?.user?.id || null,
        },
      });
      try { console.debug('[SUPPORT] Chat claimed by attendant', { chatId, attendantId: session?.user?.id, attendantName: session?.user?.name }); } catch (e) {}
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('[SEND SUPPORT MESSAGE]', error);
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 });
  }
}

// PATCH - Atualizar status do chat
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const session = await auth();
    const body = await request.json();
    const { status } = body;

    // Apenas admins podem alterar status do chat
    const isAdminPatch = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER';
    if (!isAdminPatch) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const chat = await prisma.supportChat.update({
      where: { id: chatId },
      data: {
        status,
        closedAt: status === 'CLOSED' || status === 'RESOLVED' ? new Date() : null,
      },
    });

    try { console.debug('[SUPPORT] Chat status updated', { chatId, status, updatedBy: session?.user?.id, updatedByName: session?.user?.name }); } catch (e) {}
    if (status === 'CLOSED' || status === 'RESOLVED') {
      try { console.debug('[SUPPORT] Chat finalized', { chatId, finalStatus: status, finalizedBy: session?.user?.id, finalizedByName: session?.user?.name }); } catch (e) {}
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error('[UPDATE SUPPORT CHAT]', error);
    return NextResponse.json({ error: 'Erro ao atualizar chat' }, { status: 500 });
  }
}
