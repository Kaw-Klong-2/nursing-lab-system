'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import SubAppBreadcrumbBar from './SubAppBreadcrumbBar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import QrScannerModal from '@/components/qrcode/QrScannerModal';
import SessionActivityWatcher from '@/components/auth/SessionActivityWatcher';
import PushNotificationManager from '@/components/notifications/PushNotificationManager';
import {
  LayoutDashboard,
  Boxes,
  QrCode,
  Building2,
  Menu,
} from 'lucide-react';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const isLoginPage = pathname === '/login';
  const isPublicAssetPage = pathname?.startsWith('/asset/');
  const isPublicConsumablePage = pathname?.startsWith('/consumable/');
  const isPublicStoragePage = pathname?.startsWith('/storage/');
  const isResetPasswordPage = pathname?.startsWith('/reset-password');
  const isPublicRoute = isLoginPage || isPublicAssetPage || isPublicConsumablePage || isPublicStoragePage || isResetPasswordPage;

  React.useEffect(() => {
    // If arriving with portal_token or email handoff, ensure auth initialization has completely resolved
    const hasPendingHandoff =
      typeof window !== 'undefined' &&
      (window.location.search.includes('portal_token') ||
        window.location.search.includes('email=') ||
        window.location.search.includes('login_hint='));

    if (!isLoading && !currentUser && !isPublicRoute && !hasPendingHandoff) {
      let targetPath = pathname;
      if (typeof window !== 'undefined' && window.location.search) {
        targetPath += window.location.search;
      }
      const redirectQuery = targetPath && targetPath !== '/' ? `?redirect=${encodeURIComponent(targetPath)}` : '';
      router.replace(`/login${redirectQuery}`);
    }
  }, [isLoading, currentUser, isPublicRoute, pathname, router]);

  if (isPublicRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <LoadingSpinner
          size="lg"
          message="กำลังเชื่อมต่อระบบห้องปฏิบัติการพยาบาล..."
          submessage="กำลังตรวจสอบสิทธิ์การเข้าใช้งาน"
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <LoadingSpinner
          size="lg"
          message="กำลังนำทางไปยังหน้าเข้าสู่ระบบ..."
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans overflow-hidden transition-colors duration-200">
      <Navbar
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          mobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <SubAppBreadcrumbBar />
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb-friendly for Smartphones & Small Tablets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Link
          href="/"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
            pathname === '/' ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">ภาพรวม</span>
        </Link>

        <Link
          href="/borrow"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
            pathname?.startsWith('/borrow') ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Boxes className="w-5 h-5" />
          <span className="text-[10px]">ยืม-คืน</span>
        </Link>

        {/* Floating Center QR Scan Button */}
        <button
          type="button"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsScannerOpen(true);
          }}
          className="flex flex-col items-center -mt-5 bg-gradient-to-tr from-teal-600 to-indigo-600 text-white p-3 rounded-full shadow-lg shadow-teal-600/30 border-2 border-white dark:border-slate-800 transition active:scale-95 cursor-pointer"
          title="สแกน QR Code"
        >
          <QrCode className="w-5 h-5" />
        </button>

        <Link
          href="/rooms"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
            pathname?.startsWith('/rooms') ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[10px]">จองห้อง</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition cursor-pointer ${
            isMobileMenuOpen ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">แอปย่อย</span>
        </button>
      </nav>

      {/* Global QR Scanner Modal */}
      {isScannerOpen && (
        <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      )}

      {/* Global Session Activity & Idle Timeout Watcher */}
      <SessionActivityWatcher />

      {/* Web Push Notification One-time Setup Banner */}
      <PushNotificationManager />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </AuthProvider>
    </ThemeProvider>
  );
}
