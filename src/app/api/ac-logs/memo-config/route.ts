import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import {
  DEFAULT_AC_MEMO_CONFIG,
  type AcMemoConfig,
  type MemoUrgencyLevel,
} from '@/lib/ac-memo-docx';

const ENTITY_TYPE = 'AC_MEMO_CONFIG';
const ENTITY_ID = 'default';
const ACTION_NAME = 'CONFIG_UPDATE';

const ALLOWED_URGENCY: MemoUrgencyLevel[] = ['', 'ด่วน', 'ด่วนมาก', 'ด่วนที่สุด'];

function cleanStr(val: unknown, fallback: string, maxLen = 1500, preserveSpaces = false): string {
  if (typeof val !== 'string') return fallback;
  const processed = preserveSpaces ? val : val.trim();
  return processed.slice(0, maxLen);
}

function sanitizeConfig(raw: Record<string, unknown>): AcMemoConfig {
  const urgencyRaw = typeof raw.urgencyLevel === 'string' ? raw.urgencyLevel.trim() : '';
  const urgencyLevel: MemoUrgencyLevel = ALLOWED_URGENCY.includes(urgencyRaw as MemoUrgencyLevel)
    ? (urgencyRaw as MemoUrgencyLevel)
    : DEFAULT_AC_MEMO_CONFIG.urgencyLevel;

  return {
    departmentLine: cleanStr(raw.departmentLine, DEFAULT_AC_MEMO_CONFIG.departmentLine, 300),
    docNumberPrefix: cleanStr(raw.docNumberPrefix, DEFAULT_AC_MEMO_CONFIG.docNumberPrefix, 100),
    docNumberSuffix: cleanStr(raw.docNumberSuffix, DEFAULT_AC_MEMO_CONFIG.docNumberSuffix, 60),
    urgencyLevel,
    subjectLine1: cleanStr(raw.subjectLine1, DEFAULT_AC_MEMO_CONFIG.subjectLine1, 300),
    recipient1: cleanStr(raw.recipient1, DEFAULT_AC_MEMO_CONFIG.recipient1, 300),
    paragraph1: cleanStr(raw.paragraph1, DEFAULT_AC_MEMO_CONFIG.paragraph1, 2000),
    paragraph2Prefix: cleanStr(raw.paragraph2Prefix, DEFAULT_AC_MEMO_CONFIG.paragraph2Prefix, 1000, true),
    paragraph2Suffix: cleanStr(raw.paragraph2Suffix, DEFAULT_AC_MEMO_CONFIG.paragraph2Suffix, 1000, true),
    closingText: cleanStr(raw.closingText, DEFAULT_AC_MEMO_CONFIG.closingText, 200),
    signer1Name: cleanStr(raw.signer1Name, DEFAULT_AC_MEMO_CONFIG.signer1Name, 200),
    signer1Title: cleanStr(raw.signer1Title, DEFAULT_AC_MEMO_CONFIG.signer1Title, 200),
    signer2Recipient: cleanStr(raw.signer2Recipient, DEFAULT_AC_MEMO_CONFIG.signer2Recipient, 200),
    signer2Through: cleanStr(raw.signer2Through, DEFAULT_AC_MEMO_CONFIG.signer2Through, 200),
    signer2Note: cleanStr(raw.signer2Note, DEFAULT_AC_MEMO_CONFIG.signer2Note, 200),
    signer2Name: cleanStr(raw.signer2Name, DEFAULT_AC_MEMO_CONFIG.signer2Name, 200),
    signer2Title: cleanStr(raw.signer2Title, DEFAULT_AC_MEMO_CONFIG.signer2Title, 200),
    signer3Recipient: cleanStr(raw.signer3Recipient, DEFAULT_AC_MEMO_CONFIG.signer3Recipient, 200),
    signer3Note: cleanStr(raw.signer3Note, DEFAULT_AC_MEMO_CONFIG.signer3Note, 200),
    signer3Name: cleanStr(raw.signer3Name, DEFAULT_AC_MEMO_CONFIG.signer3Name, 200),
    signer3Title: cleanStr(raw.signer3Title, DEFAULT_AC_MEMO_CONFIG.signer3Title, 200),
    signer4Action: cleanStr(raw.signer4Action, DEFAULT_AC_MEMO_CONFIG.signer4Action, 100),
    signer4Name: cleanStr(raw.signer4Name, DEFAULT_AC_MEMO_CONFIG.signer4Name, 200),
    signer4Title: cleanStr(raw.signer4Title, DEFAULT_AC_MEMO_CONFIG.signer4Title, 200),
    showSignatureBorders:
      typeof raw.showSignatureBorders === 'boolean'
        ? raw.showSignatureBorders
        : DEFAULT_AC_MEMO_CONFIG.showSignatureBorders,
    useThaiDigits:
      typeof raw.useThaiDigits === 'boolean'
        ? raw.useThaiDigits
        : DEFAULT_AC_MEMO_CONFIG.useThaiDigits,
  };
}

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.uid) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const latest = await prisma.activityLog.findFirst({
      where: {
        entityType: ENTITY_TYPE,
        entityId: ENTITY_ID,
        action: ACTION_NAME,
      },
      orderBy: { createdAt: 'desc' },
    });

    const meta =
      latest?.metadata && typeof latest.metadata === 'object' && !Array.isArray(latest.metadata)
        ? (latest.metadata as Record<string, unknown>)
        : {};

    const config = sanitizeConfig(meta);

    return NextResponse.json({
      success: true,
      config,
      updatedAt: latest?.createdAt || null,
      updatedBy: latest?.userName || null,
    });
  } catch (error) {
    console.error('Error fetching AC memo config:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถโหลดค่าตั้งต้นบันทึกข้อความได้' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.uid) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.uid },
      select: { id: true, name: true, role: true, status: true },
    });

    if (
      !actor ||
      (actor.status && actor.status !== 'ACTIVE') ||
      (actor.role !== 'ADMIN' && actor.role !== 'OFFICER')
    ) {
      return NextResponse.json(
        { error: 'เฉพาะเจ้าหน้าที่ห้องปฏิบัติการและผู้ดูแลระบบเท่านั้นที่สามารถบันทึกค่าตั้งต้นได้' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawConfig =
      body?.config && typeof body.config === 'object' && !Array.isArray(body.config)
        ? (body.config as Record<string, unknown>)
        : (body as Record<string, unknown>);

    const sanitizedConfig = sanitizeConfig(rawConfig);

    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        userName: actor.name,
        userRole: actor.role,
        action: ACTION_NAME,
        entityType: ENTITY_TYPE,
        entityId: ENTITY_ID,
        entityTitle: 'อัปเดตค่าตั้งต้นบันทึกข้อความรายงานแอร์',
        details: 'บันทึกค่าตั้งต้นส่วนงาน เนื้อหา และรายชื่อผู้ลงนามสำหรับบันทึกข้อความเปิด-ปิดเครื่องปรับอากาศ',
        metadata: sanitizedConfig as unknown as object,
      },
    });

    return NextResponse.json({
      success: true,
      config: sanitizedConfig,
      message: 'บันทึกค่าตั้งต้นของคณะเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('Error saving AC memo config:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกค่าตั้งต้นบันทึกข้อความ' },
      { status: 500 }
    );
  }
}
