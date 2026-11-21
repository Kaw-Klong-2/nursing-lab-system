import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth-security';
import { getSessionFromRequest } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.uid) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { userId: bodyUserId, currentPassword, newPassword } = body;

    if (bodyUserId && bodyUserId !== session.uid) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เปลี่ยนรหัสผ่านของบัญชีผู้ใช้อื่น' },
        { status: 403 }
      );
    }

    const userId = session.uid;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้งาน' },
        { status: 404 }
      );
    }

    const { isValid } = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return NextResponse.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว กรุณาใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' },
      { status: 500 }
    );
  }
}
