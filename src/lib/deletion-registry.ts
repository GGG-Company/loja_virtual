import fs from 'fs/promises';
import logger from '@/lib/logger';

/**
 * LGPD Art. 18, VI — Registro externo de exclusões.
 *
 * Problema: se o banco for restaurado de um backup anterior à exclusão, o usuário
 * "ressuscita" com todos os dados. Manter este registro num volume separado do backup
 * do PostgreSQL permite reconciliar após qualquer restauração.
 *
 * Configurar via env: DELETION_REGISTRY_PATH (padrão: /var/log/app/deletion-registry.jsonl)
 * O arquivo deve estar num volume/partição DIFERENTE do diretório de dados do Postgres.
 *
 * Formato: JSON Lines — uma entrada por linha, append-only.
 */
const REGISTRY_PATH =
  process.env.DELETION_REGISTRY_PATH ?? '/var/log/app/deletion-registry.jsonl';

export async function appendDeletionRegistry(userId: string): Promise<void> {
  const entry =
    JSON.stringify({ userId, deletedAt: new Date().toISOString() }) + '\n';
  try {
    await fs.appendFile(REGISTRY_PATH, entry, 'utf8');
  } catch (err) {
    // Não falha a exclusão — mas loga para que o operador saiba que o registro externo está inacessível.
    logger.error(
      { err, userId, registryPath: REGISTRY_PATH },
      '[DELETION_REGISTRY] Falha ao gravar registro externo de exclusão — verificar permissões/volume',
    );
  }
}
