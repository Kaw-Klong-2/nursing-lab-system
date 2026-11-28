export type ChatIntent =
  | 'IDLE'
  | 'CAPABILITIES'
  | 'SYSTEM_INFO'
  | 'ROOMS_DIRECTORY'
  | 'KITS_DIRECTORY'
  | 'BOOK_ROOM'
  | 'BOOK_PRACTICE'
  | 'BORROW_REQUISITION'
  | 'LOG_AC'
  | 'APPROVE_REQUESTS'
  | 'REPORT_ISSUE'
  | 'QUERY_STOCK'
  | 'MY_STATUS'
  | 'QUERY_OVERDUE'
  | 'QUERY_BUDGET'
  | 'FAQ_RULES';

export type DialogueStage =
  | 'IDLE'
  | 'COLLECTING_SLOTS'
  | 'AWAITING_CONFIRM';

export interface RoomBookingDraft {
  roomId?: string;
  roomCode?: string;
  roomName?: string;
  dates?: string[]; // YYYY-MM-DD[]
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  title?: string;
  purpose?: string;
  attendeesCount?: number;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  advisorName?: string;
  contactPhone?: string;
  equipmentNeeded?: string;
}

export interface PracticeBookingDraft {
  slotId?: string;
  slotLabel?: string;
  skillTopic?: string;
  practiceKitId?: string;
  practiceKitName?: string;
  companionCount?: number;
  companionUserIds?: string[];
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  advisorName?: string;
  objectives?: string;
}

export interface UnifiedRequestDraft {
  borrowItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
    available: number;
  }>;
  requisitionItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
    isSubUnit?: boolean;
    available: number;
  }>;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  advisorName?: string;
  useTarget?: 'SIMULATION' | 'HUMAN';
  purpose?: string;
  borrowDate?: string;
  expectedReturnDate?: string;
}

export interface AcLogDraft {
  roomId?: string;
  roomCode?: string;
  roomName?: string;
  dateStr?: string; // YYYY-MM-DD
  openTime?: string; // HH:mm
  closeTime?: string; // HH:mm
  usageHours?: number;
  temperature?: number;
  purpose?: string;
  note?: string;
}

export interface IssueReportDraft {
  assetId?: string;
  assetCode?: string;
  assetName?: string;
  issueDescription?: string;
  urgency?: 'NORMAL' | 'URGENT' | 'CRITICAL';
}

export interface PendingApprovalItemRef {
  index: number;
  id: string;
  code: string;
  entityType: 'BORROW' | 'REQUISITION' | 'ROOM' | 'PRACTICE';
  requesterName: string;
  summary: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

export interface SuggestedLink {
  label: string;
  href: string;
}

export type AiModelMode = 'fast' | 'deep';

export type AdminActionType =
  | 'BATCH_LOG_AC'
  | 'MANAGE_HOLIDAY'
  | 'REVIEW_APPROVALS'
  | 'SEND_OVERDUE_REMINDERS'
  | 'CREATE_ROOM_BOOKING'
  | 'TOGGLE_PRACTICE_SLOT'
  | 'SEND_BROADCAST'
  | 'UPDATE_ISSUE_REPORT'
  | 'MANAGE_COURSE_ENROLLMENT'
  | 'ADJUST_STOCK_LOT';

export interface PendingAdminAction {
  actionId: string;
  actionType: AdminActionType;
  title: string;
  summary: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  impactCount: number;
  details: Array<{
    label: string;
    value: string;
    highlight?: boolean;
  }>;
  warnings?: string[];
  payload: Record<string, any>;
  createdAt: number;
}

export interface DailyBriefingData {
  dateLabel: string;
  isLabOpenNow: boolean;
  role: string;
  metrics: {
    pendingApprovals: number;
    overdueBorrows: number;
    lowStock: number;
    expiringSoon: number;
    todayRoomBookings: number;
    pendingIssues: number;
    todayAcHours: number;
  };
  todayBookingsPreview: Array<{
    roomCode: string;
    timeRange: string;
    title: string;
  }>;
}

export interface AiCopilotConfigData {
  enableForTeachers: boolean;
  enableForStudents: boolean;
  enableForExecutives: boolean;
  defaultModelMode: AiModelMode;
  canUseCopilot: boolean;
}

export const CHATBOT_TOOL_LABELS: Record<string, string> = {
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
  propose_batch_ac_logs: '❄️ เตรียมบันทึกแอร์แบบกลุ่ม',
  propose_manage_holiday: '🗓️ เตรียมจัดการวันหยุดพิเศษ',
  propose_review_approvals: '✅ เตรียมอนุมัติ/ปฏิเสธคำขอ',
  propose_overdue_reminders: '🔔 เตรียมแจ้งเตือนทวงคืนพัสดุ',
  propose_room_booking: '🏢 เตรียมจองห้องปฏิบัติการ',
  propose_toggle_practice_slot: '🩺 เตรียมเปิด/ปิดรอบฝึกทักษะ',
  propose_send_broadcast: '📢 เตรียมส่งประกาศแจ้งเตือน',
  propose_update_issue_report: '🔧 เตรียมอัปเดตงานแจ้งซ่อม',
  propose_course_enrollment: '🎓 เตรียมจัดการรายชื่อนิสิตในวิชา',
  propose_stock_adjustment: '📦 เตรียมปรับยอดสต็อกพัสดุ',
};

export type ChatbotResponseSource =
  | 'GEMINI_TOOLS'
  | 'GEMINI_LLM'
  | 'LOCAL_KNOWLEDGE_BASE'
  | 'DATETIME_ENGINE'
  | 'ACTION_ENGINE';

export interface ChatSessionState {
  activeIntent: ChatIntent;
  stage: DialogueStage;
  roomDraft?: RoomBookingDraft;
  practiceDraft?: PracticeBookingDraft;
  requestDraft?: UnifiedRequestDraft;
  acDraft?: AcLogDraft;
  issueDraft?: IssueReportDraft;
  pendingApprovalRefs?: PendingApprovalItemRef[];
  pendingAdminAction?: PendingAdminAction | null;
  modelMode?: AiModelMode;
  conversationHistory?: ChatHistoryItem[];
  lastUpdated: number;
}

export interface QuickReplyOption {
  label: string;
  textToSend: string;
  icon?: string;
}

export interface ConfirmationSummaryCard {
  title: string;
  intent: ChatIntent;
  details: Array<{
    label: string;
    value: string;
    highlight?: boolean;
    badge?: string;
  }>;
  confirmText?: string;
  cancelText?: string;
}

export interface ChatbotTurnResponse {
  replyText: string;
  sessionState: ChatSessionState;
  quickReplies?: QuickReplyOption[];
  confirmationSummary?: ConfirmationSummaryCard;
  pendingAdminAction?: PendingAdminAction | null;
  toolsUsed?: string[];
  suggestedLinks?: SuggestedLink[];
  source?: ChatbotResponseSource;
  modelUsed?: string;
  executionResult?: {
    success: boolean;
    referenceCode?: string;
    viewUrl?: string;
    message?: string;
  };
}
