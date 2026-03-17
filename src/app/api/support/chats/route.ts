import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import logger from '@/lib/logger';

// GET - Listar chats de suporte (admin)
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParamRaw = searchParams.get('status');
    const statusParam = statusParamRaw ? statusParamRaw.toLowerCase() : null;

    // Build a safe `where` filter based on allowed status values or custom filters
    let where: any = undefined;
    if (statusParam) {
      if (statusParam === 'active') {
        // recent customer activity (last 5 minutes)
        const since = new Date(Date.now() - 5 * 60 * 1000);
        where = {
          messages: {
            some: {
              sender: { not: 'attendant' },
              createdAt: { gte: since },
            },
          },
        };
      } else if (statusParam === 'bot') {
        // chats that are currently being handled by the assistant (bot)
        where = { status: 'BOT' } as any;
      } else {
        const statusUpper = statusParam.toUpperCase();
        const valid = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'BOT'];
        if (valid.includes(statusUpper)) {
          where = { status: statusUpper as any };
        } else {
          return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
        }
      }
    }

    const chats = await prisma.supportChat.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        // attendant: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(chats);
  } catch (error) {
    logger.error(error as Error, '[GET SUPPORT CHATS]');
    return NextResponse.json({ error: 'Erro ao buscar chats' }, { status: 500 });
  }
}

// POST - Criar novo chat de suporte
export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();
    const { userName, userEmail, subject, initialMessage } = body;

    const isAssistantTransfer = (text?: string) => {
      if (!text) return false;
      const t = String(text).toLowerCase();
      const patterns = [
        'vou te conectar',
        'vou te transferir',
        'vou te passar para',
        'transferindo',
        'atendente',
        'atendimento humano',
      ];
      return patterns.some(p => t.includes(p));
    };

    const isUserRequestingHuman = (text?: string) => {
      if (!text) return false;
      const t = String(text).toLowerCase();
      const patterns = [
        'falar com atendente',
        'fale com um atendente',
        'quero falar com',
        'preciso falar com',
        'abrir atendimento',
        'abrir chamado',
        'quero continuar',
        'continuar o atendimento',
      ];
      return patterns.some(p => t.includes(p));
    };

    const storedInitialMessage = isAssistantTransfer(initialMessage)
      ? 'Olá, gostaria de continuar o atendimento. 👋'
      : initialMessage;

    if (!userName || !initialMessage) {
      return NextResponse.json({ error: 'Nome e mensagem são obrigatórios' }, { status: 400 });
    }

    // Try to find an existing open/in-progress/bot chat for this user
    const orConditions: any[] = [];
    if (session?.user?.id) orConditions.push({ userId: session.user.id });
    if (userEmail) orConditions.push({ userEmail });

    if (orConditions.length > 0) {
      const existing = await prisma.supportChat.findFirst({
        where: {
          AND: [{ OR: orConditions }, { status: { in: ['OPEN', 'IN_PROGRESS', 'BOT'] as any } }],
        },
        include: { messages: true },
      });

      if (existing) {
        await prisma.supportMessage.create({
          data: {
            chatId: existing.id,
            sender: 'customer',
            message: storedInitialMessage,
            senderName: session?.user?.name || userName,
          },
        });

        // If existing was BOT and user now requests human, promote to OPEN
        if (isUserRequestingHuman(initialMessage) && (existing.status as unknown as string) === 'BOT') {
          await prisma.supportChat.update({ where: { id: existing.id }, data: { status: 'OPEN' as any } });
          try { console.debug('[SUPPORT] Promoted chat from BOT to OPEN due to user request', { id: existing.id }); } catch (e) {}
        }

        const updated = await prisma.supportChat.findUnique({ where: { id: existing.id }, include: { messages: true } });
        try { console.debug('[SUPPORT] Appended message to existing chat', { id: existing.id }); } catch (e) {}
        return NextResponse.json(updated);
      }
    }

    // create new chat: BOT unless user explicitly requests human
    const createStatus: any = isUserRequestingHuman(initialMessage) ? 'OPEN' : 'BOT';
    const createData: any = {
      userId: session?.user?.id,
      userName,
      userEmail: userEmail || session?.user?.email,
      subject,
      status: createStatus,
      messages: { create: [{ sender: 'customer', message: storedInitialMessage, senderName: session?.user?.name || userName }] },
    };

    const chat = await prisma.supportChat.create({ data: createData, include: { messages: true } });
    try { console.debug('[SUPPORT] Created new support chat', { id: chat.id, userEmail: chat.userEmail, status: chat.status }); } catch (e) {}
    return NextResponse.json(chat);
  } catch (error) {
    console.error('[CREATE SUPPORT CHAT]', error);
    return NextResponse.json({ error: 'Erro ao criar chat' }, { status: 500 });
  }
}
