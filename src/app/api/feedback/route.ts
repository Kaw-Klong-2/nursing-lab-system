import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatUserName } from '@/lib/user-utils';
import { logActivity } from '@/lib/activity-log';
import {
  verifyFeedbackAdmin,
  clampStarRating,
} from '@/lib/feedback-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const actorUserId = searchParams.get('actorUserId');

    const auth = await verifyFeedbackAdmin(actorUserId);
    if (!auth.ok) {
      return NextResponse.json(
        { error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถดูผลประเมินความพึงพอใจได้' },
        { status: 403 }
      );
    }

    const items = await prisma.systemFeedback.findMany({
      include: {
        user: {
          select: {
            id: true,
            prefix: true,
            name: true,
            studentId: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = items.length;
    const sumRating = items.reduce((s, r) => s + r.rating, 0);
    const avgRating = totalCount > 0 ? Number((sumRating / totalCount).toFixed(2)) : 0;

    const easeList = items.filter((r) => typeof r.easeOfUseRating === 'number');
    const avgEaseOfUse =
      easeList.length > 0
        ? Number(
            (easeList.reduce((s, r) => s + (r.easeOfUseRating || 0), 0) / easeList.length).toFixed(2)
          )
        : null;

    const speedList = items.filter((r) => typeof r.speedRating === 'number');
    const avgSpeed =
      speedList.length > 0
        ? Number(
            (speedList.reduce((s, r) => s + (r.speedRating || 0), 0) / speedList.length).toFixed(2)
          )
        : null;

    const positiveCount = items.filter((r) => r.rating >= 4).length;
    const positiveRatePercent =
      totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0;

    const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const roleAgg: Record<string, { count: number; sum: number }> = {};
    const categoryAgg: Record<string, { count: number; sum: number }> = {};

    for (const r of items) {
      if (r.rating >= 1 && r.rating <= 5) {
        starCounts[r.rating] += 1;
      }
      const rRole = r.userRole || r.user?.role || 'USER';
      if (!roleAgg[rRole]) roleAgg[rRole] = { count: 0, sum: 0 };
      roleAgg[rRole].count += 1;
      roleAgg[rRole].sum += r.rating;

      const rCat = r.category || 'OVERALL';
      if (!categoryAgg[rCat]) categoryAgg[rCat] = { count: 0, sum: 0 };
      categoryAgg[rCat].count += 1;
      categoryAgg[rCat].sum += r.rating;
    }

    const byRole = Object.entries(roleAgg).map(([role, v]) => ({
      role,
      count: v.count,
      avgRating: Number((v.sum / v.count).toFixed(2)),
    }));

    const byCategory = Object.entries(categoryAgg).map(([category, v]) => ({
      category,
      count: v.count,
      avgRating: Number((v.sum / v.count).toFixed(2)),
    }));

    return NextResponse.json({
      items,
      summary: {
        totalCount,
        avgRating,
        avgEaseOfUse,
        avgSpeed,
        positiveCount,
        positiveRatePercent,
        starCounts,
        byRole,
        byCategory,
      },
    });
  } catch (error: any) {
    console.error('Error fetching system feedback:', error);
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถดึงข้อมูลผลประเมินได้' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      userName,
      userRole,
      rating,
      easeOfUseRating,
      speedRating,
      category,
      actionLabel,
      pagePath,
      quickTags,
      comment,
      isAnonymous,
      createdAt,
      isAddedByAdmin,
      actorUserId,
    } = body;

    const validRating = clampStarRating(rating);
    if (validRating === null) {
      return NextResponse.json(
        { error: 'กรุณาระบุคะแนนความพึงพอใจตั้งแต่ 1 ถึง 5 ดาว' },
        { status: 400 }
      );
    }

    let adminFlag = false;
    if (isAddedByAdmin) {
      const auth = await verifyFeedbackAdmin(actorUserId);
      if (!auth.ok) {
        return NextResponse.json(
          { error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเพิ่มผลประเมินแทนได้' },
          { status: 403 }
        );
      }
      adminFlag = true;
    }

    let resolvedName = typeof userName === 'string' && userName.trim() ? userName.trim() : null;
    let resolvedRole = typeof userRole === 'string' && userRole.trim() ? userRole.trim() : null;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, prefix: true, name: true, role: true },
      });
      if (user) {
        if (!resolvedName) resolvedName = formatUserName(user);
        if (!resolvedRole) resolvedRole = user.role;
      }
    }

    const cleanEase = clampStarRating(easeOfUseRating);
    const cleanSpeed = clampStarRating(speedRating);

    const created = await prisma.systemFeedback.create({
      data: {
        userId: userId || null,
        userName: isAnonymous ? 'ผู้ใช้งานไม่ระบุชื่อ' : resolvedName,
        userRole: resolvedRole || 'USER',
        rating: validRating,
        easeOfUseRating: cleanEase,
        speedRating: cleanSpeed,
        category: typeof category === 'string' && category.trim() ? category.trim() : 'OVERALL',
        actionLabel: typeof actionLabel === 'string' && actionLabel.trim() ? actionLabel.trim() : null,
        pagePath: typeof pagePath === 'string' && pagePath.trim() ? pagePath.trim() : null,
        quickTags: typeof quickTags === 'string' && quickTags.trim() ? quickTags.trim() : null,
        comment: typeof comment === 'string' && comment.trim() ? comment.trim() : null,
        isAnonymous: Boolean(isAnonymous),
        isEditedByAdmin: adminFlag,
        ...(createdAt && adminFlag ? { createdAt: new Date(createdAt) } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            prefix: true,
            name: true,
            studentId: true,
            role: true,
            department: true,
          },
        },
      },
    });

    logActivity({
      userId: actorUserId || userId || null,
      action: 'UPDATE',
      entityType: 'SYSTEM',
      entityId: created.id,
      entityTitle: `ประเมินระบบ ${validRating} ดาว`,
      details: `${adminFlag ? 'แอดมินเพิ่มผลประเมิน' : 'ผู้ใช้ประเมินความพึงพอใจ'} ${validRating} ดาว (${created.actionLabel || created.category})`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating system feedback:', error);
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถบันทึกคะแนนประเมินได้' },
      { status: 500 }
    );
  }
}
