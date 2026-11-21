import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword } from '@/lib/auth-security';
import { signSessionToken, attachSessionCookie } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawIdentifier = body.identifier || body.email;
    const { password } = body;
    const rememberMe = body.rememberMe !== false;

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัสประจำตัว (ID) หรืออีเมล และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const trimmedInput = String(rawIdentifier).trim();

    // Prepare candidate identifiers for flexible matching (e.g. '6811700262' or 'b6811700262')
    const candidates = [trimmedInput];
    if (/^\d{8,12}$/.test(trimmedInput)) {
      candidates.push(`b${trimmedInput}`);
    } else if (/^b\d{8,12}$/i.test(trimmedInput)) {
      candidates.push(trimmedInput.slice(1));
    }

    // Match by email OR studentId (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: trimmedInput, mode: 'insensitive' } },
          ...candidates.map((cand) => ({
            studentId: { equals: cand, mode: 'insensitive' as const },
          })),
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบบัญชีผู้ใช้นี้ หรือรหัสประจำตัว/อีเมลไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if (user.status && user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'บัญชีผู้ใช้นี้ถูกปิดการใช้งานหรือระงับสิทธิ์แล้ว (เช่น สำเร็จการศึกษา หรือ ลาออก) กรุณาติดต่อเจ้าหน้าที่/ผู้ดูแลระบบห้องปฏิบัติการ' },
        { status: 403 }
      );
    }

    // Verify password using bcrypt or plain text with auto-upgrade
    const { isValid, needsMigration } = await verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 401 }
      );
    }

    // If password was stored as plain text, migrate to bcrypt hash immediately
    if (needsMigration) {
      const secureHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: secureHash },
      });
      console.log(`[AUTH SECURITY] Upgraded password for ${user.email} to bcrypt hash.`);
    }

    // Return sanitized user (exclude password, resetToken)
    const sanitizedUser = {
      id: user.id,
      prefix: user.prefix,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentId: user.studentId,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      approvalScopes: user.role === 'USER' || user.role === 'VIEWER' ? null : (user.approvalScopes || null),
      isExecutive: user.role === 'VIEWER' ? false : Boolean(user.isExecutive),
      executiveRole: user.role === 'VIEWER' ? null : (user.executiveRole || null),
    };

    // Record login presence and activity log
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
      details: `เข้าสู่ระบบผ่าน ${device === 'MOBILE' ? 'สมาร์ทโฟน/แท็บเล็ต' : 'คอมพิวเตอร์'}`,
      ipAddress,
      metadata: { device, userAgent },
    }).catch(() => {});

    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const normalizedStudentId = (user.studentId || '').toLowerCase().trim();
    const isRootAdmin =
      normalizedEmail === 'admin@lab.nurse.ac.th' ||
      (normalizedEmail === 'admin' && normalizedStudentId === 'admin');
    const ttlMs = isRootAdmin || !rememberMe ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const sessionToken = await signSessionToken({ uid: user.id, role: user.role }, ttlMs);

    const res = NextResponse.json({
      success: true,
      user: sanitizedUser,
    });
    return attachSessionCookie(res, sessionToken, { rememberMe, isRootAdmin, req });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
