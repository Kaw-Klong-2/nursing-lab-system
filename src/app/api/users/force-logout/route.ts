import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forceLogoutUser } from '@/lib/user-presence';
import { logActivity } from '@/lib/activity-log';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const actorId = req.headers.get('x-user-id') || body.actorId;
    const targetUserId = body.targetUserId;

    // 1. ตรวจสอบสิทธิ์เฉพาะแอดมิน (Admin Guard)
    if (!actorId) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, role: true, status: true },
    });

    if (!actor || actor.role !== 'ADMIN' || actor.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'ปฏิเสธการเข้าถึง: ฟังก์ชันนี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' },
        { status: 403 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสบัญชีผู้ใช้ที่ต้องการสั่งให้ออกจากระบบ' },
        { status: 400 }
      );
    }

    if (targetUserId === actorId) {
      return NextResponse.json(
        { error: 'ไม่สามารถสั่งให้ออกจากระบบบัญชีของตนเองผ่านฟังก์ชันนี้ได้' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'ไม่พบบัญชีผู้ใช้เป้าหมาย' },
        { status: 404 }
      );
    }

    // 2. สั่งตัด Session ใน Presence Engine (Memory + DB)
    await forceLogoutUser(targetUserId);

    // 3. บันทึก Activity Log สำหรับการตรวจสอบย้อนหลัง
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');

    await logActivity({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: targetUser.id,
      entityTitle: targetUser.name,
      details: `ผู้ดูแลระบบ (${actor.name}) สั่งให้ออกจากระบบระยะไกล (Force Logout)`,
      ipAddress,
      metadata: {
        actorId: actor.id,
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        forced: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `สั่งให้คุณ ${targetUser.name} ออกจากระบบเรียบร้อยแล้ว`,
      targetUserId,
    });
  } catch (error: any) {
    console.error('Force logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
