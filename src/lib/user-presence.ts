/**
 * ระบบติดตามการเข้าสู่ระบบและสถานะออนไลน์ของผู้ใช้งาน (User Presence & Session Engine)
 * จัดการสถานะออนไลน์แบบ Real-time, บันทึกประเภทอุปกรณ์ (Desktop / Mobile)
 * และระบบสั่งให้ออกจากระบบระยะไกล (Force Logout) รองรับการทำงานบน Serverless (Vercel)
 * โดยใช้ฐานข้อมูล Supabase PostgreSQL เป็น Shared Persistence Source of Truth
 */

import { prisma } from '@/lib/prisma';

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
 * บันทึก Heartbeat หรือการเข้าสู่ระบบของผู้ใช้ (อัปเดตทั้ง Memory Cache และ Persistent Database)
 */
export async function recordUserHeartbeat(params: {
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  isLogin?: boolean;
}): Promise<void> {
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

  // บันทึกลงฐานข้อมูล Supabase PostgreSQL (เพื่อให้ทุก Serverless Container บน Vercel เห็นข้อมูลเดียวกัน)
  try {
    const updatePayload: {
      lastActiveAt: Date;
      lastActiveDevice: string;
      forceLoggedOutAt?: null;
    } = {
      lastActiveAt: new Date(now),
      lastActiveDevice: device,
    };

    if (isLogin) {
      updatePayload.forceLoggedOutAt = null;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
    });
  } catch (err) {
    console.error('[PRESENCE] บันทึก Heartbeat ลงฐานข้อมูลไม่สำเร็จสำหรับ:', userId, err);
  }
}

/**
 * ตรวจสอบว่าผู้ใช้อยู่ในสถานะออนไลน์หรือไม่ (เช็คจาก Memory)
 */
export function isUserOnline(userId: string): boolean {
  const session = presenceMap.get(userId);
  if (!session) return false;
  return Date.now() - session.lastActive <= ONLINE_THRESHOLD_MS;
}

/**
 * ดึงข้อมูล Session ทั้งหมดที่ยังออนไลน์อยู่ (ดึงจากฐานข้อมูลร่วมกับ Memory เพื่อรองรับ Serverless 100%)
 */
export async function getActiveOnlineSessions(): Promise<ActiveSessionInfo[]> {
  const now = Date.now();
  const threshold = new Date(now - ONLINE_THRESHOLD_MS);

  const activeMap = new Map<string, ActiveSessionInfo>();

  // 1. ดึงผู้ใช้งานจากฐานข้อมูลที่มี lastActiveAt ภายใน 5 นาทีล่าสุด
  try {
    const dbUsers = await prisma.user.findMany({
      where: {
        lastActiveAt: { gte: threshold },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastActiveAt: true,
        lastActiveDevice: true,
        forceLoggedOutAt: true,
      },
    });

    for (const u of dbUsers) {
      // ข้ามผู้ใช้ที่ถูกสั่งตัดเซสชัน
      if (u.forceLoggedOutAt && u.lastActiveAt && u.forceLoggedOutAt >= u.lastActiveAt) {
        continue;
      }
      const lastActiveMs = u.lastActiveAt ? u.lastActiveAt.getTime() : now;
      activeMap.set(u.id, {
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        userRole: u.role,
        device: (u.lastActiveDevice as 'DESKTOP' | 'MOBILE') || 'DESKTOP',
        browser: 'Web Browser',
        lastActive: lastActiveMs,
        loginAt: lastActiveMs,
      });
    }
  } catch (err) {
    console.error('[PRESENCE] ดึงข้อมูลผู้ใช้ออนไลน์จากฐานข้อมูลผิดพลาด:', err);
  }

  // 2. เผื่อ Container นี้มี In-memory Session ที่ใหม่กว่า
  for (const [userId, session] of presenceMap.entries()) {
    if (now - session.lastActive <= ONLINE_THRESHOLD_MS) {
      const existing = activeMap.get(userId);
      if (!existing || session.lastActive > existing.lastActive) {
        activeMap.set(userId, session);
      }
    } else if (now - session.lastActive > 24 * 60 * 60 * 1000) {
      presenceMap.delete(userId);
    }
  }

  return Array.from(activeMap.values());
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
export async function forceLogoutUser(userId: string): Promise<void> {
  const now = Date.now();
  presenceMap.delete(userId);
  forceLogoutMap.set(userId, now);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveAt: new Date(0), // รีเซ็ตเวลาเพื่อให้ออฟไลน์ทันที
        forceLoggedOutAt: new Date(now),
      },
    });
  } catch (err) {
    console.error('[PRESENCE] บันทึก Force Logout ลงฐานข้อมูลไม่สำเร็จ:', userId, err);
  }
}

/**
 * ตรวจสอบว่าผู้ใช้ถูกสั่งให้ออกจากระบบระยะไกลหรือไม่
 */
export async function isUserForceLoggedOut(userId: string, sessionLoginTime?: number): Promise<boolean> {
  const logoutTimestamp = forceLogoutMap.get(userId);
  if (logoutTimestamp) {
    if (sessionLoginTime && sessionLoginTime > logoutTimestamp) {
      return false;
    }
    return true;
  }

  // ตรวจสอบในฐานข้อมูลร่วมด้วย
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { forceLoggedOutAt: true, status: true },
    });
    if (!user || user.status === 'INACTIVE') return true;
    if (user.forceLoggedOutAt) {
      const dbLogoutTime = user.forceLoggedOutAt.getTime();
      if (sessionLoginTime && sessionLoginTime > dbLogoutTime) {
        return false;
      }
      return true;
    }
  } catch (err) {
    console.error('[PRESENCE] ตรวจสอบ Force Logout จากฐานข้อมูลผิดพลาด:', userId, err);
  }

  return false;
}

/**
 * ลบ Session เมื่อผู้ใช้กด Logout ปกติ
 */
export async function removeUserPresence(userId: string): Promise<void> {
  presenceMap.delete(userId);
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveAt: new Date(0), // รีเซ็ตเวลาเพื่อให้ออฟไลน์ทันที
      },
    });
  } catch (err) {}
}
