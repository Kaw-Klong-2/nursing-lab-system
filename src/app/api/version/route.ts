import { NextResponse } from 'next/server';
import { APP_VERSION, APP_BUILD_DATE, APP_SUITE_NAME } from '@/lib/version';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      version: APP_VERSION,
      buildDate: APP_BUILD_DATE,
      suite: APP_SUITE_NAME,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  );
}
