import { prisma } from '@/lib/prisma';
import { formatUserName } from '@/lib/user-utils';

export type ActivityAction =
  | 'APPROVE'
  | 'REJECT'
  | 'CHECKOUT'
  | 'RETURN'
  | 'DISPENSE'
  | 'REMIND'
  | 'STOCK_IN'
  | 'STOCK_ADJUST'
  | 'ROLE_UPDATE'
  | 'UPDATE'
  | 'DELETE'
  | 'USER_CREATE'
  | 'USER_DELETE'
  | 'BOOKING_CREATE'
  | 'BOOKING_CANCEL'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT';

export type ActivityEntityType =
  | 'BORROW'
  | 'REQUISITION'
  | 'ROOM_BOOKING'
  | 'PRACTICE_BOOKING'
  | 'ITEM'
  | 'STOCK'
  | 'USER'
  | 'SYSTEM';

export interface LogActivityParams {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  entityTitle?: string | null;
  details?: string | any | null;
  metadata?: any;
  ipAddress?: string | null;
}

/**
 * บันทึก Activity Log ลงฐานข้อมูลแบบ Non-blocking (Fail-safe)
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    let resolvedUserName = params.userName;
    let resolvedUserRole = params.userRole;

    // หากไม่ได้ส่ง userName/userRole มา แต่มี userId ให้ดึงข้อมูลมาทำ snapshot
    if (params.userId && (!resolvedUserName || !resolvedUserRole)) {
      try {
        const u = await prisma.user.findUnique({
          where: { id: params.userId },
          select: { prefix: true, name: true, role: true },
        });
        if (u) {
          if (!resolvedUserName) resolvedUserName = formatUserName(u);
          if (!resolvedUserRole) resolvedUserRole = u.role;
        }
      } catch {}
    }

    let resolvedDetails = params.details;
    let resolvedMetadata = params.metadata;

    if (typeof params.details === 'object' && params.details !== null) {
      if (!resolvedMetadata) resolvedMetadata = params.details;
      resolvedDetails = Object.entries(params.details)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(', ');
    }

    await prisma.activityLog.create({
      data: {
        userId: params.userId || null,
        userName: resolvedUserName || 'ระบบอัตโนมัติ',
        userRole: resolvedUserRole || 'SYSTEM',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        entityTitle: params.entityTitle || null,
        details: resolvedDetails ? String(resolvedDetails) : null,
        metadata: resolvedMetadata ? JSON.parse(JSON.stringify(resolvedMetadata)) : undefined,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('[ACTIVITY_LOG] Failed to record log:', err);
  }
}
