import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET() {
  let cfEnvKeys: string[] = [];
  let cfError: string | null = null;
  let hasDatabaseUrlInCf = false;

  try {
    const ctx = getCloudflareContext();
    if (ctx?.env) {
      cfEnvKeys = Object.keys(ctx.env);
      hasDatabaseUrlInCf = 'DATABASE_URL' in ctx.env;
    }
  } catch (e: any) {
    cfError = e?.message || String(e);
  }

  const globalSymbolEnv: any = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  const symbolEnvKeys = globalSymbolEnv?.env ? Object.keys(globalSymbolEnv.env) : [];

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    hasProcessEnvDatabaseUrl: !!process.env.DATABASE_URL,
    hasDatabaseUrlInCf,
    cfEnvKeys,
    symbolEnvKeys,
    cfError,
  });
}
