import { prisma } from '@/lib/prisma';

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
