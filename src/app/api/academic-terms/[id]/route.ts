import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  computeTermStatusByDate,
  findCalendarActiveTerm,
  formatTermName,
  normalizeTermCode,
  parseTermDateToUtcMidnight,
} from '@/lib/academicTerm';
import {
  clearManualTermPin,
  ensureAcademicTermsSynced,
  invalidateAcademicTermCaches,
  recordManualTermPin,
} from '@/lib/academicTermSync';
import { requireActiveActor } from '@/lib/viewer-guard';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actor, errorResponse } = await requireActiveActor(req, ['ADMIN', 'OFFICER']);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { academicYear, term, startDate, endDate, isCurrent } = body;

    const existing = await prisma.academicTerm.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลภาคการศึกษาที่ระบุ' }, { status: 404 });
    }

    const dataToUpdate: {
      academicYear?: string;
      term?: string;
      name: string;
      startDate?: Date;
      endDate?: Date;
      status: string;
      isCurrent?: boolean;
    } = {
      name: existing.name,
      status: existing.status,
    };

    if (academicYear) dataToUpdate.academicYear = String(academicYear).trim();
    if (term) dataToUpdate.term = normalizeTermCode(term);

    const targetYear = dataToUpdate.academicYear || existing.academicYear;
    const targetTerm = dataToUpdate.term || existing.term;
    dataToUpdate.name = `${formatTermName(targetTerm)} ปีการศึกษา ${targetYear}`;

    if (startDate) {
      const s = parseTermDateToUtcMidnight(startDate);
      if (!s) return NextResponse.json({ error: 'วันที่เริ่มต้นไม่ถูกต้อง' }, { status: 400 });
      dataToUpdate.startDate = s;
    }

    if (endDate) {
      const e = parseTermDateToUtcMidnight(endDate);
      if (!e) return NextResponse.json({ error: 'วันที่สิ้นสุดไม่ถูกต้อง' }, { status: 400 });
      dataToUpdate.endDate = e;
    }

    const startCheck = dataToUpdate.startDate || existing.startDate;
    const endCheck = dataToUpdate.endDate || existing.endDate;
    if (startCheck >= endCheck) {
      return NextResponse.json({ error: 'วันที่เริ่มต้นต้องเกิดขึ้นก่อนวันที่สิ้นสุด' }, { status: 400 });
    }

    dataToUpdate.status = computeTermStatusByDate(startCheck, endCheck);

    if (isCurrent !== undefined) {
      dataToUpdate.isCurrent = Boolean(isCurrent);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (isCurrent !== undefined && Boolean(isCurrent)) {
        await tx.academicTerm.updateMany({
          where: { id: { not: id }, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicTerm.update({
        where: { id },
        data: dataToUpdate,
      });
    });

    const allTerms = await prisma.academicTerm.findMany();
    const calendarActive = findCalendarActiveTerm(allTerms);

    if (isCurrent !== undefined) {
      if (Boolean(isCurrent)) {
        await recordManualTermPin({
          actor,
          pinnedTermId: id,
          calendarActiveTermId: calendarActive?.id || null,
        });
      } else if (existing.isCurrent) {
        await clearManualTermPin(actor);
      }
    }

    invalidateAcademicTermCaches();
    await ensureAcademicTermsSynced({ force: true });

    const freshTerm = await prisma.academicTerm.findUnique({ where: { id } });
    return NextResponse.json(freshTerm || updated);
  } catch (error: unknown) {
    console.error('Error updating academic term:', error);
    return NextResponse.json({ error: 'Failed to update academic term' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { errorResponse } = await requireActiveActor(req, ['ADMIN', 'OFFICER']);
    if (errorResponse) return errorResponse;

    const { id } = await params;

    const existing = await prisma.academicTerm.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลภาคการศึกษาที่ระบุ' }, { status: 404 });
    }

    if (existing.isCurrent) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบภาคการศึกษาปัจจุบันได้ กรุณาสลับภาคปัจจุบันไปที่เทอมอื่นก่อน' },
        { status: 400 }
      );
    }

    await prisma.academicTerm.delete({
      where: { id },
    });

    invalidateAcademicTermCaches();

    return NextResponse.json({ success: true, message: 'ลบภาคการศึกษาเรียบร้อยแล้ว' });
  } catch (error: unknown) {
    console.error('Error deleting academic term:', error);
    return NextResponse.json({ error: 'Failed to delete academic term' }, { status: 500 });
  }
}
