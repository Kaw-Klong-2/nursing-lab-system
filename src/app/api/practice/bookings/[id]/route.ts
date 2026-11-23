import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendApprovalNotificationWithQrEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { canUserApprove } from '@/lib/approval-scope';
import { logActivity } from '@/lib/activity-log';
import { combineSlotDateAndBangkokTime } from '@/lib/date-time-utils';
import { getSessionFromRequest } from '@/lib/session';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // id could be either the booking id, bookingNumber, or qrCodeToken
    const booking = await prisma.practiceBooking.findFirst({
      where: {
        OR: [
          { id },
          { bookingNumber: id },
          { qrCodeToken: id },
        ],
      },
      include: {
        user: true,
        slot: {
          include: {
            room: true,
          },
        },
        course: true,
        practiceKit: true,
        approver: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคำขอเข้าฝึกปฏิบัติ' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error: any) {
    console.error('Error fetching practice booking:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason, notes, customCheckInTime, customCheckOutTime } = body;
    const effectiveUserId = session?.uid || userId || null;

    // Resolve booking by id, bookingNumber, or qrCodeToken
    const booking = await prisma.practiceBooking.findFirst({
      where: {
        OR: [
          { id },
          { bookingNumber: id },
          { qrCodeToken: id },
        ],
      },
      include: {
        slot: {
          include: { room: true },
        },
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคำขอเข้าฝึกปฏิบัติ' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      if (!effectiveUserId) {
        return NextResponse.json(
          { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการอนุมัติรายการ' },
          { status: 401 }
        );
      }
      const approverUser = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { role: true, status: true, approvalScopes: true, isExecutive: true },
      });
      if (
        !approverUser ||
        (approverUser.status && approverUser.status !== 'ACTIVE') ||
        !canUserApprove(approverUser, 'PRACTICE')
      ) {
        return NextResponse.json(
          { error: 'ท่านไม่มีสิทธิ์อนุมัติการจองห้องฝึกทักษะ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
          { status: 403 }
        );
      }

      if (booking.status !== 'PENDING') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ คำขอจองห้องฝึกนี้ได้รับการดำเนินการไปแล้ว กรุณาตรวจสอบใหม่อีกครั้ง',
            currentStatus: booking.status,
          },
          { status: 409 }
        );
      }

      // หากเป็นการจองแบบกลุ่ม ให้อนุมัติสมาชิกในกลุ่มเดียวกันพร้อมกัน
      const bookingsToApprove = booking.groupCode
        ? await prisma.practiceBooking.findMany({
            where: { groupCode: booking.groupCode, status: 'PENDING' },
            include: { user: true, slot: { include: { room: true } } },
          })
        : [booking];

      const approvedList = [];

      for (const b of bookingsToApprove) {
        const updated = await prisma.practiceBooking.update({
          where: { id: b.id },
          data: {
            status: 'APPROVED',
            approverId: effectiveUserId,
            approvedAt: new Date(),
          },
          include: {
            user: true,
            slot: { include: { room: true } },
            approver: true,
          },
        });
        approvedList.push(updated);

        // Trigger email with individual QR Code to each student in background
        if (updated.user?.email) {
          const slotDateFormatted = updated.slot?.date
            ? new Date(updated.slot.date).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '';
          const dateTimeStr = `${slotDateFormatted} เวลา ${updated.slot?.startTime} - ${updated.slot?.endTime} น.`;

          sendApprovalNotificationWithQrEmail({
            studentEmail: updated.user.email,
            studentName: updated.user.name,
            bookingNumber: updated.bookingNumber,
            skillTopic: updated.skillTopic,
            roomName: updated.slot?.room?.name || 'ห้องปฏิบัติการพยาบาล',
            dateTimeStr,
            qrCodeToken: updated.qrCodeToken,
          }).catch((err) => console.error('Background student QR email failed:', err));
        }

        // In-app & Web Push notification for each student (awaited)
        if (updated.userId) {
          await createNotification({
            userId: updated.userId,
            title: 'คำขอจองห้องฝึกได้รับการอนุมัติแล้ว 🎉',
            message: `คำขอจอง ${updated.bookingNumber} (${updated.skillTopic}) ได้รับการอนุมัติแล้ว พร้อมรับ QR เข้าห้อง`,
            type: 'STATUS_UPDATE',
            linkUrl: '/practice/my-bookings',
            entityType: 'PRACTICE',
            entityId: updated.id,
          }).catch(() => {});
        }

        logActivity({
          userId: effectiveUserId,
          action: 'APPROVE',
          entityType: 'PRACTICE_BOOKING',
          entityId: updated.id,
          entityTitle: updated.bookingNumber,
          details: `อนุมัติคำขอเข้าฝึกทักษะ ${updated.bookingNumber} (${updated.skillTopic})`,
        });
      }

      return NextResponse.json(approvedList.find((x) => x.id === booking.id) || approvedList[0]);
    }

    if (action === 'REJECT') {
      if (!effectiveUserId) {
        return NextResponse.json(
          { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการปฏิเสธรายการ' },
          { status: 401 }
        );
      }
      const approverUser = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { role: true, status: true, approvalScopes: true, isExecutive: true },
      });
      if (
        !approverUser ||
        (approverUser.status && approverUser.status !== 'ACTIVE') ||
        !canUserApprove(approverUser, 'PRACTICE')
      ) {
        return NextResponse.json(
          { error: 'ท่านไม่มีสิทธิ์ปฏิเสธการจองห้องฝึกทักษะ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
          { status: 403 }
        );
      }

      if (booking.status !== 'PENDING') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ คำขอจองห้องฝึกนี้ได้รับการดำเนินการไปแล้ว กรุณาตรวจสอบใหม่อีกครั้ง',
            currentStatus: booking.status,
          },
          { status: 409 }
        );
      }

      const bookingsToReject = booking.groupCode
        ? await prisma.practiceBooking.findMany({
            where: { groupCode: booking.groupCode, status: 'PENDING' },
            include: { user: true, slot: { include: { room: true } } },
          })
        : [booking];

      const rejectedList = [];

      for (const b of bookingsToReject) {
        const updated = await prisma.practiceBooking.update({
          where: { id: b.id },
          data: {
            status: 'REJECTED',
            approverId: effectiveUserId,
            rejectionReason: reason || 'ไม่อนุมัติ',
          },
          include: {
            user: true,
            slot: { include: { room: true } },
            approver: true,
          },
        });
        rejectedList.push(updated);

        // In-app notification
        if (updated.userId) {
          await createNotification({
            userId: updated.userId,
            title: 'คำขอจองห้องฝึกไม่ได้รับการอนุมัติ ❌',
            message: `คำขอจอง ${updated.bookingNumber} (${updated.skillTopic}) ไม่ได้รับการอนุมัติ: ${updated.rejectionReason || 'ไม่อนุมัติ'}`,
            type: 'STATUS_UPDATE',
            priority: 'HIGH',
            linkUrl: '/practice/my-bookings',
            entityType: 'PRACTICE',
            entityId: updated.id,
          }).catch(() => {});
        }

        logActivity({
          userId: effectiveUserId,
          action: 'REJECT',
          entityType: 'PRACTICE_BOOKING',
          entityId: updated.id,
          entityTitle: updated.bookingNumber,
          details: `ปฏิเสธคำขอเข้าฝึกทักษะ ${updated.bookingNumber} (เหตุผล: ${updated.rejectionReason || 'ไม่อนุมัติ'})`,
        });
      }

      return NextResponse.json(rejectedList.find((x) => x.id === booking.id) || rejectedList[0]);
    }

    if (action === 'CHECK_IN') {
      if (booking.status === 'COMPLETED') {
        return NextResponse.json(
          { error: 'คำขอนี้ได้เสร็จสิ้นการฝึกปฏิบัติไปแล้ว ไม่สามารถเช็คอินซ้ำได้' },
          { status: 400 }
        );
      }
      if (booking.status === 'CHECKED_IN') {
        return NextResponse.json(
          { error: 'นิสิตได้ทำการเช็คอินเข้าห้องแล็บไปแล้ว', booking },
          { status: 200 }
        );
      }
      if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') {
        return NextResponse.json(
          { error: `ไม่สามารถเช็คอินได้เนื่องจากสถานะคำขอคือ ${booking.status}` },
          { status: 400 }
        );
      }

      // Check early check-in window constraint
      const config = await prisma.practiceConfig.findUnique({ where: { id: 'default' } });
      const checkInEarlyMinutes = config?.checkInEarlyMinutes ?? 30;

      if (booking.slot?.date && booking.slot?.startTime) {
        const slotStartDateTime = combineSlotDateAndBangkokTime(booking.slot.date, booking.slot.startTime);

        const now = new Date();
        const earliestCheckIn = new Date(slotStartDateTime.getTime() - checkInEarlyMinutes * 60 * 1000);

        if (now < earliestCheckIn) {
          const diffMinutes = Math.ceil((earliestCheckIn.getTime() - now.getTime()) / 60000);
          return NextResponse.json(
            {
              error: `ยังไม่ถึงช่วงเวลาที่อนุญาตให้เช็คอิน (อนุญาตให้เช็คอินได้ล่วงหน้าไม่เกิน ${checkInEarlyMinutes} นาที ก่อนเริ่มเวลา ${booking.slot.startTime} น. - กรุณารออีกประมาณ ${diffMinutes} นาที)`,
            },
            { status: 400 }
          );
        }
      }

      const checkInTime = new Date();
      const updated = await prisma.practiceBooking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_IN',
          checkInTime,
        },
        include: {
          user: true,
          slot: { include: { room: true } },
          approver: true,
        },
      });

      // In-app notification
      if (updated.userId) {
        createNotification({
          userId: updated.userId,
          title: 'เช็คอินเข้าห้องฝึกสำเร็จ 🏥',
          message: `เช็คอินเข้า ${updated.slot?.room?.name || 'ห้องปฏิบัติการ'} เรียบร้อย ขอให้ฝึกซ้อมอย่างมีประสิทธิภาพ`,
          type: 'SYSTEM',
          linkUrl: '/practice/my-bookings',
          entityType: 'PRACTICE',
          entityId: updated.id,
        }).catch(() => {});
      }

      if (userId) {
        logActivity({
          userId,
          action: 'UPDATE',
          entityType: 'PRACTICE_BOOKING',
          entityId: updated.id,
          entityTitle: updated.bookingNumber,
          details: `เช็คอินเข้าฝึกทักษะ ${updated.bookingNumber} (${updated.slot?.room?.name || 'ห้องปฏิบัติการ'})`,
        });
      }

      return NextResponse.json({ message: 'เช็คอินเข้าห้องปฏิบัติการสำเร็จ', booking: updated });
    }

    if (action === 'CHECK_OUT') {
      if (booking.status !== 'CHECKED_IN' && !booking.checkInTime) {
        return NextResponse.json(
          { error: 'ยังไม่มีประวัติการเช็คอินเข้าห้องแล็บ ไม่สามารถเช็คเอาท์ได้' },
          { status: 400 }
        );
      }

      // Optional check on early checkout if needed (or warning, but allow completion if student finishes practice)
      const checkOutTime = new Date();
      const checkInTime = booking.checkInTime || new Date();
      const actualMinutes = Math.max(1, Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000));

      const updated = await prisma.practiceBooking.update({
        where: { id: booking.id },
        data: {
          status: 'COMPLETED',
          checkOutTime,
          actualMinutes,
          notes: notes || booking.notes,
        },
        include: {
          user: true,
          slot: { include: { room: true } },
          approver: true,
        },
      });

      // In-app notification
      if (updated.userId) {
        createNotification({
          userId: updated.userId,
          title: 'เช็คเอาท์เสร็จสิ้น บันทึกเวลาฝึกเรียบร้อย ✅',
          message: `บันทึกเวลาการฝึกปฏิบัติ ${updated.actualMinutes || 0} นาที เรียบร้อยแล้ว`,
          type: 'SYSTEM',
          linkUrl: '/practice/my-bookings',
          entityType: 'PRACTICE',
          entityId: updated.id,
        }).catch(() => {});
      }

      if (userId) {
        logActivity({
          userId,
          action: 'UPDATE',
          entityType: 'PRACTICE_BOOKING',
          entityId: updated.id,
          entityTitle: updated.bookingNumber,
          details: `เช็คเอาท์เสร็จสิ้น ${updated.bookingNumber} (รวมเวลาฝึก ${updated.actualMinutes || 0} นาที)`,
        });
      }

      return NextResponse.json({ message: 'เช็คเอาท์เสร็จสิ้น บันทึกเวลาการฝึกเรียบร้อย', booking: updated });
    }

    if (action === 'MANUAL_TIME_LOG') {
      if (!userId) {
        return NextResponse.json(
          { error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์บันทึกหรือแก้ไขเวลาย้อนหลัง' },
          { status: 403 }
        );
      }

      const actor = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, name: true },
      });

      if (!actor || actor.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์บันทึกหรือแก้ไขเวลาย้อนหลัง' },
          { status: 403 }
        );
      }

      if (!customCheckInTime) {
        return NextResponse.json(
          { error: 'กรุณาระบุเวลาเข้าฝึกให้ถูกต้อง' },
          { status: 400 }
        );
      }

      const parsedIn = new Date(customCheckInTime);
      if (isNaN(parsedIn.getTime())) {
        return NextResponse.json(
          { error: 'กรุณาระบุเวลาเข้าฝึกให้ถูกต้อง' },
          { status: 400 }
        );
      }

      let status: 'CHECKED_IN' | 'COMPLETED' = 'CHECKED_IN';
      let parsedOut: Date | null = null;
      let actualMinutes: number | null = null;

      if (customCheckOutTime && String(customCheckOutTime).trim()) {
        parsedOut = new Date(customCheckOutTime);
        if (isNaN(parsedOut.getTime()) || parsedOut <= parsedIn) {
          return NextResponse.json(
            { error: 'เวลาเช็คเอาท์ต้องมากกว่าเวลาเช็คอิน' },
            { status: 400 }
          );
        }
        actualMinutes = Math.max(1, Math.round((parsedOut.getTime() - parsedIn.getTime()) / 60000));
        status = 'COMPLETED';
      }

      const cleanedPrevNotes = (booking.notes || '')
        .replace(/\[บันทึกเวลาโดยแอดมิน[^\]]*\]/g, '')
        .trim();
      const reasonText = notes && String(notes).trim() ? String(notes).trim() : '';
      const adminTag = `[บันทึกเวลาโดยแอดมิน${reasonText ? `: ${reasonText}` : ''}]`;
      const updatedNotes = cleanedPrevNotes ? `${cleanedPrevNotes} ${adminTag}` : adminTag;

      const updated = await prisma.practiceBooking.update({
        where: { id: booking.id },
        data: {
          status,
          checkInTime: parsedIn,
          checkOutTime: parsedOut,
          actualMinutes,
          notes: updatedNotes,
          ...(booking.status === 'PENDING'
            ? {
                approverId: actor.id,
                approvedAt: new Date(),
              }
            : {}),
        },
        include: {
          user: true,
          slot: { include: { room: true } },
          approver: true,
        },
      });

      if (updated.userId) {
        createNotification({
          userId: updated.userId,
          title: 'ผู้ดูแลระบบบันทึก/ปรับปรุงเวลาฝึกปฏิบัติ ⏱️',
          message: updated.actualMinutes
            ? `บันทึกเวลาฝึก ${updated.bookingNumber} รวม ${updated.actualMinutes} นาที เรียบร้อยแล้ว`
            : `บันทึกเวลาเช็คอิน ${updated.bookingNumber} โดยผู้ดูแลระบบเรียบร้อยแล้ว`,
          type: 'SYSTEM',
          linkUrl: '/practice/my-bookings',
          entityType: 'PRACTICE',
          entityId: updated.id,
        }).catch(() => {});
      }

      logActivity({
        userId: actor.id,
        action: 'UPDATE',
        entityType: 'PRACTICE_BOOKING',
        entityId: updated.id,
        entityTitle: updated.bookingNumber,
        details: `แอดมินบันทึก/แก้ไขเวลาเข้าฝึก ${updated.bookingNumber} (${updated.actualMinutes ? `${updated.actualMinutes} นาที` : 'เช็คอิน'})${reasonText ? ` เหตุผล: ${reasonText}` : ''}`,
      });

      return NextResponse.json({
        message: 'บันทึกเวลาเข้า-ออกโดยผู้ดูแลระบบเรียบร้อยแล้ว',
        booking: updated,
      });
    }

    if (action === 'CANCEL') {
      const updated = await prisma.practiceBooking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating practice booking:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
