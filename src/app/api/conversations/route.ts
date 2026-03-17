import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publish } from '@/lib/redis';
import { auth } from '@/auth';
import logger from "@/lib/logger";

// GET - lista as conversas do usuário autenticado
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    const convos = await prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 3, // apenas as 3 conversas mais recentes
    });

    // found conversations
    return NextResponse.json(convos);
  } catch (error) {
    console.error('[GET CONVERSATIONS]', error);
    return NextResponse.json({ error: 'Erro ao listar conversas' }, { status: 500 });
  }
}

// POST - cria nova conversa com mensagem inicial
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { title, initialMessage, senderName } = body;

    if (!initialMessage || !initialMessage.trim()) {
      return NextResponse.json({ error: 'Mensagem inicial vazia' }, { status: 400 });
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        title: title || null,
        messages: {
          create: {
            sender: 'user',
            senderName: senderName || session.user.name || null,
            message: initialMessage.trim(),
          },
        },
      },
      include: { messages: true },
    });

    // Publish realtime event for created conversation to the user's channel
    try {
      await publish(`conversations:user:${session.user.id}`, { type: 'conversation_created', conversation });
    } catch (e) {
      console.warn('[CONVERSATIONS] failed to publish created conversation', e);
    }

    // Após criar, remove conversas antigas mantendo apenas as 2 mais recentes
    try {
      const userConvos = await prisma.conversation.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
      });

      if (userConvos.length > 3) {
        const toDelete = userConvos.slice(3).map(c => c.id);
        await prisma.conversation.deleteMany({ where: { id: { in: toDelete } } });
      }
    } catch (err) {
      console.error('[PRUNE CONVERSATIONS]', err);
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('[CREATE CONVERSATION]', error);
    return NextResponse.json({ error: 'Erro ao criar conversa' }, { status: 500 });
  }
}
