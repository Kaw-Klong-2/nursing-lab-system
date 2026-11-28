import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processChatbotTurn } from '@/lib/chatbot-engine';
import { requireActiveActor } from '@/lib/viewer-guard';

export async function GET(req: Request) {
  try {
    const auth = await requireActiveActor(req);
    if (auth.errorResponse) return auth.errorResponse;

    const actor = auth.actor;
    const userDetail = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { id: true, name: true, role: true, department: true, isExecutive: true },
    });

    const role = (userDetail?.role || actor.role || 'USER').toUpperCase();
    const userName = userDetail?.name || actor.name || 'ผู้ใช้งาน';

    let greeting = `สวัสดีครับคุณ **${userName}**! 👋\nผมคือ **KUNurse+ Lab AI Copilot** ผู้ช่วยประจำห้องปฏิบัติการพยาบาลครับ มีอะไรให้ผมช่วยเหลือวันนี้ครับ?`;
    let quickReplies: Array<{ label: string; textToSend: string }> = [];

    if (role === 'OFFICER' || role === 'ADMIN') {
      greeting +=
        '\n\nท่านสามารถถามวิธีใช้งานระบบทุกเมนู สอบถามข้อมูลสดจากฐานข้อมูล (ตารางห้อง สต็อกพัสดุ คำขอรออนุมัติ ชั่วโมงแอร์) หรือสั่งบันทึกแอร์ได้ทันทีครับ';
      quickReplies = [
        { label: '📅 ตารางห้องวันนี้', textToSend: 'วันนี้มีห้องไหนถูกจองบ้าง' },
        { label: '📋 เช็กคำขอรออนุมัติ', textToSend: 'มีคำขอรออนุมัติไหม' },
        { label: '❄️ สรุปแอร์เดือนนี้', textToSend: 'เดือนนี้เปิดแอร์ไปแล้วกี่ชั่วโมง' },
        { label: '📦 พัสดุใกล้หมดสต็อก', textToSend: 'มีพัสดุอะไรใกล้หมดสต็อกบ้าง' },
        { label: '📖 วิธีจัดการรายชื่อนิสิต', textToSend: 'วิธีจัดการรายชื่อนิสิตในรายวิชาทำยังไง' },
      ];
    } else if (role === 'APPROVER' || role === 'TEACHER') {
      greeting +=
        '\n\nอาจารย์สามารถสอบถามวิธีใช้งานระบบ ตรวจคำขอของนิสิตในรายวิชาที่สอน เช็กตารางห้องแล็บ หรือดูงบประมาณคงเหลือได้เลยครับ';
      quickReplies = [
        { label: '📋 คำขอที่รอฉันอนุมัติ', textToSend: 'มีคำขอรออนุมัติไหม' },
        { label: '📊 งบประมาณรายวิชา', textToSend: 'รายวิชาทั้งหมดเหลืองบเท่าไหร่' },
        { label: '📅 ตารางห้องวันนี้', textToSend: 'วันนี้มีห้องไหนถูกจองบ้าง' },
        { label: '📖 วิธีอนุมัติคำขอด่วน', textToSend: 'วิธีใช้งานปุ่มอนุมัติด่วนทำยังไง' },
      ];
    } else {
      greeting +=
        '\n\nนิสิตสามารถถามวิธีใช้งานระบบ เช็กห้องว่าง รอบฝึกทักษะ สต็อกพัสดุ หรือเช็กสถานะคำขอของตนเองได้เลยครับ';
      quickReplies = [
        { label: '📖 วิธีจองห้องแล็บ', textToSend: 'วิธีจองห้องแล็บทำยังไง' },
        { label: '📅 วันนี้ห้องไหนว่างบ้าง', textToSend: 'วันนี้มีห้องไหนว่างบ้าง' },
        { label: '🛒 วิธียืม-เบิกพัสดุ', textToSend: 'วิธียืมและเบิกพัสดุทำยังไง' },
        { label: '🔍 เช็กสถานะคำขอของฉัน', textToSend: 'สถานะคำขอของฉัน' },
      ];
    }

    return NextResponse.json({
      greeting,
      quickReplies,
      role,
    });
  } catch (error: any) {
    console.error('Error in GET /api/chatbot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireActiveActor(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const { message, sessionState } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุข้อความ' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.actor.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isExecutive: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' }, { status: 401 });
    }

    const response = await processChatbotTurn(message, sessionState || null, currentUser);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in POST /api/chatbot:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
  }
}
