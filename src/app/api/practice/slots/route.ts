import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseDateAsUtcMidnight(dateInput: string | Date): Date {
  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.slice(0, 10);
    const [y, m, d] = cleanStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }
  }
  const dObj = new Date(dateInput);
  return new Date(Date.UTC(dObj.getUTCFullYear(), dObj.getUTCMonth(), dObj.getUTCDate(), 0, 0, 0, 0));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const roomId = searchParams.get('roomId');

    const where: any = {};
    if (roomId) where.roomId = roomId;

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const monthParam = searchParams.get('month'); // 1-12
    const yearParam = searchParams.get('year'); // e.g. 2026
    const allParam = searchParams.get('all');

    if (allParam === 'true') {
      // Return all slots without date restriction
    } else if (dateParam) {
      const cleanStr = dateParam.slice(0, 10);
      const [y, m, d] = cleanStr.split('-').map(Number);
      const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      // Include legacy slots saved at 17:00 UTC previous day (UTC+7 midnight)
      const legacyStart = new Date(Date.UTC(y, m - 1, d - 1, 16, 0, 0, 0));

      where.date = {
        gte: legacyStart,
        lte: endOfDay,
      };
    } else if (startDateParam && endDateParam) {
      const start = parseDateAsUtcMidnight(startDateParam);
      const [ey, em, ed] = endDateParam.slice(0, 10).split('-').map(Number);
      const end = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

      where.date = {
        gte: start,
        lte: end,
      };
    } else if (monthParam && yearParam) {
      const y = parseInt(yearParam, 10);
      const m = parseInt(monthParam, 10) - 1;
      const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

      where.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else {
      // Default: current month +/- 15 days or 30 days
      const today = new Date();
      const past = new Date(today);
      past.setDate(today.getDate() - 15);
      past.setHours(0, 0, 0, 0);
      const future = new Date(today);
      future.setDate(today.getDate() + 45);
      future.setHours(23, 59, 59, 999);

      where.date = {
        gte: past,
        lte: future,
      };
    }

    const slots = await prisma.practiceSlot.findMany({
      where,
      include: {
        room: true,
        bookings: {
          select: {
            id: true,
            status: true,
            userId: true,
            bookingNumber: true,
            skillTopic: true,
            user: {
              select: {
                id: true,
                name: true,
                prefix: true,
                studentId: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const enrichedSlots = slots.map((slot) => {
      const activeBookings = slot.bookings.filter(
        (b) => b.status === 'APPROVED' || b.status === 'CHECKED_IN'
      );
      const pendingBookings = slot.bookings.filter((b) => b.status === 'PENDING');
      const bookedCount = activeBookings.length;
      const availableSeats = Math.max(0, slot.maxCapacity - bookedCount);

      return {
        ...slot,
        bookedCount,
        pendingCount: pendingBookings.length,
        availableSeats,
        isFull: availableSeats <= 0,
      };
    });

    return NextResponse.json(enrichedSlots);
  } catch (error: any) {
    console.error('Error fetching practice slots:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch slots' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Batch creation support
    if (Array.isArray(body.slots) && body.slots.length > 0) {
      // Validate each slot against existing slots and approved room bookings
      for (const s of body.slots) {
        const sDate = parseDateAsUtcMidnight(s.date);
        const sStart = new Date(sDate);
        sStart.setHours(0, 0, 0, 0);
        const sEnd = new Date(sStart);
        sEnd.setDate(sStart.getDate() + 1);

        const slotConflict = await prisma.practiceSlot.findFirst({
          where: {
            roomId: s.roomId,
            date: { gte: sStart, lt: sEnd },
            startTime: { lt: s.endTime },
            endTime: { gt: s.startTime },
          },
          include: { room: true },
        });

        if (slotConflict) {
          return NextResponse.json(
            {
              error: `ไม่สามารถสร้างรอบฝึกทักษะได้: ห้อง "${slotConflict.room.name}" วันที่ ${s.date} มีรอบฝึกทักษะซ้อนทับกันอยู่แล้ว (${slotConflict.startTime} - ${slotConflict.endTime} น.)`,
            },
            { status: 409 }
          );
        }

        const roomConflict = await prisma.roomBooking.findFirst({
          where: {
            roomId: s.roomId,
            bookingDate: { gte: sStart, lt: sEnd },
            status: 'APPROVED',
            startTime: { lt: s.endTime },
            endTime: { gt: s.startTime },
          },
        });

        if (roomConflict) {
          return NextResponse.json(
            {
              error: `ไม่สามารถสร้างรอบฝึกทักษะได้: วันที่ ${s.date} เวลา ${s.startTime} - ${s.endTime} น. ห้องนี้ได้รับการอนุมัติให้ใช้เรียนการสอน/กิจกรรมแล้ว ("${roomConflict.title}")`,
            },
            { status: 409 }
          );
        }
      }

      const dataToInsert = body.slots.map((s: any) => {
        const slotDate = parseDateAsUtcMidnight(s.date);
        return {
          roomId: s.roomId,
          date: slotDate,
          startTime: s.startTime,
          endTime: s.endTime,
          maxCapacity: Number(s.maxCapacity) || 6,
          isOpen: s.isOpen !== undefined ? Boolean(s.isOpen) : true,
          closeReason: s.closeReason || null,
          availableSkills: s.availableSkills || null,
        };
      });

      const result = await prisma.practiceSlot.createMany({
        data: dataToInsert,
      });

      return NextResponse.json({ success: true, count: result.count }, { status: 201 });
    }

    const { roomId, date, startTime, endTime, maxCapacity, isOpen, closeReason, availableSkills } = body;

    if (!roomId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลห้อง, วันที่, และเวลาให้ครบถ้วน' }, { status: 400 });
    }

    const slotDate = parseDateAsUtcMidnight(date);
    const slotDayStart = new Date(slotDate);
    slotDayStart.setHours(0, 0, 0, 0);
    const slotDayEnd = new Date(slotDayStart);
    slotDayEnd.setDate(slotDayStart.getDate() + 1);

    // 1. Check existing practice slot in same room with overlapping time
    const existingSlot = await prisma.practiceSlot.findFirst({
      where: {
        roomId,
        date: { gte: slotDayStart, lt: slotDayEnd },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: { room: true },
    });

    if (existingSlot) {
      return NextResponse.json(
        {
          error: `ห้อง "${existingSlot.room.name}" มีการเปิดรอบฝึกทักษะในช่วงเวลานี้อยู่แล้ว (${existingSlot.startTime} - ${existingSlot.endTime} น.) ไม่สามารถเปิดรอบซ้ำซ้อนได้`,
        },
        { status: 409 }
      );
    }

    // 2. Check approved room booking in same room with overlapping time
    const conflictingApprovedRoom = await prisma.roomBooking.findFirst({
      where: {
        roomId,
        bookingDate: { gte: slotDayStart, lt: slotDayEnd },
        status: 'APPROVED',
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (conflictingApprovedRoom) {
      return NextResponse.json(
        {
          error: `ไม่สามารถเปิดรอบฝึกทักษะได้: ห้องนี้ได้รับการอนุมัติให้ใช้งานการเรียนการสอน/กิจกรรมแล้ว (${conflictingApprovedRoom.startTime} - ${conflictingApprovedRoom.endTime} น.: "${conflictingApprovedRoom.title}")`,
        },
        { status: 409 }
      );
    }

    const slot = await prisma.practiceSlot.create({
      data: {
        roomId,
        date: slotDate,
        startTime,
        endTime,
        maxCapacity: Number(maxCapacity) || 6,
        isOpen: isOpen !== undefined ? isOpen : true,
        closeReason: closeReason || null,
        availableSkills: availableSkills || null,
      },
      include: {
        room: true,
      },
    });

    return NextResponse.json(slot);
  } catch (error: any) {
    console.error('Error creating practice slot:', error);
    return NextResponse.json({ error: error.message || 'Failed to create slot' }, { status: 500 });
  }
}
