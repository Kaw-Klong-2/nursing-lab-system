import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'kunurse_session';

export const VIEWER_READ_ONLY_API_MESSAGE =
  'บัญชีผู้เข้าชม (Viewer) มีสิทธิ์เข้าดูข้อมูลเท่านั้น ไม่สามารถส่งคำร้องหรือบันทึกแก้ไขข้อมูลได้';

export interface SessionPayload {
  uid: string;
  role: string;
  iat: number;
  exp: number;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function readStaticProcessEnv(key: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  switch (key) {
    case 'SESSION_SECRET':
      return process.env.SESSION_SECRET;
    case 'APPROVAL_SECRET':
      return process.env.APPROVAL_SECRET;
    case 'VAPID_PRIVATE_KEY':
      return process.env.VAPID_PRIVATE_KEY;
    case 'DATABASE_URL':
      return process.env.DATABASE_URL;
    case 'DIRECT_URL':
      return process.env.DIRECT_URL;
    default:
      return undefined;
  }
}

function readEnvVar(key: string): string | undefined {
  const processVal = readStaticProcessEnv(key);
  if (processVal && processVal.trim()) {
    return processVal.trim();
  }
  try {
    const cfGlobal = (globalThis as unknown as Record<symbol, unknown>)[
      Symbol.for('__cloudflare-context__')
    ] as { env?: Record<string, unknown> } | undefined;
    const cfVal = cfGlobal?.env?.[key];
    if (typeof cfVal === 'string' && cfVal.trim()) {
      return cfVal.trim();
    }
  } catch {
    // ignore missing Cloudflare runtime global context
  }
  return undefined;
}

function getSessionSecret(): string | null {
  const candidates: Array<[string, string]> = [
    ['explicit', 'SESSION_SECRET'],
    ['approval', 'APPROVAL_SECRET'],
    ['vapid', 'VAPID_PRIVATE_KEY'],
    ['db', 'DATABASE_URL'],
    ['direct', 'DIRECT_URL'],
  ];
  for (const [prefix, envKey] of candidates) {
    const val = readEnvVar(envKey);
    if (val) {
      return `${prefix}:${val}`;
    }
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    return 'dev-only-kunurse-session-secret-not-for-prod';
  }
  return null;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secretMaterial: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const derivedKeyBytes = await globalThis.crypto.subtle.digest(
    'SHA-256',
    textEncoder.encode(`kunurse-session-hmac-v1:${secretMaterial}`) as BufferSource
  );
  return globalThis.crypto.subtle.importKey(
    'raw',
    derivedKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

/**
 * Signs a short/long-lived HMAC-SHA256 session token using Web Crypto API (Edge & Node compatible).
 */
export async function signSessionToken(
  input: { uid: string; role: string },
  ttlMs: number
): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('SESSION_SECRET (or APPROVAL_SECRET) must be configured in production');
  }

  const now = Date.now();
  const payload: SessionPayload = {
    uid: input.uid,
    role: input.role,
    iat: now,
    exp: now + ttlMs,
  };

  const payloadB64 = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret, 'sign');
  const sigBuf = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(payloadB64) as BufferSource
  );
  const sigB64 = bytesToBase64Url(new Uint8Array(sigBuf));

  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifies an HMAC-SHA256 session token and checks its expiration timestamp.
 */
export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  const secret = getSessionSecret();
  if (!secret) return null;

  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx === token.length - 1) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64 || sigB64.includes('.')) return null;

  try {
    const key = await importHmacKey(secret, 'verify');
    const sigBytes = base64UrlToBytes(sigB64);
    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as BufferSource,
      textEncoder.encode(payloadB64) as BufferSource
    );
    if (!isValid) return null;

    const payloadBytes = base64UrlToBytes(payloadB64);
    const parsed = JSON.parse(textDecoder.decode(payloadBytes)) as Partial<SessionPayload>;

    if (
      !parsed ||
      typeof parsed.uid !== 'string' ||
      !parsed.uid ||
      typeof parsed.role !== 'string' ||
      !parsed.role ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }

    if (Date.now() > parsed.exp) {
      return null;
    }

    return {
      uid: parsed.uid,
      role: parsed.role,
      iat: parsed.iat,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function extractCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === name) {
      const rawVal = part.slice(eqIdx + 1).trim();
      try {
        return decodeURIComponent(rawVal);
      } catch {
        return rawVal;
      }
    }
  }
  return null;
}

export async function getSessionFromRequest(req: Request): Promise<SessionPayload | null> {
  const token = extractCookieValue(req.headers.get('cookie'), SESSION_COOKIE_NAME);
  return verifySessionToken(token);
}

export function isHttpsRequest(req?: Request): boolean {
  if (!req) {
    return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  }
  const forwardedProto = req.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  try {
    return new URL(req.url).protocol === 'https:';
  } catch {
    return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  }
}

export function attachSessionCookie(
  res: NextResponse,
  token: string,
  opts?: { rememberMe?: boolean; isRootAdmin?: boolean; req?: Request }
): NextResponse {
  const baseOptions: {
    name: string;
    value: string;
    httpOnly: boolean;
    sameSite: 'lax';
    secure: boolean;
    path: string;
    maxAge?: number;
  } = {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsRequest(opts?.req),
    path: '/',
  };

  if (!opts?.isRootAdmin) {
    baseOptions.maxAge = opts?.rememberMe !== false ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
  }

  res.cookies.set(baseOptions);
  return res;
}

export function clearSessionCookie(res: NextResponse, req?: Request): NextResponse {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsRequest(req),
    path: '/',
    maxAge: 0,
  });
  return res;
}
