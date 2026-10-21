import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBangkokStartOfDay, getBangkokEndOfDay } from '@/lib/date-time-utils';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งาน (Unauthorized)' }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });

    if (!actor || actor.status !== 'ACTIVE' || (actor.role !== 'OFFICER' && actor.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'เฉพาะเจ้าหน้าที่และผู้ดูแลระบบเท่านั้นที่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = getBangkokStartOfDay(now);
    const endOfToday = getBangkokEndOfDay(now);

    // 1. ดึงรายการขอเบิกวัสดุสิ้นเปลืองที่อนุมัติแล้ว (APPROVED)
    const requisitions = await prisma.requisitionRequest.findMany({
      where: { status: 'APPROVED' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            prefix: true,
            studentId: true,
            department: true,
            phone: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            instructorName: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            prefix: true,
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                usageUnit: true,
                conversionRatio: true,
                location: true,
                storageLocation: {
                  select: {
                    id: true,
                    name: true,
                    building: true,
                    floor: true,
                    room: true,
                  },
                },
                stockLots: {
                  where: { quantityRemaining: { gt: 0 } },
                  orderBy: { expiryDate: 'asc' },
                  select: {
                    id: true,
                    lotNumber: true,
                    quantityRemaining: true,
                    expiryDate: true,
                    unitCost: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { dateNeeded: 'asc' },
    });

    // 2. ดึงรายการขอยืมครุภัณฑ์ที่อนุมัติแล้วและรอนัดรับ (APPROVED)
    const borrows = await prisma.borrowRequest.findMany({
      where: { status: 'APPROVED' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            prefix: true,
            studentId: true,
            department: true,
            phone: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            instructorName: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            prefix: true,
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                location: true,
                storageLocation: {
                  select: {
                    id: true,
                    name: true,
                    building: true,
                    floor: true,
                    room: true,
                  },
                },
                assets: {
                  where: { status: 'AVAILABLE' },
                  select: {
                    id: true,
                    assetCode: true,
                    serialNumber: true,
                    status: true,
                    storageLocation: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
            asset: {
              select: {
                id: true,
                assetCode: true,
                serialNumber: true,
              },
            },
          },
        },
      },
      orderBy: { borrowDate: 'asc' },
    });

    // แปลงข้อมูลให้อยู่ในโครงสร้างเดียวกัน (Unified Dispense Queue)
    const unifiedQueue: any[] = [];

    for (const r of requisitions) {
      const scheduledDate = r.dateNeeded ? new Date(r.dateNeeded) : new Date(r.createdAt);
      const isToday = scheduledDate >= startOfToday && scheduledDate <= endOfToday;
      const isOverdue = scheduledDate < startOfToday;

      unifiedQueue.push({
        id: r.id,
        type: 'REQUISITION',
        typeLabel: 'วัสดุสิ้นเปลือง',
        requestNumber: r.requestNumber,
        scheduledDate: scheduledDate.toISOString(),
        isToday,
        isOverdue,
        user: r.user,
        course: r.course,
        purpose: r.purpose || 'เบิกใช้งานตามรายวิชา/ปฏิบัติการ',
        approver: r.approver,
        approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        totalItemsCount: r.items.length,
        items: r.items.map((it: any) => {
          const totalStock = (it.item?.stockLots || []).reduce((acc: number, lot: any) => acc + (lot.quantityRemaining || 0), 0);
          return {
            id: it.id,
            itemId: it.itemId,
            name: it.item?.name || 'วัสดุสิ้นเปลือง',
            code: it.item?.code || '-',
            quantityRequested: it.quantityRequested,
            unit: it.item?.unit || 'หน่วย',
            requestedUnit: it.requestedUnit || it.item?.unit || 'หน่วย',
            isSubUnit: it.isSubUnit,
            conversionRatio: it.item?.conversionRatio || 1,
            usageUnit: it.item?.usageUnit,
            currentStock: totalStock,
            location: it.item?.location,
            storageLocation: it.item?.storageLocation,
            stockLots: it.item?.stockLots || [],
          };
        }),
      });
    }

    for (const b of borrows) {
      const scheduledDate = b.borrowDate ? new Date(b.borrowDate) : new Date(b.createdAt);
      const isToday = scheduledDate >= startOfToday && scheduledDate <= endOfToday;
      const isOverdue = scheduledDate < startOfToday;

      unifiedQueue.push({
        id: b.id,
        type: 'BORROW',
        typeLabel: 'ยืมครุภัณฑ์',
        requestNumber: b.requestNumber,
        scheduledDate: scheduledDate.toISOString(),
        expectedReturnDate: b.expectedReturnDate ? b.expectedReturnDate.toISOString() : null,
        isToday,
        isOverdue,
        user: b.user,
        course: b.course,
        purpose: b.purpose || 'ยืมอุปกรณ์ฝึกทักษะ/ปฏิบัติการ',
        approver: b.approver,
        approvedAt: b.approvedAt ? b.approvedAt.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
        totalItemsCount: b.items.length,
        items: b.items.map((it: any) => {
          const totalAvailableAssets = (it.item?.assets || []).length;
          return {
            id: it.id,
            itemId: it.itemId,
            name: it.item?.name || 'ครุภัณฑ์',
            code: it.item?.code || '-',
            quantityRequested: it.quantity,
            unit: it.item?.unit || 'ชิ้น',
            currentStock: totalAvailableAssets,
            location: it.item?.location,
            storageLocation: it.item?.storageLocation,
            availableAssets: it.item?.assets || [],
            assignedAsset: it.asset || null,
          };
        }),
      });
    }

    // จัดเรียง: รายการที่เลยกำหนดนัดหรือถึงกำหนดนัดวันนี้ขึ้นก่อน ตามด้วยวันที่นัดหมายจากน้อยไปมาก
    unifiedQueue.sort((a, b) => {
      const getPriority = (item: any) => {
        if (item.isOverdue) return 1;
        if (item.isToday) return 2;
        return 3;
      };
      const pDiff = getPriority(a) - getPriority(b);
      if (pDiff !== 0) return pDiff;
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    });

    const summary = {
      totalPending: unifiedQueue.length,
      todayCount: unifiedQueue.filter((q) => q.isToday).length,
      overdueCount: unifiedQueue.filter((q) => q.isOverdue).length,
      upcomingCount: unifiedQueue.filter((q) => !q.isToday && !q.isOverdue).length,
      requisitionsCount: requisitions.length,
      borrowsCount: borrows.length,
    };

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary,
      queue: unifiedQueue,
    });
  } catch (error: any) {
    console.error('Dispense queue API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
