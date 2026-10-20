import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBangkokStartOfDay, getBangkokEndOfDay, getBangkokParts } from '@/lib/date-time-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const actorId = req.headers.get('x-user-id') || searchParams.get('actorId');
    const range = searchParams.get('range') || 'TODAY'; // 'TODAY', 'YESTERDAY', '7DAYS', '30DAYS'

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
        { error: 'ปฏิเสธการเข้าถึง: ข้อมูลสถิติสงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' },
        { status: 403 }
      );
    }

    // 2. คำนวณขอบเขตวันที่ (Time Range Boundary) ตามเวลาประเทศไทย
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (range === 'YESTERDAY') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      startDate = getBangkokStartOfDay(yesterday);
      endDate = getBangkokEndOfDay(yesterday);
    } else if (range === '7DAYS') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = getBangkokStartOfDay(past7);
      endDate = getBangkokEndOfDay(now);
    } else if (range === '30DAYS') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = getBangkokStartOfDay(past30);
      endDate = getBangkokEndOfDay(now);
    } else {
      // TODAY
      startDate = getBangkokStartOfDay(now);
      endDate = getBangkokEndOfDay(now);
    }

    // 3. ดึงรายการ Activity Log ในช่วงเวลาดังกล่าว
    const logs = await prisma.activityLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        userId: true,
        userRole: true,
        action: true,
        entityType: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 4. กราฟที่ 1: ไทม์ไลน์รายชั่วโมง (Hourly Activity Timeline)
    // รองรับช่วงเวลาปฏิบัติการของแล็บ 08:00 - 18:00 หรือทุกชั่วโมงที่มีรายการ
    const hourlyMap = new Map<number, { hour: string; count: number; logins: number; transactions: number }>();
    for (let h = 8; h <= 18; h++) {
      const label = `${String(h).padStart(2, '0')}:00`;
      hourlyMap.set(h, { hour: label, count: 0, logins: 0, transactions: 0 });
    }

    // 5. กราฟที่ 2: จำแนกประเภทรายการ (Transaction Breakdown)
    const transactionCounts = {
      LOGIN: 0,        // เข้าสู่ระบบ
      REQUISITION: 0,  // ขอเบิกวัสดุ
      BORROW: 0,       // ขอยืมครุภัณฑ์
      ROOM_BOOKING: 0, // จองห้องปฏิบัติการ
      PRACTICE: 0,     // ฝึกทักษะปฏิบัติการ
      APPROVE: 0,      // อนุมัติรายการ
      DISPENSE: 0,     // จ่ายของ / ส่งมอบ
      RETURN: 0,       // รับคืนอุปกรณ์
      OTHER: 0,        // รายการอื่นๆ
    };

    // 6. กราฟที่ 3: สัดส่วนผู้ใช้งานตามบทบาท (Active Users by Role)
    const uniqueUserRoleMap = new Map<string, string>(); // userId -> role
    let desktopCount = 0;
    let mobileCount = 0;

    for (const log of logs) {
      // วิเคราะห์ชั่วโมง (เวลาไทย Asia/Bangkok UTC+7)
      const bkkParts = getBangkokParts(log.createdAt);
      const h = bkkParts.hours;

      if (!hourlyMap.has(h)) {
        hourlyMap.set(h, {
          hour: `${String(h).padStart(2, '0')}:00`,
          count: 0,
          logins: 0,
          transactions: 0,
        });
      }
      const hEntry = hourlyMap.get(h)!;
      hEntry.count++;

      if (log.action === 'LOGIN') {
        hEntry.logins++;
        transactionCounts.LOGIN++;
      } else {
        hEntry.transactions++;

        if (log.entityType === 'REQUISITION') transactionCounts.REQUISITION++;
        else if (log.entityType === 'BORROW' && log.action !== 'RETURN' && log.action !== 'CHECKOUT') transactionCounts.BORROW++;
        else if (log.entityType === 'ROOM_BOOKING') transactionCounts.ROOM_BOOKING++;
        else if (log.entityType === 'PRACTICE_BOOKING') transactionCounts.PRACTICE++;
        else if (log.action === 'APPROVE') transactionCounts.APPROVE++;
        else if (log.action === 'CHECKOUT' || log.action === 'DISPENSE') transactionCounts.DISPENSE++;
        else if (log.action === 'RETURN') transactionCounts.RETURN++;
        else transactionCounts.OTHER++;
      }

      // นับผู้ใช้และบทบาท
      if (log.userId) {
        uniqueUserRoleMap.set(log.userId, log.userRole || 'USER');
      }

      // ตรวจสอบอุปกรณ์
      const meta = log.metadata as any;
      if (meta?.device === 'MOBILE') mobileCount++;
      else if (meta?.device === 'DESKTOP') desktopCount++;
    }

    const hourlyTimeline = Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, v]) => v);

    const transactionBreakdown = [
      { name: 'เข้าสู่ระบบ', key: 'LOGIN', count: transactionCounts.LOGIN, fill: '#0ea5e9' },
      { name: 'ยื่นขอเบิกวัสดุ', key: 'REQUISITION', count: transactionCounts.REQUISITION, fill: '#14b8a6' },
      { name: 'ยื่นขอยืมครุภัณฑ์', key: 'BORROW', count: transactionCounts.BORROW, fill: '#6366f1' },
      { name: 'จองห้องแล็บ', key: 'ROOM_BOOKING', count: transactionCounts.ROOM_BOOKING, fill: '#8b5cf6' },
      { name: 'ฝึกปฏิบัติการ', key: 'PRACTICE', count: transactionCounts.PRACTICE, fill: '#ec4899' },
      { name: 'อนุมัติคำขอ', key: 'APPROVE', count: transactionCounts.APPROVE, fill: '#10b981' },
      { name: 'จ่ายของ/ส่งมอบ', key: 'DISPENSE', count: transactionCounts.DISPENSE, fill: '#f59e0b' },
      { name: 'ตรวจรับคืน', key: 'RETURN', count: transactionCounts.RETURN, fill: '#a855f7' },
      { name: 'รายการอื่นๆ', key: 'OTHER', count: transactionCounts.OTHER, fill: '#94a3b8' },
    ].filter((item) => item.count > 0 || range === 'TODAY');

    // จำแนกสัดส่วนบทบาทของผู้ใช้งาน
    const roleStats = {
      USER: 0,      // นิสิต
      TEACHER: 0,   // อาจารย์
      OFFICER: 0,   // เจ้าหน้าที่แล็บ
      ADMIN: 0,     // ผู้ดูแลระบบ
    };

    for (const [_, role] of uniqueUserRoleMap) {
      if (role in roleStats) {
        roleStats[role as keyof typeof roleStats]++;
      } else {
        roleStats.USER++;
      }
    }

    const usersByRole = [
      { name: 'นิสิต', role: 'USER', count: roleStats.USER, fill: '#0d9488' },
      { name: 'อาจารย์', role: 'TEACHER', count: roleStats.TEACHER, fill: '#6366f1' },
      { name: 'เจ้าหน้าที่', role: 'OFFICER', count: roleStats.OFFICER, fill: '#f59e0b' },
      { name: 'ผู้ดูแลระบบ', role: 'ADMIN', count: roleStats.ADMIN, fill: '#ef4444' },
    ];

    return NextResponse.json({
      success: true,
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalActivities: logs.length,
        uniqueUsersCount: uniqueUserRoleMap.size,
        desktopCount,
        mobileCount,
      },
      hourlyTimeline,
      transactionBreakdown,
      usersByRole,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
