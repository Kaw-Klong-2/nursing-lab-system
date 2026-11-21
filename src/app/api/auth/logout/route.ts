import { NextResponse } from 'next/server';
import { getSessionFromRequest, clearSessionCookie } from '@/lib/session';
import { removeUserPresence } from '@/lib/user-presence';
import { logActivity } from '@/lib/activity-log';

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);

    if (session?.uid) {
      await removeUserPresence(session.uid);
      logActivity({
        userId: session.uid,
        userRole: session.role,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: session.uid,
        details: 'ออกจากระบบปกติ',
      }).catch(() => {});
    }

    const res = NextResponse.json({ success: true, loggedOut: true });
    return clearSessionCookie(res);
  } catch (err) {
    console.error('Logout error:', err);
    const res = NextResponse.json({ success: true, loggedOut: true });
    return clearSessionCookie(res);
  }
}
