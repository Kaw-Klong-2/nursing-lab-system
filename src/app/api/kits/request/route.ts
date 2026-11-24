import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { formatTeacherName, formatUserName, formatRequesterWithRole } from '@/lib/user-utils';
import { createNotification, notifyAdvisorByName, notifyRoles } from '@/lib/notifications';
import { isViewerUser, VIEWER_FORBIDDEN_MESSAGE } from '@/lib/viewer-guard';
import { isStudentUser, validateStudentCourseEnrollment } from '@/lib/course-enrollment';

// POST: Quick Request for a Practice Kit (Generates Borrow and/or Requisition requests)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      kitId,
      setsRequested, // จำนวนชุดที่ต้องการ เช่น 10 ชุด
      userId,
      courseId,
      purpose,
      borrowDate,
      expectedReturnDate,
      advisorName,
    } = body;

    if (!kitId || !setsRequested || setsRequested < 1) {
      return NextResponse.json(
        { error: 'กรุณาระบุชุดฝึกและจำนวนชุดที่ต้องการ (อย่างน้อย 1 ชุด)' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }

    if (await isViewerUser(userId)) {
      return NextResponse.json({ error: VIEWER_FORBIDDEN_MESSAGE }, { status: 403 });
    }

    const enrollmentCheck = await validateStudentCourseEnrollment({ userId, courseId });
    if (!enrollmentCheck.ok) {
      return enrollmentCheck.errorResponse;
    }

    const kit = await prisma.practiceKit.findUnique({
      where: { id: kitId },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!kit) {
      return NextResponse.json({ error: 'ไม่พบชุดฝึกปฏิบัติการที่เลือก' }, { status: 404 });
    }

    const equipmentItems: { itemId: string; quantity: number }[] = [];
    const consumableItems: { itemId: string; quantity: number }[] = [];

    kit.items.forEach((kitItem) => {
      const totalQty = kitItem.quantity * setsRequested;
      if (kitItem.item.type === 'EQUIPMENT') {
        equipmentItems.push({ itemId: kitItem.itemId, quantity: totalQty });
      } else {
        consumableItems.push({ itemId: kitItem.itemId, quantity: totalQty });
      }
    });

    let createdBorrow = null;
    let createdRequisition = null;

    const defaultBorrowDate = borrowDate ? new Date(borrowDate) : new Date();
    const defaultReturnDate = expectedReturnDate
      ? new Date(expectedReturnDate)
      : new Date(Date.now() + 4 * 60 * 60 * 1000); // default 4 hours

    const fullPurpose = 'ขอใช้ชุดฝึก: ' + kit.name + ' (' + setsRequested + ' ชุด) - ' + (purpose || 'สำหรับการฝึกปฏิบัติการเรียนการสอน');

    const cleanAdvisorName = advisorName ? formatTeacherName(advisorName) : null;

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, prefix: true, role: true, studentId: true, email: true, department: true },
    });

    if (consumableItems.length > 0 && !courseId && isStudentUser(requester)) {
      return NextResponse.json(
        { error: 'กรุณาเลือกรายวิชาที่ท่านลงทะเบียนเรียนก่อนส่งคำร้องขอใช้ชุดฝึกปฏิบัติ' },
        { status: 400 }
      );
    }

    // 1. Create Borrow Request if equipment present
    if (equipmentItems.length > 0) {
      const count = await prisma.borrowRequest.count();
      const requestNumber = 'BR-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

      createdBorrow = await prisma.borrowRequest.create({
        data: {
          requestNumber,
          userId,
          courseId: courseId || null,
          purpose: fullPurpose,
          borrowDate: defaultBorrowDate,
          expectedReturnDate: defaultReturnDate,
          advisorName: cleanAdvisorName,
          status: 'PENDING',
          items: {
            create: equipmentItems.map((eq) => ({
              itemId: eq.itemId,
              quantity: eq.quantity,
            })),
          },
        },
        include: { items: true },
      });
    }

    // 2. Create Requisition Request if consumables present
    if (consumableItems.length > 0) {
      // Get or fallback course
      let validCourseId = courseId;
      if (!validCourseId) {
        const firstCourse = await prisma.course.findFirst();
        validCourseId = firstCourse?.id || '';
      }

      if (validCourseId) {
        const count = await prisma.requisitionRequest.count();
        const requestNumber = 'RQ-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

        createdRequisition = await prisma.requisitionRequest.create({
          data: {
            requestNumber,
            userId,
            courseId: validCourseId,
            purpose: fullPurpose,
            dateNeeded: defaultBorrowDate,
            advisorName: cleanAdvisorName,
            status: 'PENDING',
            items: {
              create: consumableItems.map((cs) => ({
                itemId: cs.itemId,
                quantityRequested: cs.quantity,
              })),
            },
          },
          include: { items: true },
        });
      }
    }

    const requesterName = formatUserName(requester) || 'นิสิต';
    const requesterDisplay = formatRequesterWithRole(requester);
    const notifPromises: Promise<any>[] = [];

    if (createdBorrow) {
      notifPromises.push(
        notifyRoles(
          ['OFFICER', 'ADMIN', 'APPROVER'],
          {
            templateId: 'BORROW_REQUEST_SUBMITTED',
            variables: {
              studentName: requesterName,
              requestNumber: createdBorrow.requestNumber,
              itemSummary: fullPurpose,
            },
            title: 'มีคำขอยืมครุภัณฑ์ (ชุดฝึก) ใหม่ 📋',
            message: `${requesterDisplay} ยื่นคำขอยืมเลขที่ ${createdBorrow.requestNumber} (${fullPurpose})`,
            type: 'APPROVAL',
            priority: 'HIGH',
            linkUrl: `/approvals?id=${createdBorrow.id}&type=BORROW`,
            entityType: 'BORROW',
            entityId: createdBorrow.id,
          },
          'BORROW'
        )
      );

      if (cleanAdvisorName) {
        notifPromises.push(
          notifyAdvisorByName(cleanAdvisorName, {
            title: 'มีคำขอยืมครุภัณฑ์รอกดรับทราบ 👩‍🏫',
            message: `${requesterDisplay} ยื่นคำขอยืมเลขที่ ${createdBorrow.requestNumber} รออาจารย์รับทราบ`,
            type: 'REQUEST_SUBMITTED',
            priority: 'HIGH',
            linkUrl: `/approvals?id=${createdBorrow.id}&type=BORROW`,
            entityType: 'BORROW',
            entityId: createdBorrow.id,
          })
        );
      }
    }

    if (createdRequisition) {
      notifPromises.push(
        notifyRoles(
          ['OFFICER', 'ADMIN', 'APPROVER'],
          {
            templateId: 'REQUISITION_REQUEST_SUBMITTED',
            variables: {
              studentName: requesterName,
              requestNumber: createdRequisition.requestNumber,
              itemSummary: fullPurpose,
            },
            title: 'มีคำขอเบิกวัสดุ (ชุดฝึก) ใหม่ 📋',
            message: `${requesterDisplay} ยื่นคำขอเบิกเลขที่ ${createdRequisition.requestNumber} (${fullPurpose})`,
            type: 'APPROVAL',
            priority: 'HIGH',
            linkUrl: `/approvals?id=${createdRequisition.id}&type=REQUISITION`,
            entityType: 'REQUISITION',
            entityId: createdRequisition.id,
          },
          'REQUISITION'
        )
      );

      if (cleanAdvisorName) {
        notifPromises.push(
          notifyAdvisorByName(cleanAdvisorName, {
            title: 'มีคำขอเบิกพัสดุรอกดรับทราบ 👩‍🏫',
            message: `${requesterDisplay} ยื่นคำขอเบิกเลขที่ ${createdRequisition.requestNumber} รออาจารย์รับทราบ`,
            type: 'REQUEST_SUBMITTED',
            priority: 'HIGH',
            linkUrl: `/approvals?id=${createdRequisition.id}&type=REQUISITION`,
            entityType: 'REQUISITION',
            entityId: createdRequisition.id,
          })
        );
      }
    }

    if (createdBorrow || createdRequisition) {
      const combinedRef =
        createdBorrow && createdRequisition
          ? `${createdBorrow.requestNumber} + ${createdRequisition.requestNumber}`
          : createdBorrow?.requestNumber || createdRequisition?.requestNumber || '';

      notifPromises.push(
        createNotification({
          userId,
          title: 'ยื่นคำขอชุดฝึกปฏิบัติการเรียบร้อยแล้ว ✅',
          message: `คำขอเลขที่ ${combinedRef} ถูกส่งเข้าสู่ระบบแล้ว และอยู่ระหว่างรอการอนุมัติ`,
          type: 'STATUS_UPDATE',
          priority: 'NORMAL',
          linkUrl: createdBorrow ? '/borrow' : '/requisitions',
          entityType: createdBorrow ? 'BORROW' : 'REQUISITION',
          entityId: createdBorrow?.id || createdRequisition?.id,
        })
      );
    }

    await Promise.allSettled(notifPromises);

    invalidateCache('borrow:');
    invalidateCache('requisitions:');
    invalidateCache('dashboard:');

    return NextResponse.json({
      success: true,
      message: 'ยื่นคำขอชุดฝึกปฏิบัติการสำเร็จ (' + setsRequested + ' ชุด)',
      borrowRequest: createdBorrow,
      requisitionRequest: createdRequisition,
    });
  } catch (error: any) {
    console.error('Kit Quick Request Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยื่นคำขอชุดฝึกปฏิบัติการ' },
      { status: 500 }
    );
  }
}