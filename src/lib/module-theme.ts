/**
 * ระบบจัดการชุดสีและเอกลักษณ์ประจำโมดูล (Dynamic Module Theming Engine)
 * สำหรับ LAB-system คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์
 *
 * กำหนดแม่สีและสไตล์สำหรับ:
 * 1. ส่วนหัวการ์ดแบนเนอร์ (Luminous Header) ให้สว่าง คลีน ไม่มืดทึบ
 * 2. แถบเมนูด้านข้าง (Sidebar) ปรับเปลี่ยนสีตามโมดูลที่กำลังเปิดใช้งานโดยอัตโนมัติ
 */

export type SubsystemKey =
  | 'overview'
  | 'inventory'
  | 'borrow'
  | 'practice'
  | 'approvals'
  | 'schedule'
  | 'aircon'
  | 'executive'
  | 'admin';

export interface ModuleTheme {
  key: SubsystemKey;
  label: string;
  badgeLabel: string;
  colorName: string;

  // Sidebar styling tokens (full static Tailwind classes for JIT)
  sidebarActiveBg: string;
  sidebarActiveText: string;
  sidebarActiveShadow: string;
  sidebarActiveIndicator: string;
  sidebarActiveGroupText: string;
  sidebarActiveGroupBg: string;
  sidebarIconHover: string;
  sidebarBadge: string;

  // Luminous Header styling tokens
  headerCard: string;
  headerGlow: string;
  headerBadge: string;
  headerTitle: string;
  headerSubtitle: string;
  headerActionPrimary: string;
}

export const MODULE_THEMES: Record<SubsystemKey, ModuleTheme> = {
  overview: {
    key: 'overview',
    label: 'ภาพรวมห้องแล็บ',
    badgeLabel: 'ภาพรวม & แดชบอร์ด',
    colorName: 'teal',
    sidebarActiveBg: 'bg-teal-600',
    sidebarActiveText: 'text-white',
    sidebarActiveShadow: 'shadow-md shadow-teal-600/30',
    sidebarActiveIndicator: 'bg-teal-400',
    sidebarActiveGroupText: 'text-teal-300',
    sidebarActiveGroupBg: 'bg-teal-950/40 text-teal-300 border border-teal-800/40',
    sidebarIconHover: 'group-hover:text-teal-400',
    sidebarBadge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    headerCard:
      'bg-gradient-to-r from-teal-50/70 via-white to-emerald-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 shadow-lg shadow-teal-900/5 dark:shadow-black/20',
    headerGlow: 'bg-teal-400/20 dark:bg-teal-500/15',
    headerBadge:
      'bg-teal-100/80 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80',
    headerTitle: 'text-slate-900 dark:text-white',
    headerSubtitle: 'text-slate-600 dark:text-slate-300',
    headerActionPrimary:
      'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25',
  },

  inventory: {
    key: 'inventory',
    label: 'คลังพัสดุและครุภัณฑ์',
    badgeLabel: 'คลังพัสดุ & สต็อก',
    colorName: 'blue',
    sidebarActiveBg: 'bg-blue-600',
    sidebarActiveText: 'text-white',
    sidebarActiveShadow: 'shadow-md shadow-blue-600/30',
    sidebarActiveIndicator: 'bg-blue-400',
    sidebarActiveGroupText: 'text-blue-300',
    sidebarActiveGroupBg: 'bg-blue-950/40 text-blue-300 border border-blue-800/40',
    sidebarIconHover: 'group-hover:text-blue-400',
    sidebarBadge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    headerCard:
      'bg-gradient-to-r from-blue-50/70 via-white to-sky-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 shadow-lg shadow-blue-900/5 dark:shadow-black/20',
    headerGlow: 'bg-blue-400/20 dark:bg-blue-500/15',
    headerBadge:
      'bg-blue-100/80 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80',
    headerTitle: 'text-slate-900 dark:text-white',
    headerSubtitle: 'text-slate-600 dark:text-slate-300',
    headerActionPrimary:
      'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25',
  },

  borrow: {
    key: 'borrow',
    label: 'บริการเบิก-ยืม & Lab Store',
    badgeLabel: 'เบิก-ยืม & Lab Store',
    colorName: 'indigo',
    sidebarActiveBg: 'bg-indigo-600',
    sidebarActiveText: 'text-white',
    sidebarActiveShadow: 'shadow-md shadow-indigo-600/30',
    sidebarActiveIndicator: 'bg-indigo-400',
    sidebarActiveGroupText: 'text-indigo-300',
    sidebarActiveGroupBg: 'bg-indigo-950/40 text-indigo-300 border border-indigo-800/40',
    sidebarIconHover: 'group-hover:text-indigo-400',
    sidebarBadge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    headerCard:
      'bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 shadow-lg shadow-indigo-900/5 dark:shadow-black/20',
    headerGlow: 'bg-indigo-400/20 dark:bg-indigo-500/15',
    headerBadge:
      'bg-indigo-100/80 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80',
    headerTitle: 'text-slate-900 dark:text-white',
    headerSubtitle: 'text-slate-600 dark:text-slate-300',
    headerActionPrimary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25',
  },

  practice: {
    key: 'practice',
    label: 'ฝึกปฏิบัติทักษะทางการพยาบาล',
    badgeLabel: 'ฝึกทักษะ & จองห้อง',
    colorName: 'rose',
    sidebarActiveBg: 'bg-rose-500',
    sidebarActiveText: 'text-white',
    sidebarActiveShadow: 'shadow-md shadow-rose-500/30',
    sidebarActiveIndicator: 'bg-rose-400',
    sidebarActiveGroupText: 'text-rose-300',
    sidebarActiveGroupBg: 'bg-rose-950/40 text-rose-300 border border-rose-800/40',
    sidebarIconHover: 'group-hover:text-rose-400',
    sidebarBadge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    headerCard:
      'bg-gradient-to-r from-rose-50/70 via-white to-pink-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 shadow-lg shadow-rose-900/5 dark:shadow-black/20',
    headerGlow: 'bg-rose-400/20 dark:bg-rose-500/15',
    headerBadge:
      'bg-rose-100/80 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80',
    headerTitle: 'text-slate-900 dark:text-white',
    headerSubtitle: 'text-slate-600 dark:text-slate-300',
    headerActionPrimary:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25',
  },

  approvals: {
    key: 'approvals',
    label: 'ศูนย์อนุมัติคำขอ',
    badgeLabel: 'ศูนย์อนุมัติ',
    colorName: 'emerald',
    sidebarActiveBg: 'bg-emerald-600',
    sidebarActiveText: 'text-white',
    sidebarActiveShadow: 'shadow-md shadow-emerald-600/30',
    sidebarActiveIndicator: 'bg-emerald-400',
    sidebarActiveGroupText: 'text-emerald-300',
    sidebarActiveGroupBg: 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40',
    sidebarIconHover: 'group-hover:text-emerald-400',
    sidebarBadge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    headerCard:
      'bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 shadow-lg shadow-emerald-900/5 dark:shadow-black/20',
    headerGlow: 'bg-emerald-400/20 dark:bg-emerald-500/15',
    headerBadge:
      'bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80',
    headerTitle: 'text-slate-900 dark:text-white',
    headerSubtitle: 'text-slate-600 dark:text-slate-300',
    headerActionPrimary:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25',
  },

  schedule: {
    key: 'schedule',
    label: 'ตารางงาน & กำหนดรับ-คืน',
    badgeLabel: 'ตารางงาน & กำหนด',
    colorName: 'amber',
    sidebarActiveBg: 'bg-amber-500',
    sidebarActiveText: 'text-white',
    sidebarActiveShadow: 'shadow-md shadow-amber-500/30',
    sidebarActiveIndicator: 'bg-amber-400',
    sidebarActiveGroupText: 'text-amber-300',
    sidebarActiveGroupBg: 'bg-amber-950/40 text-amber-300 border border-amber-800/40',
    sidebarIconHover: 'group-hover:text-amber-400',
    sidebarBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    headerCard:
      'bg-gradient-to-r from-amber-50/70 via-white to-orange-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 shadow-lg shadow-amber-900/5 dark:shadow-black/20',
    headerGlow: 'bg-amber-400/20 dark:bg-amber-500/15',
    headerBadge:
      'bg-amber-100/80 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80',
    headerTitle: 'text-slate-900 dark:text-white',
    headerSubtitle: 'text-slate-600 dark:text-slate-300',
    headerActionPrimary:
      'bg-amber-500 hover:bg-amber-400 text-white shadow-md shadow-amber-500/25',
  },

  aircon: {
    key: 'aircon',
    label: 'ระบบบันทึกเปิด-ปิดเครื่องปรับอากาศ',
    badgeLabel: 'ระบบควบคุมแอร์',
    colorName: 'cyan',
    sidebarActiveBg: 'bg-cyan-600',
    sidebarActiveText: 'text-white',
    sidebarActiveShadow: 'shadow-md shadow-cyan-600/30',
    sidebarActiveIndicator: 'bg-cyan-400',
    sidebarActiveGroupText: 'text-cyan-300',
    sidebarActiveGroupBg: 'bg-cyan-950/40 text-cyan-300 border border-cyan-800/40',
    sidebarIconHover: 'group-hover:text-cyan-400',
    sidebarBadge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    headerCard:
      'bg-gradient-to-r from-cyan-50/70 via-white to-sky-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-cyan-950/40 border border-cyan-200/80 dark:border-cyan-900/60 shadow-lg shadow-cyan-900/5 dark:shadow-black/20',
    headerGlow: 'bg-cyan-400/20 dark:bg-cyan-500/15',
    headerBadge:
      'bg-cyan-100/80 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/80',
    headerTitle: 'text-slate-900 dark:text-white',
    headerSubtitle: 'text-slate-600 dark:text-slate-300',
    headerActionPrimary:
      'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/25',
  },

  executive: {
    key: 'executive',
    label: 'แดชบอร์ดผู้บริหาร (Cockpit 360°)',
    badgeLabel: 'ผู้บริหาร & รายงาน',
    colorName: 'purple',
    sidebarActiveBg: 'bg-purple-600',
    sidebarActiveText: 'text-white',
    sidebarActiveShadow: 'shadow-md shadow-purple-600/30',
    sidebarActiveIndicator: 'bg-purple-400',
    sidebarActiveGroupText: 'text-purple-300',
    sidebarActiveGroupBg: 'bg-purple-950/40 text-purple-300 border border-purple-800/40',
    sidebarIconHover: 'group-hover:text-purple-400',
    sidebarBadge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    headerCard:
      'bg-gradient-to-r from-purple-50/70 via-white to-fuchsia-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 shadow-lg shadow-purple-900/5 dark:shadow-black/20',
    headerGlow: 'bg-purple-400/20 dark:bg-purple-500/15',
    headerBadge:
      'bg-purple-100/80 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80',
    headerTitle: 'text-slate-900 dark:text-white',
    headerSubtitle: 'text-slate-600 dark:text-slate-300',
    headerActionPrimary:
      'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25',
  },

  admin: {
    key: 'admin',
    label: 'จัดการระบบและสิทธิ์ผู้ใช้งาน',
    badgeLabel: 'ตั้งค่า & ผู้ดูแล',
    colorName: 'slate',
    sidebarActiveBg: 'bg-slate-700',
    sidebarActiveText: 'text-white',
    sidebarActiveShadow: 'shadow-md shadow-slate-700/30',
    sidebarActiveIndicator: 'bg-slate-300',
    sidebarActiveGroupText: 'text-slate-300',
    sidebarActiveGroupBg: 'bg-slate-800 text-slate-300 border border-slate-700',
    sidebarIconHover: 'group-hover:text-slate-300',
    sidebarBadge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    headerCard:
      'bg-gradient-to-r from-slate-50/80 via-white to-zinc-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-900/5 dark:shadow-black/20',
    headerGlow: 'bg-slate-400/20 dark:bg-slate-500/15',
    headerBadge:
      'bg-slate-100/90 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    headerTitle: 'text-slate-900 dark:text-white',
    headerSubtitle: 'text-slate-600 dark:text-slate-300',
    headerActionPrimary:
      'bg-slate-800 hover:bg-slate-700 text-white shadow-md shadow-slate-900/25',
  },
};

/**
 * วิเคราะห์ pathname เพื่อดึงชุดสีประจำโมดูล
 */
export function getModuleTheme(pathname?: string | null): ModuleTheme {
  if (!pathname || pathname === '/') {
    return MODULE_THEMES.overview;
  }

  // คลังพัสดุและครุภัณฑ์
  if (
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/stock-in') ||
    pathname.startsWith('/repack') ||
    pathname.startsWith('/maintenance')
  ) {
    return MODULE_THEMES.inventory;
  }

  // บริการเบิกจ่ายและยืมคืน
  if (
    pathname.startsWith('/borrow') ||
    pathname.startsWith('/pos') ||
    pathname.startsWith('/dispense') ||
    pathname.startsWith('/kits') ||
    pathname.startsWith('/requisitions')
  ) {
    return MODULE_THEMES.borrow;
  }

  // ฝึกปฏิบัติทักษะ OSCE และห้องแล็บ
  if (pathname.startsWith('/practice') || pathname.startsWith('/rooms')) {
    return MODULE_THEMES.practice;
  }

  // ศูนย์อนุมัติคำขอ
  if (pathname.startsWith('/approvals')) {
    return MODULE_THEMES.approvals;
  }

  // ตารางงาน & กำหนดรับ-คืน
  if (pathname.startsWith('/schedule')) {
    return MODULE_THEMES.schedule;
  }

  // ระบบเปิด-ปิดเครื่องปรับอากาศ
  if (pathname.startsWith('/air-conditioning')) {
    return MODULE_THEMES.aircon;
  }

  // แดชบอร์ดผู้บริหารและรายงาน
  if (
    pathname.startsWith('/executive') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/audit-logs')
  ) {
    return MODULE_THEMES.executive;
  }

  // ผู้ดูแลระบบ การตั้งค่า และรายวิชา
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/courses')
  ) {
    return MODULE_THEMES.admin;
  }

  return MODULE_THEMES.overview;
}
