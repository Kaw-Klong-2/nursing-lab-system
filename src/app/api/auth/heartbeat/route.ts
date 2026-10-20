import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordUserHeartbeat, isUserForceLoggedOut, removeUserPresence } from '@/lib/user-presence';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || req.headers.get('x-user-id');
    const sessionLoginTime = body.loginTime ? Number(body.loginTime) : undefined;
    const isLogout = Boolean(body.isLogout);

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // กรณีไคลเอนต์แจ้งออกจากระบบ (Explicit Logout)
    if (isLogout) {
      removeUserPresence(userId);
      const { logActivity } = await import('@/lib/activity-log');
      logActivity({
        userId,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: userId,
        details: 'ออกจากระบบปกติ',
      }).catch(() => {});
      return NextResponse.json({ success: true, loggedOut: true });
    }

    // ตรวจสอบว่าผู้ใช้ถูกสั่งให้ออกจากระบบระยะไกล (Force Logout) หรือไม่
    if (isUserForceLoggedOut(userId, sessionLoginTime)) {
      return NextResponse.json({
        success: false,
        forceLogout: true,
        message: 'เซสชันของคุณถูกสั่งให้ออกจากระบบโดยผู้ดูแลระบบ เพื่อความปลอดภัย',
      });
    }

    const userAgent = req.headers.get('user-agent');
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');

    // บันทึก Heartbeat ใน Presence Engine
    recordUserHeartbeat({
      userId,
      userAgent,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      online: true,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Heartbeat error' }, { status: 500 });
  }
}
