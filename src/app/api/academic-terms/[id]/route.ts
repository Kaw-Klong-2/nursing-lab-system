import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatTermName, normalizeTermCode } from '@/lib/academicTerm';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { academicYear, term, startDate, endDate, isCurrent, status } = body;

    const existing = await prisma.academicTerm.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลภาคการศึกษาที่ระบุ' }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (academicYear) dataToUpdate.academicYear = String(academicYear).trim();
    if (term) dataToUpdate.term = normalizeTermCode(term);

    const targetYear = dataToUpdate.academicYear || existing.academicYear;
    const targetTerm = dataToUpdate.term || existing.term;
    dataToUpdate.name = `${formatTermName(targetTerm)} ปีการศึกษา ${targetYear}`;

    if (startDate) {
      const s = new Date(startDate);
      if (isNaN(s.getTime())) return NextResponse.json({ error: 'วันที่เริ่มต้นไม่ถูกต้อง' }, { status: 400 });
      dataToUpdate.startDate = s;
    }

    if (endDate) {
      const e = new Date(endDate);
      if (isNaN(e.getTime())) return NextResponse.json({ error: 'วันที่สิ้นสุดไม่ถูกต้อง' }, { status: 400 });
      dataToUpdate.endDate = e;
    }

    const startCheck = dataToUpdate.startDate || existing.startDate;
    const endCheck = dataToUpdate.endDate || existing.endDate;
    if (startCheck >= endCheck) {
      return NextResponse.json({ error: 'วันที่เริ่มต้นต้องเกิดขึ้นก่อนวันที่สิ้นสุด' }, { status: 400 });
    }

    if (status !== undefined) dataToUpdate.status = status;

    if (isCurrent !== undefined) {
      dataToUpdate.isCurrent = Boolean(isCurrent);
      if (Boolean(isCurrent)) {
        // Deactivate all other terms
        await prisma.academicTerm.updateMany({
          where: { id: { not: id }, isCurrent: true },
          data: { isCurrent: false },
        });
      }
    }

    const updated = await prisma.academicTerm.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating academic term:', error);
    return NextResponse.json({ error: error.message || 'Failed to update academic term' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.academicTerm.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลภาคการศึกษาที่ระบุ' }, { status: 404 });
    }

    if (existing.isCurrent) {
      return NextResponse.json({ error: 'ไม่สามารถลบภาคการศึกษาปัจจุบันได้ กรุณาสลับภาคปัจจุบันไปที่เทอมอื่นก่อน' }, { status: 400 });
    }

    await prisma.academicTerm.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ลบภาคการศึกษาเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Error deleting academic term:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete academic term' }, { status: 500 });
  }
}
