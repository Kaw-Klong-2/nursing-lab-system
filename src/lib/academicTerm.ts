/**
 * Academic Term Utilities & Helpers for Nursing Lab System
 * มาตรฐานคำเรียกภาคการศึกษา: ภาคต้น, ภาคปลาย, ภาคฤดูร้อน
 */

import { getBangkokParts } from './date-time-utils';

export type AcademicTermType = 'FIRST' | 'SECOND' | 'SUMMER';
export type AcademicTermStatus = 'ACTIVE' | 'UPCOMING' | 'CLOSED';

export interface AcademicTermOption {
  value: AcademicTermType;
  legacyCode: string;
  label: string;
  shortLabel: string;
}

export const ACADEMIC_TERM_OPTIONS: AcademicTermOption[] = [
  { value: 'FIRST', legacyCode: '1', label: 'ภาคต้น', shortLabel: 'ภาคต้น' },
  { value: 'SECOND', legacyCode: '2', label: 'ภาคปลาย', shortLabel: 'ภาคปลาย' },
  { value: 'SUMMER', legacyCode: '3', label: 'ภาคฤดูร้อน', shortLabel: 'ฤดูร้อน' },
];

/**
 * แปลงค่า semester รหัสเดิม ("1", "2", "3") หรือรหัสใหม่ ("FIRST", "SECOND", "SUMMER") ให้เป็นภาษาไทยมาตรฐาน
 */
export function formatTermName(term?: string | null): string {
  if (!term) return '-';
  const clean = String(term).trim().toUpperCase();
  if (clean === '1' || clean === 'FIRST' || clean === 'ภาคต้น' || clean === 'ภาคเรียนที่ 1') {
    return 'ภาคต้น';
  }
  if (clean === '2' || clean === 'SECOND' || clean === 'ภาคปลาย' || clean === 'ภาคเรียนที่ 2') {
    return 'ภาคปลาย';
  }
  if (clean === '3' || clean === 'SUMMER' || clean === 'ภาคฤดูร้อน') {
    return 'ภาคฤดูร้อน';
  }
  return term;
}

/**
 * แสดงชื่อเต็มของภาคการศึกษา เช่น "ภาคต้น ปีการศึกษา 2569"
 */
export function formatFullTermName(term?: string | null, academicYear?: string | null): string {
  const termName = formatTermName(term);
  const year = academicYear || '2569';
  return `${termName} ปีการศึกษา ${year}`;
}

/**
 * แปลงค่าภาษาไทยหรือรหัสให้เป็น Term Code ที่เป็นมาตรฐาน (FIRST, SECOND, SUMMER)
 */
export function normalizeTermCode(term?: string | null): AcademicTermType {
  if (!term) return 'FIRST';
  const clean = String(term).trim().toUpperCase();
  if (clean === '2' || clean === 'SECOND' || clean === 'ภาคปลาย' || clean === 'ภาคเรียนที่ 2') {
    return 'SECOND';
  }
  if (clean === '3' || clean === 'SUMMER' || clean === 'ภาคฤดูร้อน') {
    return 'SUMMER';
  }
  return 'FIRST';
}

/**
 * แปลงค่า Term Code กลับเป็นตัวเลขรหัสที่ใช้ใน Model Course เดิม ("1", "2", "3") เพื่อความเข้ากันได้ย้อนหลัง
 */
export function toLegacySemesterCode(term?: string | null): string {
  const code = normalizeTermCode(term);
  if (code === 'SECOND') return '2';
  if (code === 'SUMMER') return '3';
  return '1';
}

export interface AcademicTermInfo {
  id?: string;
  academicYear?: string;
  term?: string;
  name?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  isCurrent?: boolean;
  status?: AcademicTermStatus | string;
}

/**
 * สกัดคีย์วันที่มาตรฐาน "YYYY-MM-DD" จาก Date หรือ ISO String ของภาคการศึกษา
 * ใช้ UTC date-only (.toISOString().slice(0, 10)) เพื่อรักษาวันที่ปฏิทินไทยเดิมไม่ให้เลื่อนเมื่อแปลง Timezone
 */
export function toTermDateKey(date?: Date | string | null): string | null {
  if (!date) return null;
  if (typeof date === 'string') {
    const trimmed = date.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * แปลงวันที่อินพุตเป็น Date ที่เวลา 00:00:00.000Z เพื่อเก็บในฐานข้อมูลแบบ Date-only อย่างสม่ำเสมอ
 */
export function parseTermDateToUtcMidnight(dateInput?: Date | string | null): Date | null {
  const key = toTermDateKey(dateInput);
  if (!key) return null;
  const parsed = new Date(`${key}T00:00:00.000Z`);
  if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== key) {
    return null;
  }
  return parsed;
}

/**
 * คืนค่าวันที่ปัจจุบันในเขตเวลาประเทศไทย (Asia/Bangkok) รูปแบบ "YYYY-MM-DD"
 */
export function getBangkokDateKey(now: Date = new Date()): string {
  return getBangkokParts(now).dateString;
}

/**
 * คำนวณสถานะภาคการศึกษาอัตโนมัติ (ACTIVE / UPCOMING / CLOSED) ตามวันที่ปฏิทินประเทศไทย
 */
export function computeTermStatusByDate(
  startDate: Date | string,
  endDate: Date | string,
  todayBkkKey: string = getBangkokDateKey()
): AcademicTermStatus {
  const startKey = toTermDateKey(startDate);
  const endKey = toTermDateKey(endDate);
  if (!startKey || !endKey) return 'ACTIVE';
  if (todayBkkKey > endKey) return 'CLOSED';
  if (todayBkkKey < startKey) return 'UPCOMING';
  return 'ACTIVE';
}

/**
 * ค้นหาภาคการศึกษาที่ตรงกับวันที่ปฏิทินไทยปัจจุบัน (startDate <= today <= endDate)
 */
export function findCalendarActiveTerm<
  T extends { id: string; startDate: Date | string; endDate: Date | string; academicYear?: string }
>(terms: T[], todayBkkKey: string = getBangkokDateKey()): T | null {
  const matches = terms.filter((t) => {
    const startKey = toTermDateKey(t.startDate);
    const endKey = toTermDateKey(t.endDate);
    return Boolean(startKey && endKey && todayBkkKey >= startKey && todayBkkKey <= endKey);
  });

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const startA = toTermDateKey(a.startDate) || '';
    const startB = toTermDateKey(b.startDate) || '';
    if (startB !== startA) return startB.localeCompare(startA);

    const yearA = String(a.academicYear || '');
    const yearB = String(b.academicYear || '');
    if (yearB !== yearA) return yearB.localeCompare(yearA);

    const endA = toTermDateKey(a.endDate) || '';
    const endB = toTermDateKey(b.endDate) || '';
    return endB.localeCompare(endA);
  });

  return matches[0];
}

/**
 * คำนวณจำนวนวันที่เหลือจนถึงวันสิ้นสุดภาคการศึกษาตามปฏิทินไทย (Asia/Bangkok)
 * > 0 = ยังเหลืออีก N วัน, 0 = วันสุดท้ายของภาคการศึกษา, < 0 = สิ้นสุดแล้ว
 */
export function calculateTermDaysRemaining(
  endDate: Date | string,
  todayBkkKey: string = getBangkokDateKey()
): number {
  const endKey = toTermDateKey(endDate);
  if (!endKey) return -1;
  const endMs = Date.parse(`${endKey}T00:00:00.000Z`);
  const todayMs = Date.parse(`${todayBkkKey}T00:00:00.000Z`);
  if (isNaN(endMs) || isNaN(todayMs)) return -1;
  return Math.round((endMs - todayMs) / 86400000);
}

/**
 * คำนวณหาภาคการศึกษาจากวันที่ที่ระบุ โดยค้นหาจากรายการ terms หรือประมาณการตามรอบปฏิทินการศึกษา
 */
export function getAcademicTermByDate(
  dateStr?: string | Date | null,
  terms?: AcademicTermInfo[]
): { termName: string; academicYear: string; fullTermName: string } {
  if (!dateStr) {
    return { termName: '-', academicYear: '-', fullTermName: '-' };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { termName: '-', academicYear: '-', fullTermName: '-' };
  }

  const targetBkkKey = getBangkokDateKey(d);

  // 1. ตรวจสอบจากช่วง startDate - endDate ของ AcademicTerm
  if (terms && terms.length > 0) {
    const matchingTerms = terms
      .filter((t) => {
        const startKey = toTermDateKey(t.startDate);
        const endKey = toTermDateKey(t.endDate);
        return Boolean(startKey && endKey && targetBkkKey >= startKey && targetBkkKey <= endKey);
      })
      .sort((a, b) => {
        const startA = toTermDateKey(a.startDate) || '';
        const startB = toTermDateKey(b.startDate) || '';
        return startB.localeCompare(startA);
      });

    const matched = matchingTerms[0];
    if (matched) {
      const termName = formatTermName(matched.term || matched.name);
      const year = matched.academicYear || String(getBangkokParts(d).year + 543);
      return {
        termName,
        academicYear: year,
        fullTermName: `${termName} ${year}`,
      };
    }
  }

  // 2. ประมาณการตามรอบปฏิทินมหาวิทยาลัย (อ้างอิงเวลาประเทศไทย Asia/Bangkok)
  // มิถุนายน - ตุลาคม: ภาคต้น
  // พฤศจิกายน - มีนาคม: ภาคปลาย
  // เมษายน - พฤษภาคม: ภาคฤดูร้อน
  const { year: gregorianYear, month: monthZeroBased } = getBangkokParts(d);
  const month = monthZeroBased + 1; // 1-12
  let termName = 'ภาคต้น';
  let academicYear = String(gregorianYear + 543);

  if (month >= 6 && month <= 10) {
    termName = 'ภาคต้น';
    academicYear = String(gregorianYear + 543);
  } else if (month >= 11 || month <= 3) {
    termName = 'ภาคปลาย';
    academicYear = month <= 3 ? String(gregorianYear + 543 - 1) : String(gregorianYear + 543);
  } else {
    termName = 'ภาคฤดูร้อน';
    academicYear = String(gregorianYear + 543 - 1);
  }

  return {
    termName,
    academicYear,
    fullTermName: `${termName} ${academicYear}`,
  };
}

