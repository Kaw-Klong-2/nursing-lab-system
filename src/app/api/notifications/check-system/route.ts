import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyRoles, createNotification } from '@/lib/notifications';

export async function POST() {
  try {
    const now = new Date();
    const twentyFourHoursAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let alertsGenerated = 0;

    // 1.1 Check Upcoming Borrows (ครุภัณฑ์ที่ใกล้ถึงกำหนดส่งคืนในอีก 24 ชั่วโมงข้างหน้า)
    const upcomingBorrows = await prisma.borrowRequest.findMany({
      where: {
        status: 'BORROWED',
        actualReturnDate: null,
        expectedReturnDate: {
          gte: now,
          lte: twentyFourHoursAhead,
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

    for (const b of upcomingBorrows) {
      const recentUpcomingAlert = await prisma.notification.findFirst({
        where: {
          userId: b.userId,
          entityId: b.id,
          type: 'DUE_REMINDER',
          title: { contains: 'ใกล้ถึงกำหนดส่งคืน' },
          createdAt: { gte: oneDayAgo },
        },
      });

      if (!recentUpcomingAlert) {
        const itemNames = b.items.map((i) => i.item?.name).filter(Boolean).join(', ');
        const returnDateFormatted = new Date(b.expectedReturnDate).toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        await createNotification({
          userId: b.userId,
          title: '⏰ แจ้งเตือน: ครุภัณฑ์ใกล้ถึงกำหนดส่งคืน',
          message: `รายการยืมเลขที่ ${b.requestNumber} (${itemNames}) มีกำหนดส่งคืนในวันที่ ${returnDateFormatted} กรุณาเตรียมนำส่งคืนที่ห้องปฏิบัติการตามเวลา`,
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

        alertsGenerated++;
      }
    }

    // 1.2 Check Overdue Borrows (ครุภัณฑ์ที่ค้างส่งคืนเกินกำหนด)
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
      // Check if alert already sent in the past 24 hours
      const recentAlert = await prisma.notification.findFirst({
        where: {
          userId: b.userId,
          entityId: b.id,
          type: 'DUE_REMINDER',
          title: { contains: 'เกินกำหนด' },
          createdAt: { gte: oneDayAgo },
        },
      });

      if (!recentAlert) {
        const itemNames = b.items.map((i) => i.item?.name).filter(Boolean).join(', ');
        const overdueDays = Math.max(1, Math.floor((now.getTime() - new Date(b.expectedReturnDate).getTime()) / (24 * 60 * 60 * 1000)));

        // Notify student
        await createNotification({
          userId: b.userId,
          title: `⚠️ ครุภัณฑ์ค้างส่งคืนเกินกำหนด (${overdueDays} วัน)`,
          message: `รายการยืมเลขที่ ${b.requestNumber} (${itemNames}) ครบกำหนดส่งคืนแล้ว (เกินกำหนดมาแล้ว ${overdueDays} วัน) กรุณานำส่งคืนที่ห้องแล็บโดยด่วน`,
          type: 'DUE_REMINDER',
          priority: 'URGENT',
          linkUrl: '/borrow',
          entityType: 'BORROW',
          entityId: b.id,
        });

        // Notify officers
        await notifyRoles(['OFFICER', 'ADMIN'], {
          title: `🔴 ครุภัณฑ์ค้างส่งคืนเกินกำหนด (${overdueDays} วัน)`,
          message: `นิสิต ${b.user?.name || 'ไม่ระบุชื่อ'} ค้างส่งคืนคำขอ ${b.requestNumber} (${itemNames}) เกินกำหนดมาแล้ว ${overdueDays} วัน`,
          type: 'DUE_REMINDER',
          priority: 'HIGH',
          linkUrl: '/borrow',
          entityType: 'BORROW',
          entityId: b.id,
        });

        // Update lastRemindedAt
        await prisma.borrowRequest.update({
          where: { id: b.id },
          data: { lastRemindedAt: now },
        }).catch(() => {});

        alertsGenerated++;
      }
    }

    // 2. Check Expiring Lots (เวชภัณฑ์ใกล้หมดอายุภายใน 30 วัน)
    const expiringLots = await prisma.stockLot.findMany({
      where: {
        quantityRemaining: { gt: 0 },
        expiryDate: {
          gte: now,
          lte: thirtyDaysAhead,
        },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            storageLocation: { select: { name: true, code: true } },
          },
        },
      },
      take: 10,
    });

    for (const lot of expiringLots) {
      const recentExpAlert = await prisma.notification.findFirst({
        where: {
          type: 'STOCK_ALERT',
          entityId: lot.id,
          createdAt: { gte: oneDayAgo },
        },
      });

      if (!recentExpAlert) {
        const expDateStr = lot.expiryDate ? lot.expiryDate.toISOString().split('T')[0] : '';
        const locStr = lot.item?.storageLocation ? ` (ตู้: ${lot.item.storageLocation.name})` : '';

        await notifyRoles(['OFFICER', 'ADMIN'], {
          title: '⏳ เวชภัณฑ์ใกล้หมดอายุ (ภายใน 30 วัน)',
          message: `${lot.item?.name} ล็อต ${lot.lotNumber} หมดอายุวันที่ ${expDateStr} เหลือ ${lot.quantityRemaining} หน่วย${locStr}`,
          type: 'STOCK_ALERT',
          priority: 'HIGH',
          linkUrl: '/inventory',
          entityType: 'ITEM',
          entityId: lot.id,
        });

        alertsGenerated++;
      }
    }

    return NextResponse.json({
      success: true,
      alertsGenerated,
      overdueCount: overdueBorrows.length,
      expiringLotsCount: expiringLots.length,
    });
  } catch (error: any) {
    console.error('System notification check error:', error);
    return NextResponse.json({ error: error.message || 'System check failed' }, { status: 500 });
  }
}
