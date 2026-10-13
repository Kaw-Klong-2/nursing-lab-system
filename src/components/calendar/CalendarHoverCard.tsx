'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';

export interface CalendarHoverItem {
  id: string;
  code?: string; // e.g. "ROOM-25691012-001"
  roomCode?: string; // e.g. "LAB-01-1"
  roomName?: string; // e.g. "ห้องปฏิบัติการทางการพยาบาลพื้นฐาน 1/3"
  title: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  userName?: string;
  userRole?: string;
  courseCode?: string;
  courseName?: string;
  advisorName?: string;
  participants?: number;
  equipmentNeeded?: string;
  type?: 'ROOM_BOOKING' | 'PRACTICE_SLOT' | 'BORROW' | 'REQUISITION' | 'INSPECTION_PLAN' | 'MAINTENANCE_PM' | 'OTHER';
}

export interface CalendarHoverCardProps {
  isOpen: boolean;
  anchorRect: DOMRect | null;
  dateStr: string;
  items: CalendarHoverItem[];
  emptyMessage?: string;
}

function formatThaiDateHeader(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const thaiDaysShort = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const dayName = thaiDaysShort[d.getDay()];
  const day = d.getDate();
  const month = thaiMonthsShort[d.getMonth()];
  const year = (d.getFullYear() + 543) % 100; // 69
  return `${dayName} ${day} ${month} ${year}`;
}

export default function CalendarHoverCard({
  isOpen,
  anchorRect,
  dateStr,
  items,
  emptyMessage = 'ไม่มีรายการจอง',
}: CalendarHoverCardProps) {
  if (!isOpen || !anchorRect || typeof window === 'undefined') {
    return null;
  }

  // Ultra-compact dimensions: no scrolling needed
  const CARD_WIDTH = 280;
  const visibleItems = items.slice(0, 3);
  const remainingCount = items.length - visibleItems.length;

  // Approximate height: Header (32px) + Each item (~48px) + Spacing
  const estimatedHeight = 36 + visibleItems.length * 52 + (remainingCount > 0 ? 20 : 0);

  const windowW = window.innerWidth;
  const windowH = window.innerHeight;

  // Horizontal calculation: center over anchor, clamp to viewport edges
  let left = anchorRect.left + anchorRect.width / 2 - CARD_WIDTH / 2;
  if (left + CARD_WIDTH > windowW - 12) {
    left = windowW - CARD_WIDTH - 12;
  }
  if (left < 12) {
    left = 12;
  }

  // Vertical calculation: prefer placing directly below, flip above if near bottom
  let top = anchorRect.bottom + 6;
  const willOverflowBottom = top + estimatedHeight > windowH - 12;
  const canFitTop = anchorRect.top - estimatedHeight - 6 > 12;

  if (willOverflowBottom && canFitTop) {
    top = anchorRect.top - estimatedHeight - 6;
  } else if (willOverflowBottom) {
    top = Math.max(12, windowH - estimatedHeight - 12);
  }

  const content = (
    <div
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${CARD_WIDTH}px`,
        zIndex: 9999,
      }}
      className="pointer-events-none animate-in fade-in zoom-in-95 duration-100 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-950/15 dark:shadow-black/40 p-2 space-y-1.5 text-slate-800 dark:text-slate-100"
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>{formatThaiDateHeader(dateStr)}</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50">
          {items.length > 0 ? `${items.length} รายการ` : 'ว่าง'}
        </span>
      </div>

      {/* Compact Items List (All visible, no scrollbar) */}
      {items.length === 0 ? (
        <div className="py-1.5 text-center text-[11px] text-slate-400 font-medium">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-1">
          {visibleItems.map((item, idx) => {
            const statusUpper = (item.status || '').toUpperCase();
            const isApproved = statusUpper === 'APPROVED';
            const isPending = statusUpper === 'PENDING';
            const isRejected = statusUpper === 'REJECTED';
            const isInProgress = statusUpper === 'IN_PROGRESS';
            const isScheduled = statusUpper === 'SCHEDULED';
            const isCompleted = statusUpper === 'COMPLETED';
            const isOverdue = statusUpper === 'OVERDUE';

            return (
              <div
                key={item.id || idx}
                className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-700/50 space-y-0.5"
              >
                {/* Row 1: Room Pill + Time + Status */}
                <div className="flex items-center justify-between text-[10px] leading-tight">
                  <div className="flex items-center gap-1 font-mono font-bold text-teal-800 dark:text-teal-300 truncate">
                    {item.roomCode && (
                      <span className="bg-teal-100 dark:bg-teal-900/80 px-1 py-0.2 rounded text-[9px] font-black border border-teal-200/60 dark:border-teal-800/60">
                        {item.roomCode}
                      </span>
                    )}
                    {item.startTime && item.endTime && (
                      <span className="text-slate-600 dark:text-slate-300">
                        {item.startTime}-{item.endTime}
                      </span>
                    )}
                  </div>

                  {isApproved && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      อนุมัติ
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      รออนุมัติ
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 dark:text-rose-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      ไม่อนุมัติ
                    </span>
                  )}
                  {isInProgress && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      กำลังตรวจ
                    </span>
                  )}
                  {isScheduled && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 dark:text-blue-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      นัดหมาย
                    </span>
                  )}
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      เสร็จสิ้น
                    </span>
                  )}
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 dark:text-rose-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      เกินกำหนด
                    </span>
                  )}
                </div>

                {/* Row 2: Title */}
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate leading-snug" title={item.title}>
                  {item.title}
                </div>

                {/* Row 3: Subtext (User / Course / Attendees) */}
                <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                  <span className="truncate max-w-[190px]">
                    {item.userName ? item.userName : (item.courseCode ? `[${item.courseCode}] ${item.courseName || ''}` : item.roomName || '')}
                  </span>
                  {Boolean(item.participants && item.participants > 0) && (
                    <span className="font-semibold text-slate-600 dark:text-slate-300 shrink-0 ml-1">
                      {item.participants} คน
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {remainingCount > 0 && (
            <div className="text-[9px] font-bold text-teal-600 dark:text-teal-400 text-center pt-0.5">
              + อีก {remainingCount} รายการ (คลิกเพื่อดูทั้งหมด)
            </div>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
