import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const { userId: bodyUserId, otp } = body;

    if (bodyUserId && bodyUserId !== session.uid) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์ยืนยันการเปลี่ยนอีเมลของบัญชีผู้ใช้อื่น' },
        { status: 403 }
      );
    }

    const userId = session.uid;

    if (!otp) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสยืนยัน OTP' },
        { status: 400 }
      );
    }

    const trimmedOtp = String(otp).trim();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบบัญชีผู้ใช้งานในระบบ' },
        { status: 404 }
      );
    }

    if (!user.pendingEmail || !user.emailOtp) {
      return NextResponse.json(
        { error: 'ไม่มีคำขอเปลี่ยนอีเมลที่รอยืนยัน หรือคำขอหมดอายุแล้ว' },
        { status: 400 }
      );
    }

    if (!user.emailOtpExpiry || new Date() > user.emailOtpExpiry) {
      return NextResponse.json(
        { error: 'รหัส OTP หมดอายุแล้ว กรุณากดส่งรหัสยืนยันใหม่อีกครั้ง' },
        { status: 400 }
      );
    }

    if (user.emailOtp !== trimmedOtp) {
      return NextResponse.json(
        { error: 'รหัสยืนยัน (OTP) ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 400 }
      );
    }

    const emailConflict = await prisma.user.findFirst({
      where: {
        email: { equals: user.pendingEmail, mode: 'insensitive' },
        id: { not: userId },
      },
    });

    if (emailConflict) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว กรุณาใช้อีเมลอื่น' },
        { status: 400 }
      );
    }

    const newEmail = user.pendingEmail;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        pendingEmail: null,
        emailOtp: null,
        emailOtpExpiry: null,
      },
    });

    const { invalidateCache } = await import('@/lib/cache');
    invalidateCache('users:');

    return NextResponse.json({
      success: true,
      message: 'ยืนยันและเปลี่ยนอีเมลสำเร็จเรียบร้อยแล้ว',
      user: {
        id: updatedUser.id,
        prefix: updatedUser.prefix,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        studentId: updatedUser.studentId,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        status: updatedUser.status,
        approvalScopes:
          updatedUser.role === 'USER' || updatedUser.role === 'VIEWER'
            ? null
            : (updatedUser.approvalScopes || null),
        isExecutive: updatedUser.role === 'VIEWER' ? false : Boolean(updatedUser.isExecutive),
        executiveRole: updatedUser.role === 'VIEWER' ? null : (updatedUser.executiveRole || null),
      },
    });
  } catch (error) {
    console.error('Verify email change error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยืนยันรหัส OTP กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
