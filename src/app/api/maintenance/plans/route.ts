import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: ดึงรายการแผนงานตรวจเช็ก/ตรวจนับครุภัณฑ์ (Inspection Plans)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const planType = searchParams.get('planType');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (planType && planType !== 'ALL') where.planType = planType;

    const plans = await prisma.inspectionPlan.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        targetLocation: {
          select: { id: true, code: true, name: true, roomName: true },
        },
        targetCategory: {
          select: { id: true, code: true, name: true },
        },
        targetCourse: {
          select: { id: true, code: true, name: true },
        },
        items: {
          select: {
            id: true,
            status: true,
            result: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // DRAFT, IN_PROGRESS, SCHEDULED first
        { targetDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const formatted = plans.map((plan) => {
      const total = plan.items.length;
      const checked = plan.items.filter((i) => i.status === 'CHECKED').length;
      const pending = plan.items.filter((i) => i.status === 'PENDING').length;
      const notFound = plan.items.filter((i) => i.status === 'NOT_FOUND').length;
      const pass = plan.items.filter((i) => i.result === 'PASS').length;
      const passWithNote = plan.items.filter((i) => i.result === 'PASS_WITH_NOTE').length;
      const fail = plan.items.filter((i) => i.result === 'FAIL').length;
      const progressPercent = total > 0 ? Math.round((checked / total) * 100) : 0;

      return {
        id: plan.id,
        title: plan.title,
        planType: plan.planType,
        scopeType: plan.scopeType,
        status: plan.status,
        startDate: plan.startDate,
        targetDate: plan.targetDate,
        completedDate: plan.completedDate,
        notes: plan.notes,
        createdBy: plan.createdBy,
        targetLocation: plan.targetLocation,
        targetCategory: plan.targetCategory,
        targetCourse: plan.targetCourse,
        totalItems: total,
        checkedCount: checked,
        pendingCount: pending,
        notFoundCount: notFound,
        passCount: pass,
        passWithNoteCount: passWithNote,
        failCount: fail,
        progressPercent,
        createdAt: plan.createdAt,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Failed to get inspection plans:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch inspection plans' }, { status: 500 });
  }
}

// POST: สร้างแผนงานตรวจเช็ก/ตรวจนับครุภัณฑ์ใหม่
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      planType = 'ANNUAL_AUDIT',
      scopeType = 'ALL_ASSETS',
      status = 'DRAFT',
      startDate,
      targetDate,
      notes,
      targetLocationId,
      targetCategoryId,
      targetCourseId,
      createdById,
    } = body;

    if (!title || !createdById) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อแผนงานและผู้สร้างแผนงาน' },
        { status: 400 }
      );
    }

    // 1. ค้นหา EquipmentAsset ที่ตรงตาม scopeType
    const assetWhere: any = {
      status: { not: 'RETIRED' },
    };

    if (scopeType === 'BY_LOCATION' && targetLocationId) {
      assetWhere.storageLocationId = targetLocationId;
    } else if (scopeType === 'BY_CATEGORY' && targetCategoryId) {
      assetWhere.item = { categoryId: targetCategoryId };
    } else if (scopeType === 'BY_COURSE' && targetCourseId) {
      // ค้นหาครุภัณฑ์ที่ผูกกับวิชานี้ (ผ่าน BorrowItem ที่มี courseId ใน BorrowRequest)
      assetWhere.borrowItems = {
        some: {
          borrowRequest: { courseId: targetCourseId },
        },
      };
    }

    const matchingAssets = await prisma.equipmentAsset.findMany({
      where: assetWhere,
      select: { id: true },
    });

    // 2. สร้าง InspectionPlan
    const plan = await prisma.inspectionPlan.create({
      data: {
        title,
        planType,
        scopeType,
        status: status || (targetDate ? 'SCHEDULED' : 'DRAFT'),
        startDate: startDate ? new Date(startDate) : (status === 'IN_PROGRESS' ? new Date() : null),
        targetDate: targetDate ? new Date(targetDate) : null,
        notes: notes || null,
        targetLocationId: targetLocationId || null,
        targetCategoryId: targetCategoryId || null,
        targetCourseId: targetCourseId || null,
        createdById,
        items: {
          create: matchingAssets.map((a) => ({
            assetId: a.id,
            status: 'PENDING',
          })),
        },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      plan,
      totalPopulated: matchingAssets.length,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create inspection plan:', error);
    return NextResponse.json({ error: error.message || 'Failed to create plan' }, { status: 500 });
  }
}
