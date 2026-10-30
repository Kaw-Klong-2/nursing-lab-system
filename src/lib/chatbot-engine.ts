import { prisma } from './prisma';
import { invalidateCache } from './cache';
import { createNotification, notifyRoles, notifyAdvisorByName } from './notifications';
import { getBangkokParts, getBangkokStartOfDay, parseBangkokDateTime } from './date-time-utils';
import {
  ChatIntent,
  ChatSessionState,
  ChatbotTurnResponse,
  RoomBookingDraft,
  PracticeBookingDraft,
  UnifiedRequestDraft,
  AcLogDraft,
  IssueReportDraft,
  PendingApprovalItemRef,
  ConfirmationSummaryCard,
  QuickReplyOption,
} from '@/types/chatbot';
import {
  extractThaiDates,
  extractThaiTimeRange,
  extractAttendeesCount,
  extractTemperature,
  extractRoomIdentifier,
  extractCourseIdentifier,
  calculateUsageHours,
} from './chatbot-nlu';
import { searchKnowledgeBase, answerDateTimeAndGeneralQuery } from './chatbot-knowledge';
import { askGeminiLabBrain } from './chatbot-gemini';

// ตรวจสอบสิทธิ์การเข้าถึงตามบทบาท (RBAC)
export function checkIntentPermission(intent: ChatIntent, userRole: string): { allowed: boolean; reason?: string } {
  const role = (userRole || 'USER').toUpperCase();

  if (intent === 'LOG_AC') {
    if (role !== 'OFFICER' && role !== 'ADMIN') {
      return {
        allowed: false,
        reason: 'ระบบบันทึกการเปิด-ปิดเครื่องปรับอากาศสงวนสิทธิ์สำหรับเจ้าหน้าที่ห้องปฏิบัติการและผู้ดูแลระบบเท่านั้นครับ หากต้องการใช้ห้อง นิสิตสามารถส่งคำขอ "จองห้องแล็บ" ได้เลยครับ',
      };
    }
  }

  if (intent === 'APPROVE_REQUESTS') {
    if (role === 'USER') {
      return {
        allowed: false,
        reason: 'ฟังก์ชันการพิจารณาอนุมัติคำขอสงวนสิทธิ์สำหรับอาจารย์ประจำวิชาและเจ้าหน้าที่ห้องปฏิบัติการเท่านั้นครับ นิสิตสามารถพิมพ์ "เช็กสถานะคำขอของฉัน" เพื่อดูความคืบหน้าของคำขอตนเองได้ครับ',
      };
    }
  }

  if (intent === 'QUERY_BUDGET') {
    if (role === 'USER') {
      return {
        allowed: false,
        reason: 'ข้อมูลสรุปงบประมาณและต้นทุนรายวิชาสงวนสิทธิ์สำหรับคณาจารย์ผู้สอน เจ้าหน้าที่ และผู้บริหารเท่านั้นครับ',
      };
    }
  }

  return { allowed: true };
}

/**
 * ฟังก์ชันหลักในการประมวลผลข้อความแชทแต่ละรอบ (Process Chatbot Turn)
 */
export async function processChatbotTurn(
  message: string,
  incomingState: ChatSessionState | null,
  currentUser: any
): Promise<ChatbotTurnResponse> {
  const text = (message || '').trim();
  const lower = text.toLowerCase();
  const userRole = (currentUser?.role || 'USER').toUpperCase();

  // สร้างสถานะเริ่มต้นหากไม่มี
  let state: ChatSessionState = incomingState || {
    activeIntent: 'IDLE',
    stage: 'IDLE',
    lastUpdated: Date.now(),
  };

  // 1. ตรวจสอบคำสั่งยกเลิก / เริ่มใหม่
  if (['ยกเลิก', 'เริ่มใหม่', 'ล้าง', 'reset', 'cancel'].includes(lower)) {
    return {
      replyText: 'ยกเลิกรายการเรียบร้อยแล้วครับ ต้องการให้ผมช่วยเหลือเรื่องอะไร สามารถพิมพ์บอกได้เลยครับ เช่น จองห้องแล็บ, เบิก-ยืมของ, หรือสอบถามข้อมูลครับ',
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
      quickReplies: getRoleQuickReplies(userRole),
    };
  }

  // 2. อยู่ในสถานะรอยืนยัน (AWAITING_CONFIRM)
  if (state.stage === 'AWAITING_CONFIRM') {
    if (['ยืนยัน', 'ตกลง', 'ok', 'บันทึก', 'confirm', 'ส่งคำขอ', 'yes'].includes(lower)) {
      return await executeConfirmedAction(state, currentUser);
    }
    // หากพิมพ์แก้ไขข้อมูลในขั้นตอนนี้
    if (['ไม่ยืนยัน', 'ไม่ตกลง', 'ยกเลิก'].includes(lower)) {
      return {
        replyText: 'ยกเลิกการบันทึกรายการเรียบร้อยแล้วครับ ต้องการให้ช่วยเหลือเรื่องอื่นใดเพิ่มเติม พิมพ์บอกได้เลยครับ',
        sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
        quickReplies: getRoleQuickReplies(userRole),
      };
    }
    // ถือว่าเป็นการแก้ไขข้อมูล ให้ปรับปรุง draft แล้วสรุปใหม่
    state.stage = 'COLLECTING_SLOTS';
  }

  // 2.5 ตรวจจับคำถามทั่วไป / ความรู้เกี่ยวกับระบบ / คำถามความสามารถ ("ทำอะไรได้บ้าง")
  if (isGeneralOrKnowledgeQuery(text)) {
    return await handleKnowledgeAndGeneralInquiry(text, state, currentUser);
  }

  // 3. ตรวจจับและอัปเดต Intent
  const detectedIntent = detectIntent(text, state.activeIntent);
  if (state.activeIntent === 'IDLE' || (detectedIntent !== 'IDLE' && detectedIntent !== state.activeIntent)) {
    // เปลี่ยน intent ใหม่
    const permCheck = checkIntentPermission(detectedIntent, userRole);
    if (!permCheck.allowed) {
      return {
        replyText: permCheck.reason || 'ขออภัยครับ ท่านไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้',
        sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
        quickReplies: getRoleQuickReplies(userRole),
      };
    }
    state.activeIntent = detectedIntent;
    state.stage = 'COLLECTING_SLOTS';
  }

  // 4. ประมวลผลตาม Intent ที่กำลังทำงาน
  switch (state.activeIntent) {
    case 'BOOK_ROOM':
      return await handleRoomBookingFlow(text, state, currentUser);

    case 'BOOK_PRACTICE':
      return await handlePracticeBookingFlow(text, state, currentUser);

    case 'BORROW_REQUISITION':
      return await handleUnifiedRequestFlow(text, state, currentUser);

    case 'LOG_AC':
      return await handleAcLogFlow(text, state, currentUser);

    case 'APPROVE_REQUESTS':
      return await handleApprovalFlow(text, state, currentUser);

    case 'REPORT_ISSUE':
      return await handleIssueReportFlow(text, state, currentUser);

    case 'QUERY_STOCK':
      return await handleQueryStock(text, currentUser);

    case 'MY_STATUS':
      return await handleMyStatus(text, currentUser);

    case 'QUERY_OVERDUE':
      return await handleQueryOverdue(text, currentUser);

    case 'QUERY_BUDGET':
      return await handleQueryBudget(text, currentUser);

    case 'FAQ_RULES':
      return handleFaqRules(text);

    default:
      // ตอบคำถามทั่วไป ผ่านทั้งคลังความรู้ และ Gemini AI Brain
      return await handleKnowledgeAndGeneralInquiry(text, state, currentUser);
  }
}

export function isGeneralOrKnowledgeQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // หากผู้ใช้พิมพ์ทำรายการต่อ ไม่ใช่คำถามทั่วไป
  if (lower.includes('ต่อ') && (lower.includes('จอง') || lower.includes('รายการ') || lower.includes('เดิม'))) {
    return false;
  }

  // คำถามเรื่อง วัน เวลา ปฏิทิน และสถานะเปิดปิดแล็บ
  const dateTimeKeywords = [
    'กี่โมง', 'เวลาเท่าไหร่', 'ตอนนี้กี่โมง', 'เวลาอะไร', 'เวลาปัจจุบัน', 'ขอดูเวลา', 'เวลาตอนนี้',
    'วันที่เท่าไหร่', 'วันนี้วันอะไร', 'วันที่เท่าไร', 'พรุ่งนี้วันอะไร', 'เมื่อวานวันอะไร', 'เดือนนี้เดือนอะไร',
    'ปีนี้ปีอะไร', 'พ.ศ.', 'ค.ศ.', 'ตอนนี้แล็บเปิด', 'วันนี้แล็บเปิด', 'แล็บเปิดอยู่ไหม', 'แล็บปิดหรือยัง',
    'เปิดทำการอยู่ไหม', 'แล็บเปิดไหม', 'เวลาทำการ', 'เปิดกี่โมง', 'ปิดกี่โมง'
  ];
  if (dateTimeKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  const keywords = [
    'ทำอะไรได้บ้าง', 'ช่วยอะไรได้บ้าง', 'ทำไรได้มั่ง', 'ช่วยไรได้', 'ฟังก์ชัน', 'ฟีเจอร์', 'ความสามารถ',
    'คุณคือใคร', 'บอททำอะไรได้', 'ทำอะไรเป็นบ้าง', 'มีอะไรให้เล่น', 'help', 'ทำอะไรได้', 'ทำไรได้', 'ทำได้อะไรบ้าง',
    'ระบบนี้คืออะไร', 'เกี่ยวกับระบบ', 'ระบบแล็บคืออะไร', 'ระบบคืออะไร', 'kunurse', 'ระบบนี้ทำอะไร', 'ระบบนี้ใช้ทำอะไร',
    'สิทธิ์', 'บทบาท', 'ใครทำอะไรได้', 'นิสิตทำอะไรได้', 'อาจารย์ทำอะไรได้', 'เจ้าหน้าที่ทำอะไรได้',
    'ยืมได้กี่วัน', 'ยืมของได้กี่วัน', 'ยืมได้นานแค่ไหน', 'คืนช้า', 'ส่งคืนช้า',
    'มีห้องอะไรบ้าง', 'มีห้องแล็บอะไรบ้าง', 'มีกี่ห้อง', 'ห้องแล็บมีกี่ห้อง', 'มีห้องไหนบ้าง', 'รายชื่อห้อง',
    'มีชุดฝึกอะไรบ้าง', 'ชุดฝึกมีอะไรบ้าง', 'kits มีอะไรบ้าง', 'ชุดฝึกคืออะไร', 'มีชุดอะไรบ้าง',
    'แล็บอยู่ที่ไหน', 'ห้องแล็บอยู่ที่ไหน', 'ติดต่อใคร', 'เบอร์โทร', 'ห้องเตรียมการอยู่ไหน', 'ห้องเตรียมแล็บ',
    'คืนของกี่โมง', 'ส่งของคืนกี่โมง', 'คืนของช้าสุด',
    'ข้อห้าม', 'กฎระเบียบ', 'ห้ามเขียนหุ่น', 'เขียนหุ่น', 'การแต่งกาย', 'ระเบียบการใช้ห้อง', 'ข้อควรระวัง',
    'วิธีใช้งาน', 'ขั้นตอนการยืม', 'ยืมของยังไง', 'จองห้องยังไง', 'วิธีจองห้อง', 'วิธีสแกน qr', 'สแกนคิวอาร์ยังไง', 'ขั้นตอนการคืน',
    'osce คืออะไร', 'สอบ osce', 'ซ้อม osce', 'สถานการณ์จำลอง',
    'สวัสดี', 'หวัดดี', 'hello', 'hi', 'ดีครับ', 'ดีค่ะ',
    'ขอบคุณ', 'ขอบใจ', 'thanks', 'แต๊งกิ้ว', 'เยี่ยม', 'สุดยอด',
  ];

  return keywords.some((kw) => lower.includes(kw));
}

/**
 * ตรวจจับเจตนาจากข้อความ
 */
function detectIntent(text: string, currentIntent: ChatIntent): ChatIntent {
  const lower = text.toLowerCase();

  // หากเป็นคำถามความรู้หรือคำถามทั่วไป ไม่ล็อกโฟลว์เดิม
  if (isGeneralOrKnowledgeQuery(text)) {
    return 'IDLE';
  }

  // หากกำลังอยู่ระหว่างโฟลว์เดิม ให้ทำโฟลว์เดิมต่อไป เว้นแต่มีคีย์เวิร์ดเปลี่ยนเรื่องชัดเจน
  if (lower.includes('จองห้อง') || lower.includes('ขอใช้ห้อง') || lower.includes('ห้องแลป') || lower.includes('ห้องแล็บ')) {
    return 'BOOK_ROOM';
  }
  if (lower.includes('ฝึกทักษะ') || lower.includes('ซ้อมหัตถการ') || lower.includes('รอบฝึก') || lower.includes('ซ้อมมือ')) {
    return 'BOOK_PRACTICE';
  }
  if (lower.includes('เบิก') || lower.includes('ยืม') || lower.includes('ขออุปกรณ์') || lower.includes('ขอถุงมือ')) {
    return 'BORROW_REQUISITION';
  }
  if (lower.includes('เปิดแอร์') || lower.includes('ปิดแอร์') || lower.includes('แอร์ห้อง') || lower.includes('บันทึกแอร์')) {
    return 'LOG_AC';
  }
  if (lower.includes('อนุมัติ') || lower.includes('คำขอค้าง') || lower.includes('รออนุมัติ') || lower.includes('พิจารณาคำขอ')) {
    return 'APPROVE_REQUESTS';
  }
  if (lower.includes('แจ้งซ่อม') || lower.includes('ชำรุด') || lower.includes('เสีย') || lower.includes('พัง') || lower.includes('เปิดไม่ติด')) {
    return 'REPORT_ISSUE';
  }
  if (lower.includes('เหลือเท่าไหร่') || lower.includes('สต็อก') || lower.includes('มีของไหม') || lower.includes('อยู่ตู้ไหน') || lower.includes('คงเหลือ')) {
    return 'QUERY_STOCK';
  }
  if (lower.includes('สถานะคำขอ') || lower.includes('ต้องคืนวันไหน') || lower.includes('ยืมอะไรอยู่') || lower.includes('คำขอของฉัน')) {
    return 'MY_STATUS';
  }
  if (lower.includes('ใครยังไม่คืน') || lower.includes('ค้างคืน') || lower.includes('เกินกำหนด')) {
    return 'QUERY_OVERDUE';
  }
  if (lower.includes('งบประมาณ') || lower.includes('เหลืองบ') || lower.includes('ต้นทุนวิชา')) {
    return 'QUERY_BUDGET';
  }
  if (lower.includes('เปิดกี่โมง') || lower.includes('ระเบียบ') || lower.includes('ข้อห้าม') || lower.includes('คู่มือ') || lower.includes('เขียนหุ่น')) {
    return 'FAQ_RULES';
  }

  return currentIntent !== 'IDLE' ? currentIntent : 'IDLE';
}

// ==========================================
// 1. FLOW: จองห้องปฏิบัติการ (BOOK_ROOM)
// ==========================================
async function handleRoomBookingFlow(
  text: string,
  state: ChatSessionState,
  currentUser: any
): Promise<ChatbotTurnResponse> {
  const draft: RoomBookingDraft = state.roomDraft || {};
  let sideResponse = '';

  // ดึงห้องทั้งหมดที่เปิดใช้งาน
  const activeRooms = await prisma.practiceRoom.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, capacity: true },
    orderBy: { code: 'asc' },
  });

  // 1. สกัดชื่อ/รหัสห้อง
  const roomIdent = extractRoomIdentifier(text);
  if (roomIdent) {
    const matched = activeRooms.find(
      (r) =>
        r.code.toLowerCase() === roomIdent.toLowerCase() ||
        r.name.includes(roomIdent) ||
        r.code.includes(roomIdent)
    );
    if (matched) {
      draft.roomId = matched.id;
      draft.roomCode = matched.code;
      draft.roomName = matched.name;
    } else {
      // ระบุห้องที่ไม่มีในระบบ (เช่น 410)
      const roomListStr = activeRooms.map((r) => `• ${r.code} (${r.name}) - รองรับ ${r.capacity} คน`).join('\n');
      sideResponse += `⚠️ ไม่พบห้องปฏิบัติการ "${roomIdent}" ในระบบครับ ห้องที่เปิดให้บริการมีดังนี้ครับ:\n${roomListStr}\n\n`;
    }
  }

  // 2. สกัดวันที่ (รองรับหลายวัน)
  const parsedDates = extractThaiDates(text);
  if (parsedDates.length > 0) {
    const pastDates = parsedDates.filter((p) => p.isPast);
    const validDates = parsedDates.filter((p) => !p.isPast);

    if (pastDates.length > 0) {
      sideResponse += `⚠️ วันที่ ${pastDates.map((p) => p.dateStr).join(', ')} เป็นวันที่ผ่านมาแล้วในอดีต กรุณาระบุวันที่ที่ต้องการจองใหม่นะครับ\n\n`;
    }
    if (validDates.length > 0) {
      draft.dates = validDates.map((p) => p.dateStr);
    }
  }

  // 3. สกัดเวลา
  const timeRange = extractThaiTimeRange(text);
  if (timeRange) {
    draft.startTime = timeRange.startTime;
    draft.endTime = timeRange.endTime;
  }

  // 4. สกัดจำนวนคน
  const attendees = extractAttendeesCount(text);
  if (attendees) {
    draft.attendeesCount = attendees;
  }

  // 5. สกัดวัตถุประสงค์
  if (text.includes('เดินเล่น')) {
    draft.purpose = 'ศึกษาค้นคว้าด้วยตนเอง';
    draft.title = 'ศึกษาค้นคว้าด้วยตนเอง / เดินดูห้องปฏิบัติการ';
  } else if (text.includes('ซ้อม') || text.includes('ฝึก')) {
    draft.purpose = 'ฝึกทักษะการพยาบาล';
    draft.title = 'ฝึกซ้อมทักษะการพยาบาล';
  } else if (text.includes('สอบ') || text.includes('osce')) {
    draft.purpose = 'สอบปฏิบัติการพยาบาล / OSCE';
    draft.title = 'สอบปฏิบัติการพยาบาล';
  } else if (text.includes('ติว')) {
    draft.purpose = 'ติวกลุ่มย่อย';
    draft.title = 'ติวกลุ่มย่อยและทบทวนทักษะ';
  }

  // 6. ตรวจจับคำถามแทรก "มีวิชาอะไรบ้าง"
  if (text.includes('มีวิชาอะไรบ้าง') || text.includes('มีวิชาอะไร')) {
    const courses = await prisma.course.findMany({
      where: { status: 'ACTIVE' },
      select: { code: true, name: true, instructorName: true },
      take: 8,
      orderBy: { code: 'asc' },
    });
    const courseListStr = courses
      .map((c) => `• [${c.code}] ${c.name} (อ.ผู้รับผิดชอบ: ${c.instructorName})`)
      .join('\n');
    sideResponse += `📚 รายวิชาที่มีเปิดให้บริการ ได้แก่:\n${courseListStr}\n\n`;
  }

  // 7. สกัดรหัสวิชา เช่น 222 -> 01980222 พร้อม auto-lock อาจารย์
  const courseCodeInput = extractCourseIdentifier(text);
  if (courseCodeInput) {
    const course = await prisma.course.findFirst({
      where: {
        OR: [
          { code: { contains: courseCodeInput } },
          { name: { contains: courseCodeInput } },
        ],
        status: 'ACTIVE',
      },
    });
    if (course) {
      draft.courseId = course.id;
      draft.courseCode = course.code;
      draft.courseName = course.name;
      draft.advisorName = course.instructorName; // Auto-lock advisor
    }
  }

  // 8. ตรวจสอบการทับซ้อนของตารางห้อง (Conflict Check)
  let conflictWarning = '';
  if (draft.roomId && draft.dates && draft.dates.length > 0 && draft.startTime && draft.endTime) {
    for (const dStr of draft.dates) {
      const [y, m, d] = dStr.split('-').map(Number);
      const bDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const nextDay = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));

      const existingBookings = await prisma.roomBooking.findMany({
        where: {
          roomId: draft.roomId,
          bookingDate: { gte: bDate, lt: nextDay },
          status: { in: ['APPROVED', 'PENDING'] },
        },
      });

      const conflict = existingBookings.find(
        (b) => draft.startTime! < b.endTime && draft.endTime! > b.startTime
      );
      if (conflict) {
        conflictWarning += `⚠️ วันที่ ${dStr} ช่วงเวลา ${conflict.startTime}-${conflict.endTime} น. ห้อง "${draft.roomName}" มีรายการ "${conflict.title}" จองไว้แล้ว (${conflict.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}) กรุณาเปลี่ยนช่วงเวลาหรือเปลี่ยนห้องครับ\n\n`;
        draft.startTime = undefined;
        draft.endTime = undefined;
      }
    }
  }

  state.roomDraft = draft;

  // ตรวจหาคำถามข้อถัดไป
  if (!draft.roomId) {
    const roomListStr = activeRooms.map((r) => `• ${r.code} (${r.name})`).join('\n');
    return {
      replyText: `${sideResponse}ต้องการจองห้องแล็บห้องไหนครับ? (เช่น LAB-01 หรือ ห้อง 401)\n\nห้องที่เปิดให้บริการ:\n${roomListStr}`,
      sessionState: state,
      quickReplies: activeRooms.slice(0, 4).map((r) => ({ label: r.code, textToSend: `ขอจองห้อง ${r.code}` })),
    };
  }

  if (!draft.dates || draft.dates.length === 0) {
    return {
      replyText: `${sideResponse}${conflictWarning}ต้องการจองเข้าใช้งานใน**วันไหน**ครับ? (เช่น พรุ่งนี้, 1 พ.ย. 2569 หรือระบุหลายวันได้ครับ)`,
      sessionState: state,
      quickReplies: [
        { label: 'พรุ่งนี้', textToSend: 'พรุ่งนี้' },
        { label: 'วันมะรืน', textToSend: 'มะรืนนี้' },
      ],
    };
  }

  if (!draft.startTime || !draft.endTime) {
    return {
      replyText: `${sideResponse}${conflictWarning}ต้องการใช้ห้องช่วง**เวลาใด**ครับ? (เช่น ช่วงเช้า 08:30-12:00, ช่วงบ่าย 13:00-16:30 หรือระบุเวลา เช่น 10.00-10.10)`,
      sessionState: state,
      quickReplies: [
        { label: 'ช่วงเช้า (08:30-12:00)', textToSend: 'ช่วงเช้า' },
        { label: 'ช่วงบ่าย (13:00-16:30)', textToSend: 'ช่วงบ่าย' },
        { label: 'เต็มวัน (08:30-16:30)', textToSend: 'เต็มวัน' },
      ],
    };
  }

  if (!draft.attendeesCount || draft.attendeesCount <= 0) {
    return {
      replyText: `${sideResponse}มีผู้เข้าใช้งานประมาณ**กี่คน**ครับ?`,
      sessionState: state,
      quickReplies: [
        { label: '1 คน', textToSend: '1 คน' },
        { label: '5 คน', textToSend: '5 คน' },
        { label: '10 คน', textToSend: '10 คน' },
      ],
    };
  }

  if (!draft.purpose || !draft.title) {
    return {
      replyText: `${sideResponse}ขอทราบ**วัตถุประสงค์**การขอใช้ห้องครับ? (เช่น ติวกลุ่ม, ซ้อมหัตถการ, หรือสอบ)`,
      sessionState: state,
      quickReplies: [
        { label: 'ฝึกซ้อมหัตถการ', textToSend: 'ฝึกซ้อมหัตถการ' },
        { label: 'ติวกลุ่มย่อย', textToSend: 'ติวกลุ่มย่อย' },
        { label: 'ศึกษาค้นคว้าด้วยตนเอง', textToSend: 'ศึกษาค้นคว้าด้วยตนเอง' },
      ],
    };
  }

  if (!draft.courseId) {
    return {
      replyText: `${sideResponse}การจองนี้เกี่ยวข้องกับ**รายวิชา**อะไรครับ? (สามารถพิมพ์รหัสวิชา เช่น 222 หรือถาม "มีวิชาอะไรบ้าง" ได้ครับ)`,
      sessionState: state,
      quickReplies: [
        { label: 'ดูรายวิชาทั้งหมด', textToSend: 'มีวิชาอะไรบ้าง' },
        { label: '01980222 การพยาบาลพื้นฐาน', textToSend: '222' },
      ],
    };
  }

  // ครบทุก Slot แล้ว -> สรุปให้ยืนยัน
  state.stage = 'AWAITING_CONFIRM';

  const dateListText = draft.dates.join(', ');
  const confirmationSummary: ConfirmationSummaryCard = {
    title: 'สรุปคำขอจองห้องปฏิบัติการ (Room Booking)',
    intent: 'BOOK_ROOM',
    details: [
      { label: 'ห้องปฏิบัติการ', value: `${draft.roomCode} (${draft.roomName})`, highlight: true },
      { label: 'วันที่จอง', value: dateListText },
      { label: 'ช่วงเวลา', value: `${draft.startTime} - ${draft.endTime} น.` },
      { label: 'จำนวนผู้เข้าใช้', value: `${draft.attendeesCount} คน` },
      { label: 'วัตถุประสงค์', value: draft.title || draft.purpose || '-' },
      { label: 'รายวิชา', value: `[${draft.courseCode}] ${draft.courseName}` },
      { label: 'อาจารย์ผู้รับผิดชอบ', value: draft.advisorName || 'อาจารย์ประจำวิชา', badge: 'ขึ้นให้อัตโนมัติ 🎓' },
    ],
    confirmText: 'ยืนยันการจอง',
    cancelText: 'ยกเลิก / แก้ไข',
  };

  return {
    replyText: `${sideResponse}รวบรวมข้อมูลการจองห้องแล็บเรียบร้อยแล้วครับ ตรวจสอบความถูกต้องด้านล่าง หากถูกต้อง พิมพ์ **"ยืนยัน"** เพื่อส่งคำขอเข้าสู่ระบบได้เลยครับ:`,
    sessionState: state,
    confirmationSummary,
    quickReplies: [
      { label: '✅ ยืนยันการจอง', textToSend: 'ยืนยัน' },
      { label: '❌ ยกเลิก', textToSend: 'ยกเลิก' },
    ],
  };
}

// ==========================================
// 2. FLOW: จองรอบฝึกปฏิบัติการ (BOOK_PRACTICE)
// ==========================================
async function handlePracticeBookingFlow(
  text: string,
  state: ChatSessionState,
  currentUser: any
): Promise<ChatbotTurnResponse> {
  const draft: PracticeBookingDraft = state.practiceDraft || {};
  let sideResponse = '';

  // ดึงรอบฝึกที่เปิดรับ
  const openSlots = await prisma.practiceSlot.findMany({
    where: {
      isOpen: true,
      date: { gte: getBangkokStartOfDay(new Date()) },
    },
    include: {
      room: true,
      bookings: { where: { status: { in: ['APPROVED', 'PENDING'] } } },
    },
    take: 5,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  if (openSlots.length === 0) {
    return {
      replyText: 'ขณะนี้ยังไม่มีรอบฝึกปฏิบัติด้วยตนเองเปิดให้บริการครับ นิสิตสามารถส่งคำขอ "จองห้องแล็บ" โดยตรงแทนได้ครับ',
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
      quickReplies: [{ label: '🏢 จองห้องแล็บแทน', textToSend: 'จองห้องแล็บ' }],
    };
  }

  // สกัดหัตถการ
  if (text.includes('ทำแผล')) {
    draft.skillTopic = 'การทำแผล (Wound Dressing)';
  } else if (text.includes('ฉีดยา')) {
    draft.skillTopic = 'การฉีดยาและการให้สารน้ำ (Injection & IV)';
  } else if (text.includes('สวนปัสสาวะ')) {
    draft.skillTopic = "การสวนคาสายปัสสาวะ (Foley's Catheter)";
  } else if (text.includes('cpr') || text.includes('กู้ชีพ')) {
    draft.skillTopic = 'การช่วยฟื้นคืนชีพขั้นพื้นฐาน (Basic CPR)';
  }

  // จับคู่ PracticeKit อัตโนมัติ
  if (draft.skillTopic && !draft.practiceKitId) {
    const kit = await prisma.practiceKit.findFirst({
      where: {
        OR: [
          { name: { contains: draft.skillTopic.slice(0, 6) } },
          { description: { contains: draft.skillTopic.slice(0, 6) } },
        ],
      },
    });
    if (kit) {
      draft.practiceKitId = kit.id;
      draft.practiceKitName = kit.name;
    }
  }

  // สกัดรหัสวิชา
  const courseCodeInput = extractCourseIdentifier(text);
  if (courseCodeInput) {
    const course = await prisma.course.findFirst({
      where: { code: { contains: courseCodeInput }, status: 'ACTIVE' },
    });
    if (course) {
      draft.courseId = course.id;
      draft.courseCode = course.code;
      draft.courseName = course.name;
      draft.advisorName = course.instructorName;
    }
  }

  state.practiceDraft = draft;

  if (!draft.skillTopic) {
    return {
      replyText: 'ต้องการลงชื่อเข้ารอบฝึกปฏิบัติใน**หัตถการใด**ครับ?',
      sessionState: state,
      quickReplies: [
        { label: '🩹 ทำแผล (Dressing)', textToSend: 'ฝึกทำแผล' },
        { label: '💉 ฉีดยา (Injection)', textToSend: 'ฝึกฉีดยา' },
        { label: '🩺 สวนปัสสาวะ (Foley)', textToSend: 'ฝึกสวนปัสสาวะ' },
        { label: '🫀 ทำ CPR', textToSend: 'ฝึก CPR' },
      ],
    };
  }

  if (!draft.slotId) {
    const firstSlot = openSlots[0];
    draft.slotId = firstSlot.id;
    const dateFormatted = new Date(firstSlot.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    draft.slotLabel = `${dateFormatted} (${firstSlot.startTime}-${firstSlot.endTime} น.) ห้อง ${firstSlot.room.code}`;
  }

  if (!draft.courseId) {
    return {
      replyText: `เลือกหัตถการ: **${draft.skillTopic}** ${draft.practiceKitName ? `(จับคู่ชุดฝึก: ${draft.practiceKitName})` : ''}\nรอบเวลา: **${draft.slotLabel}**\n\nการฝึกนี้เกี่ยวข้องกับ**รายวิชา**อะไรครับ?`,
      sessionState: state,
      quickReplies: [
        { label: '01980222 การพยาบาลพื้นฐาน', textToSend: '222' },
        { label: '01980311 การพยาบาลผู้ใหญ่', textToSend: '311' },
      ],
    };
  }

  state.stage = 'AWAITING_CONFIRM';
  const confirmationSummary: ConfirmationSummaryCard = {
    title: 'สรุปการลงทะเบียนรอบฝึกปฏิบัติ (Self-Practice)',
    intent: 'BOOK_PRACTICE',
    details: [
      { label: 'รอบเวลาการฝึก', value: draft.slotLabel || 'รอบเวลาแรกที่เปิด', highlight: true },
      { label: 'หัตถการที่ฝึก', value: draft.skillTopic },
      { label: 'ชุดฝึกปฏิบัติ', value: draft.practiceKitName || 'ชุดอุปกรณ์มาตรฐาน' },
      { label: 'รายวิชา', value: `[${draft.courseCode}] ${draft.courseName}` },
      { label: 'อาจารย์ผู้รับผิดชอบ', value: draft.advisorName || 'อาจารย์ประจำวิชา', badge: 'ขึ้นให้อัตโนมัติ 🎓' },
    ],
    confirmText: 'ยืนยันลงทะเบียน',
    cancelText: 'ยกเลิก',
  };

  return {
    replyText: 'สรุปการลงทะเบียนรอบฝึกปฏิบัติเรียบร้อยครับ พิมพ์ **"ยืนยัน"** เพื่อบันทึกคำขอและสร้างบัตรคิวเข้าห้องแล็บครับ:',
    sessionState: state,
    confirmationSummary,
    quickReplies: [
      { label: '✅ ยืนยัน', textToSend: 'ยืนยัน' },
      { label: '❌ ยกเลิก', textToSend: 'ยกเลิก' },
    ],
  };
}

// ==========================================
// 3. FLOW: ยืม-คืน & เบิกวัสดุ (BORROW_REQUISITION)
// ==========================================
async function handleUnifiedRequestFlow(
  text: string,
  state: ChatSessionState,
  currentUser: any
): Promise<ChatbotTurnResponse> {
  const draft: UnifiedRequestDraft = state.requestDraft || { borrowItems: [], requisitionItems: [] };
  let sideResponse = '';

  // ค้นหาพัสดุจากข้อความ
  if (text.includes('ถุงมือ')) {
    const item = await prisma.item.findFirst({
      where: { name: { contains: 'ถุงมือ' } },
      include: { stockLots: true },
    });
    if (item && !draft.requisitionItems.some((r) => r.itemId === item.id)) {
      const currentStock = (item.stockLots || []).reduce((sum, l) => sum + (l.quantityRemaining || 0), 0);
      draft.requisitionItems.push({
        itemId: item.id,
        name: item.name,
        quantity: 2,
        unit: item.unit || 'กล่อง',
        available: currentStock,
      });
      sideResponse += `✅ เพิ่มรายการเบิก: ${item.name} x 2 ${item.unit || 'กล่อง'} (สต็อกคงเหลือ ${currentStock})\n`;
    }
  }

  if (text.includes('ความดัน')) {
    const item = await prisma.item.findFirst({
      where: { name: { contains: 'ความดัน' } },
      include: { assets: { where: { status: 'AVAILABLE' } } },
    });
    if (item && !draft.borrowItems.some((b) => b.itemId === item.id)) {
      draft.borrowItems.push({
        itemId: item.id,
        name: item.name,
        quantity: 1,
        unit: item.unit || 'เครื่อง',
        available: item.assets.length,
      });
      sideResponse += `✅ เพิ่มรายการยืม: ${item.name} x 1 ${item.unit || 'เครื่อง'} (ว่างพร้อมยืม ${item.assets.length})\n`;
    }
  }

  // สกัดเป้าหมายการใช้
  if (text.includes('คนจริง') || text.includes('เพื่อน')) {
    draft.useTarget = 'HUMAN';
  } else if (text.includes('หุ่น') || text.includes('sim') || text.includes('จำลอง')) {
    draft.useTarget = 'SIMULATION';
  }

  // สกัดรหัสวิชา
  const courseCodeInput = extractCourseIdentifier(text);
  if (courseCodeInput) {
    const course = await prisma.course.findFirst({
      where: { code: { contains: courseCodeInput }, status: 'ACTIVE' },
    });
    if (course) {
      draft.courseId = course.id;
      draft.courseCode = course.code;
      draft.courseName = course.name;
      draft.advisorName = course.instructorName;
    }
  }

  state.requestDraft = draft;

  if (draft.borrowItems.length === 0 && draft.requisitionItems.length === 0) {
    return {
      replyText: 'ต้องการเบิกหรือยืมสิ่งของรายการใดบ้างครับ? ระบุชื่อและจำนวนได้เลยครับ เช่น *"ขอเบิกถุงมือ 2 กล่อง กับยืมเครื่องวัดความดัน 1 เครื่อง"*',
      sessionState: state,
      quickReplies: [
        { label: 'เบิกถุงมือไนไตรล์ 2 กล่อง', textToSend: 'ขอเบิกถุงมือ 2 กล่อง' },
        { label: 'ยืมเครื่องวัดความดัน 1 เครื่อง', textToSend: 'ขอยืมเครื่องวัดความดัน 1 เครื่อง' },
      ],
    };
  }

  if (!draft.courseId) {
    return {
      replyText: `${sideResponse}\nคำขอนี้ใช้สำหรับ**รายวิชา**อะไรครับ?`,
      sessionState: state,
      quickReplies: [
        { label: '01980222 การพยาบาลพื้นฐาน', textToSend: '222' },
        { label: '01980311 การพยาบาลผู้ใหญ่', textToSend: '311' },
      ],
    };
  }

  if (!draft.useTarget) {
    return {
      replyText: `${sideResponse}\nนำสิ่งของไปใช้ฝึกกับ**หุ่นจำลอง (Sim-Lab)** หรือฝึกกับ**คนจริง/เพื่อนร่วมชั้น**ครับ?`,
      sessionState: state,
      quickReplies: [
        { label: '🤖 ใช้กับหุ่นจำลอง (Sim-Lab)', textToSend: 'ใช้กับหุ่นจำลอง' },
        { label: '🧑‍⚕️ ใช้กับคนจริง/เพื่อน', textToSend: 'ใช้กับคนจริง' },
      ],
    };
  }

  draft.purpose = draft.purpose || 'ฝึกปฏิบัติการพยาบาล';
  state.stage = 'AWAITING_CONFIRM';

  const itemsSummary = [
    ...draft.requisitionItems.map((r) => `เบิก: ${r.name} x ${r.quantity} ${r.unit}`),
    ...draft.borrowItems.map((b) => `ยืม: ${b.name} x ${b.quantity} ${b.unit}`),
  ].join(', ');

  const confirmationSummary: ConfirmationSummaryCard = {
    title: 'สรุปคำขอยืมครุภัณฑ์ & เบิกวัสดุสิ้นเปลือง',
    intent: 'BORROW_REQUISITION',
    details: [
      { label: 'รายการพัสดุ', value: itemsSummary, highlight: true },
      { label: 'เป้าหมายการใช้', value: draft.useTarget === 'HUMAN' ? 'ใช้กับคนจริง (ผ่านเกณฑ์ความปลอดภัยผู้ป่วย)' : 'ใช้กับหุ่นจำลอง (Sim-Lab)' },
      { label: 'รายวิชา', value: `[${draft.courseCode}] ${draft.courseName}` },
      { label: 'อาจารย์ผู้รับผิดชอบ', value: draft.advisorName || 'อาจารย์ประจำวิชา', badge: 'ขึ้นให้อัตโนมัติ 🎓' },
    ],
    confirmText: 'ยืนยันและส่งคำขอ',
    cancelText: 'ยกเลิก',
  };

  return {
    replyText: `${sideResponse}\nรวบรวมคำขอเรียบร้อยครับ พิมพ์ **"ยืนยัน"** เพื่อส่งคำขอให้อาจารย์และเจ้าหน้าที่พิจารณาอนุมัติครับ:`,
    sessionState: state,
    confirmationSummary,
    quickReplies: [
      { label: '✅ ยืนยันส่งคำขอ', textToSend: 'ยืนยัน' },
      { label: '❌ ยกเลิก', textToSend: 'ยกเลิก' },
    ],
  };
}

// ==========================================
// 4. FLOW: บันทึกเปิด-ปิดแอร์ (LOG_AC)
// ==========================================
async function handleAcLogFlow(
  text: string,
  state: ChatSessionState,
  currentUser: any
): Promise<ChatbotTurnResponse> {
  const draft: AcLogDraft = state.acDraft || {};
  let sideResponse = '';

  const activeRooms = await prisma.practiceRoom.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });

  const roomIdent = extractRoomIdentifier(text);
  if (roomIdent) {
    const matched = activeRooms.find(
      (r) => r.code.toLowerCase() === roomIdent.toLowerCase() || r.name.includes(roomIdent)
    );
    if (matched) {
      draft.roomId = matched.id;
      draft.roomCode = matched.code;
      draft.roomName = matched.name;
    }
  }

  const parsedDates = extractThaiDates(text);
  if (parsedDates.length > 0) {
    draft.dateStr = parsedDates[0].dateStr;
  } else if (!draft.dateStr) {
    const bkk = getBangkokParts(new Date());
    draft.dateStr = `${bkk.year}-${String(bkk.month).padStart(2, '0')}-${String(bkk.day).padStart(2, '0')}`;
  }

  const timeRange = extractThaiTimeRange(text);
  if (timeRange) {
    draft.openTime = timeRange.startTime;
    draft.closeTime = timeRange.endTime;
    draft.usageHours = calculateUsageHours(draft.openTime, draft.closeTime);
  }

  const temp = extractTemperature(text);
  if (temp) {
    draft.temperature = temp;
  } else if (!draft.temperature) {
    draft.temperature = 24;
  }

  if (text.includes('osce') || text.includes('สอบ')) {
    draft.purpose = 'เตรียมสอบ OSCE / การประเมินผล';
  } else if (text.includes('เรียน') || text.includes('สอน')) {
    draft.purpose = 'การเรียนการสอนภาคปฏิบัติ';
  } else if (!draft.purpose) {
    draft.purpose = 'การเรียนการสอนและฝึกปฏิบัติการ';
  }

  state.acDraft = draft;

  if (!draft.roomId) {
    return {
      replyText: 'ต้องการบันทึกการเปิดแอร์สำหรับ**ห้องใด**ครับ? (เช่น ห้อง 401 หรือ LAB-01)',
      sessionState: state,
      quickReplies: activeRooms.slice(0, 4).map((r) => ({ label: r.code, textToSend: `ห้อง ${r.code}` })),
    };
  }

  if (!draft.openTime || !draft.closeTime) {
    return {
      replyText: `บันทึกแอร์ห้อง ${draft.roomCode} วันที่ ${draft.dateStr}\nเปิดใช้งานช่วง**เวลาใด**ครับ? (เช่น 08:30 ถึง 16:30 น.)`,
      sessionState: state,
      quickReplies: [
        { label: '08:30 - 16:30 (8 ชม.)', textToSend: '08:30 ถึง 16:30' },
        { label: '08:30 - 12:00 (3.5 ชม.)', textToSend: '08:30 ถึง 12:00' },
        { label: '13:00 - 16:30 (3.5 ชม.)', textToSend: '13:00 ถึง 16:30' },
      ],
    };
  }

  state.stage = 'AWAITING_CONFIRM';
  const confirmationSummary: ConfirmationSummaryCard = {
    title: 'สรุปการบันทึกเปิด-ปิดเครื่องปรับอากาศ',
    intent: 'LOG_AC',
    details: [
      { label: 'ห้องปฏิบัติการ', value: `${draft.roomCode} (${draft.roomName})`, highlight: true },
      { label: 'วันที่', value: draft.dateStr },
      { label: 'ช่วงเวลา', value: `${draft.openTime} - ${draft.closeTime} น. (รวม ${draft.usageHours} ชม.)` },
      { label: 'อุณหภูมิ', value: `${draft.temperature} °C` },
      { label: 'วัตถุประสงค์', value: draft.purpose },
    ],
    confirmText: 'บันทึกข้อมูล',
    cancelText: 'ยกเลิก',
  };

  return {
    replyText: 'ตรวจสอบข้อมูลการเปิดแอร์ด้านล่าง พิมพ์ **"ยืนยัน"** เพื่อบันทึกลงสมุดบันทึกพลังงานครับ:',
    sessionState: state,
    confirmationSummary,
    quickReplies: [
      { label: '✅ ยืนยันบันทึก', textToSend: 'ยืนยัน' },
      { label: '❌ ยกเลิก', textToSend: 'ยกเลิก' },
    ],
  };
}

// ==========================================
// 5. FLOW: อนุมัติคำขอ (APPROVE_REQUESTS)
// ==========================================
async function handleApprovalFlow(
  text: string,
  state: ChatSessionState,
  currentUser: any
): Promise<ChatbotTurnResponse> {
  const userRole = (currentUser?.role || 'USER').toUpperCase();
  const lower = text.toLowerCase();

  // ดึงคำขอที่รออนุมัติ
  const whereScope: any = { status: 'PENDING' };
  if (userRole === 'APPROVER' || userRole === 'TEACHER') {
    whereScope.OR = [
      { advisorName: { contains: currentUser.name || '' } },
      { course: { instructorName: { contains: currentUser.name || '' } } },
    ];
  }

  const [borrows, requisitions, rooms, practices] = await Promise.all([
    prisma.borrowRequest.findMany({
      where: whereScope,
      include: { user: true, course: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.requisitionRequest.findMany({
      where: whereScope,
      include: { user: true, course: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.roomBooking.findMany({
      where: { status: 'PENDING' },
      include: { user: true, room: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.practiceBooking.findMany({
      where: { status: 'PENDING' },
      include: { user: true, slot: { include: { room: true } } },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const allPending: PendingApprovalItemRef[] = [];
  let idx = 1;

  for (const b of borrows) {
    allPending.push({
      index: idx++,
      id: b.id,
      code: b.requestNumber,
      entityType: 'BORROW',
      requesterName: b.user.name,
      summary: `ขอยืมครุภัณฑ์ [${b.requestNumber}] โดย ${b.user.name} (${b.course?.code || 'ทั่วไป'})`,
    });
  }
  for (const r of requisitions) {
    allPending.push({
      index: idx++,
      id: r.id,
      code: r.requestNumber,
      entityType: 'REQUISITION',
      requesterName: r.user.name,
      summary: `ขอเบิกวัสดุ [${r.requestNumber}] โดย ${r.user.name} (${r.course?.code || 'ทั่วไป'})`,
    });
  }
  for (const rm of rooms) {
    allPending.push({
      index: idx++,
      id: rm.id,
      code: rm.bookingNumber,
      entityType: 'ROOM',
      requesterName: rm.user.name,
      summary: `ขอจองห้อง ${rm.room.code} [${rm.bookingNumber}] โดย ${rm.user.name} (${rm.title})`,
    });
  }
  for (const pb of practices) {
    allPending.push({
      index: idx++,
      id: pb.id,
      code: pb.bookingNumber,
      entityType: 'PRACTICE',
      requesterName: pb.user.name,
      summary: `ลงชื่อรอบฝึก [${pb.bookingNumber}] โดย ${pb.user.name} (${pb.skillTopic})`,
    });
  }

  state.pendingApprovalRefs = allPending;

  // ตรวจคำสั่งอนุมัติ
  if (lower.includes('อนุมัติทั้งหมด')) {
    for (const item of allPending) {
      await quickApproveItem(item, currentUser);
    }
    return {
      replyText: `✅ ดำเนินการอนุมัติคำขอทั้งหมดจำนวน ${allPending.length} รายการเรียบร้อยแล้วครับ ระบบได้ส่งการแจ้งเตือนไปยังนิสิตผู้ขอเรียบร้อยแล้วครับ`,
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
      quickReplies: getRoleQuickReplies(userRole),
    };
  }

  const numMatch = /(?:อนุมัติ|ข้อ)\s*(\d{1,2})/.exec(text);
  if (numMatch) {
    const targetIdx = parseInt(numMatch[1], 10);
    const targetItem = allPending.find((p) => p.index === targetIdx);
    if (targetItem) {
      await quickApproveItem(targetItem, currentUser);
      return {
        replyText: `✅ ดำเนินการอนุมัติ ${targetItem.summary} เรียบร้อยแล้วครับ!`,
        sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
        quickReplies: getRoleQuickReplies(userRole),
      };
    }
  }

  if (allPending.length === 0) {
    return {
      replyText: 'ขณะนี้ไม่มีรายการคำขอรอการอนุมัติที่เกี่ยวข้องกับท่านครับ 👍',
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
      quickReplies: getRoleQuickReplies(userRole),
    };
  }

  const listStr = allPending.map((p) => `**#${p.index}.** ${p.summary}`).join('\n');
  return {
    replyText: `📋 ตรวจพบรายการรออนุมัติจำนวน ${allPending.length} รายการครับ:\n\n${listStr}\n\nท่านสามารถพิมพ์ **"อนุมัติทั้งหมด"** หรือระบุ เช่น **"อนุมัติข้อ 1"** ได้เลยครับ`,
    sessionState: state,
    quickReplies: [
      { label: '✅ อนุมัติทั้งหมด', textToSend: 'อนุมัติทั้งหมด' },
      ...allPending.slice(0, 3).map((p) => ({ label: `อนุมัติข้อ ${p.index}`, textToSend: `อนุมัติข้อ ${p.index}` })),
    ],
  };
}

async function quickApproveItem(item: PendingApprovalItemRef, approver: any) {
  const now = new Date();
  if (item.entityType === 'BORROW') {
    await prisma.borrowRequest.update({
      where: { id: item.id },
      data: { status: 'APPROVED', approverId: approver.id, approvedAt: now },
    });
  } else if (item.entityType === 'REQUISITION') {
    await prisma.requisitionRequest.update({
      where: { id: item.id },
      data: { status: 'APPROVED', approverId: approver.id, approvedAt: now },
    });
  } else if (item.entityType === 'ROOM') {
    await prisma.roomBooking.update({
      where: { id: item.id },
      data: { status: 'APPROVED', approverId: approver.id, approvedAt: now },
    });
  } else if (item.entityType === 'PRACTICE') {
    await prisma.practiceBooking.update({
      where: { id: item.id },
      data: { status: 'APPROVED', approverId: approver.id, approvedAt: now },
    });
  }
}

// ==========================================
// 6. FLOW: แจ้งซ่อม (REPORT_ISSUE)
// ==========================================
async function handleIssueReportFlow(
  text: string,
  state: ChatSessionState,
  currentUser: any
): Promise<ChatbotTurnResponse> {
  const draft: IssueReportDraft = state.issueDraft || {};

  const assets = await prisma.equipmentAsset.findMany({
    include: { item: true },
    take: 10,
  });

  for (const a of assets) {
    if (text.includes(a.assetCode) || text.includes(a.item.name)) {
      draft.assetId = a.id;
      draft.assetCode = a.assetCode;
      draft.assetName = a.item.name;
      break;
    }
  }

  if (text.includes('ด่วนมาก') || text.includes('วิกฤต')) {
    draft.urgency = 'CRITICAL';
  } else if (text.includes('ด่วน')) {
    draft.urgency = 'URGENT';
  } else if (!draft.urgency) {
    draft.urgency = 'NORMAL';
  }

  if (text.length > 10 && !draft.issueDescription) {
    draft.issueDescription = text;
  }

  state.issueDraft = draft;

  if (!draft.assetId) {
    return {
      replyText: 'พบปัญหาขัดข้องกับครุภัณฑ์หรือเครื่องมือชิ้นไหนครับ? (ระบุชื่ออุปกรณ์หรือรหัสทรัพย์สิน เช่น หุ่น CPR หรือ เครื่องวัดความดัน)',
      sessionState: state,
      quickReplies: [
        { label: 'หุ่นจำลอง CPR', textToSend: 'หุ่นจำลอง CPR แขนขวาหลวม' },
        { label: 'เครื่องวัดความดัน', textToSend: 'เครื่องวัดความดัน หน้าจอไม่ติด' },
      ],
    };
  }

  if (!draft.issueDescription) {
    return {
      replyText: `พบปัญหาอาการอย่างไรเกี่ยวกับ **${draft.assetName} (${draft.assetCode})** ครับ?`,
      sessionState: state,
    };
  }

  state.stage = 'AWAITING_CONFIRM';
  const confirmationSummary: ConfirmationSummaryCard = {
    title: 'สรุปการแจ้งเหตุขัดข้อง / แจ้งซ่อมครุภัณฑ์',
    intent: 'REPORT_ISSUE',
    details: [
      { label: 'อุปกรณ์', value: `${draft.assetName} (${draft.assetCode})`, highlight: true },
      { label: 'อาการชำรุด', value: draft.issueDescription },
      { label: 'ระดับความเร่งด่วน', value: draft.urgency === 'CRITICAL' ? 'วิกฤต' : draft.urgency === 'URGENT' ? 'ด่วน' : 'ปกติ' },
    ],
    confirmText: 'ยืนยันแจ้งซ่อม',
    cancelText: 'ยกเลิก',
  };

  return {
    replyText: 'สรุปข้อมูลการแจ้งซ่อมเรียบร้อยครับ พิมพ์ **"ยืนยัน"** เพื่อส่งเรื่องให้เจ้าหน้าที่เข้าดำเนินการครับ:',
    sessionState: state,
    confirmationSummary,
    quickReplies: [
      { label: '✅ ยืนยันแจ้งซ่อม', textToSend: 'ยืนยัน' },
      { label: '❌ ยกเลิก', textToSend: 'ยกเลิก' },
    ],
  };
}

// ==========================================
// 7. Q&A: ตรวจสอบสต็อก
// ==========================================
async function handleQueryStock(text: string, currentUser: any): Promise<ChatbotTurnResponse> {
  const items = await prisma.item.findMany({
    where: {
      OR: [
        { name: { contains: text.replace(/(?:เหลือเท่าไหร่|สต็อก|มีของไหม|อยู่ตู้ไหน|คงเหลือ)/g, '').trim() } },
      ],
    },
    include: {
      storageLocation: true,
      assets: { where: { status: 'AVAILABLE' } },
      stockLots: true,
    },
    take: 5,
  });

  if (items.length === 0) {
    const popularItems = await prisma.item.findMany({ take: 3, select: { name: true } });
    return {
      replyText: `ไม่พบข้อมูลพัสดุที่ค้นหาครับ ลองพิมพ์ค้นหา เช่น "${popularItems.map((p) => p.name).join('", "')}" ดูนะครับ`,
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
    };
  }

  const listStr = items
    .map((it) => {
      const loc = it.storageLocation ? `(ที่เก็บ: ${it.storageLocation.name} [${it.storageLocation.code}])` : '';
      if (it.type === 'EQUIPMENT') {
        return `• **${it.name}** [ครุภัณฑ์]: ว่างพร้อมยืม **${it.assets.length}** ${it.unit || 'ชิ้น'} ${loc}`;
      } else {
        const totalStock = (it.stockLots || []).reduce((sum, l) => sum + (l.quantityRemaining || 0), 0);
        const openRemainder = (it.stockLots || []).reduce((sum, l) => sum + (l.openPackRemainder || 0), 0);
        const remainder = openRemainder > 0 ? ` (+เศษเปิดใช้ ${openRemainder} ${it.usageUnit || 'ชิ้น'})` : '';
        return `• **${it.name}** [วัสดุเบิก]: คงเหลือ **${totalStock}** ${it.unit || 'กล่อง'}${remainder} ${loc}`;
      }
    })
    .join('\n');

  return {
    replyText: `📦 ข้อมูลสต็อกคงเหลือในระบบครับ:\n\n${listStr}`,
    sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
    quickReplies: [
      { label: '🛒 ขอเบิก-ยืมพัสดุ', textToSend: 'ขอเบิกของ' },
      { label: '🏢 จองห้องแล็บ', textToSend: 'จองห้องแล็บ' },
    ],
  };
}

// ==========================================
// 8. Q&A: สถานะส่วนบุคคล (MY_STATUS)
// ==========================================
async function handleMyStatus(text: string, currentUser: any): Promise<ChatbotTurnResponse> {
  const userId = currentUser.id;
  const [activeBorrows, pendingBookings] = await Promise.all([
    prisma.borrowRequest.findMany({
      where: { userId, status: { in: ['APPROVED', 'DISPENSED', 'PENDING'] } },
      include: { items: { include: { item: true } } },
      take: 3,
    }),
    prisma.roomBooking.findMany({
      where: { userId, status: { in: ['APPROVED', 'PENDING'] } },
      include: { room: true },
      take: 3,
    }),
  ]);

  let statusMsg = `👤 **สถานะรายการของท่าน (${currentUser.name})**:\n\n`;

  if (activeBorrows.length === 0 && pendingBookings.length === 0) {
    statusMsg += 'ขณะนี้ท่านไม่มีรายการยืมของค้าง หรือคำขอที่รอดำเนินการครับ 👍';
  } else {
    if (activeBorrows.length > 0) {
      statusMsg += '📦 **รายการยืมพัสดุ:**\n';
      activeBorrows.forEach((b) => {
        const items = b.items.map((it) => it.item.name).join(', ');
        statusMsg += `• [${b.requestNumber}] ${items} — สถานะ: ${b.status} (กำหนดคืน: ${b.expectedReturnDate ? new Date(b.expectedReturnDate).toLocaleDateString('th-TH') : '-'})\n`;
      });
      statusMsg += '\n';
    }
    if (pendingBookings.length > 0) {
      statusMsg += '🏢 **รายการจองห้องแล็บ:**\n';
      pendingBookings.forEach((rm) => {
        statusMsg += `• ห้อง ${rm.room.code} วันที่ ${new Date(rm.bookingDate).toLocaleDateString('th-TH')} (${rm.startTime}-${rm.endTime} น.) — สถานะ: ${rm.status}\n`;
      });
    }
  }

  return {
    replyText: statusMsg,
    sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
  };
}

// ==========================================
// 9. Q&A: ของค้างส่งคืน (QUERY_OVERDUE)
// ==========================================
async function handleQueryOverdue(text: string, currentUser: any): Promise<ChatbotTurnResponse> {
  const overdueBorrows = await prisma.borrowRequest.findMany({
    where: {
      status: 'DISPENSED',
      expectedReturnDate: { lt: new Date() },
    },
    include: {
      user: true,
      items: { include: { item: true } },
    },
    take: 5,
  });

  if (overdueBorrows.length === 0) {
    return {
      replyText: 'ยอดเยี่ยมครับ! ขณะนี้ไม่มีรายการพัสดุที่เกินกำหนดส่งคืนเลยครับ 🎉',
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
    };
  }

  let overdueMsg = `⚠️ ตรวจพบพัสดุเกินกำหนดส่งคืนจำนวน ${overdueBorrows.length} รายการครับ:\n\n`;
  overdueBorrows.forEach((b, i) => {
    const items = b.items.map((it) => it.item.name).join(', ');
    const retDate = new Date(b.expectedReturnDate!).toLocaleDateString('th-TH');
    overdueMsg += `${i + 1}. **${items}** — ยืมโดย: นิสิต${b.user.name} (โทร: ${b.user.phone || '-'}) ครบกำหนดเมื่อ ${retDate}\n`;
  });

  return {
    replyText: overdueMsg,
    sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
  };
}

// ==========================================
// 10. Q&A: งบประมาณรายวิชา (QUERY_BUDGET)
// ==========================================
async function handleQueryBudget(text: string, currentUser: any): Promise<ChatbotTurnResponse> {
  const courseCodeInput = extractCourseIdentifier(text) || '222';
  const course = await prisma.course.findFirst({
    where: { code: { contains: courseCodeInput } },
    include: {
      requisitionRequests: {
        where: { status: 'DISPENSED' },
        include: { items: { include: { item: true } } },
      },
    },
  });

  if (!course) {
    return {
      replyText: 'ไม่พบข้อมูลรายวิชาที่ระบุครับ กรุณาระบุรหัสวิชา เช่น "วิชา 222"',
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
    };
  }

  let totalSpent = 0;
  course.requisitionRequests.forEach((req) => {
    totalSpent += req.totalCost || 0;
  });

  const allocated = course.allocatedBudget || 0;
  const balance = Math.max(0, allocated - totalSpent);

  return {
    replyText: `📊 **สรุปงบประมาณรายวิชา [${course.code}] ${course.name}**:\n• อาจารย์ผู้ประสานงาน: ${course.instructorName}\n• งบประมาณที่ได้รับจัดสรร: **${allocated.toLocaleString()} บาท**\n• ยอดเบิกจ่ายจริงสะสม: **${totalSpent.toLocaleString()} บาท**\n• งบประมาณคงเหลือ: **${balance.toLocaleString()} บาท**`,
    sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
  };
}

// ==========================================
// 11. FAQ & กฎระเบียบ
// ==========================================
function handleFaqRules(text: string): ChatbotTurnResponse {
  let answer = '📖 **ระเบียบปฏิบัติประจำห้องปฏิบัติการพยาบาล**:\n';
  if (text.includes('เขียนหุ่น') || text.includes('ปากกา')) {
    answer += '❌ **ข้อห้ามสำคัญ:** ห้ามใช้ปากกาหมึกซึมหรือปากกาลูกลื่นเขียนลงบนผิวหนังหุ่นจำลองโดยเด็ดขาด เนื่องจากหมึกจะซึมเข้าเนื้อยางซิลิโคนและลบไม่ออกครับ ให้ใช้เฉพาะดินสอหรือสีที่ทางแล็บจัดเตรียมไว้ให้เท่านั้นครับ';
  } else if (text.includes('กี่โมง') || text.includes('เวลา')) {
    answer += '⏰ **เวลาให้บริการห้องปฏิบัติการ:**\n• วันจันทร์ - ศุกร์: 08:30 - 16:30 น.\n• การส่งคืนพัสดุ: กรุณานำมาส่งคืนก่อนเวลา 16:30 น. ของวันที่ครบกำหนดครับ';
  } else {
    answer += '1. แต่งกายชุดฝึกปฏิบัติการพยาบาลถูกระเบียบทุกครั้งที่เข้าแล็บ\n2. ห้ามนำอาหารและเครื่องดื่มเข้าในห้องแล็บ\n3. ห้ามใช้ปากกาเขียนผิวหุ่นจำลอง\n4. ทำความสะอาดอุปกรณ์และจัดโต๊ะเตียงให้อยู่ในสภาพเรียบร้อยทุกครั้งหลังใช้งานครับ';
  }

  return {
    replyText: answer,
    sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
    quickReplies: [
      { label: '🏢 จองห้องแล็บ', textToSend: 'จองห้องแล็บ' },
      { label: '🛒 ขอเบิก-ยืมพัสดุ', textToSend: 'ขอเบิกของ' },
    ],
  };
}

async function handleKnowledgeAndGeneralInquiry(
  text: string,
  state: ChatSessionState,
  currentUser: any
): Promise<ChatbotTurnResponse> {
  const userRole = (currentUser?.role || 'USER').toUpperCase();
  const lower = text.toLowerCase().trim();

  // 1. ดึง Master Data จาก Prisma เพื่อเสริมความแม่นยำให้กับคำตอบ
  const [activeRooms, activeCourses, activeKits] = await Promise.all([
    prisma.practiceRoom.findMany({
      where: { isActive: true },
      select: { code: true, name: true, capacity: true, location: true },
      orderBy: { code: 'asc' },
    }),
    prisma.course.findMany({
      where: { status: 'ACTIVE' },
      select: { code: true, name: true, instructorName: true },
      take: 8,
      orderBy: { code: 'asc' },
    }),
    prisma.practiceKit.findMany({
      where: { isActive: true },
      include: { items: { include: { item: true } } },
      orderBy: { code: 'asc' },
    }),
  ]);

  // 2. ตอบเฉพาะเจาะจง: ถามรายชื่อห้องแล็บ
  if (lower.includes('มีห้องอะไรบ้าง') || lower.includes('มีห้องแล็บอะไรบ้าง') || lower.includes('มีกี่ห้อง') || lower.includes('ห้องแล็บมีกี่ห้อง') || lower.includes('รายชื่อห้อง')) {
    const roomList = activeRooms
      .map((r) => `• **${r.code} (${r.name})**\n  - รองรับได้: ${r.capacity} คน\n  - ที่ตั้ง: ${r.location || 'ชั้น 4 อาคารวิทยบริการ'}`)
      .join('\n');
    return {
      replyText: `🏢 **ห้องปฏิบัติการพยาบาลที่เปิดให้บริการในระบบ (รวม ${activeRooms.length} ห้อง):**\n\n${roomList}\n\nนิสิตและคณาจารย์สามารถพิมพ์ *"จองห้อง [รหัสห้อง]"* เพื่อเริ่มจองห้องได้ทันทีครับ`,
      sessionState: state,
      quickReplies: activeRooms.slice(0, 4).map((r) => ({ label: `จอง ${r.code}`, textToSend: `ขอจองห้อง ${r.code}` })),
    };
  }

  // 3. ตอบเฉพาะเจาะจง: ถามชุดฝึก Kits
  if (lower.includes('มีชุดฝึกอะไรบ้าง') || lower.includes('ชุดฝึกมีอะไรบ้าง') || lower.includes('kits มีอะไรบ้าง') || lower.includes('มีชุดอะไรบ้าง')) {
    const kitList = activeKits
      .map((k) => {
        const itemNames = k.items.map((it) => it.item.name).join(', ') || 'อุปกรณ์มาตรฐาน';
        return `• 🩺 **${k.name}** [${k.code}]:\n  - ภายในชุดประกอบด้วย: ${itemNames}`;
      })
      .join('\n');
    return {
      replyText: `🩺 **ชุดฝึกปฏิบัติการมาตรฐาน (Nursing Practice Kits) ในระบบ:**\n\n${kitList}\n\nต้องการขอใช้ชุดฝึกชุดไหน สามารถพิมพ์แจ้งได้เลยครับ`,
      sessionState: state,
      quickReplies: activeKits.slice(0, 3).map((k) => ({ label: k.name, textToSend: `ขอเบิก ${k.name}` })),
    };
  }

  // 4. ส่งให้ Gemini 2.0 Flash (มี Fallback เป็น Local Knowledge Base อัตโนมัติ)
  const geminiResponse = await askGeminiLabBrain(text, currentUser, {
    activeRooms,
    activeCourses,
    activeKits,
  });

  if (geminiResponse.success && geminiResponse.replyText) {
    const replies = getRoleQuickReplies(userRole);
    // หากมีดราฟต์จองห้องหรือเบิกของค้างอยู่ ให้เพิ่มปุ่มทำรายการต่อ
    if (state.roomDraft?.roomId || state.requestDraft?.borrowItems.length) {
      replies.unshift({ label: '↩️ ทำรายการเดิมต่อ', textToSend: 'จองห้องต่อ' });
    }

    return {
      replyText: geminiResponse.replyText,
      sessionState: state,
      quickReplies: replies,
    };
  }

  // 5. Fallback สุดท้าย
  return handleGeneralInquiry(text, userRole);
}

function handleGeneralInquiry(text: string, userRole: string): ChatbotTurnResponse {
  // 1. เช็กวัน เวลา ปฏิทิน
  const dt = answerDateTimeAndGeneralQuery(text, userRole);
  if (dt) {
    return {
      replyText: dt.text,
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
      quickReplies: dt.quickReplies || getRoleQuickReplies(userRole),
    };
  }

  // 2. เช็กคลังความรู้
  const kb = searchKnowledgeBase(text, userRole);
  if (kb) {
    return {
      replyText: kb.answer(userRole),
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
      quickReplies: kb.quickReplies || getRoleQuickReplies(userRole),
    };
  }

  return {
    replyText: 'สวัสดีครับ! ผมคือ **KUNurse+ Lab AI Copilot** ผู้ช่วยอัจฉริยะประจำห้องปฏิบัติการพยาบาลครับ 😊\n\nท่านสามารถสั่งงานหรือพิมพ์คุยสอบถามได้ทันที เช่น:\n• *"ทำอะไรได้บ้าง"* หรือ *"แล็บอยู่ที่ไหน"*\n• *"ตอนนี้กี่โมง"* หรือ *"วันนี้วันที่เท่าไหร่"*\n• *"จองห้องแลป"* หรือ *"จองห้อง 402 วันพุธหน้า 9 โมงถึงเที่ยง"*\n• *"ขอเบิกถุงมือ 2 กล่อง กับยืมเครื่องวัดความดัน"*\n• *"มีวิชาอะไรบ้าง"* หรือ *"เช็กสต็อกเข็มเบอร์ 24"*\n• *"ตรวจสอบคำขอค้างของฉัน"*',
    sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
    quickReplies: getRoleQuickReplies(userRole),
  };
}

// ==========================================
// 12. การบันทึกข้อมูลจริง (Execution)
// ==========================================
async function executeConfirmedAction(
  state: ChatSessionState,
  currentUser: any
): Promise<ChatbotTurnResponse> {
  const intent = state.activeIntent;

  try {
    if (intent === 'BOOK_ROOM' && state.roomDraft) {
      const draft = state.roomDraft;
      const bDate = draft.dates && draft.dates.length > 0 ? draft.dates[0] : new Date().toISOString().slice(0, 10);
      const [y, m, d] = bDate.split('-').map(Number);
      const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

      const count = await prisma.roomBooking.count();
      const bookingNumber = `RB-${bDate.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;

      const booking = await prisma.roomBooking.create({
        data: {
          bookingNumber,
          roomId: draft.roomId!,
          userId: currentUser.id,
          bookingDate: targetDate,
          startTime: draft.startTime!,
          endTime: draft.endTime!,
          title: draft.title || 'ขอใช้ห้องปฏิบัติการ',
          purpose: draft.purpose || 'ฝึกทักษะการพยาบาล',
          attendeesCount: draft.attendeesCount || 1,
          courseId: draft.courseId || null,
          advisorName: draft.advisorName || null,
          status: 'PENDING',
        },
      });

      invalidateCache('room-bookings:');
      createNotification({
        userId: currentUser.id,
        title: 'ยื่นคำขอจองห้องสำเร็จ 🎉',
        message: `คำขอจองห้อง ${draft.roomCode} วันที่ ${bDate} (${bookingNumber}) รอการอนุมัติ`,
        type: 'STATUS_UPDATE',
        linkUrl: '/rooms/my-bookings',
      }).catch(() => {});

      return {
        replyText: `🎉 **บันทึกคำขอจองห้องแล็บสำเร็จเรียบร้อยครับ!**\n• รหัสคำขอ: **${bookingNumber}**\n• ห้อง: ${draft.roomCode} (${draft.roomName})\n• วันที่: ${bDate} เวลา ${draft.startTime} - ${draft.endTime} น.\n\nระบบได้ส่งคำขอไปยังอาจารย์ผู้รับผิดชอบและเจ้าหน้าที่ห้องแล็บเพื่อพิจารณาอนุมัติแล้วครับ`,
        sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
        executionResult: {
          success: true,
          referenceCode: bookingNumber,
          viewUrl: '/rooms/my-bookings',
        },
        quickReplies: getRoleQuickReplies(currentUser.role),
      };
    }

    if (intent === 'LOG_AC' && state.acDraft) {
      const draft = state.acDraft;
      const dateTarget = draft.dateStr ? new Date(`${draft.dateStr}T00:00:00.000Z`) : new Date();

      await prisma.acOperationLog.upsert({
        where: {
          roomId_date: {
            roomId: draft.roomId!,
            date: dateTarget,
          },
        },
        create: {
          roomId: draft.roomId!,
          date: dateTarget,
          openTime: draft.openTime!,
          closeTime: draft.closeTime!,
          temperature: draft.temperature || 24,
          purpose: draft.purpose || 'การเรียนการสอน',
          recordedById: currentUser.id,
        },
        update: {
          openTime: draft.openTime!,
          closeTime: draft.closeTime!,
          temperature: draft.temperature || 24,
          purpose: draft.purpose || 'การเรียนการสอน',
          recordedById: currentUser.id,
        },
      });

      return {
        replyText: `❄️ **บันทึกการเปิด-ปิดแอร์ห้อง ${draft.roomCode} สำเร็จเรียบร้อยครับ!**\n• วันที่: ${draft.dateStr}\n• เวลา: ${draft.openTime} - ${draft.closeTime} น. (${draft.usageHours} ชม.)\n• อุณหภูมิ: ${draft.temperature} °C`,
        sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
        executionResult: { success: true },
        quickReplies: getRoleQuickReplies(currentUser.role),
      };
    }

    if (intent === 'BORROW_REQUISITION' && state.requestDraft) {
      const draft = state.requestDraft;
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const count = await prisma.borrowRequest.count();
      const reqNum = `REQ-${datePart}-${String(count + 1).padStart(3, '0')}`;

      // บันทึกคำขอยืมครุภัณฑ์ (หากมี)
      if (draft.borrowItems.length > 0) {
        await prisma.borrowRequest.create({
          data: {
            requestNumber: reqNum,
            userId: currentUser.id,
            courseId: draft.courseId || null,
            advisorName: draft.advisorName || null,
            purpose: draft.purpose || 'ฝึกปฏิบัติการพยาบาล',
            borrowDate: new Date(),
            expectedReturnDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            status: 'PENDING',
            items: {
              create: draft.borrowItems.map((b) => ({
                itemId: b.itemId,
                quantity: b.quantity,
              })),
            },
          },
        });
      }

      return {
        replyText: `🛒 **ส่งคำขอเรียบร้อยแล้วครับ!**\n• รหัสคำขอ: **${reqNum}**\n• รายวิชา: [${draft.courseCode}] ${draft.courseName}\n• อาจารย์ผู้รับทราบ: ${draft.advisorName}\n\nเมื่ออาจารย์และเจ้าหน้าที่อนุมัติแล้ว ระบบจะส่งการแจ้งเตือนเพื่อให้นิสิตมารับของที่ห้องเตรียมการครับ`,
        sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
        executionResult: { success: true, referenceCode: reqNum },
        quickReplies: getRoleQuickReplies(currentUser.role),
      };
    }

    return {
      replyText: 'บันทึกรายการเรียบร้อยแล้วครับ ต้องการให้ผมช่วยเหลือเรื่องอื่นเพิ่มเติม พิมพ์บอกได้เลยครับ',
      sessionState: { activeIntent: 'IDLE', stage: 'IDLE', lastUpdated: Date.now() },
      quickReplies: getRoleQuickReplies(currentUser.role),
    };
  } catch (error: any) {
    console.error('Error executing chatbot action:', error);
    return {
      replyText: `ขออภัยครับ เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message || 'โปรดลองใหม่อีกครั้ง'}`,
      sessionState: state,
    };
  }
}

function getRoleQuickReplies(userRole: string): QuickReplyOption[] {
  const role = (userRole || 'USER').toUpperCase();
  if (role === 'OFFICER' || role === 'ADMIN') {
    return [
      { label: '❄️ บันทึกเปิด-ปิดแอร์', textToSend: 'บันทึกเปิดแอร์' },
      { label: '📋 ตรวจสอบคำขอรออนุมัติ', textToSend: 'มีรายการรออนุมัติไหม' },
      { label: '⚠️ เช็กคนค้างคืนพัสดุ', textToSend: 'ใครยังไม่คืนของบ้าง' },
      { label: '📦 ค้นหาสต็อกพัสดุ', textToSend: 'เช็กสต็อก' },
    ];
  }
  if (role === 'APPROVER' || role === 'TEACHER') {
    return [
      { label: '📋 คำขอที่รอฉันอนุมัติ', textToSend: 'มีคำขอรออนุมัติไหม' },
      { label: '📊 งบประมาณรายวิชา', textToSend: 'วิชา 222 เหลืองบเท่าไหร่' },
      { label: '🏢 จองห้องแล็บการสอน', textToSend: 'จองห้องแล็บ' },
    ];
  }
  // นิสิต
  return [
    { label: '🏢 จองห้องแล็บ', textToSend: 'จองห้องแล็บ' },
    { label: '🛒 ขอเบิก-ยืมพัสดุ', textToSend: 'ขอเบิกของ' },
    { label: '🩺 ลงชื่อรอบฝึกทักษะ', textToSend: 'รอบฝึกทักษะ' },
    { label: '🔍 เช็กสถานะคำขอของฉัน', textToSend: 'สถานะคำขอของฉัน' },
  ];
}
