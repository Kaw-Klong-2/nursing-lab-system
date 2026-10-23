import {
  Building2,
  CalendarDays,
  Wind,
  Stethoscope,
  RefreshCw,
  Store,
  PackageCheck,
  BriefcaseMedical,
  FileSpreadsheet,
  Boxes,
  ArrowDownToLine,
  Wrench,
  CheckSquare,
  BarChart3,
  BookOpen,
  Users,
  Sliders,
  History,
  LayoutDashboard,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from './auth-context';

export type SubAppId =
  | 'room-reservation'
  | 'borrow-dispense'
  | 'inventory-assets'
  | 'approvals-hub'
  | 'executive-analytics'
  | 'staff-admin-console';

export interface SubAppMenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  badgeKey?: string;
  isImportant?: boolean;
}

export interface SubAppConfig {
  id: SubAppId;
  name: string;
  nameEn: string;
  shortName: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  emoji: string;
  primaryHref: string;
  colorName: string;
  themeClasses: {
    accentText: string;
    accentBg: string;
    accentBorder: string;
    cardGradient: string;
    cardBorder: string;
    badge: string;
    switcherActive: string;
  };
  allowedRoles: UserRole[];
  items: SubAppMenuItem[];
}

export const SUB_APPS: Record<SubAppId, SubAppConfig> = {
  'room-reservation': {
    id: 'room-reservation',
    name: 'ระบบจองห้องปฏิบัติการ',
    nameEn: 'Lab Room Reservation',
    shortName: 'จองห้องแล็บ',
    tagline: 'จองห้อง, ปฏิทินรวม, ฝึกปฏิบัติด้วยตนเอง',
    description: 'บริหารจัดการตารางการใช้ห้องปฏิบัติการพยาบาล การขอเข้าฝึกทักษะด้วยตนเอง และระบบปรับอากาศ',
    icon: Building2,
    emoji: '🏥',
    primaryHref: '/rooms',
    colorName: 'rose',
    themeClasses: {
      accentText: 'text-rose-600 dark:text-rose-400',
      accentBg: 'bg-rose-50 dark:bg-rose-950/40',
      accentBorder: 'border-rose-200 dark:border-rose-800',
      cardGradient: 'from-rose-50/80 via-white to-pink-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-rose-950/40',
      cardBorder: 'border-rose-200/80 dark:border-rose-900/60',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      switcherActive: 'bg-rose-600 text-white shadow-md shadow-rose-600/30',
    },
    allowedRoles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
    items: [
      {
        label: 'จองห้องสำหรับใช้งาน',
        href: '/rooms',
        icon: Building2,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
      },
      {
        label: 'ขอเข้าฝึกปฏิบัติด้วยตนเอง',
        href: '/practice',
        icon: Stethoscope,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
      },
      {
        label: 'ปฏิทินกิจกรรมการใช้ห้องรวม',
        href: '/schedule',
        icon: CalendarDays,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE'],
      },
      {
        label: 'บันทึกเปิด-ปิดแอร์ (AC Logs)',
        href: '/air-conditioning',
        icon: Wind,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE'],
      },
    ],
  },

  'borrow-dispense': {
    id: 'borrow-dispense',
    name: 'ระบบบริการยืม-คืนและเบิกจ่าย',
    nameEn: 'Borrow & Dispense System',
    shortName: 'ยืม-คืน & เบิกจ่าย',
    tagline: 'ยืมอุปกรณ์, เบิกพัสดุ, จ่ายของหน้าเคาน์เตอร์',
    description: 'ศูนย์บริการยืม-คืนอุปกรณ์การแพทย์ ขอเบิกวัสดุฝึกซ้อม จุดเบิกด่วน และชุดฝึกปฏิบัติการ Kits',
    icon: RefreshCw,
    emoji: '🔄',
    primaryHref: '/borrow',
    colorName: 'indigo',
    themeClasses: {
      accentText: 'text-indigo-600 dark:text-indigo-400',
      accentBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      accentBorder: 'border-indigo-200 dark:border-indigo-800',
      cardGradient: 'from-indigo-50/80 via-white to-purple-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/40',
      cardBorder: 'border-indigo-200/80 dark:border-indigo-900/60',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      switcherActive: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30',
    },
    allowedRoles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
    items: [
      {
        label: 'ยืม-คืนครุภัณฑ์ & เบิกพัสดุ',
        href: '/borrow',
        icon: RefreshCw,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
      },
      {
        label: 'จุดเบิกจ่ายด่วนหน้าร้าน (POS)',
        href: '/pos',
        icon: Store,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
      },
      {
        label: 'ศูนย์จ่ายพัสดุเคาน์เตอร์',
        href: '/dispense',
        icon: PackageCheck,
        roles: ['ADMIN', 'OFFICER'],
        isImportant: true,
      },
      {
        label: 'ชุดฝึกปฏิบัติการสำเร็จรูป (Kits)',
        href: '/kits',
        icon: BriefcaseMedical,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
      },
      {
        label: 'ประวัติเบิกจ่ายวัสดุ',
        href: '/requisitions',
        icon: FileSpreadsheet,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
      },
    ],
  },

  'inventory-assets': {
    id: 'inventory-assets',
    name: 'ระบบบริหารคลังพัสดุและครุภัณฑ์',
    nameEn: 'Inventory & Asset Management',
    shortName: 'คลังพัสดุ & ครุภัณฑ์',
    tagline: 'สต็อกพัสดุ, รับเข้า, แบ่งบรรจุ, ซ่อมบำรุง',
    description: 'บริหารจัดการสต็อกครุภัณฑ์พยาบาล รับของเข้าคลัง แบ่งบรรจุซองปลอดเชื้อ และติดตามการซ่อมบำรุง',
    icon: Boxes,
    emoji: '📦',
    primaryHref: '/inventory',
    colorName: 'blue',
    themeClasses: {
      accentText: 'text-blue-600 dark:text-blue-400',
      accentBg: 'bg-blue-50 dark:bg-blue-950/40',
      accentBorder: 'border-blue-200 dark:border-blue-800',
      cardGradient: 'from-blue-50/80 via-white to-sky-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-blue-950/40',
      cardBorder: 'border-blue-200/80 dark:border-blue-900/60',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      switcherActive: 'bg-blue-600 text-white shadow-md shadow-blue-600/30',
    },
    allowedRoles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
    items: [
      {
        label: 'ทะเบียนพัสดุ-ครุภัณฑ์ & สต็อก',
        href: '/inventory',
        icon: Boxes,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE', 'USER'],
      },
      {
        label: 'รับเข้าพัสดุใหม่ (Stock In)',
        href: '/stock-in',
        icon: ArrowDownToLine,
        roles: ['ADMIN', 'OFFICER'],
        isImportant: true,
      },
      {
        label: 'แบ่งบรรจุ & สเตอร์ไรด์ (Repack)',
        href: '/repack',
        icon: PackageCheck,
        roles: ['ADMIN', 'OFFICER'],
        isImportant: true,
      },
      {
        label: 'ตรวจเช็กสภาพ & ซ่อมบำรุง',
        href: '/maintenance',
        icon: Wrench,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE'],
      },
    ],
  },

  'approvals-hub': {
    id: 'approvals-hub',
    name: 'ศูนย์อนุมัติคำขอ',
    nameEn: 'Approvals Hub',
    shortName: 'ศูนย์อนุมัติ',
    tagline: 'อนุมัติจองห้อง, ยืมครุภัณฑ์, เบิกวัสดุ',
    description: 'จุดรวมคำขอทุกประเภทที่รอการพิจารณาอนุมัติจากอาจารย์ผู้สอน หัวหน้าห้องแล็บ และผู้มีอำนาจ',
    icon: CheckSquare,
    emoji: '✅',
    primaryHref: '/approvals',
    colorName: 'emerald',
    themeClasses: {
      accentText: 'text-emerald-600 dark:text-emerald-400',
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      accentBorder: 'border-emerald-200 dark:border-emerald-800',
      cardGradient: 'from-emerald-50/80 via-white to-teal-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-emerald-950/40',
      cardBorder: 'border-emerald-200/80 dark:border-emerald-900/60',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      switcherActive: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
    },
    allowedRoles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'USER'],
    items: [
      {
        label: 'ศูนย์อนุมัติคำขอทุกประเภท',
        href: '/approvals',
        icon: CheckSquare,
        roles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'USER'],
      },
    ],
  },

  'executive-analytics': {
    id: 'executive-analytics',
    name: 'รายงานและแดชบอร์ดผู้บริหาร',
    nameEn: 'Executive Analytics',
    shortName: 'สถิติ & ผู้บริหาร',
    tagline: 'Cockpit 360°, รายงานสถิติ, ต้นทุนรายวิชา',
    description: 'ศูนย์ข้อมูลยุทธศาสตร์ AI Advisor รายงานสรุปการใช้ทรัพยากรห้องแล็บ และการวิเคราะห์ต้นทุนการเรียนการสอน',
    icon: BarChart3,
    emoji: '📊',
    primaryHref: '/executive',
    colorName: 'amber',
    themeClasses: {
      accentText: 'text-amber-600 dark:text-amber-400',
      accentBg: 'bg-amber-50 dark:bg-amber-950/40',
      accentBorder: 'border-amber-200 dark:border-amber-800',
      cardGradient: 'from-amber-50/80 via-white to-orange-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-amber-950/40',
      cardBorder: 'border-amber-200/80 dark:border-amber-900/60',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      switcherActive: 'bg-amber-600 text-white shadow-md shadow-amber-600/30',
    },
    allowedRoles: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'EXECUTIVE'],
    items: [
      {
        label: 'แดชบอร์ดผู้บริหาร (Cockpit 360°)',
        href: '/executive',
        icon: BarChart3,
        roles: ['ADMIN', 'EXECUTIVE'],
        isImportant: true,
      },
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
    ],
  },

  'staff-admin-console': {
    id: 'staff-admin-console',
    name: 'ระบบจัดการเจ้าหน้าที่ & ผู้ดูแลระบบ',
    nameEn: 'Staff & Admin Console',
    shortName: 'จัดการแอดมิน & จนท.',
    tagline: 'One-stop Console รวม 9 งานบันทึกหน้างาน',
    description: 'โต๊ะทำงานและจุดรวมงานบันทึกประจำวันของเจ้าหน้าที่ห้องปฏิบัติการและผู้ดูแลระบบ ทำงานจบในหน้าเดียวโดยไม่ต้องสลับแอป',
    icon: Users,
    emoji: '⚙️',
    primaryHref: '/dispense',
    colorName: 'cyan',
    themeClasses: {
      accentText: 'text-cyan-600 dark:text-cyan-400',
      accentBg: 'bg-cyan-50 dark:bg-cyan-950/40',
      accentBorder: 'border-cyan-200 dark:border-cyan-800',
      cardGradient: 'from-cyan-50/80 via-white to-blue-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-cyan-950/40',
      cardBorder: 'border-cyan-200/80 dark:border-cyan-900/60',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      switcherActive: 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30',
    },
    allowedRoles: ['ADMIN', 'OFFICER'],
    items: [
      {
        label: 'ศูนย์จ่ายพัสดุเคาน์เตอร์',
        href: '/dispense',
        icon: PackageCheck,
        roles: ['ADMIN', 'OFFICER'],
      },
      {
        label: 'รับเข้าพัสดุใหม่ (Stock In)',
        href: '/stock-in',
        icon: ArrowDownToLine,
        roles: ['ADMIN', 'OFFICER'],
      },
      {
        label: 'แบ่งบรรจุ & สเตอร์ไรด์ (Repack)',
        href: '/repack',
        icon: PackageCheck,
        roles: ['ADMIN', 'OFFICER'],
      },
      {
        label: 'บันทึกเปิด-ปิดแอร์ (AC Logs)',
        href: '/air-conditioning',
        icon: Wind,
        roles: ['ADMIN', 'OFFICER'],
      },
      {
        label: 'ตรวจเช็กสภาพ & ซ่อมบำรุง',
        href: '/maintenance',
        icon: Wrench,
        roles: ['ADMIN', 'OFFICER'],
      },
      {
        label: 'จัดการผู้ใช้ & สิทธิ์',
        href: '/users',
        icon: Users,
        roles: ['ADMIN'],
        isImportant: true,
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
        isImportant: true,
      },
      {
        label: 'ประวัติการทำรายการ (Audit Logs)',
        href: '/audit-logs',
        icon: History,
        roles: ['ADMIN', 'OFFICER'],
      },
    ],
  },
};

export const SUB_APP_LIST: SubAppConfig[] = [
  SUB_APPS['room-reservation'],
  SUB_APPS['borrow-dispense'],
  SUB_APPS['inventory-assets'],
  SUB_APPS['approvals-hub'],
  SUB_APPS['executive-analytics'],
  SUB_APPS['staff-admin-console'],
];

/**
 * Filter Sub-Apps based on current user's role and permission flags
 */
export function getSubAppsForUser(
  userRole?: UserRole,
  flags?: {
    isTeacher?: boolean;
    isOfficer?: boolean;
    isAdmin?: boolean;
    isApprover?: boolean;
    isExecutive?: boolean;
  }
): SubAppConfig[] {
  const role = userRole || 'USER';
  const { isTeacher, isOfficer, isAdmin, isApprover, isExecutive } = flags || {};

  return SUB_APP_LIST.filter((app) => {
    if (app.id === 'staff-admin-console') {
      return isAdmin || isOfficer;
    }
    if (app.id === 'executive-analytics') {
      return isAdmin || isExecutive || isTeacher || isOfficer;
    }
    if (app.id === 'approvals-hub') {
      return isAdmin || isApprover || isTeacher || isOfficer || role === 'USER';
    }
    return app.allowedRoles.includes(role);
  });
}

/**
 * Detect sub-app from current pathname
 */
export function detectSubAppFromPathname(
  pathname: string,
  preferredSubAppId?: SubAppId | null
): SubAppId | null {
  if (!pathname || pathname === '/') return null;

  // If user explicitly chose 'staff-admin-console' and current path is inside it, keep it
  if (preferredSubAppId === 'staff-admin-console') {
    const consoleItems = SUB_APPS['staff-admin-console'].items;
    if (consoleItems.some((it) => pathname === it.href || pathname.startsWith(it.href + '/'))) {
      return 'staff-admin-console';
    }
  }

  // Exact or prefix matching
  if (
    pathname.startsWith('/rooms') ||
    pathname.startsWith('/practice') ||
    pathname.startsWith('/schedule') ||
    pathname.startsWith('/air-conditioning')
  ) {
    return 'room-reservation';
  }

  if (
    pathname.startsWith('/borrow') ||
    pathname.startsWith('/pos') ||
    pathname.startsWith('/dispense') ||
    pathname.startsWith('/kits') ||
    pathname.startsWith('/requisitions')
  ) {
    return 'borrow-dispense';
  }

  if (
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/stock-in') ||
    pathname.startsWith('/repack') ||
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/storage')
  ) {
    return 'inventory-assets';
  }

  if (pathname.startsWith('/approvals')) {
    return 'approvals-hub';
  }

  if (
    pathname.startsWith('/executive') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/courses')
  ) {
    return 'executive-analytics';
  }

  if (
    pathname.startsWith('/users') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/audit-logs')
  ) {
    return 'staff-admin-console';
  }

  return null;
}
