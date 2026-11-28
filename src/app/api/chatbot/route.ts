import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processChatbotTurn } from '@/lib/chatbot-engine';
import { requireActiveActor } from '@/lib/viewer-guard';
import { buildDailyBriefing, getAiCopilotConfigForActor } from '@/lib/chatbot-briefing';
import { getGeminiApiKey } from '@/lib/chatbot-gemini';

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

    const config = await getAiCopilotConfigForActor(role);
    if (!config.canUseCopilot) {
      return NextResponse.json(
        { error: 'ผู้ดูแลระบบยังไม่เปิดใช้งานผู้ช่วย AI Copilot สำหรับบทบาทของท่าน', config },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const includeBriefing = searchParams.get('briefing') !== '0' && (role === 'ADMIN' || role === 'OFFICER');
    const briefing = includeBriefing ? await buildDailyBriefing({ id: actor.id, role }) : null;

    let greeting = `สวัสดีครับคุณ **${userName}**! 👋\nผมคือ **KUNurse+ Lab AI Copilot** ผู้ช่วยอัจฉริยะประจำห้องปฏิบัติการพยาบาลครับ`;
    let quickReplies: Array<{ label: string; textToSend: string }> = [];

    if (role === 'OFFICER' || role === 'ADMIN') {
      greeting +=
        '\n\nท่านสามารถสอบถามวิธีใช้งานระบบ ตรวจข้อมูลสดจากฐานข้อมูล หรือสั่งปฏิบัติการจริง (เช่น บันทึกแอร์หลายห้อง, อนุมัติคำขอ, ทวงคืนพัสดุ, จองห้อง, ส่งประกาศ, จัดการรายชื่อนิสิต, ปรับสต็อก) โดยจะมีการ์ด **Preview & ยืนยัน** ก่อนบันทึกทุกครั้งครับ';
      quickReplies = [
        { label: '📅 ตารางห้องวันนี้', textToSend: 'วันนี้มีห้องไหนถูกจองบ้าง' },
        { label: '📋 เช็กคำขอรออนุมัติ', textToSend: 'มีคำขอรออนุมัติไหม' },
        { label: '⚠️ เช็กคนค้างคืนพัสดุ', textToSend: 'ใครยังไม่คืนของบ้าง' },
        { label: '❄️ สรุปแอร์เดือนนี้', textToSend: 'เดือนนี้เปิดแอร์ไปแล้วกี่ชั่วโมง' },
        { label: '📦 พัสดุใกล้หมดสต็อก', textToSend: 'มีพัสดุอะไรใกล้หมดสต็อกบ้าง' },
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
      config,
      briefing,
      aiStatus: {
        hasGeminiKey: Boolean(getGeminiApiKey()),
      },
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

    const config = await getAiCopilotConfigForActor(currentUser.role);
    if (!config.canUseCopilot) {
      return NextResponse.json(
        { error: 'ผู้ดูแลระบบยังไม่เปิดใช้งานผู้ช่วย AI Copilot สำหรับบทบาทของท่าน' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { message, sessionState, modelMode, confirmAction } = body;

    if ((!message || typeof message !== 'string') && !confirmAction) {
      return NextResponse.json({ error: 'กรุณาระบุข้อความ' }, { status: 400 });
    }

    const response = await processChatbotTurn(message || '', sessionState || null, currentUser, {
      modelMode: modelMode === 'deep' || modelMode === 'fast' ? modelMode : config.defaultModelMode,
      confirmAction: confirmAction === 'CONFIRM' || confirmAction === 'CANCEL' ? confirmAction : undefined,
    });
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in POST /api/chatbot:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
  }
}
