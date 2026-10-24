import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendApprovalRequestEmail } from '@/lib/email';
import { formatUserName, formatTeacherName, formatRequesterWithRole } from '@/lib/user-utils';
import { notifyRoles, notifyAdvisorByName, createNotification } from '@/lib/notifications';
import { combineSlotDateAndBangkokTime, getBangkokEndOfDay } from '@/lib/date-time-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const slotId = searchParams.get('slotId');

    const where: any = {};
    if (userId) where.userId = userId;
    if (status && status !== 'ALL') where.status = status;
    if (slotId) where.slotId = slotId;

    const bookings = await prisma.practiceBooking.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Error fetching practice bookings:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      slotId,
      skillTopic,
      objectives,
      advisorName,
      courseId,
      practiceKitId,
      additionalEquipment,
      companionUserIds = [],
    } = body;

    if (!userId || !slotId || !skillTopic) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลนิสิต รอบเวลา และหัตถการที่ต้องการฝึก' },
        { status: 400 }
      );
    }

    // รวมรายชื่อผู้เข้าฝึกทั้งหมด (ผู้จองหลัก + เพื่อนร่วมกลุ่ม)
    const allUserIds = Array.from(
      new Set([userId, ...(Array.isArray(companionUserIds) ? companionUserIds : [])].filter(Boolean))
    );
    const totalSeats = allUserIds.length;

    // 1. Fetch slot & config
    const [slot, config] = await Promise.all([
      prisma.practiceSlot.findUnique({
        where: { id: slotId },
        include: { room: true },
      }),
      prisma.practiceConfig.findUnique({
        where: { id: 'default' },
      }),
    ]);

    if (!slot) {
      return NextResponse.json({ error: 'ไม่พบรอบเวลาที่เลือก' }, { status: 404 });
    }

    if (!slot.isOpen) {
      return NextResponse.json(
        { error: `รอบเวลานี้ปิดการให้บริการ (${slot.closeReason || 'กรุณาเลือกรอบเวลาอื่น'})` },
        { status: 400 }
      );
    }

    // 2. Validate advance booking window
    const now = new Date();
    const slotStartDateTime = combineSlotDateAndBangkokTime(slot.date, slot.startTime);

    const maxAdvanceDays = config?.maxAdvanceDays || 7;
    const futureDateTarget = new Date(now.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
    const maxFutureDate = getBangkokEndOfDay(futureDateTarget);

    if (slotStartDateTime > maxFutureDate) {
      return NextResponse.json(
        { error: `ระบบเปิดให้จองล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน` },
        { status: 400 }
      );
    }

    if (slotStartDateTime < now) {
      return NextResponse.json(
        { error: 'ไม่สามารถจองรอบเวลาที่ผ่านมาแล้วได้' },
        { status: 400 }
      );
    }

    // 3. Check capacity in this slot for the whole group
    const activeCount = await prisma.practiceBooking.count({
      where: {
        slotId,
        status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN'] },
      },
    });

    const availableSeats = Math.max(0, slot.maxCapacity - activeCount);
    if (activeCount + totalSeats > slot.maxCapacity) {
      return NextResponse.json(
        {
          error: `รอบเวลานี้เหลือที่ว่างเพียง ${availableSeats} ที่ ไม่เพียงพอสำหรับผู้เข้าฝึก ${totalSeats} ท่าน (ความจุห้อง ${slot.maxCapacity} ท่าน)`,
        },
        { status: 400 }
      );
    }

    // 3.1 Cross-system conflict: Check if room has an APPROVED room booking during this slot's time
    const sDate = new Date(slot.date);
    const slotDayStart = new Date(Date.UTC(sDate.getUTCFullYear(), sDate.getUTCMonth(), sDate.getUTCDate(), 0, 0, 0, 0));
    const slotDayEnd = new Date(slotDayStart.getTime() + 24 * 60 * 60 * 1000);

    const conflictingRoom = await prisma.roomBooking.findFirst({
      where: {
        roomId: slot.roomId,
        bookingDate: {
          gte: slotDayStart,
          lt: slotDayEnd,
        },
        status: 'APPROVED',
        startTime: { lt: slot.endTime },
        endTime: { gt: slot.startTime },
      },
    });

    if (conflictingRoom) {
      return NextResponse.json(
        {
          error: `ห้องนี้ได้รับการอนุมัติให้ใช้งานการเรียนการสอน/กิจกรรมแล้ว (${conflictingRoom.startTime} - ${conflictingRoom.endTime} น.: "${conflictingRoom.title}") จึงไม่สามารถจองรอบฝึกทักษะในช่วงเวลานี้ได้`,
        },
        { status: 409 }
      );
    }

    // 4. Fetch users for validation
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true, prefix: true, studentId: true, email: true },
    });
    const userMap = new Map(targetUsers.map((u) => [u.id, u]));

    // Check duplicate or overlapping practice bookings for EACH member in the group
    for (const uid of allUserIds) {
      const u = userMap.get(uid);
      const uLabel = u ? `${formatUserName(u)} (${u.studentId || 'ไม่ระบุรหัส'})` : 'นิสิตในกลุ่ม';

      const existingSameSlot = await prisma.practiceBooking.findFirst({
        where: {
          userId: uid,
          slotId,
          status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN'] },
        },
      });

      if (existingSameSlot) {
        return NextResponse.json(
          { error: `${uLabel} ได้ยื่นคำขอในรอบเวลานี้ไปแล้ว` },
          { status: 400 }
        );
      }

      const overlappingBooking = await prisma.practiceBooking.findFirst({
        where: {
          userId: uid,
          status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN'] },
          slot: {
            date: {
              gte: slotDayStart,
              lt: slotDayEnd,
            },
            startTime: { lt: slot.endTime },
            endTime: { gt: slot.startTime },
          },
        },
        include: {
          slot: {
            include: {
              room: true,
            },
          },
        },
      });

      if (overlappingBooking) {
        const bookedRoom = overlappingBooking.slot.room?.name || 'ห้องปฏิบัติการ';
        const bookedTime = `${overlappingBooking.slot.startTime} - ${overlappingBooking.slot.endTime} น.`;
        return NextResponse.json(
          {
            error: `${uLabel} มีคิวจองรอบฝึกทักษะในช่วงเวลาที่ซ้อนทับกันแล้ว (${bookedRoom} เวลา ${bookedTime}) กรุณาตรวจสอบตารางเวลาของสมาชิกในกลุ่ม`,
          },
          { status: 400 }
        );
      }
    }

    // 5. Generate group code if more than 1 participant
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const isGroup = allUserIds.length > 1;
    const groupCode = isGroup
      ? `GRP-${todayStr}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
      : null;

    // 6. Resolve advisorName: from course if provided, otherwise from user selection
    let finalAdvisorName = advisorName ? formatTeacherName(advisorName) : null;
    if (courseId && !finalAdvisorName) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorName: true },
      });
      if (course?.instructorName) {
        finalAdvisorName = formatTeacherName(course.instructorName);
      }
    }

    // ผู้จองหลัก
    const bookerUser = userMap.get(userId);
    const bookerName = bookerUser ? formatUserName(bookerUser) : 'นิสิต';

    // 7. Create individual linked bookings in transaction
    const countToday = await prisma.practiceBooking.count();

    const createdBookings = await prisma.$transaction(async (tx) => {
      const results = [];
      for (let i = 0; i < allUserIds.length; i++) {
        const currentUid = allUserIds[i];
        const isCurrentBooker = currentUid === userId;
        const bNumber = `SPB-${todayStr}-${String(countToday + i + 1).padStart(3, '0')}`;
        const qrCodeToken = `SPK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

        const companionNotes = isGroup
          ? isCurrentBooker
            ? `[กลุ่ม ${allUserIds.length} คน: ${bookerName} (ผู้จองหลัก) พร้อมเพื่อน ${allUserIds.length - 1} คน]`
            : `[กลุ่ม ${allUserIds.length} คน: จองร่วมกับ ${bookerName}]`
          : null;

        const bRecord = await tx.practiceBooking.create({
          data: {
            bookingNumber: bNumber,
            userId: currentUid,
            slotId,
            skillTopic,
            objectives: objectives || null,
            advisorName: finalAdvisorName,
            courseId: courseId || null,
            practiceKitId: practiceKitId || null,
            additionalEquipment: additionalEquipment || null,
            status: 'PENDING',
            qrCodeToken,
            groupCode,
            bookedById: userId,
            notes: companionNotes,
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
          },
        });
        results.push(bRecord);
      }
      return results;
    });

    const primaryBooking = createdBookings.find((b) => b.userId === userId) || createdBookings[0];
    const slotDateFormatted = new Date(slot.date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    // 8. Notifications to companions
    if (isGroup) {
      for (const b of createdBookings) {
        if (b.userId !== userId) {
          createNotification({
            userId: b.userId,
            title: 'เพื่อนได้เพิ่มชื่อท่านในรอบฝึกปฏิบัติการ 👥',
            message: `${bookerName} ได้ลงทะเบียนรอบฝึกทักษะ (${skillTopic}) ในวันที่ ${slotDateFormatted} เวลา ${slot.startTime} - ${slot.endTime} น. ร่วมกับท่าน`,
            type: 'STATUS_UPDATE',
            linkUrl: '/practice',
            entityType: 'PRACTICE',
            entityId: b.id,
          }).catch(() => {});
        }
      }
    }

    // Background notification: Send email to advisor/approver
    try {
      let approverEmail = '';
      let approverName = finalAdvisorName || 'อาจารย์ผู้ดูแล';

      // Find user matching advisorName
      if (finalAdvisorName) {
        const advisorUser = await prisma.user.findFirst({
          where: {
            OR: [
              { name: { contains: finalAdvisorName } },
              { email: { contains: 'teacher' } },
              { role: 'APPROVER' },
            ],
          },
        });
        if (advisorUser?.email) {
          approverEmail = advisorUser.email;
          approverName = formatTeacherName(advisorUser);
        }
      }

      if (!approverEmail) {
        // Fallback to first active approver
        const fallbackApprover = await prisma.user.findFirst({
          where: { role: 'APPROVER', status: 'ACTIVE' },
        });
        if (fallbackApprover?.email) {
          approverEmail = fallbackApprover.email;
          approverName = formatTeacherName(fallbackApprover);
        }
      }

      if (approverEmail) {
        const slotDateFormatted = new Date(slot.date).toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        sendApprovalRequestEmail({
          approverEmail,
          approverName,
          studentName: formatUserName(primaryBooking.user) || 'นิสิต',
          studentId: primaryBooking.user?.studentId || undefined,
          type: 'PRACTICE',
          title: `คำขอจองห้องฝึกปฏิบัติการ (${primaryBooking.bookingNumber})`,
          requestId: primaryBooking.id,
          details: [
            { label: 'รหัสคำขอ', value: primaryBooking.bookingNumber },
            { label: 'หัตถการที่ขอฝึก', value: skillTopic },
            { label: 'ห้องปฏิบัติการ', value: slot.room?.name || 'ห้องแล็บ' },
            { label: 'วันและเวลานัดหมาย', value: `${slotDateFormatted} เวลา ${slot.startTime} - ${slot.endTime} น.` },
            { label: 'รายวิชา', value: primaryBooking.course ? `[${primaryBooking.course.code}] ${primaryBooking.course.name}` : 'ฝึกอิสระนอกหลักสูตร' },
            { label: 'ชุดฝึก Practice Kit', value: primaryBooking.practiceKit?.name || 'ใช้อุปกรณ์ประจำห้องแล็บ' },
            ...(isGroup ? [{ label: 'รูปแบบการเข้าฝึก', value: `ฝึกเป็นกลุ่ม ${allUserIds.length} คน` }] : []),
          ],
        }).catch((err) => console.error('Error sending background approval email:', err));
      }
    } catch (emailErr) {
      console.error('Failed to trigger approval email:', emailErr);
    }

    // In-app & Push notifications (awaited)
    const requesterDisplay = formatRequesterWithRole(primaryBooking.user);
    await Promise.allSettled([
      notifyRoles(
        ['OFFICER', 'ADMIN', 'APPROVER'],
        {
          templateId: 'PRACTICE_BOOKING_SUBMITTED',
          variables: {
            studentName: formatUserName(primaryBooking.user) || 'นิสิต',
            roomName: slot.room?.name || 'ห้องปฏิบัติการ',
            date: primaryBooking.slot?.date?.toISOString().slice(0, 10) || '',
            timeSlot: `${primaryBooking.slot?.startTime || ''} - ${primaryBooking.slot?.endTime || ''}`,
            bookingNumber: primaryBooking.bookingNumber,
          },
          title: 'มีคำขอจองห้องฝึกปฏิบัติการใหม่ 🏢',
          message: `${requesterDisplay} ยื่นคำขอจองเลขที่ ${primaryBooking.bookingNumber} (${primaryBooking.skillTopic})${isGroup ? ` (กลุ่ม ${allUserIds.length} คน)` : ''}`,
          type: 'APPROVAL',
          linkUrl: '/practice/bookings',
          entityType: 'PRACTICE',
          entityId: primaryBooking.id,
          priority: 'HIGH',
        },
        'PRACTICE'
      ),

      finalAdvisorName
        ? notifyAdvisorByName(finalAdvisorName, {
            title: 'มีคำขอจองห้องฝึกปฏิบัติการรอกดรับทราบ 👩‍🏫',
            message: `${requesterDisplay} ยื่นคำขอจอง ${primaryBooking.bookingNumber} (${primaryBooking.skillTopic}) รออาจารย์รับทราบ`,
            type: 'REQUEST_SUBMITTED',
            priority: 'HIGH',
            linkUrl: '/approvals',
            entityType: 'PRACTICE',
            entityId: primaryBooking.id,
          })
        : Promise.resolve(null),

      createNotification({
        userId: primaryBooking.userId,
        title: 'ยื่นคำขอจองห้องฝึกปฏิบัติการเรียบร้อยแล้ว ✅',
        message: `คำขอจองห้องฝึก ${primaryBooking.slot?.room?.name || ''} (${primaryBooking.bookingNumber}) ถูกส่งเข้าสู่ระบบแล้ว และอยู่ระหว่างรอการอนุมัติ${isGroup ? ` (ร่วมกับเพื่อน ${allUserIds.length - 1} คน)` : ''}`,
        type: 'STATUS_UPDATE',
        priority: 'NORMAL',
        linkUrl: '/practice/my-bookings',
        entityType: 'PRACTICE',
        entityId: primaryBooking.id,
      }),
    ]);

    return NextResponse.json({
      ...primaryBooking,
      groupBookings: createdBookings,
      groupCount: createdBookings.length,
    });
  } catch (error: any) {
    console.error('Error creating practice booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to create booking' }, { status: 500 });
  }
}
