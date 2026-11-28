/**
 * โมดูลจัดการคำสั่งปฏิบัติการจริงสำหรับผู้ดูแลระบบและเจ้าหน้าที่ (Admin Write-Action Engine)
 * แบ่งการทำงานเป็น 2 ขั้นตอนเพื่อความปลอดภัยสูงสุด:
 * 1. proposeAdminAction: อ่าน ตรวจสอบผลกระทบ และสร้าง Preview & Impact Card (ยังไม่เขียนลง DB)
 * 2. executeConfirmedAdminAction: ตรวจสิทธิ์ซ้ำ, ดำเนินการใน Transaction, ล้างแคช และบันทึก ActivityLog
 */

import { prisma } from './prisma';
import { invalidateCache } from './cache';
import { logActivity } from './activity-log';
import { createNotification, dispatchBroadcastMessage } from './notifications';
import { calculateUsageHours } from './chatbot-nlu';
import { AdminActionType, PendingAdminAction, SuggestedLink } from '@/types/chatbot';
import { ToolActor } from './chatbot-tools';

const WRITE_TOOL_NAMES = new Set<string>([
  'propose_batch_ac_logs',
  'propose_manage_holiday',
  'propose_review_approvals',
  'propose_overdue_reminders',
  'propose_room_booking',
  'propose_toggle_practice_slot',
  'propose_send_broadcast',
  'propose_update_issue_report',
  'propose_course_enrollment',
  'propose_stock_adjustment',
]);

export function isAdminWriteTool(toolName: string): boolean {
  return WRITE_TOOL_NAMES.has(toolName);
}

export const ADMIN_ACTION_TOOL_DECLARATIONS = [
  {
    name: 'propose_batch_ac_logs',
    description:
      'เตรียมบันทึกการเปิด-ปิดเครื่องปรับอากาศแบบกลุ่ม (หลายห้อง หลายวัน หรือหลายช่วงเวลา) เพื่อแสดงการ์ดสรุปให้แอดมิน/เจ้าหน้าที่กดยืนยันก่อนบันทึกจริง',
    parameters: {
      type: 'OBJECT',
      properties: {
        rooms: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'รายชื่อหรือรหัสห้อง เช่น ["LAB1/3", "2/3", "3/3", "LAB-3", "LAB-5", "CS", "SIM MOM"]',
        },
        dates: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'รายการวันที่รูปแบบ YYYY-MM-DD (ค.ศ.) เช่น ["2026-11-26", "2026-11-27"]',
        },
        openTime: { type: 'STRING', description: 'เวลาเปิด เช่น "09:00"' },
        closeTime: { type: 'STRING', description: 'เวลาปิด เช่น "16:00"' },
        temperature: { type: 'NUMBER', description: 'อุณหภูมิ (°C) ค่าเริ่มต้น 24.0 หรือ 22.0' },
        purpose: { type: 'STRING', description: 'วัตถุประสงค์ เช่น "เปิดเพื่อรักษาอุปกรณ์", "การเรียนการสอน", "อื่นๆ"' },
        note: { type: 'STRING', description: 'หมายเหตุเพิ่มเติม เช่น "Open house", "รับรองการตรวจเยี่ยมจากสถาบันพี่เลี้ยง"' },
        sessions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              openTime: { type: 'STRING' },
              closeTime: { type: 'STRING' },
              temperature: { type: 'NUMBER' },
              purpose: { type: 'STRING' },
            },
          },
          description: 'รายการหลายช่วงเวลาภายในวัน (ถ้ามี)',
        },
      },
      required: ['rooms', 'dates', 'openTime', 'closeTime'],
    },
  },
  {
    name: 'propose_manage_holiday',
    description: 'เตรียมเพิ่มหรือลบวันหยุดพิเศษของคณะ (CustomHoliday) เพื่อแสดงให้แอดมิน/เจ้าหน้าที่ยืนยัน',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'ADD (เพิ่ม/แก้ไขวันหยุด) หรือ DELETE (ยกเลิกวันหยุด)' },
        dateStr: { type: 'STRING', description: 'วันที่รูปแบบ YYYY-MM-DD (ค.ศ.)' },
        name: { type: 'STRING', description: 'ชื่อวันหยุด (จำเป็นเมื่อ action=ADD)' },
        description: { type: 'STRING', description: 'รายละเอียดเพิ่มเติม (ถ้ามี)' },
      },
      required: ['action', 'dateStr'],
    },
  },
  {
    name: 'propose_review_approvals',
    description: 'เตรียมอนุมัติหรือปฏิเสธคำขอที่รออนุมัติ (ยืมครุภัณฑ์ เบิกวัสดุ จองห้อง รอบฝึก) เพื่อแสดงให้ยืนยันก่อนดำเนินการจริง',
    parameters: {
      type: 'OBJECT',
      properties: {
        decision: { type: 'STRING', description: 'APPROVE หรือ REJECT' },
        entityType: { type: 'STRING', description: 'ALL, BORROW, REQUISITION, ROOM, หรือ PRACTICE' },
        referenceCodes: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'รหัสคำขอที่ระบุเฉพาะ (ถ้าไม่ระบุจะเลือกคำขอที่รออนุมัติทั้งหมดในหมวดที่กำหนด)',
        },
        rejectionReason: { type: 'STRING', description: 'เหตุผลกรณีปฏิเสธคำขอ (REJECT)' },
      },
      required: ['decision'],
    },
  },
  {
    name: 'propose_overdue_reminders',
    description: 'เตรียมส่งแจ้งเตือนทวงคืนพัสดุไปยังนิสิต/ผู้ยืมที่ค้างคืนเกินกำหนด (Overdue)',
    parameters: {
      type: 'OBJECT',
      properties: {
        requestNumbers: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'รหัสคำขอยืมเฉพาะ (ไม่ระบุ = ทวงคืนทุกรายการที่เกินกำหนด)',
        },
      },
    },
  },
  {
    name: 'propose_room_booking',
    description: 'เตรียมสร้างคำขอจองห้องปฏิบัติการ (เดี่ยวหรือแบบกลุ่มหลายห้อง/หลายวัน) พร้อมตรวจสอบเวลาชนอัตโนมัติ',
    parameters: {
      type: 'OBJECT',
      properties: {
        rooms: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'รหัสหรือชื่อห้องที่ต้องการจอง เช่น ["LAB-01-1", "LAB-03"]',
        },
        dates: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'วันที่จองรูปแบบ YYYY-MM-DD (ค.ศ.)',
        },
        startTime: { type: 'STRING', description: 'เวลาเริ่มต้น เช่น "09:00"' },
        endTime: { type: 'STRING', description: 'เวลาสิ้นสุด เช่น "12:00"' },
        title: { type: 'STRING', description: 'ชื่องาน/หัวข้อการใช้ห้อง' },
        purpose: { type: 'STRING', description: 'วัตถุประสงค์ เช่น การเรียนการสอน, สอบประเมินทักษะ, อื่นๆ' },
        attendeesCount: { type: 'INTEGER', description: 'จำนวนผู้เข้าใช้โดยประมาณ' },
        courseQuery: { type: 'STRING', description: 'รหัสวิชาที่เกี่ยวข้อง (ถ้ามี)' },
        autoApprove: { type: 'BOOLEAN', description: 'อนุมัติทันทีในฐานะเจ้าหน้าที่/แอดมินหรือไม่ (ค่าเริ่มต้น true)' },
      },
      required: ['rooms', 'dates', 'startTime', 'endTime', 'title'],
    },
  },
  {
    name: 'propose_toggle_practice_slot',
    description: 'เตรียมเปิดหรือปิดรอบฝึกทักษะด้วยตนเอง (PracticeSlot) ตามวันที่/ห้อง/ช่วงเวลา',
    parameters: {
      type: 'OBJECT',
      properties: {
        isOpen: { type: 'BOOLEAN', description: 'true = เปิดรอบฝึก, false = ปิดรอบฝึก' },
        dateStr: { type: 'STRING', description: 'วันที่รูปแบบ YYYY-MM-DD (ค.ศ.)' },
        roomQuery: { type: 'STRING', description: 'รหัสหรือชื่อห้อง (ถ้าไม่ระบุจะเลือกทุกรอบในวันนั้น)' },
        startTime: { type: 'STRING', description: 'เวลาเริ่มรอบ เช่น "09:00" (ถ้ามี)' },
        closeReason: { type: 'STRING', description: 'เหตุผลการปิดรอบ (กรณี isOpen=false)' },
      },
      required: ['isOpen', 'dateStr'],
    },
  },
  {
    name: 'propose_send_broadcast',
    description: 'เตรียมส่งประกาศแจ้งเตือน (BroadcastMessage) ถึงกลุ่มนิสิต อาจารย์ หรือผู้ใช้ทุกคนในระบบ',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'หัวข้อประกาศ' },
        message: { type: 'STRING', description: 'เนื้อหาข้อความประกาศ' },
        targetType: { type: 'STRING', description: 'ALL_STUDENTS, ALL_TEACHERS, หรือ ALL_USERS' },
        priority: { type: 'STRING', description: 'NORMAL, HIGH, หรือ URGENT' },
        linkUrl: { type: 'STRING', description: 'ลิงก์ปลายทางในระบบ (ถ้ามี)' },
      },
      required: ['title', 'message', 'targetType'],
    },
  },
  {
    name: 'propose_update_issue_report',
    description: 'เตรียมอัปเดตสถานะการแจ้งชำรุดครุภัณฑ์ (EquipmentIssueReport) และบันทึกส่งซ่อม',
    parameters: {
      type: 'OBJECT',
      properties: {
        reportNumber: { type: 'STRING', description: 'เลขที่ใบแจ้งชำรุด เช่น REP-25691013-001 หรือรหัสครุภัณฑ์' },
        status: { type: 'STRING', description: 'ACKNOWLEDGED, SENT_TO_REPAIR, RESOLVED, หรือ REJECTED' },
        actionNote: { type: 'STRING', description: 'บันทึกการดำเนินการของเจ้าหน้าที่' },
        repairShop: { type: 'STRING', description: 'ชื่อศูนย์ซ่อม/ผู้รับซ่อม (กรณีส่งซ่อม)' },
        repairCost: { type: 'NUMBER', description: 'ค่าใช้จ่ายการซ่อม (บาท)' },
      },
      required: ['reportNumber', 'status'],
    },
  },
  {
    name: 'propose_course_enrollment',
    description: 'เตรียมเพิ่มหรือนำรายชื่อนิสิตออกจากรายวิชา (CourseEnrollment)',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'ADD หรือ REMOVE' },
        courseQuery: { type: 'STRING', description: 'รหัสหรือชื่อวิชา เช่น 222, 01980222-69' },
        studentIds: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'รายการรหัสนิสิต เช่น ["b681234567"]',
        },
        cohortPrefix: {
          type: 'STRING',
          description: 'รหัสรุ่นนิสิต เช่น "68" หรือ "b68" (กรณีเพิ่ม/ลบทั้งรุ่น)',
        },
      },
      required: ['action', 'courseQuery'],
    },
  },
  {
    name: 'propose_stock_adjustment',
    description: 'เตรียมปรับยอดสต็อกคงเหลือของเวชภัณฑ์ (StockLot) และบันทึก StockTransaction',
    parameters: {
      type: 'OBJECT',
      properties: {
        itemQuery: { type: 'STRING', description: 'ชื่อหรือรหัสพัสดุเวชภัณฑ์' },
        lotNumber: { type: 'STRING', description: 'เลขล็อต (ถ้าไม่ระบุจะเลือกใช้ล็อตที่มีอยู่หรือล็อตแรก)' },
        mode: { type: 'STRING', description: 'DELTA (เพิ่ม/ลดตามจำนวน) หรือ SET (ตั้งยอดใหม่โดยตรง)' },
        quantityValue: { type: 'INTEGER', description: 'จำนวนที่เพิ่ม/ลด (เช่น 5 หรือ -2) หรือยอดใหม่เมื่อ mode=SET' },
        note: { type: 'STRING', description: 'สาเหตุการปรับยอดสต็อก' },
      },
      required: ['itemQuery', 'mode', 'quantityValue'],
    },
  },
];

function assertStaffActor(actor: ToolActor): boolean {
  const role = (actor.role || 'USER').toUpperCase();
  return role === 'ADMIN' || role === 'OFFICER';
}

function normalizeRoomToken(raw: string): string {
  const trimmed = (raw || '').trim();
  const upper = trimmed.toUpperCase();
  if (/^(?:LAB[\s-]*)?0?1[-\/]?1$/i.test(upper) || upper === '1/3' || upper === 'LAB1/3') return 'LAB-01-1';
  if (/^(?:LAB[\s-]*)?0?1[-\/]?2$/i.test(upper) || upper === '2/3' || upper === 'LAB2/3') return 'LAB-01-2';
  if (/^(?:LAB[\s-]*)?0?1[-\/]?3$/i.test(upper) || upper === '3/3' || upper === 'LAB3/3') return 'LAB-01-3';
  if (/^LAB[\s-]*3$/i.test(upper)) return 'LAB-03';
  if (/^LAB[\s-]*4$/i.test(upper)) return 'LAB-04';
  if (/^LAB[\s-]*5$/i.test(upper)) return 'LAB-05';
  if (/^LAB[\s-]*6$/i.test(upper)) return 'LAB-06';
  if (/^LAB[\s-]*7$/i.test(upper)) return 'LAB-07';
  if (upper === 'CS' || upper === 'LABCS' || upper === 'LAB-CS') return 'LAB-CS';
  if (upper === 'EQ' || upper === 'LABEQ' || upper === 'LAB-EQ') return 'LAB-EQ';
  if (/^SIM[\s-]*MAN$/i.test(upper) || upper === 'LAB-SIM-MAN') return 'LAB-SIM-MAN';
  if (/^SIM[\s-]*MOM$/i.test(upper) || upper === 'LAB-SIM-MOM') return 'LAB-SIM-MOM';
  return trimmed;
}

async function resolveRoomsByAliases(rawRooms: string[]) {
  const allRooms = await prisma.practiceRoom.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });

  const matched: Array<{ id: string; code: string; name: string }> = [];
  const unmatched: string[] = [];

  for (const token of rawRooms) {
    const normalized = normalizeRoomToken(token);
    const found = allRooms.find(
      (r) =>
        r.code.toLowerCase() === normalized.toLowerCase() ||
        r.name.toLowerCase().includes(normalized.toLowerCase()) ||
        r.code.toLowerCase() === token.trim().toLowerCase()
    );
    if (found) {
      if (!matched.some((m) => m.id === found.id)) matched.push(found);
    } else {
      unmatched.push(token);
    }
  }

  return { matched, unmatched, allRooms };
}

function makeActionId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * สร้างแผนการดำเนินการ (Preview & Impact Card) โดยยังไม่แก้ไขข้อมูลจริงในฐานข้อมูล
 */
export async function proposeAdminAction(
  toolName: string,
  rawArgs: Record<string, any> | undefined,
  actor: ToolActor
): Promise<{ pendingAction?: PendingAdminAction; error?: string; message: string }> {
  if (!assertStaffActor(actor)) {
    return {
      error: 'FORBIDDEN',
      message: 'ปฏิเสธสิทธิ์: คำสั่งแก้ไขข้อมูลระบบสงวนสิทธิ์เฉพาะเจ้าหน้าที่ห้องปฏิบัติการและผู้ดูแลระบบเท่านั้นครับ',
    };
  }

  const args = rawArgs || {};

  switch (toolName) {
    case 'propose_batch_ac_logs': {
      const rawRooms: string[] = Array.isArray(args.rooms) ? args.rooms : [];
      const dates: string[] = Array.isArray(args.dates)
        ? args.dates.filter((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
        : [];
      const openTime = typeof args.openTime === 'string' ? args.openTime : '09:00';
      const closeTime = typeof args.closeTime === 'string' ? args.closeTime : '16:00';
      const temperature = typeof args.temperature === 'number' ? args.temperature : 24.0;
      const purpose = typeof args.purpose === 'string' && args.purpose.trim() ? args.purpose.trim() : 'อื่นๆ';
      const note = typeof args.note === 'string' ? args.note.trim() : '';

      if (rawRooms.length === 0 || dates.length === 0) {
        return { error: 'INVALID_ARGS', message: 'กรุณาระบุรายชื่อห้องและวันที่ (YYYY-MM-DD) ให้ครบถ้วนครับ' };
      }

      const { matched, unmatched, allRooms } = await resolveRoomsByAliases(rawRooms);
      if (matched.length === 0) {
        return {
          error: 'NO_ROOMS',
          message: `ไม่พบห้องที่ระบุ (${unmatched.join(', ')}) ห้องที่มีในระบบคือ: ${allRooms.map((r) => r.code).join(', ')}`,
        };
      }

      const rawSessions = Array.isArray(args.sessions) && args.sessions.length > 0
        ? args.sessions.map((s: any) => ({
            openTime: s.openTime || openTime,
            closeTime: s.closeTime || closeTime,
            hours: calculateUsageHours(s.openTime || openTime, s.closeTime || closeTime),
            temperature: typeof s.temperature === 'number' ? s.temperature : temperature,
            purpose: s.purpose || purpose,
          }))
        : [
            {
              openTime,
              closeTime,
              hours: calculateUsageHours(openTime, closeTime),
              temperature,
              purpose,
            },
          ];

      const totalHoursPerRoomDay = Math.round(rawSessions.reduce((sum: number, s: any) => sum + (s.hours || 0), 0) * 10) / 10;
      if (totalHoursPerRoomDay <= 0) {
        return { error: 'INVALID_TIME', message: 'เวลาปิดต้องมากกว่าเวลาเปิดครับ' };
      }

      const dateObjs = dates.map((d) => {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0));
      });

      const existingCount = await prisma.acOperationLog.count({
        where: {
          roomId: { in: matched.map((r) => r.id) },
          date: { in: dateObjs },
        },
      });

      const impactCount = matched.length * dates.length;
      const warnings: string[] = [];
      if (unmatched.length > 0) {
        warnings.push(`ไม่พบห้องในระบบ: ${unmatched.join(', ')} (ระบบข้ามห้องนี้ให้ หรือพิมพ์ระบุชื่อห้องแทนได้ครับ)`);
      }
      if (existingCount > 0) {
        warnings.push(`พบข้อมูลเดิมอยู่แล้ว ${existingCount} รายการ — การยืนยันจะอัปเดตทับรายการเดิม`);
      }

      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'BATCH_LOG_AC',
        title: `บันทึกเปิด–ปิดแอร์แบบกลุ่ม (${impactCount} รายการ)`,
        summary: `บันทึก ${matched.length} ห้อง × ${dates.length} วัน รวม ${Math.round(totalHoursPerRoomDay * impactCount * 10) / 10} ชั่วโมง`,
        severity: impactCount >= 10 ? 'MEDIUM' : 'LOW',
        impactCount,
        details: [
          { label: 'ห้องที่บันทึก', value: matched.map((r) => r.code).join(', '), highlight: true },
          { label: 'วันที่', value: dates.join(', ') },
          { label: 'ช่วงเวลา', value: `${openTime} - ${closeTime} น. (${totalHoursPerRoomDay} ชม./วัน)` },
          { label: 'อุณหภูมิ / วัตถุประสงค์', value: `${temperature}°C • ${purpose}${note ? ` (${note})` : ''}` },
          { label: 'ยอดรวมชั่วโมงทั้งหมด', value: `${Math.round(totalHoursPerRoomDay * impactCount * 10) / 10} ชั่วโมง` },
        ],
        warnings: warnings.length > 0 ? warnings : undefined,
        payload: {
          roomIds: matched.map((r) => r.id),
          roomCodes: matched.map((r) => r.code),
          dates,
          openTime,
          closeTime,
          usageHours: totalHoursPerRoomDay,
          temperature,
          purpose,
          note: note || null,
          sessionsJson: JSON.stringify(rawSessions),
        },
        createdAt: Date.now(),
      };

      return { pendingAction, message: `เตรียมรายการบันทึกแอร์ ${impactCount} รายการเรียบร้อย กรุณาตรวจสอบการ์ดยืนยัน` };
    }

    case 'propose_manage_holiday': {
      const action = String(args.action || 'ADD').toUpperCase() === 'DELETE' ? 'DELETE' : 'ADD';
      const dateStr = typeof args.dateStr === 'string' ? args.dateStr.trim() : '';
      const name = typeof args.name === 'string' ? args.name.trim() : '';
      const description = typeof args.description === 'string' ? args.description.trim() : '';

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return { error: 'INVALID_DATE', message: 'กรุณาระบุวันที่รูปแบบ YYYY-MM-DD ให้ถูกต้องครับ' };
      }
      if (action === 'ADD' && !name) {
        return { error: 'MISSING_NAME', message: 'กรุณาระบุชื่อวันหยุดพิเศษครับ' };
      }

      const existing = await prisma.customHoliday.findUnique({ where: { dateStr } });
      if (action === 'DELETE' && !existing) {
        return { error: 'NOT_FOUND', message: `ไม่พบวันหยุดพิเศษของวันที่ ${dateStr} ในระบบครับ` };
      }

      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'MANAGE_HOLIDAY',
        title: action === 'ADD' ? `ตั้งค่าวันหยุดพิเศษ (${dateStr})` : `ยกเลิกวันหยุดพิเศษ (${dateStr})`,
        summary: action === 'ADD' ? `กำหนดวันที่ ${dateStr} เป็น "${name}"` : `ลบวันหยุด "${existing?.name}" วันที่ ${dateStr}`,
        severity: 'LOW',
        impactCount: 1,
        details: [
          { label: 'การดำเนินการ', value: action === 'ADD' ? 'เพิ่ม / อัปเดตวันหยุด' : 'ลบวันหยุด', highlight: true },
          { label: 'วันที่', value: dateStr },
          { label: 'ชื่อวันหยุด', value: action === 'ADD' ? name : existing?.name || '-' },
        ],
        warnings: existing && action === 'ADD' ? [`วันที่นี้เคยตั้งเป็น "${existing.name}" ไว้แล้ว จะอัปเดตชื่อใหม่ทับ`] : undefined,
        payload: { action, dateStr, name: name || existing?.name || '', description: description || null },
        createdAt: Date.now(),
      };

      return { pendingAction, message: 'เตรียมรายการจัดการวันหยุดพิเศษเรียบร้อย' };
    }

    case 'propose_review_approvals': {
      const decision = String(args.decision || 'APPROVE').toUpperCase() === 'REJECT' ? 'REJECT' : 'APPROVE';
      const entityType = String(args.entityType || 'ALL').toUpperCase();
      const codes: string[] = Array.isArray(args.referenceCodes)
        ? args.referenceCodes.map((c: any) => String(c).trim()).filter(Boolean)
        : [];
      const rejectionReason = typeof args.rejectionReason === 'string' ? args.rejectionReason.trim() : '';

      if (decision === 'REJECT' && !rejectionReason) {
        return { error: 'MISSING_REASON', message: 'กรุณาระบุเหตุผลการปฏิเสธคำขอด้วยครับ' };
      }

      const codeFilter = codes.length > 0 ? { in: codes } : undefined;

      const [borrows, requisitions, rooms, practices] = await Promise.all([
        entityType === 'ALL' || entityType === 'BORROW'
          ? prisma.borrowRequest.findMany({
              where: { status: 'PENDING', ...(codeFilter ? { requestNumber: codeFilter } : {}) },
              include: { user: { select: { name: true } } },
              take: 30,
            })
          : [],
        entityType === 'ALL' || entityType === 'REQUISITION'
          ? prisma.requisitionRequest.findMany({
              where: { status: 'PENDING', ...(codeFilter ? { requestNumber: codeFilter } : {}) },
              include: { user: { select: { name: true } } },
              take: 30,
            })
          : [],
        entityType === 'ALL' || entityType === 'ROOM'
          ? prisma.roomBooking.findMany({
              where: { status: 'PENDING', ...(codeFilter ? { bookingNumber: codeFilter } : {}) },
              include: { user: { select: { name: true } }, room: { select: { code: true } } },
              take: 30,
            })
          : [],
        entityType === 'ALL' || entityType === 'PRACTICE'
          ? prisma.practiceBooking.findMany({
              where: { status: 'PENDING', ...(codeFilter ? { bookingNumber: codeFilter } : {}) },
              include: { user: { select: { name: true } } },
              take: 30,
            })
          : [],
      ]);

      const targets = [
        ...borrows.map((b) => ({ type: 'BORROW', id: b.id, code: b.requestNumber, userId: b.userId, label: `${b.requestNumber} (${b.user.name})` })),
        ...requisitions.map((r) => ({ type: 'REQUISITION', id: r.id, code: r.requestNumber, userId: r.userId, label: `${r.requestNumber} (${r.user.name})` })),
        ...rooms.map((rm) => ({ type: 'ROOM', id: rm.id, code: rm.bookingNumber, userId: rm.userId, label: `${rm.bookingNumber} ห้อง ${rm.room.code} (${rm.user.name})` })),
        ...practices.map((pb) => ({ type: 'PRACTICE', id: pb.id, code: pb.bookingNumber, userId: pb.userId, label: `${pb.bookingNumber} (${pb.user.name})` })),
      ];

      if (targets.length === 0) {
        return { error: 'NO_PENDING', message: 'ไม่พบคำขอรออนุมัติที่ตรงตามเงื่อนไขในขณะนี้ครับ' };
      }

      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'REVIEW_APPROVALS',
        title: `${decision === 'APPROVE' ? 'อนุมัติคำขอ' : 'ปฏิเสธคำขอ'} (${targets.length} รายการ)`,
        summary: `${decision === 'APPROVE' ? 'อนุมัติ' : 'ปฏิเสธ'} ${targets.length} รายการ และแจ้งเตือนผู้ยื่นคำขออัตโนมัติ`,
        severity: targets.length > 3 || decision === 'REJECT' ? 'HIGH' : 'MEDIUM',
        impactCount: targets.length,
        details: [
          { label: 'การตัดสินใจ', value: decision === 'APPROVE' ? '✅ อนุมัติ (APPROVE)' : '❌ ปฏิเสธ (REJECT)', highlight: true },
          { label: 'จำนวนรายการ', value: `${targets.length} รายการ` },
          { label: 'รายการที่จะดำเนินการ', value: targets.slice(0, 5).map((t) => t.label).join(', ') + (targets.length > 5 ? ` และอีก ${targets.length - 5} รายการ` : '') },
          ...(decision === 'REJECT' ? [{ label: 'เหตุผลการปฏิเสธ', value: rejectionReason }] : []),
        ],
        payload: { decision, rejectionReason, targets },
        createdAt: Date.now(),
      };

      return { pendingAction, message: `พบคำขอรออนุมัติ ${targets.length} รายการ เตรียมการ์ดยืนยันแล้ว` };
    }

    case 'propose_overdue_reminders': {
      const requestNumbers: string[] = Array.isArray(args.requestNumbers)
        ? args.requestNumbers.map((x: any) => String(x).trim()).filter(Boolean)
        : [];
      const now = new Date();

      const overdue = await prisma.borrowRequest.findMany({
        where: {
          status: 'BORROWED',
          expectedReturnDate: { lt: now },
          ...(requestNumbers.length > 0 ? { requestNumber: { in: requestNumbers } } : {}),
        },
        include: {
          user: { select: { id: true, name: true, studentId: true } },
          items: { include: { item: { select: { name: true } } } },
        },
        take: 30,
      });

      if (overdue.length === 0) {
        return { error: 'NO_OVERDUE', message: 'ไม่พบรายการยืมครุภัณฑ์ที่เกินกำหนดส่งคืนในขณะนี้ครับ' };
      }

      const targets = overdue.map((b) => ({
        id: b.id,
        requestNumber: b.requestNumber,
        userId: b.userId,
        userName: b.user.name,
        dueDate: b.expectedReturnDate.toISOString().slice(0, 10),
        itemsText: b.items.map((i) => i.item.name).join(', '),
      }));

      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'SEND_OVERDUE_REMINDERS',
        title: `ส่งแจ้งเตือนทวงคืนพัสดุ (${targets.length} รายการ)`,
        summary: `ส่งแจ้งเตือนในระบบและ Web Push ถึงนิสิต/ผู้ยืมที่เกินกำหนดส่งคืน ${targets.length} รายการ`,
        severity: 'MEDIUM',
        impactCount: targets.length,
        details: [
          { label: 'จำนวนคำขอที่ค้างคืน', value: `${targets.length} รายการ`, highlight: true },
          {
            label: 'ผู้รับแจ้งเตือน',
            value: targets.slice(0, 4).map((t) => `${t.userName} [${t.requestNumber}]`).join(', ') + (targets.length > 4 ? ` (+อีก ${targets.length - 4})` : ''),
          },
        ],
        payload: { targets },
        createdAt: Date.now(),
      };

      return { pendingAction, message: `เตรียมรายการแจ้งเตือนทวงคืน ${targets.length} รายการเรียบร้อย` };
    }

    case 'propose_room_booking': {
      const rawRooms: string[] = Array.isArray(args.rooms) ? args.rooms : [];
      const dates: string[] = Array.isArray(args.dates)
        ? args.dates.filter((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
        : [];
      const startTime = typeof args.startTime === 'string' ? args.startTime : '';
      const endTime = typeof args.endTime === 'string' ? args.endTime : '';
      const title = typeof args.title === 'string' ? args.title.trim() : '';
      const purpose = typeof args.purpose === 'string' && args.purpose.trim() ? args.purpose.trim() : 'การเรียนการสอน';
      const attendeesCount = typeof args.attendeesCount === 'number' ? args.attendeesCount : 10;
      const autoApprove = args.autoApprove !== false;

      if (rawRooms.length === 0 || dates.length === 0 || !startTime || !endTime || !title) {
        return { error: 'INVALID_ARGS', message: 'กรุณาระบุห้อง, วันที่, ช่วงเวลา และหัวข้อการใช้ห้องให้ครบถ้วนครับ' };
      }

      const { matched, unmatched } = await resolveRoomsByAliases(rawRooms);
      if (matched.length === 0) {
        return { error: 'NO_ROOMS', message: `ไม่พบห้องที่ระบุ (${unmatched.join(', ')}) ครับ` };
      }

      const warnings: string[] = [];
      if (unmatched.length > 0) warnings.push(`ไม่พบห้อง: ${unmatched.join(', ')}`);

      for (const rm of matched) {
        for (const dStr of dates) {
          const [y, m, d] = dStr.split('-').map(Number);
          const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
          const dayEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
          const conflicts = await prisma.roomBooking.findMany({
            where: {
              roomId: rm.id,
              bookingDate: { gte: dayStart, lte: dayEnd },
              status: { in: ['APPROVED', 'PENDING'] },
            },
          });
          for (const c of conflicts) {
            if (startTime < c.endTime && endTime > c.startTime) {
              warnings.push(`เวลาชน: ${rm.code} วันที่ ${dStr} มี "${c.title}" (${c.startTime}-${c.endTime}) อยู่แล้ว`);
            }
          }
        }
      }

      let course: { id: string; code: string; name: string; instructorName: string } | null = null;
      if (typeof args.courseQuery === 'string' && args.courseQuery.trim()) {
        course = await prisma.course.findFirst({
          where: {
            status: 'ACTIVE',
            OR: [
              { code: { contains: args.courseQuery.trim(), mode: 'insensitive' } },
              { name: { contains: args.courseQuery.trim(), mode: 'insensitive' } },
            ],
          },
          select: { id: true, code: true, name: true, instructorName: true },
        });
      }

      const impactCount = matched.length * dates.length;
      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'CREATE_ROOM_BOOKING',
        title: `จองห้องปฏิบัติการ (${impactCount} รายการ)`,
        summary: `จอง ${matched.map((r) => r.code).join(', ')} วันที่ ${dates.join(', ')} (${startTime}-${endTime})`,
        severity: warnings.some((w) => w.startsWith('เวลาชน')) ? 'HIGH' : 'MEDIUM',
        impactCount,
        details: [
          { label: 'หัวข้อ / งาน', value: title, highlight: true },
          { label: 'ห้องปฏิบัติการ', value: matched.map((r) => r.code).join(', ') },
          { label: 'วันที่และเวลา', value: `${dates.join(', ')} | ${startTime}-${endTime} น.` },
          { label: 'สถานะหลังบันทึก', value: autoApprove ? 'APPROVED (อนุมัติทันที)' : 'PENDING (รออนุมัติ)' },
          ...(course ? [{ label: 'รายวิชา', value: `[${course.code}] ${course.name}` }] : []),
        ],
        warnings: warnings.length > 0 ? warnings : undefined,
        payload: {
          rooms: matched,
          dates,
          startTime,
          endTime,
          title,
          purpose,
          attendeesCount,
          courseId: course?.id || null,
          advisorName: course?.instructorName || null,
          autoApprove,
        },
        createdAt: Date.now(),
      };

      return { pendingAction, message: 'เตรียมคำขอจองห้องเรียบร้อย กรุณาตรวจสอบตารางและความถูกต้องก่อนยืนยัน' };
    }

    case 'propose_toggle_practice_slot': {
      const isOpen = Boolean(args.isOpen);
      const dateStr = typeof args.dateStr === 'string' ? args.dateStr.trim() : '';
      const roomQuery = typeof args.roomQuery === 'string' ? args.roomQuery.trim() : '';
      const startTime = typeof args.startTime === 'string' ? args.startTime.trim() : '';
      const closeReason = typeof args.closeReason === 'string' ? args.closeReason.trim() : '';

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return { error: 'INVALID_DATE', message: 'กรุณาระบุวันที่รูปแบบ YYYY-MM-DD ครับ' };
      }

      const [y, m, d] = dateStr.split('-').map(Number);
      const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

      const slots = await prisma.practiceSlot.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          ...(startTime ? { startTime } : {}),
          ...(roomQuery
            ? {
                room: {
                  OR: [
                    { code: { contains: normalizeRoomToken(roomQuery), mode: 'insensitive' } },
                    { name: { contains: roomQuery, mode: 'insensitive' } },
                  ],
                },
              }
            : {}),
        },
        include: {
          room: { select: { code: true, name: true } },
          bookings: { where: { status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN'] } }, select: { id: true } },
        },
      });

      if (slots.length === 0) {
        return { error: 'NO_SLOTS', message: `ไม่พบรอบฝึกทักษะ (PracticeSlot) ในวันที่ ${dateStr} ตามเงื่อนไขที่ระบุครับ` };
      }

      const bookedTotal = slots.reduce((s, sl) => s + sl.bookings.length, 0);
      const warnings: string[] = [];
      if (!isOpen && bookedTotal > 0) {
        warnings.push(`มีนิสิตจองอยู่ในรอบเหล่านี้แล้ว ${bookedTotal} คน`);
      }

      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'TOGGLE_PRACTICE_SLOT',
        title: `${isOpen ? 'เปิด' : 'ปิด'}รอบฝึกทักษะ (${slots.length} รอบ)`,
        summary: `${isOpen ? 'เปิดให้จอง' : 'ปิดรับจอง'}รอบฝึกวันที่ ${dateStr} จำนวน ${slots.length} รอบ`,
        severity: !isOpen && bookedTotal > 0 ? 'HIGH' : 'LOW',
        impactCount: slots.length,
        details: [
          { label: 'สถานะใหม่', value: isOpen ? 'เปิดรับลงทะเบียน' : 'ปิดรอบฝึก', highlight: true },
          { label: 'วันที่', value: dateStr },
          { label: 'รอบที่กระทบ', value: slots.map((s) => `${s.room.code} (${s.startTime}-${s.endTime})`).join(', ') },
          ...(closeReason && !isOpen ? [{ label: 'เหตุผลการปิด', value: closeReason }] : []),
        ],
        warnings: warnings.length > 0 ? warnings : undefined,
        payload: {
          slotIds: slots.map((s) => s.id),
          isOpen,
          closeReason: isOpen ? null : closeReason || 'ปิดรอบฝึกโดยผู้ดูแลระบบ',
        },
        createdAt: Date.now(),
      };

      return { pendingAction, message: `เตรียมอัปเดตสถานะรอบฝึก ${slots.length} รอบเรียบร้อย` };
    }

    case 'propose_send_broadcast': {
      const title = typeof args.title === 'string' ? args.title.trim() : '';
      const message = typeof args.message === 'string' ? args.message.trim() : '';
      const targetType = ['ALL_STUDENTS', 'ALL_TEACHERS', 'ALL_USERS'].includes(String(args.targetType || '').toUpperCase())
        ? String(args.targetType).toUpperCase()
        : 'ALL_STUDENTS';
      const priority = ['NORMAL', 'HIGH', 'URGENT'].includes(String(args.priority || '').toUpperCase())
        ? String(args.priority).toUpperCase()
        : 'NORMAL';
      const linkUrl = typeof args.linkUrl === 'string' ? args.linkUrl.trim() : '';

      if (!title || !message) {
        return { error: 'INVALID_ARGS', message: 'กรุณาระบุหัวข้อและข้อความประกาศให้ครบถ้วนครับ' };
      }

      const roleFilter =
        targetType === 'ALL_STUDENTS'
          ? { role: 'USER' }
          : targetType === 'ALL_TEACHERS'
          ? { role: { in: ['TEACHER', 'APPROVER'] } }
          : { role: { not: 'VIEWER' } };

      const recipientCount = await prisma.user.count({
        where: { status: 'ACTIVE', ...roleFilter },
      });

      const targetLabel =
        targetType === 'ALL_STUDENTS' ? 'นิสิตทุกคน' : targetType === 'ALL_TEACHERS' ? 'อาจารย์/ผู้อนุมัติทุกคน' : 'ผู้ใช้งานทุกคนในระบบ';

      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'SEND_BROADCAST',
        title: `ส่งประกาศถึง${targetLabel} (${recipientCount} คน)`,
        summary: `ส่งการแจ้งเตือน "${title}" ถึงผู้ใช้งาน ${recipientCount} คน (ในระบบ + Web Push)`,
        severity: 'HIGH',
        impactCount: recipientCount,
        details: [
          { label: 'กลุ่มเป้าหมาย', value: `${targetLabel} (${recipientCount} คน)`, highlight: true },
          { label: 'หัวข้อประกาศ', value: title },
          { label: 'เนื้อหา', value: message },
          { label: 'ระดับความสำคัญ', value: priority },
        ],
        warnings: [`การส่งประกาศจะส่งแจ้งเตือนทันทีไปยังผู้ใช้งาน ${recipientCount} บัญชี`],
        payload: { title, message, targetType, priority, linkUrl: linkUrl || null, recipientCount },
        createdAt: Date.now(),
      };

      return { pendingAction, message: `เตรียมประกาศถึง${targetLabel} (${recipientCount} คน) เรียบร้อย` };
    }

    case 'propose_update_issue_report': {
      const reportQuery = typeof args.reportNumber === 'string' ? args.reportNumber.trim() : '';
      const status = String(args.status || '').toUpperCase();
      const actionNote = typeof args.actionNote === 'string' ? args.actionNote.trim() : '';
      const repairShop = typeof args.repairShop === 'string' ? args.repairShop.trim() : '';
      const repairCost = typeof args.repairCost === 'number' ? args.repairCost : 0;

      if (!reportQuery || !['ACKNOWLEDGED', 'SENT_TO_REPAIR', 'RESOLVED', 'REJECTED'].includes(status)) {
        return { error: 'INVALID_ARGS', message: 'กรุณาระบุเลขที่ใบแจ้งชำรุด (หรือรหัสครุภัณฑ์) และสถานะเป้าหมายให้ถูกต้องครับ' };
      }

      const issue = await prisma.equipmentIssueReport.findFirst({
        where: {
          OR: [
            { reportNumber: { equals: reportQuery, mode: 'insensitive' } },
            { asset: { assetCode: { equals: reportQuery, mode: 'insensitive' } } },
          ],
        },
        include: { asset: { include: { item: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
      });

      if (!issue) {
        return { error: 'NOT_FOUND', message: `ไม่พบรายการแจ้งชำรุดสำหรับ "${reportQuery}" ในระบบครับ` };
      }

      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'UPDATE_ISSUE_REPORT',
        title: `อัปเดตงานแจ้งซ่อม ${issue.reportNumber}`,
        summary: `เปลี่ยนสถานะ ${issue.asset.assetCode} (${issue.asset.item.name}) จาก ${issue.status} -> ${status}`,
        severity: 'MEDIUM',
        impactCount: 1,
        details: [
          { label: 'เลขที่ใบแจ้ง / ครุภัณฑ์', value: `${issue.reportNumber} • ${issue.asset.assetCode} (${issue.asset.item.name})`, highlight: true },
          { label: 'สถานะเดิม -> ใหม่', value: `${issue.status} -> ${status}` },
          { label: 'อาการที่แจ้ง', value: issue.issueDescription },
          ...(actionNote ? [{ label: 'บันทึกเจ้าหน้าที่', value: actionNote }] : []),
          ...(repairShop ? [{ label: 'ศูนย์ซ่อม / ค่าใช้จ่าย', value: `${repairShop} (${repairCost.toLocaleString()} บาท)` }] : []),
        ],
        payload: {
          issueId: issue.id,
          reportNumber: issue.reportNumber,
          assetId: issue.assetId,
          assetCode: issue.asset.assetCode,
          issueDescription: issue.issueDescription,
          status,
          actionNote: actionNote || null,
          repairShop: repairShop || null,
          repairCost,
        },
        createdAt: Date.now(),
      };

      return { pendingAction, message: `เตรียมอัปเดตสถานะงานซ่อม ${issue.reportNumber} เรียบร้อย` };
    }

    case 'propose_course_enrollment': {
      const action = String(args.action || 'ADD').toUpperCase() === 'REMOVE' ? 'REMOVE' : 'ADD';
      const courseQuery = typeof args.courseQuery === 'string' ? args.courseQuery.trim() : '';
      const studentIdsInput: string[] = Array.isArray(args.studentIds)
        ? args.studentIds.map((s: any) => String(s).trim()).filter(Boolean)
        : [];
      const cohortPrefix = typeof args.cohortPrefix === 'string' ? args.cohortPrefix.trim() : '';

      if (!courseQuery || (studentIdsInput.length === 0 && !cohortPrefix)) {
        return { error: 'INVALID_ARGS', message: 'กรุณาระบุรหัสรายวิชา และรหัสนิสิตหรือรหัสรุ่น (เช่น 68) ครับ' };
      }

      const course = await prisma.course.findFirst({
        where: {
          status: 'ACTIVE',
          OR: [
            { code: { contains: courseQuery, mode: 'insensitive' } },
            { name: { contains: courseQuery, mode: 'insensitive' } },
          ],
        },
        select: { id: true, code: true, name: true },
      });

      if (!course) {
        return { error: 'COURSE_NOT_FOUND', message: `ไม่พบรายวิชา "${courseQuery}" ในระบบครับ` };
      }

      let matchedStudents: Array<{ id: string; name: string; studentId: string | null }> = [];
      const notFoundCodes: string[] = [];

      if (cohortPrefix) {
        const cleanPrefix = cohortPrefix.toLowerCase().startsWith('b') ? cohortPrefix.toLowerCase() : `b${cohortPrefix}`;
        matchedStudents = await prisma.user.findMany({
          where: {
            role: 'USER',
            status: 'ACTIVE',
            OR: [
              { studentId: { startsWith: cleanPrefix, mode: 'insensitive' } },
              { studentId: { startsWith: cohortPrefix, mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, studentId: true },
        });
      } else {
        const foundUsers = await prisma.user.findMany({
          where: {
            role: 'USER',
            status: 'ACTIVE',
            studentId: { in: studentIdsInput, mode: 'insensitive' },
          },
          select: { id: true, name: true, studentId: true },
        });
        matchedStudents = foundUsers;
        const foundLower = new Set(foundUsers.map((u) => (u.studentId || '').toLowerCase()));
        for (const code of studentIdsInput) {
          if (!foundLower.has(code.toLowerCase())) notFoundCodes.push(code);
        }
      }

      if (matchedStudents.length === 0) {
        return { error: 'NO_STUDENTS', message: 'ไม่พบรายชื่อนิสิตที่ตรงตามรหัสที่ระบุในระบบครับ' };
      }

      const existingEnrollments = await prisma.courseEnrollment.findMany({
        where: { courseId: course.id, userId: { in: matchedStudents.map((s) => s.id) } },
        select: { userId: true },
      });
      const existingSet = new Set(existingEnrollments.map((e) => e.userId));

      const targetStudents =
        action === 'ADD'
          ? matchedStudents.filter((s) => !existingSet.has(s.id))
          : matchedStudents.filter((s) => existingSet.has(s.id));

      if (targetStudents.length === 0) {
        return {
          error: 'NO_CHANGES',
          message:
            action === 'ADD'
              ? `นิสิตทั้ง ${matchedStudents.length} คนมีรายชื่ออยู่ในวิชา [${course.code}] อยู่แล้วครับ`
              : `ไม่พบนิสิตกลุ่มนี้ในรายชื่อของวิชา [${course.code}] จึงไม่มีรายการที่ต้องนำออกครับ`,
        };
      }

      const warnings: string[] = [];
      if (notFoundCodes.length > 0) warnings.push(`ไม่พบรหัสนิสิตในระบบ: ${notFoundCodes.join(', ')}`);

      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'MANAGE_COURSE_ENROLLMENT',
        title: `${action === 'ADD' ? 'เพิ่มรายชื่อนิสิตเข้าวิชา' : 'นำรายชื่อนิสิตออกจากวิชา'} ${course.code}`,
        summary: `${action === 'ADD' ? 'เพิ่ม' : 'นำออก'} ${targetStudents.length} คน ในวิชา [${course.code}] ${course.name}`,
        severity: targetStudents.length >= 10 || action === 'REMOVE' ? 'HIGH' : 'MEDIUM',
        impactCount: targetStudents.length,
        details: [
          { label: 'รายวิชา', value: `[${course.code}] ${course.name}`, highlight: true },
          { label: 'การดำเนินการ', value: action === 'ADD' ? `เพิ่มนิสิต ${targetStudents.length} คน` : `นำนิสิตออก ${targetStudents.length} คน` },
          { label: 'ตัวอย่างรายชื่อ', value: targetStudents.slice(0, 4).map((s) => `${s.studentId || '-'} ${s.name}`).join(', ') + (targetStudents.length > 4 ? ` (+อีก ${targetStudents.length - 4} คน)` : '') },
        ],
        warnings: warnings.length > 0 ? warnings : undefined,
        payload: {
          action,
          courseId: course.id,
          courseCode: course.code,
          userIds: targetStudents.map((s) => s.id),
        },
        createdAt: Date.now(),
      };

      return { pendingAction, message: `เตรียมอัปเดตรายชื่อนิสิต ${targetStudents.length} คนเรียบร้อย` };
    }

    case 'propose_stock_adjustment': {
      const itemQuery = typeof args.itemQuery === 'string' ? args.itemQuery.trim() : '';
      const lotNumber = typeof args.lotNumber === 'string' ? args.lotNumber.trim() : '';
      const mode = String(args.mode || 'DELTA').toUpperCase() === 'SET' ? 'SET' : 'DELTA';
      const quantityValue = Number(args.quantityValue);
      const note = typeof args.note === 'string' ? args.note.trim() : 'ปรับยอดสต็อกผ่านผู้ช่วย AI';

      if (!itemQuery || Number.isNaN(quantityValue)) {
        return { error: 'INVALID_ARGS', message: 'กรุณาระบุชื่อพัสดุและจำนวนที่ต้องการปรับให้ถูกต้องครับ' };
      }

      const item = await prisma.item.findFirst({
        where: {
          status: 'ACTIVE',
          type: 'CONSUMABLE',
          OR: [
            { name: { contains: itemQuery, mode: 'insensitive' } },
            { code: { contains: itemQuery, mode: 'insensitive' } },
          ],
        },
        include: {
          stockLots: {
            orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
          },
        },
      });

      if (!item || item.stockLots.length === 0) {
        return { error: 'NOT_FOUND', message: `ไม่พบเวชภัณฑ์หรือล็อตสต็อกสำหรับ "${itemQuery}" ครับ` };
      }

      const targetLot = lotNumber
        ? item.stockLots.find((l) => l.lotNumber.toLowerCase() === lotNumber.toLowerCase())
        : item.stockLots[0];

      if (!targetLot) {
        return { error: 'LOT_NOT_FOUND', message: `ไม่พบล็อต "${lotNumber}" ของ ${item.name} ครับ` };
      }

      const beforeQty = targetLot.quantityRemaining;
      const afterQty = mode === 'SET' ? Math.round(quantityValue) : beforeQty + Math.round(quantityValue);
      if (afterQty < 0) {
        return { error: 'NEGATIVE_STOCK', message: `ไม่สามารถปรับยอดให้ติดลบได้ (คงเหลือเดิม ${beforeQty} ${item.unit})` };
      }
      const deltaQty = afterQty - beforeQty;

      const pendingAction: PendingAdminAction = {
        actionId: makeActionId(),
        actionType: 'ADJUST_STOCK_LOT',
        title: `ปรับยอดสต็อก ${item.name}`,
        summary: `ล็อต ${targetLot.lotNumber}: ${beforeQty} -> ${afterQty} ${item.unit} (${deltaQty >= 0 ? '+' : ''}${deltaQty})`,
        severity: 'HIGH',
        impactCount: 1,
        details: [
          { label: 'รายการพัสดุ', value: `${item.name} [${item.code}]`, highlight: true },
          { label: 'เลขล็อต', value: targetLot.lotNumber },
          { label: 'ยอดคงเหลือเดิม -> ใหม่', value: `${beforeQty} -> ${afterQty} ${item.unit}` },
          { label: 'สาเหตุ / หมายเหตุ', value: note },
        ],
        warnings: ['การปรับยอดจะบันทึกประวัติ StockTransaction ประเภท ADJUSTMENT ลงระบบบัญชีสต็อก'],
        payload: {
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          lotId: targetLot.id,
          lotNumber: targetLot.lotNumber,
          unitCost: targetLot.unitCost,
          beforeQty,
          afterQty,
          deltaQty,
          note,
        },
        createdAt: Date.now(),
      };

      return { pendingAction, message: `เตรียมปรับยอดสต็อก ${item.name} ล็อต ${targetLot.lotNumber} เรียบร้อย` };
    }

    default:
      return { error: 'UNKNOWN_TOOL', message: `ไม่พบเครื่องมือปฏิบัติการ ${toolName}` };
  }
}

function getActionSuggestedLinks(actionType: AdminActionType): SuggestedLink[] {
  const map: Record<AdminActionType, SuggestedLink[]> = {
    BATCH_LOG_AC: [{ label: 'เปิดดูตารางแอร์', href: '/air-conditioning' }],
    MANAGE_HOLIDAY: [{ label: 'เปิดดูตารางแอร์/วันหยุด', href: '/air-conditioning' }],
    REVIEW_APPROVALS: [{ label: 'ศูนย์อนุมัติคำขอ', href: '/approvals' }],
    SEND_OVERDUE_REMINDERS: [{ label: 'รายการยืม-คืน', href: '/borrow' }],
    CREATE_ROOM_BOOKING: [{ label: 'ปฏิทินห้องแล็บ', href: '/schedule' }],
    TOGGLE_PRACTICE_SLOT: [{ label: 'จัดการรอบฝึกทักษะ', href: '/practice' }],
    SEND_BROADCAST: [{ label: 'ตั้งค่าการแจ้งเตือน', href: '/settings/notifications' }],
    UPDATE_ISSUE_REPORT: [{ label: 'จัดการซ่อมบำรุง', href: '/maintenance' }],
    MANAGE_COURSE_ENROLLMENT: [{ label: 'จัดการรายวิชาและนิสิต', href: '/courses' }],
    ADJUST_STOCK_LOT: [{ label: 'คลังพัสดุและสต็อก', href: '/inventory' }],
  };
  return map[actionType] || [];
}

/**
 * ดำเนินการจริงลงฐานข้อมูลเมื่อผู้ใช้กดยืนยันบน Preview & Impact Card
 */
export async function executeConfirmedAdminAction(
  pendingAction: PendingAdminAction,
  actor: ToolActor
): Promise<{
  success: boolean;
  replyText: string;
  executionResult?: { success: boolean; referenceCode?: string; viewUrl?: string };
  suggestedLinks?: SuggestedLink[];
}> {
  if (!assertStaffActor(actor)) {
    return {
      success: false,
      replyText: '❌ ปฏิเสธการดำเนินการ: เฉพาะเจ้าหน้าที่ห้องปฏิบัติการและผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ยืนยันคำสั่งนี้ครับ',
    };
  }

  const p = pendingAction.payload || {};

  try {
    switch (pendingAction.actionType) {
      case 'BATCH_LOG_AC': {
        const roomIds: string[] = p.roomIds || [];
        const dates: string[] = p.dates || [];
        let savedCount = 0;

        await prisma.$transaction(async (tx) => {
          for (const dStr of dates) {
            const [y, m, d] = dStr.split('-').map(Number);
            const recordDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
            for (const roomId of roomIds) {
              await tx.acOperationLog.upsert({
                where: { roomId_date: { roomId, date: recordDate } },
                update: {
                  openTime: p.openTime,
                  closeTime: p.closeTime,
                  usageHours: p.usageHours,
                  temperature: p.temperature,
                  purpose: p.purpose,
                  sessionsJson: p.sessionsJson,
                  recordedById: actor.id,
                  recordedName: actor.name,
                  note: p.note || null,
                },
                create: {
                  roomId,
                  date: recordDate,
                  openTime: p.openTime,
                  closeTime: p.closeTime,
                  usageHours: p.usageHours,
                  temperature: p.temperature,
                  purpose: p.purpose,
                  sessionsJson: p.sessionsJson,
                  recordedById: actor.id,
                  recordedName: actor.name,
                  note: p.note || null,
                },
              });
              savedCount += 1;
            }
          }
        });

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'UPDATE',
          entityType: 'SYSTEM',
          entityTitle: `บันทึกการเปิด-ปิดแอร์ผ่าน AI (${savedCount} รายการ)`,
          details: `${(p.roomCodes || []).join(', ')} วันที่ ${dates.join(', ')} (${p.openTime}-${p.closeTime})`,
        });

        return {
          success: true,
          replyText: `✅ **บันทึกการเปิด–ปิดแอร์สำเร็จ ${savedCount} รายการ!**\n• ห้อง: ${(p.roomCodes || []).join(', ')}\n• วันที่: ${dates.join(', ')} (${p.openTime} - ${p.closeTime} น.)`,
          executionResult: { success: true, viewUrl: '/air-conditioning' },
          suggestedLinks: getActionSuggestedLinks('BATCH_LOG_AC'),
        };
      }

      case 'MANAGE_HOLIDAY': {
        if (p.action === 'DELETE') {
          await prisma.customHoliday.delete({ where: { dateStr: p.dateStr } });
        } else {
          await prisma.customHoliday.upsert({
            where: { dateStr: p.dateStr },
            update: { name: p.name, description: p.description || null, createdById: actor.id },
            create: { dateStr: p.dateStr, name: p.name, description: p.description || null, createdById: actor.id },
          });
        }

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: p.action === 'DELETE' ? 'DELETE' : 'UPDATE',
          entityType: 'SYSTEM',
          entityTitle: `${p.action === 'DELETE' ? 'ยกเลิก' : 'กำหนด'}วันหยุดพิเศษ (${p.dateStr})`,
          details: p.name,
        });

        return {
          success: true,
          replyText: `✅ **${p.action === 'DELETE' ? 'ยกเลิก' : 'บันทึก'}วันหยุดพิเศษวันที่ ${p.dateStr} (${p.name}) เรียบร้อยแล้วครับ**`,
          executionResult: { success: true, viewUrl: '/air-conditioning' },
          suggestedLinks: getActionSuggestedLinks('MANAGE_HOLIDAY'),
        };
      }

      case 'REVIEW_APPROVALS': {
        const targets: Array<{ type: string; id: string; code: string; userId: string }> = p.targets || [];
        const isApprove = p.decision === 'APPROVE';
        const now = new Date();

        await prisma.$transaction(async (tx) => {
          for (const t of targets) {
            const data = isApprove
              ? { status: 'APPROVED', approverId: actor.id, approvedAt: now }
              : { status: 'REJECTED', approverId: actor.id, approvedAt: now, rejectionReason: p.rejectionReason };

            if (t.type === 'BORROW') {
              await tx.borrowRequest.update({ where: { id: t.id }, data });
            } else if (t.type === 'REQUISITION') {
              await tx.requisitionRequest.update({ where: { id: t.id }, data });
            } else if (t.type === 'ROOM') {
              await tx.roomBooking.update({ where: { id: t.id }, data });
            } else if (t.type === 'PRACTICE') {
              await tx.practiceBooking.update({ where: { id: t.id }, data });
            }
          }
        });

        invalidateCache('room-bookings:');
        invalidateCache('dashboard:');

        await Promise.allSettled(
          targets.map((t) =>
            createNotification({
              userId: t.userId,
              title: isApprove ? `คำขอ ${t.code} ได้รับการอนุมัติแล้ว ✅` : `คำขอ ${t.code} ไม่ได้รับการอนุมัติ`,
              message: isApprove
                ? `คำขอเลขที่ ${t.code} ผ่านการอนุมัติเรียบร้อยแล้ว`
                : `คำขอเลขที่ ${t.code} ถูกปฏิเสธ: ${p.rejectionReason || '-'}`,
              type: isApprove ? 'APPROVAL' : 'REJECTION',
              linkUrl: t.type === 'ROOM' ? '/rooms' : t.type === 'PRACTICE' ? '/practice' : '/borrow',
            })
          )
        );

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: isApprove ? 'APPROVE' : 'REJECT',
          entityType: 'SYSTEM',
          entityTitle: `${isApprove ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอผ่าน AI (${targets.length} รายการ)`,
          details: targets.map((t) => t.code).join(', '),
        });

        return {
          success: true,
          replyText: `✅ **${isApprove ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอจำนวน ${targets.length} รายการ และส่งการแจ้งเตือนเรียบร้อยแล้วครับ!**`,
          executionResult: { success: true, viewUrl: '/approvals' },
          suggestedLinks: getActionSuggestedLinks('REVIEW_APPROVALS'),
        };
      }

      case 'SEND_OVERDUE_REMINDERS': {
        const targets: Array<{ id: string; requestNumber: string; userId: string; userName: string; dueDate: string; itemsText: string }> =
          p.targets || [];
        const now = new Date();

        await Promise.allSettled(
          targets.map(async (t) => {
            await prisma.borrowRequest.update({
              where: { id: t.id },
              data: { lastRemindedAt: now },
            });
            await createNotification({
              userId: t.userId,
              title: `แจ้งเตือนส่งคืนพัสดุเกินกำหนด [${t.requestNumber}]`,
              message: `รายการ ${t.itemsText} ครบกำหนดส่งคืนเมื่อ ${t.dueDate} กรุณานำมาส่งคืนที่ห้องเตรียมการ ชั้น 3 ก่อนเวลา 16:30 น.`,
              type: 'DUE_REMINDER',
              priority: 'HIGH',
              linkUrl: '/borrow',
              entityType: 'BORROW',
              entityId: t.id,
            });
          })
        );

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'REMIND',
          entityType: 'BORROW',
          entityTitle: `ส่งแจ้งเตือนทวงคืนพัสดุผ่าน AI (${targets.length} รายการ)`,
          details: targets.map((t) => `${t.requestNumber}:${t.userName}`).join(', '),
        });

        return {
          success: true,
          replyText: `🔔 **ส่งการแจ้งเตือนทวงคืนพัสดุสำเร็จ ${targets.length} รายการแล้วครับ!**`,
          executionResult: { success: true, viewUrl: '/borrow' },
          suggestedLinks: getActionSuggestedLinks('SEND_OVERDUE_REMINDERS'),
        };
      }

      case 'CREATE_ROOM_BOOKING': {
        const rooms: Array<{ id: string; code: string; name: string }> = p.rooms || [];
        const dates: string[] = p.dates || [];
        const batchGroupId = rooms.length * dates.length > 1 ? `BATCH-${Date.now()}` : null;
        const baseCount = await prisma.roomBooking.count();
        const createdNumbers: string[] = [];
        let seq = 1;
        const now = new Date();

        await prisma.$transaction(async (tx) => {
          for (const dStr of dates) {
            const [y, m, d] = dStr.split('-').map(Number);
            const bookingDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
            for (const rm of rooms) {
              const num = `ROOM-${dStr.replace(/-/g, '')}-${String(baseCount + seq).padStart(3, '0')}`;
              seq += 1;
              await tx.roomBooking.create({
                data: {
                  bookingNumber: num,
                  batchGroupId,
                  roomId: rm.id,
                  userId: actor.id,
                  title: p.title,
                  purpose: p.purpose,
                  bookingDate,
                  startTime: p.startTime,
                  endTime: p.endTime,
                  attendeesCount: p.attendeesCount || 10,
                  courseId: p.courseId || null,
                  advisorName: p.advisorName || null,
                  status: p.autoApprove ? 'APPROVED' : 'PENDING',
                  ...(p.autoApprove ? { approverId: actor.id, approvedAt: now } : {}),
                },
              });
              createdNumbers.push(`${num} (${rm.code})`);
            }
          }
        });

        invalidateCache('room-bookings:');
        invalidateCache('dashboard:');

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'BOOKING_CREATE',
          entityType: 'ROOM_BOOKING',
          entityTitle: `จองห้องปฏิบัติการผ่าน AI (${createdNumbers.length} รายการ)`,
          details: createdNumbers.join(', '),
        });

        return {
          success: true,
          replyText: `🏢 **จองห้องปฏิบัติการสำเร็จ ${createdNumbers.length} รายการ!**\n• รหัส: ${createdNumbers.join(', ')}\n• เวลา: ${p.startTime} - ${p.endTime} น.`,
          executionResult: { success: true, referenceCode: createdNumbers[0], viewUrl: '/schedule' },
          suggestedLinks: getActionSuggestedLinks('CREATE_ROOM_BOOKING'),
        };
      }

      case 'TOGGLE_PRACTICE_SLOT': {
        const slotIds: string[] = p.slotIds || [];
        await prisma.practiceSlot.updateMany({
          where: { id: { in: slotIds } },
          data: {
            isOpen: Boolean(p.isOpen),
            closeReason: p.isOpen ? null : p.closeReason || null,
          },
        });

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'UPDATE',
          entityType: 'PRACTICE_BOOKING',
          entityTitle: `${p.isOpen ? 'เปิด' : 'ปิด'}รอบฝึกทักษะผ่าน AI (${slotIds.length} รอบ)`,
          details: p.closeReason || undefined,
        });

        return {
          success: true,
          replyText: `🩺 **อัปเดตสถานะรอบฝึกทักษะเป็น "${p.isOpen ? 'เปิดรับลงทะเบียน' : 'ปิดรอบฝึก'}" จำนวน ${slotIds.length} รอบเรียบร้อยครับ!**`,
          executionResult: { success: true, viewUrl: '/practice' },
          suggestedLinks: getActionSuggestedLinks('TOGGLE_PRACTICE_SLOT'),
        };
      }

      case 'SEND_BROADCAST': {
        const record = await prisma.broadcastMessage.create({
          data: {
            title: p.title,
            message: p.message,
            targetType: p.targetType,
            priority: p.priority || 'NORMAL',
            linkUrl: p.linkUrl || null,
            status: 'PENDING',
            authorId: actor.id,
            authorName: actor.name,
          },
        });

        const dispatchRes = await dispatchBroadcastMessage(record.id);

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'UPDATE',
          entityType: 'SYSTEM',
          entityTitle: `ส่งประกาศผ่าน AI: ${p.title}`,
          details: `กลุ่ม ${p.targetType} • ส่งถึง ${dispatchRes?.count ?? 0} คน`,
        });

        return {
          success: true,
          replyText: `📢 **ส่งประกาศ "${p.title}" สำเร็จแล้ว!** ส่งถึงผู้ใช้งานจำนวน **${dispatchRes?.count ?? 0} คน** ครับ`,
          executionResult: { success: true, viewUrl: '/settings/notifications' },
          suggestedLinks: getActionSuggestedLinks('SEND_BROADCAST'),
        };
      }

      case 'UPDATE_ISSUE_REPORT': {
        const now = new Date();
        await prisma.$transaction(async (tx) => {
          await tx.equipmentIssueReport.update({
            where: { id: p.issueId },
            data: {
              status: p.status,
              actionNote: p.actionNote || null,
              resolvedById: actor.id,
              resolvedAt: p.status === 'RESOLVED' || p.status === 'REJECTED' ? now : null,
            },
          });

          if (p.status === 'SENT_TO_REPAIR') {
            await tx.equipmentAsset.update({
              where: { id: p.assetId },
              data: { status: 'MAINTENANCE', condition: 'DAMAGED' },
            });
            await tx.maintenanceLog.create({
              data: {
                assetId: p.assetId,
                issue: p.issueDescription,
                repairShop: p.repairShop || null,
                repairCost: p.repairCost || 0,
                status: 'UNDER_REPAIR',
                technicianNote: p.actionNote || null,
                handledById: actor.id,
              },
            });
          } else if (p.status === 'RESOLVED') {
            await tx.equipmentAsset.update({
              where: { id: p.assetId },
              data: { status: 'AVAILABLE', condition: 'GOOD' },
            });
          }
        });

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'UPDATE',
          entityType: 'ITEM',
          entityId: p.assetId,
          entityTitle: `อัปเดตงานแจ้งซ่อม ${p.reportNumber} (${p.status})`,
          details: p.actionNote || p.issueDescription,
        });

        return {
          success: true,
          replyText: `🔧 **อัปเดตสถานะใบแจ้งซ่อม ${p.reportNumber} (${p.assetCode}) เป็น \`${p.status}\` เรียบร้อยแล้วครับ!**`,
          executionResult: { success: true, referenceCode: p.reportNumber, viewUrl: '/maintenance' },
          suggestedLinks: getActionSuggestedLinks('UPDATE_ISSUE_REPORT'),
        };
      }

      case 'MANAGE_COURSE_ENROLLMENT': {
        const userIds: string[] = p.userIds || [];
        let finalCount = 0;

        await prisma.$transaction(async (tx) => {
          if (p.action === 'REMOVE') {
            await tx.courseEnrollment.deleteMany({
              where: { courseId: p.courseId, userId: { in: userIds } },
            });
          } else {
            await tx.courseEnrollment.createMany({
              data: userIds.map((uid) => ({
                courseId: p.courseId,
                userId: uid,
                addedById: actor.id,
              })),
              skipDuplicates: true,
            });
          }

          finalCount = await tx.courseEnrollment.count({ where: { courseId: p.courseId } });
          await tx.course.update({
            where: { id: p.courseId },
            data: { studentCount: finalCount },
          });
        });

        invalidateCache('courses_');
        invalidateCache('dashboard:');

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'UPDATE',
          entityType: 'COURSE',
          entityId: p.courseId,
          entityTitle: `${p.action === 'ADD' ? 'เพิ่ม' : 'นำออก'}นิสิตในรายวิชา ${p.courseCode} (${userIds.length} คน)`,
          details: `ยอดนิสิตลงทะเบียนปัจจุบัน ${finalCount} คน`,
        });

        return {
          success: true,
          replyText: `🎓 **อัปเดตรายชื่อนิสิตในวิชา [${p.courseCode}] สำเร็จ ${userIds.length} คน!** (ยอดนิสิตในวิชาปัจจุบัน: ${finalCount} คน)`,
          executionResult: { success: true, viewUrl: '/courses' },
          suggestedLinks: getActionSuggestedLinks('MANAGE_COURSE_ENROLLMENT'),
        };
      }

      case 'ADJUST_STOCK_LOT': {
        await prisma.$transaction(async (tx) => {
          await tx.stockLot.update({
            where: { id: p.lotId },
            data: { quantityRemaining: p.afterQty },
          });
          await tx.stockTransaction.create({
            data: {
              itemId: p.itemId,
              lotId: p.lotId,
              type: 'ADJUSTMENT',
              quantity: Math.abs(p.deltaQty),
              unitCost: p.unitCost || 0,
              totalCost: Math.abs(p.deltaQty) * (p.unitCost || 0),
              createdById: actor.id,
              note: `${p.note} (${p.beforeQty} -> ${p.afterQty})`,
            },
          });
        });

        invalidateCache('items_');
        invalidateCache('dashboard:');

        await logActivity({
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          action: 'STOCK_ADJUST',
          entityType: 'STOCK',
          entityId: p.itemId,
          entityTitle: `ปรับยอดสต็อก ${p.itemName} (${p.lotNumber})`,
          details: `${p.beforeQty} -> ${p.afterQty} ${p.unit} (${p.note})`,
        });

        return {
          success: true,
          replyText: `📦 **ปรับยอดสต็อก ${p.itemName} (ล็อต ${p.lotNumber}) สำเร็จ!**\nยอดคงเหลือใหม่: **${p.afterQty} ${p.unit}**`,
          executionResult: { success: true, viewUrl: '/inventory' },
          suggestedLinks: getActionSuggestedLinks('ADJUST_STOCK_LOT'),
        };
      }

      default:
        return { success: false, replyText: '❌ ไม่รู้จักประเภทคำสั่งนี้ครับ' };
    }
  } catch (err: any) {
    console.error('executeConfirmedAdminAction error:', err);
    return {
      success: false,
      replyText: `❌ เกิดข้อผิดพลาดระหว่างดำเนินการ: ${err?.message || 'ไม่สามารถบันทึกข้อมูลได้'}`,
    };
  }
}
