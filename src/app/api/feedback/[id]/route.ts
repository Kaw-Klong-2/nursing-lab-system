import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import { verifyFeedbackAdmin, clampStarRating } from '@/lib/feedback-utils';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      actorUserId,
      rating,
      easeOfUseRating,
      speedRating,
      category,
      actionLabel,
      quickTags,
      comment,
      userRole,
      userName,
      isAnonymous,
      createdAt,
    } = body;

    const auth = await verifyFeedbackAdmin(actorUserId);
    if (!auth.ok) {
      return NextResponse.json(
        { error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์แก้ไขคะแนนประเมิน' },
        { status: 403 }
      );
    }

    const existing = await prisma.systemFeedback.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผลประเมิน' }, { status: 404 });
    }

    const validRating = clampStarRating(rating);
    if (validRating === null) {
      return NextResponse.json(
        { error: 'กรุณาระบุคะแนนตั้งแต่ 1 ถึง 5 ดาว' },
        { status: 400 }
      );
    }

    const cleanEase = clampStarRating(easeOfUseRating);
    const cleanSpeed = clampStarRating(speedRating);

    const updated = await prisma.systemFeedback.update({
      where: { id },
      data: {
        rating: validRating,
        ...(easeOfUseRating !== undefined ? { easeOfUseRating: cleanEase } : {}),
        ...(speedRating !== undefined ? { speedRating: cleanSpeed } : {}),
        ...(category !== undefined ? { category: String(category).trim() || 'OVERALL' } : {}),
        ...(actionLabel !== undefined
          ? { actionLabel: actionLabel && String(actionLabel).trim() ? String(actionLabel).trim() : null }
          : {}),
        ...(quickTags !== undefined
          ? { quickTags: quickTags && String(quickTags).trim() ? String(quickTags).trim() : null }
          : {}),
        ...(comment !== undefined
          ? { comment: comment && String(comment).trim() ? String(comment).trim() : null }
          : {}),
        ...(userRole !== undefined
          ? { userRole: String(userRole).trim() || 'USER' }
          : {}),
        ...(userName !== undefined
          ? { userName: userName && String(userName).trim() ? String(userName).trim() : null }
          : {}),
        ...(isAnonymous !== undefined ? { isAnonymous: Boolean(isAnonymous) } : {}),
        ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
        isEditedByAdmin: true,
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
      userId: auth.actor.id,
      action: 'UPDATE',
      entityType: 'SYSTEM',
      entityId: updated.id,
      entityTitle: `แก้ไขผลประเมิน (${existing.rating}⭐ → ${updated.rating}⭐)`,
      details: `แอดมินปรับปรุงข้อมูลผลประเมิน ${updated.id} จาก ${existing.rating} ดาว เป็น ${updated.rating} ดาว`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating system feedback:', error);
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถแก้ไขผลประเมินได้' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    let actorUserId = searchParams.get('actorUserId');

    if (!actorUserId) {
      try {
        const body = await req.json();
        actorUserId = body?.actorUserId || null;
      } catch {
        // empty body is ok if query param provided
      }
    }

    const auth = await verifyFeedbackAdmin(actorUserId);
    if (!auth.ok) {
      return NextResponse.json(
        { error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลบผลประเมินได้' },
        { status: 403 }
      );
    }

    await prisma.systemFeedback.delete({ where: { id } });

    logActivity({
      userId: auth.actor.id,
      action: 'DELETE',
      entityType: 'SYSTEM',
      entityId: id,
      entityTitle: 'ลบรายการผลประเมิน',
      details: `แอดมินลบรายการผลประเมินความพึงพอใจ ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting system feedback:', error);
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถลบผลประเมินได้' },
      { status: 500 }
    );
  }
}
