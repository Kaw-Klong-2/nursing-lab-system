import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSessionToken, attachSessionCookie } from '@/lib/session';

const PORTAL_TOKEN_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

function decodePortalTokenPayload(rawToken: string): {
  email?: unknown;
  ts?: unknown;
  source?: unknown;
  sig?: unknown;
} {
  // รองรับทั้ง Base64 มาตรฐาน และ Base64URL (รวมทั้งกรณี + ถูกแปลงเป็นเว้นวรรคจาก query string)
  const base64Standard = rawToken
    .trim()
    .replace(/ /g, '+')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLength = (4 - (base64Standard.length % 4)) % 4;
  const padded = base64Standard + '='.repeat(padLength);
  const decodedStr = Buffer.from(padded, 'base64').toString('utf-8');
  return JSON.parse(decodedStr);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email || '';
    const token = body.token;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        {
          code: 'MISSING_TOKEN',
          error: 'จำเป็นต้องมี portal_token ที่ลงนามยืนยันตัวตนแล้วเท่านั้น',
        },
        { status: 401 }
      );
    }

    const secret =
      process.env.EXTERNAL_SYNC_API_KEY ||
      (process.env.NODE_ENV !== 'production' ? 'dev-only-external-sync-key' : '');
    if (!secret) {
      return NextResponse.json(
        {
          code: 'MISSING_SECRET',
          error: 'ระบบยังไม่ได้ตั้งค่า EXTERNAL_SYNC_API_KEY',
        },
        { status: 503 }
      );
    }

    let payload: { email?: unknown; ts?: unknown; source?: unknown; sig?: unknown };
    try {
      payload = decodePortalTokenPayload(token);
    } catch {
      return NextResponse.json(
        {
          code: 'INVALID_FORMAT',
          error: 'รูปแบบ portal_token ไม่ถูกต้อง',
        },
        { status: 400 }
      );
    }

    if (!payload || typeof payload.sig !== 'string' || !payload.sig.trim()) {
      return NextResponse.json(
        {
          code: 'MISSING_SIG',
          error: 'portal_token ยังไม่ได้ลงนามยืนยันตัวตน (ขาดฟิลด์ sig)',
        },
        { status: 403 }
      );
    }

    if (
      typeof payload.email !== 'string' ||
      !payload.email.trim() ||
      (typeof payload.ts !== 'number' && typeof payload.ts !== 'string') ||
      typeof payload.source !== 'string' ||
      !payload.source
    ) {
      return NextResponse.json(
        {
          code: 'MISSING_FIELDS',
          error: 'ข้อมูลใน portal_token ไม่ครบถ้วน',
        },
        { status: 400 }
      );
    }

    const tokenEmail = payload.email.trim().toLowerCase();
    const requestedEmail = String(rawEmail).trim().toLowerCase();
    if (requestedEmail && requestedEmail !== tokenEmail) {
      return NextResponse.json(
        {
          code: 'EMAIL_MISMATCH',
          error: 'อีเมลที่ระบุไม่ตรงกับข้อมูลใน Hand-off token',
        },
        { status: 400 }
      );
    }

    const tsNum = Number(payload.ts);
    const tsMs = tsNum < 1e12 ? tsNum * 1000 : tsNum;
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsMs) > PORTAL_TOKEN_MAX_AGE_MS) {
      return NextResponse.json(
        {
          code: 'EXPIRED_TOKEN',
          error: 'portal_token หมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        },
        { status: 403 }
      );
    }

    const providedSigHex = payload.sig.trim().toLowerCase();
    const providedBuf = Buffer.from(providedSigHex, 'utf8');
    const signatureCandidates = [
      `${payload.email}:${payload.ts}:${payload.source}`,
      `${tokenEmail}:${payload.ts}:${payload.source}`,
    ];
    const isSignatureValid = signatureCandidates.some((canonicalPayload) => {
      const expectedSigHex = crypto
        .createHmac('sha256', secret)
        .update(canonicalPayload)
        .digest('hex')
        .toLowerCase();
      const expectedBuf = Buffer.from(expectedSigHex, 'utf8');
      return (
        providedBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(providedBuf, expectedBuf)
      );
    });

    if (!isSignatureValid) {
      return NextResponse.json(
        {
          code: 'INVALID_SIGNATURE',
          error: 'ลายเซ็นดิจิทัล (HMAC signature) ของ portal_token ไม่ถูกต้อง',
        },
        { status: 403 }
      );
    }

    // SECURITY GUARD: The generic shared root admin account MUST NEVER be logged in via external link without password
    if (tokenEmail === 'admin@lab.nurse.ac.th' || tokenEmail === 'admin') {
      return NextResponse.json(
        {
          error: 'ROOT_ADMIN_BLOCKED',
          message: 'บัญชีผู้ดูแลระบบกลางจำเป็นต้องเข้าสู่ระบบโดยตรงด้วยรหัสผ่านเท่านั้น',
        },
        { status: 403 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: tokenEmail, mode: 'insensitive' },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `ไม่พบบัญชี ${tokenEmail} ในระบบห้องปฏิบัติการพยาบาล กรุณาลงทะเบียนก่อนเข้าใช้งาน`,
        },
        { status: 404 }
      );
    }

    if (user.status && user.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          error: 'DEACTIVATED',
          message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งานในระบบห้องปฏิบัติการพยาบาล',
        },
        { status: 403 }
      );
    }

    const sanitizedUser = {
      id: user.id,
      prefix: user.prefix,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentId: user.studentId,
      phone: user.phone,
      status: user.status,
      approvalScopes: user.role === 'USER' || user.role === 'VIEWER' ? null : (user.approvalScopes || null),
      isExecutive: user.role === 'VIEWER' ? false : Boolean(user.isExecutive),
      executiveRole: user.role === 'VIEWER' ? null : (user.executiveRole || null),
    };

    const userAgent = req.headers.get('user-agent');
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');

    const { recordUserHeartbeat, detectDeviceType } = await import('@/lib/user-presence');
    const { logActivity } = await import('@/lib/activity-log');

    const device = detectDeviceType(userAgent);

    await recordUserHeartbeat({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      userAgent,
      ipAddress,
      isLogin: true,
    });

    logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      entityTitle: user.name,
      details: `เข้าสู่ระบบผ่าน SSO Hand-off (${device === 'MOBILE' ? 'สมาร์ทโฟน/แท็บเล็ต' : 'คอมพิวเตอร์'})`,
      ipAddress,
      metadata: { device, userAgent, source: 'SSO_HANDOFF' },
    }).catch(() => {});

    const ttlMs = 30 * 24 * 60 * 60 * 1000;
    const sessionToken = await signSessionToken({ uid: user.id, role: user.role }, ttlMs);

    const res = NextResponse.json({
      success: true,
      user: sanitizedUser,
    });
    return attachSessionCookie(res, sessionToken, { rememberMe: true, isRootAdmin: false, req });
  } catch (error) {
    console.error('Portal hand-off error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ Portal Hand-off' },
      { status: 500 }
    );
  }
}
