import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authLimiter } from '@/lib/rate-limit';

const RegisterSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  stateRegistration: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.cpf && !data.cnpj) {
    ctx.addIssue({ code: 'custom', message: 'Informe CPF ou CNPJ' });
  }
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: máx 10 tentativas por minuto por IP
    const blocked = await authLimiter.check(request);
    if (blocked) return blocked;

    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, email, password, phone, cpf, cnpj, stateRegistration } = parsed.data;

    // Verificar se email já existe (resposta genérica para evitar enumeração)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Não foi possível criar a conta. Verifique os dados ou tente fazer login.' },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        cpf: cpf || null,
        cnpj: cnpj || null,
        stateRegistration: stateRegistration || null,
        role: 'CUSTOMER', // Novo usuário sempre começa como CUSTOMER
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(
      { success: true, user },
      { status: 201 }
    );
  } catch (error) {
    logger.error(error, '[REGISTER ERROR]');
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}
