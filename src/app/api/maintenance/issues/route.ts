import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyRoles } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// GET: ดึงรายการเรื่องแจ้งปัญหาอุปกรณ์
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const assetId = searchParams.get('assetId');
    const urgency = searchParams.get('urgency');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (assetId) where.assetId = assetId;
    if (urgency && urgency !== 'ALL') where.urgency = urgency;

    const reports = await prisma.equipmentIssueReport.findMany({
      where,
      include: {
        asset: {
          include: {
            item: true,
            storageLocation: true,
          },
        },
        resolvedBy: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: [
        { urgency: 'desc' }, // CRITICAL first, then URGENT, then NORMAL
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error('Failed to get issue reports:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch issues' }, { status: 500 });
  }
}

// POST: นิสิต หรือ อาจารย์ สแกน QR แจ้งปัญหาด่วน (ไม่ต้องเข้าสู่ระบบ)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      assetId,
      assetCode,
      reporterName,
      reporterRole = 'STUDENT',
      contactPhone,
      issueDescription,
      urgency = 'NORMAL',
      photoUrl,
    } = body;

    if (!issueDescription || (!assetId && !assetCode)) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสอุปกรณ์และรายละเอียดอาการชำรุด' },
        { status: 400 }
      );
    }

    // ค้นหา Asset
    let targetAsset = null;
    if (assetId) {
      targetAsset = await prisma.equipmentAsset.findUnique({
        where: { id: assetId },
        include: { item: true },
      });
    } else if (assetCode) {
      targetAsset = await prisma.equipmentAsset.findUnique({
        where: { assetCode },
        include: { item: true },
      });
    }

    if (!targetAsset) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลอุปกรณ์ในระบบ' }, { status: 404 });
    }

    // สร้างรหัสรายงานปัญหา เช่น REP-25691013-001
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const datePart = `${thaiYear}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const countToday = await prisma.equipmentIssueReport.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        },
      },
    });

    const reportNumber = `REP-${datePart}-${String(countToday + 1).padStart(3, '0')}`;

    // บันทึกรายการแจ้งปัญหา
    const report = await prisma.equipmentIssueReport.create({
      data: {
        reportNumber,
        assetId: targetAsset.id,
        reporterName: reporterName || (reporterRole === 'STUDENT' ? 'นิสิต (ไม่ระบุชื่อ)' : 'ผู้ใช้งาน'),
        reporterRole,
        contactPhone: contactPhone || null,
        issueDescription,
        urgency: ['NORMAL', 'URGENT', 'CRITICAL'].includes(urgency) ? urgency : 'NORMAL',
        photoUrl: photoUrl || null,
        status: 'PENDING',
      },
      include: {
        asset: {
          include: { item: true },
        },
      },
    });

    // หากแจ้งเป็นระดับวิกฤติ (CRITICAL) ให้ปรับสถานะอุปกรณ์เป็น MAINTENANCE ทันทีเพื่อความปลอดภัย
    if (urgency === 'CRITICAL') {
      await prisma.equipmentAsset.update({
        where: { id: targetAsset.id },
        data: {
          status: 'MAINTENANCE',
          condition: 'DAMAGED',
          note: `ระงับใช้ชั่วคราว: ได้รับแจ้งปัญหาด่วน (${issueDescription})`,
        },
      });
    }

    // ส่ง Notification แจ้งเตือนนักวิทยาศาสตร์และเจ้าหน้าที่
    const roleThai = reporterRole === 'STUDENT' ? 'นิสิต' : reporterRole === 'TEACHER' ? 'อาจารย์' : 'ผู้ใช้งาน';
    const urgencyLabel = urgency === 'CRITICAL' ? '🔴 วิกฤติ' : urgency === 'URGENT' ? '🟡 ด่วน' : 'ปกติ';

    try {
      await notifyRoles(['OFFICER', 'ADMIN'], {
        title: `📢 แจ้งปัญหาอุปกรณ์: ${targetAsset.assetCode} (${urgencyLabel})`,
        message: `${roleThai} ${reporterName || ''} แจ้งปัญหา "${targetAsset.item.name}" (${targetAsset.assetCode}): ${issueDescription}`,
        type: 'MAINTENANCE',
        priority: urgency === 'CRITICAL' ? 'URGENT' : urgency === 'URGENT' ? 'HIGH' : 'NORMAL',
        linkUrl: `/maintenance?tab=issues&id=${report.id}`,
        entityType: 'ITEM',
        entityId: targetAsset.id,
      });
    } catch (e) {
      console.warn('Failed to send issue notification:', e);
    }

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to submit equipment issue:', error);
    return NextResponse.json({ error: error.message || 'Submission failed' }, { status: 500 });
  }
}
