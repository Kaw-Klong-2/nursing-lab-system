import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatTermName, normalizeTermCode } from '@/lib/academicTerm';

// Helper to seed default terms if none exist in the database
async function seedDefaultTermsIfEmpty() {
  const count = await prisma.academicTerm.count();
  if (count === 0) {
    const defaultTerms = [
      {
        academicYear: '2569',
        term: 'FIRST',
        name: 'ภาคต้น ปีการศึกษา 2569',
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2026-10-31T23:59:59.999Z'),
        isCurrent: true,
        status: 'ACTIVE',
      },
      {
        academicYear: '2569',
        term: 'SECOND',
        name: 'ภาคปลาย ปีการศึกษา 2569',
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T23:59:59.999Z'),
        isCurrent: false,
        status: 'UPCOMING',
      },
      {
        academicYear: '2569',
        term: 'SUMMER',
        name: 'ภาคฤดูร้อน ปีการศึกษา 2569',
        startDate: new Date('2027-04-01T00:00:00.000Z'),
        endDate: new Date('2027-05-31T23:59:59.999Z'),
        isCurrent: false,
        status: 'UPCOMING',
      },
    ];

    for (const item of defaultTerms) {
      await prisma.academicTerm.create({ data: item });
    }
  }
}

export async function GET(req: Request) {
  try {
    await seedDefaultTermsIfEmpty();

    const { searchParams } = new URL(req.url);
    const onlyCurrent = searchParams.get('current') === 'true';

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
  } catch (error: any) {
    console.error('Error fetching academic terms:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch academic terms' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { academicYear, term, startDate, endDate, isCurrent, status } = body;

    if (!academicYear || !term || !startDate || !endDate) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลปีการศึกษา, ภาคการศึกษา, และช่วงวันที่ให้ครบถ้วน' }, { status: 400 });
    }

    const termCode = normalizeTermCode(term);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง' }, { status: 400 });
    }

    if (start >= end) {
      return NextResponse.json({ error: 'วันที่เริ่มต้นต้องเกิดขึ้นก่อนวันที่สิ้นสุด' }, { status: 400 });
    }

    const termThai = formatTermName(termCode);
    const name = `${termThai} ปีการศึกษา ${academicYear}`;

    // If marked as current, deactivate other current terms
    if (isCurrent) {
      await prisma.academicTerm.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const created = await prisma.academicTerm.upsert({
      where: {
        academicYear_term: {
          academicYear: String(academicYear).trim(),
          term: termCode,
        },
      },
      update: {
        name,
        startDate: start,
        endDate: end,
        isCurrent: Boolean(isCurrent),
        status: status || 'ACTIVE',
      },
      create: {
        academicYear: String(academicYear).trim(),
        term: termCode,
        name,
        startDate: start,
        endDate: end,
        isCurrent: Boolean(isCurrent),
        status: status || 'ACTIVE',
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating academic term:', error);
    return NextResponse.json({ error: error.message || 'Failed to create academic term' }, { status: 500 });
  }
}
