import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { logActivity } from '@/lib/activity-log';
import { formatUserName } from '@/lib/user-utils';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ดำเนินการ กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const staffUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, prefix: true, role: true },
    });

    if (!staffUser || (staffUser.role !== 'OFFICER' && staffUser.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'เฉพาะเจ้าหน้าที่ห้องแล็บหรือผู้ดูแลระบบเท่านั้นที่สามารถส่งแจ้งเตือนเตือนความจำได้' },
        { status: 403 }
      );
    }

    const borrow = await prisma.borrowRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, prefix: true } },
        items: {
          include: {
            item: { select: { name: true } },
          },
        },
      },
    });

    if (!borrow) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลคำขอยืมครุภัณฑ์' },
        { status: 404 }
      );
    }

    if (borrow.status !== 'BORROWED') {
      return NextResponse.json(
        { error: 'คำขอนี้ไม่ได้อยู่ในสถานะกำลังยืม ไม่สามารถส่งเตือนคืนได้' },
        { status: 400 }
      );
    }

    const now = new Date();
    const isOverdue = new Date(borrow.expectedReturnDate) < now;
    const returnDateFormatted = new Date(borrow.expectedReturnDate).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const itemNames = borrow.items.map((i) => i.item?.name).filter(Boolean).join(', ');
    const staffName = formatUserName(staffUser);
    const studentName = formatUserName(borrow.user);

    // 1. Send In-app + Push Notification to Student
    await createNotification({
      userId: borrow.userId,
      title: isOverdue ? '⚠️ แจ้งเตือนด่วน: ครุภัณฑ์ค้างส่งคืนเกินกำหนด' : '⏰ แจ้งเตือน: กำหนดส่งคืนครุภัณฑ์ห้องแล็บ',
      message: isOverdue
        ? `เจ้าหน้าที่ (${staffName}) แจ้งเตือน: คำขอเลขที่ ${borrow.requestNumber} (${itemNames}) เกินกำหนดส่งคืนเมื่อ ${returnDateFormatted} กรุณานำส่งคืนที่ห้องปฏิบัติการโดยด่วน`
        : `เจ้าหน้าที่ (${staffName}) แจ้งเตือน: คำขอเลขที่ ${borrow.requestNumber} (${itemNames}) มีกำหนดส่งคืนในวันที่ ${returnDateFormatted} กรุณาเตรียมนำส่งคืนตามเวลา`,
      type: 'DUE_REMINDER',
      priority: isOverdue ? 'URGENT' : 'HIGH',
      linkUrl: '/borrow',
      entityType: 'BORROW',
      entityId: borrow.id,
    });

    // 2. Update lastRemindedAt on BorrowRequest
    const updated = await prisma.borrowRequest.update({
      where: { id },
      data: { lastRemindedAt: now },
      select: { id: true, lastRemindedAt: true },
    });

    // 3. Record in Activity Log
    await logActivity({
      userId: staffUser.id,
      userName: staffName,
      userRole: staffUser.role,
      action: 'REMIND',
      entityType: 'BORROW',
      entityId: borrow.id,
      entityTitle: borrow.requestNumber,
      details: `ส่งแจ้งเตือนเตือนความจำคืนครุภัณฑ์ให้นิสิต ${studentName} (${itemNames})`,
      metadata: {
        isOverdue,
        expectedReturnDate: borrow.expectedReturnDate,
        remindedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      lastRemindedAt: updated.lastRemindedAt,
      message: `ส่งการแจ้งเตือนเตือนความจำให้นิสิต (${studentName}) สำเร็จแล้ว`,
    });
  } catch (error: any) {
    console.error('Failed to send due reminder:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการส่งแจ้งเตือน' },
      { status: 500 }
    );
  }
}
