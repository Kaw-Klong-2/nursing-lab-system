import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { getSessionFromRequest } from '@/lib/session';
import { VIEWER_FORBIDDEN_MESSAGE } from '@/lib/viewer-guard';
import { extractCohortPrefix, isStudentUser } from '@/lib/course-enrollment';
import { logActivity } from '@/lib/activity-log';

async function loadAuthenticatedActor(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session?.uid) {
    return {
      errorResponse: NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      ),
    };
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      prefix: true,
      name: true,
      email: true,
      role: true,
      department: true,
      status: true,
    },
  });

  if (!actor || (actor.status && actor.status !== 'ACTIVE')) {
    return {
      errorResponse: NextResponse.json(
        { error: 'บัญชีผู้ใช้งานไม่มีอยู่ในระบบหรือถูกระงับสิทธิ์แล้ว' },
        { status: 401 }
      ),
    };
  }

  return { actor };
}

function normalizeStudentCodeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * GET /api/courses/[id]/enrollments
 * ดึงรายชื่อนิสิตที่ลงทะเบียนในรายวิชา (อนุญาตเจ้าหน้าที่/อาจารย์/แอดมิน/ผู้บริหาร/ผู้เข้าชม)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await loadAuthenticatedActor(req);
    if (auth.errorResponse) return auth.errorResponse;
    const { actor } = auth;

    if (isStudentUser(actor)) {
      return NextResponse.json(
        { error: 'ปฏิเสธการเข้าถึง: ท่านไม่มีสิทธิ์ดูรายชื่อผู้เรียนทั้งหมดของรายวิชา' },
        { status: 403 }
      );
    }

    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        code: true,
        name: true,
        semester: true,
        academicYear: true,
        studentCount: true,
        status: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรายวิชา' }, { status: 404 });
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            prefix: true,
            name: true,
            email: true,
            studentId: true,
            department: true,
            status: true,
          },
        },
      },
      orderBy: [{ user: { studentId: 'asc' } }, { user: { name: 'asc' } }],
    });

    const cohortCounts: Record<string, number> = {};
    const items = enrollments.map((enr) => {
      const cohort = extractCohortPrefix(enr.user.studentId);
      cohortCounts[cohort] = (cohortCounts[cohort] || 0) + 1;
      return {
        id: enr.id,
        userId: enr.userId,
        enrolledAt: enr.enrolledAt,
        cohort,
        user: enr.user,
      };
    });

    return NextResponse.json({
      course,
      enrolledCount: items.length,
      cohorts: cohortCounts,
      enrollments: items,
    });
  } catch (error) {
    console.error('Failed to fetch course enrollments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงรายชื่อนิสิตประจำรายวิชา' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses/[id]/enrollments
 * เพิ่มนิสิตเข้ารายวิชา รองรับ 3 โหมด:
 * - mode: 'select'  -> { userIds: string[] }
 * - mode: 'bulk'    -> { studentIds: string[] } (วางรหัสนิสิตหลายบรรทัด หรือนำเข้าจาก Excel)
 * - mode: 'copy'    -> { sourceCourseId: string } (คัดลอกรายชื่อนิสิตจากรายวิชาอื่น)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await loadAuthenticatedActor(req);
    if (auth.errorResponse) return auth.errorResponse;
    const { actor } = auth;

    if (actor.role === 'VIEWER') {
      return NextResponse.json({ error: VIEWER_FORBIDDEN_MESSAGE }, { status: 403 });
    }
    if (isStudentUser(actor)) {
      return NextResponse.json(
        { error: 'ปฏิเสธการเข้าถึง: ท่านไม่มีสิทธิ์จัดการรายชื่อนิสิตในรายวิชา' },
        { status: 403 }
      );
    }

    const { id: courseId } = await params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, code: true, name: true },
    });

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรายวิชา' }, { status: 404 });
    }

    const body = await req.json();
    const mode: 'select' | 'bulk' | 'copy' = body.mode || 'select';

    let targetUserIds: string[] = [];
    let notFoundStudentIds: string[] = [];
    let sourceCourseLabel: string | null = null;

    if (mode === 'select') {
      const rawIds: string[] = Array.isArray(body.userIds)
        ? body.userIds.filter((x: unknown): x is string => typeof x === 'string' && x.trim() !== '')
        : [];
      if (rawIds.length === 0) {
        return NextResponse.json({ error: 'กรุณาเลือกนิสิตอย่างน้อย 1 คน' }, { status: 400 });
      }
      const validUsers = await prisma.user.findMany({
        where: { id: { in: rawIds }, status: 'ACTIVE' },
        select: { id: true },
      });
      targetUserIds = validUsers.map((u) => u.id);
    } else if (mode === 'bulk') {
      const rawCodes: string[] = Array.isArray(body.studentIds)
        ? body.studentIds
            .map((x: unknown) => (typeof x === 'string' || typeof x === 'number' ? String(x).trim() : ''))
            .filter(Boolean)
        : [];

      const uniqueRawCodes = Array.from(new Set(rawCodes));
      if (uniqueRawCodes.length === 0) {
        return NextResponse.json({ error: 'ไม่พบรหัสนิสิตสำหรับนำเข้า' }, { status: 400 });
      }

      // โหลดนิสิตทั้งหมดในระบบเพื่อจับคู่แบบ case-insensitive และรองรับทั้งแบบมี/ไม่มีตัว 'b' นำหน้า
      const allStudents = await prisma.user.findMany({
        where: { role: 'USER', status: 'ACTIVE', studentId: { not: null } },
        select: { id: true, studentId: true },
      });

      const codeToUserId = new Map<string, string>();
      for (const s of allStudents) {
        if (!s.studentId) continue;
        const norm = normalizeStudentCodeKey(s.studentId);
        codeToUserId.set(norm, s.id);
        if (norm.startsWith('b')) {
          codeToUserId.set(norm.slice(1), s.id);
        } else if (/^\d{8,}$/.test(norm)) {
          codeToUserId.set(`b${norm}`, s.id);
        }
      }

      const matchedIdSet = new Set<string>();
      for (const raw of uniqueRawCodes) {
        const norm = normalizeStudentCodeKey(raw);
        const foundId = codeToUserId.get(norm);
        if (foundId) {
          matchedIdSet.add(foundId);
        } else {
          notFoundStudentIds.push(raw);
        }
      }
      targetUserIds = Array.from(matchedIdSet);
    } else if (mode === 'copy') {
      const sourceCourseId = typeof body.sourceCourseId === 'string' ? body.sourceCourseId.trim() : '';
      if (!sourceCourseId) {
        return NextResponse.json({ error: 'กรุณาเลือกรายวิชาต้นทางที่ต้องการคัดลอก' }, { status: 400 });
      }
      if (sourceCourseId === courseId) {
        return NextResponse.json({ error: 'ไม่สามารถคัดลอกรายชื่อจากรายวิชาเดียวกันได้' }, { status: 400 });
      }
      const sourceCourse = await prisma.course.findUnique({
        where: { id: sourceCourseId },
        select: {
          id: true,
          code: true,
          name: true,
          enrollments: { select: { userId: true } },
        },
      });
      if (!sourceCourse) {
        return NextResponse.json({ error: 'ไม่พบรายวิชาต้นทางที่เลือก' }, { status: 404 });
      }
      sourceCourseLabel = `${sourceCourse.code} ${sourceCourse.name}`;
      targetUserIds = sourceCourse.enrollments.map((e) => e.userId);
      if (targetUserIds.length === 0) {
        return NextResponse.json(
          { error: `รายวิชาต้นทาง (${sourceCourse.code}) ยังไม่มีรายชื่อนิสิตให้คัดลอก` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: 'รูปแบบการเพิ่มผู้เรียนไม่ถูกต้อง' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let addedCount = 0;
      if (targetUserIds.length > 0) {
        const created = await tx.courseEnrollment.createMany({
          data: targetUserIds.map((uid) => ({
            courseId,
            userId: uid,
            addedById: actor.id,
          })),
          skipDuplicates: true,
        });
        addedCount = created.count;
      }

      const totalEnrolled = await tx.courseEnrollment.count({ where: { courseId } });

      // ซิงก์จำนวนนิสิต (studentCount) อัตโนมัติตามจำนวนผู้เรียนจริง
      await tx.course.update({
        where: { id: courseId },
        data: { studentCount: totalEnrolled },
      });

      return { addedCount, totalEnrolled };
    });

    const alreadyEnrolledCount = Math.max(0, targetUserIds.length - result.addedCount);

    invalidateCache('courses_');
    invalidateCache('dashboard:');

    await logActivity({
      userId: actor.id,
      userRole: actor.role,
      action: 'UPDATE',
      entityType: 'COURSE',
      entityId: course.id,
      entityTitle: `${course.code} ${course.name}`,
      details:
        mode === 'copy'
          ? `คัดลอกรายชื่อนิสิตจาก ${sourceCourseLabel} เพิ่มใหม่ ${result.addedCount} คน (รวม ${result.totalEnrolled} คน)`
          : `เพิ่มรายชื่อนิสิต (${mode}) เพิ่มใหม่ ${result.addedCount} คน ซ้ำ ${alreadyEnrolledCount} คน ไม่พบ ${notFoundStudentIds.length} รหัส (รวม ${result.totalEnrolled} คน)`,
      metadata: {
        mode,
        addedCount: result.addedCount,
        alreadyEnrolledCount,
        notFoundCount: notFoundStudentIds.length,
        totalEnrolled: result.totalEnrolled,
      },
    });

    return NextResponse.json({
      success: true,
      mode,
      addedCount: result.addedCount,
      alreadyEnrolledCount,
      matchedCount: targetUserIds.length,
      notFoundStudentIds,
      totalEnrolled: result.totalEnrolled,
      message:
        result.addedCount > 0
          ? `เพิ่มนิสิตเข้ารายวิชา ${course.code} สำเร็จ ${result.addedCount} คน (รวม ${result.totalEnrolled} คน)`
          : alreadyEnrolledCount > 0
            ? `นิสิตที่เลือกทั้งหมด (${alreadyEnrolledCount} คน) มีรายชื่ออยู่ในวิชานี้แล้ว`
            : 'ไม่พบนิสิตที่สามารถเพิ่มได้ กรุณาตรวจสอบรหัสนิสิตอีกครั้ง',
    });
  } catch (error) {
    console.error('Failed to add course enrollments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเพิ่มรายชื่อนิสิตเข้ารายวิชา' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/[id]/enrollments
 * ลบนิสิตออกจากรายวิชา (รองรับลบทีละคน userId, หลายคน userIds[], หรือทั้งหมด clearAll: true)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await loadAuthenticatedActor(req);
    if (auth.errorResponse) return auth.errorResponse;
    const { actor } = auth;

    if (actor.role === 'VIEWER') {
      return NextResponse.json({ error: VIEWER_FORBIDDEN_MESSAGE }, { status: 403 });
    }
    if (isStudentUser(actor)) {
      return NextResponse.json(
        { error: 'ปฏิเสธการเข้าถึง: ท่านไม่มีสิทธิ์ลบรายชื่อนิสิตในรายวิชา' },
        { status: 403 }
      );
    }

    const { id: courseId } = await params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, code: true, name: true },
    });

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรายวิชา' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const clearAll = body.clearAll === true;
    const singleUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const multiUserIds: string[] = Array.isArray(body.userIds)
      ? body.userIds.filter((x: unknown): x is string => typeof x === 'string' && x.trim() !== '')
      : [];

    const idsToRemove = singleUserId ? [singleUserId] : multiUserIds;

    if (!clearAll && idsToRemove.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุนิสิตที่ต้องการลบออกจากรายวิชา' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.courseEnrollment.deleteMany({
        where: clearAll
          ? { courseId }
          : {
              courseId,
              userId: { in: idsToRemove },
            },
      });

      const totalEnrolled = await tx.courseEnrollment.count({ where: { courseId } });

      // ซิงก์จำนวนนิสิต (studentCount) อัตโนมัติตามจำนวนผู้เรียนจริง
      await tx.course.update({
        where: { id: courseId },
        data: { studentCount: totalEnrolled },
      });

      return { removedCount: deleted.count, totalEnrolled };
    });

    invalidateCache('courses_');
    invalidateCache('dashboard:');

    await logActivity({
      userId: actor.id,
      userRole: actor.role,
      action: 'UPDATE',
      entityType: 'COURSE',
      entityId: course.id,
      entityTitle: `${course.code} ${course.name}`,
      details: clearAll
        ? `ล้างรายชื่อนิสิตทั้งหมดในรายวิชาออก ${result.removedCount} คน (คงเหลือ 0 คน)`
        : `ลบรายชื่อนิสิตออกจากรายวิชา ${result.removedCount} คน (คงเหลือ ${result.totalEnrolled} คน)`,
      metadata: {
        clearAll,
        removedCount: result.removedCount,
        totalEnrolled: result.totalEnrolled,
      },
    });

    return NextResponse.json({
      success: true,
      removedCount: result.removedCount,
      totalEnrolled: result.totalEnrolled,
      message: `ลบนิสิตออกจากรายวิชา ${course.code} สำเร็จ ${result.removedCount} คน (คงเหลือ ${result.totalEnrolled} คน)`,
    });
  } catch (error) {
    console.error('Failed to remove course enrollments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบรายชื่อนิสิตออกจากรายวิชา' },
      { status: 500 }
    );
  }
}
