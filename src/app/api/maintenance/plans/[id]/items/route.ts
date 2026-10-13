import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST: บันทึกผลการตรวจเช็กชิ้นอุปกรณ์ในแผนงาน (Audit Item)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const body = await req.json();
    const {
      assetId,
      assetCode,
      status = 'CHECKED', // "CHECKED", "NOT_FOUND", "SKIPPED"
      result = 'PASS', // "PASS", "PASS_WITH_NOTE", "FAIL"
      checklistData,
      notes,
      checkedById,
      intervalDays,
    } = body;

    const plan = await prisma.inspectionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'ไม่พบแผนงาน' }, { status: 404 });
    }

    // ค้นหา Asset
    let targetAsset = null;
    if (assetId) {
      targetAsset = await prisma.equipmentAsset.findUnique({
        where: { id: assetId },
        include: { item: true },
      });
    } else if (assetCode) {
      targetAsset = await prisma.equipmentAsset.findFirst({
        where: {
          OR: [
            { assetCode: { equals: assetCode.trim(), mode: 'insensitive' } },
            { govAssetCode: { equals: assetCode.trim(), mode: 'insensitive' } },
          ],
        },
        include: { item: true },
      });
    }

    if (!targetAsset) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลอุปกรณ์' }, { status: 404 });
    }

    // ค้นหาหรือสร้าง InspectionPlanItem ในแผนงานนี้
    let planItem = await prisma.inspectionPlanItem.findUnique({
      where: {
        planId_assetId: {
          planId,
          assetId: targetAsset.id,
        },
      },
    });

    // หากชิ้นนี้อยู่นอก scope เดิมของแผน ให้เพิ่มเข้ามาอัตโนมัติ (Ad-hoc addition to campaign)
    if (!planItem) {
      planItem = await prisma.inspectionPlanItem.create({
        data: {
          planId,
          assetId: targetAsset.id,
          status: 'PENDING',
        },
      });
    }

    const now = new Date();

    // 1. กรณี: ตรวจพบและบันทึกผลสภาพ (CHECKED)
    if (status === 'CHECKED') {
      const pmInterval = Number(intervalDays) > 0 ? Number(intervalDays) : (targetAsset.inspectionIntervalDays || 30);
      const nextDue = new Date(now);
      nextDue.setDate(now.getDate() + pmInterval);

      // สร้าง InspectionLog บันทึกประวัติสุขภาพถาวรของตัวเครื่อง
      const log = await prisma.inspectionLog.create({
        data: {
          assetId: targetAsset.id,
          inspectorId: checkedById,
          inspectionType: plan.planType,
          inspectionDate: now,
          result,
          checklistData: typeof checklistData === 'object' ? JSON.stringify(checklistData) : checklistData || null,
          notes: notes ? `[แผนงาน: ${plan.title}] ${notes}` : `[แผนงาน: ${plan.title}]`,
          nextDueAt: nextDue,
        },
      });

      // อัปเดตรอบ PM ของตัวเครื่องเดี่ยวอัตโนมัติ (ซิงค์ข้ามระบบ)
      const assetUpdateData: any = {
        lastInspectedAt: now,
        nextInspectionDue: nextDue,
        inspectionIntervalDays: pmInterval,
      };

      if (result === 'FAIL') {
        assetUpdateData.status = 'MAINTENANCE';
        assetUpdateData.condition = 'DAMAGED';
        assetUpdateData.note = `ตรวจในแผนงาน "${plan.title}" ไม่ผ่าน: ${notes || 'ชำรุดรอซ่อม'}`;

        // สร้างใบส่งซ่อมให้อัตโนมัติ
        await prisma.maintenanceLog.create({
          data: {
            assetId: targetAsset.id,
            issue: `ตรวจพบชำรุดในแผนงาน "${plan.title}": ${notes || 'การทำงานไม่ผ่านเกณฑ์'}`,
            status: 'UNDER_REPAIR',
            handledById: checkedById,
            technicianNote: 'แจ้งซ่อมอัตโนมัติจากการตรวจนับ/ตรวจสภาพตามวาระ',
          },
        });
      }

      await prisma.equipmentAsset.update({
        where: { id: targetAsset.id },
        data: assetUpdateData,
      });

      // อัปเดต InspectionPlanItem
      const updatedItem = await prisma.inspectionPlanItem.update({
        where: { id: planItem.id },
        data: {
          status: 'CHECKED',
          result,
          checkedAt: now,
          checkedById: checkedById || null,
          inspectionLogId: log.id,
          notes: notes || null,
        },
        include: {
          asset: { include: { item: true } },
          checkedBy: { select: { id: true, name: true } },
        },
      });

      // ถ้าแผนงานยังเป็น DRAFT หรือ SCHEDULED ให้เปลี่ยนเป็น IN_PROGRESS ทันที
      if (plan.status === 'DRAFT' || plan.status === 'SCHEDULED') {
        await prisma.inspectionPlan.update({
          where: { id: planId },
          data: {
            status: 'IN_PROGRESS',
            startDate: plan.startDate || now,
          },
        });
      }

      return NextResponse.json({ success: true, item: updatedItem, inspectionLog: log });
    }

    // 2. กรณี: ไม่พบตัวเครื่อง (NOT_FOUND) หรือ ข้าม (SKIPPED)
    const updatedItem = await prisma.inspectionPlanItem.update({
      where: { id: planItem.id },
      data: {
        status,
        result: null,
        checkedAt: now,
        checkedById: checkedById || null,
        notes: notes || (status === 'NOT_FOUND' ? 'ไม่พบตัวเครื่องขณะเดินตรวจ' : null),
      },
      include: {
        asset: { include: { item: true } },
        checkedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: any) {
    console.error('Failed to record plan item audit:', error);
    return NextResponse.json({ error: error.message || 'Failed to record audit' }, { status: 500 });
  }
}
