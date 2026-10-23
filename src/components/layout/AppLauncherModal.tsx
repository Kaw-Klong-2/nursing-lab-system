'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, ChevronRight, LayoutDashboard, Sparkles } from 'lucide-react';
import { SUB_APPS, SubAppConfig, SubAppId, getSubAppsForUser } from '@/lib/sub-apps';
import { useAuth } from '@/lib/auth-context';

interface AppLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubAppId?: SubAppId | null;
  onSelectSubApp?: (appId: SubAppId) => void;
  pendingApprovalsCount?: number;
}

export default function AppLauncherModal({
  isOpen,
  onClose,
  activeSubAppId,
  onSelectSubApp,
  pendingApprovalsCount = 0,
}: AppLauncherModalProps) {
  const router = useRouter();
  const { currentUser, isTeacher, isOfficer, isAdmin, isApprover, isExecutive } = useAuth();

  if (!isOpen) return null;

  const accessibleApps = getSubAppsForUser(currentUser?.role, {
    isTeacher,
    isOfficer,
    isAdmin,
    isApprover,
    isExecutive,
  });

  const handleAppClick = (app: SubAppConfig) => {
    if (onSelectSubApp) {
      onSelectSubApp(app.id);
    }
    onClose();
    router.push(app.primaryHref);
  };

  const handleHomeClick = () => {
    onClose();
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl font-bold border border-teal-500/20 shadow-xs">
              㗊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  ศูนย์รวมแอปพลิเคชัน (KUNurse Lab Apps)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  {accessibleApps.length} แอป
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เลือกระบบงานที่ต้องการเพื่อเข้าถึงเมนูและฟังก์ชันเฉพาะด้าน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Home Hub Shortcut Banner */}
        <div className="px-5 sm:px-6 pt-4">
          <button
            type="button"
            onClick={handleHomeClick}
            className="w-full p-3 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center text-sm shadow-xs">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-900 dark:text-white block group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                  ภาพรวมห้องแล็บ (All Apps Hub / Master Overview)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  กลับสู่หน้าหลัก ปฏิทินรวม และภาพรวมทั้งหมดของระบบ
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Sub-Apps Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {accessibleApps.map((app) => {
              const isActive = activeSubAppId === app.id;
              const isStaffConsole = app.id === 'staff-admin-console';

              return (
                <div
                  key={app.id}
                  onClick={() => handleAppClick(app)}
                  className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left group ${
                    isActive
                      ? 'bg-slate-50 dark:bg-slate-800/80 border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                      : isStaffConsole
                      ? 'bg-gradient-to-br from-cyan-50/70 via-white to-blue-50/60 dark:from-slate-850 dark:via-slate-800 dark:to-cyan-950/40 border-cyan-300 dark:border-cyan-800 hover:border-cyan-400 hover:shadow-md'
                      : 'bg-white dark:bg-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md'
                  }`}
                >
                  {/* Top Row: Icon, Emojis, and Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-xs bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600/60">
                        {app.emoji}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isActive && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500 text-white shadow-xs">
                            กำลังใช้งาน
                          </span>
                        )}
                        {app.id === 'approvals-hub' && pendingApprovalsCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                            รออนุมัติ {pendingApprovalsCount}
                          </span>
                        )}
                        {isStaffConsole && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                            รวม 9 งาน
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition flex items-center gap-1.5">
                        <span>{app.name}</span>
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400 dark:text-slate-400">
                        {app.nameEn}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 pt-1">
                        {app.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {app.items.length} เมนูย่อย
                    </span>
                    <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform">
                      <span>เข้าสู่ระบบ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</span>
          <span className="font-mono text-[10px]">KUNurse Lab Suite v2.5</span>
        </div>
      </div>
    </div>
  );
}
