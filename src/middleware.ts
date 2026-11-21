import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  VIEWER_READ_ONLY_API_MESSAGE,
  verifySessionToken,
} from '@/lib/session';

export const config = {
  matcher: ['/api/:path*'],
};

const PUBLIC_EXACT_API_PATHS = new Set<string>([
  '/api/health',
  '/api/version',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/portal-handoff',
  '/api/approvals/quick-action',
  '/api/cron/reminders',
  '/api/external/room-schedules',
]);

const PUBLIC_GET_API_PREFIXES = [
  '/api/assets/public/',
  '/api/consumables/public/',
  '/api/storage/public/',
  '/api/storage/rooms/',
];

const MUTATING_METHODS = new Set<string>(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    return NextResponse.next();
  }

  const rawCookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Special public QR issue reporter route: POST /api/maintenance/issues
  // Allows unauthenticated QR reporters, but still blocks signed-in VIEWER accounts.
  if (pathname === '/api/maintenance/issues' && method === 'POST') {
    if (rawCookieToken) {
      const session = await verifySessionToken(rawCookieToken);
      if (session?.role === 'VIEWER') {
        return NextResponse.json(
          { error: VIEWER_READ_ONLY_API_MESSAGE, code: 'VIEWER_READ_ONLY' },
          { status: 403 }
        );
      }
    }
    return NextResponse.next();
  }

  // Exact public endpoints (auth, health, version, external cron/sync, signed quick-action)
  if (PUBLIC_EXACT_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Public GET lookup prefixes (QR asset/consumable/storage public info)
  if (method === 'GET' && PUBLIC_GET_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Require valid signed session cookie for all other /api/* requests
  const session = await verifySessionToken(rawCookieToken);
  if (!session) {
    return NextResponse.json(
      { error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Global server-side VIEWER read-only mutation guard
  if (
    session.role === 'VIEWER' &&
    MUTATING_METHODS.has(method) &&
    pathname !== '/api/auth/heartbeat'
  ) {
    return NextResponse.json(
      { error: VIEWER_READ_ONLY_API_MESSAGE, code: 'VIEWER_READ_ONLY' },
      { status: 403 }
    );
  }

  // Strip any spoofed headers from client and inject verified session context
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('x-session-user-id');
  requestHeaders.delete('x-session-user-role');
  requestHeaders.set('x-session-user-id', session.uid);
  requestHeaders.set('x-session-user-role', session.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
