import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { formatTeacherName, formatRequesterWithRole } from '@/lib/user-utils';
import { createNotification, notifyRoles } from '@/lib/notifications';
import {
  getBangkokParts,
  getBangkokStartOfDay,
  DATE_YYYY_MM_DD_REGEX,
  parseTimeToMinutes,
  isTimeRangeOverlapping,
} from '@/lib/date-time-utils';
import { getSessionFromRequest } from '@/lib/session';

class BatchRoomBookingError extends Error {
  status: number;
  payload: Record<string, unknown>;
  constructor(message: string, status = 400, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.payload = { error: message, ...(extra || {}) };
  }
}

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
    const session = await getSessionFromRequest(req);
    const effectiveUserId = session?.uid;
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

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
      isTimetable: explicitIsTimetable,
    } = body;

    // 1. Authorization check: ADMIN, OFFICER, or TEACHER can use batch booking (from signed session)
    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: { id: true, name: true, prefix: true, role: true, status: true },
    });

    const isStaff = user?.role === 'ADMIN' || user?.role === 'OFFICER';
    const isTeacher = user?.role === 'TEACHER';

    if (!user || (user.status && user.status !== 'ACTIVE') || (!isStaff && !isTeacher)) {
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

    const parsedStart = parseTimeToMinutes(startTime);
    const parsedEnd = parseTimeToMinutes(endTime);
    if (!parsedStart || !parsedEnd) {
      return NextResponse.json(
        { error: 'รูปแบบเวลาไม่ถูกต้อง กรุณาระบุเวลาในรูปแบบ HH:MM (เช่น 08:30 - 12:00)' },
        { status: 400 }
      );
    }

    if (parsedStart.minutes >= parsedEnd.minutes) {
      return NextResponse.json({ error: 'เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุดการใช้งาน' }, { status: 400 });
    }

    const normalizedStartTime = parsedStart.normalized;
    const normalizedEndTime = parsedEnd.normalized;

    const dateObjects: Date[] = [];
    for (const rawDate of dates) {
      const dateMatch = typeof rawDate === 'string' ? rawDate.trim().match(DATE_YYYY_MM_DD_REGEX) : null;
      if (!dateMatch) {
        return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง' }, { status: 400 });
      }
      dateObjects.push(
        new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), 0, 0, 0, 0))
      );
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

      dates.forEach((dStr: string, idx: number) => {
        candidateSlots.push({
          roomId: r.id,
          roomName: r.name,
          roomCode: r.code,
          dateStr: String(dStr).trim().slice(0, 10),
          date: dateObjects[idx],
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
        });
      });
    }

    const minDate = new Date(Math.min(...dateObjects.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dateObjects.map((d) => d.getTime())));
    maxDate.setUTCDate(maxDate.getUTCDate() + 1);

    const evaluateConflicts = async (db: Pick<typeof prisma, 'roomBooking' | 'practiceSlot'>) => {
      const [existingRoomBookings, existingPracticeSlots] = await Promise.all([
        db.roomBooking.findMany({
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
        db.practiceSlot.findMany({
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

      const available: BatchSlotItem[] = [];
      const conflicted: ConflictedSlotItem[] = [];

      for (const slot of candidateSlots) {
        const rbConflict = existingRoomBookings.find((rb) => {
          const rbDateStr = new Date(rb.bookingDate).toISOString().slice(0, 10);
          return (
            rb.roomId === slot.roomId &&
            rbDateStr === slot.dateStr &&
            isTimeRangeOverlapping(parsedStart.minutes, parsedEnd.minutes, rb.startTime, rb.endTime)
          );
        });

        if (rbConflict) {
          conflicted.push({
            ...slot,
            conflictType: rbConflict.status === 'APPROVED' ? 'APPROVED_BOOKING' : 'PENDING_BOOKING',
            conflictTitle: rbConflict.title,
            conflictTime: `${rbConflict.startTime} - ${rbConflict.endTime} น.`,
          });
          continue;
        }

        const psConflict = existingPracticeSlots.find((ps) => {
          const psDateStr = new Date(ps.date).toISOString().slice(0, 10);
          return (
            ps.roomId === slot.roomId &&
            psDateStr === slot.dateStr &&
            isTimeRangeOverlapping(parsedStart.minutes, parsedEnd.minutes, ps.startTime, ps.endTime)
          );
        });

        if (psConflict) {
          conflicted.push({
            ...slot,
            conflictType: 'PRACTICE_SLOT',
            conflictTitle: 'รอบเปิดฝึกปฏิบัติการทักษะด้วยตนเอง',
            conflictTime: `${psConflict.startTime} - ${psConflict.endTime} น.`,
          });
          continue;
        }

        available.push(slot);
      }

      return { availableSlots: available, conflictedSlots: conflicted };
    };

    // 5. If PREVIEW ONLY, return conflict preview analysis immediately
    if (previewOnly) {
      const { availableSlots, conflictedSlots } = await evaluateConflicts(prisma);
      return NextResponse.json({
        totalSlots: candidateSlots.length,
        availableCount: availableSlots.length,
        conflictedCount: conflictedSlots.length,
        availableSlots,
        conflictedSlots,
      });
    }

    // 6. Execute conflict check + batch create atomically inside transaction with P2002 retry
    const finalIsTimetable = isStaff ? (explicitIsTimetable !== undefined ? Boolean(explicitIsTimetable) : false) : false;
    const finalAutoApprove = isStaff ? Boolean(autoApprove) : false;

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

    let txOutput: {
      createdBookings: any[];
      availableSlots: BatchSlotItem[];
      conflictedSlots: ConflictedSlotItem[];
      batchGroupId: string;
    } | null = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        txOutput = await prisma.$transaction(
          async (tx) => {
            const { availableSlots, conflictedSlots } = await evaluateConflicts(tx);

            if (conflictedSlots.length > 0 && !skipConflicts) {
              throw new BatchRoomBookingError(
                `มีรายการชนตารางทั้งหมด ${conflictedSlots.length} รายการ กรุณาตรวจสอบหรือเปิดใช้งานตัวเลือก "ข้ามรายการที่ชน"`,
                409,
                {
                  conflictedSlots,
                  availableCount: availableSlots.length,
                  conflictedCount: conflictedSlots.length,
                }
              );
            }

            if (availableSlots.length === 0) {
              throw new BatchRoomBookingError(
                'ไม่มีรอบเวลาที่สามารถจองได้ เนื่องจากทุกรอบเวลาทับซ้อนกับรายการอื่น',
                400
              );
            }

            const now = new Date();
            const bkk = getBangkokParts(now);
            const thaiYear = bkk.year + 543;
            const datePrefix = `${thaiYear}${String(bkk.month).padStart(2, '0')}${String(bkk.day).padStart(2, '0')}`;
            const bnPrefix = `ROOM-${datePrefix}-`;

            const [todayCount, latestBooking] = await Promise.all([
              tx.roomBooking.count({
                where: {
                  createdAt: {
                    gte: getBangkokStartOfDay(now),
                  },
                },
              }),
              tx.roomBooking.findFirst({
                where: {
                  bookingNumber: { startsWith: bnPrefix },
                },
                orderBy: { bookingNumber: 'desc' },
                select: { bookingNumber: true },
              }),
            ]);

            const latestSeq = latestBooking?.bookingNumber
              ? parseInt(latestBooking.bookingNumber.slice(bnPrefix.length), 10) || 0
              : 0;
            let nextSeq = Math.max(todayCount, latestSeq);

            const genBatchGroupId = `BATCH-${datePrefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const createdList: any[] = [];

            for (const slot of availableSlots) {
              nextSeq += 1;
              const bookingNumber = `${bnPrefix}${String(nextSeq).padStart(3, '0')}`;

              const createdBooking = await tx.roomBooking.create({
                data: {
                  batchGroupId: genBatchGroupId,
                  bookingNumber,
                  roomId: slot.roomId,
                  userId: effectiveUserId,
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
                  approverId: finalAutoApprove ? effectiveUserId : null,
                  approvedAt: finalAutoApprove ? new Date() : null,
                },
                include: {
                  room: true,
                },
              });

              createdList.push(createdBooking);
            }

            return {
              createdBookings: createdList,
              availableSlots,
              conflictedSlots,
              batchGroupId: genBatchGroupId,
            };
          },
          { timeout: 25000 }
        );
        break;
      } catch (txErr: any) {
        if (txErr?.code === 'P2002' && attempt < maxAttempts) {
          continue;
        }
        throw txErr;
      }
    }

    if (!txOutput) {
      throw new Error('Failed to create batch room bookings after retries');
    }

    const { createdBookings, availableSlots, conflictedSlots, batchGroupId } = txOutput;

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
          message: `${formatRequesterWithRole(user)} ส่งคำขอจองห้อง ${uniqueRoomNames} (${dateSummary}) ชื่องาน: "${title.trim()}"`,
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
        userId: effectiveUserId,
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
        userId: effectiveUserId,
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
    if (error instanceof BatchRoomBookingError) {
      return NextResponse.json(error.payload, { status: error.status });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'เกิดการจองห้องซ้อนกันในเวลาเดียวกัน กรุณาลองใหม่อีกครั้ง' },
        { status: 409 }
      );
    }
    console.error('Error in batch room bookings:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างคำขอจองห้องแบบกลุ่ม' }, { status: 500 });
  }
}
