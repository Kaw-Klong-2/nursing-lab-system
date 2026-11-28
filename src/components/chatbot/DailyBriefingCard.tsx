'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  AlertTriangle,
  PackageMinus,
  Hourglass,
  Calendar,
  Wrench,
  Wind,
} from 'lucide-react';
import { DailyBriefingData } from '@/types/chatbot';

interface DailyBriefingCardProps {
  briefing: DailyBriefingData;
  onAskPrompt: (prompt: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  compact?: boolean;
}

export default function DailyBriefingCard({
  briefing,
  onAskPrompt,
  onRefresh,
  isRefreshing = false,
  compact = false,
}: DailyBriefingCardProps) {
  const [collapsed, setCollapsed] = useState(compact);

  const items = [
    {
      label: 'รออนุมัติ',
      value: briefing.metrics.pendingApprovals,
      unit: 'คำขอ',
      icon: ClipboardCheck,
      tone: briefing.metrics.pendingApprovals > 0 ? 'amber' : 'slate',
      prompt: 'มีคำขอรออนุมัติไหม',
    },
    {
      label: 'ค้างคืนเกินกำหนด',
      value: briefing.metrics.overdueBorrows,
      unit: 'รายการ',
      icon: AlertTriangle,
      tone: briefing.metrics.overdueBorrows > 0 ? 'rose' : 'slate',
      prompt: 'ใครยังไม่คืนของบ้าง',
    },
    {
      label: 'สต็อกใกล้หมด',
      value: briefing.metrics.lowStock,
      unit: 'รายการ',
      icon: PackageMinus,
      tone: briefing.metrics.lowStock > 0 ? 'amber' : 'slate',
      prompt: 'มีพัสดุอะไรใกล้หมดสต็อกบ้าง',
    },
    {
      label: 'ใกล้หมดอายุ (30 วัน)',
      value: briefing.metrics.expiringSoon,
      unit: 'ล็อต',
      icon: Hourglass,
      tone: briefing.metrics.expiringSoon > 0 ? 'rose' : 'slate',
      prompt: 'มีเวชภัณฑ์ล็อตไหนใกล้หมดอายุใน 30 วันบ้าง',
    },
    {
      label: 'จองห้องวันนี้',
      value: briefing.metrics.todayRoomBookings,
      unit: 'รอบ',
      icon: Calendar,
      tone: 'teal',
      prompt: 'วันนี้มีห้องไหนถูกจองบ้าง',
    },
    {
      label: 'แจ้งซ่อมค้าง',
      value: briefing.metrics.pendingIssues,
      unit: 'เคส',
      icon: Wrench,
      tone: briefing.metrics.pendingIssues > 0 ? 'amber' : 'slate',
      prompt: 'ตอนนี้มีครุภัณฑ์แจ้งซ่อมค้างอะไรบ้าง',
    },
    {
      label: 'เปิดแอร์วันนี้',
      value: briefing.metrics.todayAcHours,
      unit: 'ชม.',
      icon: Wind,
      tone: 'sky',
      prompt: 'เดือนนี้เปิดแอร์ไปแล้วกี่ชั่วโมง',
    },
  ];

  const toneClasses: Record<string, string> = {
    rose: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300',
    amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-700 dark:text-amber-300',
    teal: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/70 text-teal-700 dark:text-teal-300',
    sky: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/70 text-sky-700 dark:text-sky-300',
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
  };

  return (
    <div className="rounded-2xl border border-teal-200/80 dark:border-teal-900/60 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-teal-50/90 via-white to-indigo-50/70 dark:from-slate-800 dark:via-slate-900 dark:to-teal-950/30 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-left cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>สรุปงานประจำวัน (Daily Briefing)</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  briefing.isLabOpenNow
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {briefing.isLabOpenNow ? '🟢 แล็บเปิดอยู่' : '🔴 นอกเวลาทำการ'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{briefing.dateLabel}</div>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="รีเฟรชข้อมูลสรุป"
              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2.5">
          <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'} gap-2`}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onAskPrompt(item.prompt)}
                  className={`p-2 rounded-xl border text-left transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${toneClasses[item.tone]}`}
                  title={`คลิกเพื่อถาม AI: "${item.prompt}"`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-semibold opacity-90 truncate">{item.label}</span>
                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  </div>
                  <div className="mt-1 text-sm font-black leading-none">
                    {item.value}{' '}
                    <span className="text-[10px] font-medium opacity-80">{item.unit}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {briefing.todayBookingsPreview.length > 0 && (
            <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-200/70 dark:border-slate-700/70">
              <span className="font-bold text-slate-800 dark:text-slate-200 mr-1.5">ตารางวันนี้:</span>
              {briefing.todayBookingsPreview.map((b, idx) => (
                <span key={idx}>
                  {idx > 0 ? ' • ' : ''}
                  <strong className="text-teal-700 dark:text-teal-300">{b.roomCode}</strong> ({b.timeRange}) {b.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
