/**
 * ระบบติดตามการเข้าสู่ระบบและสถานะออนไลน์ของผู้ใช้งาน (User Presence & Session Engine)
 * จัดการสถานะออนไลน์แบบ Real-time, บันทึกประเภทอุปกรณ์ (Desktop / Mobile)
 * และระบบสั่งให้ออกจากระบบระยะไกล (Force Logout) โดยไม่ต้องแก้ไข Schema ฐานข้อมูล
 */

export interface ActiveSessionInfo {
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  device: 'DESKTOP' | 'MOBILE';
  browser?: string;
  ipAddress?: string;
  lastActive: number; // Unix timestamp ms
  loginAt: number;    // Unix timestamp ms
}

// Timeout สำหรับระบุว่าผู้ใช้ยังออนไลน์อยู่ (5 นาทีหลังจาก heartbeat ล่าสุด)
export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

// หน่วยความจำแคชสำหรับจัดเก็บ Session ปัจจุบัน (In-memory Presence Map)
// ใช้ globalThis เพื่อรักษา Session ไว้ตลอด Lifecycle ของ Next.js Node process
declare global {
  var __userPresenceMap: Map<string, ActiveSessionInfo> | undefined;
  var __forceLoggedOutSet: Map<string, number> | undefined; // userId -> timestamp
}

if (!globalThis.__userPresenceMap) {
  globalThis.__userPresenceMap = new Map<string, ActiveSessionInfo>();
}

if (!globalThis.__forceLoggedOutSet) {
  globalThis.__forceLoggedOutSet = new Map<string, number>();
}

const presenceMap = globalThis.__userPresenceMap;
const forceLogoutMap = globalThis.__forceLoggedOutSet;

/**
 * วิเคราะห์ประเภทอุปกรณ์จาก User-Agent string
 */
export function detectDeviceType(userAgent?: string | null): 'DESKTOP' | 'MOBILE' {
  if (!userAgent) return 'DESKTOP';
  const ua = userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  return isMobile ? 'MOBILE' : 'DESKTOP';
}

/**
 * วิเคราะห์ชื่อเบราว์เซอร์เบื้องต้นจาก User-Agent string
 */
export function detectBrowserName(userAgent?: string | null): string {
  if (!userAgent) return 'Web Browser';
  const ua = userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('firefox/')) return 'Firefox';
  return 'Web Browser';
}

/**
 * บันทึก Heartbeat หรือการเข้าสู่ระบบของผู้ใช้
 */
export function recordUserHeartbeat(params: {
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  isLogin?: boolean;
}): void {
  const { userId, userName, userEmail, userRole, userAgent, ipAddress, isLogin } = params;
  const now = Date.now();

  // ล้างการบังคับ Logout เมื่อผู้ใช้ล็อกอินใหม่สำเร็จ
  if (isLogin) {
    forceLogoutMap.delete(userId);
  }

  const existing = presenceMap.get(userId);
  const device = detectDeviceType(userAgent);
  const browser = detectBrowserName(userAgent);

  presenceMap.set(userId, {
    userId,
    userName: userName || existing?.userName,
    userEmail: userEmail || existing?.userEmail,
    userRole: userRole || existing?.userRole,
    device,
    browser,
    ipAddress: ipAddress || existing?.ipAddress,
    lastActive: now,
    loginAt: isLogin ? now : (existing?.loginAt || now),
  });
}

/**
 * ตรวจสอบว่าผู้ใช้อยู่ในสถานะออนไลน์หรือไม่
 */
export function isUserOnline(userId: string): boolean {
  const session = presenceMap.get(userId);
  if (!session) return false;
  return Date.now() - session.lastActive <= ONLINE_THRESHOLD_MS;
}

/**
 * ดึงข้อมูล Session ทั้งหมดที่ยังออนไลน์อยู่
 */
export function getActiveOnlineSessions(): ActiveSessionInfo[] {
  const now = Date.now();
  const activeList: ActiveSessionInfo[] = [];

  for (const [userId, session] of presenceMap.entries()) {
    if (now - session.lastActive <= ONLINE_THRESHOLD_MS) {
      activeList.push(session);
    } else if (now - session.lastActive > 24 * 60 * 60 * 1000) {
      // ล้างข้อมูลที่ค้างเกิน 24 ชั่วโมงออกจากหน่วยความจำ
      presenceMap.delete(userId);
    }
  }

  return activeList;
}

/**
 * ดึงข้อมูล Session ของผู้ใช้รายคน (ถ้ามี)
 */
export function getUserSessionInfo(userId: string): ActiveSessionInfo | null {
  const session = presenceMap.get(userId);
  if (!session) return null;
  const isOnline = Date.now() - session.lastActive <= ONLINE_THRESHOLD_MS;
  return isOnline ? session : null;
}

/**
 * แอดมินสั่งให้ออกจากระบบระยะไกล (Force Logout)
 */
export function forceLogoutUser(userId: string): void {
  presenceMap.delete(userId);
  forceLogoutMap.set(userId, Date.now());
}

/**
 * ตรวจสอบว่าผู้ใช้ถูกสั่งให้ออกจากระบบระยะไกลหรือไม่
 */
export function isUserForceLoggedOut(userId: string, sessionLoginTime?: number): boolean {
  const logoutTimestamp = forceLogoutMap.get(userId);
  if (!logoutTimestamp) return false;

  // หากผู้ใช้มี session เก่ากว่าเวลาที่ถูกสั่ง logout ให้ถือว่าโดนเตะ
  if (sessionLoginTime && sessionLoginTime > logoutTimestamp) {
    return false;
  }
  return true;
}

/**
 * ลบ Session เมื่อผู้ใช้กด Logout ปกติ
 */
export function removeUserPresence(userId: string): void {
  presenceMap.delete(userId);
}
