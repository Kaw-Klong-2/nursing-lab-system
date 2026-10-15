import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { formatTeacherName } from '@/lib/user-utils';

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

    // 1. Authorization check: Only ADMIN or OFFICER can use batch/timetable booking
    if (!userId) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'OFFICER')) {
      return NextResponse.json(
        { error: 'เฉพาะผู้ดูแลระบบ (Admin) หรือเจ้าหน้าที่ห้องแล็บ (Officer) เท่านั้นที่สามารถจองหลายห้องหรือจัดตารางเรียนได้' },
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

    const isTimetable = explicitIsTimetable !== undefined ? Boolean(explicitIsTimetable) : (dates.length > 1 || Boolean(courseId));
    const isMultiRoom = roomIds.length > 1;
    const batchTag = isTimetable
      ? `[ตารางเรียน${termName ? `: ${termName}` : ''}]`
      : isMultiRoom
      ? '[จองหลายห้อง]'
      : '';

    const finalNote = [batchTag, note?.trim()].filter(Boolean).join(' ');

    const createdBookings: any[] = [];

    for (const slot of availableSlots) {
      todayCount += 1;
      const bookingNumber = `ROOM-${datePrefix}-${String(todayCount).padStart(3, '0')}`;

      const booking = await prisma.roomBooking.create({
        data: {
          bookingNumber,
          roomId: slot.roomId,
          userId,
          title: title.trim(),
          purpose: purpose.trim(),
          isTimetable,
          bookingDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          attendeesCount: Number(attendeesCount) || 1,
          courseId: courseId || null,
          advisorName: advisorName ? formatTeacherName(advisorName) : null,
          contactPhone: contactPhone || null,
          equipmentNeeded: equipmentNeeded || null,
          note: finalNote || null,
          status: autoApprove ? 'APPROVED' : 'PENDING',
          approverId: autoApprove ? userId : null,
          approvedAt: autoApprove ? new Date() : null,
        },
        include: {
          room: true,
        },
      });

      createdBookings.push(booking);
    }

    invalidateCache('room:bookings:');

    return NextResponse.json({
      message: `บันทึกรายการสำเร็จ ${createdBookings.length} รายการ${conflictedSlots.length > 0 ? ` (ข้ามรายการที่ชน ${conflictedSlots.length} รายการ)` : ''}`,
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
