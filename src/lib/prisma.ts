import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prismaClientInstance?: PrismaClient };

function getConnectionString(): string | undefined {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext?.();
    return ctx?.env?.DATABASE_URL;
  } catch {
    return undefined;
  }
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prismaClientInstance) {
    return globalForPrisma.prismaClientInstance;
  }

  const connectionString = getConnectionString();

  if (connectionString) {
    const pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });

    globalForPrisma.prismaClientInstance = client;
    return client;
  }

  // Fallback for build time or environments without DATABASE_URL
  const client = new PrismaClient({
    log: ['error', 'warn'],
  });
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
