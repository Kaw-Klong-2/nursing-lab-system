import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { canUserApprove } from '@/lib/approval-scope';
import { createNotification } from '@/lib/notifications';
import { logActivity } from '@/lib/activity-log';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await prisma.roomBooking.findUnique({
      where: { id },
      include: {
        room: true,
        user: true,
        course: true,
        approver: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการจองห้อง' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error: any) {
    console.error('Error fetching room booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch room booking' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason, title, purpose, attendeesCount, equipmentNeeded, note } = body;

    const existing = await prisma.roomBooking.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรายการคำขอจองห้อง' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      if (userId) {
        const approverUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, approvalScopes: true },
        });
        if (approverUser && !canUserApprove(approverUser, 'ROOM')) {
          return NextResponse.json(
            { error: 'ท่านไม่มีสิทธิ์อนุมัติการจองห้องปฏิบัติการ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
            { status: 403 }
          );
        }
      }

      // Re-check conflict to prevent double booking
      const conflicting = await prisma.roomBooking.findFirst({
        where: {
          id: { not: id },
          roomId: existing.roomId,
          bookingDate: existing.bookingDate,
          status: 'APPROVED',
          startTime: { lt: existing.endTime },
          endTime: { gt: existing.startTime },
        },
      });

      if (conflicting) {
        return NextResponse.json(
          {
            error: `ไม่สามารถอนุมัติได้ เนื่องจากห้องนี้ถูกอนุมัติให้รายการอื่นแล้ว (${conflicting.startTime} - ${conflicting.endTime} น.: ${conflicting.title})`,
          },
          { status: 409 }
        );
      }

      // Check conflict with open PracticeSlot in the same room on this date
      const bDate = new Date(existing.bookingDate);
      const dayStart = new Date(Date.UTC(bDate.getUTCFullYear(), bDate.getUTCMonth(), bDate.getUTCDate(), 0, 0, 0, 0));
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const conflictingSlot = await prisma.practiceSlot.findFirst({
        where: {
          roomId: existing.roomId,
          date: { gte: dayStart, lt: dayEnd },
          isOpen: true,
          startTime: { lt: existing.endTime },
          endTime: { gt: existing.startTime },
        },
      });

      if (conflictingSlot) {
        return NextResponse.json(
          {
            error: `ไม่สามารถอนุมัติได้ เนื่องจากห้องนี้มีรอบเปิดฝึกปฏิบัติการทักษะด้วยตนเอง (${conflictingSlot.startTime} - ${conflictingSlot.endTime} น.)`,
          },
          { status: 409 }
        );
      }

      const updated = await prisma.roomBooking.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: userId || null,
          approvedAt: new Date(),
          rejectionReason: null,
        },
        include: {
          room: true,
          user: true,
          approver: true,
        },
      });

      // Auto-reject any remaining PENDING room bookings that overlap with this approved booking
      const competingPendings = await prisma.roomBooking.findMany({
        where: {
          id: { not: id },
          roomId: existing.roomId,
          bookingDate: existing.bookingDate,
          status: 'PENDING',
          startTime: { lt: existing.endTime },
          endTime: { gt: existing.startTime },
        },
        include: { room: true },
      });

      for (const p of competingPendings) {
        await prisma.roomBooking.update({
          where: { id: p.id },
          data: {
            status: 'REJECTED',
            approverId: userId || null,
            rejectionReason: `ระบบยกเลิกอัตโนมัติเนื่องจากห้องนี้ได้รับการอนุมัติให้คำขอ ${existing.bookingNumber} (${existing.startTime} - ${existing.endTime} น.) แล้ว`,
          },
        });

        if (p.userId) {
          await createNotification({
            userId: p.userId,
            title: 'คำขอจองห้องปฏิบัติการถูกยกเลิกเนื่องจากเวลาซ้ำซ้อน',
            message: `คำขอ ${p.bookingNumber} ของท่านถูกยกเลิก เนื่องจากห้อง ${p.room?.name || ''} ได้รับการอนุมัติให้คำขออื่นในช่วงเวลาดังกล่าวแล้ว`,
            type: 'STATUS_UPDATE',
            priority: 'NORMAL',
            linkUrl: '/rooms',
            entityType: 'ROOM',
            entityId: p.id,
          }).catch(() => {});
        }
      }

      invalidateCache('room:bookings:');

      logActivity({
        userId,
        action: 'APPROVE',
        entityType: 'ROOM_BOOKING',
        entityId: updated.id,
        entityTitle: updated.bookingNumber,
        details: `อนุมัติคำขอจองห้อง ${updated.room?.name || ''} (${updated.bookingNumber}: ${updated.title})`,
      });

      // Notify the requester
      if (updated.userId) {
        await createNotification({
          userId: updated.userId,
          title: 'คำขอจองห้องปฏิบัติการได้รับการอนุมัติแล้ว 🎉',
          message: `คำขอจองห้อง ${updated.room?.name || ''} (${updated.bookingNumber}) ได้รับการอนุมัติเรียบร้อยแล้ว`,
          type: 'STATUS_UPDATE',
          priority: 'HIGH',
          linkUrl: '/schedule',
          entityType: 'ROOM',
          entityId: updated.id,
        }).catch(() => {});
      }

      return NextResponse.json(updated);
    }

    if (action === 'REJECT') {
      const updated = await prisma.roomBooking.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: userId || null,
          rejectionReason: reason || 'ไม่อนุมัติคำขอ',
        },
        include: {
          room: true,
          user: true,
          approver: true,
        },
      });

      invalidateCache('room:bookings:');

      logActivity({
        userId,
        action: 'REJECT',
        entityType: 'ROOM_BOOKING',
        entityId: updated.id,
        entityTitle: updated.bookingNumber,
        details: `ปฏิเสธคำขอจองห้อง ${updated.room?.name || ''} (${updated.bookingNumber} - เหตุผล: ${updated.rejectionReason})`,
      });

      // Notify the requester
      if (updated.userId) {
        await createNotification({
          userId: updated.userId,
          title: 'คำขอจองห้องปฏิบัติการไม่ผ่านการอนุมัติ ❌',
          message: `คำขอจองห้อง ${updated.room?.name || ''} (${updated.bookingNumber}) ไม่ผ่านการอนุมัติ: ${updated.rejectionReason}`,
          type: 'STATUS_UPDATE',
          priority: 'HIGH',
          linkUrl: '/schedule',
          entityType: 'ROOM',
          entityId: updated.id,
        }).catch(() => {});
      }

      return NextResponse.json(updated);
    }

    if (action === 'CANCEL') {
      // If booking was already APPROVED, verify that the canceller is ADMIN or OFFICER
      if (existing.status === 'APPROVED') {
        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
          });
          if (user && user.role !== 'ADMIN' && user.role !== 'OFFICER') {
            return NextResponse.json(
              { error: 'เฉพาะแอดมินหรือเจ้าหน้าที่ห้องแล็บเท่านั้นที่สามารถยกเลิกรายการที่อนุมัติแล้วได้' },
              { status: 403 }
            );
          }
        }
      }

      const cancelReasonText = reason?.trim() || (existing.status === 'APPROVED' ? 'ยกเลิกโดยเจ้าหน้าที่/แอดมิน' : 'ผู้ขอยกเลิกคำขอ');

      const updated = await prisma.roomBooking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          rejectionReason: cancelReasonText,
        },
        include: {
          room: true,
          user: true,
        },
      });

      // If cancelled by admin/officer on an approved booking, notify the requester
      if (existing.status === 'APPROVED' && updated.userId) {
        await createNotification({
          userId: updated.userId,
          title: 'รายการจองห้องปฏิบัติการถูกยกเลิก ⚠️',
          message: `คำขอจองห้อง ${updated.room?.name || ''} (${updated.bookingNumber}) ถูกยกเลิกโดยเจ้าหน้าที่: ${cancelReasonText}`,
          type: 'STATUS_UPDATE',
          priority: 'HIGH',
          linkUrl: '/rooms',
          entityType: 'ROOM',
          entityId: updated.id,
        }).catch(() => {});
      }

      invalidateCache('room:bookings:');
      return NextResponse.json(updated);
    }

    if (action === 'REASSIGN_ROOM') {
      const { targetRoomId, reason } = body;
      if (!targetRoomId) {
        return NextResponse.json({ error: 'กรุณาระบุห้องปฏิบัติการเป้าหมาย' }, { status: 400 });
      }

      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });
        if (user && user.role !== 'ADMIN' && user.role !== 'OFFICER') {
          return NextResponse.json(
            { error: 'เฉพาะแอดมินหรือเจ้าหน้าที่ห้องแล็บเท่านั้นที่สามารถย้ายห้องได้' },
            { status: 403 }
          );
        }
      }

      const targetRoom = await prisma.practiceRoom.findUnique({
        where: { id: targetRoomId },
      });

      if (!targetRoom) {
        return NextResponse.json({ error: 'ไม่พบห้องปฏิบัติการเป้าหมาย' }, { status: 404 });
      }

      if (!targetRoom.isActive) {
        return NextResponse.json(
          { error: `ห้อง "${targetRoom.name}" ปิดให้บริการชั่วคราว ไม่สามารถย้ายไปห้องนี้ได้` },
          { status: 400 }
        );
      }

      // Check conflict in target room for the same date & time
      const conflictingBooking = await prisma.roomBooking.findFirst({
        where: {
          id: { not: id },
          roomId: targetRoomId,
          bookingDate: existing.bookingDate,
          status: 'APPROVED',
          startTime: { lt: existing.endTime },
          endTime: { gt: existing.startTime },
        },
      });

      if (conflictingBooking) {
        return NextResponse.json(
          {
            error: `ไม่สามารถย้ายไปห้อง "${targetRoom.name}" ได้ เนื่องจากห้องนี้มีการจองที่อนุมัติแล้ว (${conflictingBooking.startTime} - ${conflictingBooking.endTime} น.: ${conflictingBooking.title})`,
          },
          { status: 409 }
        );
      }

      // Check conflict with open practice slot in target room
      const bDate = new Date(existing.bookingDate);
      const dayStart = new Date(Date.UTC(bDate.getUTCFullYear(), bDate.getUTCMonth(), bDate.getUTCDate(), 0, 0, 0, 0));
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const conflictingSlot = await prisma.practiceSlot.findFirst({
        where: {
          roomId: targetRoomId,
          date: { gte: dayStart, lt: dayEnd },
          isOpen: true,
          startTime: { lt: existing.endTime },
          endTime: { gt: existing.startTime },
        },
      });

      if (conflictingSlot) {
        return NextResponse.json(
          {
            error: `ไม่สามารถย้ายไปห้อง "${targetRoom.name}" ได้ เนื่องจากมีรอบเปิดฝึกปฏิบัติการทักษะด้วยตนเองในช่วงเวลาดังกล่าว`,
          },
          { status: 409 }
        );
      }

      const oldRoomName = existing.room?.name || 'ห้องเดิม';
      const reassignNote = reason
        ? `[ย้ายจาก ${oldRoomName} -> ${targetRoom.name}]: ${reason}`
        : `[ย้ายห้องจาก ${oldRoomName} -> ${targetRoom.name}]`;

      const updated = await prisma.roomBooking.update({
        where: { id },
        data: {
          roomId: targetRoomId,
          note: existing.note ? `${existing.note}\n${reassignNote}` : reassignNote,
        },
        include: {
          room: true,
          user: true,
          approver: true,
        },
      });

      // Notify the requester
      if (updated.userId) {
        await createNotification({
          userId: updated.userId,
          title: 'แจ้งย้ายห้องปฏิบัติการ 🏫',
          message: `คำขอจองห้อง ${existing.bookingNumber} (${existing.title}) ได้รับการย้ายไปยังห้อง ${targetRoom.name} เรียบร้อยแล้ว`,
          type: 'STATUS_UPDATE',
          priority: 'HIGH',
          linkUrl: '/rooms',
          entityType: 'ROOM',
          entityId: updated.id,
        }).catch(() => {});
      }

      invalidateCache('room:bookings:');
      return NextResponse.json({
        message: `ย้ายห้องไปยัง "${targetRoom.name}" เรียบร้อยแล้ว`,
        booking: updated,
      });
    }

    // Default update fields
    const updated = await prisma.roomBooking.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(purpose && { purpose }),
        ...(attendeesCount !== undefined && { attendeesCount: Number(attendeesCount) || 1 }),
        ...(equipmentNeeded !== undefined && { equipmentNeeded }),
        ...(note !== undefined && { note }),
      },
    });

    invalidateCache('room:bookings:');
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating room booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to update room booking' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถลบรายการทิ้งถาวรได้' },
          { status: 403 }
        );
      }
    }

    await prisma.roomBooking.delete({
      where: { id },
    });

    invalidateCache('room:bookings:');
    return NextResponse.json({ message: 'ลบรายการจองห้องเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Error deleting room booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete room booking' }, { status: 500 });
  }
}
