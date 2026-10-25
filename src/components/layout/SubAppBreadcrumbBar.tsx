'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ChevronRight,
  ArrowLeftRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  SUB_APPS,
  SubAppConfig,
  SubAppId,
  getSubAppsForUser,
  detectSubAppFromPathname,
} from '@/lib/sub-apps';
import AppLauncherModal from '@/components/layout/AppLauncherModal';

export default function SubAppBreadcrumbBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isTeacher, isOfficer, isAdmin, isApprover, isExecutive } = useAuth();
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);

  // If on login or public verify/asset/storage pages, don't show breadcrumb bar
  const isLoginPage = pathname === '/login';
  const isPublicPage =
    pathname?.startsWith('/asset/') ||
    pathname?.startsWith('/consumable/') ||
    pathname?.startsWith('/storage/public') ||
    pathname?.startsWith('/verify');

  if (isLoginPage || isPublicPage || !currentUser) {
    return null;
  }

  // Get accessible sub-apps for current user role
  const accessibleApps = getSubAppsForUser(currentUser.role, {
    isTeacher,
    isOfficer,
    isAdmin,
    isApprover,
    isExecutive,
  });

  // Detect current sub-app
  const detectedAppId = detectSubAppFromPathname(pathname);
  const activeSubApp = detectedAppId ? accessibleApps.find((a) => a.id === detectedAppId) || SUB_APPS[detectedAppId] : null;

  // Find active item within current sub-app
  const activeItem = activeSubApp?.items.find(
    (item) => pathname === item.href || (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(item.href)) || (item.href === '/admin' && pathname === '/admin')
  );

  // Dynamic route fallback labels
  const getPageTitle = () => {
    if (activeItem) return activeItem.label;
    if (pathname === '/') return 'ภาพรวมห้องปฏิบัติการพยาบาล (All Apps Hub)';
    if (pathname.startsWith('/asset/')) return 'รายละเอียดข้อมูลครุภัณฑ์';
    if (pathname.startsWith('/consumable/')) return 'รายละเอียดเวชภัณฑ์สิ้นเปลือง';
    if (pathname.startsWith('/storage/')) return 'แผนผังสถานที่จัดเก็บ & ตู้พัสดุ';
    if (pathname.startsWith('/users/')) return 'จัดการบัญชีผู้ใช้งาน';
    if (pathname.startsWith('/settings/')) return 'ตั้งค่าระบบ';
    return 'หน้าทำงาน';
  };

  const isHome = pathname === '/';

  return (
    <>
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/80 px-3 sm:px-4 md:px-6 py-2 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Left Side: Breadcrumb Path */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0 flex-wrap">
            {/* 1. Home Hub Link */}
            <Link
              href="/"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white shrink-0 ${
                isHome ? 'font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60' : ''
              }`}
              title="กลับสู่หน้าภาพรวมหลัก (Home Hub)"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">หน้าหลัก</span>
            </Link>

            {/* 2. Sub-App Identity (If inside a Sub-App) */}
            {activeSubApp && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                <button
                  type="button"
                  onClick={() => setIsLauncherOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition cursor-pointer shrink-0"
                  title="คลิกเพื่อสลับแอปพลิเคชัน"
                >
                  <span className="text-sm shrink-0">{activeSubApp.emoji}</span>
                  <span className="truncate max-w-[130px] sm:max-w-none">{activeSubApp.shortName}</span>
                </button>
              </>
            )}

            {/* 3. Current Page / Action Label */}
            {!isHome && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-[260px] md:max-w-none">
                  {getPageTitle()}
                </span>
              </>
            )}
          </nav>

          {/* Right Side: Quick Sub-App Switcher Pill & Sibling Tabs */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            {/* Quick Sibling Page Pills for Current Sub-App (Horizontal Quick Nav) */}
            {activeSubApp && activeSubApp.items.length > 1 && (
              <div className="hidden lg:flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-slate-800">
                {activeSubApp.items.slice(0, 4).map((it) => {
                  const isCurrent = pathname === it.href;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition ${
                        isCurrent
                          ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Quick Switch Sub-App Button */}
            <button
              type="button"
              onClick={() => setIsLauncherOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
              title="เปิดศูนย์รวมแอปพลิเคชันเพื่อสลับระบบงาน"
            >
              <ArrowLeftRight className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>สลับระบบ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Sub-Apps Launcher Modal */}
      <AppLauncherModal
        isOpen={isLauncherOpen}
        onClose={() => setIsLauncherOpen(false)}
        activeSubAppId={activeSubApp?.id || null}
      />
    </>
  );
}
