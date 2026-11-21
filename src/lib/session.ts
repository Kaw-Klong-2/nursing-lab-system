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

function getSessionSecret(): string | null {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.APPROVAL_SECRET ||
    process.env.EXTERNAL_SYNC_API_KEY;
  if (secret && secret.trim()) {
    return secret.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  return 'dev-only-kunurse-session-secret-not-for-prod';
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

async function importHmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret) as BufferSource,
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

export function attachSessionCookie(
  res: NextResponse,
  token: string,
  opts?: { rememberMe?: boolean; isRootAdmin?: boolean }
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
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  if (!opts?.isRootAdmin) {
    baseOptions.maxAge = opts?.rememberMe !== false ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
  }

  res.cookies.set(baseOptions);
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
