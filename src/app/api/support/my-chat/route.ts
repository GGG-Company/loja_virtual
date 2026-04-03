import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * GET /api/support/my-chat
 * Returns the most recent open/bot/in-progress support chat for the authenticated user.
 * Used by the client widget to recover its supportChatId after a page reload.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ chat: null });
    }

    const chat = await prisma.supportChat.findFirst({
      where: {
        userId: session.user.id,
        NOT: { status: 'CLOSED' as any },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({ chat: chat ?? null });
  } catch {
    return NextResponse.json({ chat: null });
  }
}
