import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const globalForPrisma = globalThis as unknown as { prismaClientInstance?: PrismaClient };

function getConnectionString(): string | undefined {
  // 1. Check standard Node.js / Vercel process.env
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // 2. Check OpenNext Cloudflare global context via Symbol
  try {
    const cfGlobal = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cfGlobal?.env?.DATABASE_URL) {
      return cfGlobal.env.DATABASE_URL;
    }
  } catch {}

  // 3. Check official getCloudflareContext() helper
  try {
    const ctx = getCloudflareContext();
    if (ctx?.env && typeof ctx.env === 'object' && 'DATABASE_URL' in ctx.env) {
      return (ctx.env as Record<string, any>).DATABASE_URL;
    }
  } catch {}

  return undefined;
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

  // Do NOT cache the fallback instance so when the first request arrives with env context,
  // it can successfully initialize the adapter client
  return new PrismaClient({
    log: ['error', 'warn'],
  });
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
