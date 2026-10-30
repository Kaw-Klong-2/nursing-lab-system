import { getBangkokParts } from './date-time-utils';

const THAI_MONTH_MAP: Record<string, number> = {
  'มกราคม': 1, 'ม.ค.': 1, 'มค': 1,
  'กุมภาพันธ์': 2, 'ก.พ.': 2, 'กพ': 2,
  'มีนาคม': 3, 'มี.ค.': 3, 'มีค': 3,
  'เมษายน': 4, 'เม.ย.': 4, 'เมย': 4,
  'พฤษภาคม': 5, 'พ.ค.': 5, 'พค': 5,
  'มิถุนายน': 6, 'มิ.ย.': 6, 'มิย': 6,
  'กรกฎาคม': 7, 'ก.ค.': 7, 'กค': 7,
  'สิงหาคม': 8, 'ส.ค.': 8, 'สค': 8,
  'กันยายน': 9, 'ก.ย.': 9, 'กย': 9,
  'ตุลาคม': 10, 'ต.ค.': 10, 'ตค': 10,
  'พฤศจิกายน': 11, 'พ.ย.': 11, 'พย': 11,
  'ธันวาคม': 12, 'ธ.ค.': 12, 'ธค': 12,
};

const THAI_DAY_OF_WEEK_MAP: Record<string, number> = {
  'อาทิตย์': 0, 'วันอาทิตย์': 0,
  'จันทร์': 1, 'วันจันทร์': 1,
  'อังคาร': 2, 'วันอังคาร': 2,
  'พุธ': 3, 'วันพุธ': 3,
  'พฤหัสบดี': 4, 'วันพฤหัสบดี': 4, 'พฤหัส': 4, 'วันพฤหัส': 4,
  'ศุกร์': 5, 'วันศุกร์': 5,
  'เสาร์': 6, 'วันเสาร์': 6,
};

export interface ParsedThaiDateResult {
  dateStr: string; // YYYY-MM-DD
  rawText: string;
  isPast: boolean;
  dayOfWeekExpected?: string;
  dayOfWeekActual?: string;
  isMismatchDayOfWeek?: boolean;
}

/**
 * แปลงข้อความวันที่ภาษาไทย เช่น "อังคาร 1 พย พุธ 4 พย 2569", "พรุ่งนี้", "วันนี้", "25 ตค 2569"
 */
export function extractThaiDates(text: string, baseNow = new Date()): ParsedThaiDateResult[] {
  const bkk = getBangkokParts(baseNow);
  const currentYearBE = bkk.year + 543;
  const todayDateStr = `${bkk.year}-${String(bkk.month).padStart(2, '0')}-${String(bkk.day).padStart(2, '0')}`;

  const results: ParsedThaiDateResult[] = [];
  const lower = text.trim();

  // 1. คำสัมพัทธ์ (Relative dates)
  if (lower.includes('วันนี้')) {
    results.push({
      dateStr: todayDateStr,
      rawText: 'วันนี้',
      isPast: false,
    });
  }
  if (lower.includes('พรุ่งนี้')) {
    const tm = new Date(baseNow.getTime() + 24 * 60 * 60 * 1000);
    const tmBkk = getBangkokParts(tm);
    const tmStr = `${tmBkk.year}-${String(tmBkk.month).padStart(2, '0')}-${String(tmBkk.day).padStart(2, '0')}`;
    results.push({
      dateStr: tmStr,
      rawText: 'พรุ่งนี้',
      isPast: false,
    });
  }
  if (lower.includes('มะรืน')) {
    const mr = new Date(baseNow.getTime() + 48 * 60 * 60 * 1000);
    const mrBkk = getBangkokParts(mr);
    const mrStr = `${mrBkk.year}-${String(mrBkk.month).padStart(2, '0')}-${String(mrBkk.day).padStart(2, '0')}`;
    results.push({
      dateStr: mrStr,
      rawText: 'มะรืนนี้',
      isPast: false,
    });
  }

  // 2. ตรวจจับวันที่ระบุชัดเจน เช่น "(วันจันทร์/จันทร์) 25 ต.ค. 2569", "1 พย", "1/11/2569"
  // สร้าง Regex ครอบคลุมเดือนภาษาไทย
  const monthNames = Object.keys(THAI_MONTH_MAP).sort((a, b) => b.length - a.length).join('|');
  const dateRegex = new RegExp(
    `(?:(วัน?(?:จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัส|ศุกร์|เสาร์|อาทิตย์))\\s*(?:ที่)?\\s*)?(\\d{1,2})\\s*(${monthNames})\\s*(?:(?:พ\\.?ศ\\.?\\s*)?(\\d{2,4}))?`,
    'gi'
  );

  let match: RegExpExecArray | null;
  while ((match = dateRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    const dayOfWeekStr = match[1] ? match[1].trim() : undefined;
    const dayNum = parseInt(match[2], 10);
    const monthStr = match[3].trim();
    let yearBE = match[4] ? parseInt(match[4], 10) : currentYearBE;

    // Handle 2-digit BE year (e.g. 69 -> 2569)
    if (yearBE < 100) {
      yearBE += 2500;
    }

    const monthNum = THAI_MONTH_MAP[monthStr];
    if (dayNum >= 1 && dayNum <= 31 && monthNum) {
      const yearCE = yearBE > 2400 ? yearBE - 543 : yearBE;
      const formattedDate = `${yearCE}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

      // Check day of week
      const dObj = new Date(Date.UTC(yearCE, monthNum - 1, dayNum));
      const actualDayOfWeekIndex = dObj.getUTCDay(); // 0 = Sunday, 1 = Monday...
      const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const dayOfWeekActual = dayNames[actualDayOfWeekIndex];

      let isMismatchDayOfWeek = false;
      if (dayOfWeekStr) {
        const cleanDay = dayOfWeekStr.replace(/^วัน/, '');
        const expectedIndex = THAI_DAY_OF_WEEK_MAP[cleanDay];
        if (expectedIndex !== undefined && expectedIndex !== actualDayOfWeekIndex) {
          isMismatchDayOfWeek = true;
        }
      }

      const isPast = formattedDate < todayDateStr;

      if (!results.some((r) => r.dateStr === formattedDate)) {
        results.push({
          dateStr: formattedDate,
          rawText: rawMatch,
          isPast,
          dayOfWeekExpected: dayOfWeekStr,
          dayOfWeekActual,
          isMismatchDayOfWeek,
        });
      }
    }
  }

  // Format เช่น 01/11/2569 หรือ 2026-11-01
  const slashRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
  while ((match = slashRegex.exec(text)) !== null) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    let y = parseInt(match[3], 10);
    if (y > 2400) y -= 543;
    const formattedDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isPast = formattedDate < todayDateStr;
    if (!results.some((r) => r.dateStr === formattedDate)) {
      results.push({
        dateStr: formattedDate,
        rawText: match[0],
        isPast,
      });
    }
  }

  return results;
}

/**
 * ดึงช่วงเวลา เช่น "10.00-10.10", "08:30 ถึง 16:30", "ช่วงบ่าย", "เต็มวัน"
 */
export function extractThaiTimeRange(text: string): { startTime: string; endTime: string; rawText: string } | null {
  const lower = text.toLowerCase();

  // Preset keywords
  if (lower.includes('ช่วงเช้า') || lower.includes('ตอนเช้า') || lower.includes('รอบเช้า')) {
    return { startTime: '08:30', endTime: '12:00', rawText: 'ช่วงเช้า (08:30 - 12:00 น.)' };
  }
  if (lower.includes('ช่วงบ่าย') || lower.includes('ตอนบ่าย') || lower.includes('รอบบ่าย')) {
    return { startTime: '13:00', endTime: '16:30', rawText: 'ช่วงบ่าย (13:00 - 16:30 น.)' };
  }
  if (lower.includes('เต็มวัน') || lower.includes('ทั้งวัน')) {
    return { startTime: '08:30', endTime: '16:30', rawText: 'เต็มวัน (08:30 - 16:30 น.)' };
  }

  // Regex สำหรับเวลา เช่น 10.00-10.10, 08:30 - 16:30, 9:00 ถึง 12:00
  const timeRegex = /(\d{1,2})[.:](\d{2})\s*(?:-|–|ถึง|to)\s*(\d{1,2})[.:](\d{2})/i;
  const match = timeRegex.exec(text);
  if (match) {
    const h1 = String(parseInt(match[1], 10)).padStart(2, '0');
    const m1 = match[2];
    const h2 = String(parseInt(match[3], 10)).padStart(2, '0');
    const m2 = match[4];
    return {
      startTime: `${h1}:${m1}`,
      endTime: `${h2}:${m2}`,
      rawText: match[0],
    };
  }

  return null;
}

/**
 * ดึงจำนวนคน เช่น "10 คน", "15 คน", "คนเดียว"
 */
export function extractAttendeesCount(text: string): number | null {
  if (text.includes('คนเดียว')) return 1;
  const match = /(\d{1,3})\s*(?:คน|ท่าน)/.exec(text);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * ดึงอุณหภูมิแอร์ เช่น "23 องศา", "อุณหภูมิ 22", "24c"
 */
export function extractTemperature(text: string): number | null {
  const match = /(?:อุณหภูมิ\s*)?(\d{2})\s*(?:องศา|°c|c)/i.exec(text);
  if (match) {
    const temp = parseInt(match[1], 10);
    if (temp >= 16 && temp <= 32) return temp;
  }
  return null;
}

/**
 * ตรวจจับรหัสห้องแล็บ หรือเลขห้อง เช่น "401", "404", "LAB-04", "ห้องแลป 1"
 */
export function extractRoomIdentifier(text: string): string | null {
  // รหัส LAB-0X
  const labMatch = /LAB-0?([1-9])/i.exec(text);
  if (labMatch) {
    return `LAB-0${labMatch[1]}`;
  }

  // เลขห้อง 3 หลัก เช่น 401, 402, 403, 404, 405, 406, 410
  const numMatch = /(?:ห้อง\s*)?(\d{3})/i.exec(text);
  if (numMatch) {
    return numMatch[1];
  }

  return null;
}

/**
 * ตรวจจับรหัสวิชา เช่น "222", "01980222"
 */
export function extractCourseIdentifier(text: string): string | null {
  // รหัส 8 หลัก เช่น 01980222
  const fullMatch = /\b(\d{8})\b/.exec(text);
  if (fullMatch) return fullMatch[1];

  // รหัส 3 หลัก เช่น 222, 211, 311
  const shortMatch = /\b(2\d{2}|3\d{2}|4\d{2})\b/.exec(text);
  if (shortMatch) return shortMatch[1];

  return null;
}

/**
 * คำนวณชั่วโมงการใช้งานแอร์
 */
export function calculateUsageHours(openTime: string, closeTime: string): number {
  try {
    const [h1, m1] = openTime.split(':').map(Number);
    const [h2, m2] = closeTime.split(':').map(Number);
    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;
    if (minutes2 <= minutes1) return 0;
    const diff = (minutes2 - minutes1) / 60;
    return Math.round(diff * 10) / 10;
  } catch {
    return 0;
  }
}
