import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { notifyRoles, notifyAdvisorByName, createNotification } from '@/lib/notifications';
import { formatUserName, formatRequesterWithRole } from '@/lib/user-utils';
import { getBangkokParts, getBangkokStartOfDay } from '@/lib/date-time-utils';
import { isViewerUser, VIEWER_FORBIDDEN_MESSAGE } from '@/lib/viewer-guard';

const TIME_HH_MM_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DATE_YYYY_MM_DD_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;

function parseTimeToMinutes(timeStr: unknown): { minutes: number; normalized: string } | null {
  if (typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(TIME_HH_MM_REGEX);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  return {
    minutes: hours * 60 + mins,
    normalized: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
  };
}

function isTimeRangeOverlapping(startA: number, endA: number, startBStr: string, endBStr: string): boolean {
  const bStart = parseTimeToMinutes(startBStr);
  const bEnd = parseTimeToMinutes(endBStr);
  if (!bStart || !bEnd) return false;
  return startA < bEnd.minutes && endA > bStart.minutes;
}

class RoomBookingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const date = searchParams.get('date');
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const batchGroupId = searchParams.get('batchGroupId');

    const where: any = {};

    if (batchGroupId) {
      where.batchGroupId = batchGroupId;
    }

    if (roomId && roomId !== 'ALL') {
      where.roomId = roomId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (date) {
      const [y, m, d] = date.slice(0, 10).split('-').map(Number);
      const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const nextDate = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));

      where.bookingDate = {
        gte: targetDate,
        lt: nextDate,
      };
    } else if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1; // 0-based
      const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

      where.bookingDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const bookings = await prisma.roomBooking.findMany({
      where,
      include: {
        room: true,
        user: {
          select: {
            id: true,
            name: true,
            prefix: true,
            email: true,
            studentId: true,
            phone: true,
            role: true,
            department: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            targetYear: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            prefix: true,
            role: true,
          },
        },
      },
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Error fetching room bookings:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลการจองห้องได้' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      roomId,
      bookingDate,
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
      userId,
      isTimetable,
    } = body;

    if (await isViewerUser(userId)) {
      return NextResponse.json({ error: VIEWER_FORBIDDEN_MESSAGE }, { status: 403 });
    }

    // เฉพาะแอดมิน (ADMIN) หรือเจ้าหน้าที่ (OFFICER) เท่านั้นที่มีสิทธิ์เลือกสร้าง 'ตารางเรียน'
    let finalIsTimetable = false;
    if (isTimetable) {
      const creatorUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (creatorUser && (creatorUser.role === 'ADMIN' || creatorUser.role === 'OFFICER')) {
        finalIsTimetable = true;
      }
    }

    if (!roomId || !bookingDate || !startTime || !endTime || !title || !purpose || !userId || !attendeesCount || Number(attendeesCount) <= 0) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ห้อง, วันที่, เวลา, ชื่องาน, วัตถุประสงค์, จำนวนผู้เข้าใช้งาน, ผู้จอง)' },
        { status: 400 }
      );
    }

    // 1. Validate time format and ordering (numeric minute comparison & HH:MM normalization)
    const parsedStart = parseTimeToMinutes(startTime);
    const parsedEnd = parseTimeToMinutes(endTime);
    if (!parsedStart || !parsedEnd) {
      return NextResponse.json(
        { error: 'รูปแบบเวลาไม่ถูกต้อง กรุณาระบุเวลาในรูปแบบ HH:MM (เช่น 08:30 - 12:00)' },
        { status: 400 }
      );
    }

    if (parsedStart.minutes >= parsedEnd.minutes) {
      return NextResponse.json(
        { error: 'เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุดการใช้งาน' },
        { status: 400 }
      );
    }

    const normalizedStartTime = parsedStart.normalized;
    const normalizedEndTime = parsedEnd.normalized;

    const dateMatch = typeof bookingDate === 'string' ? bookingDate.trim().match(DATE_YYYY_MM_DD_REGEX) : null;
    if (!dateMatch) {
      return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง' }, { status: 400 });
    }

    const y = Number(dateMatch[1]);
    const m = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    const bDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const nextDay = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));

    // 2. Conflict checks, booking number generation & create inside transaction (with P2002 retry)
    let booking: any = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        booking = await prisma.$transaction(
          async (tx) => {
            // Check if room exists and is active
            const room = await tx.practiceRoom.findUnique({
              where: { id: roomId },
            });

            if (!room) {
              throw new RoomBookingError('ไม่พบห้องปฏิบัติการที่เลือก', 404);
            }

            if (!room.isActive) {
              throw new RoomBookingError(
                `ห้อง "${room.name}" ปิดให้บริการชั่วคราว ${room.closeReason ? `(${room.closeReason})` : ''} ไม่สามารถจองได้`,
                400
              );
            }

            // 2.1 Check overlapping APPROVED or PENDING room bookings for the same room on the same date
            const existingRoomBookings = await tx.roomBooking.findMany({
              where: {
                roomId,
                bookingDate: {
                  gte: bDate,
                  lt: nextDay,
                },
                status: { in: ['APPROVED', 'PENDING'] },
              },
            });

            const approvedConflict = existingRoomBookings.find(
              (existing) =>
                existing.status === 'APPROVED' &&
                isTimeRangeOverlapping(parsedStart.minutes, parsedEnd.minutes, existing.startTime, existing.endTime)
            );

            if (approvedConflict) {
              throw new RoomBookingError(
                `ห้อง "${room.name}" ได้รับการอนุมัติให้ใช้งานแล้วในช่วงเวลา ${approvedConflict.startTime} - ${approvedConflict.endTime} น. ("${approvedConflict.title}") กรุณาเลือกช่วงเวลาอื่น`,
                409
              );
            }

            const pendingConflict = existingRoomBookings.find(
              (existing) =>
                existing.status === 'PENDING' &&
                isTimeRangeOverlapping(parsedStart.minutes, parsedEnd.minutes, existing.startTime, existing.endTime)
            );

            if (pendingConflict) {
              throw new RoomBookingError(
                `ช่วงเวลา ${pendingConflict.startTime} - ${pendingConflict.endTime} น. มีคำขออื่นรอการพิจารณาอนุมัติอยู่แล้ว ("${pendingConflict.title}") เพื่อป้องกันการจองซ้ำซ้อน กรุณาเลือกช่วงเวลาอื่น`,
                409
              );
            }

            // 2.2 Cross-system conflict: Check overlapping open PracticeSlot for the same room on this date
            const conflictingSlots = await tx.practiceSlot.findMany({
              where: {
                roomId,
                date: {
                  gte: bDate,
                  lt: nextDay,
                },
                isOpen: true,
              },
              include: {
                bookings: {
                  where: {
                    status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN'] },
                  },
                },
              },
            });

            const slotConflict = conflictingSlots.find((s) =>
              isTimeRangeOverlapping(parsedStart.minutes, parsedEnd.minutes, s.startTime, s.endTime)
            );

            if (slotConflict) {
              const activeCount = slotConflict.bookings.length;
              throw new RoomBookingError(
                `ห้อง "${room.name}" มีรอบเปิดฝึกปฏิบัติการทักษะด้วยตนเอง (${slotConflict.startTime} - ${slotConflict.endTime} น.${activeCount > 0 ? ` มีนิสิตจองแล้ว ${activeCount} คน` : ''}) จึงไม่สามารถจองห้องแบบทั่วไปในช่วงเวลานี้ได้`,
                409
              );
            }

            // 2.3 Generate unique Booking Number e.g. "ROOM-25690911-001"
            const now = new Date();
            const bkk = getBangkokParts(now);
            const thaiYear = bkk.year + 543;
            const datePart = `${thaiYear}${String(bkk.month).padStart(2, '0')}${String(bkk.day).padStart(2, '0')}`;
            const bnPrefix = `ROOM-${datePart}-`;

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
            const nextSeq = Math.max(todayCount, latestSeq) + 1;
            const bookingNumber = `${bnPrefix}${String(nextSeq).padStart(3, '0')}`;

            // 2.4 Create Room Booking Record
            return tx.roomBooking.create({
              data: {
                bookingNumber,
                roomId,
                userId,
                title,
                purpose,
                isTimetable: finalIsTimetable,
                bookingDate: bDate,
                startTime: normalizedStartTime,
                endTime: normalizedEndTime,
                attendeesCount: Number(attendeesCount) || 1,
                courseId: courseId || null,
                advisorName: advisorName || null,
                contactPhone: contactPhone || null,
                equipmentNeeded: equipmentNeeded || null,
                note: note || null,
                status: 'PENDING',
              },
              include: {
                room: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    prefix: true,
                    studentId: true,
                    email: true,
                  },
                },
              },
            });
          },
          { timeout: 15000 }
        );
        break;
      } catch (txErr: any) {
        if (txErr?.code === 'P2002' && attempt < maxAttempts) {
          continue;
        }
        throw txErr;
      }
    }

    if (!booking) {
      throw new Error('Failed to create room booking after retries');
    }

    invalidateCache('room:bookings:');

    // Notify room approvers according to scope, advisor, and student confirmation (awaited)
    const requesterDisplay = formatRequesterWithRole(booking.user);
    await Promise.allSettled([
      // 1. Notify Room Approvers (หัวหน้าสำนักงาน, Admin, ผู้ดูแลห้อง)
      notifyRoles(
        ['OFFICER', 'ADMIN', 'APPROVER'],
        {
          templateId: 'ROOM_BOOKING_SUBMITTED',
          variables: {
            studentName: formatUserName(booking.user) || 'นิสิต',
            roomName: booking.room?.name || '',
            date: booking.bookingDate.toISOString().slice(0, 10),
            bookingNumber: booking.bookingNumber,
          },
          title: 'มีคำขอจองห้องปฏิบัติการใหม่ 🏢',
          message: `${requesterDisplay} ขอจองห้อง ${booking.room?.name || ''} (${booking.bookingNumber})`,
          type: 'APPROVAL',
          linkUrl: '/approvals',
          entityType: 'ROOM',
          entityId: booking.id,
          priority: 'HIGH',
        },
        'ROOM'
      ),

      // 2. Notify advisor if specified
      advisorName
        ? notifyAdvisorByName(advisorName, {
            title: 'นิสิตระบุชื่ออาจารย์ในคำขอจองห้องปฏิบัติการ 👩‍🏫',
            message: `${requesterDisplay} ได้ขอจองห้อง ${booking.room?.name || ''} และระบุชื่อท่านเป็นอาจารย์ประจำวิชา`,
            type: 'INSTRUCTOR_ACK',
            linkUrl: '/schedule',
            entityType: 'ROOM',
            entityId: booking.id,
          })
        : Promise.resolve(null),

      // 3. Confirmation notification to the requester
      createNotification({
        userId: booking.userId,
        title: 'ยื่นคำขอจองห้องปฏิบัติการเรียบร้อยแล้ว ✅',
        message: `คำขอจองห้อง ${booking.room?.name || ''} (${booking.bookingNumber}) ถูกส่งเข้าสู่ระบบแล้ว และอยู่ระหว่างรอการอนุมัติ`,
        type: 'STATUS_UPDATE',
        priority: 'NORMAL',
        linkUrl: '/schedule',
        entityType: 'ROOM',
        entityId: booking.id,
      }),
    ]);

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    if (error instanceof RoomBookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'เกิดการจองห้องซ้อนกันในเวลาเดียวกัน กรุณาลองใหม่อีกครั้ง' },
        { status: 409 }
      );
    }
    console.error('Error creating room booking:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างคำขอจองห้องปฏิบัติการ' },
      { status: 500 }
    );
  }
}
