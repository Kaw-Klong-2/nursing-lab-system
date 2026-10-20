/**
 * เครื่องมือจัดการวัน เวลา และ Timezone ประจำระบบ KUNurse+Lab
 * รับประกันความถูกต้องของเวลาในประเทศไทย (Asia/Bangkok, UTC+7)
 * ทั้งบนเครื่อง Development (Windows) และ Production Cloud (Vercel / Linux ซึ่งรันบน UTC)
 */

export const BANGKOK_TZ_OFFSET_HOURS = 7;
export const BANGKOK_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * แยกองค์ประกอบของวันและเวลาตามเวลาประเทศไทย (Bangkok Parts)
 */
export function getBangkokParts(date: Date = new Date()) {
  const bkkDate = new Date(date.getTime() + BANGKOK_TZ_OFFSET_MS);
  const year = bkkDate.getUTCFullYear();
  const month = bkkDate.getUTCMonth(); // 0-11
  const day = bkkDate.getUTCDate();
  const hours = bkkDate.getUTCHours();
  const minutes = bkkDate.getUTCMinutes();
  const seconds = bkkDate.getUTCSeconds();
  const dayOfWeek = bkkDate.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, hours, minutes, seconds, dayOfWeek, dateString };
}

/**
 * คำนวณหาจุดเริ่มต้นของวัน (00:00:00.000 น. เวลาประเทศไทย) ในรูปแบบ UTC Date
 * ตัวอย่าง: วันที่ 2026-10-20 เวลา 00:00 น. ประเทศไทย = 2026-10-19T17:00:00.000Z
 */
export function getBangkokStartOfDay(date: Date = new Date()): Date {
  const { year, month, day } = getBangkokParts(date);
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - BANGKOK_TZ_OFFSET_MS);
}

/**
 * คำนวณหาจุดสิ้นสุดของวัน (23:59:59.999 น. เวลาประเทศไทย) ในรูปแบบ UTC Date
 * ตัวอย่าง: วันที่ 2026-10-20 เวลา 23:59:59.999 น. ประเทศไทย = 2026-10-20T16:59:59.999Z
 */
export function getBangkokEndOfDay(date: Date = new Date()): Date {
  const { year, month, day } = getBangkokParts(date);
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - BANGKOK_TZ_OFFSET_MS);
}

/**
 * แปลงข้อความวัน-เวลาจากอินพุตหน้าเว็บ (เช่น <input type="datetime-local" /> เช่น "2026-10-20T16:30")
 * ให้เป็น UTC Date ที่ถูกต้องตามเวลาประเทศไทย (+07:00) เสมอ ไม่ว่าเซิร์ฟเวอร์จะรันใน Timezone ใด
 */
export function parseBangkokDateTime(input: string | Date | null | undefined): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const str = String(input).trim();
  if (!str) return new Date();

  // หากมี Timezone กำกับอยู่แล้ว (เช่นลงท้ายด้วย Z หรือ +07:00) ให้ใช้ตามนั้น
  if (str.includes('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }

  // หากเป็นรูปแบบ datetime-local: "YYYY-MM-DDTHH:mm" หรือ "YYYY-MM-DDTHH:mm:ss"
  if (str.includes('T')) {
    const parts = str.split('T');
    const [y, m, d] = parts[0].split('-').map(Number);
    const [hh, mm, ss] = parts[1].split(':').map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0, 0) - BANGKOK_TZ_OFFSET_MS);
  }

  // หากเป็นรูปแบบวันที่อย่างเดียว: "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - BANGKOK_TZ_OFFSET_MS);
  }

  return new Date(str);
}

/**
 * รวมวันที่ของรอบฝึก (slot.date) และเวลา ("09:00" หรือ "13:30") เข้าเป็น UTC Date
 * ตามเวลาประเทศไทย เพื่อนำไปเปรียบเทียบกับ new Date() ในการเช็คอินหรือจองล่วงหน้าได้อย่างถูกต้อง
 * ตัวอย่าง: slot.date = "2026-10-20", time = "09:00" -> UTC "2026-10-20T02:00:00.000Z"
 */
export function combineSlotDateAndBangkokTime(slotDateInput: Date | string, timeStr: string): Date {
  const dateStr = typeof slotDateInput === 'string'
    ? slotDateInput.slice(0, 10)
    : slotDateInput.toISOString().slice(0, 10);
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hours || 0, minutes || 0, 0, 0) - BANGKOK_TZ_OFFSET_MS);
}

/**
 * ฟอร์แมตวัน-เวลาเป็นภาษาไทยมาตรฐาน (พ.ศ.) ในเขตเวลา Asia/Bangkok เสมอ
 */
export function formatBangkokDateTime(
  dateInput: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  });
}
