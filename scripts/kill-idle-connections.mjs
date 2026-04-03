/**
 * Kills idle PostgreSQL connections from previous sessions.
 * Run: node scripts/kill-idle-connections.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load .env manually
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) {
    const val = rest.join('=').replace(/^["']|["']$/g, '').replace(/\s*#.*$/, '').trim();
    if (!process.env[key.trim()]) process.env[key.trim()] = val;
  }
}

// Use connection_limit=1 so we only need 1 free slot
const rawUrl = process.env.DATABASE_URL || '';
const url = rawUrl.includes('connection_limit')
  ? rawUrl.replace(/connection_limit=\d+/, 'connection_limit=1')
  : rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'connection_limit=1';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT count(*) as killed FROM (
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
          AND state IN ('idle', 'idle in transaction', 'idle in transaction (aborted)')
      ) t WHERE pg_terminate_backend IS NOT false
    `;
    console.log('✅ Conexões ociosas encerradas:', result);
  } catch (e) {
    // Fallback: simpler query
    try {
      await prisma.$executeRaw`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
          AND state = 'idle'
      `;
      console.log('✅ Conexões ociosas encerradas (fallback)');
    } catch (e2) {
      console.error('❌ Não foi possível conectar ao banco:', e2.message);
      console.log('💡 O banco pode estar completamente lotado. Aguarde ~5 minutos para as conexões expirarem naturalmente, ou reinicie o PostgreSQL no servidor.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
