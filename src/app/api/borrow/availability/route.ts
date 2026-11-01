import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBangkokDateTime } from '@/lib/date-time-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const borrowDateStr = searchParams.get('borrowDate');
    const returnDateStr = searchParams.get('expectedReturnDate') || searchParams.get('returnDate');
    const excludeRequestId = searchParams.get('excludeRequestId');
    const itemIdsParam = searchParams.get('itemIds');
    const isSimulate = searchParams.get('simulate') === 'true';

    if (!borrowDateStr || !returnDateStr) {
      return NextResponse.json(
        { error: 'ต้องระบุ borrowDate และ expectedReturnDate' },
        { status: 400 }
      );
    }

    const startDateTime = parseBangkokDateTime(borrowDateStr);
    const endDateTime = parseBangkokDateTime(returnDateStr);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json(
        { error: 'รูปแบบวันเวลาไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    if (endDateTime <= startDateTime) {
      return NextResponse.json(
        { error: 'วันเวลาคืนต้องมากกว่าวันเวลาที่เริ่มยืม' },
        { status: 400 }
      );
    }

    // Condition for active overlapping requests:
    // Existing request overlaps with requested window if:
    // existing.borrowDate <= requested.endDateTime AND existing.expectedReturnDate >= requested.startDateTime
    // AND status IN ['PENDING', 'APPROVED', 'BORROWED']
    const whereOverlapping: any = {
      status: { in: ['PENDING', 'APPROVED', 'BORROWED'] },
      borrowDate: { lte: endDateTime },
      expectedReturnDate: { gte: startDateTime },
    };

    if (excludeRequestId) {
      whereOverlapping.id = { not: excludeRequestId };
    }

    // Filter items if specific itemIds are provided
    let itemFilter: any = { status: 'ACTIVE' };
    if (itemIdsParam) {
      const ids = itemIdsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        itemFilter.id = { in: ids };
      }
    }

    // Fetch overlapping requests with their borrow items and items with capacity
    const [overlappingRequests, items] = await Promise.all([
      prisma.borrowRequest.findMany({
        where: whereOverlapping,
        select: {
          id: true,
          requestNumber: true,
          borrowDate: true,
          expectedReturnDate: true,
          status: true,
          purpose: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          items: {
            select: {
              itemId: true,
              quantity: true,
            },
          },
        },
      }),
      prisma.item.findMany({
        where: itemFilter,
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          unit: true,
          assets: {
            where: { status: 'AVAILABLE' },
            select: { id: true, assetCode: true },
          },
        },
      }),
    ]);

    // Aggregate reservations per itemId
    const reservationMap = new Map<
      string,
      {
        totalReserved: number;
        conflicts: Array<{
          requestId: string;
          requestNumber: string;
          borrowDate: Date;
          expectedReturnDate: Date;
          status: string;
          purpose: string;
          requesterName: string;
          requesterRole: string;
          quantity: number;
        }>;
      }
    >();

    for (const bReq of overlappingRequests) {
      for (const bItem of bReq.items) {
        const cur = reservationMap.get(bItem.itemId) || { totalReserved: 0, conflicts: [] };
        cur.totalReserved += bItem.quantity;
        cur.conflicts.push({
          requestId: bReq.id,
          requestNumber: bReq.requestNumber,
          borrowDate: bReq.borrowDate,
          expectedReturnDate: bReq.expectedReturnDate,
          status: bReq.status,
          purpose: bReq.purpose,
          requesterName: bReq.user.name,
          requesterRole: bReq.user.role,
          quantity: bItem.quantity,
        });
        reservationMap.set(bItem.itemId, cur);
      }
    }

    // Optional Demo / Playground Conflict Injection:
    if (isSimulate) {
      const demoItems = items.filter(
        (it) =>
          it.type === 'EQUIPMENT' &&
          (it.code === 'EQ-AI-0001' ||
            it.code === 'EQ-MED-0001' ||
            it.code === 'EQ-BRE-0001' ||
            it.code === 'EQ-URC-0011' ||
            it.assets.length > 0)
      );

      // Inject simulated overlapping requests for the first 3 equipment items
      demoItems.slice(0, 3).forEach((dItem, idx) => {
        const cur = reservationMap.get(dItem.id) || { totalReserved: 0, conflicts: [] };
        const simQty = idx === 0 ? Math.max(1, dItem.assets.length) : 1; // 1st is full, rest are partial
        cur.totalReserved += simQty;
        cur.conflicts.push({
          requestId: `sim-conflict-${idx + 1}`,
          requestNumber: `BR-202611-SIM0${idx + 1}`,
          borrowDate: startDateTime,
          expectedReturnDate: endDateTime,
          status: idx === 0 ? 'BORROWED' : 'APPROVED',
          purpose:
            idx === 0
              ? 'ฝึกซ้อมหัตถการกู้ชีพฉุกเฉินประจำกลุ่ม'
              : 'ใช้ประกอบการสอนภาคปฏิบัติการพยาบาล',
          requesterName:
            idx === 0 ? 'นิสิตกลุ่ม 4 (พยาบาลศาสตร์ ชั้นปีที่ 2)' : 'อาจารย์ประจำกลุ่มวิชา',
          requesterRole: idx === 0 ? 'USER' : 'INSTRUCTOR',
          quantity: simQty,
        });
        reservationMap.set(dItem.id, cur);
      });
    }

    // Build availability report for each item
    const availability = items.map((item) => {
      const physicalCapacity = item.type === 'EQUIPMENT' ? item.assets.length : 999;
      const resData = reservationMap.get(item.id) || { totalReserved: 0, conflicts: [] };
      const reservedCount = resData.totalReserved;
      const availableNow = Math.max(0, physicalCapacity - reservedCount);

      let conflictStatus: 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'FULL' = 'AVAILABLE';
      if (item.type === 'EQUIPMENT') {
        if (physicalCapacity === 0 || availableNow <= 0) {
          conflictStatus = 'FULL';
        } else if (reservedCount > 0) {
          conflictStatus = 'PARTIALLY_AVAILABLE';
        }
      }

      return {
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        type: item.type,
        unit: item.unit,
        physicalCapacity,
        reservedCount,
        availableNow,
        conflictStatus,
        conflicts: resData.conflicts,
      };
    });

    // Create a fast map keyed by itemId for O(1) frontend lookups
    const availabilityMap: Record<string, (typeof availability)[0]> = {};
    for (const a of availability) {
      availabilityMap[a.itemId] = a;
    }

    return NextResponse.json({
      timeWindow: {
        borrowDate: startDateTime.toISOString(),
        expectedReturnDate: endDateTime.toISOString(),
      },
      totalChecked: items.length,
      availability,
      availabilityMap,
    });
  } catch (error: any) {
    console.error('Failed to check borrow availability:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการตรวจสอบสต็อกและเวลาซ้อนทับ' },
      { status: 500 }
    );
  }
}
