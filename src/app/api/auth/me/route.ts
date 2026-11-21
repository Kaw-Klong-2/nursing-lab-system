import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, clearSessionCookie } from '@/lib/session';
import { isUserForceLoggedOut } from '@/lib/user-presence';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.uid },
      select: {
        id: true,
        prefix: true,
        name: true,
        email: true,
        role: true,
        department: true,
        studentId: true,
        phone: true,
        avatar: true,
        status: true,
        approvalScopes: true,
        isExecutive: true,
        executiveRole: true,
      },
    });

    if (!user || (user.status && user.status !== 'ACTIVE')) {
      const res = NextResponse.json(
        { authenticated: false, error: 'เซสชันหมดอายุหรือไม่ถูกต้อง' },
        { status: 401 }
      );
      return clearSessionCookie(res, req);
    }

    const forceLoggedOut = await isUserForceLoggedOut(user.id, session.iat);
    if (forceLoggedOut) {
      const res = NextResponse.json(
        { authenticated: false, forceLogout: true, error: 'เซสชันหมดอายุหรือไม่ถูกต้อง' },
        { status: 401 }
      );
      return clearSessionCookie(res, req);
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
      avatar: user.avatar,
      status: user.status,
      approvalScopes: user.role === 'USER' || user.role === 'VIEWER' ? null : (user.approvalScopes || null),
      isExecutive: user.role === 'VIEWER' ? false : Boolean(user.isExecutive),
      executiveRole: user.role === 'VIEWER' ? null : (user.executiveRole || null),
    };

    return NextResponse.json({
      authenticated: true,
      user: sanitizedUser,
    });
  } catch (err) {
    console.error('Session verification error (/api/auth/me):', err);
    return NextResponse.json(
      { authenticated: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบเซสชัน' },
      { status: 500 }
    );
  }
}
