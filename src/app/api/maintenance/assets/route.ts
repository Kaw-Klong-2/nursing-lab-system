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
