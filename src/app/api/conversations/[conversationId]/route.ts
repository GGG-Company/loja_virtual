import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { publish } from '@/lib/redis';

// GET - retorna conversa com mensagens
export async function GET(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { conversationId } = params;

    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!before) {
      const convo = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!convo) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });

      if (convo.userId !== session.user.id && !(session.user.role === 'ADMIN' || session.user.role === 'OWNER')) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      return NextResponse.json(convo);
    }

    // Paginated messages before timestamp
    const beforeDate = new Date(before);
    const msgs = await prisma.conversationMessage.findMany({
      where: { conversationId, createdAt: { lt: beforeDate } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ messages: msgs.reverse() });
  } catch (error) {
    console.error('[GET CONVERSATION]', error);
    return NextResponse.json({ error: 'Erro ao buscar conversa' }, { status: 500 });
  }
}

// POST - adiciona mensagem na conversa
export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { conversationId } = params;
    const body = await request.json();
    const { message, senderName, sender } = body;

    if (!message || !message.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });

    const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!convo) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });

    if (convo.userId !== session.user.id && !(session.user.role === 'ADMIN' || session.user.role === 'OWNER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const newMsg = await prisma.conversationMessage.create({
      data: {
        conversationId,
        sender: sender || 'user',
        senderName: senderName || session.user.name || null,
        message: message.trim(),
      },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    // Publish realtime event for this conversation so clients can update via socket
    try {
      await publish(`conversations:${conversationId}`, { type: 'new_message', conversationId, message: newMsg });
      // also notify owner/user channel
      try { await publish(`conversations:user:${convo.userId}`, { type: 'conversation_message', conversationId, message: newMsg }); } catch (e) {}
    } catch (e) {
      console.warn('[CONVERSATIONS] failed to publish new message', e);
    }

    // Após adicionar mensagem, garante que apenas as 2 conversas mais recentes permaneçam
    try {
      const userConvos = await prisma.conversation.findMany({
        where: { userId: convo.userId },
        orderBy: { updatedAt: 'desc' },
      });
      if (userConvos.length > 3) {
        const toDelete = userConvos.slice(3).map(c => c.id);
        await prisma.conversation.deleteMany({ where: { id: { in: toDelete } } });
      }
    } catch (err) {
      console.error('[PRUNE CONVERSATIONS AFTER MESSAGE]', err);
    }

    return NextResponse.json(newMsg);
  } catch (error) {
    console.error('[POST CONVERSATION MESSAGE]', error);
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 });
  }
}
