'use client';

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface StudentCourseNoticeProps {
  isStudent: boolean;
  coursesCount: number;
  loading?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * ข้อความแจ้งเตือนนิสิตกรณีที่ยังไม่มีรายวิชาที่ลงทะเบียนเรียนในระบบ
 */
export default function StudentCourseNotice({
  isStudent,
  coursesCount,
  loading = false,
  required = false,
  className = '',
}: StudentCourseNoticeProps) {
  if (!isStudent || loading || coursesCount > 0) return null;

  if (required) {
    return (
      <div
        className={`mt-2 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200 ${className}`}
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="leading-relaxed">
          <span className="font-bold">ยังไม่มีรายวิชาที่ท่านลงทะเบียน</span> — ระบบแสดงเฉพาะรายวิชาที่มีรายชื่อของท่านเป็นผู้เรียน กรุณาติดต่ออาจารย์ประจำวิชาหรือเจ้าหน้าที่ห้องปฏิบัติการเพื่อเพิ่มรายชื่อของท่านก่อนส่งคำร้อง
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-2 flex items-start gap-2 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/80 dark:bg-sky-950/30 px-3 py-2 text-xs text-sky-800 dark:text-sky-200 ${className}`}
    >
      <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
      <div className="leading-relaxed">
        ยังไม่พบรายวิชาที่ท่านลงทะเบียนในระบบ ท่านสามารถเลือก <strong>&quot;ไม่ระบุรายวิชา&quot;</strong> สำหรับการฝึกอิสระได้ หรือติดต่ออาจารย์ประจำวิชา/เจ้าหน้าที่ห้องปฏิบัติการเพื่อเพิ่มรายชื่อเข้าวิชา
      </div>
    </div>
  );
}
