import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  cpf: true,
  addressZip: true,
  addressStreet: true,
  addressNumber: true,
  addressComplement: true,
  addressNeighborhood: true,
  addressCity: true,
  addressState: true,
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ...profileSelect, password: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const { password, cpf, ...safeUser } = user;
  return NextResponse.json({
    ...safeUser,
    // CPF totalmente mascarado na resposta (LGPD Art. 46 — anonimização)
    cpf: cpf ? '***.***.***-**' : null,
    hasPassword: !!password,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const allowedKeys = [
    'name',
    'phone',
    'cpf',
    'addressZip',
    'addressStreet',
    'addressNumber',
    'addressComplement',
    'addressNeighborhood',
    'addressCity',
    'addressState',
  ] as const;

  const data: Record<string, string | null | undefined> = {};
  for (const key of allowedKeys) {
    if (key in body) {
      data[key] = body[key] ?? null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: profileSelect,
  });

  await logActivity({
    userId: session.user.id,
    action: 'ACCOUNT_UPDATED',
    entity: 'User',
    entityId: session.user.id,
    changes: { updatedFields: Object.keys(data) },
  });

  return NextResponse.json(updated);
}
