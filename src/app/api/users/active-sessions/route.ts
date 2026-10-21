import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOnlineSessions } from '@/lib/user-presence';
import { getBangkokStartOfDay, getBangkokEndOfDay } from '@/lib/date-time-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const actorId = req.headers.get('x-user-id') || searchParams.get('actorId');

    // 1. ตรวจสอบสิทธิ์เฉพาะแอดมิน (Admin Guard)
    if (!actorId) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, role: true, status: true },
    });

    if (!actor || actor.role !== 'ADMIN' || actor.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'ปฏิเสธการเข้าถึง: ข้อมูลนี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' },
        { status: 403 }
      );
    }

    // 2. ดึงข้อมูลผู้ใช้ออนไลน์ ณ ขณะนี้ (Real-time Online Sessions จาก DB + Memory)
    const onlineSessions = await getActiveOnlineSessions();
    const onlineUserIds = onlineSessions.map((s) => s.userId);

    // 3. คำนวณช่วงเวลาวันนี้ตามเวลาประเทศไทย (UTC+7)
    const now = new Date();
    const startOfToday = getBangkokStartOfDay(now);
    const endOfToday = getBangkokEndOfDay(now);

    // 4. ดึงสถิติกิจกรรมของวันนี้ เพื่อดูจำนวนผู้ใช้งานที่ Active วันนี้
    const todayLogs = await prisma.activityLog.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      select: {
        userId: true,
        userRole: true,
        action: true,
        metadata: true,
      },
    });

    const activeTodayUserIds = new Set<string>();
    const activeTodayByRole = {
      ADMIN: 0,
      OFFICER: 0,
      TEACHER: 0,
      USER: 0, // นิสิต
    };

    todayLogs.forEach((log) => {
      if (log.userId && !activeTodayUserIds.has(log.userId)) {
        activeTodayUserIds.add(log.userId);
        const role = log.userRole || 'USER';
        if (role in activeTodayByRole) {
          activeTodayByRole[role as keyof typeof activeTodayByRole]++;
        } else {
          activeTodayByRole.USER++;
        }
      }
    });

    // เพิ่มผู้ที่กำลังออนไลน์เข้าไปในรายการ Active วันนี้ด้วยหากยังไม่มี
    onlineSessions.forEach((s) => {
      if (!activeTodayUserIds.has(s.userId)) {
        activeTodayUserIds.add(s.userId);
        const role = s.userRole || 'USER';
        if (role in activeTodayByRole) {
          activeTodayByRole[role as keyof typeof activeTodayByRole]++;
        } else {
          activeTodayByRole.USER++;
        }
      }
    });

    // 5. ดึงกิจกรรมล่าสุดของแต่ละคน (Last Activity Mapping)
    // ดึง Log ย้อนหลัง 1,000 รายการ เพื่อทำ Snapshot ล่าสุดของแต่ละ User ID
    const recentLogs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: {
        userId: true,
        action: true,
        entityType: true,
        entityTitle: true,
        details: true,
        createdAt: true,
        ipAddress: true,
        metadata: true,
      },
    });

    const lastActivityMap: Record<
      string,
      {
        lastActiveAt: string;
        action: string;
        details?: string | null;
        device?: string;
        ipAddress?: string | null;
      }
    > = {};

    for (const log of recentLogs) {
      if (log.userId && !lastActivityMap[log.userId]) {
        const meta = log.metadata as any;
        lastActivityMap[log.userId] = {
          lastActiveAt: log.createdAt.toISOString(),
          action: log.action,
          details: log.details || log.entityTitle,
          device: meta?.device,
          ipAddress: log.ipAddress,
        };
      }
    }

    // สำหรับคนที่กำลังออนไลน์ ถ้าเวลา lastActive ใน Session ใหม่กว่า ให้ใช้เวลาจาก Session
    for (const s of onlineSessions) {
      const existing = lastActivityMap[s.userId];
      const sessionDateIso = new Date(s.lastActive).toISOString();
      if (!existing || new Date(existing.lastActiveAt).getTime() < s.lastActive) {
        lastActivityMap[s.userId] = {
          lastActiveAt: sessionDateIso,
          action: existing?.action || 'ACTIVE',
          details: existing?.details || 'เปิดใช้งานระบบอยู่ขณะนี้',
          device: s.device,
          ipAddress: s.ipAddress || existing?.ipAddress,
        };
      }
    }

    // 6. สรุปประเภทอุปกรณ์ของคนที่ออนไลน์อยู่
    let desktopOnlineCount = 0;
    let mobileOnlineCount = 0;
    for (const s of onlineSessions) {
      if (s.device === 'MOBILE') mobileOnlineCount++;
      else desktopOnlineCount++;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        onlineCount: onlineUserIds.length,
        activeTodayCount: activeTodayUserIds.size,
        desktopOnlineCount,
        mobileOnlineCount,
        activeTodayByRole,
      },
      onlineUserIds,
      onlineSessions,
      lastActivityMap,
    });
  } catch (error: any) {
    console.error('Active sessions error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
