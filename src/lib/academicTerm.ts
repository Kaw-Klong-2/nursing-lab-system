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

export interface AcademicTermInfo {
  id?: string;
  academicYear?: string;
  term?: string;
  name?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  isCurrent?: boolean;
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

  // 1. ตรวจสอบจากช่วง startDate - endDate ของ AcademicTerm
  if (terms && terms.length > 0) {
    const matched = terms.find(t => {
      if (!t.startDate || !t.endDate) return false;
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    });

    if (matched) {
      const termName = formatTermName(matched.term || matched.name);
      const year = matched.academicYear || String(d.getFullYear() + 543);
      return {
        termName,
        academicYear: year,
        fullTermName: `${termName} ${year}`,
      };
    }
  }

  // 2. ประมาณการตามรอบปฏิทินมหาวิทยาลัย
  // มิถุนายน - ตุลาคม: ภาคต้น
  // พฤศจิกายน - มีนาคม: ภาคปลาย
  // เมษายน - พฤษภาคม: ภาคฤดูร้อน
  const month = d.getMonth() + 1; // 1-12
  const gregorianYear = d.getFullYear();
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

