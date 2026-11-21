import { NextResponse } from 'next/server';
import { recordUserHeartbeat, isUserForceLoggedOut, removeUserPresence } from '@/lib/user-presence';
import { getSessionFromRequest, clearSessionCookie } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.uid) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const userId = session.uid;
    const body = await req.json().catch(() => ({}));
    const sessionLoginTime = body.loginTime ? Number(body.loginTime) : session.iat;
    const isLogout = Boolean(body.isLogout);

    // กรณีไคลเอนต์แจ้งออกจากระบบ (Explicit Logout)
    if (isLogout) {
      await removeUserPresence(userId);
      const { logActivity } = await import('@/lib/activity-log');
      logActivity({
        userId,
        userRole: session.role,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: userId,
        details: 'ออกจากระบบปกติ',
      }).catch(() => {});
      const res = NextResponse.json({ success: true, loggedOut: true });
      return clearSessionCookie(res, req);
    }

    // ตรวจสอบว่าผู้ใช้ถูกสั่งให้ออกจากระบบระยะไกล (Force Logout) หรือไม่
    const forceLoggedOut = await isUserForceLoggedOut(userId, sessionLoginTime);
    if (forceLoggedOut) {
      const res = NextResponse.json({
        success: false,
        forceLogout: true,
        message: 'เซสชันของคุณถูกสั่งให้ออกจากระบบโดยผู้ดูแลระบบ เพื่อความปลอดภัย',
      });
      return clearSessionCookie(res, req);
    }

    const userAgent = req.headers.get('user-agent');
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');

    await recordUserHeartbeat({
      userId,
      userAgent,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      online: true,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Heartbeat error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการส่งสัญญาณ Heartbeat' }, { status: 500 });
  }
}
