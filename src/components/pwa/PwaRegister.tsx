'use client';

import React, { useEffect, useState } from 'react';
import PwaInstallPrompt from './PwaInstallPrompt';
import { APP_VERSION } from '@/lib/version';

export default function PwaRegister() {
  const [newServerVersion, setNewServerVersion] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.log('PWA Service Worker registration skipped or failed:', err);
          });
      });
    }
  }, []);

  // ตรวจสอบเวอร์ชันใหม่จากเซิร์ฟเวอร์เมื่อสลับแท็บกลับมา (จำกัดไม่เกิน 1 ครั้งต่อ 10 นาที เพื่อประหยัด Traffic)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastCheckedAt = Date.now();
    const MIN_CHECK_INTERVAL_MS = 10 * 60 * 1000;

    const checkServerVersion = async () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastCheckedAt < MIN_CHECK_INTERVAL_MS) return;
      lastCheckedAt = now;

      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.version && data.version !== APP_VERSION) {
          setNewServerVersion(data.version);
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker
              .getRegistration()
              .then((reg) => reg?.update())
              .catch(() => {});
          }
        }
      } catch {
        // ข้ามกรณีออฟไลน์หรือเชื่อมต่อไม่ได้
      }
    };

    document.addEventListener('visibilitychange', checkServerVersion);
    return () => {
      document.removeEventListener('visibilitychange', checkServerVersion);
    };
  }, []);

  return (
    <>
      {newServerVersion && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 dark:bg-teal-950/95 text-white border border-teal-500/40 shadow-xl flex items-center gap-3 text-xs backdrop-blur-md">
          <span>ระบบอัปเดตเป็นเวอร์ชันใหม่ (v{newServerVersion}) แล้ว</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black transition cursor-pointer"
          >
            รีเฟรชหน้าเว็บ
          </button>
        </div>
      )}
      <PwaInstallPrompt />
    </>
  );
}
