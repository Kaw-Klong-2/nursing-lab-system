'use client';

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  DoorOpen,
  User,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Package,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { formatTeacherName, formatUserName } from '@/lib/user-utils';

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
  type?: 'ROOM_BOOKING' | 'PRACTICE_SLOT' | 'BORROW' | 'REQUISITION' | 'OTHER';
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

  const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const dayName = thaiDays[d.getDay()];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${dayName}ที่ ${day} ${month} ${year}`;
}

export default function CalendarHoverCard({
  isOpen,
  anchorRect,
  dateStr,
  items,
  emptyMessage = 'ไม่มีการจองหรือกิจกรรมในวันนี้',
}: CalendarHoverCardProps) {
  if (!isOpen || !anchorRect || typeof window === 'undefined') {
    return null;
  }

  // Calculate smart popover position with auto-flip and edge clamping
  const CARD_WIDTH = 340;
  const ESTIMATED_HEIGHT = Math.min(items.length * 90 + 90, 420);

  const windowW = window.innerWidth;
  const windowH = window.innerHeight;

  // Horizontal calculation: prefer centering over anchor, clamp to viewport edges
  let left = anchorRect.left + anchorRect.width / 2 - CARD_WIDTH / 2;
  if (left + CARD_WIDTH > windowW - 16) {
    left = windowW - CARD_WIDTH - 16;
  }
  if (left < 16) {
    left = 16;
  }

  // Vertical calculation: prefer placing directly below, flip up if near bottom
  let top = anchorRect.bottom + 8;
  const willOverflowBottom = top + ESTIMATED_HEIGHT > windowH - 16;
  const canFitTop = anchorRect.top - ESTIMATED_HEIGHT - 8 > 16;

  if (willOverflowBottom && canFitTop) {
    top = anchorRect.top - ESTIMATED_HEIGHT - 8;
  } else if (willOverflowBottom) {
    // If neither fits completely, clamp to top of viewport
    top = Math.max(16, windowH - ESTIMATED_HEIGHT - 16);
  }

  const content = (
    <div
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${CARD_WIDTH}px`,
        maxHeight: `${ESTIMATED_HEIGHT}px`,
        zIndex: 9999,
      }}
      className="pointer-events-none animate-in fade-in zoom-in-95 duration-150 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 shadow-2xl shadow-slate-950/20 dark:shadow-black/50 overflow-hidden flex flex-col text-slate-800 dark:text-slate-100"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 dark:from-teal-950/60 dark:via-emerald-950/50 dark:to-teal-950/30 px-3.5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="text-xs font-black text-slate-900 dark:text-slate-100">
            {formatThaiDateHeader(dateStr)}
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-300">
          {items.length > 0 ? `${items.length} รายการ` : 'ว่าง'}
        </span>
      </div>

      {/* Item List */}
      <div className="overflow-y-auto p-2.5 space-y-2 max-h-[340px]">
        {items.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
            {emptyMessage}
          </div>
        ) : (
          items.map((item, idx) => {
            const statusUpper = (item.status || '').toUpperCase();
            const isApproved = statusUpper === 'APPROVED';
            const isPending = statusUpper === 'PENDING';
            const isRejected = statusUpper === 'REJECTED';

            return (
              <div
                key={item.id || idx}
                className="bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/90 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 transition"
              >
                {/* Room Pill & Time & Status Badge */}
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {item.roomCode && (
                      <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 dark:bg-teal-900/80 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
                        {item.roomCode}
                      </span>
                    )}
                    {item.startTime && item.endTime && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.startTime} - {item.endTime} น.</span>
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  {isApproved && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      อนุมัติแล้ว
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      รออนุมัติ
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      ไม่อนุมัติ
                    </span>
                  )}
                </div>

                {/* Title */}
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {item.title}
                </div>

                {/* Room Name */}
                {item.roomName && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    <DoorOpen className="w-3 h-3 shrink-0 text-slate-400" />
                    <span className="truncate">{item.roomName}</span>
                  </div>
                )}

                {/* Course (if any) */}
                {(item.courseCode || item.courseName) && (
                  <div className="flex items-center gap-1 text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50/60 dark:bg-teal-950/40 px-2 py-0.5 rounded-md font-medium truncate">
                    <BookOpen className="w-3 h-3 shrink-0 text-teal-600 dark:text-teal-400" />
                    <span className="truncate">
                      {item.courseCode ? `[${item.courseCode}] ` : ''}{item.courseName}
                    </span>
                  </div>
                )}

                {/* Requester & Participants */}
                <div className="pt-0.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  {item.userName ? (
                    <div className="flex items-center gap-1 truncate">
                      <User className="w-3 h-3 shrink-0 text-slate-400" />
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                        {item.userName}
                      </span>
                    </div>
                  ) : <span></span>}

                  {Boolean(item.participants && item.participants > 0) && (
                    <div className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400 shrink-0">
                      <Users className="w-3 h-3" />
                      <span>{item.participants} คน</span>
                    </div>
                  )}
                </div>

                {/* Equipment (if any) */}
                {item.equipmentNeeded && (
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 px-2 py-0.5 rounded flex items-center gap-1 truncate">
                    <Package className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="truncate">อุปกรณ์: {item.equipmentNeeded}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      {items.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-100/60 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-400 text-center font-medium">
          💡 คลิกที่ช่องวันที่เพื่อดูข้อมูลฉบับเต็มด้านล่าง
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
