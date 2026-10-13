import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: ดึงรายการ Equipment Assets ทั้งหมดพร้อมสถานะ PM และงานซ่อม
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pmStatus = searchParams.get('pmStatus'); // OVERDUE, DUE_SOON, OK, NEVER, or all
    const assetStatus = searchParams.get('assetStatus'); // AVAILABLE, MAINTENANCE, BORROWED, or all
    const search = searchParams.get('search')?.trim();

    const where: any = {};
    if (assetStatus && assetStatus !== 'ALL') {
      where.status = assetStatus;
    }

    if (search) {
      where.OR = [
        { assetCode: { contains: search, mode: 'insensitive' } },
        { govAssetCode: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.equipmentAsset.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            category: { select: { id: true, name: true } },
          },
        },
        storageLocation: {
          select: { id: true, code: true, name: true, roomName: true },
        },
        maintenanceLogs: {
          where: { status: 'UNDER_REPAIR' },
          orderBy: { sentDate: 'desc' },
          take: 1,
        },
        inspectionLogs: {
          orderBy: { inspectionDate: 'desc' },
          take: 1,
          include: {
            inspector: { select: { name: true } },
          },
        },
        issueReports: {
          where: { status: { in: ['PENDING', 'ACKNOWLEDGED', 'SENT_TO_REPAIR'] } },
          select: { id: true, urgency: true, status: true },
        },
      },
      orderBy: [
        { item: { name: 'asc' } },
        { sequenceNumber: 'asc' },
      ],
    });

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(now.getDate() + 7);

    // Calculate PM status for each asset
    const formatted = assets.map((a) => {
      let currentPmStatus: 'OVERDUE' | 'DUE_SOON' | 'OK' | 'NEVER' = 'NEVER';

      if (!a.nextInspectionDue && !a.lastInspectedAt) {
        currentPmStatus = 'NEVER';
      } else if (a.nextInspectionDue && new Date(a.nextInspectionDue) < now) {
        currentPmStatus = 'OVERDUE';
      } else if (a.nextInspectionDue && new Date(a.nextInspectionDue) <= in7Days) {
        currentPmStatus = 'DUE_SOON';
      } else {
        currentPmStatus = 'OK';
      }

      return {
        id: a.id,
        assetCode: a.assetCode,
        govAssetCode: a.govAssetCode,
        sequenceNumber: a.sequenceNumber,
        brand: a.brand,
        model: a.model,
        serialNumber: a.serialNumber,
        location: a.location || a.storageLocation?.name || 'ห้องปฏิบัติการพยาบาล',
        status: a.status,
        condition: a.condition,
        cost: a.cost,
        lastInspectedAt: a.lastInspectedAt,
        nextInspectionDue: a.nextInspectionDue,
        inspectionIntervalDays: a.inspectionIntervalDays,
        pmStatus: currentPmStatus,
        item: a.item,
        storageLocation: a.storageLocation,
        activeMaintenance: a.maintenanceLogs[0] || null,
        lastInspection: a.inspectionLogs[0] || null,
        activeIssuesCount: a.issueReports.length,
        hasCriticalIssue: a.issueReports.some((r) => r.urgency === 'CRITICAL'),
      };
    });

    // Optional filter by pmStatus in memory
    let filtered = formatted;
    if (pmStatus && pmStatus !== 'ALL') {
      filtered = formatted.filter((a) => a.pmStatus === pmStatus);
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error('Failed to get maintenance assets:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch assets' }, { status: 500 });
  }
}

// PUT: ตั้งค่ารอบความถี่การตรวจเช็ก (inspectionIntervalDays)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { assetId, itemId, intervalDays } = body;

    const days = parseInt(intervalDays, 10);
    if (isNaN(days) || days <= 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุจำนวนวันรอบตรวจที่ถูกต้อง (เช่น 15, 30, 60, 90 วัน)' },
        { status: 400 }
      );
    }

    if (assetId) {
      const asset = await prisma.equipmentAsset.findUnique({ where: { id: assetId } });
      if (!asset) return NextResponse.json({ error: 'ไม่พบอุปกรณ์' }, { status: 404 });

      // คำนวณ nextDue ใหม่หากมีวันตรวจล่าสุด
      let nextDue = asset.nextInspectionDue;
      if (asset.lastInspectedAt) {
        nextDue = new Date(asset.lastInspectedAt);
        nextDue.setDate(nextDue.getDate() + days);
      }

      const updated = await prisma.equipmentAsset.update({
        where: { id: assetId },
        data: {
          inspectionIntervalDays: days,
          nextInspectionDue: nextDue,
        },
      });

      return NextResponse.json({ success: true, updatedCount: 1, asset: updated });
    }

    if (itemId) {
      const result = await prisma.equipmentAsset.updateMany({
        where: { itemId },
        data: {
          inspectionIntervalDays: days,
        },
      });

      return NextResponse.json({ success: true, updatedCount: result.count });
    }

    return NextResponse.json({ error: 'กรุณาระบุ assetId หรือ itemId' }, { status: 400 });
  } catch (error: any) {
    console.error('Update inspection interval error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update interval' }, { status: 500 });
  }
}

