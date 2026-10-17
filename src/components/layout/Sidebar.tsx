'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Boxes,
  ArrowDownToLine,
  RefreshCw,
  FileSpreadsheet,
  CheckSquare,
  BarChart3,
  Users,
  Clock,
  Shield,
  GraduationCap,
  UserCog,
  CalendarDays,
  BriefcaseMedical,
  PackageCheck,
  QrCode,
  BookOpen,
  ChevronDown,
  ChevronsUpDown,
  Building2,
  X,
  Store,
  Sliders,
  Wind,
  LogOut,
  Wrench,
  History,
} from 'lucide-react';
import ProfileModal from '@/components/profile/ProfileModal';
import ThemeToggle from '@/components/common/ThemeToggle';
import { formatUserName } from '@/lib/user-utils';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps = {}) {
  const pathname = usePathname();
  const { currentUser, isOfficer, isApprover, isExecutive, isAdmin, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  // Hide sidebar on login page
  if (pathname === '/login') {
    return null;
  }

  interface NavItem {
    label: string;
    href: string;
    icon: any;
    roles: string[];
    badgeCount?: number;
  }

  interface NavGroup {
    groupName: string;
    groupKey: string;
    groupIcon: any;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      groupName: 'ภาพรวม & กำหนดการ',
      groupKey: 'overview',
      groupIcon: LayoutDashboard,
      items: [
        {
          label: 'ภาพรวมห้องแล็บ',
          href: '/',
          icon: LayoutDashboard,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
        },
        {
          label: 'ตารางงาน & กำหนดรับ-คืน',
          href: '/schedule',
          icon: CalendarDays,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER'],
        },
        {
          label: 'แดชบอร์ดผู้บริหาร (Cockpit 360°)',
          href: '/executive',
          icon: BarChart3,
          roles: ['ADMIN', 'EXECUTIVE'],
        },
      ],
    },
    {
      groupName: 'บริการเบิก-ยืม & ฝึกปฏิบัติ',
      groupKey: 'services',
      groupIcon: RefreshCw,
      items: [
        {
          label: 'ศูนย์อนุมัติคำขอ',
          href: '/approvals',
          icon: CheckSquare,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'USER'],
          badgeCount: pendingCount,
        },
        {
          label: 'ยืม-คืนครุภัณฑ์ & เบิกพัสดุ',
          href: '/borrow',
          icon: RefreshCw,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'USER'],
        },
        {
          label: 'จุดเบิกจ่ายด่วน (Lab Store)',
          href: '/pos',
          icon: Store,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'USER'],
        },
        {
          label: 'ชุดฝึกปฏิบัติการ (Kits)',
          href: '/kits',
          icon: BriefcaseMedical,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'USER'],
        },
        {
          label: 'จองห้องสำหรับใช้งาน',
          href: '/rooms',
          icon: Building2,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'USER'],
        },
        {
          label: 'ขอเข้าฝึกปฏิบัติด้วยตนเอง',
          href: '/practice',
          icon: QrCode,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'USER'],
        },
        {
          label: 'ประวัติเบิกจ่ายวัสดุ',
          href: '/requisitions',
          icon: FileSpreadsheet,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'USER'],
        },
      ],
    },
    {
      groupName: 'จัดการคลัง & งานแล็บ',
      groupKey: 'inventory',
      groupIcon: Boxes,
      items: [
        {
          label: 'ทะเบียนพัสดุ-ครุภัณฑ์',
          href: '/inventory',
          icon: Boxes,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
        },
        {
          label: 'รับเข้าพัสดุ (Stock In)',
          href: '/stock-in',
          icon: ArrowDownToLine,
          roles: ['ADMIN', 'OFFICER'],
        },
        {
          label: 'แบ่งบรรจุ & สเตอร์ไรด์',
          href: '/repack',
          icon: PackageCheck,
          roles: ['ADMIN', 'OFFICER'],
        },
        {
          label: 'ตรวจเช็ก & บำรุงรักษา',
          href: '/maintenance',
          icon: Wrench,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE'],
        },
      ],
    },
    {
      groupName: 'งบประมาณ & รายงาน',
      groupKey: 'analytics',
      groupIcon: BarChart3,
      items: [
        {
          label: 'รายงาน & วิเคราะห์ข้อมูล',
          href: '/reports',
          icon: BarChart3,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE'],
        },
        {
          label: 'จัดการรายวิชา & ต้นทุน',
          href: '/courses',
          icon: BookOpen,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE'],
        },
        {
          label: 'บันทึกเปิด-ปิดแอร์ (AC Logs)',
          href: '/air-conditioning',
          icon: Wind,
          roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE'],
        },
        {
          label: 'ประวัติการทำรายการ (Audit Logs)',
          href: '/audit-logs',
          icon: History,
          roles: ['ADMIN', 'OFFICER'],
        },
      ],
    },
    {
      groupName: 'ผู้ดูแลระบบ',
      groupKey: 'admin',
      groupIcon: Users,
      items: [
        {
          label: 'จัดการผู้ใช้ & สิทธิ์',
          href: '/users',
          icon: Users,
          roles: ['ADMIN'],
        },
        {
          label: 'กำหนดภาคการศึกษา',
          href: '/settings/terms',
          icon: CalendarDays,
          roles: ['ADMIN', 'OFFICER'],
        },
        {
          label: 'ตั้งค่าข้อความแจ้งเตือน',
          href: '/settings/notifications',
          icon: Sliders,
          roles: ['ADMIN'],
        },
      ],
    },
  ];

  // Track open state for dropdown groups (Default all open so menus are clearly visible)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    services: true,
    inventory: true,
    analytics: true,
    admin: true,
  });

  // Auto-expand group containing current pathname
  useEffect(() => {
    navGroups.forEach((g) => {
      if (g.items.some((it) => it.href === pathname)) {
        setOpenGroups((prev) => ({ ...prev, [g.groupKey]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllGroups = () => {
    const anyClosed = Object.values(openGroups).some((v) => !v);
    const updated: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      updated[g.groupKey] = anyClosed;
    });
    setOpenGroups(updated);
  };

  // Current user's role
  const userRole = currentUser?.role || 'USER';

  const renderSidebarContent = (isMobile = false) => (
    <>
      <div>
        <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-800/80 pb-3 mb-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-white flex items-center gap-0.5">
                <span>KUNurse</span>
                <span className="text-teal-400 font-black text-sm select-none">+</span>
                <span>Lab</span>
              </span>
              <span className="text-[9px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded font-mono border border-slate-700 font-bold">
                {userRole}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              คณะพยาบาลศาสตร์ มก.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleAllGroups}
              title="ย่อ/ขยายกลุ่มเมนูทั้งหมด"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-teal-400 rounded transition cursor-pointer"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
            </button>
            {isMobile && onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="ปิดเมนู"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <nav className="space-y-2">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.href === '/executive') {
                return isExecutive || isAdmin || item.roles.includes(userRole);
              }
              if (item.href === '/approvals') {
                return isApprover || isAdmin || item.roles.includes(userRole);
              }
              if (item.href === '/audit-logs') {
                return isAdmin || isOfficer;
              }
              return item.roles.includes(userRole);
            });
            if (visibleItems.length === 0) return null;

            const isOpen = openGroups[group.groupKey] ?? true;
            const hasActiveItem = visibleItems.some((item) => pathname === item.href);

            return (
              <div key={group.groupKey} className="space-y-1">
                {/* Group Dropdown Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.groupKey)}
                  className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs font-bold transition cursor-pointer group ${
                    hasActiveItem
                      ? 'text-teal-300 bg-slate-800/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <group.groupIcon className="w-3.5 h-3.5 text-teal-500/80 group-hover:text-teal-400 transition" />
                    <span className="text-[11px] font-bold">{group.groupName}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {visibleItems.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasActiveItem && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                        isOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </div>
                </button>

                {/* Submenu Dropdown Items */}
                {isOpen && (
                  <div className="space-y-1 pl-2.5 ml-2 border-l border-slate-800/80 mt-0.5">
                    {visibleItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            if (isMobile && onMobileClose) onMobileClose();
                          }}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                            isActive
                              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <item.icon
                              className={`w-3.5 h-3.5 transition ${
                                isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badgeCount && item.badgeCount > 0 ? (
                            <span className="flex items-center justify-center px-2 py-0.5 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse flex-shrink-0">
                              {item.badgeCount}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Role status footer & Profile Edit */}
      <div className="mt-8 pt-4 border-t border-slate-800 text-xs space-y-2">
        <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60 space-y-1">
          <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[11px]">
            <Shield className="w-3.5 h-3.5" />
            <span>สิทธิ์การใช้งานปัจจุบัน:</span>
          </div>
          <div
            className="text-xs font-bold text-white break-words leading-snug"
            title={formatUserName(currentUser) || 'ผู้ใช้งาน'}
          >
            {formatUserName(currentUser) || 'ผู้ใช้งาน'}
          </div>
          <div className="text-[10px] text-slate-400 space-y-0.5">
            {currentUser?.isExecutive && (
              <div className="text-rose-300 font-semibold">
                🏛️ {currentUser.executiveRole || 'ผู้บริหาร'}
              </div>
            )}
            {userRole === 'ADMIN' && <div>เข้าถึงและกำหนดค่าได้ทุกระบบ</div>}
            {userRole === 'OFFICER' && <div>จัดการคลัง รับเข้า จ่ายของ และตรวจคืน</div>}
            {userRole === 'APPROVER' && <div>มีสิทธิ์อนุมัติคำขอยืมและเบิก (หัวหน้าภาค/ผู้บริหาร)</div>}
            {userRole === 'TEACHER' && <div>อาจารย์ผู้สอน (มีสิทธิ์รับทราบคำขอ/ยืมสอน)</div>}
            {userRole === 'USER' && <div>นิสิต (มีสิทธิ์ยื่นคำขอยืมและขอเบิกวัสดุ)</div>}
            {userRole !== 'ADMIN' && userRole !== 'USER' && currentUser?.approvalScopes && currentUser.approvalScopes !== 'NONE' && (
              <div className="text-amber-300 font-medium pt-0.5">
                📋 มีสิทธิ์อนุมัติคำขอในระบบ
              </div>
            )}
          </div>
        </div>

        {/* Quick Edit Profile & Logout Buttons */}
        {currentUser && (
          <div className="space-y-2">
            <button
              onClick={() => {
                if (isMobile && onMobileClose) onMobileClose();
                const navbarEditBtn = document.querySelector<HTMLButtonElement>('[title="แก้ไขข้อมูลส่วนตัว"]');
                if (navbarEditBtn) {
                  navbarEditBtn.click();
                } else {
                  setIsProfileOpen(true);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              <UserCog className="w-4 h-4 text-teal-400" />
              <span>แก้ไขบัญชีส่วนตัว</span>
            </button>

            <button
              onClick={() => {
                if (isMobile && onMobileClose) onMobileClose();
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs font-bold transition cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        )}

        {/* Theme Toggle Button */}
        <div className="pt-2">
          <ThemeToggle className="w-full justify-center py-2" showLabel />
        </div>

        {/* Developer Credit & Copyright Footer */}
        <div className="pt-3 pb-1 border-t border-slate-800/80 text-center select-none space-y-0.5">
          <div className="text-[10px] text-slate-400 font-mono tracking-wide hover:text-teal-400 transition cursor-default">
            &copy; 2026 Developed by <span className="font-bold text-slate-300">KIy&#123;d6]K</span>
          </div>
          <div className="text-[9px] text-slate-400">
            v1.0.0 &bull; Faculty of Nursing, KU
          </div>
        </div>
      </div>

      {/* Fallback Profile Modal if not in Navbar */}
      {isProfileOpen && (
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-300 h-full hidden md:flex flex-col justify-between p-4 shadow-xl overflow-y-auto">
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
          <aside className="relative z-10 w-72 max-w-[85vw] bg-slate-900 text-slate-300 h-full flex flex-col justify-between p-4 shadow-2xl overflow-y-auto">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
