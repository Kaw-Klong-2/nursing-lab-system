import { prisma } from '@/lib/prisma';
import { getCached, invalidateCache, setCached } from '@/lib/cache';
import {
  computeTermStatusByDate,
  findCalendarActiveTerm,
  getBangkokDateKey,
  toTermDateKey,
} from '@/lib/academicTerm';

const SYNC_CACHE_KEY = 'academic-terms:synced-date';
const SYNC_CACHE_TTL_SECONDS = 300;
const OVERRIDE_ENTITY_TYPE = 'ACADEMIC_TERM_OVERRIDE';
const OVERRIDE_ENTITY_ID = 'current';
const ACTION_MANUAL_PIN = 'MANUAL_PIN';
const ACTION_CLEAR_PIN = 'CLEAR_PIN';

export interface AcademicTermActor {
  id: string;
  name: string;
  role: string;
}

/**
 * ล้างแคชข้อมูลภาคการศึกษาและแดชบอร์ดเมื่อมีการเปลี่ยนแปลงหรือสลับภาคเรียน
 */
export function invalidateAcademicTermCaches(): void {
  invalidateCache('academic-terms:');
  invalidateCache('dashboard:');
}

/**
 * สร้างภาคการศึกษาเริ่มต้นเมื่อยังไม่มีข้อมูลในฐานข้อมูล
 * คำนวณสถานะ (ACTIVE / UPCOMING / CLOSED) และภาคปัจจุบันตามปฏิทินไทยอัตโนมัติ
 */
export async function seedDefaultTermsIfEmpty(now: Date = new Date()): Promise<boolean> {
  const count = await prisma.academicTerm.count();
  if (count > 0) return false;

  const todayBkkKey = getBangkokDateKey(now);
  const candidates = [
    {
      academicYear: '2569',
      term: 'FIRST',
      name: 'ภาคต้น ปีการศึกษา 2569',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-10-31T00:00:00.000Z'),
    },
    {
      academicYear: '2569',
      term: 'SECOND',
      name: 'ภาคปลาย ปีการศึกษา 2569',
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T00:00:00.000Z'),
    },
    {
      academicYear: '2569',
      term: 'SUMMER',
      name: 'ภาคฤดูร้อน ปีการศึกษา 2569',
      startDate: new Date('2027-04-01T00:00:00.000Z'),
      endDate: new Date('2027-05-31T00:00:00.000Z'),
    },
  ];

  let matchedActive = false;
  for (const item of candidates) {
    const status = computeTermStatusByDate(item.startDate, item.endDate, todayBkkKey);
    const isCurrent = status === 'ACTIVE' && !matchedActive;
    if (isCurrent) matchedActive = true;

    await prisma.academicTerm.create({
      data: {
        ...item,
        isCurrent,
        status,
      },
    });
  }

  if (!matchedActive) {
    await prisma.academicTerm.updateMany({
      where: { academicYear: '2569', term: 'FIRST' },
      data: { isCurrent: true },
    });
  }

  return true;
}

/**
 * บันทึกการตั้งค่าภาคการศึกษาปัจจุบันด้วยตนเอง (Manual Pin)
 * หากเลือกภาคที่ตรงกับปฏิทินจริงอยู่แล้ว จะล้างการปักหมุดและกลับสู่โหมดอัตโนมัติทันที
 */
export async function recordManualTermPin(params: {
  actor?: AcademicTermActor | null;
  pinnedTermId: string;
  calendarActiveTermId: string | null;
  todayBkkKey?: string;
}): Promise<void> {
  if (params.calendarActiveTermId && params.pinnedTermId === params.calendarActiveTermId) {
    await clearManualTermPin(params.actor);
    return;
  }

  await prisma.activityLog.create({
    data: {
      userId: params.actor?.id || null,
      userName: params.actor?.name || null,
      userRole: params.actor?.role || null,
      action: ACTION_MANUAL_PIN,
      entityType: OVERRIDE_ENTITY_TYPE,
      entityId: OVERRIDE_ENTITY_ID,
      entityTitle: 'กำหนดภาคการศึกษาปัจจุบันด้วยตนเอง',
      details: `ปักหมุดภาคการศึกษา (${params.pinnedTermId}) แทนภาคตามปฏิทินปัจจุบันชั่วคราว`,
      metadata: {
        active: true,
        pinnedTermId: params.pinnedTermId,
        overriddenCalendarTermId: params.calendarActiveTermId,
        pinnedAtDate: params.todayBkkKey || getBangkokDateKey(),
      },
    },
  });
}

/**
 * ล้างการปักหมุดด้วยตนเอง เพื่อกลับสู่โหมดสลับภาคการศึกษาอัตโนมัติตามปฏิทินไทย
 */
export async function clearManualTermPin(actor?: AcademicTermActor | null): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId: actor?.id || null,
      userName: actor?.name || null,
      userRole: actor?.role || null,
      action: ACTION_CLEAR_PIN,
      entityType: OVERRIDE_ENTITY_TYPE,
      entityId: OVERRIDE_ENTITY_ID,
      entityTitle: 'กลับสู่โหมดสลับภาคการศึกษาอัตโนมัติ',
      details: 'ยกเลิกการปักหมุดภาคการศึกษาด้วยตนเองและเปิดการสลับตามปฏิทินอัตโนมัติ',
      metadata: { active: false },
    },
  });
  invalidateAcademicTermCaches();
}

/**
 * ตรวจสอบและซิงก์สถานะภาคการศึกษา (ACTIVE / UPCOMING / CLOSED) และภาคปัจจุบัน (isCurrent)
 * ให้ตรงกับวันที่ปฏิทินประเทศไทย (Asia/Bangkok) โดยใช้ in-memory cache เพื่อไม่ยิง DB ซ้ำในวันเดียวกัน
 */
export async function ensureAcademicTermsSynced(options?: {
  force?: boolean;
  now?: Date;
}): Promise<{
  skipped: boolean;
  syncedCount: number;
  todayBkkKey: string;
  currentTermId: string | null;
}> {
  const now = options?.now ?? new Date();
  const todayBkkKey = getBangkokDateKey(now);

  if (!options?.force && getCached<string>(SYNC_CACHE_KEY) === todayBkkKey) {
    return {
      skipped: true,
      syncedCount: 0,
      todayBkkKey,
      currentTermId: null,
    };
  }

  let terms = await prisma.academicTerm.findMany({
    orderBy: [{ academicYear: 'desc' }, { startDate: 'asc' }],
  });

  if (terms.length === 0) {
    await seedDefaultTermsIfEmpty(now);
    terms = await prisma.academicTerm.findMany({
      orderBy: [{ academicYear: 'desc' }, { startDate: 'asc' }],
    });
    if (terms.length === 0) {
      setCached(SYNC_CACHE_KEY, todayBkkKey, SYNC_CACHE_TTL_SECONDS);
      return {
        skipped: false,
        syncedCount: 0,
        todayBkkKey,
        currentTermId: null,
      };
    }
  }

  const calendarActiveTerm = findCalendarActiveTerm(terms, todayBkkKey);

  let hasActiveManualOverride = false;
  if (calendarActiveTerm && !calendarActiveTerm.isCurrent) {
    const latest = await prisma.activityLog.findFirst({
      where: {
        entityType: OVERRIDE_ENTITY_TYPE,
        entityId: OVERRIDE_ENTITY_ID,
      },
      orderBy: { createdAt: 'desc' },
    });

    const meta =
      latest?.metadata && typeof latest.metadata === 'object' && !Array.isArray(latest.metadata)
        ? (latest.metadata as Record<string, unknown>)
        : null;

    if (
      latest?.action === ACTION_MANUAL_PIN &&
      meta?.active === true &&
      meta.overriddenCalendarTermId === calendarActiveTerm.id &&
      typeof meta.pinnedTermId === 'string' &&
      terms.some((t) => t.id === meta.pinnedTermId && t.isCurrent)
    ) {
      hasActiveManualOverride = true;
    }
  }

  const currentTerms = terms.filter((t) => t.isCurrent);
  let targetCurrentId: string | null = null;

  if (calendarActiveTerm && !hasActiveManualOverride) {
    targetCurrentId = calendarActiveTerm.id;
  } else if (currentTerms.length === 1) {
    targetCurrentId = currentTerms[0].id;
  } else if (currentTerms.length > 1) {
    targetCurrentId = calendarActiveTerm?.id || currentTerms[0].id;
  } else {
    // ไม่มีเทอมไหนเป็น isCurrent อยู่เลย -> เลือกเทอมที่เพิ่งปิดล่าสุด หรือกำลังจะเปิดเร็วที่สุด
    const pastTerms = terms
      .map((t) => ({ term: t, endKey: toTermDateKey(t.endDate) }))
      .filter((x): x is { term: (typeof terms)[number]; endKey: string } =>
        Boolean(x.endKey && x.endKey < todayBkkKey)
      )
      .sort((a, b) => b.endKey.localeCompare(a.endKey));

    if (pastTerms.length > 0) {
      targetCurrentId = pastTerms[0].term.id;
    } else {
      const futureTerms = terms
        .map((t) => ({ term: t, startKey: toTermDateKey(t.startDate) }))
        .filter((x): x is { term: (typeof terms)[number]; startKey: string } =>
          Boolean(x.startKey && x.startKey > todayBkkKey)
        )
        .sort((a, b) => a.startKey.localeCompare(b.startKey));

      targetCurrentId = futureTerms[0]?.term.id || terms[0].id;
    }
  }

  const updateOps = [];
  for (const t of terms) {
    const desiredStatus = computeTermStatusByDate(t.startDate, t.endDate, todayBkkKey);
    const desiredIsCurrent = t.id === targetCurrentId;
    if (t.status !== desiredStatus || t.isCurrent !== desiredIsCurrent) {
      updateOps.push(
        prisma.academicTerm.update({
          where: { id: t.id },
          data: {
            status: desiredStatus,
            isCurrent: desiredIsCurrent,
          },
        })
      );
    }
  }

  if (updateOps.length > 0) {
    await prisma.$transaction(updateOps);
    invalidateCache('dashboard:');
  }

  setCached(SYNC_CACHE_KEY, todayBkkKey, SYNC_CACHE_TTL_SECONDS);

  return {
    skipped: false,
    syncedCount: updateOps.length,
    todayBkkKey,
    currentTermId: targetCurrentId,
  };
}
