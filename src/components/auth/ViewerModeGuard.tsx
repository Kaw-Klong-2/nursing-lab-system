'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Eye, Lock, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { registerFetchInterceptor } from '@/lib/fetch-interceptor';

const VIEWER_READ_ONLY_MESSAGE =
  'บัญชีผู้เข้าชม (Viewer) มีสิทธิ์ดูข้อมูลอย่างเดียว ไม่สามารถส่งคำร้องหรือบันทึกแก้ไขข้อมูลได้';

const ALLOWED_VIEWER_MUTATION_PATHS = [
  '/api/auth/heartbeat',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/google',
  '/api/auth/portal-handoff',
];

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function resolveRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input !== 'string' && !(input instanceof URL) && input.method) {
    return input.method.toUpperCase();
  }
  return 'GET';
}

export default function ViewerModeGuard() {
  const { isViewer } = useAuth();
  const [blockedAlert, setBlockedAlert] = useState<string | null>(null);
  const isViewerRef = useRef(isViewer);
  isViewerRef.current = isViewer;

  useEffect(() => {
    if (!isViewer || typeof window === 'undefined') {
      setBlockedAlert(null);
      return;
    }

    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    const unregister = registerFetchInterceptor({
      id: 'viewer-mode-guard',
      before: (input, init) => {
        if (!isViewerRef.current) return null;

        const urlStr = resolveRequestUrl(input);
        const method = resolveRequestMethod(input, init);
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

        if (isMutation) {
          let pathname = urlStr;
          try {
            pathname = new URL(urlStr, window.location.origin).pathname;
          } catch {
            // ignore invalid relative URL parsing fallback
          }

          if (pathname.startsWith('/api/')) {
            const isAllowedAuthEndpoint = ALLOWED_VIEWER_MUTATION_PATHS.some(
              (allowed) => pathname === allowed || pathname.startsWith(allowed + '/')
            );

            if (!isAllowedAuthEndpoint) {
              setBlockedAlert(VIEWER_READ_ONLY_MESSAGE);
              if (clearTimer) clearTimeout(clearTimer);
              clearTimer = setTimeout(() => {
                setBlockedAlert(null);
              }, 5000);

              return new Response(
                JSON.stringify({
                  error: VIEWER_READ_ONLY_MESSAGE,
                  code: 'VIEWER_READ_ONLY',
                }),
                {
                  status: 403,
                  statusText: 'Forbidden',
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            }
          }
        }

        return null;
      },
    });

    return () => {
      if (clearTimer) clearTimeout(clearTimer);
      setBlockedAlert(null);
      unregister();
    };
  }, [isViewer]);

  if (!isViewer) return null;

  return (
    <>
      <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/70 px-3 sm:px-6 py-2 text-amber-900 dark:text-amber-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 font-bold text-[11px]">
              <Eye className="w-3.5 h-3.5" />
              โหมดผู้เข้าชม (ดูอย่างเดียว)
            </span>
            <span className="text-amber-800 dark:text-amber-300">
              สามารถเรียกดูรายการ สถานะ ตารางห้อง และรายงานได้ — ระบบปิดการส่งคำร้องและการแก้ไขข้อมูลทุกเมนู
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
            <Lock className="w-3 h-3" /> Read-only Access
          </span>
        </div>
      </div>

      {blockedAlert && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-[90] max-w-sm bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-xl border border-rose-500 flex items-start gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{blockedAlert}</div>
          <button
            type="button"
            onClick={() => setBlockedAlert(null)}
            className="p-0.5 rounded-lg hover:bg-rose-500/50 transition cursor-pointer shrink-0"
            aria-label="ปิดการแจ้งเตือน"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
