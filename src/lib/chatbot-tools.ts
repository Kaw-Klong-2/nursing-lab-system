/**
 * โมดูลเครื่องมือสืบค้นข้อมูลสดจากฐานข้อมูล (RBAC Read-Only Tools)
 * สำหรับใช้งานร่วมกับ Gemini Native Function Calling
 */

import { prisma } from './prisma';
import { getBangkokParts } from './date-time-utils';
import { searchSystemGuides } from './chatbot-knowledge';
import { SuggestedLink } from '@/types/chatbot';

export interface ToolActor {
  id: string;
  name: string;
  role: string;
  email?: string;
}

export const TOOL_DISPLAY_LABELS: Record<string, string> = {
  search_inventory_stock: '📦 คลังพัสดุและครุภัณฑ์',
  get_room_schedule: '📅 ตารางห้องแล็บและรอบฝึก',
  get_my_requests: '📋 สถานะคำขอของคุณ',
  get_courses_and_budgets: '📚 รายวิชาและงบประมาณ',
  get_pending_approvals: '✅ รายการรออนุมัติ',
  get_overdue_and_active_borrows: '⚠️ รายการยืม-ค้างคืน',
  get_ac_operation_logs: '❄️ บันทึกเปิด-ปิดแอร์',
  get_maintenance_and_issues: '🔧 งานซ่อมบำรุงและแจ้งชำรุด',
  get_practice_kits: '🩺 ชุดฝึกปฏิบัติการ (Kits)',
  search_system_guide: '📖 คู่มือการใช้งานระบบ',
};

export const CHATBOT_TOOL_DECLARATIONS = [
  {
    name: 'search_inventory_stock',
    description:
      'ค้นหาข้อมูลครุภัณฑ์และเวชภัณฑ์สิ้นเปลืองในคลังพัสดุ พร้อมจำนวนคงเหลือ ว่างพร้อมยืม ตู้จัดเก็บ วันหมดอายุ และแจ้งเตือนสต็อกต่ำ',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'คำค้นหาชื่อพัสดุ รหัสพัสดุ ยี่ห้อ รุ่น หรือหมวดหมู่ (ไม่ระบุ = ดึงรายการสรุปภาพรวม)',
        },
        type: {
          type: 'STRING',
          description: 'ประเภทพัสดุ: EQUIPMENT (ครุภัณฑ์), CONSUMABLE (เวชภัณฑ์สิ้นเปลือง), หรือ ALL',
        },
        lowStockOnly: {
          type: 'BOOLEAN',
          description: 'หากเป็น true จะกรองเฉพาะรายการที่สต็อกคงเหลือต่ำกว่าหรือเท่ากับเกณฑ์แจ้งเตือน (minStockAlert)',
        },
        expiringSoonDays: {
          type: 'INTEGER',
          description: 'กรองเฉพาะเวชภัณฑ์ที่มีล็อตหมดอายุแล้วหรือกำลังจะหมดอายุภายในจำนวนวันที่ระบุ (เช่น 30 หรือ 60 วัน)',
        },
      },
    },
  },
  {
    name: 'get_room_schedule',
    description:
      'ตรวจสอบรายชื่อห้องปฏิบัติการทั้งหมด ตารางการจองห้อง (RoomBooking) รอบฝึกทักษะ (PracticeSlot) และวันหยุดพิเศษในช่วงวันที่ระบุ',
    parameters: {
      type: 'OBJECT',
      properties: {
        dateStr: {
          type: 'STRING',
          description: 'วันที่เริ่มต้น รูปแบบ YYYY-MM-DD (ค.ศ.) เช่น 2026-11-28 (ไม่ระบุ = วันนี้เวลาประเทศไทย)',
        },
        endDateStr: {
          type: 'STRING',
          description: 'วันที่สิ้นสุด รูปแบบ YYYY-MM-DD (ไม่ระบุ = นับจาก dateStr ไปอีก 6 วัน)',
        },
        roomQuery: {
          type: 'STRING',
          description: 'กรองตามรหัสห้องหรือชื่อห้อง เช่น LAB-01-1, SIM MOM, LAB-03',
        },
      },
    },
  },
  {
    name: 'get_my_requests',
    description:
      'ดึงรายการคำขอยืมครุภัณฑ์ ขอเบิกเวชภัณฑ์ จองห้องปฏิบัติการ และลงชื่อรอบฝึกทักษะของผู้ใช้งานปัจจุบันเท่านั้น',
    parameters: {
      type: 'OBJECT',
      properties: {
        statusFilter: {
          type: 'STRING',
          description: 'กรองสถานะ: ACTIVE (กำลังดำเนินการ/อนุมัติ/กำลังยืม), PENDING (รออนุมัติ), หรือ ALL',
        },
      },
    },
  },
  {
    name: 'get_courses_and_budgets',
    description:
      'ดึงข้อมูลภาคการศึกษาปัจจุบัน รายวิชา จำนวนนิสิตที่ลงทะเบียน (CourseEnrollment) และงบประมาณรายวิชา (เฉพาะผู้มีสิทธิ์ดูงบประมาณ)',
    parameters: {
      type: 'OBJECT',
      properties: {
        courseQuery: {
          type: 'STRING',
          description: 'รหัสวิชาหรือชื่อวิชาที่ต้องการค้นหา เช่น 222, 01980222',
        },
      },
    },
  },
  {
    name: 'get_pending_approvals',
    description:
      'ตรวจสอบรายการคำขอที่รออนุมัติทั้งหมดในระบบ (ยืมครุภัณฑ์ เบิกเวชภัณฑ์ จองห้องแล็บ และลงชื่อรอบฝึก) เฉพาะอาจารย์ ผู้อนุมัติ เจ้าหน้าที่ และแอดมิน',
    parameters: {
      type: 'OBJECT',
      properties: {
        entityType: {
          type: 'STRING',
          description: 'ประเภทคำขอ: ALL, BORROW, REQUISITION, ROOM, หรือ PRACTICE',
        },
      },
    },
  },
  {
    name: 'get_overdue_and_active_borrows',
    description:
      'ตรวจสอบรายการยืมครุภัณฑ์ที่กำลังถูกยืมอยู่ (BORROWED) และรายการที่เกินกำหนดส่งคืน (Overdue) เฉพาะอาจารย์ เจ้าหน้าที่ และแอดมิน',
    parameters: {
      type: 'OBJECT',
      properties: {
        onlyOverdue: {
          type: 'BOOLEAN',
          description: 'หากเป็น true จะแสดงเฉพาะรายการที่เลยกำหนดส่งคืนแล้ว',
        },
      },
    },
  },
  {
    name: 'get_ac_operation_logs',
    description:
      'ตรวจสอบบันทึกการเปิด-ปิดเครื่องปรับอากาศ (AcOperationLog) รายวันหรือรายเดือน สรุปชั่วโมงรวมและอุณหภูมิ เฉพาะเจ้าหน้าที่ แอดมิน และผู้บริหาร',
    parameters: {
      type: 'OBJECT',
      properties: {
        dateStr: {
          type: 'STRING',
          description: 'ระบุวันที่เฉพาะเจาะจง รูปแบบ YYYY-MM-DD (ค.ศ.)',
        },
        month: {
          type: 'INTEGER',
          description: 'เดือน ค.ศ. (1-12) ไม่ระบุ = เดือนปัจจุบัน',
        },
        year: {
          type: 'INTEGER',
          description: 'ปี ค.ศ. (เช่น 2026) ไม่ระบุ = ปีปัจจุบัน',
        },
        roomQuery: {
          type: 'STRING',
          description: 'รหัสหรือชื่อห้อง เช่น LAB-01-1, LAB-CS, SIM MOM',
        },
      },
    },
  },
  {
    name: 'get_maintenance_and_issues',
    description:
      'ตรวจสอบรายการแจ้งชำรุด (EquipmentIssueReport) ประวัติส่งซ่อม (MaintenanceLog) และครุภัณฑ์ที่อยู่ระหว่างซ่อมบำรุง',
    parameters: {
      type: 'OBJECT',
      properties: {
        assetQuery: {
          type: 'STRING',
          description: 'รหัสครุภัณฑ์หรือชื่ออุปกรณ์ที่ต้องการตรวจสอบ',
        },
        includeResolved: {
          type: 'BOOLEAN',
          description: 'รวมรายการที่ซ่อมเสร็จแล้วหรือปิดเคสแล้วด้วยหรือไม่ (ค่าเริ่มต้น false)',
        },
      },
    },
  },
  {
    name: 'get_practice_kits',
    description:
      'ดึงรายการชุดฝึกปฏิบัติการมาตรฐาน (Practice Kits) พร้อมรายการอุปกรณ์และเวชภัณฑ์ภายในชุดจากฐานข้อมูลจริง',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'คำค้นหาชื่อชุดฝึกหรือหมวดหมู่ เช่น ทำแผล, ฉีดยา, สวนปัสสาวะ, CPR',
        },
      },
    },
  },
  {
    name: 'search_system_guide',
    description:
      'ค้นหาคู่มือการใช้งานระบบ KUNurse+ Lab ทุกเมนู ขั้นตอนการยืม-เบิก จองห้อง จัดการรายชื่อนิสิต POS แบ่งบรรจุ ซ่อมบำรุง บันทึกแอร์ และกฎระเบียบ',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: {
          type: 'STRING',
          description: 'หัวข้อหรือคำถามเกี่ยวกับการใช้งานระบบ เช่น จองห้อง, รายชื่อนิสิต, POS, แบ่งบรรจุ, อนุมัติด่วน, แอร์',
        },
      },
      required: ['topic'],
    },
  },
];

function parseUtcDateRange(startStr: string, endStr?: string): { start: Date; end: Date; startDateStr: string; endDateStr: string } {
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const start = new Date(Date.UTC(y1, m1 - 1, d1, 0, 0, 0, 0));

  let endDateStr = endStr;
  if (!endDateStr) {
    const plus6 = new Date(Date.UTC(y1, m1 - 1, d1 + 6, 0, 0, 0, 0));
    endDateStr = plus6.toISOString().slice(0, 10);
  }
  const [y2, m2, d2] = endDateStr.split('-').map(Number);
  const end = new Date(Date.UTC(y2, m2 - 1, d2, 23, 59, 59, 999));

  return { start, end, startDateStr: startStr, endDateStr };
}

function isStaffOrAdmin(role: string): boolean {
  return role === 'OFFICER' || role === 'ADMIN';
}

function isTeacherOrApprover(role: string): boolean {
  return role === 'TEACHER' || role === 'APPROVER' || role === 'OFFICER' || role === 'ADMIN';
}

function denyPermission(requiredDesc: string) {
  return {
    authorized: false,
    error: `ปฏิเสธสิทธิ์เข้าถึงข้อมูล: ส่วนนี้สงวนสิทธิ์เฉพาะ${requiredDesc}เท่านั้น`,
  };
}

/**
 * ประมวลผลการเรียกใช้ Tool จาก Gemini พร้อมตรวจสอบสิทธิ์ RBAC ทุกคำสั่ง
 */
export async function executeChatbotTool(
  toolName: string,
  rawArgs: Record<string, any> | undefined,
  actor: ToolActor
): Promise<any> {
  const args = rawArgs || {};
  const role = (actor.role || 'USER').toUpperCase();
  const bkkNow = getBangkokParts(new Date());

  switch (toolName) {
    case 'search_inventory_stock': {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      const typeArg = typeof args.type === 'string' ? args.type.toUpperCase() : 'ALL';
      const lowStockOnly = Boolean(args.lowStockOnly);
      const expiringSoonDays = typeof args.expiringSoonDays === 'number' ? args.expiringSoonDays : null;
      const canSeeCost = role !== 'USER' && role !== 'VIEWER';

      const where: any = { status: 'ACTIVE' };
      if (typeArg === 'EQUIPMENT' || typeArg === 'CONSUMABLE') {
        where.type = typeArg;
      }
      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { model: { contains: query, mode: 'insensitive' } },
          { category: { name: { contains: query, mode: 'insensitive' } } },
        ];
      }

      const items = await prisma.item.findMany({
        where,
        include: {
          category: { select: { code: true, name: true } },
          storageLocation: { select: { code: true, name: true, floor: true, building: true } },
          assets: { select: { status: true, condition: true, assetCode: true } },
          stockLots: {
            select: {
              lotNumber: true,
              quantityRemaining: true,
              openPackRemainder: true,
              expiryDate: true,
              unitCost: true,
              isSimLabApproved: true,
            },
            orderBy: { expiryDate: 'asc' },
          },
        },
        take: query ? 20 : 60,
        orderBy: { name: 'asc' },
      });

      const nowMs = Date.now();
      const expiryThresholdMs = expiringSoonDays !== null ? nowMs + expiringSoonDays * 24 * 60 * 60 * 1000 : null;

      let mapped = items.map((item) => {
        const storage = item.storageLocation
          ? `${item.storageLocation.name} [${item.storageLocation.code}] (${item.storageLocation.floor || ''})`
          : item.location || 'คลังพัสดุ ชั้น 3';

        if (item.type === 'EQUIPMENT') {
          const availableCount = item.assets.filter((a) => a.status === 'AVAILABLE').length;
          const borrowedCount = item.assets.filter((a) => a.status === 'BORROWED').length;
          const maintenanceCount = item.assets.filter((a) => a.status === 'MAINTENANCE').length;
          const isLowStock = availableCount <= item.minStockAlert;

          return {
            code: item.code,
            name: item.name,
            type: 'EQUIPMENT',
            category: item.category.name,
            unit: item.unit,
            totalAssets: item.assets.length,
            availableCount,
            borrowedCount,
            maintenanceCount,
            minStockAlert: item.minStockAlert,
            isLowStock,
            isBorrowable: item.isBorrowable,
            storage,
            nearestExpiry: null as string | null,
            hasExpiringLot: false,
          };
        }

        const totalRemaining = item.stockLots.reduce((sum, lot) => sum + (lot.quantityRemaining || 0), 0);
        const openRemainder = item.stockLots.reduce((sum, lot) => sum + (lot.openPackRemainder || 0), 0);
        const activeLots = item.stockLots.filter((l) => l.quantityRemaining > 0 || l.openPackRemainder > 0);
        const lotsWithExpiry = activeLots.filter((l) => l.expiryDate);
        const nearestExpiryDate = lotsWithExpiry.length > 0 ? lotsWithExpiry[0].expiryDate! : null;
        const hasExpiringLot =
          expiryThresholdMs !== null &&
          lotsWithExpiry.some((l) => l.expiryDate!.getTime() <= expiryThresholdMs);

        return {
          code: item.code,
          name: item.name,
          type: 'CONSUMABLE',
          category: item.category.name,
          unit: item.unit,
          usageUnit: item.usageUnit,
          totalRemaining,
          openPackRemainder: openRemainder,
          minStockAlert: item.minStockAlert,
          isLowStock: totalRemaining <= item.minStockAlert,
          allowExpiredForSim: item.allowExpiredForSim,
          storage,
          nearestExpiry: nearestExpiryDate ? nearestExpiryDate.toISOString().slice(0, 10) : null,
          hasExpiringLot,
          ...(canSeeCost && activeLots.length > 0 ? { latestUnitCost: activeLots[0].unitCost } : {}),
        };
      });

      if (lowStockOnly) {
        mapped = mapped.filter((m) => m.isLowStock);
      }
      if (expiringSoonDays !== null) {
        mapped = mapped.filter((m) => m.hasExpiringLot);
      }

      return {
        totalMatched: mapped.length,
        items: mapped.slice(0, 20),
      };
    }

    case 'get_room_schedule': {
      const startDateStr =
        typeof args.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.dateStr)
          ? args.dateStr
          : bkkNow.dateString;
      const endArg =
        typeof args.endDateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.endDateStr)
          ? args.endDateStr
          : args.dateStr
          ? args.dateStr
          : undefined;
      const { start, end, endDateStr } = parseUtcDateRange(startDateStr, endArg);
      const roomQuery = typeof args.roomQuery === 'string' ? args.roomQuery.trim() : '';

      const roomWhere: any = { isActive: true };
      if (roomQuery) {
        roomWhere.OR = [
          { code: { contains: roomQuery, mode: 'insensitive' } },
          { name: { contains: roomQuery, mode: 'insensitive' } },
        ];
      }

      const rooms = await prisma.practiceRoom.findMany({
        where: roomWhere,
        select: { id: true, code: true, name: true, capacity: true, location: true },
        orderBy: { code: 'asc' },
      });

      const roomIds = rooms.map((r) => r.id);

      const [bookings, slots, holidays] = await Promise.all([
        prisma.roomBooking.findMany({
          where: {
            roomId: { in: roomIds },
            bookingDate: { gte: start, lte: end },
            status: { in: ['APPROVED', 'PENDING'] },
          },
          include: {
            room: { select: { code: true, name: true } },
            course: { select: { code: true, name: true } },
          },
          orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
          take: 40,
        }),
        prisma.practiceSlot.findMany({
          where: {
            roomId: { in: roomIds },
            date: { gte: start, lte: end },
          },
          include: {
            room: { select: { code: true, name: true } },
            bookings: {
              where: { status: { in: ['APPROVED', 'PENDING', 'CHECKED_IN'] } },
              select: { id: true },
            },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          take: 30,
        }),
        prisma.customHoliday.findMany({
          where: {
            dateStr: { gte: startDateStr, lte: endDateStr },
          },
          orderBy: { dateStr: 'asc' },
        }),
      ]);

      return {
        dateRange: { startDateStr, endDateStr },
        rooms: rooms.map((r) => ({ code: r.code, name: r.name, capacity: r.capacity, location: r.location })),
        roomBookings: bookings.map((b) => ({
          bookingNumber: b.bookingNumber,
          date: b.bookingDate.toISOString().slice(0, 10),
          roomCode: b.room.code,
          roomName: b.room.name,
          timeRange: `${b.startTime}-${b.endTime}`,
          title: b.title,
          purpose: b.purpose,
          courseCode: b.course?.code || null,
          status: b.status,
          isTimetable: b.isTimetable,
        })),
        practiceSlots: slots.map((s) => ({
          date: s.date.toISOString().slice(0, 10),
          roomCode: s.room.code,
          timeRange: `${s.startTime}-${s.endTime}`,
          isOpen: s.isOpen,
          bookedCount: s.bookings.length,
          maxCapacity: s.maxCapacity,
          availableSeats: Math.max(0, s.maxCapacity - s.bookings.length),
          availableSkills: s.availableSkills,
        })),
        holidays: holidays.map((h) => ({ dateStr: h.dateStr, name: h.name })),
      };
    }

    case 'get_my_requests': {
      const statusFilter = typeof args.statusFilter === 'string' ? args.statusFilter.toUpperCase() : 'ACTIVE';
      const borrowStatuses =
        statusFilter === 'PENDING'
          ? ['PENDING']
          : statusFilter === 'ALL'
          ? undefined
          : ['PENDING', 'APPROVED', 'BORROWED'];
      const generalStatuses =
        statusFilter === 'PENDING'
          ? ['PENDING']
          : statusFilter === 'ALL'
          ? undefined
          : ['PENDING', 'APPROVED', 'CHECKED_IN'];

      const [borrows, requisitions, roomBookings, practiceBookings] = await Promise.all([
        prisma.borrowRequest.findMany({
          where: { userId: actor.id, ...(borrowStatuses ? { status: { in: borrowStatuses } } : {}) },
          include: {
            course: { select: { code: true, name: true } },
            items: { include: { item: { select: { name: true, unit: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.requisitionRequest.findMany({
          where: { userId: actor.id, ...(generalStatuses ? { status: { in: generalStatuses } } : {}) },
          include: {
            course: { select: { code: true, name: true } },
            items: { include: { item: { select: { name: true, unit: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.roomBooking.findMany({
          where: { userId: actor.id, ...(generalStatuses ? { status: { in: generalStatuses } } : {}) },
          include: { room: { select: { code: true, name: true } } },
          orderBy: { bookingDate: 'desc' },
          take: 10,
        }),
        prisma.practiceBooking.findMany({
          where: { userId: actor.id, ...(generalStatuses ? { status: { in: generalStatuses } } : {}) },
          include: { slot: { include: { room: { select: { code: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      return {
        borrows: borrows.map((b) => ({
          requestNumber: b.requestNumber,
          status: b.status,
          courseCode: b.course?.code || null,
          borrowDate: b.borrowDate.toISOString().slice(0, 10),
          expectedReturnDate: b.expectedReturnDate.toISOString().slice(0, 10),
          items: b.items.map((it) => `${it.item.name} x${it.quantity} ${it.item.unit}`),
        })),
        requisitions: requisitions.map((r) => ({
          requestNumber: r.requestNumber,
          status: r.status,
          courseCode: r.course?.code || null,
          dateNeeded: r.dateNeeded.toISOString().slice(0, 10),
          items: r.items.map((it) => `${it.item.name} x${it.quantityRequested}`),
        })),
        roomBookings: roomBookings.map((rb) => ({
          bookingNumber: rb.bookingNumber,
          roomCode: rb.room.code,
          date: rb.bookingDate.toISOString().slice(0, 10),
          timeRange: `${rb.startTime}-${rb.endTime}`,
          title: rb.title,
          status: rb.status,
        })),
        practiceBookings: practiceBookings.map((pb) => ({
          bookingNumber: pb.bookingNumber,
          skillTopic: pb.skillTopic,
          roomCode: pb.slot.room.code,
          date: pb.slot.date.toISOString().slice(0, 10),
          timeRange: `${pb.slot.startTime}-${pb.slot.endTime}`,
          status: pb.status,
        })),
      };
    }

    case 'get_courses_and_budgets': {
      const courseQuery = typeof args.courseQuery === 'string' ? args.courseQuery.trim() : '';
      const canViewBudget = role !== 'USER' && role !== 'VIEWER';

      const currentTerm = await prisma.academicTerm.findFirst({
        where: { isCurrent: true, status: 'ACTIVE' },
        select: { academicYear: true, term: true, name: true },
      });

      const courseWhere: any = { status: 'ACTIVE' };
      if (courseQuery) {
        courseWhere.OR = [
          { code: { contains: courseQuery, mode: 'insensitive' } },
          { name: { contains: courseQuery, mode: 'insensitive' } },
        ];
      }
      if (role === 'USER') {
        courseWhere.enrollments = { some: { userId: actor.id } };
      }

      const courses = await prisma.course.findMany({
        where: courseWhere,
        include: {
          _count: { select: { enrollments: true } },
          ...(canViewBudget
            ? {
                requisitionRequests: {
                  where: { status: 'DISPENSED' },
                  select: { totalCost: true },
                },
              }
            : {}),
        },
        orderBy: { code: 'asc' },
        take: 25,
      });

      return {
        currentTerm: currentTerm || null,
        scopeNote:
          role === 'USER'
            ? 'แสดงเฉพาะรายวิชาที่นิสิตลงทะเบียนเรียนในระบบ (CourseEnrollment) และซ่อนข้อมูลงบประมาณตามสิทธิ์'
            : 'แสดงรายวิชาพร้อมงบประมาณ',
        courses: courses.map((c: any) => {
          const base = {
            code: c.code,
            name: c.name,
            targetYear: c.targetYear,
            semester: c.semester,
            academicYear: c.academicYear,
            instructorName: c.instructorName,
            enrolledStudents: c._count?.enrollments ?? c.studentCount,
          };
          if (!canViewBudget) return base;
          const spent = (c.requisitionRequests || []).reduce((s: number, r: any) => s + (r.totalCost || 0), 0);
          const allocated = c.allocatedBudget || 0;
          return {
            ...base,
            allocatedBudget: allocated,
            spentBudget: Math.round(spent * 100) / 100,
            remainingBudget: Math.max(0, Math.round((allocated - spent) * 100) / 100),
          };
        }),
      };
    }

    case 'get_pending_approvals': {
      if (!isTeacherOrApprover(role)) {
        return denyPermission('อาจารย์ ผู้อนุมัติ เจ้าหน้าที่ และผู้ดูแลระบบ');
      }
      const entityType = typeof args.entityType === 'string' ? args.entityType.toUpperCase() : 'ALL';
      const isTeacherOnly = role === 'TEACHER';

      const teacherFilter = isTeacherOnly
        ? {
            OR: [
              { advisorName: { contains: actor.name } },
              { course: { instructorName: { contains: actor.name } } },
            ],
          }
        : {};

      const [borrows, requisitions, rooms, practices] = await Promise.all([
        entityType === 'ALL' || entityType === 'BORROW'
          ? prisma.borrowRequest.findMany({
              where: { status: 'PENDING', ...teacherFilter },
              include: {
                user: { select: { name: true, studentId: true } },
                course: { select: { code: true } },
                items: { include: { item: { select: { name: true } } } },
              },
              orderBy: { createdAt: 'desc' },
              take: 15,
            })
          : [],
        entityType === 'ALL' || entityType === 'REQUISITION'
          ? prisma.requisitionRequest.findMany({
              where: { status: 'PENDING', ...teacherFilter },
              include: {
                user: { select: { name: true, studentId: true } },
                course: { select: { code: true } },
                items: { include: { item: { select: { name: true } } } },
              },
              orderBy: { createdAt: 'desc' },
              take: 15,
            })
          : [],
        entityType === 'ALL' || entityType === 'ROOM'
          ? prisma.roomBooking.findMany({
              where: { status: 'PENDING', ...(isTeacherOnly ? { advisorName: { contains: actor.name } } : {}) },
              include: {
                user: { select: { name: true } },
                room: { select: { code: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 15,
            })
          : [],
        entityType === 'ALL' || entityType === 'PRACTICE'
          ? prisma.practiceBooking.findMany({
              where: { status: 'PENDING', ...teacherFilter },
              include: {
                user: { select: { name: true } },
                slot: { include: { room: { select: { code: true } } } },
              },
              orderBy: { createdAt: 'desc' },
              take: 15,
            })
          : [],
      ]);

      return {
        counts: {
          borrow: borrows.length,
          requisition: requisitions.length,
          room: rooms.length,
          practice: practices.length,
          total: borrows.length + requisitions.length + rooms.length + practices.length,
        },
        borrows: borrows.map((b: any) => ({
          requestNumber: b.requestNumber,
          requester: b.user.name,
          studentId: b.user.studentId,
          courseCode: b.course?.code || '-',
          instructorAcknowledged: b.instructorAcknowledged,
          items: b.items.map((it: any) => `${it.item.name} x${it.quantity}`),
        })),
        requisitions: requisitions.map((r: any) => ({
          requestNumber: r.requestNumber,
          requester: r.user.name,
          studentId: r.user.studentId,
          courseCode: r.course?.code || '-',
          instructorAcknowledged: r.instructorAcknowledged,
          items: r.items.map((it: any) => `${it.item.name} x${it.quantityRequested}`),
        })),
        roomBookings: rooms.map((rm: any) => ({
          bookingNumber: rm.bookingNumber,
          requester: rm.user.name,
          roomCode: rm.room.code,
          date: rm.bookingDate.toISOString().slice(0, 10),
          timeRange: `${rm.startTime}-${rm.endTime}`,
          title: rm.title,
        })),
        practiceBookings: practices.map((pb: any) => ({
          bookingNumber: pb.bookingNumber,
          requester: pb.user.name,
          roomCode: pb.slot.room.code,
          date: pb.slot.date.toISOString().slice(0, 10),
          skillTopic: pb.skillTopic,
        })),
      };
    }

    case 'get_overdue_and_active_borrows': {
      if (!isTeacherOrApprover(role)) {
        return denyPermission('อาจารย์ ผู้อนุมัติ เจ้าหน้าที่ และผู้ดูแลระบบ');
      }
      const onlyOverdue = Boolean(args.onlyOverdue);
      const now = new Date();

      const borrows = await prisma.borrowRequest.findMany({
        where: {
          status: 'BORROWED',
          ...(onlyOverdue ? { expectedReturnDate: { lt: now } } : {}),
        },
        include: {
          user: { select: { name: true, studentId: true, phone: true } },
          course: { select: { code: true } },
          items: { include: { item: { select: { name: true } } } },
        },
        orderBy: { expectedReturnDate: 'asc' },
        take: 25,
      });

      const list = borrows.map((b) => {
        const isOverdue = b.expectedReturnDate < now;
        const daysOverdue = isOverdue
          ? Math.max(1, Math.floor((now.getTime() - b.expectedReturnDate.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        return {
          requestNumber: b.requestNumber,
          borrowerName: b.user.name,
          studentId: b.user.studentId,
          phone: b.user.phone,
          courseCode: b.course?.code || '-',
          expectedReturnDate: b.expectedReturnDate.toISOString().slice(0, 10),
          isOverdue,
          daysOverdue,
          items: b.items.map((it) => `${it.item.name} x${it.quantity}`),
        };
      });

      return {
        totalActiveBorrowed: list.length,
        overdueCount: list.filter((x) => x.isOverdue).length,
        records: list,
      };
    }

    case 'get_ac_operation_logs': {
      if (!isStaffOrAdmin(role) && role !== 'EXECUTIVE') {
        return denyPermission('เจ้าหน้าที่ห้องปฏิบัติการ ผู้ดูแลระบบ และผู้บริหาร');
      }

      const month = typeof args.month === 'number' ? args.month : bkkNow.month + 1;
      const year = typeof args.year === 'number' ? args.year : bkkNow.year;
      const roomQuery = typeof args.roomQuery === 'string' ? args.roomQuery.trim() : '';

      let dateFilter: any;
      if (typeof args.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.dateStr)) {
        const [y, m, d] = args.dateStr.split('-').map(Number);
        dateFilter = {
          gte: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)),
          lte: new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)),
        };
      } else {
        dateFilter = {
          gte: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
          lte: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
        };
      }

      const where: any = { date: dateFilter };
      if (roomQuery) {
        where.room = {
          OR: [
            { code: { contains: roomQuery, mode: 'insensitive' } },
            { name: { contains: roomQuery, mode: 'insensitive' } },
          ],
        };
      }

      const logs = await prisma.acOperationLog.findMany({
        where,
        include: { room: { select: { code: true, name: true } } },
        orderBy: [{ date: 'desc' }, { room: { code: 'asc' } }],
        take: 100,
      });

      const byRoom: Record<string, { roomCode: string; roomName: string; totalHours: number; activeDays: number }> = {};
      let totalHours = 0;

      for (const l of logs) {
        totalHours += l.usageHours || 0;
        if (!byRoom[l.room.code]) {
          byRoom[l.room.code] = { roomCode: l.room.code, roomName: l.room.name, totalHours: 0, activeDays: 0 };
        }
        byRoom[l.room.code].totalHours = Math.round((byRoom[l.room.code].totalHours + (l.usageHours || 0)) * 10) / 10;
        byRoom[l.room.code].activeDays += 1;
      }

      return {
        period: args.dateStr ? args.dateStr : `${year}-${String(month).padStart(2, '0')}`,
        totalRecords: logs.length,
        totalHours: Math.round(totalHours * 10) / 10,
        roomSummary: Object.values(byRoom),
        logs: logs.slice(0, 30).map((l) => ({
          date: l.date.toISOString().slice(0, 10),
          roomCode: l.room.code,
          roomName: l.room.name,
          openTime: l.openTime,
          closeTime: l.closeTime,
          usageHours: l.usageHours,
          temperature: l.temperature,
          purpose: l.purpose,
          note: l.note,
          recordedName: l.recordedName,
        })),
      };
    }

    case 'get_maintenance_and_issues': {
      const assetQuery = typeof args.assetQuery === 'string' ? args.assetQuery.trim() : '';
      const includeResolved = Boolean(args.includeResolved);
      const canSeePhone = role !== 'USER' && role !== 'VIEWER';

      const issueStatuses = includeResolved ? undefined : ['PENDING', 'ACKNOWLEDGED', 'SENT_TO_REPAIR'];
      const repairStatuses = includeResolved ? undefined : ['UNDER_REPAIR'];

      const assetFilter = assetQuery
        ? {
            asset: {
              OR: [
                { assetCode: { contains: assetQuery, mode: 'insensitive' as const } },
                { item: { name: { contains: assetQuery, mode: 'insensitive' as const } } },
              ],
            },
          }
        : {};

      const [issues, repairs, damagedAssets] = await Promise.all([
        prisma.equipmentIssueReport.findMany({
          where: {
            ...(issueStatuses ? { status: { in: issueStatuses } } : {}),
            ...assetFilter,
          },
          include: { asset: { include: { item: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 15,
        }),
        prisma.maintenanceLog.findMany({
          where: {
            ...(repairStatuses ? { status: { in: repairStatuses } } : {}),
            ...assetFilter,
          },
          include: { asset: { include: { item: { select: { name: true } } } } },
          orderBy: { sentDate: 'desc' },
          take: 15,
        }),
        prisma.equipmentAsset.findMany({
          where: {
            OR: [{ status: 'MAINTENANCE' }, { condition: 'DAMAGED' }],
          },
          include: { item: { select: { name: true } } },
          take: 15,
        }),
      ]);

      return {
        issueReports: issues.map((is) => ({
          reportNumber: is.reportNumber,
          assetCode: is.asset.assetCode,
          assetName: is.asset.item.name,
          issueDescription: is.issueDescription,
          urgency: is.urgency,
          status: is.status,
          reporterName: is.reporterName,
          ...(canSeePhone ? { contactPhone: is.contactPhone } : {}),
          createdAt: is.createdAt.toISOString().slice(0, 10),
        })),
        maintenanceLogs: repairs.map((rp) => ({
          assetCode: rp.asset.assetCode,
          assetName: rp.asset.item.name,
          issue: rp.issue,
          status: rp.status,
          repairShop: rp.repairShop,
          sentDate: rp.sentDate.toISOString().slice(0, 10),
        })),
        assetsInMaintenance: damagedAssets.map((a) => ({
          assetCode: a.assetCode,
          name: a.item.name,
          status: a.status,
          condition: a.condition,
          location: a.location,
        })),
      };
    }

    case 'get_practice_kits': {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      const kits = await prisma.practiceKit.findMany({
        where: {
          isActive: true,
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { category: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                  { code: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          items: {
            include: { item: { select: { name: true, unit: true, type: true } } },
          },
        },
        orderBy: { code: 'asc' },
        take: 20,
      });

      return {
        totalKits: kits.length,
        kits: kits.map((k) => ({
          code: k.code,
          name: k.name,
          category: k.category,
          targetCourse: k.targetCourse,
          description: k.description,
          items: k.items.map((it) => `${it.item.name} x${it.quantity} ${it.item.unit}`),
        })),
      };
    }

    case 'search_system_guide': {
      const topic = typeof args.topic === 'string' ? args.topic : '';
      const guides = searchSystemGuides(topic, role);
      return { guides };
    }

    default:
      return { error: `ไม่พบเครื่องมือชื่อ ${toolName}` };
  }
}

/**
 * สร้างลิงก์นำทางเข้าสู่หน้าจอที่เกี่ยวข้องตามเครื่องมือที่ AI เรียกใช้และบทบาทผู้ใช้
 */
export function deriveSuggestedLinks(toolsUsed: string[], role: string): SuggestedLink[] {
  const r = (role || 'USER').toUpperCase();
  const isStaff = r === 'OFFICER' || r === 'ADMIN';
  const isTeacher = r === 'TEACHER' || r === 'APPROVER';
  const links: SuggestedLink[] = [];

  const addLink = (label: string, href: string) => {
    if (!links.some((l) => l.href === href)) {
      links.push({ label, href });
    }
  };

  for (const t of toolsUsed) {
    if (t === 'search_inventory_stock') {
      addLink(isStaff ? 'คลังพัสดุและสต็อก' : 'ขอยืม-เบิกพัสดุ', isStaff ? '/inventory' : '/borrow/request');
    } else if (t === 'get_room_schedule') {
      addLink('ปฏิทินห้องแล็บ', '/schedule');
      addLink('จองห้องปฏิบัติการ', '/rooms');
    } else if (t === 'get_my_requests') {
      addLink('รายการยืม-คืนของฉัน', '/borrow');
    } else if (t === 'get_courses_and_budgets') {
      addLink('รายวิชาและผู้เรียน', '/courses');
    } else if (t === 'get_pending_approvals' && (isStaff || isTeacher)) {
      addLink('ศูนย์อนุมัติคำขอ', '/approvals');
    } else if (t === 'get_overdue_and_active_borrows' && (isStaff || isTeacher)) {
      addLink('ติดตามการยืม-คืน', '/borrow');
    } else if (t === 'get_ac_operation_logs' && (isStaff || r === 'EXECUTIVE')) {
      addLink('บันทึกเปิด-ปิดแอร์', '/air-conditioning');
    } else if (t === 'get_maintenance_and_issues') {
      addLink(isStaff ? 'จัดการซ่อมบำรุง' : 'แจ้งอุปกรณ์ชำรุด', isStaff ? '/maintenance' : '/maintenance/report');
    } else if (t === 'get_practice_kits') {
      addLink('ชุดฝึกปฏิบัติการ (Kits)', '/kits');
    }
  }

  return links.slice(0, 3);
}
