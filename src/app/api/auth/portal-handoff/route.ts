import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, email } = body;

    if (!token || !email) {
      return NextResponse.json(
        { error: 'ข้อมูล Hand-off token หรืออีเมลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    // 1. Verify and decode lightweight hand-off token
    let payload: any = null;
    try {
      const decodedStr = Buffer.from(token, 'base64').toString('utf-8');
      payload = JSON.parse(decodedStr);
    } catch (e) {
      return NextResponse.json(
        { error: 'รูปแบบ portal_token ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    if (
      !payload ||
      payload.source !== 'nursing_app_portal' ||
      !payload.email ||
      !payload.ts
    ) {
      return NextResponse.json(
        { error: 'portal_token ไม่ตรงตามมาตรฐานความปลอดภัยของ Portal' },
        { status: 403 }
      );
    }

    // 2. Check token timestamp (within 15 minutes to allow slight server clock drift)
    const tokenTs = Number(payload.ts);
    const now = Date.now();
    if (isNaN(tokenTs) || Math.abs(now - tokenTs) > 15 * 60 * 1000) {
      return NextResponse.json(
        { error: 'portal_token หมดอายุแล้ว กรุณากดลิงก์ใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    // 3. Verify email matches token email
    const requestedEmail = String(email).trim().toLowerCase();
    const tokenEmail = String(payload.email).trim().toLowerCase();
    if (requestedEmail !== tokenEmail) {
      return NextResponse.json(
        { error: 'อีเมลที่ระบุไม่ตรงกับ portal_token' },
        { status: 403 }
      );
    }

    // 4. Optional Cryptographic HMAC verification if signature is provided
    if (payload.sig) {
      const crypto = await import('crypto');
      const secret = process.env.EXTERNAL_SYNC_API_KEY || 'lab_nursing_sync_key_2026_sec';
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${tokenEmail}:${tokenTs}:${payload.source}`)
        .digest('hex');
      if (payload.sig !== expectedSig) {
        return NextResponse.json(
          { error: 'ลายเซ็นดิจิทัล (HMAC signature) ของ portal_token ไม่ถูกต้อง' },
          { status: 403 }
        );
      }
    }

    // 5. Find matching user in database (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: requestedEmail, mode: 'insensitive' },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `ไม่พบบัญชี ${requestedEmail} ในระบบห้องปฏิบัติการพยาบาล กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มสิทธิ์ใช้งาน`,
        },
        { status: 404 }
      );
    }

    if (user.status && user.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          error: 'DEACTIVATED',
          message: 'บัญชีผู้ใช้นี้ถูกปิดการใช้งานในระบบห้องปฏิบัติการพยาบาล',
        },
        { status: 403 }
      );
    }

    // 6. SECURITY GUARD: Administrative accounts (ADMIN, OFFICER) CANNOT be logged in via lightweight Portal Hand-off
    // They must authenticate directly via dedicated credentials or institutional Google sign-in.
    if (
      user.role === 'ADMIN' ||
      user.role === 'OFFICER' ||
      user.email === 'admin@lab.nurse.ac.th'
    ) {
      console.warn(`[SECURITY AUDIT] Blocked portal-handoff attempt for privileged role (${user.role}): ${user.email}`);
      return NextResponse.json(
        {
          error: 'PRIVILEGE_RESTRICTED',
          message: 'บัญชีผู้ดูแลระบบและเจ้าหน้าที่จำเป็นต้องเข้าสู่ระบบโดยตรง ไม่สามารถรับสิทธิ์ผ่าน Portal Hand-off ได้',
        },
        { status: 403 }
      );
    }

    // 7. Return sanitized user for instant auto-login
    const sanitizedUser = {
      id: user.id,
      prefix: user.prefix,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentId: user.studentId,
      phone: user.phone,
      approvalScopes: user.approvalScopes,
    };

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
    });
  } catch (error: any) {
    console.error('Portal hand-off error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Portal Hand-off' },
      { status: 500 }
    );
  }
}
