'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import {
  LayoutDashboard,
  ChevronDown,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import ProfileModal from '@/components/profile/ProfileModal';
import ThemeToggle from '@/components/common/ThemeToggle';
import { formatUserName } from '@/lib/user-utils';
import { getModuleTheme } from '@/lib/module-theme';
import {
  SUB_APPS,
  SubAppConfig,
  SubAppId,
  getSubAppsForUser,
  detectSubAppFromPathname,
} from '@/lib/sub-apps';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const currentTheme = getModuleTheme(pathname);
  const { currentUser, isOfficer, isApprover, isExecutive, isAdmin, isTeacher, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [preferredSubAppId, setPreferredSubAppId] = useState<SubAppId | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('active_sub_app_id');
        if (stored && stored in SUB_APPS) {
          return stored as SubAppId;
        }
      } catch (e) {
        // ignore
      }
    }
    return null;
  });
  const [isSwitcherOpen, setIsSwitcherOpen] = useState<boolean>(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setPendingCount(
            (data.pendingBorrows || 0) +
            (data.pendingRequisitions || 0) +
            (data.pendingPracticeCount || 0) +
            (data.pendingRoomBookings || 0)
          );
        }
      } catch (err) {
        // silent fail
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const userRole = currentUser?.role || 'USER';

  // Get accessible Sub-Apps for current user
  const accessibleApps = getSubAppsForUser(userRole, {
    isTeacher,
    isOfficer,
    isAdmin,
    isApprover,
    isExecutive,
  });

  // Detect current active Sub-App from pathname or preference
  const detectedAppId = detectSubAppFromPathname(pathname, preferredSubAppId);
  const activeAppId = detectedAppId || (preferredSubAppId && accessibleApps.some((a) => a.id === preferredSubAppId) ? preferredSubAppId : null);
  const activeSubApp = activeAppId ? SUB_APPS[activeAppId] : null;

  // Synchronize preferredSubAppId when navigating
  useEffect(() => {
    if (pathname === '/') {
      setPreferredSubAppId(null);
      try {
        sessionStorage.removeItem('active_sub_app_id');
      } catch (e) {}
      return;
    }

    if (detectedAppId && detectedAppId !== preferredSubAppId) {
      if (preferredSubAppId === 'staff-admin-console') {
        const consoleItems = SUB_APPS['staff-admin-console'].items;
        if (
          pathname.startsWith('/admin') ||
          consoleItems.some((it) => pathname === it.href || pathname.startsWith(it.href + '/'))
        ) {
          return;
        }
      }
      setPreferredSubAppId(detectedAppId);
      try {
        sessionStorage.setItem('active_sub_app_id', detectedAppId);
      } catch (e) {}
    }
  }, [detectedAppId, pathname, preferredSubAppId]);

  // Hide sidebar on login page
  if (pathname === '/login') {
    return null;
  }

  const handleSelectSubApp = (app: SubAppConfig, isMobile = false) => {
    setPreferredSubAppId(app.id);
    try {
      sessionStorage.setItem('active_sub_app_id', app.id);
    } catch (e) {}
    setIsSwitcherOpen(false);
    if (isMobile && onMobileClose) onMobileClose();
    router.push(app.primaryHref);
  };

  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="space-y-3">
        {/* Brand & App Suite Identifier */}
        <div className="px-2 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-0.5">
                <span>KUNurse</span>
                <span className="text-teal-600 dark:text-teal-400 font-black text-sm select-none">+</span>
                <span>Lab</span>
              </span>
              <span className="text-[9px] bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 px-1.5 py-0.5 rounded font-mono border border-teal-200 dark:border-slate-700 font-bold">
                {userRole}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              คณะพยาบาลศาสตร์ มก.
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isMobile && onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="ปิดเมนู"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Global Home Hub Button (Always accessible at top) */}
        <Link
          href="/"
          onClick={() => {
            setPreferredSubAppId(null);
            try {
              sessionStorage.removeItem('active_sub_app_id');
            } catch (e) {}
            setIsSwitcherOpen(false);
            if (isMobile && onMobileClose) onMobileClose();
          }}
          className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer border ${
            pathname === '/'
              ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-600/30 border-teal-500'
              : 'bg-slate-50 hover:bg-slate-100/90 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200/80 dark:border-slate-700/60 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>ภาพรวมห้องแล็บ (All Apps Hub)</span>
          </div>
          {pathname === '/' && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </Link>

        {/* Sub-App Switcher Box */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-left transition cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                ระบบงานที่กำลังเปิด:
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 group-hover:underline flex items-center gap-0.5 font-bold">
                <span>สลับระบบ</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0">
                  {activeSubApp ? activeSubApp.emoji : '📱'}
                </span>
                <div className="truncate">
                  <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                    {activeSubApp ? activeSubApp.name : 'เลือกแอปพลิเคชัน'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                    {activeSubApp ? activeSubApp.nameEn : 'Modular Suite'}
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Sub-App Switcher Dropdown Drawer */}
          {isSwitcherOpen && (
            <div className="mt-1.5 p-2 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-1 z-30 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>แอปพลิเคชันทั้งหมด ({accessibleApps.length}):</span>
              </div>

              {accessibleApps.map((app) => {
                const isSelected = activeAppId === app.id;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleSelectSubApp(app, isMobile)}
                    className={`w-full p-2 rounded-xl text-left transition flex items-center justify-between gap-2 text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white font-bold shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{app.emoji}</span>
                      <div className="truncate">
                        <span className="block truncate font-bold text-[11px]">{app.name}</span>
                        <span className={`block truncate text-[9px] ${isSelected ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          {app.shortName}
                        </span>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="text-[10px] font-bold shrink-0">✓</span>
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Section: Contextual Sub-App Menus */}
        <div className="pt-1">
          {activeSubApp ? (
            <div className="space-y-1">
              {/* Active Sub-App Section Header */}
              <div className="px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  <span>เมนู: {activeSubApp.shortName}</span>
                </span>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 px-1.5 py-0.2 rounded">
                  {activeSubApp.items.length}
                </span>
              </div>

              {/* Sub-App Menu List */}
              <div className="space-y-1">
                {activeSubApp.items
                  .filter((item) => {
                    if (item.href === '/executive') return isExecutive || isAdmin || item.roles.includes(userRole);
                    if (item.href === '/approvals') return isApprover || isAdmin || isTeacher || isOfficer || item.roles.includes(userRole);
                    if (item.href === '/audit-logs') return isAdmin || isOfficer;
                    if (item.href === '/users' || item.href === '/settings/notifications') return isAdmin;
                    return item.roles.includes(userRole);
                  })
                  .map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(item.href)) || (item.href === '/admin' && pathname === '/admin');
                    const isApprovals = item.href === '/approvals';

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (isMobile && onMobileClose) onMobileClose();
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                          isActive
                            ? `${currentTheme.sidebarActiveBg} ${currentTheme.sidebarActiveText} ${currentTheme.sidebarActiveShadow} font-bold`
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon
                            className={`w-4 h-4 shrink-0 transition ${
                              isActive
                                ? 'text-white'
                                : `text-slate-500 dark:text-slate-400 ${currentTheme.sidebarIconHover}`
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {/* Badges */}
                        {isApprovals && pendingCount > 0 && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-sm">
                            {pendingCount}
                          </span>
                        )}
                        {item.isImportant && !isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400"></span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* If at Overview and no sub-app active, show Quick Apps Launcher inside sidebar */
            <div className="space-y-1.5">
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span>เลือกแอปพลิเคชัน:</span>
              </div>
              <div className="space-y-1">
                {accessibleApps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleSelectSubApp(app, isMobile)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-850/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition flex items-center justify-between text-left cursor-pointer group border border-slate-200/80 dark:border-transparent"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base shrink-0">{app.emoji}</span>
                      <span className="truncate group-hover:text-teal-600 dark:group-hover:text-teal-300 transition">{app.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Area: User Profile & Logout */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-left group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-600/30 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-xs border border-teal-200 dark:border-teal-500/30 shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                {formatUserName(currentUser) || 'ผู้ใช้งาน'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                {currentUser?.email || currentUser?.studentId || 'บัญชีผู้ใช้'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
          </div>
        </button>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200 border border-rose-200 dark:border-rose-500/20 text-xs font-bold transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      {/* Fallback Profile Modal */}
      {isProfileOpen && (
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 h-full hidden md:flex flex-col justify-between p-4 border-r border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-y-auto transition-colors duration-200">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-over Drawer (visible when mobileOpen is true) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fadeIn">
          {/* Backdrop overlay */}
          <div
            onClick={onMobileClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Slide-in Panel */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 h-full flex flex-col justify-between p-4 border-r border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-y-auto transition-colors duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
