import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TEACHER_PREFIXES = new Set([
  'อ.',
  'ผศ.',
  'ผศ.ดร.',
  'รศ.',
  'รศ.ดร.',
  'ศ.',
  'ศ.ดร.',
  'ดร.',
  'อาจารย์',
]);

export interface MinimalUserRoleInfo {
  role?: string | null;
  email?: string | null;
  prefix?: string | null;
  name?: string | null;
  department?: string | null;
}

/**
 * ตรวจสอบว่าผู้ใช้เป็นบัญชี "นิสิต" หรือไม่ (สอดคล้องกับ auth-context.tsx)
 * เพื่อจำกัดสิทธิ์การเลือกรายวิชาเฉพาะวิชาที่ลงทะเบียนเรียน
 */
export function isStudentUser(user?: MinimalUserRoleInfo | null): boolean {
  if (!user) return false;
  if (user.role !== 'USER') return false;

  const email = (user.email || '').toLowerCase();
  const prefix = (user.prefix || '').trim();
  const name = (user.name || '').trim();
  const dept = (user.department || '').trim();

  const looksLikeTeacher =
    email.includes('teacher') ||
    (prefix !== '' && TEACHER_PREFIXES.has(prefix)) ||
    name.startsWith('อ.') ||
    name.startsWith('ผศ.') ||
    name.startsWith('รศ.') ||
    name.startsWith('ดร.') ||
    name.startsWith('ศ.') ||
    dept.includes('อาจารย์');

  return !looksLikeTeacher;
}

/**
 * ดึงรหัสรุ่นจากรหัสนิสิต เช่น b6811700017 -> b68, 6811700017 -> 68
 */
export function extractCohortPrefix(studentId?: string | null): string {
  const cleaned = (studentId || '').trim().toLowerCase();
  if (!cleaned) return 'ไม่ระบุรุ่น';
  const match = cleaned.match(/^([a-z]?\d{2})/);
  return match ? match[1] : 'อื่นๆ';
}

export const COURSE_ENROLLMENT_FORBIDDEN_MESSAGE =
  'ท่านไม่มีรายชื่อลงทะเบียนในรายวิชานี้ กรุณาเลือกเฉพาะรายวิชาที่ลงทะเบียนเรียน หรือติดต่ออาจารย์ประจำวิชา/เจ้าหน้าที่ห้องแล็บ';

/**
 * ตรวจสอบฝั่ง Backend ว่านิสิตมีสิทธิ์ส่ง/แก้ไขคำร้องในรายวิชาที่เลือกหรือไม่ (Strict mode)
 * - อาจารย์ / เจ้าหน้าที่ / แอดมิน / ผู้อนุมัติ / ผู้บริหาร ผ่านทันที
 * - หากไม่ส่ง courseId (ฝึกอิสระในเมนูที่อนุญาต) ผ่านทันที
 * - หากเป็นการแก้ไขคำร้องเดิมและไม่ได้เปลี่ยนรายวิชา (existingCourseId === courseId) ผ่านทันที
 */
export async function validateStudentCourseEnrollment(params: {
  userId?: string | null;
  courseId?: string | null;
  existingCourseId?: string | null;
}): Promise<{ ok: true } | { ok: false; errorResponse: NextResponse }> {
  const { userId, courseId, existingCourseId } = params;

  if (!userId || !courseId) {
    return { ok: true };
  }

  // กรณีแก้ไขคำร้องเดิมและไม่ได้เปลี่ยนรายวิชา
  if (existingCourseId && existingCourseId === courseId) {
    return { ok: true };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      email: true,
      prefix: true,
      name: true,
      department: true,
    },
  });

  if (!user || !isStudentUser(user)) {
    return { ok: true };
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: {
      courseId_userId: {
        courseId,
        userId: user.id,
      },
    },
    select: {
      id: true,
      course: {
        select: { status: true },
      },
    },
  });

  if (!enrollment || enrollment.course.status !== 'ACTIVE') {
    return {
      ok: false,
      errorResponse: NextResponse.json(
        { error: COURSE_ENROLLMENT_FORBIDDEN_MESSAGE },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}
