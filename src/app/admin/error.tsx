'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, LayoutDashboard, ShieldAlert } from 'lucide-react';

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    // Log error securely to console for debugging
    console.error('[Admin Console Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-rose-200/80 dark:border-rose-900/60 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-200 dark:border-rose-800 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            ระบบความปลอดภัย & ดักจับข้อผิดพลาด
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ดูแลระบบ
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
            ระบบพบปัญหาชั่วคราวขณะประมวลผลข้อมูลหน้าแอดมิน ท่านสามารถกดลองใหม่อีกครั้ง หรือกลับสู่ภาพรวมหลักเพื่อทำงานต่อได้ทันที
          </p>
          {error?.message && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-left border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-mono text-slate-400 block mb-1">Error Diagnostics:</span>
              <p className="text-xs font-mono text-rose-600 dark:text-rose-400 break-words line-clamp-3">
                {error.message}
              </p>
              {error.digest && (
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  Digest: {error.digest}
                </span>
              )}
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
            <span>กลับสู่ภาพรวมห้องแล็บ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
