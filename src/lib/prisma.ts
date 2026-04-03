import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'warn',  emit: 'stdout' },
            { level: 'error', emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
  });

// Log slow queries (>500 ms) in development
if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on('query', (e: { query: string; duration: number }) => {
    if (e.duration > 500) {
      console.warn(`[SLOW QUERY ${e.duration}ms] ${e.query.slice(0, 200)}`);
    }
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
