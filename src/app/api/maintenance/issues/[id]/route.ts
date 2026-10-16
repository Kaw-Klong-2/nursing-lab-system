import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

// PUT: เจ้าหน้าที่จัดการเรื่องแจ้งปัญหา (รับเรื่อง, ส่งซ่อม, ปิดเรื่อง)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, actionNote, userId, repairShop, repairCost } = body;

    const issue = await prisma.equipmentIssueReport.findUnique({
      where: { id },
      include: { asset: { include: { item: true } } },
    });

    if (!issue) {
      return NextResponse.json({ error: 'ไม่พบรายการแจ้งปัญหา' }, { status: 404 });
    }

    // 1. รับเรื่อง (ACKNOWLEDGE)
    if (action === 'ACKNOWLEDGE') {
      const updated = await prisma.equipmentIssueReport.update({
        where: { id },
        data: {
          status: 'ACKNOWLEDGED',
          actionNote: actionNote || 'เจ้าหน้าที่รับเรื่องเรียบร้อย กำลังเข้าตรวจสอบ',
          resolvedById: userId || null,
        },
      });
      await logActivity({
        userId: userId || null,
        action: 'UPDATE',
        entityType: 'ITEM',
        entityId: issue.assetId,
        entityTitle: `${issue.reportNumber} (${issue.asset.assetCode})`,
        details: `รับเรื่องแจ้งปัญหาครุภัณฑ์ ${issue.asset.assetCode}: ${actionNote || 'กำลังเข้าตรวจสอบ'}`,
      });
      return NextResponse.json({ success: true, report: updated });
    }

    // 2. ส่งซ่อมบำรุงต่อ (SEND_TO_REPAIR)
    if (action === 'SEND_TO_REPAIR') {
      // ปรับสถานะ Asset เป็น MAINTENANCE
      await prisma.equipmentAsset.update({
        where: { id: issue.assetId },
        data: {
          status: 'MAINTENANCE',
          condition: 'DAMAGED',
          note: `ส่งซ่อมจากเรื่องแจ้ง ${issue.reportNumber}: ${issue.issueDescription}`,
        },
      });

      // สร้างบันทึกส่งซ่อม MaintenanceLog
      await prisma.maintenanceLog.create({
        data: {
          assetId: issue.assetId,
          issue: issue.issueDescription,
          repairShop: repairShop || 'ศูนย์ซ่อมบำรุง / บริษัทผู้ผลิต',
          repairCost: Number(repairCost) || 0,
          status: 'UNDER_REPAIR',
          handledById: userId || null,
          technicianNote: actionNote || 'ส่งซ่อมจากเรื่องที่ได้รับแจ้งผ่าน QR Code',
        },
      });

      const updated = await prisma.equipmentIssueReport.update({
        where: { id },
        data: {
          status: 'SENT_TO_REPAIR',
          actionNote: actionNote || `ส่งซ่อมเรียบร้อย (${repairShop || 'ช่างประจำคณะ'})`,
          resolvedById: userId || null,
        },
      });

      invalidateCache('items:');
      invalidateCache('dashboard:');

      await logActivity({
        userId: userId || null,
        action: 'UPDATE',
        entityType: 'ITEM',
        entityId: issue.assetId,
        entityTitle: `${issue.reportNumber} (${issue.asset.assetCode})`,
        details: `ส่งซ่อมครุภัณฑ์จากใบแจ้งปัญหา ${issue.reportNumber} (${issue.asset.assetCode})`,
      });

      return NextResponse.json({ success: true, report: updated });
    }

    // 3. ปิดเรื่อง/แก้ไขเสร็จสิ้น (RESOLVE)
    if (action === 'RESOLVE') {
      const updated = await prisma.equipmentIssueReport.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          actionNote: actionNote || 'ตรวจสอบและแก้ไขปัญหาเรียบร้อยแล้ว อุปกรณ์พร้อมใช้งาน',
          resolvedById: userId || null,
          resolvedAt: new Date(),
        },
      });

      // ถ้าชิ้นนี้เคยถูกระงับใช้ ให้คืนเป็น AVAILABLE
      if (issue.asset.status === 'MAINTENANCE') {
        await prisma.equipmentAsset.update({
          where: { id: issue.assetId },
          data: {
            status: 'AVAILABLE',
            condition: 'GOOD',
            note: `แก้ไขปัญหา ${issue.reportNumber} เรียบร้อย พร้อมใช้งาน`,
          },
        });
      }

      invalidateCache('items:');
      invalidateCache('dashboard:');

      await logActivity({
        userId: userId || null,
        action: 'UPDATE',
        entityType: 'ITEM',
        entityId: issue.assetId,
        entityTitle: `${issue.reportNumber} (${issue.asset.assetCode})`,
        details: `ปิดเรื่องแจ้งปัญหา ${issue.reportNumber} (${issue.asset.assetCode}) อุปกรณ์พร้อมใช้งาน`,
      });

      return NextResponse.json({ success: true, report: updated });
    }

    // 4. ปฏิเสธเรื่อง (REJECT)
    if (action === 'REJECT') {
      const updated = await prisma.equipmentIssueReport.update({
        where: { id },
        data: {
          status: 'REJECTED',
          actionNote: actionNote || 'ตรวจสอบแล้วไม่พบความเสียหาย หรือเป็นลักษณะการทำงานปกติ',
          resolvedById: userId || null,
          resolvedAt: new Date(),
        },
      });

      await logActivity({
        userId: userId || null,
        action: 'REJECT',
        entityType: 'ITEM',
        entityId: issue.assetId,
        entityTitle: `${issue.reportNumber} (${issue.asset.assetCode})`,
        details: `ปฏิเสธเรื่องแจ้งปัญหา ${issue.reportNumber} (${issue.asset.assetCode})`,
      });

      return NextResponse.json({ success: true, report: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to update issue report:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}
