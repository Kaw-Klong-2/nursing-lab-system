import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { canUserApprove } from '@/lib/approval-scope';
import { createNotification } from '@/lib/notifications';
import { logActivity } from '@/lib/activity-log';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batchGroupId, action, userId, reason, slotDecisions } = body;

    if (!batchGroupId) {
      return NextResponse.json({ error: 'ไม่พบรหัสกลุ่มคำขอจองห้อง (batchGroupId)' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้อนุมัติ กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    // 1. Check approver permissions
    const approverUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, approvalScopes: true },
    });

    if (!approverUser) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งานในระบบ' }, { status: 404 });
    }

    // 2. Fetch all bookings in this batch
    const batchBookings = await prisma.roomBooking.findMany({
      where: { batchGroupId },
      include: {
        room: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (batchBookings.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการคำขอจองห้องในกลุ่มนี้' }, { status: 404 });
    }

    const firstBooking = batchBookings[0];
    const requesterId = firstBooking.userId;
    const bookingTitle = firstBooking.title;

    // Handle CANCEL action (by requester or admin)
    if (action === 'CANCEL') {
      const isOwner = requesterId === userId;
      const isAdmin = approverUser.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ยกเลิกคำขอจองห้องชุดนี้' }, { status: 403 });
      }

      const pendingBookings = batchBookings.filter((b) => b.status === 'PENDING');
      if (pendingBookings.length === 0) {
        return NextResponse.json({ error: 'ไม่มีรายการที่รออนุมัติในกลุ่มนี้' }, { status: 400 });
      }

      const allPendingIds = pendingBookings.map((b) => b.id);
      await prisma.roomBooking.updateMany({
        where: { id: { in: allPendingIds } },
        data: {
          status: 'CANCELLED',
          rejectionReason: reason || 'ผู้ขอยกเลิกคำขอทั้งชุด',
        },
      });

      invalidateCache('room-bookings');

      return NextResponse.json({
        success: true,
        action: 'CANCEL',
        cancelledCount: allPendingIds.length,
        message: `ยกเลิกคำขอทั้งชุดเรียบร้อยแล้ว (${allPendingIds.length} รายการ)`,
      });
    }

    // Check approver permissions for APPROVE / REJECT / PARTIAL
    const canApprove = approverUser.role === 'ADMIN' || approverUser.role === 'OFFICER' || canUserApprove(approverUser, 'ROOM');
    if (!canApprove) {
      return NextResponse.json(
        { error: 'ท่านไม่มีสิทธิ์อนุมัติการจองห้องปฏิบัติการ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
        { status: 403 }
      );
    }

    const pendingBookings = batchBookings.filter((b) => b.status === 'PENDING');
    if (pendingBookings.length === 0) {
      return NextResponse.json({ error: 'ทุกรายการในกลุ่มนี้ได้รับการพิจารณาไปแล้ว' }, { status: 400 });
    }

    const approvedIds: string[] = [];
    const rejectedIds: string[] = [];
    const conflicts: { bookingNumber: string; roomName: string; conflictTitle: string }[] = [];

    // 3. Process according to action
    if (action === 'APPROVE') {
      // Check conflicts for all pending bookings before approving
      for (const booking of pendingBookings) {
        // Check conflict with other approved bookings
        const conflictingBooking = await prisma.roomBooking.findFirst({
          where: {
            id: { not: booking.id },
            roomId: booking.roomId,
            bookingDate: booking.bookingDate,
            status: 'APPROVED',
            startTime: { lt: booking.endTime },
            endTime: { gt: booking.startTime },
          },
        });

        if (conflictingBooking) {
          conflicts.push({
            bookingNumber: booking.bookingNumber,
            roomName: booking.room?.name || booking.roomId,
            conflictTitle: `${conflictingBooking.startTime} - ${conflictingBooking.endTime} น.: ${conflictingBooking.title}`,
          });
          continue;
        }

        // Check conflict with open PracticeSlot
        const bDate = new Date(booking.bookingDate);
        const dayStart = new Date(Date.UTC(bDate.getUTCFullYear(), bDate.getUTCMonth(), bDate.getUTCDate(), 0, 0, 0, 0));
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const conflictingSlot = await prisma.practiceSlot.findFirst({
          where: {
            roomId: booking.roomId,
            date: { gte: dayStart, lt: dayEnd },
            isOpen: true,
            startTime: { lt: booking.endTime },
            endTime: { gt: booking.startTime },
          },
        });

        if (conflictingSlot) {
          conflicts.push({
            bookingNumber: booking.bookingNumber,
            roomName: booking.room?.name || booking.roomId,
            conflictTitle: `รอบเปิดฝึกปฏิบัติ (${conflictingSlot.startTime} - ${conflictingSlot.endTime} น.)`,
          });
          continue;
        }

        approvedIds.push(booking.id);
      }

      if (conflicts.length > 0 && approvedIds.length === 0) {
        return NextResponse.json(
          {
            error: 'ไม่สามารถอนุมัติรายการได้ เนื่องจากมีรายการทับซ้อนกับคิวที่อนุมัติแล้ว',
            conflicts,
          },
          { status: 409 }
        );
      }

      // Update approved
      if (approvedIds.length > 0) {
        await prisma.roomBooking.updateMany({
          where: { id: { in: approvedIds } },
          data: {
            status: 'APPROVED',
            approverId: userId,
            approvedAt: new Date(),
            rejectionReason: null,
          },
        });
      }

      // For any conflicting slots that couldn't be approved in this batch
      const unapprovedConflictedIds = conflicts.map((c) => {
        const found = pendingBookings.find((b) => b.bookingNumber === c.bookingNumber);
        return found ? found.id : null;
      }).filter(Boolean) as string[];

      if (unapprovedConflictedIds.length > 0) {
        await prisma.roomBooking.updateMany({
          where: { id: { in: unapprovedConflictedIds } },
          data: {
            status: 'REJECTED',
            approverId: userId,
            rejectionReason: 'ไม่อนุมัติเนื่องจากช่วงเวลาทับซ้อนกับรายการอื่นที่ได้รับอนุมัติแล้ว',
          },
        });
        rejectedIds.push(...unapprovedConflictedIds);
      }
    } else if (action === 'REJECT') {
      const allPendingIds = pendingBookings.map((b) => b.id);
      await prisma.roomBooking.updateMany({
        where: { id: { in: allPendingIds } },
        data: {
          status: 'REJECTED',
          approverId: userId,
          rejectionReason: reason || 'ไม่อนุมัติคำขอ',
        },
      });
      rejectedIds.push(...allPendingIds);
    } else if (action === 'PARTIAL' && slotDecisions && typeof slotDecisions === 'object') {
      // Itemized decisions provided: { [bookingId]: 'APPROVE' | 'REJECT' }
      for (const booking of pendingBookings) {
        const decision = slotDecisions[booking.id];
        if (decision === 'APPROVE') {
          // Check conflict
          const conflictingBooking = await prisma.roomBooking.findFirst({
            where: {
              id: { not: booking.id },
              roomId: booking.roomId,
              bookingDate: booking.bookingDate,
              status: 'APPROVED',
              startTime: { lt: booking.endTime },
              endTime: { gt: booking.startTime },
            },
          });

          if (conflictingBooking) {
            conflicts.push({
              bookingNumber: booking.bookingNumber,
              roomName: booking.room?.name || booking.roomId,
              conflictTitle: conflictingBooking.title,
            });
            continue;
          }

          await prisma.roomBooking.update({
            where: { id: booking.id },
            data: {
              status: 'APPROVED',
              approverId: userId,
              approvedAt: new Date(),
              rejectionReason: null,
            },
          });
          approvedIds.push(booking.id);
        } else if (decision === 'REJECT') {
          await prisma.roomBooking.update({
            where: { id: booking.id },
            data: {
              status: 'REJECTED',
              approverId: userId,
              rejectionReason: reason || 'ไม่อนุมัติเฉพาะห้องนี้',
            },
          });
          rejectedIds.push(booking.id);
        }
      }
    }

    // Auto-reject any third-party competing PENDING bookings overlapping with newly approved bookings
    for (const appBook of pendingBookings.filter((b) => approvedIds.includes(b.id))) {
      const competingPendings = await prisma.roomBooking.findMany({
        where: {
          id: { not: appBook.id },
          roomId: appBook.roomId,
          bookingDate: appBook.bookingDate,
          status: 'PENDING',
          startTime: { lt: appBook.endTime },
          endTime: { gt: appBook.startTime },
        },
        include: { room: true },
      });

      for (const comp of competingPendings) {
        await prisma.roomBooking.update({
          where: { id: comp.id },
          data: {
            status: 'REJECTED',
            approverId: userId,
            rejectionReason: `ระบบยกเลิกอัตโนมัติเนื่องจากห้องนี้ได้รับการอนุมัติให้คำขอ ${appBook.bookingNumber} (${appBook.startTime} - ${appBook.endTime} น.) แล้ว`,
          },
        });

        if (comp.userId) {
          createNotification({
            userId: comp.userId,
            title: 'คำขอจองห้องปฏิบัติการถูกยกเลิกเนื่องจากเวลาซ้ำซ้อน',
            message: `คำขอ ${comp.bookingNumber} ของท่านถูกยกเลิก เนื่องจากห้อง ${comp.room?.name || ''} ได้รับการอนุมัติให้คำขออื่นในช่วงเวลาดังกล่าวแล้ว`,
            type: 'STATUS_UPDATE',
            priority: 'NORMAL',
            linkUrl: '/rooms',
            entityType: 'ROOM',
            entityId: comp.id,
          }).catch(() => {});
        }
      }
    }

    invalidateCache('room:bookings:');

    logActivity({
      userId,
      action: approvedIds.length > 0 ? 'APPROVE' : 'REJECT',
      entityType: 'ROOM_BOOKING',
      entityId: batchGroupId,
      entityTitle: bookingTitle,
      details: `พิจารณาคำขอจองห้องแบบกลุ่ม "${bookingTitle}" (อนุมัติ ${approvedIds.length} รายการ, ปฏิเสธ ${rejectedIds.length} รายการ)`,
    });

    // 4. Send SINGLE Bundled Notification to Requester summarizing result
    if (requesterId) {
      if (approvedIds.length > 0 && rejectedIds.length === 0) {
        await createNotification({
          userId: requesterId,
          title: 'คำขอจองห้องแบบกลุ่มได้รับการอนุมัติแล้ว 🎉',
          message: `คำขอจองห้องแบบกลุ่ม (${approvedIds.length} รายการ) สำหรับ "${bookingTitle}" ได้รับการอนุมัติครบทุกรายการเรียบร้อยแล้ว`,
          type: 'STATUS_UPDATE',
          priority: 'HIGH',
          linkUrl: '/schedule',
          entityType: 'ROOM',
          entityId: approvedIds[0],
        }).catch(() => {});
      } else if (rejectedIds.length > 0 && approvedIds.length === 0) {
        await createNotification({
          userId: requesterId,
          title: 'คำขอจองห้องแบบกลุ่มไม่ได้รับการอนุมัติ ❌',
          message: `คำขอจองห้องแบบกลุ่ม (${rejectedIds.length} รายการ) สำหรับ "${bookingTitle}" ไม่ได้รับการอนุมัติ: ${reason || 'ไม่อนุมัติคำขอ'}`,
          type: 'STATUS_UPDATE',
          priority: 'NORMAL',
          linkUrl: '/rooms',
          entityType: 'ROOM',
          entityId: rejectedIds[0],
        }).catch(() => {});
      } else if (approvedIds.length > 0 && rejectedIds.length > 0) {
        await createNotification({
          userId: requesterId,
          title: 'ผลการพิจารณาคำขอจองห้องแบบกลุ่ม 📋',
          message: `คำขอจองห้องสำหรับ "${bookingTitle}" ได้รับการอนุมัติ ${approvedIds.length} รายการ และไม่อนุมัติ ${rejectedIds.length} รายการ`,
          type: 'STATUS_UPDATE',
          priority: 'HIGH',
          linkUrl: '/schedule',
          entityType: 'ROOM',
          entityId: approvedIds[0],
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: `ดำเนินการเรียบร้อย: อนุมัติ ${approvedIds.length} รายการ, ปฏิเสธ ${rejectedIds.length} รายการ`,
      batchGroupId,
      approvedCount: approvedIds.length,
      rejectedCount: rejectedIds.length,
      conflicts,
    });
  } catch (error: any) {
    console.error('Error in batch approval:', error);
    return NextResponse.json({ error: error.message || 'Failed to process batch approval' }, { status: 500 });
  }
}
