/**
 * scripts/reconcile-deletions.mjs
 *
 * Script de reconciliação pós-restauração de backup (LGPD Art. 18, VI).
 *
 * Problema: ao restaurar o banco de um backup anterior à exclusão de uma conta,
 * o usuário "ressuscita" com todos os dados pessoais intactos.
 *
 * Solução: o arquivo deletion-registry.jsonl (armazenado fora do volume do Postgres)
 * registra cada exclusão. Este script lê o registro e re-anonimiza qualquer usuário
 * que ainda esteja ativo no banco.
 *
 * Uso:
 *   DELETION_REGISTRY_PATH=/var/log/app/deletion-registry.jsonl \
 *   DATABASE_URL=postgresql://... \
 *   node scripts/reconcile-deletions.mjs
 *
 * Executar obrigatoriamente após qualquer restauração de backup.
 */

import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const REGISTRY_PATH =
  process.env.DELETION_REGISTRY_PATH ?? '/var/log/app/deletion-registry.jsonl';

const prisma = new PrismaClient();

async function main() {
  console.log(`[reconcile] Lendo registro: ${REGISTRY_PATH}`);

  let content;
  try {
    content = await fs.readFile(REGISTRY_PATH, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('[reconcile] Arquivo de registro não encontrado — nenhuma exclusão registrada.');
      return;
    }
    throw err;
  }

  const lines = content.trim().split('\n').filter(Boolean);
  if (lines.length === 0) {
    console.log('[reconcile] Nenhum registro de exclusão encontrado.');
    return;
  }

  console.log(`[reconcile] ${lines.length} registro(s) encontrado(s). Verificando banco...`);

  let skipped = 0;
  let reconciled = 0;
  let notFound = 0;

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      console.warn(`[reconcile] Linha malformada ignorada: ${line}`);
      continue;
    }

    const { userId, deletedAt } = entry;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true, email: true, name: true },
    });

    if (!user) {
      notFound++;
      continue;
    }

    // Usuário já está corretamente anonimizado
    const isAnonymized =
      user.deletedAt !== null &&
      user.email?.endsWith('@removed.invalid') &&
      user.name === 'Usuário Removido';

    if (isAnonymized) {
      skipped++;
      continue;
    }

    // Re-anonimizar
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
        deletedAt: new Date(deletedAt),
        tokenVersion: { increment: 1 },
      },
    });

    // Remover sessões OAuth que possam ter sido restauradas junto
    await prisma.account.deleteMany({ where: { userId } });

    console.log(`[reconcile] Re-anonimizado: ${userId} (exclusão original: ${deletedAt})`);
    reconciled++;
  }

  console.log(
    `[reconcile] Concluído. Re-anonimizados: ${reconciled} | Já corretos: ${skipped} | Não encontrados: ${notFound}`,
  );
}

main()
  .catch((err) => {
    console.error('[reconcile] Erro fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
