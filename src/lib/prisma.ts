import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: [
      { level: 'warn',  emit: 'stdout' },
      { level: 'error', emit: 'stdout' },
    ],
  });
}

export const prisma = globalForPrisma.prisma;
