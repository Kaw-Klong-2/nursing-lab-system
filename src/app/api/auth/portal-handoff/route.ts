import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawEmail = body.email || '';
    const token = body.token;

    // 1. Identify target email (from body.email or token payload)
    let requestedEmail = String(rawEmail).trim().toLowerCase();

    if (token) {
      try {
        const decodedStr = Buffer.from(token, 'base64').toString('utf-8');
        const payload = JSON.parse(decodedStr);
        if (payload?.email) {
          const tokenEmail = String(payload.email).trim().toLowerCase();
          if (requestedEmail && requestedEmail !== tokenEmail) {
            return NextResponse.json(
              { error: 'อีเมลที่ระบุไม่ตรงกับข้อมูลใน Hand-off token' },
              { status: 400 }
            );
          }
          requestedEmail = tokenEmail;
        }

        // Optional HMAC signature verification if sig is present
        if (payload?.sig) {
          const crypto = await import('crypto');
          const secret = process.env.EXTERNAL_SYNC_API_KEY || 'lab_nursing_sync_key_2026_sec';
          const expectedSig = crypto
            .createHmac('sha256', secret)
            .update(`${payload.email}:${payload.ts}:${payload.source}`)
            .digest('hex');
          if (payload.sig !== expectedSig) {
            return NextResponse.json(
              { error: 'ลายเซ็นดิจิทัล (HMAC signature) ของ portal_token ไม่ถูกต้อง' },
              { status: 403 }
            );
          }
        }
      } catch (e) {
        console.warn('Failed to parse portal_token, falling back to direct email handoff:', e);
      }
    }

    if (!requestedEmail) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลอีเมลสำหรับยืนยันตัวตน' },
        { status: 400 }
      );
    }

    // 2. SECURITY GUARD: The generic shared root admin account MUST NEVER be logged in via external link without password
    if (requestedEmail === 'admin@lab.nurse.ac.th' || requestedEmail === 'admin') {
      return NextResponse.json(
        {
          error: 'ROOT_ADMIN_BLOCKED',
          message: 'บัญชีผู้ดูแลระบบกลางจำเป็นต้องเข้าสู่ระบบโดยตรงด้วยรหัสผ่านเท่านั้น',
        },
        { status: 403 }
      );
    }

    // 3. Find matching user in database (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: requestedEmail, mode: 'insensitive' },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `ไม่พบบัญชี ${requestedEmail} ในระบบห้องปฏิบัติการพยาบาล กรุณาลงทะเบียนก่อนเข้าใช้งาน`,
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

    // 4. Return sanitized user for instant auto-login
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
      approvalScopes: user.role === 'USER' ? null : (user.approvalScopes || null),
      isExecutive: Boolean(user.isExecutive),
      executiveRole: user.executiveRole || null,
    };

    console.log(`[AUTH HAND-OFF SUCCESS] User ${sanitizedUser.email} (${sanitizedUser.role}) logged in via portal hand-off.`);

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
