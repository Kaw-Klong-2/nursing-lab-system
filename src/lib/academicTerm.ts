/**
 * Academic Term Utilities & Helpers for Nursing Lab System
 * มาตรฐานคำเรียกภาคการศึกษา: ภาคต้น, ภาคปลาย, ภาคฤดูร้อน
 */

export type AcademicTermType = 'FIRST' | 'SECOND' | 'SUMMER';

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
