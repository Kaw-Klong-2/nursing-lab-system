import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyFeedbackAdmin } from '@/lib/feedback-utils';

const DEFAULT_CONFIG = {
  id: 'default',
  isEnabled: true,
  randomChancePercent: 50,
  cooldownHoursAfterSubmit: 0,
  promptTitle: 'ทำรายการสำเร็จ! ให้คะแนนความพึงพอใจการใช้ระบบ',
  promptSubtitle: 'ความคิดเห็นของท่านช่วยให้เราพัฒนาห้องปฏิบัติการพยาบาลให้ดียิ่งขึ้น',
};

export async function GET() {
  try {
    let config = await prisma.systemFeedbackConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await prisma.systemFeedbackConfig.create({
        data: DEFAULT_CONFIG,
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error fetching feedback config:', error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      actorUserId,
      isEnabled,
      randomChancePercent,
      cooldownHoursAfterSubmit,
      promptTitle,
      promptSubtitle,
    } = body;

    const auth = await verifyFeedbackAdmin(actorUserId);
    if (!auth.ok) {
      return NextResponse.json(
        { error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถตั้งค่าระบบประเมินได้' },
        { status: 403 }
      );
    }

    const chance = Math.min(100, Math.max(0, Math.round(Number(randomChancePercent ?? 50))));
    const cooldownHours = Math.min(720, Math.max(0, Math.round(Number(cooldownHoursAfterSubmit ?? 0))));
    const cleanTitle =
      typeof promptTitle === 'string' && promptTitle.trim()
        ? promptTitle.trim()
        : DEFAULT_CONFIG.promptTitle;
    const cleanSubtitle =
      typeof promptSubtitle === 'string' && promptSubtitle.trim()
        ? promptSubtitle.trim()
        : DEFAULT_CONFIG.promptSubtitle;

    const updated = await prisma.systemFeedbackConfig.upsert({
      where: { id: 'default' },
      update: {
        isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true,
        randomChancePercent: chance,
        cooldownHoursAfterSubmit: cooldownHours,
        promptTitle: cleanTitle,
        promptSubtitle: cleanSubtitle,
      },
      create: {
        id: 'default',
        isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true,
        randomChancePercent: chance,
        cooldownHoursAfterSubmit: cooldownHours,
        promptTitle: cleanTitle,
        promptSubtitle: cleanSubtitle,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating feedback config:', error);
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถบันทึกการตั้งค่าได้' },
      { status: 500 }
    );
  }
}
