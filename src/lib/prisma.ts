import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    try {
      const pool = new Pool({
        connectionString,
        max: 10,
        connectionTimeoutMillis: 5000,
      });
      const adapter = new PrismaPg(pool);
      return new PrismaClient({
        adapter,
        log: ['error', 'warn'],
      });
    } catch (err) {
      console.warn('[Prisma] Driver adapter init fallback to standard client:', err);
    }
  }

  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

