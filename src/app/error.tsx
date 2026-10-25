'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[Application Global Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center border border-teal-200 dark:border-teal-800 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            ระบบบริหารจัดการห้องปฏิบัติการพยาบาล
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            เกิดข้อขัดข้องชั่วคราวในการแสดงผล
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ระบบป้องกันข้อผิดพลาดอัตโนมัติทำงานแล้ว ข้อมูลของท่านยังปลอดภัย สามารถกดโหลดใหม่อีกครั้งเพื่อกลับมาใช้งานตามปกติ
          </p>
          {error?.message && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-left border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-mono text-slate-400 block mb-1">รายละเอียดข้อขัดข้อง:</span>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-words line-clamp-3">
                {error.message}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>ลองใหม่อีกครั้ง</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>กลับสู่ภาพรวมหลัก</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
