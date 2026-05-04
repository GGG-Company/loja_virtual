import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authLimiter } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Rate limiting por IP + userId para evitar força bruta na senha atual
  const blocked = await authLimiter.check(request, session.user.id);
  if (blocked) return blocked;

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Senha atual e nova senha são obrigatórias' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Nova senha deve ter no mínimo 8 caracteres' }, { status: 400 });
  }

  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return NextResponse.json(
      { error: 'Nova senha deve conter maiúscula, minúscula e número' },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user?.password) {
    return NextResponse.json(
      { error: 'Conta vinculada via Google. Use o Google para gerenciar sua senha.' },
      { status: 400 },
    );
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ message: 'Senha alterada com sucesso' });
}
