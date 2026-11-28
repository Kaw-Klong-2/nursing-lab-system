/**
 * โมดูลจัดการสิทธิ์การใช้งาน AI Copilot (Feature Flag) และสรุปงานประจำวัน (Daily Briefing)
 */

import { prisma } from './prisma';
import { getBangkokParts } from './date-time-utils';
import { AiCopilotConfigData, AiModelMode, DailyBriefingData } from '@/types/chatbot';

const DEFAULT_AI_CONFIG = {
  id: 'default',
  enableForTeachers: false,
  enableForStudents: false,
  enableForExecutives: true,
  defaultModelMode: 'fast',
};

/**
 * ตรวจสอบสิทธิ์ใช้งาน AI Copilot จากตาราง AiCopilotConfig ตามบทบาทผู้ใช้
 */
export async function getAiCopilotConfigForActor(role: string): Promise<AiCopilotConfigData> {
  const normalizedRole = (role || 'USER').toUpperCase();

  let config = await prisma.aiCopilotConfig.findUnique({
    where: { id: 'default' },
  });

  if (!config) {
    config = await prisma.aiCopilotConfig.create({
      data: DEFAULT_AI_CONFIG,
    });
  }

  let canUseCopilot = false;
  if (normalizedRole === 'ADMIN' || normalizedRole === 'OFFICER') {
    canUseCopilot = true;
  } else if (normalizedRole === 'TEACHER' || normalizedRole === 'APPROVER') {
    canUseCopilot = config.enableForTeachers;
  } else if (normalizedRole === 'EXECUTIVE') {
    canUseCopilot = config.enableForExecutives;
  } else if (normalizedRole === 'USER') {
    canUseCopilot = config.enableForStudents;
  } else {
    // VIEWER ไม่เปิดให้ใช้งาน AI Copilot
    canUseCopilot = false;
  }

  const defaultModelMode: AiModelMode = config.defaultModelMode === 'deep' ? 'deep' : 'fast';

  return {
    enableForTeachers: config.enableForTeachers,
    enableForStudents: config.enableForStudents,
    enableForExecutives: config.enableForExecutives,
    defaultModelMode,
    canUseCopilot,
  };
}

/**
 * สร้างข้อมูล Daily Briefing สำหรับผู้ดูแลระบบและเจ้าหน้าที่
 */
export async function buildDailyBriefing(actor: { id: string; role: string }): Promise<DailyBriefingData | null> {
  const role = (actor.role || 'USER').toUpperCase();
  if (role !== 'ADMIN' && role !== 'OFFICER') {
    return null;
  }

  const now = new Date();
  const bkk = getBangkokParts(now);
  const isWeekend = bkk.dayOfWeek === 0 || bkk.dayOfWeek === 6;
  const currentMinutes = bkk.hours * 60 + bkk.minutes;
  const isLabOpenNow = !isWeekend && currentMinutes >= 8 * 60 + 30 && currentMinutes < 16 * 60 + 30;

  const dateLabel = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  const todayUtcStart = new Date(Date.UTC(bkk.year, bkk.month, bkk.day, 0, 0, 0, 0));
  const todayUtcEnd = new Date(Date.UTC(bkk.year, bkk.month, bkk.day, 23, 59, 59, 999));
  const expiryLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    pendingBorrows,
    pendingReqs,
    pendingRooms,
    pendingPractices,
    overdueBorrows,
    activeItems,
    expiringLotsCount,
    todayBookings,
    pendingIssues,
    todayAcLogs,
  ] = await Promise.all([
    prisma.borrowRequest.count({ where: { status: 'PENDING' } }),
    prisma.requisitionRequest.count({ where: { status: 'PENDING' } }),
    prisma.roomBooking.count({ where: { status: 'PENDING' } }),
    prisma.practiceBooking.count({ where: { status: 'PENDING' } }),
    prisma.borrowRequest.count({
      where: { status: 'BORROWED', expectedReturnDate: { lt: now } },
    }),
    prisma.item.findMany({
      where: { status: 'ACTIVE' },
      select: {
        type: true,
        minStockAlert: true,
        assets: { where: { status: 'AVAILABLE' }, select: { id: true } },
        stockLots: { select: { quantityRemaining: true } },
      },
    }),
    prisma.stockLot.count({
      where: {
        quantityRemaining: { gt: 0 },
        expiryDate: { not: null, lte: expiryLimit },
      },
    }),
    prisma.roomBooking.findMany({
      where: {
        bookingDate: { gte: todayUtcStart, lte: todayUtcEnd },
        status: { in: ['APPROVED', 'PENDING'] },
      },
      include: { room: { select: { code: true } } },
      orderBy: { startTime: 'asc' },
      take: 20,
    }),
    prisma.equipmentIssueReport.count({
      where: { status: { in: ['PENDING', 'ACKNOWLEDGED', 'SENT_TO_REPAIR'] } },
    }),
    prisma.acOperationLog.findMany({
      where: { date: { gte: todayUtcStart, lte: todayUtcEnd } },
      select: { usageHours: true },
    }),
  ]);

  let lowStock = 0;
  for (const item of activeItems) {
    if (item.type === 'EQUIPMENT') {
      if (item.assets.length <= item.minStockAlert) lowStock += 1;
    } else {
      const rem = item.stockLots.reduce((sum, l) => sum + (l.quantityRemaining || 0), 0);
      if (rem <= item.minStockAlert) lowStock += 1;
    }
  }

  const todayAcHours = Math.round(todayAcLogs.reduce((sum, l) => sum + (l.usageHours || 0), 0) * 10) / 10;

  return {
    dateLabel,
    isLabOpenNow,
    role,
    metrics: {
      pendingApprovals: pendingBorrows + pendingReqs + pendingRooms + pendingPractices,
      overdueBorrows,
      lowStock,
      expiringSoon: expiringLotsCount,
      todayRoomBookings: todayBookings.length,
      pendingIssues,
      todayAcHours,
    },
    todayBookingsPreview: todayBookings.slice(0, 3).map((b) => ({
      roomCode: b.room.code,
      timeRange: `${b.startTime}-${b.endTime}`,
      title: b.title,
    })),
  };
}
