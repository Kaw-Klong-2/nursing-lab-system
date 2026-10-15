import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { formatTeacherName } from '@/lib/user-utils';
import { createNotification, notifyRoles } from '@/lib/notifications';

interface BatchSlotItem {
  roomId: string;
  roomName: string;
  roomCode: string;
  dateStr: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface ConflictedSlotItem extends BatchSlotItem {
  conflictType: 'APPROVED_BOOKING' | 'PENDING_BOOKING' | 'PRACTICE_SLOT';
  conflictTitle: string;
  conflictTime: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      roomIds,
      dates,
      startTime,
      endTime,
      title,
      purpose,
      attendeesCount,
      courseId,
      advisorName,
      contactPhone,
      equipmentNeeded,
      note,
      autoApprove = true,
      skipConflicts = false,
      previewOnly = false,
      termName,
      userId,
      isTimetable: explicitIsTimetable,
    } = body;

    // 1. Authorization check: ADMIN, OFFICER, or TEACHER can use batch booking
    if (!userId) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });

    const isStaff = user?.role === 'ADMIN' || user?.role === 'OFFICER';
    const isTeacher = user?.role === 'TEACHER';

    if (!user || (!isStaff && !isTeacher)) {
      return NextResponse.json(
        { error: 'เฉพาะอาจารย์ผู้สอน, เจ้าหน้าที่ห้องแล็บ หรือผู้ดูแลระบบเท่านั้นที่สามารถจองหลายห้องหรือจองหลายวันได้' },
        { status: 403 }
      );
    }

    // 2. Validate input parameters
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกห้องปฏิบัติการอย่างน้อย 1 ห้อง' }, { status: 400 });
    }

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุวันที่ที่ต้องการจองอย่างน้อย 1 วัน' }, { status: 400 });
    }

    if (!startTime || !endTime || startTime >= endTime) {
      return NextResponse.json({ error: 'เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุดการใช้งาน' }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกหัวข้อ / ชื่องานที่ขอใช้งานห้อง' }, { status: 400 });
    }

    if (!purpose?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุวัตถุประสงค์การใช้งานห้อง' }, { status: 400 });
    }

    // 3. Fetch rooms metadata
    const rooms = await prisma.practiceRoom.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, name: true, code: true, isActive: true, closeReason: true },
    });

    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    // Check if any selected room is inactive
    const inactiveRooms = rooms.filter((r) => !r.isActive);
    if (inactiveRooms.length > 0) {
      const names = inactiveRooms.map((r) => `"${r.name}" (${r.closeReason || 'ปิดให้บริการ'})`).join(', ');
      return NextResponse.json(
        { error: `ห้องต่อไปนี้ปิดให้บริการ ไม่สามารถจองได้: ${names}` },
        { status: 400 }
      );
    }

    // 4. Build candidate slots list (Cartesian product of rooms x dates)
    const candidateSlots: BatchSlotItem[] = [];
    for (const rId of roomIds) {
      const r = roomMap.get(rId);
      if (!r) continue;

      for (const dStr of dates) {
        const [y, m, d] = dStr.split('-').map(Number);
        const dateUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

        candidateSlots.push({
          roomId: r.id,
          roomName: r.name,
          roomCode: r.code,
          dateStr: dStr,
          date: dateUtc,
          startTime,
          endTime,
        });
      }
    }

    // 5. Conflict checking for all candidate slots
    // Fetch all existing room bookings for these rooms and dates
    const dateObjects = dates.map((dStr) => {
      const [y, m, d] = dStr.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    });

    const minDate = new Date(Math.min(...dateObjects.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dateObjects.map((d) => d.getTime())));
    maxDate.setUTCDate(maxDate.getUTCDate() + 1);

    const [existingRoomBookings, existingPracticeSlots] = await Promise.all([
      prisma.roomBooking.findMany({
        where: {
          roomId: { in: roomIds },
          bookingDate: { gte: minDate, lt: maxDate },
          status: { in: ['APPROVED', 'PENDING'] },
        },
        select: {
          id: true,
          roomId: true,
          bookingDate: true,
          startTime: true,
          endTime: true,
          title: true,
          status: true,
        },
      }),
      prisma.practiceSlot.findMany({
        where: {
          roomId: { in: roomIds },
          date: { gte: minDate, lt: maxDate },
          isOpen: true,
        },
        select: {
          id: true,
          roomId: true,
          date: true,
          startTime: true,
          endTime: true,
        },
      }),
    ]);

    const availableSlots: BatchSlotItem[] = [];
    const conflictedSlots: ConflictedSlotItem[] = [];

    for (const slot of candidateSlots) {
      // Check conflict with existing room bookings
      const rbConflict = existingRoomBookings.find((rb) => {
        const rbDateStr = new Date(rb.bookingDate).toISOString().slice(0, 10);
        return (
          rb.roomId === slot.roomId &&
          rbDateStr === slot.dateStr &&
          slot.startTime < rb.endTime &&
          slot.endTime > rb.startTime
        );
      });

      if (rbConflict) {
        conflictedSlots.push({
          ...slot,
          conflictType: rbConflict.status === 'APPROVED' ? 'APPROVED_BOOKING' : 'PENDING_BOOKING',
          conflictTitle: rbConflict.title,
          conflictTime: `${rbConflict.startTime} - ${rbConflict.endTime} น.`,
        });
        continue;
      }

      // Check conflict with open PracticeSlots
      const psConflict = existingPracticeSlots.find((ps) => {
        const psDateStr = new Date(ps.date).toISOString().slice(0, 10);
        return (
          ps.roomId === slot.roomId &&
          psDateStr === slot.dateStr &&
          slot.startTime < ps.endTime &&
          slot.endTime > ps.startTime
        );
      });

      if (psConflict) {
        conflictedSlots.push({
          ...slot,
          conflictType: 'PRACTICE_SLOT',
          conflictTitle: 'รอบเปิดฝึกปฏิบัติการทักษะด้วยตนเอง',
          conflictTime: `${psConflict.startTime} - ${psConflict.endTime} น.`,
        });
        continue;
      }

      availableSlots.push(slot);
    }

    // 6. If PREVIEW ONLY, return conflict preview analysis immediately
    if (previewOnly) {
      return NextResponse.json({
        totalSlots: candidateSlots.length,
        availableCount: availableSlots.length,
        conflictedCount: conflictedSlots.length,
        availableSlots,
        conflictedSlots,
      });
    }

    // 7. If not previewOnly:
    // Determine which slots to create
    if (conflictedSlots.length > 0 && !skipConflicts) {
      return NextResponse.json(
        {
          error: `มีรายการชนตารางทั้งหมด ${conflictedSlots.length} รายการ กรุณาตรวจสอบหรือเปิดใช้งานตัวเลือก "ข้ามรายการที่ชน"`,
          conflictedSlots,
          availableCount: availableSlots.length,
          conflictedCount: conflictedSlots.length,
        },
        { status: 409 }
      );
    }

    if (availableSlots.length === 0) {
      return NextResponse.json(
        { error: 'ไม่มีรอบเวลาที่สามารถจองได้ เนื่องจากทุกรอบเวลาทับซ้อนกับรายการอื่น' },
        { status: 400 }
      );
    }

    // 8. Generate bookings in database
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const datePrefix = `${thaiYear}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    let todayCount = await prisma.roomBooking.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        },
      },
    });

    const finalIsTimetable = isStaff ? (explicitIsTimetable !== undefined ? Boolean(explicitIsTimetable) : false) : false;
    const finalAutoApprove = isStaff ? Boolean(autoApprove) : false;
    const batchGroupId = `BATCH-${datePrefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const isMultiRoom = roomIds.length > 1;
    const isMultiDay = dates.length > 1;
    const batchTag = finalIsTimetable
      ? `[ตารางเรียน${termName ? `: ${termName}` : ''}]`
      : (isMultiRoom && isMultiDay)
      ? '[จองหลายห้องหลายวัน]'
      : isMultiRoom
      ? '[จองหลายห้อง]'
      : isMultiDay
      ? '[จองต่อเนื่องหลายวัน]'
      : '';

    const finalNote = [batchTag, note?.trim()].filter(Boolean).join(' ');

    const createdBookings: any[] = [];

    for (const slot of availableSlots) {
      todayCount += 1;
      const bookingNumber = `ROOM-${datePrefix}-${String(todayCount).padStart(3, '0')}`;

      const booking = await prisma.roomBooking.create({
        data: {
          batchGroupId,
          bookingNumber,
          roomId: slot.roomId,
          userId,
          title: title.trim(),
          purpose: purpose.trim(),
          isTimetable: finalIsTimetable,
          bookingDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          attendeesCount: Number(attendeesCount) || 1,
          courseId: courseId || null,
          advisorName: advisorName ? formatTeacherName(advisorName) : null,
          contactPhone: contactPhone || null,
          equipmentNeeded: equipmentNeeded || null,
          note: finalNote || null,
          status: finalAutoApprove ? 'APPROVED' : 'PENDING',
          approverId: finalAutoApprove ? userId : null,
          approvedAt: finalAutoApprove ? new Date() : null,
        },
        include: {
          room: true,
        },
      });

      createdBookings.push(booking);
    }

    invalidateCache('room:bookings:');

    // Bundled Notification dispatch (1 notification per batch request, 0 spam)
    const uniqueRoomNames = Array.from(new Set(availableSlots.map((s) => s.roomName))).join(', ');
    const dateSummary = dates.length === 1
      ? dates[0]
      : `${dates[0]} ถึง ${dates[dates.length - 1]} (${dates.length} วัน)`;

    if (!finalAutoApprove) {
      // 1. Notify Approvers (OFFICER, ADMIN, APPROVER) ONCE
      await notifyRoles(
        ['OFFICER', 'ADMIN', 'APPROVER'],
        {
          title: `มีคำขอจองห้องแบบกลุ่ม (${createdBookings.length} รายการ) 🏢`,
          message: `${user.name || 'ผู้ใช้งาน'} ส่งคำขอจองห้อง ${uniqueRoomNames} (${dateSummary}) ชื่องาน: "${title.trim()}"`,
          type: 'APPROVAL',
          priority: 'HIGH',
          linkUrl: `/approvals?batchId=${batchGroupId}&type=ROOM`,
          entityType: 'ROOM',
          entityId: createdBookings[0]?.id,
        },
        'ROOM'
      ).catch(() => {});

      // 2. Notify Requester ONCE
      await createNotification({
        userId,
        title: 'ยื่นคำขอจองห้องแบบกลุ่มสำเร็จ 📋',
        message: `บันทึกคำขอจองห้อง ${createdBookings.length} รายการสำหรับ "${title.trim()}" เรียบร้อยแล้ว อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบ`,
        type: 'STATUS_UPDATE',
        priority: 'NORMAL',
        linkUrl: '/rooms',
        entityType: 'ROOM',
        entityId: createdBookings[0]?.id,
      }).catch(() => {});
    } else {
      // Auto-approved by staff
      await createNotification({
        userId,
        title: 'จองห้องปฏิบัติการสำเร็จ 🎉',
        message: `บันทึกและอนุมัติการจองห้อง ${createdBookings.length} รายการ (${uniqueRoomNames}) สำหรับ "${title.trim()}" เรียบร้อยแล้ว`,
        type: 'STATUS_UPDATE',
        priority: 'NORMAL',
        linkUrl: '/schedule',
        entityType: 'ROOM',
        entityId: createdBookings[0]?.id,
      }).catch(() => {});
    }

    return NextResponse.json({
      message: `บันทึกรายการสำเร็จ ${createdBookings.length} รายการ${conflictedSlots.length > 0 ? ` (ข้ามรายการที่ชน ${conflictedSlots.length} รายการ)` : ''}`,
      batchGroupId,
      totalRequested: candidateSlots.length,
      createdCount: createdBookings.length,
      skippedCount: conflictedSlots.length,
      skippedSlots: conflictedSlots,
      bookings: createdBookings,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in batch room bookings:', error);
    return NextResponse.json({ error: error.message || 'Failed to process batch room bookings' }, { status: 500 });
  }
}
