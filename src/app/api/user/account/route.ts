import { NextRequest, NextResponse } from 'next/server';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { logActivity } from '@/lib/activity-log';
import { appendDeletionRegistry } from '@/lib/deletion-registry';

/**
 * DELETE /api/user/account
 *
 * LGPD Art. 18 — Direito à exclusão de dados pessoais.
 * Anonimiza o usuário em vez de deletar para preservar a integridade
 * referencial dos pedidos e retornos históricos.
 *
 * Para forçar logout imediato, incrementa tokenVersion (invalidando JWTs ativos).
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Anonimizar dados pessoais
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Usuário Removido',
        email: `deleted_${userId}@removed.invalid`,
        password: null,
        phone: null,
        cpf: null,
        cnpj: null,
        stateRegistration: null,
        image: null,
        addressZip: null,
        addressStreet: null,
        addressNumber: null,
        addressComplement: null,
        addressNeighborhood: null,
        addressCity: null,
        addressState: null,
        birthDate: null,
        deletedAt: new Date(),
        // Incrementar tokenVersion invalida todos os JWTs ativos imediatamente
        tokenVersion: { increment: 1 },
      },
    });

    // Remover dados de sessão OAuth vinculados
    await prisma.account.deleteMany({ where: { userId } });

    await logActivity({
      userId,
      action: 'ACCOUNT_DELETED',
      entity: 'User',
      entityId: userId,
    });

    // Registrar no log externo de exclusões para reconciliação pós-restauração de backup
    await appendDeletionRegistry(userId);

    logger.info({ userId }, '[ACCOUNT_DELETE] Conta anonimizada por solicitação do usuário');

    return NextResponse.json({ message: 'Conta removida com sucesso' });
  } catch (error) {
    logger.error(error as Error, '[ACCOUNT_DELETE]');
    return NextResponse.json({ error: 'Erro ao remover conta' }, { status: 500 });
  }
}
