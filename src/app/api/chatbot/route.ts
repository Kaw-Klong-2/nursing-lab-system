import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processChatbotTurn } from '@/lib/chatbot-engine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let currentUser: any = null;
    if (userId) {
      currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true, department: true },
      });
    }

    const role = (currentUser?.role || 'USER').toUpperCase();
    const userName = currentUser?.name || 'ผู้ใช้งาน';

    let greeting = `สวัสดีครับคุณ **${userName}**! 👋\nผมคือ **KUNurse+ Lab AI Copilot** ผู้ช่วยประจำห้องปฏิบัติการพยาบาลครับ มีอะไรให้ผมช่วยเหลือวันนี้ครับ?`;
    let quickReplies: any[] = [];

    if (role === 'OFFICER' || role === 'ADMIN') {
      greeting += '\n\nท่านสามารถสั่งบันทึกแอร์ ตรวจสอบรายการอนุมัติ หรือเช็กพัสดุค้างคืนได้ทันทีครับ';
      quickReplies = [
        { label: '❄️ บันทึกเปิด-ปิดแอร์', textToSend: 'เปิดแอร์' },
        { label: '📋 ตรวจสอบคำขอรออนุมัติ', textToSend: 'มีรายการรออนุมัติไหม' },
        { label: '⚠️ เช็กคนค้างคืนพัสดุ', textToSend: 'ใครยังไม่คืนของบ้าง' },
        { label: '📦 ค้นหาสต็อกพัสดุ', textToSend: 'เช็กสต็อก' },
      ];
    } else if (role === 'APPROVER' || role === 'TEACHER') {
      greeting += '\n\nอาจารย์สามารถตรวจสอบคำขอของนิสิตในรายวิชาที่สอน หรือเช็กงบประมาณคงเหลือได้เลยครับ';
      quickReplies = [
        { label: '📋 คำขอที่รอฉันอนุมัติ', textToSend: 'มีคำขอรออนุมัติไหม' },
        { label: '📊 งบประมาณรายวิชา 222', textToSend: 'วิชา 222 เหลืองบเท่าไหร่' },
        { label: '🏢 จองห้องแล็บการสอน', textToSend: 'จองห้องแล็บ' },
      ];
    } else {
      greeting += '\n\nนิสิตสามารถพิมพ์จองห้องแล็บ ขอยืมอุปกรณ์/เบิกของ หรือเช็กสถานะคำขอได้เลยครับ';
      quickReplies = [
        { label: '🏢 จองห้องแล็บ', textToSend: 'จองห้องแล็บ' },
        { label: '🛒 ขอเบิก-ยืมพัสดุ', textToSend: 'ขอเบิกของ' },
        { label: '🩺 ลงชื่อรอบฝึกทักษะ', textToSend: 'รอบฝึกทักษะ' },
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
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, sessionState, userId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุข้อความ' }, { status: 400 });
    }

    let currentUser: any = null;
    if (userId) {
      currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true, department: true },
      });
    }

    if (!currentUser) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งาน หรือเซสชันหมดอายุ' }, { status: 401 });
    }

    const response = await processChatbotTurn(message, sessionState || null, currentUser);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in POST /api/chatbot:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
  }
}
