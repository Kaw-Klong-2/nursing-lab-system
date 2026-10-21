import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyRoles, createNotification } from '@/lib/notifications';
import { formatUserName } from '@/lib/user-utils';
import { getBangkokStartOfDay, getBangkokEndOfDay } from '@/lib/date-time-utils';

/**
 * ตรวจสอบความปลอดภัยของคำขอ Cron หรือสิทธิ์ของผู้เรียกใช้
 */
async function verifyAuth(req: Request): Promise<{ authorized: boolean; reason?: string }> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const secretParam = url.searchParams.get('secret') || url.searchParams.get('key');

  // 1. ตรวจสอบ Bearer Token จาก Vercel Cron (เมื่อมีการตั้งค่า CRON_SECRET)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  // 2. ตรวจสอบ Secret หรือ Key ใน Query String
  if (cronSecret && secretParam === cronSecret) {
    return { authorized: true };
  }

  // 3. ตรวจสอบ Master Key สำหรับ External Cron (เช่น cron-job.org หรือ GitHub Actions)
  const systemKey = process.env.EXTERNAL_SYNC_API_KEY || 'lab_nursing_cron_secure_2026';
  if (secretParam === systemKey || secretParam === 'lab_nursing_cron_secure_2026') {
    return { authorized: true };
  }

  // 4. ตรวจสอบสัญญาณ Vercel Cron โดยตรง (Vercel จะส่ง Header "x-vercel-cron: 1" หรือ User-Agent "vercel-cron/...")
  const vercelCronHeader = req.headers.get('x-vercel-cron');
  const userAgent = req.headers.get('user-agent') || '';
  if (vercelCronHeader === '1' || userAgent.toLowerCase().includes('vercel-cron')) {
    return { authorized: true };
  }

  // 5. ตรวจสอบสิทธิ์เจ้าหน้าที่หรือผู้ดูแลระบบผ่าน Header x-user-id (สำหรับ Client Heartbeat / การทดสอบ)
  const userId = req.headers.get('x-user-id');
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });
    if (user && user.status === 'ACTIVE' && (user.role === 'OFFICER' || user.role === 'ADMIN')) {
      return { authorized: true };
    }
  }

  // 6. สภาพแวดล้อม Development ที่ยังไม่ได้ตั้ง CRON_SECRET อนุญาตให้รันเพื่อทดสอบได้
  if (process.env.NODE_ENV !== 'production' && !cronSecret) {
    return { authorized: true };
  }

  return { authorized: false, reason: 'ไม่มีสิทธิ์เข้าถึงระบบ Cron เตือนคืนครุภัณฑ์' };
}

/**
 * แกนหลักในการประมวลผลการแจ้งเตือนเตือนคืนครุภัณฑ์
 */
async function processReminders(type: string = 'all') {
  const now = new Date();
  const eighteenHoursAgo = new Date(now.getTime() - 18 * 60 * 60 * 1000);

  // คำนวณช่วงเวลาวันนี้และวันพรุ่งนี้ตามเขตเวลาประเทศไทย (Asia/Bangkok, UTC+7)
  const startOfToday = getBangkokStartOfDay(now);
  const endOfToday = getBangkokEndOfDay(now);

  const tomorrowTarget = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const startOfTomorrow = getBangkokStartOfDay(tomorrowTarget);
  const endOfTomorrow = getBangkokEndOfDay(tomorrowTarget);

  let overdueAlertsSent = 0;
  let dDayAlertsSent = 0;
  let d1AlertsSent = 0;
  let staffDigestSent = false;
  let dispenseDigestSent = false;
  let roomDigestSent = false;
  let todayDispenseCount = 0;
  let todayRoomCount = 0;

  const shouldRunMorning = type === 'morning' || type === 'all';
  const shouldRunEvening = type === 'evening' || type === 'all';

  // ==========================================
  // 1. ตรวจสอบรายการค้างส่งคืนเกินกำหนด (Overdue - รอบเช้า)
  // ==========================================
  const overdueBorrowsList: {
    id: string;
    requestNumber: string;
    userId: string;
    studentName: string;
    itemNames: string;
    overdueDays: number;
  }[] = [];

  if (shouldRunMorning) {
    const overdueBorrows = await prisma.borrowRequest.findMany({
      where: {
        status: 'BORROWED',
        actualReturnDate: null,
        expectedReturnDate: { lt: now },
      },
      include: {
        user: { select: { id: true, name: true, prefix: true } },
        items: {
          include: {
            item: { select: { name: true } },
          },
        },
      },
    });

    for (const b of overdueBorrows) {
      const itemNames = b.items.map((i) => i.item?.name).filter(Boolean).join(', ') || 'ครุภัณฑ์ห้องปฏิบัติการ';
      const studentName = formatUserName(b.user) || 'นิสิต';
      const overdueDays = Math.max(
        1,
        Math.floor((now.getTime() - new Date(b.expectedReturnDate).getTime()) / (24 * 60 * 60 * 1000))
      );

      // บันทึกลงรายการสำหรับสรุปส่งเจ้าหน้าที่
      overdueBorrowsList.push({
        id: b.id,
        requestNumber: b.requestNumber,
        userId: b.userId,
        studentName,
        itemNames,
        overdueDays,
      });

      // ตรวจสอบ Anti-spam Cooldown: หากเคยแจ้งเตือนในวันนี้แล้ว (ตั้งแต่ 00:00 น.) จะไม่ส่งซ้ำ
      const remindedRecently = b.lastRemindedAt && b.lastRemindedAt >= startOfToday;
      if (!remindedRecently) {
        // ตรวจสอบในตาราง Notification ว่ามีการเตือนซ้ำในวันนี้หรือไม่
        const recentNotif = await prisma.notification.findFirst({
          where: {
            userId: b.userId,
            entityId: b.id,
            type: 'DUE_REMINDER',
            title: { contains: 'เกินกำหนด' },
            createdAt: { gte: startOfToday },
          },
        });

        if (!recentNotif) {
          // ส่ง In-App + Web Push ให้นิสิต
          await createNotification({
            userId: b.userId,
            title: `⚠️ ครุภัณฑ์ค้างส่งคืนเกินกำหนด (${overdueDays} วัน)`,
            message: `คำขอเลขที่ ${b.requestNumber} (${itemNames}) เกินกำหนดส่งคืนแล้ว (เกินกำหนดมาแล้ว ${overdueDays} วัน) กรุณานำส่งคืนที่ห้องปฏิบัติการพยาบาลโดยด่วน`,
            type: 'DUE_REMINDER',
            priority: 'URGENT',
            linkUrl: '/borrow',
            entityType: 'BORROW',
            entityId: b.id,
          });

          // บันทึกเวลาที่ส่งแจ้งเตือนล่าสุด
          await prisma.borrowRequest.update({
            where: { id: b.id },
            data: { lastRemindedAt: now },
          }).catch(() => {});

          overdueAlertsSent++;
        }
      }
    }

    // สรุปรายงาน Daily Overdue Digest ส่งให้เจ้าหน้าที่ห้องแล็บ (OFFICER, ADMIN) 1 ฉบับ
    if (overdueBorrowsList.length > 0) {
      // ตรวจสอบว่าในวันนี้เคยส่ง Daily Digest ให้เจ้าหน้าที่หรือยัง
      const recentDigest = await prisma.notification.findFirst({
        where: {
          type: 'DUE_REMINDER',
          title: { contains: 'สรุปรายการครุภัณฑ์ค้างส่งคืนประจำวัน' },
          createdAt: { gte: startOfToday },
        },
      });

      if (!recentDigest) {
        const uniqueStudentsCount = new Set(overdueBorrowsList.map((item) => item.userId)).size;
        const totalItemsCount = overdueBorrowsList.length;

        await notifyRoles(['OFFICER', 'ADMIN'], {
          title: '📋 สรุปรายการครุภัณฑ์ค้างส่งคืนประจำวัน',
          message: `พบคำขอยืมครุภัณฑ์ค้างส่งคืนเกินกำหนดรวม ${totalItemsCount} รายการ จากนิสิต ${uniqueStudentsCount} คน กรุณาตรวจสอบและติดตามส่งคืน`,
          type: 'DUE_REMINDER',
          priority: 'HIGH',
          linkUrl: '/borrow',
          entityType: 'BORROW',
        });

        staffDigestSent = true;
      }
    }

    // ==========================================
    // 1.1 ตรวจสอบรายการที่ต้องจ่ายออกประจำวัน (Scheduled Dispense Digest - รอบเช้า)
    // ==========================================
    const [todayRequisitions, todayBorrowsToPickup] = await Promise.all([
      prisma.requisitionRequest.findMany({
        where: {
          status: 'APPROVED',
          dateNeeded: {
            lte: endOfToday,
          },
        },
        include: {
          course: { select: { code: true } },
        },
      }),
      prisma.borrowRequest.findMany({
        where: {
          status: 'APPROVED',
          borrowDate: {
            lte: endOfToday,
          },
        },
      }),
    ]);

    todayDispenseCount = todayRequisitions.length + todayBorrowsToPickup.length;

    if (todayDispenseCount > 0) {
      const recentDispenseDigest = await prisma.notification.findFirst({
        where: {
          type: 'STATUS_UPDATE',
          title: { contains: 'สรุปตารางจ่ายพัสดุและอุปกรณ์ประจำวัน' },
          createdAt: { gte: startOfToday },
        },
      });

      if (!recentDispenseDigest) {
        await notifyRoles(['OFFICER', 'ADMIN'], {
          title: '📦 สรุปตารางจ่ายพัสดุและอุปกรณ์ประจำวัน',
          message: `วันนี้มีรายการที่ต้องจ่ายออกรวม ${todayDispenseCount} รายการ (ใบเบิกวัสดุ ${todayRequisitions.length} รายการ, นัดรับครุภัณฑ์ ${todayBorrowsToPickup.length} รายการ) กรุณาตรวจสอบและจัดเตรียมพัสดุที่ห้องแล็บ`,
          type: 'STATUS_UPDATE',
          priority: 'HIGH',
          linkUrl: '/dispense',
          entityType: todayRequisitions.length > 0 ? 'REQUISITION' : 'BORROW',
        });
        dispenseDigestSent = true;
      }
    }

    // ==========================================
    // 1.2 ตรวจสอบตารางการใช้ห้องปฏิบัติการประจำวัน (Daily Room Usage Digest - รอบเช้า)
    // ==========================================
    const todayRoomBookings = await prisma.roomBooking.findMany({
      where: {
        status: 'APPROVED',
        bookingDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        room: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    todayRoomCount = todayRoomBookings.length;

    if (todayRoomCount > 0) {
      const recentRoomDigest = await prisma.notification.findFirst({
        where: {
          type: 'STATUS_UPDATE',
          title: { contains: 'สรุปตารางการใช้ห้องปฏิบัติการประจำวัน' },
          createdAt: { gte: startOfToday },
        },
      });

      if (!recentRoomDigest) {
        const roomNames = Array.from(new Set(todayRoomBookings.map((b) => b.room?.name).filter(Boolean))).join(', ');
        await notifyRoles(['OFFICER', 'ADMIN'], {
          title: '🏫 สรุปตารางการใช้ห้องปฏิบัติการประจำวัน',
          message: `วันนี้มีตารางการใช้ห้องที่ได้รับอนุมัติรวม ${todayRoomCount} รายการ (${roomNames}) กรุณาตรวจสอบและจัดเตรียมเปิดห้องใช้งาน`,
          type: 'STATUS_UPDATE',
          priority: 'NORMAL',
          linkUrl: '/schedule',
          entityType: 'ROOM',
        });
        roomDigestSent = true;
      }
    }

    // ==========================================
    // 2. ตรวจสอบรายการครบกำหนดส่งคืนวันนี้ (D-Day - รอบเช้า)
    // ==========================================
    const dDayBorrows = await prisma.borrowRequest.findMany({
      where: {
        status: 'BORROWED',
        actualReturnDate: null,
        expectedReturnDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        user: { select: { id: true, name: true, prefix: true } },
        items: {
          include: {
            item: { select: { name: true } },
          },
        },
      },
    });

    for (const b of dDayBorrows) {
      const remindedRecently = b.lastRemindedAt && b.lastRemindedAt >= startOfToday;
      if (!remindedRecently) {
        const recentNotif = await prisma.notification.findFirst({
          where: {
            userId: b.userId,
            entityId: b.id,
            type: 'DUE_REMINDER',
            title: { contains: 'กำหนดส่งคืนวันนี้' },
            createdAt: { gte: startOfToday },
          },
        });

        if (!recentNotif) {
          const itemNames = b.items.map((i) => i.item?.name).filter(Boolean).join(', ') || 'ครุภัณฑ์ห้องปฏิบัติการ';

          await createNotification({
            userId: b.userId,
            title: '🔔 กำหนดส่งคืนวันนี้: กรุณานำครุภัณฑ์ส่งคืนห้องแล็บ',
            message: `คำขอเลขที่ ${b.requestNumber} (${itemNames}) มีกำหนดส่งคืนในวันนี้ กรุณานำส่งคืนที่ห้องปฏิบัติการพยาบาลก่อน 16:30 น.`,
            type: 'DUE_REMINDER',
            priority: 'HIGH',
            linkUrl: '/borrow',
            entityType: 'BORROW',
            entityId: b.id,
          });

          await prisma.borrowRequest.update({
            where: { id: b.id },
            data: { lastRemindedAt: now },
          }).catch(() => {});

          dDayAlertsSent++;
        }
      }
    }
  }

  // ==========================================
  // 3. ตรวจสอบรายการแจ้งเตือนล่วงหน้า 1 วัน (D-1 - รอบเย็น 18:00 น.)
  // ==========================================
  if (shouldRunEvening) {
    const d1Borrows = await prisma.borrowRequest.findMany({
      where: {
        status: 'BORROWED',
        actualReturnDate: null,
        expectedReturnDate: {
          gte: startOfTomorrow,
          lte: endOfTomorrow,
        },
      },
      include: {
        user: { select: { id: true, name: true, prefix: true } },
        items: {
          include: {
            item: { select: { name: true } },
          },
        },
      },
    });

    for (const b of d1Borrows) {
      const remindedRecently = b.lastRemindedAt && b.lastRemindedAt >= startOfToday;
      if (!remindedRecently) {
        const recentNotif = await prisma.notification.findFirst({
          where: {
            userId: b.userId,
            entityId: b.id,
            type: 'DUE_REMINDER',
            title: { contains: 'พรุ่งนี้ครบกำหนดส่งคืน' },
            createdAt: { gte: startOfToday },
          },
        });

        if (!recentNotif) {
          const itemNames = b.items.map((i) => i.item?.name).filter(Boolean).join(', ') || 'ครุภัณฑ์ห้องปฏิบัติการ';

          await createNotification({
            userId: b.userId,
            title: '⏰ แจ้งเตือนล่วงหน้า: พรุ่งนี้ครบกำหนดส่งคืนครุภัณฑ์',
            message: `คำขอเลขที่ ${b.requestNumber} (${itemNames}) มีกำหนดส่งคืนในวันพรุ่งนี้ กรุณานำส่งคืนที่ห้องปฏิบัติการพยาบาลก่อน 16:30 น.`,
            type: 'DUE_REMINDER',
            priority: 'NORMAL',
            linkUrl: '/borrow',
            entityType: 'BORROW',
            entityId: b.id,
          });

          await prisma.borrowRequest.update({
            where: { id: b.id },
            data: { lastRemindedAt: now },
          }).catch(() => {});

          d1AlertsSent++;
        }
      }
    }
  }

  return {
    success: true,
    executedAt: now.toISOString(),
    overdueCount: overdueBorrowsList.length,
    overdueAlertsSent,
    dDayAlertsSent,
    d1AlertsSent,
    staffDigestSent,
    dispenseDigestSent,
    todayDispenseCount,
    roomDigestSent,
    todayRoomCount,
  };
}

export async function GET(req: Request) {
  try {
    const authCheck = await verifyAuth(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.reason || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';

    const result = await processReminders(type);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Reminder cron error (GET):', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authCheck = await verifyAuth(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.reason || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';

    const result = await processReminders(type);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Reminder cron error (POST):', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
