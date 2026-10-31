'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  PackageCheck,
  ArrowDownToLine,
  Wind,
  Wrench,
  Users,
  CalendarDays,
  Sliders,
  History,
  ShieldCheck,
  ChevronRight,
  Boxes,
  Clock,
  Sparkles,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AdminConsolePage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin, isLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isOfficer && !isAdmin) {
      router.replace('/');
    }
  }, [isLoading, isOfficer, isAdmin, router]);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok && isMounted) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch console stats:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (isOfficer || isAdmin) {
      fetchStats();
    } else if (!isLoading) {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOfficer, isAdmin, isLoading]);

  if (isLoading || loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดระบบจัดการเจ้าหน้าที่ & ผู้ดูแลระบบ..."
        submessage="กำลังดึงข้อมูลสถานะงานและสรุปยอดบันทึกประจำวัน"
      />
    );
  }

  if (!isOfficer && !isAdmin) {
    return null;
  }

  const dailyOperations = [
    {
      title: 'ศูนย์จ่ายพัสดุเคาน์เตอร์',
      subtitle: 'สแกน QR Code จ่ายของให้นิสิต/อาจารย์ตามคำขอที่อนุมัติแล้ว',
      href: '/dispense',
      icon: PackageCheck,
      emoji: '📦',
      badge: stats?.pendingBorrows ? `${stats.pendingBorrows} รายการรอจ่าย` : 'พร้อมให้บริการ',
      badgeColor: stats?.pendingBorrows ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      color: 'teal',
    },
    {
      title: 'รับเข้าพัสดุใหม่ (Stock In)',
      subtitle: 'บันทึกรับพัสดุเข้าคลัง ระบุล็อต วันหมดอายุ ราคาทุน และใบสั่งซื้อ',
      href: '/stock-in',
      icon: ArrowDownToLine,
      emoji: '📥',
      badge: 'นำเข้าล็อตใหม่',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      color: 'blue',
    },
    {
      title: 'แบ่งบรรจุ & สเตอร์ไรด์ (Repack)',
      subtitle: 'บันทึกการแบ่งซองปลอดเชื้อสำหรับฝึกปฏิบัติ และพิมพ์สติกเกอร์ QR',
      href: '/repack',
      icon: PackageCheck,
      emoji: '✂️',
      badge: 'จัดการซองสเตอร์ไรด์',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      color: 'indigo',
    },
    {
      title: 'บันทึกเปิด-ปิดแอร์ (AC Logs)',
      subtitle: 'บันทึกเวลาเปิด-ปิดเครื่องปรับอากาศห้องแล็บและอุณหภูมิประจำวัน',
      href: '/air-conditioning',
      icon: Wind,
      emoji: '❄️',
      badge: 'บันทึกประจำวัน',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      color: 'cyan',
    },
    {
      title: 'ตรวจเช็กสภาพ & ซ่อมบำรุง',
      subtitle: 'บันทึกผลการตรวจสภาพครุภัณฑ์ประจำรอบ สอบเทียบ และเปิดใบส่งซ่อม',
      href: '/maintenance',
      icon: Wrench,
      emoji: '🔧',
      badge: (stats?.maintenanceAssets || stats?.damagedItems) ? `${stats?.maintenanceAssets || stats?.damagedItems} รายการส่งซ่อม` : 'ตรวจสภาพ',
      badgeColor: (stats?.maintenanceAssets || stats?.damagedItems) ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-800 border-slate-200',
      color: 'slate',
    },
  ];

  const adminGovernance = [
    {
      title: 'จัดการผู้ใช้ & สิทธิ์การเข้าถึง',
      subtitle: 'อนุมัติสมาชิกใหม่, กำหนดบทบาท Role, รีเซ็ตรหัสผ่าน, ตรวจสอบผู้ใช้ออนไลน์',
      href: '/users',
      icon: Users,
      emoji: '👥',
      badge: 'เฉพาะแอดมิน',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      adminOnly: true,
      color: 'purple',
    },
    {
      title: 'กำหนดภาคการศึกษา (Terms)',
      subtitle: 'กำหนดวันเริ่มต้น-สิ้นสุดภาคการศึกษา สัปดาห์เรียน และรอบคิดการยืม-คืน',
      href: '/settings/terms',
      icon: CalendarDays,
      emoji: '📅',
      badge: 'ตั้งค่าระบบ',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      adminOnly: false,
      color: 'blue',
    },
    {
      title: 'ตั้งค่าข้อความแจ้งเตือน (Templates)',
      subtitle: 'ปรับแต่งหัวข้อและข้อความแจ้งเตือนอัตโนมัติทั้ง In-App และ Web Push',
      href: '/settings/notifications',
      icon: Sliders,
      emoji: '🔔',
      badge: 'เฉพาะแอดมิน',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      adminOnly: true,
      color: 'purple',
    },
    {
      title: 'ประวัติการทำรายการ (Audit Logs)',
      subtitle: 'ตรวจสอบประวัติและร่องรอยความปลอดภัยการสร้าง แก้ไข ลบ ข้อมูลในระบบ',
      href: '/audit-logs',
      icon: History,
      emoji: '📜',
      badge: 'Security Trail',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      adminOnly: false,
      color: 'slate',
    },
    {
      title: 'ศูนย์ทดลองนวัตกรรม (Admin Sandbox Hub)',
      subtitle: 'พื้นที่ทดลองฟีเจอร์และนวัตกรรมใหม่ (Visual Catalog, AI Copilot) ก่อนเปิดใช้งานจริงในระบบ',
      href: '/admin/sandbox',
      icon: Sparkles,
      emoji: '🧪',
      badge: 'Sandbox Hub เฉพาะแอดมิน',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      adminOnly: false,
      color: 'teal',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner - Luminous Cyan/Slate Theme */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-50/70 via-white to-blue-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-cyan-950/40 p-6 sm:p-7 border border-cyan-200/80 dark:border-cyan-900/60 shadow-lg shadow-cyan-900/5 dark:shadow-black/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/10 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-cyan-100/80 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/80">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              ศูนย์ปฏิบัติการเจ้าหน้าที่ & ผู้ดูแลระบบ | Staff & Admin Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              ระบบจัดการเจ้าหน้าที่ & ผู้ดูแลระบบ
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              One-Stop Operations Workstation รวมงานบันทึกประจำวันของเจ้าหน้าที่ห้องปฏิบัติการและงานบริหารระบบทั้งหมดไว้ในที่เดียว ทำงานต่อเนื่องได้โดยไม่ต้องสลับแอปไปมา
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>สิทธิ์ใช้งาน: {isAdmin ? 'ผู้ดูแลระบบสูงสุด (Admin)' : 'เจ้าหน้าที่แล็บ (Officer)'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quick Operations Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">คำขอรอจ่ายของ</span>
            <PackageCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.pendingBorrows || 0}
          </div>
          <span className="text-[10px] text-slate-400 block">รายการรอจ่ายหน้าเคาน์เตอร์</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ครุภัณฑ์ให้ยืมอยู่</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.borrowedAssets ?? stats?.activeBorrows ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 block">ชิ้นที่นิสิต/อาจารย์กำลังยืม</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">พัสดุใกล้หมดคลัง</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {Array.isArray(stats?.lowStockItems) ? stats.lowStockItems.length : (stats?.lowStockItems || 0)}
          </div>
          <span className="text-[10px] text-slate-400 block">รายการต่ำกว่าจุดสั่งซื้อ</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">สถานะระบบ</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ปกติสมบูรณ์</span>
          </div>
          <span className="text-[10px] text-slate-400 block">เชื่อมต่อ Supabase สำเร็จ</span>
        </div>
      </div>

      {/* 3. Section 1: Daily Staff Operations (5 Tasks) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-base border border-teal-500/20">
              📝
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                งานบันทึกประจำวันของเจ้าหน้าที่ (Daily Staff Operations)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เคาน์เตอร์เบิกจ่าย, รับพัสดุเข้าคลัง, แบ่งบรรจุซอง, จดเปิด-ปิดแอร์ และตรวจเช็กซ่อมบำรุง
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            5 งานบันทึก
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {dailyOperations.map((task) => (
            <Link
              key={task.href}
              href={task.href}
              className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center text-xl shadow-xs border border-slate-200/60 dark:border-slate-600/60">
                    {task.emoji}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${task.badgeColor}`}>
                    {task.badge}
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                    {task.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {task.subtitle}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400">
                <span>เปิดหน้าบันทึก</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 4. Section 2: System Governance & Administration (4 Tasks) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base border border-purple-500/20">
              🛡️
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                การจัดการระบบและความปลอดภัย (System Governance & Admin)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                จัดการบัญชีผู้ใช้ สิทธิ์การเข้าถึง กำหนดภาคการศึกษา และตรวจสอบประวัติการทำรายการ
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            4 งานบริหาร
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {adminGovernance.map((task) => {
            const isAccessible = !task.adminOnly || isAdmin;

            return isAccessible ? (
              <Link
                key={task.href}
                href={task.href}
                className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center text-xl shadow-xs border border-slate-200/60 dark:border-slate-600/60">
                      {task.emoji}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${task.badgeColor}`}>
                      {task.badge}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {task.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                  <span>เปิดจัดการ</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ) : (
              <div
                key={task.href}
                className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-850/30 border border-slate-200/40 dark:border-slate-800/40 flex flex-col justify-between gap-3 opacity-60 cursor-not-allowed"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xl">
                      🔒
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                      สงวนสิทธิ์ Admin
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <h4 className="text-sm font-bold text-slate-500">
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {task.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
