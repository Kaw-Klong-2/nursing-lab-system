'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth, UserRole } from '@/lib/auth-context';
import { 
  Activity, 
  ShieldCheck, 
  UserCheck, 
  Stethoscope, 
  GraduationCap, 
  Building2,
  LogOut,
  LogIn,
  UserCog,
  Camera,
  QrCode,
  Menu,
  X,
  Store,
  Briefcase,
} from 'lucide-react';
import ProfileModal from '@/components/profile/ProfileModal';
import QrScannerModal from '@/components/qrcode/QrScannerModal';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeToggle from '@/components/common/ThemeToggle';
import AppLauncherModal from '@/components/layout/AppLauncherModal';
import { formatUserName } from '@/lib/user-utils';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export default function Navbar({ onToggleMobileMenu, isMobileMenuOpen }: NavbarProps = {}) {
  const { currentUser, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" /> แอดมิน
          </span>
        );
      case 'OFFICER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> เจ้าหน้าที่แล็บ
          </span>
        );
      case 'APPROVER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <UserCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" /> ผู้อนุมัติ
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <GraduationCap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> อาจารย์ผู้สอน
          </span>
        );
      case 'EXECUTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Briefcase className="w-3 h-3 text-blue-600 dark:text-blue-400" /> ผู้บริหาร
          </span>
        );
      case 'USER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <GraduationCap className="w-3 h-3 text-blue-600 dark:text-blue-400" /> นิสิต
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Menu Button */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />}
          </button>
        )}

        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white shadow-md shadow-teal-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight leading-tight flex items-center gap-0.5">
              <span className="text-slate-900 dark:text-white">KUNurse</span>
              <span className="text-teal-500 dark:text-teal-400 font-black text-base sm:text-lg select-none">+</span>
              <span className="text-slate-900 dark:text-white">Lab</span>
              <span className="hidden xl:inline text-xs font-medium text-slate-400 dark:text-slate-500 ml-1.5 border-l border-slate-300 dark:border-slate-700 pl-2">
                ระบบบริหารจัดการห้องปฏิบัติการพยาบาล
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</span>
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Cloud Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Supabase Cloud</span>
        </div>

        {/* Quick Lab Store POS Button */}
        <Link
          href="/pos"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-xs font-black shadow-sm transition cursor-pointer"
          title="จุดเบิกจ่ายด่วน Lab Store POS (สแกนบาร์โค้ดยืม-เบิกทันใจ)"
        >
          <Store className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden sm:inline">Lab Store (POS)</span>
        </Link>

        {/* 9-Dots Sub-Apps Launcher Button */}
        <button
          type="button"
          onClick={() => setIsAppLauncherOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer flex-shrink-0"
          title="ศูนย์รวมแอปพลิเคชันย่อย (KUNurse Lab Apps)"
        >
          <span className="text-base leading-none">㗊</span>
          <span className="hidden sm:inline">แอปย่อย</span>
        </button>

        {/* Quick QR Scanner Button */}
        <button
          onClick={() => setIsScannerOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 text-xs font-bold transition border border-teal-200 dark:border-teal-800 shadow-sm cursor-pointer flex-shrink-0"
          title="เปิดกล้องสแกน QR Code เพื่อดูข้อมูลครุภัณฑ์ทันที"
        >
          <Camera className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span className="hidden md:inline">สแกน QR</span>
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Dark / Light Mode Toggle Button */}
        <ThemeToggle />

        {/* Current User Info, Profile Edit & Logout Button */}
        {currentUser ? (
          <div className="flex items-center gap-1.5 sm:gap-2.5 pl-1 sm:pl-2 sm:border-l border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="hidden lg:block text-right max-w-[190px]">
              <div
                className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                title={formatUserName(currentUser)}
              >
                {formatUserName(currentUser)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {currentUser.department || currentUser.email}
              </div>
            </div>
            <div className="hidden sm:block">{getRoleBadge(currentUser.role)}</div>

            {/* In-app Edit Profile Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              title="แก้ไขข้อมูลส่วนตัว"
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-xs font-bold transition cursor-pointer flex-shrink-0"
            >
              <UserCog className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">แก้ไขบัญชี</span>
            </button>

            <button
              onClick={() => logout()}
              title="ออกจากระบบ"
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-xs font-bold transition cursor-pointer flex-shrink-0 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">ออก</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>เข้าสู่ระบบ</span>
          </Link>
        )}
      </div>

      {/* App Launcher 9-Dots Modal */}
      <AppLauncherModal isOpen={isAppLauncherOpen} onClose={() => setIsAppLauncherOpen(false)} />

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* QR Scanner Modal */}
      <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </header>
  );
}
