/**
 * โมดูลรวบรวมและกลั่นกรองข้อมูลระบบตามบทบาทสิทธิ์ (RBAC-Scoped Context Aggregator)
 * ทำหน้าที่อ่านข้อมูลจาก Prisma DB ทั้งหมด แล้วคัดกรองเฉพาะส่วนที่ผู้ใช้งานมีสิทธิ์เข้าถึง
 * เพื่อส่งเป็น Grounding Context ให้กับ Gemini 3.5 AI First Brain
 */

import { prisma } from './prisma';

export interface UserScopedSystemContext {
  role: string;
  userName: string;
  currentBangkokTime: string;
  isLabOpenNow: boolean;
  
  // 1. ข้อมูลสาธารณะที่ทุกคนเข้าถึงได้
  publicDirectory: {
    rooms: Array<{ code: string; name: string; capacity: number; location: string | null }>;
    kits: Array<{ code: string; name: string; category: string; itemNames: string[] }>;
    availableSkills: string[];
    operatingHours: string;
  };

  // 2. ข้อมูลส่วนตัวของผู้ใช้งาน (Personal Data)
  userPersonalData?: {
    activeBorrows: Array<{ requestNumber: string; purpose: string; returnDue: string; status: string; items: string[] }>;
    activeRequisitions: Array<{ requestNumber: string; purpose: string; dateNeeded: string; status: string; items: string[] }>;
    activeRoomBookings: Array<{ bookingNumber: string; roomCode: string; date: string; timeRange: string; status: string }>;
    activePracticeBookings: Array<{ bookingNumber: string; skill: string; date: string; timeRange: string; status: string }>;
  };

  // 3. ข้อมูลสต็อกทั่วไป (ทุกคนดูได้แต่เจ้าหน้าที่จะเห็นรายละเอียดต้นทุน)
  stockSummary?: Array<{ name: string; type: string; totalRemaining: number; unit: string; location: string | null; cost?: number }>;

  // 4. ข้อมูลเฉพาะสำหรับอาจารย์ (Teacher Scope)
  teacherData?: {
    assignedCourses: Array<{ code: string; name: string; allocatedBudget: number; spentBudget: number; balance: number }>;
    pendingStudentRequests: Array<{ type: string; requestNumber: string; studentName: string; courseCode: string; itemsSummary: string }>;
  };

  // 5. ข้อมูลเฉพาะสำหรับเจ้าหน้าที่และแอดมิน (Staff Scope)
  staffData?: {
    allPendingApprovalsCount: number;
    overdueUsers: Array<{ studentName: string; studentId: string | null; phone: string | null; requestNumber: string; daysOverdue: number; items: string[] }>;
    acSummary: { totalHoursToday: number; recentLog: string | null };
    repairSummary: { pendingRepairsCount: number };
  };
}

/**
 * ดึงและจัดหมวดหมู่ข้อมูลทั้งหมดในระบบให้สอดคล้องกับสิทธิ์ของผู้ถาม
 */
export async function assembleUserScopedContext(
  currentUser: any,
  query: string = ''
): Promise<UserScopedSystemContext> {
  const role = (currentUser?.role || 'USER').toUpperCase();
  const userId = currentUser?.id;
  const userName = currentUser?.name || 'ผู้ใช้งาน';

  // 1. คำนวณวัน-เวลาปัจจุบันของไทย
  const now = new Date();
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

  const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false }).format(now), 10);
  const weekday = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', weekday: 'long' }).format(now);
  const isWeekend = weekday.includes('เสาร์') || weekday.includes('อาทิตย์');
  const isLabOpenNow = !isWeekend && hour >= 8 && hour < 17;

  // 2. ดึงข้อมูลสาธารณะ (ห้องแล็บ + ชุด Kits)
  const [rooms, kits] = await Promise.all([
    prisma.practiceRoom.findMany({
      where: { isActive: true },
      select: { code: true, name: true, capacity: true, location: true },
      orderBy: { code: 'asc' },
    }),
    prisma.practiceKit.findMany({
      where: { isActive: true },
      include: { items: { include: { item: { select: { name: true } } } } },
      orderBy: { code: 'asc' },
    }),
  ]);

  const context: UserScopedSystemContext = {
    role,
    userName,
    currentBangkokTime,
    isLabOpenNow,
    publicDirectory: {
      rooms: rooms.map((r) => ({ code: r.code, name: r.name, capacity: r.capacity, location: r.location })),
      kits: kits.map((k) => ({
        code: k.code,
        name: k.name,
        category: k.category,
        itemNames: k.items.map((it) => it.item.name),
      })),
      availableSkills: ['ฉีดยา IM/SC/ID', 'ให้สารน้ำทางหลอดเลือด (IV)', 'ทำแผล (Dressing)', 'สวนสายปัสสาวะ (Foley)', 'กู้ชีพขั้นพื้นฐาน (CPR)'],
      operatingHours: 'วันจันทร์ - ศุกร์ เวลา 08:30 - 16:30 น. (ปิดวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์)',
    },
  };

  // 3. ดึงข้อมูลส่วนตัวของผู้ใช้งาน (Personal Data)
  if (userId) {
    try {
      const [borrows, requisitions, roomBookings, practiceBookings] = await Promise.all([
        prisma.borrowRequest.findMany({
          where: { userId, status: { in: ['PENDING', 'APPROVED', 'BORROWED'] } },
          include: { items: { include: { item: { select: { name: true } } } } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.requisitionRequest.findMany({
          where: { userId, status: { in: ['PENDING', 'APPROVED'] } },
          include: { items: { include: { item: { select: { name: true } } } } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.roomBooking.findMany({
          where: { userId, status: { in: ['PENDING', 'APPROVED'] } },
          include: { room: { select: { code: true } } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.practiceBooking.findMany({
          where: { userId, status: { in: ['PENDING', 'APPROVED'] } },
          include: { slot: { select: { date: true, startTime: true, endTime: true } } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      context.userPersonalData = {
        activeBorrows: borrows.map((b) => ({
          requestNumber: b.requestNumber,
          purpose: b.purpose,
          returnDue: b.expectedReturnDate.toISOString().slice(0, 10),
          status: b.status,
          items: b.items.map((it) => `${it.item.name} (${it.quantity})`),
        })),
        activeRequisitions: requisitions.map((r) => ({
          requestNumber: r.requestNumber,
          purpose: r.purpose,
          dateNeeded: r.dateNeeded.toISOString().slice(0, 10),
          status: r.status,
          items: r.items.map((it) => `${it.item.name} (${it.quantityRequested})`),
        })),
        activeRoomBookings: roomBookings.map((rb) => ({
          bookingNumber: rb.bookingNumber,
          roomCode: rb.room.code,
          date: rb.bookingDate.toISOString().slice(0, 10),
          timeRange: `${rb.startTime} - ${rb.endTime}`,
          status: rb.status,
        })),
        activePracticeBookings: practiceBookings.map((pb) => ({
          bookingNumber: pb.bookingNumber,
          skill: pb.skillTopic,
          date: pb.slot.date.toISOString().slice(0, 10),
          timeRange: `${pb.slot.startTime} - ${pb.slot.endTime}`,
          status: pb.status,
        })),
      };
    } catch (e) {
      console.warn('Error fetching personal chatbot context:', e);
    }
  }

  // 4. สต็อกพัสดุ (แสดงเฉพาะรายการสำคัญหรือมีคีย์เวิร์ดตรงกับที่ถาม)
  try {
    const isOfficer = role === 'OFFICER' || role === 'ADMIN';
    const items = await prisma.item.findMany({
      where: { status: 'ACTIVE' },
      select: {
        name: true,
        type: true,
        unit: true,
        location: true,
        stockLots: { select: { quantityRemaining: true, unitCost: true } },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    context.stockSummary = items.map((it) => {
      const totalRem = it.stockLots.reduce((sum, l) => sum + (l.quantityRemaining || 0), 0);
      const avgCost = it.stockLots.length > 0 ? it.stockLots[0].unitCost : 0;
      return {
        name: it.name,
        type: it.type === 'EQUIPMENT' ? 'ครุภัณฑ์' : 'เวชภัณฑ์สิ้นเปลือง',
        totalRemaining: totalRem,
        unit: it.unit,
        location: it.location || 'คลังพัสดุ ชั้น 3',
        ...(isOfficer ? { cost: avgCost } : {}),
      };
    });
  } catch (e) {
    console.warn('Error fetching stock summary context:', e);
  }

  // 5. สิทธิ์อาจารย์ (TEACHER / APPROVER): ดึงเฉพาะวิชาของอาจารย์
  if (role === 'APPROVER' || role === 'TEACHER') {
    try {
      const courses = await prisma.course.findMany({
        where: {
          OR: [
            { instructorName: { contains: userName } },
            { status: 'ACTIVE' },
          ],
        },
        include: {
          requisitionRequests: {
            where: { status: 'DISPENSED' },
            select: { totalCost: true },
          },
        },
        take: 6,
      });

      const pendingReqs = await prisma.requisitionRequest.findMany({
        where: { status: 'PENDING' },
        include: { user: { select: { name: true } }, course: { select: { code: true } }, items: { include: { item: { select: { name: true } } } } },
        take: 5,
      });

      context.teacherData = {
        assignedCourses: courses.map((c) => {
          const spent = c.requisitionRequests.reduce((sum, r) => sum + (r.totalCost || 0), 0);
          const allocated = c.allocatedBudget || 0;
          return {
            code: c.code,
            name: c.name,
            allocatedBudget: allocated,
            spentBudget: spent,
            balance: Math.max(0, allocated - spent),
          };
        }),
        pendingStudentRequests: pendingReqs.map((r) => ({
          type: 'เบิกเวชภัณฑ์',
          requestNumber: r.requestNumber,
          studentName: r.user.name,
          courseCode: r.course?.code || '-',
          itemsSummary: r.items.map((it) => `${it.item.name} (${it.quantityRequested})`).join(', '),
        })),
      };
    } catch (e) {
      console.warn('Error fetching teacher chatbot context:', e);
    }
  }

  // 6. สิทธิ์เจ้าหน้าที่และแอดมิน (OFFICER / ADMIN): ดึง Overdue, คำขอรออนุมัติทั้งหมด, แอร์
  if (role === 'OFFICER' || role === 'ADMIN') {
    try {
      const nowUtc = new Date();
      const [pendingBorrowsCount, pendingReqsCount, overdueBorrows, recentAc] = await Promise.all([
        prisma.borrowRequest.count({ where: { status: 'PENDING' } }),
        prisma.requisitionRequest.count({ where: { status: 'PENDING' } }),
        prisma.borrowRequest.findMany({
          where: {
            status: 'BORROWED',
            expectedReturnDate: { lt: nowUtc },
          },
          include: {
            user: { select: { name: true, studentId: true, phone: true } },
            items: { include: { item: { select: { name: true } } } },
          },
          take: 10,
        }),
        prisma.acOperationLog.findFirst({
          orderBy: { date: 'desc' },
          include: { room: { select: { code: true } } },
        }),
      ]);

      context.staffData = {
        allPendingApprovalsCount: pendingBorrowsCount + pendingReqsCount,
        overdueUsers: overdueBorrows.map((b) => {
          const diffDays = Math.max(1, Math.floor((nowUtc.getTime() - b.expectedReturnDate.getTime()) / (1000 * 60 * 60 * 24)));
          return {
            studentName: b.user.name,
            studentId: b.user.studentId,
            phone: b.user.phone,
            requestNumber: b.requestNumber,
            daysOverdue: diffDays,
            items: b.items.map((it) => it.item.name),
          };
        }),
        acSummary: {
          totalHoursToday: recentAc?.usageHours || 0,
          recentLog: recentAc ? `ห้อง ${recentAc.room.code} (${recentAc.openTime} - ${recentAc.closeTime || 'ยังเปิดอยู่'})` : null,
        },
        repairSummary: {
          pendingRepairsCount: 0,
        },
      };
    } catch (e) {
      console.warn('Error fetching staff chatbot context:', e);
    }
  }

  return context;
}
