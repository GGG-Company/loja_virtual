import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let config = await prisma.siteConfig.findFirst();
    
    if (!config) {
      config = await prisma.siteConfig.create({
        data: {
          id: 'singleton',
          assistantMode: 'smart',
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('[GET SITE CONFIG]', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { assistantMode } = body;

    if (!assistantMode || !['smart', 'ai'].includes(assistantMode)) {
      return NextResponse.json({ error: 'Modo inválido' }, { status: 400 });
    }

    const config = await prisma.siteConfig.upsert({
      where: { id: 'singleton' },
      update: { assistantMode },
      create: {
        id: 'singleton',
        assistantMode,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('[UPDATE SITE CONFIG]', error);
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
