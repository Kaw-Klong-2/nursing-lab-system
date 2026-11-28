'use client';

import React from 'react';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { PendingAdminAction } from '@/types/chatbot';

interface PendingActionCardProps {
  action: PendingAdminAction;
  isInteractive: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PendingActionCard({
  action,
  isInteractive,
  isSubmitting,
  onConfirm,
  onCancel,
}: PendingActionCardProps) {
  const severityStyles: Record<'LOW' | 'MEDIUM' | 'HIGH', { border: string; badge: string; label: string }> = {
    LOW: {
      border: 'border-teal-300 dark:border-teal-800 bg-gradient-to-br from-teal-50/90 to-white dark:from-teal-950/40 dark:to-slate-900',
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/70 dark:text-teal-200',
      label: 'ความเสี่ยงต่ำ',
    },
    MEDIUM: {
      border: 'border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50/90 to-white dark:from-amber-950/30 dark:to-slate-900',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-200',
      label: 'ผลกระทบปานกลาง',
    },
    HIGH: {
      border: 'border-rose-300 dark:border-rose-800 bg-gradient-to-br from-rose-50/90 to-white dark:from-rose-950/30 dark:to-slate-900',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-200',
      label: 'กระทบหลายรายการ / สำคัญ',
    },
  };

  const style = severityStyles[action.severity] || severityStyles.MEDIUM;

  return (
    <div className={`mt-2.5 w-full rounded-2xl border p-3.5 shadow-sm space-y-2.5 ${style.border}`}>
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-slate-700/70">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white">{action.title}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{action.summary}</div>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
          {style.label} • {action.impactCount}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        {action.details.map((d, idx) => (
          <div key={idx} className="flex justify-between items-start gap-3">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">{d.label}:</span>
            <span
              className={`text-right break-words ${
                d.highlight
                  ? 'font-bold text-teal-700 dark:text-teal-300'
                  : 'font-medium text-slate-800 dark:text-slate-200'
              }`}
            >
              {d.value}
            </span>
          </div>
        ))}
      </div>

      {action.warnings && action.warnings.length > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 px-3 py-2 space-y-1">
          {action.warnings.map((w, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {isInteractive && (
        <div className="pt-1 flex items-center gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันดำเนินการจริง'}</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>ยกเลิก</span>
          </button>
        </div>
      )}
    </div>
  );
}
