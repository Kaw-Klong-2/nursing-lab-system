import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireActiveActor } from '@/lib/viewer-guard';
import { getAiCopilotConfigForActor } from '@/lib/chatbot-briefing';
import { logActivity } from '@/lib/activity-log';

export async function GET(req: Request) {
  try {
    const auth = await requireActiveActor(req);
    if (auth.errorResponse) return auth.errorResponse;

    const config = await getAiCopilotConfigForActor(auth.actor.role);
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Error in GET /api/chatbot/config:', error);
    return NextResponse.json({ error: 'ไม่สามารถโหลดการตั้งค่า AI Copilot ได้' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireActiveActor(req, ['ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const enableForTeachers = Boolean(body.enableForTeachers);
    const enableForStudents = Boolean(body.enableForStudents);
    const enableForExecutives = body.enableForExecutives !== false;
    const defaultModelMode = body.defaultModelMode === 'deep' ? 'deep' : 'fast';

    const updated = await prisma.aiCopilotConfig.upsert({
      where: { id: 'default' },
      update: {
        enableForTeachers,
        enableForStudents,
        enableForExecutives,
        defaultModelMode,
        updatedById: auth.actor.id,
      },
      create: {
        id: 'default',
        enableForTeachers,
        enableForStudents,
        enableForExecutives,
        defaultModelMode,
        updatedById: auth.actor.id,
      },
    });

    await logActivity({
      userId: auth.actor.id,
      userName: auth.actor.name,
      userRole: auth.actor.role,
      action: 'UPDATE',
      entityType: 'SYSTEM',
      entityTitle: 'อัปเดตสิทธิ์การใช้งาน AI Copilot',
      details: `อาจารย์=${enableForTeachers}, นิสิต=${enableForStudents}, ผู้บริหาร=${enableForExecutives}, โหมดเริ่มต้น=${defaultModelMode}`,
    });

    const config = await getAiCopilotConfigForActor(auth.actor.role);
    return NextResponse.json({ success: true, config, raw: updated });
  } catch (error: any) {
    console.error('Error in PUT /api/chatbot/config:', error);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกการตั้งค่า AI Copilot ได้' }, { status: 500 });
  }
}
