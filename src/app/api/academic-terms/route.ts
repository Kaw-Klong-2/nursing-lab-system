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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyCurrent = searchParams.get('current') === 'true';
    const forceSync = searchParams.get('sync') === 'true';

    await ensureAcademicTermsSynced({ force: forceSync });

    if (onlyCurrent) {
      let currentTerm = await prisma.academicTerm.findFirst({
        where: { isCurrent: true },
      });

      if (!currentTerm) {
        currentTerm = await prisma.academicTerm.findFirst({
          orderBy: { startDate: 'desc' },
        });
      }

      return NextResponse.json(currentTerm);
    }

    const terms = await prisma.academicTerm.findMany({
      orderBy: [
        { academicYear: 'desc' },
        { startDate: 'asc' },
      ],
    });

    return NextResponse.json(terms);
  } catch (error: unknown) {
    console.error('Error fetching academic terms:', error);
    return NextResponse.json({ error: 'Failed to fetch academic terms' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { actor, errorResponse } = await requireActiveActor(req, ['ADMIN', 'OFFICER']);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));

    if (body?.action === 'SYNC_AUTO') {
      await clearManualTermPin(actor);
      const syncResult = await ensureAcademicTermsSynced({ force: true });
      const terms = await prisma.academicTerm.findMany({
        orderBy: [
          { academicYear: 'desc' },
          { startDate: 'asc' },
        ],
      });
      const currentTerm = terms.find((t) => t.isCurrent) || null;
      return NextResponse.json({
        success: true,
        terms,
        currentTerm,
        syncedCount: syncResult.syncedCount,
      });
    }

    const { academicYear, term, startDate, endDate, isCurrent } = body;

    if (!academicYear || !term || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลปีการศึกษา, ภาคการศึกษา, และช่วงวันที่ให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const termCode = normalizeTermCode(term);
    const start = parseTermDateToUtcMidnight(startDate);
    const end = parseTermDateToUtcMidnight(endDate);

    if (!start || !end) {
      return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง' }, { status: 400 });
    }

    if (start >= end) {
      return NextResponse.json({ error: 'วันที่เริ่มต้นต้องเกิดขึ้นก่อนวันที่สิ้นสุด' }, { status: 400 });
    }

    const cleanYear = String(academicYear).trim();
    const termThai = formatTermName(termCode);
    const name = `${termThai} ปีการศึกษา ${cleanYear}`;
    const computedStatus = computeTermStatusByDate(start, end);

    const created = await prisma.$transaction(async (tx) => {
      if (isCurrent) {
        await tx.academicTerm.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicTerm.upsert({
        where: {
          academicYear_term: {
            academicYear: cleanYear,
            term: termCode,
          },
        },
        update: {
          name,
          startDate: start,
          endDate: end,
          isCurrent: Boolean(isCurrent),
          status: computedStatus,
        },
        create: {
          academicYear: cleanYear,
          term: termCode,
          name,
          startDate: start,
          endDate: end,
          isCurrent: Boolean(isCurrent),
          status: computedStatus,
        },
      });
    });

    if (Boolean(isCurrent)) {
      const allTerms = await prisma.academicTerm.findMany();
      const calendarActive = findCalendarActiveTerm(allTerms);
      await recordManualTermPin({
        actor,
        pinnedTermId: created.id,
        calendarActiveTermId: calendarActive?.id || null,
      });
    }

    invalidateAcademicTermCaches();
    await ensureAcademicTermsSynced({ force: true });

    const syncedTerm = await prisma.academicTerm.findUnique({
      where: { id: created.id },
    });

    return NextResponse.json(syncedTerm || created, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating academic term:', error);
    return NextResponse.json({ error: 'Failed to create academic term' }, { status: 500 });
  }
}
