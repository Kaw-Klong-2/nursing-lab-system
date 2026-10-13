import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: ดึงรายละเอียดแผนงานและรายการอุปกรณ์ทั้งหมดในแผน (Items)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const plan = await prisma.inspectionPlan.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        targetLocation: true,
        targetCategory: true,
        targetCourse: true,
        items: {
          include: {
            asset: {
              include: {
                item: {
                  select: { id: true, code: true, name: true, unit: true, category: { select: { name: true } } },
                },
                storageLocation: {
                  select: { id: true, code: true, name: true, roomName: true },
                },
              },
            },
            checkedBy: {
              select: { id: true, name: true, role: true },
            },
            inspectionLog: {
              select: { id: true, result: true, notes: true, inspectionDate: true },
            },
          },
          orderBy: [
            { status: 'asc' }, // PENDING first
            { asset: { item: { name: 'asc' } } },
            { asset: { sequenceNumber: 'asc' } },
          ],
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'ไม่พบแผนงานตรวจเช็ก' }, { status: 404 });
    }

    const total = plan.items.length;
    const checked = plan.items.filter((i) => i.status === 'CHECKED').length;
    const pending = plan.items.filter((i) => i.status === 'PENDING').length;
    const notFound = plan.items.filter((i) => i.status === 'NOT_FOUND').length;
    const pass = plan.items.filter((i) => i.result === 'PASS').length;
    const passWithNote = plan.items.filter((i) => i.result === 'PASS_WITH_NOTE').length;
    const fail = plan.items.filter((i) => i.result === 'FAIL').length;
    const progressPercent = total > 0 ? Math.round((checked / total) * 100) : 0;

    return NextResponse.json({
      ...plan,
      totalItems: total,
      checkedCount: checked,
      pendingCount: pending,
      notFoundCount: notFound,
      passCount: pass,
      passWithNoteCount: passWithNote,
      failCount: fail,
      progressPercent,
    });
  } catch (error: any) {
    console.error('Failed to get plan detail:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch plan detail' }, { status: 500 });
  }
}

// PUT: อัปเดตข้อมูลแผนงาน (เปลี่ยนสถานะ, แก้ไขวันที่, ปิดแผนงาน)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, status, startDate, targetDate, notes } = body;

    const existing = await prisma.inspectionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบแผนงาน' }, { status: 404 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (notes !== undefined) updateData.notes = notes;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'IN_PROGRESS' && !existing.startDate) {
        updateData.startDate = new Date();
      }
      if (status === 'COMPLETED') {
        updateData.completedDate = new Date();
      }
    }

    const updated = await prisma.inspectionPlan.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    console.error('Failed to update plan:', error);
    return NextResponse.json({ error: error.message || 'Failed to update plan' }, { status: 500 });
  }
}

// DELETE: ลบแผนงานตรวจเช็ก
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.inspectionPlan.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'ลบแผนงานเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Failed to delete plan:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete plan' }, { status: 500 });
  }
}
