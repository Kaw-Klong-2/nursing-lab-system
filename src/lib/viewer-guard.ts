import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

export const VIEWER_FORBIDDEN_MESSAGE =
  'บัญชีผู้เข้าชม (Viewer) มีสิทธิ์เข้าดูข้อมูลเท่านั้น ไม่สามารถส่งคำร้องหรือบันทึกแก้ไขข้อมูลได้';

/**
 * Checks whether the given userId belongs to a read-only VIEWER account.
 */
export async function isViewerUser(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === 'VIEWER';
}

export interface AuthenticatedActor {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  approvalScopes: string | null;
}

/**
 * Verifies the signed HttpOnly session cookie, loads the active DB user,
 * and optionally enforces role membership.
 */
export async function requireActiveActor(
  req: Request,
  allowedRoles?: string[]
): Promise<{ actor: AuthenticatedActor; errorResponse?: never } | { actor?: never; errorResponse: NextResponse }> {
  const session = await getSessionFromRequest(req);
  if (!session?.uid) {
    return {
      errorResponse: NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      ),
    };
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      approvalScopes: true,
    },
  });

  if (!actor || (actor.status && actor.status !== 'ACTIVE')) {
    return {
      errorResponse: NextResponse.json(
        { error: 'บัญชีผู้ใช้งานไม่มีอยู่ในระบบหรือถูกระงับสิทธิ์แล้ว' },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(actor.role)) {
    return {
      errorResponse: NextResponse.json(
        { error: 'ปฏิเสธการเข้าถึง: ท่านไม่มีสิทธิ์ดำเนินการในส่วนนี้' },
        { status: 403 }
      ),
    };
  }

  return { actor };
}
