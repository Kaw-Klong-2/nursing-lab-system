/**
 * โมดูลรวบรวมและกลั่นกรองข้อมูลระบบตามบทบาทสิทธิ์ (RBAC-Scoped Context Aggregator)
 * ทำหน้าที่สรุปบริบทพื้นฐานตามสิทธิ์ผู้ใช้เพื่อส่งให้ Gemini AI พร้อมลด Token ส่วนเกิน
 */

import { prisma } from './prisma';
import { getBangkokParts } from './date-time-utils';

export interface UserScopedSystemContext {
  role: string;
  userName: string;
  currentBangkokTime: string;
  todayDateStr: string;
  isLabOpenNow: boolean;

  publicDirectory: {
    rooms: Array<{ code: string; name: string; capacity: number; location: string | null }>;
    kitsCount: number;
    operatingHours: string;
  };

  userPersonalData?: {
    activeBorrowsCount: number;
    activeRequisitionsCount: number;
    activeRoomBookingsCount: number;
    activePracticeBookingsCount: number;
  };

  teacherData?: {
    assignedCoursesCount: number;
    pendingStudentRequestsCount: number;
  };

  staffData?: {
    allPendingApprovalsCount: number;
    overdueBorrowsCount: number;
    acSummary: { totalHoursToday: number; recentLog: string | null };
    repairSummary: { pendingRepairsCount: number };
  };
}

/**
 * ดึงและจัดหมวดหมู่ข้อมูลสรุปของระบบให้สอดคล้องกับสิทธิ์ของผู้ถาม
 */
export async function assembleUserScopedContext(
  currentUser: any,
  _query: string = ''
): Promise<UserScopedSystemContext> {
  const role = (currentUser?.role || 'USER').toUpperCase();
  const userId = currentUser?.id;
  const userName = currentUser?.name || 'ผู้ใช้งาน';

  const now = new Date();
  const bkk = getBangkokParts(now);
  const bangkokFormatter = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const currentBangkokTime = bangkokFormatter.format(now);

  const isWeekend = bkk.dayOfWeek === 0 || bkk.dayOfWeek === 6;
  const currentMinutes = bkk.hours * 60 + bkk.minutes;
  const isLabOpenNow = !isWeekend && currentMinutes >= 8 * 60 + 30 && currentMinutes < 16 * 60 + 30;

  const [rooms, kitsCount] = await Promise.all([
    prisma.practiceRoom.findMany({
      where: { isActive: true },
      select: { code: true, name: true, capacity: true, location: true },
      orderBy: { code: 'asc' },
    }),
    prisma.practiceKit.count({ where: { isActive: true } }),
  ]);

  const context: UserScopedSystemContext = {
    role,
    userName,
    currentBangkokTime,
    todayDateStr: bkk.dateString,
    isLabOpenNow,
    publicDirectory: {
      rooms: rooms.map((r) => ({ code: r.code, name: r.name, capacity: r.capacity, location: r.location })),
      kitsCount,
      operatingHours: 'วันจันทร์ - ศุกร์ เวลา 08:30 - 16:30 น. (ปิดวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์)',
    },
  };

  if (userId) {
    try {
      const [borrowsCount, reqsCount, roomBookingsCount, practiceBookingsCount] = await Promise.all([
        prisma.borrowRequest.count({ where: { userId, status: { in: ['PENDING', 'APPROVED', 'BORROWED'] } } }),
        prisma.requisitionRequest.count({ where: { userId, status: { in: ['PENDING', 'APPROVED'] } } }),
        prisma.roomBooking.count({ where: { userId, status: { in: ['PENDING', 'APPROVED'] } } }),
        prisma.practiceBooking.count({ where: { userId, status: { in: ['PENDING', 'APPROVED'] } } }),
      ]);

      context.userPersonalData = {
        activeBorrowsCount: borrowsCount,
        activeRequisitionsCount: reqsCount,
        activeRoomBookingsCount: roomBookingsCount,
        activePracticeBookingsCount: practiceBookingsCount,
      };
    } catch (e) {
      console.warn('Error fetching personal chatbot context:', e);
    }
  }

  if (role === 'APPROVER' || role === 'TEACHER') {
    try {
      const [coursesCount, pendingReqsCount] = await Promise.all([
        prisma.course.count({
          where: {
            status: 'ACTIVE',
            ...(role === 'TEACHER' ? { instructorName: { contains: userName } } : {}),
          },
        }),
        prisma.requisitionRequest.count({
          where: {
            status: 'PENDING',
            ...(role === 'TEACHER'
              ? {
                  OR: [
                    { advisorName: { contains: userName } },
                    { course: { instructorName: { contains: userName } } },
                  ],
                }
              : {}),
          },
        }),
      ]);

      context.teacherData = {
        assignedCoursesCount: coursesCount,
        pendingStudentRequestsCount: pendingReqsCount,
      };
    } catch (e) {
      console.warn('Error fetching teacher chatbot context:', e);
    }
  }

  if (role === 'OFFICER' || role === 'ADMIN') {
    try {
      const nowUtc = new Date();
      const todayUtcStart = new Date(Date.UTC(bkk.year, bkk.month, bkk.day, 0, 0, 0, 0));
      const todayUtcEnd = new Date(Date.UTC(bkk.year, bkk.month, bkk.day, 23, 59, 59, 999));

      const [
        pendingBorrowsCount,
        pendingReqsCount,
        pendingRoomsCount,
        pendingPracticeCount,
        overdueBorrowsCount,
        todayAcLogs,
        recentAc,
        pendingRepairsCount,
      ] = await Promise.all([
        prisma.borrowRequest.count({ where: { status: 'PENDING' } }),
        prisma.requisitionRequest.count({ where: { status: 'PENDING' } }),
        prisma.roomBooking.count({ where: { status: 'PENDING' } }),
        prisma.practiceBooking.count({ where: { status: 'PENDING' } }),
        prisma.borrowRequest.count({
          where: {
            status: 'BORROWED',
            expectedReturnDate: { lt: nowUtc },
          },
        }),
        prisma.acOperationLog.findMany({
          where: { date: { gte: todayUtcStart, lte: todayUtcEnd } },
          select: { usageHours: true },
        }),
        prisma.acOperationLog.findFirst({
          orderBy: { date: 'desc' },
          include: { room: { select: { code: true } } },
        }),
        prisma.equipmentIssueReport.count({
          where: { status: { in: ['PENDING', 'ACKNOWLEDGED', 'SENT_TO_REPAIR'] } },
        }),
      ]);

      const totalHoursToday =
        Math.round(todayAcLogs.reduce((sum, l) => sum + (l.usageHours || 0), 0) * 10) / 10;

      context.staffData = {
        allPendingApprovalsCount:
          pendingBorrowsCount + pendingReqsCount + pendingRoomsCount + pendingPracticeCount,
        overdueBorrowsCount,
        acSummary: {
          totalHoursToday,
          recentLog: recentAc
            ? `${recentAc.date.toISOString().slice(0, 10)} ห้อง ${recentAc.room.code} (${recentAc.openTime || '-'} - ${recentAc.closeTime || '-'})`
            : null,
        },
        repairSummary: {
          pendingRepairsCount,
        },
      };
    } catch (e) {
      console.warn('Error fetching staff chatbot context:', e);
    }
  }

  return context;
}
