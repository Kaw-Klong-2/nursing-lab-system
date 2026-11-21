import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { formatTeacherName, formatUserName } from '@/lib/user-utils';
import { createNotification } from '@/lib/notifications';
import { logActivity } from '@/lib/activity-log';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      actorUserId,
      studentUserId,
      slotId,
      skillTopic,
      courseId,
      advisorName,
      objectives,
      notes,
    } = body;

    if (!actorUserId || !studentUserId || !slotId || !skillTopic || !String(skillTopic).trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุรอบเวลา นิสิต และหัวข้อหัตถการที่เข้าฝึกให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, role: true, email: true, name: true },
    });

    const canAct =
      actor &&
      (['ADMIN', 'OFFICER', 'TEACHER', 'APPROVER'].includes(actor.role) ||
        actor.email?.includes('teacher'));

    if (!canAct) {
      return NextResponse.json(
        { error: 'เฉพาะเจ้าหน้าที่ อาจารย์ หรือผู้ดูแลระบบเท่านั้นที่สามารถบันทึก Walk-in ได้' },
        { status: 403 }
      );
    }

    const [slot, student] = await Promise.all([
      prisma.practiceSlot.findUnique({
        where: { id: slotId },
        include: { room: true },
      }),
      prisma.user.findUnique({
        where: { id: studentUserId },
        select: { id: true, prefix: true, name: true, studentId: true },
      }),
    ]);

    if (!slot) {
      return NextResponse.json({ error: 'ไม่พบรอบเวลาที่เลือก' }, { status: 404 });
    }
    if (!slot.isOpen) {
      return NextResponse.json(
        { error: `รอบเวลานี้ปิดให้บริการ (${slot.closeReason || 'ไม่สามารถเช็คอินได้'})` },
        { status: 400 }
      );
    }
    if (!student) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลนิสิตที่เลือก' }, { status: 404 });
    }

    // Check if student already has an active booking in this slot
    const existingBooking = await prisma.practiceBooking.findFirst({
      where: {
        userId: studentUserId,
        slotId,
        status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN'] },
      },
      include: {
        user: true,
        slot: { include: { room: true } },
        approver: true,
      },
    });

    if (existingBooking) {
      if (existingBooking.status === 'CHECKED_IN') {
        return NextResponse.json(
          { error: 'นิสิตได้เช็คอินในรอบเวลานี้ไปแล้ว' },
          { status: 400 }
        );
      }

      const now = new Date();
      const updated = await prisma.practiceBooking.update({
        where: { id: existingBooking.id },
        data: {
          status: 'CHECKED_IN',
          checkInTime: now,
          ...(existingBooking.status === 'PENDING'
            ? { approverId: actor.id, approvedAt: now }
            : {}),
        },
        include: {
          user: true,
          slot: { include: { room: true } },
          approver: true,
          course: true,
        },
      });

      createNotification({
        userId: student.id,
        title: 'เช็คอินเข้าห้องฝึกสำเร็จ 🏥',
        message: `เจ้าหน้าที่บันทึกเช็คอินเข้า ${updated.slot?.room?.name || 'ห้องปฏิบัติการ'} ให้ท่านเรียบร้อยแล้ว`,
        type: 'SYSTEM',
        linkUrl: '/practice/my-bookings',
        entityType: 'PRACTICE',
        entityId: updated.id,
      }).catch(() => {});

      logActivity({
        userId: actor.id,
        action: 'UPDATE',
        entityType: 'PRACTICE_BOOKING',
        entityId: updated.id,
        entityTitle: updated.bookingNumber,
        details: `เช็คอินหน้าห้องให้นิสิต ${formatUserName(student)} (${updated.bookingNumber})`,
      });

      return NextResponse.json({
        message: 'พบคำขอเดิมในรอบนี้ และดำเนินการเช็คอินเข้าห้องแล็บสำเร็จ',
        booking: updated,
      });
    }

    // Check remaining capacity in the slot
    const activeCount = await prisma.practiceBooking.count({
      where: {
        slotId,
        status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN'] },
      },
    });

    if (activeCount >= slot.maxCapacity) {
      return NextResponse.json(
        { error: `รอบเวลานี้มีผู้เข้าฝึกเต็มความจุแล้ว (${activeCount}/${slot.maxCapacity} คน)` },
        { status: 400 }
      );
    }

    // Resolve advisorName
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

    // Generate collision-safe bookingNumber
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countTotal = await prisma.practiceBooking.count();
    let seq = countTotal + 1;
    let bookingNumber = `SPB-${todayStr}-${String(seq).padStart(3, '0')}`;
    const existingNum = await prisma.practiceBooking.findUnique({ where: { bookingNumber } });
    if (existingNum) {
      bookingNumber = `SPB-${todayStr}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    }

    const qrCodeToken = `SPK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const trimmedNotes = notes && String(notes).trim() ? String(notes).trim() : '';
    const walkInNotes = `[Walk-in หน้าห้อง${trimmedNotes ? `: ${trimmedNotes}` : ''}]`;
    const now = new Date();

    const created = await prisma.practiceBooking.create({
      data: {
        bookingNumber,
        userId: studentUserId,
        slotId,
        skillTopic: String(skillTopic).trim(),
        objectives: objectives && String(objectives).trim() ? String(objectives).trim() : null,
        advisorName: finalAdvisorName,
        courseId: courseId || null,
        status: 'CHECKED_IN',
        approverId: actor.id,
        approvedAt: now,
        qrCodeToken,
        checkInTime: now,
        bookedById: actor.id,
        notes: walkInNotes,
      },
      include: {
        user: true,
        slot: { include: { room: true } },
        approver: true,
        course: true,
      },
    });

    createNotification({
      userId: student.id,
      title: 'ลงทะเบียน Walk-in และเช็คอินเข้าห้องฝึกสำเร็จ 🏥',
      message: `บันทึกเวลาเข้าฝึก "${created.skillTopic}" ที่ ${created.slot?.room?.name || 'ห้องปฏิบัติการ'} เรียบร้อยแล้ว (อย่าลืมเช็คเอาท์เมื่อฝึกเสร็จ)`,
      type: 'SYSTEM',
      linkUrl: '/practice/my-bookings',
      entityType: 'PRACTICE',
      entityId: created.id,
    }).catch(() => {});

    logActivity({
      userId: actor.id,
      action: 'BOOKING_CREATE',
      entityType: 'PRACTICE_BOOKING',
      entityId: created.id,
      entityTitle: created.bookingNumber,
      details: `บันทึก Walk-in หน้าห้องให้นิสิต ${formatUserName(student)} (${student.studentId || '-'}) หัตถการ: ${created.skillTopic}`,
    });

    return NextResponse.json({
      message: 'บันทึก Walk-in และเช็คอินเข้าห้องแล็บสำเร็จ',
      booking: created,
    });
  } catch (error: any) {
    console.error('Error creating walk-in practice booking:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึก Walk-in' },
      { status: 500 }
    );
  }
}
