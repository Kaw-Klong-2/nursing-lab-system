import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth-security';

const MAX_OTP_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

declare global {
  var __otpResetAttempts: Map<string, { count: number; resetAt: number }> | undefined;
}

function getAttemptTracker(): Map<string, { count: number; resetAt: number }> {
  if (!globalThis.__otpResetAttempts) {
    globalThis.__otpResetAttempts = new Map();
  }
  return globalThis.__otpResetAttempts;
}

function timingSafeCompareOtp(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otpCode, newPassword } = body;

    if (!email || !otpCode || !newPassword) {
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

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedOtp = String(otpCode).trim();

    const tracker = getAttemptTracker();
    const now = Date.now();
    const existingAttempt = tracker.get(trimmedEmail);
    if (existingAttempt && existingAttempt.resetAt > now && existingAttempt.count >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json(
        { error: 'กรอกรหัส OTP ผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัส OTP ใหม่อีกครั้ง' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return NextResponse.json(
        { error: 'ไม่พบคำขอรีเซ็ตรหัสผ่าน หรือรหัสยืนยันไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > new Date(user.resetTokenExpiry)) {
      return NextResponse.json(
        { error: 'รหัสยืนยัน (OTP) หมดอายุแล้ว กรุณาส่งคำขอใหม่อีกครั้ง' },
        { status: 400 }
      );
    }

    // Check token match with constant-time comparison and brute-force lockout
    if (!timingSafeCompareOtp(trimmedOtp, user.resetToken)) {
      const current =
        existingAttempt && existingAttempt.resetAt > now
          ? existingAttempt
          : { count: 0, resetAt: now + ATTEMPT_WINDOW_MS };
      current.count += 1;
      tracker.set(trimmedEmail, current);

      if (current.count >= MAX_OTP_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken: null, resetTokenExpiry: null },
        });
        return NextResponse.json(
          { error: 'กรอกรหัส OTP ผิดเกิน 5 ครั้ง รหัสยืนยันถูกยกเลิกแล้ว กรุณาขอรหัส OTP ใหม่' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'รหัสยืนยัน (OTP) ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 400 }
      );
    }

    tracker.delete(trimmedEmail);

    // Hash and update
    const hashedNewPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'รีเซ็ตรหัสผ่านใหม่สำเร็จแล้ว ท่านสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่' },
      { status: 500 }
    );
  }
}
