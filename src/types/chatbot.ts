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

export interface ChatSessionState {
  activeIntent: ChatIntent;
  stage: DialogueStage;
  roomDraft?: RoomBookingDraft;
  practiceDraft?: PracticeBookingDraft;
  requestDraft?: UnifiedRequestDraft;
  acDraft?: AcLogDraft;
  issueDraft?: IssueReportDraft;
  pendingApprovalRefs?: PendingApprovalItemRef[];
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
  executionResult?: {
    success: boolean;
    referenceCode?: string;
    viewUrl?: string;
    message?: string;
  };
}
