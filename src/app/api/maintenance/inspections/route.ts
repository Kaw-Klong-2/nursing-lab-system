import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: ดึงประวัติการตรวจเช็กสภาพอุปกรณ์
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('assetId');
    const result = searchParams.get('result');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const where: any = {};
    if (assetId) where.assetId = assetId;
    if (result && result !== 'ALL') where.result = result;

    const inspections = await prisma.inspectionLog.findMany({
      where,
      include: {
        asset: {
          include: {
            item: true,
            storageLocation: true,
          },
        },
        inspector: {
          select: { id: true, name: true, role: true, email: true },
        },
      },
      orderBy: { inspectionDate: 'desc' },
      take: limit,
    });

    return NextResponse.json(inspections);
  } catch (error: any) {
    console.error('Failed to get inspections:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch inspections' }, { status: 500 });
  }
}

// POST: บันทึกผลการตรวจเช็กสภาพตามรอบ (Preventive Maintenance)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      assetId,
      inspectorId,
      inspectionType = 'ROUTINE',
      result, // "PASS", "PASS_WITH_NOTE", "FAIL"
      checklistData,
      photoUrl,
      notes,
      intervalDays: customInterval,
    } = body;

    if (!assetId || !inspectorId || !result) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสอุปกรณ์, ผู้ตรวจ, และผลการตรวจ' },
        { status: 400 }
      );
    }

    const asset = await prisma.equipmentAsset.findUnique({
      where: { id: assetId },
      include: { item: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'ไม่พบอุปกรณ์ที่ต้องการตรวจ' }, { status: 404 });
    }

    // คำนวณวันกำหนดตรวจรอบถัดไป (ใช้ค่าที่เลือกใหม่ หรือค่าเดิมของอุปกรณ์)
    const intervalDays = Number(customInterval) > 0 ? Number(customInterval) : (asset.inspectionIntervalDays || 30);
    const now = new Date();
    const nextDue = new Date(now);
    nextDue.setDate(now.getDate() + intervalDays);

    // บันทึก InspectionLog
    const log = await prisma.inspectionLog.create({
      data: {
        assetId,
        inspectorId,
        inspectionType,
        inspectionDate: now,
        result,
        checklistData: typeof checklistData === 'object' ? JSON.stringify(checklistData) : checklistData || null,
        photoUrl: photoUrl || null,
        notes: notes || null,
        nextDueAt: nextDue,
      },
      include: {
        asset: { include: { item: true } },
        inspector: { select: { id: true, name: true } },
      },
    });

    // อัปเดตสถานะของ EquipmentAsset
    const assetUpdateData: any = {
      lastInspectedAt: now,
      nextInspectionDue: nextDue,
      inspectionIntervalDays: intervalDays,
    };

    if (result === 'FAIL') {
      // หากไม่ผ่าน ปรับเป็น MAINTENANCE ทันทีเพื่อความปลอดภัย
      assetUpdateData.status = 'MAINTENANCE';
      assetUpdateData.condition = 'DAMAGED';
      assetUpdateData.note = `ตรวจสภาพไม่ผ่าน (${notes || 'ชำรุดรอซ่อม'})`;

      // สร้างบันทึกส่งซ่อม MaintenanceLog อัตโนมัติ
      await prisma.maintenanceLog.create({
        data: {
          assetId,
          issue: notes || 'ตรวจสภาพเชิงป้องกันไม่ผ่านเกณฑ์มาตรฐาน',
          repairShop: 'รอจัดส่งซ่อม / ตรวจเช็กภายใน',
          status: 'UNDER_REPAIR',
          handledById: inspectorId,
          technicianNote: 'ตรวจพบความเสียหายจากการตรวจเช็กตามรอบ',
        },
      });
    } else if (result === 'PASS_WITH_NOTE') {
      assetUpdateData.condition = 'FAIR';
      if (notes) assetUpdateData.note = `ข้อสังเกตจากการตรวจ: ${notes}`;
    } else if (result === 'PASS') {
      assetUpdateData.condition = 'GOOD';
      assetUpdateData.note = `ผ่านการตรวจสภาพเรียบร้อยเมื่อ ${now.toLocaleDateString('th-TH')}`;
    }

    const updatedAsset = await prisma.equipmentAsset.update({
      where: { id: assetId },
      data: assetUpdateData,
      include: { item: true },
    });

    return NextResponse.json({ success: true, log, asset: updatedAsset }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to submit inspection:', error);
    return NextResponse.json({ error: error.message || 'Inspection recording failed' }, { status: 500 });
  }
}
