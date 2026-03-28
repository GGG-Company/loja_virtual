import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AddressSchema = z.object({
  addressZip: z.string().min(1, 'CEP é obrigatório'),
  addressStreet: z.string().min(1, 'Logradouro é obrigatório'),
  addressNumber: z.string().min(1, 'Número é obrigatório'),
  addressComplement: z.string().optional().nullable(),
  addressNeighborhood: z.string().min(1, 'Bairro é obrigatório'),
  addressCity: z.string().min(1, 'Cidade é obrigatória'),
  addressState: z.string().min(2, 'Estado é obrigatório').max(2, 'Estado deve ter 2 caracteres'),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        addressZip: true,
        addressStreet: true,
        addressNumber: true,
        addressComplement: true,
        addressNeighborhood: true,
        addressCity: true,
        addressState: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, address: user });
  } catch (error) {
    logger.error(error, '[USER_ADDRESSES_GET]');
    return NextResponse.json({ error: 'Erro ao buscar endereço' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = AddressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const {
      addressZip,
      addressStreet,
      addressNumber,
      addressComplement,
      addressNeighborhood,
      addressCity,
      addressState,
    } = parsed.data;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        addressZip,
        addressStreet,
        addressNumber,
        addressComplement: addressComplement ?? null,
        addressNeighborhood,
        addressCity,
        addressState,
      },
      select: {
        id: true,
        addressZip: true,
        addressStreet: true,
        addressNumber: true,
        addressComplement: true,
        addressNeighborhood: true,
        addressCity: true,
        addressState: true,
      },
    });

    return NextResponse.json({ success: true, address: updated });
  } catch (error) {
    logger.error(error, '[USER_ADDRESSES_PUT]');
    return NextResponse.json({ error: 'Erro ao atualizar endereço' }, { status: 500 });
  }
}
