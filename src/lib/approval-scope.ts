export type ApprovalScopeType = 'BORROW' | 'REQUISITION' | 'PRACTICE' | 'ROOM';

export const ALL_APPROVAL_SCOPES: { id: ApprovalScopeType; label: string; group: 'ITEMS' | 'ROOMS' }[] = [
  { id: 'BORROW', label: 'การยืมครุภัณฑ์', group: 'ITEMS' },
  { id: 'REQUISITION', label: 'การเบิกวัสดุสิ้นเปลือง', group: 'ITEMS' },
  { id: 'PRACTICE', label: 'การจองห้องฝึกทักษะ', group: 'ROOMS' },
  { id: 'ROOM', label: 'การจองห้องปฏิบัติการ', group: 'ROOMS' },
];

export const SCOPE_LABELS: Record<ApprovalScopeType, string> = {
  BORROW: 'การยืมครุภัณฑ์',
  REQUISITION: 'การเบิกวัสดุสิ้นเปลือง',
  PRACTICE: 'การจองห้องฝึกทักษะ',
  ROOM: 'การจองห้องปฏิบัติการ',
};

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์อนุมัติรายการประเภทนั้น ๆ หรือไม่
 */
export function canUserApprove(
  user: { role?: string; approvalScopes?: string | null; isExecutive?: boolean | null } | null | undefined,
  type: ApprovalScopeType
): boolean {
  if (!user) return false;

  // นิสิต (USER) can NEVER approve anything under any circumstance
  if (user.role === 'USER') return false;
  
  // ADMIN can approve everything
  if (user.role === 'ADMIN') return true;

  // If approvalScopes is explicitly NONE, empty string or null
  if (!user.approvalScopes || user.approvalScopes === '' || user.approvalScopes === 'NONE') {
    // Legacy fallback: only OFFICER or APPROVER without explicit empty scope defaults to true
    if (user.role === 'OFFICER' || user.role === 'APPROVER') return true;
    return false;
  }

  // If scope is explicitly ALL
  if (user.approvalScopes === 'ALL') return true;

  const scopes = user.approvalScopes
    .split(',')
    .map((s) => s.trim().toUpperCase());

  return scopes.includes(type);
}

/**
 * ดึงรายการ Scope ทั้งหมดที่ผู้ใช้คนนี้มีสิทธิ์อนุมัติ
 */
export function getEffectiveScopes(
  user: { role?: string; approvalScopes?: string | null; isExecutive?: boolean | null } | null | undefined
): ApprovalScopeType[] {
  if (!user || user.role === 'USER') return [];
  if (user.role === 'ADMIN') {
    return ['BORROW', 'REQUISITION', 'PRACTICE', 'ROOM'];
  }
  if (!user.approvalScopes || user.approvalScopes === '' || user.approvalScopes === 'NONE') {
    if (user.role === 'OFFICER' || user.role === 'APPROVER') {
      return ['BORROW', 'REQUISITION', 'PRACTICE', 'ROOM'];
    }
    return [];
  }
  if (user.approvalScopes === 'ALL') {
    return ['BORROW', 'REQUISITION', 'PRACTICE', 'ROOM'];
  }
  const raw = user.approvalScopes.split(',').map((s) => s.trim().toUpperCase());
  return ALL_APPROVAL_SCOPES.map((s) => s.id).filter((id) => raw.includes(id));
}

/**
 * แสดงป้ายข้อความสรุปขอบเขตความรับผิดชอบ
 */
export function formatApprovalScopeBadge(scopes: string | null | undefined): string {
  if (!scopes || scopes === 'NONE' || scopes === '') return 'ไม่มีสิทธิ์อนุมัติ';
  if (scopes === 'ALL') return 'ดูแล: ทั้งหมด';
  
  const raw = scopes.split(',').map((s) => s.trim().toUpperCase());
  const hasBorrow = raw.includes('BORROW');
  const hasReq = raw.includes('REQUISITION');
  const hasPractice = raw.includes('PRACTICE');
  const hasRoom = raw.includes('ROOM');

  if (hasBorrow && hasReq && !hasPractice && !hasRoom) {
    return 'ดูแล: พัสดุและครุภัณฑ์';
  }
  if (!hasBorrow && !hasReq && (hasPractice || hasRoom)) {
    return 'ดูแล: ห้องปฏิบัติการ';
  }

  const labels = raw
    .map((s) => SCOPE_LABELS[s as ApprovalScopeType])
    .filter(Boolean);

  return labels.length > 0 ? `ดูแล: ${labels.join(', ')}` : 'ดูแล: ทั้งหมด';
}
