'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Package,
  Boxes,
  Plus,
  Minus,
  Search,
  Sparkles,
  Check,
  MapPin,
  Trash2,
  ShoppingCart,
  Layers,
  X,
  Camera,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  Clock,
  Calendar,
  AlertTriangle,
  HeartPulse,
  Activity,
  Bed,
  Droplets,
  ShieldCheck,
  Users,
  LayoutGrid,
  Grid3X3,
  List,
  FlaskConical,
  Heart,
  Flame,
  Star,
  ArrowUpDown,
  Eye,
  EyeOff,
  Tag,
  Info,
  Building2,
  CheckCircle2,
  Store,
} from 'lucide-react';
import { formatImageUrl } from '@/lib/image-helper';
import { formatBangkokDateTime } from '@/lib/date-time-utils';
import BorrowCheckoutDrawer, { CourseItem, InstructorItem } from './BorrowCheckoutDrawer';

export interface CatalogAssetItem {
  id: string;
  assetCode: string;
  govAssetCode?: string | null;
  serialNumber?: string | null;
  sequenceNumber?: number;
  location?: string | null;
  storageLocation?: {
    id: string;
    code: string;
    name: string;
    roomName?: string | null;
    floor?: string | null;
    building?: string | null;
  } | null;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  status?: string | null;
  cost?: number;
  imageUrl?: string | null;
  note?: string | null;
  isBorrowable?: boolean;
  customBadge?: string | null;
  customBadgeColor?: string | null;
  isSensitiveImage?: boolean | null;
  sensitiveBlurLevel?: number | null;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  type: 'EQUIPMENT' | 'CONSUMABLE';
  unit: string;
  usageUnit?: string | null;
  conversionRatio?: number;
  currentStock: number;
  physicalStock?: number;
  availableStock?: number;
  reservedStock?: number;
  openPackRemainder?: number;
  location?: string | null;
  storageLocation?: {
    id: string;
    code: string;
    name: string;
    roomName?: string | null;
    floor?: string | null;
    building?: string | null;
  } | null;
  imageUrl?: string | null;
  brand?: string | null;
  model?: string | null;
  unitCost?: number;
  customBadge?: string | null;
  customBadgeColor?: string | null;
  isSensitiveImage?: boolean | null;
  sensitiveBlurLevel?: number | null;
  categoryId?: string;
  category?: { id: string; name: string };
  isBorrowable?: boolean;
  assets?: CatalogAssetItem[];
  availableAssets?: CatalogAssetItem[];
}

export interface PracticeKitComponent {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  items: Array<{
    id: string;
    itemId: string;
    quantity: number;
    item: {
      id: string;
      code: string;
      name: string;
      type: 'EQUIPMENT' | 'CONSUMABLE';
      unit: string;
      usageUnit?: string | null;
      conversionRatio?: number;
    };
  }>;
}

export interface BorrowRow {
  itemId: string;
  quantity: number | string;
  categoryId?: string;
  selectedAssetIds?: string[];
  selectedAssetCodes?: string[];
}

export interface RequisitionRow {
  itemId: string;
  quantity: number | string;
  isSubUnit?: boolean;
  requestedUnit?: string;
  categoryId?: string;
}

export interface ItemConflictInfo {
  requestId: string;
  requestNumber: string;
  borrowDate: string;
  expectedReturnDate: string;
  status: string;
  purpose: string;
  requesterName: string;
  requesterRole: string;
  quantity: number;
  assetId?: string | null;
}

export interface ItemAvailability {
  itemId: string;
  itemCode: string;
  itemName: string;
  type: 'EQUIPMENT' | 'CONSUMABLE';
  unit: string;
  physicalCapacity: number;
  reservedCount: number;
  availableNow: number;
  reservedAssetIds?: string[];
  conflictStatus: 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'FULL';
  conflicts: ItemConflictInfo[];
}

interface BorrowCatalogBrowserProps {
  equipmentList: CatalogItem[];
  consumablesList: CatalogItem[];
  practiceKits: PracticeKitComponent[];
  borrowItems: BorrowRow[];
  requisitionItems: RequisitionRow[];
  onUpdateBorrowItems: (items: BorrowRow[]) => void;
  onUpdateRequisitionItems: (items: RequisitionRow[]) => void;
  readOnly?: boolean;
  initialBorrowDate?: string;
  initialReturnDate?: string;
  onDatesChange?: (dates: { borrowDate: string; expectedReturnDate: string }) => void;
  courses?: CourseItem[];
  instructors?: InstructorItem[];
  isSimulation?: boolean;
  simulatedRole?: 'STUDENT' | 'TEACHER';
  onSubmitRealRequest?: (payload: any) => Promise<{ success: boolean; data?: any; error?: string }>;
}

function getMedicalCategoryMeta(categoryName?: string, itemType?: string) {
  const name = categoryName || '';
  if (
    name.includes('เครื่องกระตุก') ||
    name.includes('AED') ||
    name.includes('หัวใจ') ||
    name.includes('กู้ชีพ')
  ) {
    return {
      icon: HeartPulse,
      gradient: 'from-rose-50/90 via-white to-rose-100/60 dark:from-rose-950/40 dark:via-slate-900 dark:to-rose-900/20',
      iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20',
      badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/50',
      label: 'เครื่องมือช่วยชีวิต',
    };
  }
  if (
    name.includes('เตียง') ||
    name.includes('ตู้') ||
    name.includes('โต๊ะ') ||
    name.includes('เก้าอี้')
  ) {
    return {
      icon: Bed,
      gradient: 'from-indigo-50/90 via-white to-indigo-100/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-900/20',
      iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20',
      badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/50',
      label: 'เตียงและเฟอร์นิเจอร์วอร์ด',
    };
  }
  if (name.includes('หุ่น') || name.includes('จำลอง') || name.includes('ทักษะ')) {
    return {
      icon: Activity,
      gradient: 'from-violet-50/90 via-white to-fuchsia-100/50 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-900/20',
      iconBg: 'bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20',
      badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200/60 dark:border-violet-800/50',
      label: 'หุ่นฝึกทักษะการพยาบาล',
    };
  }
  if (
    name.includes('สารน้ำ') ||
    name.includes('น้ำเกลือ') ||
    name.includes('IV') ||
    name.includes('D-5-S')
  ) {
    return {
      icon: Droplets,
      gradient: 'from-sky-50/90 via-white to-cyan-100/60 dark:from-sky-950/40 dark:via-slate-900 dark:to-cyan-900/20',
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20',
      badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/50',
      label: 'สารน้ำทางหลอดเลือด',
    };
  }
  if (name.includes('แอลกอฮอล์') || name.includes('ล้าง') || name.includes('ฆ่าเชื้อ')) {
    return {
      icon: Sparkles,
      gradient: 'from-cyan-50/90 via-white to-teal-100/60 dark:from-cyan-950/40 dark:via-slate-900 dark:to-teal-900/20',
      iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20',
      badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-800/50',
      label: 'น้ำยาทำความสะอาด/ฆ่าเชื้อ',
    };
  }
  if (
    name.includes('แผล') ||
    name.includes('ผ้าก๊อซ') ||
    name.includes('สำลี') ||
    name.includes('Conform') ||
    name.includes('Dressing')
  ) {
    return {
      icon: ShieldCheck,
      gradient: 'from-amber-50/90 via-white to-orange-100/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-900/20',
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50',
      label: 'เวชภัณฑ์ทำแผล',
    };
  }
  return {
    icon: itemType === 'EQUIPMENT' ? Package : Boxes,
    gradient:
      itemType === 'EQUIPMENT'
        ? 'from-blue-50/80 via-white to-indigo-50/70 dark:from-blue-950/30 dark:via-slate-900 dark:to-indigo-950/20'
        : 'from-teal-50/80 via-white to-emerald-50/70 dark:from-teal-950/30 dark:via-slate-900 dark:to-emerald-950/20',
    iconBg:
      itemType === 'EQUIPMENT'
        ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20'
        : 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/20',
    badge:
      itemType === 'EQUIPMENT'
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/50'
        : 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/50',
    label: categoryName || (itemType === 'EQUIPMENT' ? 'ครุภัณฑ์การแพทย์' : 'วัสดุการแพทย์'),
  };
}

function getCustomBadgeMeta(
  item: { customBadge?: string | null; customBadgeColor?: string | null },
  override?: { badge?: string | null; color?: string | null }
) {
  const badgeText =
    override && override.badge !== undefined
      ? override.badge
      : item.customBadge;
  if (!badgeText || !badgeText.trim()) {
    return null;
  }

  const colorKey = (
    (override && override.color !== undefined ? override.color : item.customBadgeColor) ||
    'AMBER'
  ).toUpperCase();

  const colorClasses: Record<string, string> = {
    ROSE: 'bg-rose-600/95 text-white border-rose-400/50',
    AMBER: 'bg-amber-500/95 text-white border-amber-300/50',
    EMERALD: 'bg-emerald-600/95 text-white border-emerald-400/50',
    INDIGO: 'bg-indigo-600/95 text-white border-indigo-400/50',
    PURPLE: 'bg-purple-600/95 text-white border-purple-400/50',
  };

  return {
    label: badgeText.trim(),
    color: colorKey,
    className: colorClasses[colorKey] || colorClasses.AMBER,
  };
}

function getItemBlurState(
  item: CatalogItem,
  override?: { isSensitive?: boolean; blurPercent?: number }
) {
  const isSensitive =
    override && override.isSensitive !== undefined
      ? override.isSensitive
      : item.isSensitiveImage === true;

  const blurPercent = Math.min(
    100,
    Math.max(
      10,
      override && override.blurPercent !== undefined
        ? override.blurPercent
        : Number(item.sensitiveBlurLevel) || 80
    )
  );

  // Convert percentage (10% - 100%) to CSS blur radius in px (3px - 32px)
  const blurPx = Math.max(3, Math.round((blurPercent / 100) * 32));

  return {
    isSensitive,
    blurPercent,
    blurPx,
  };
}

export type CatalogColorThemeKey =
  | 'MINT_OCEAN'
  | 'ROSE_LAVENDER'
  | 'IRIS_SKY'
  | 'SAGE_AMBER'
  | 'SAPPHIRE_CYAN';

export const CATALOG_THEMES: Record<
  CatalogColorThemeKey,
  {
    key: CatalogColorThemeKey;
    name: string;
    shortLabel: string;
    dotClass: string;
    heroBanner: string;
    heroOrbA: string;
    heroOrbB: string;
    heroBadge: string;
    heroCtaBtn: string;
    activeCategoryPill: string;
    photoBackdrop: string;
    equipTabActive: string;
    consTabActive: string;
    equipCardActive: string;
    consCardActive: string;
    equipCardHover: string;
    consCardHover: string;
    equipSelectedPill: string;
    consSelectedPill: string;
    equipActionBtn: string;
    consActionBtn: string;
    equipStepperWrap: string;
    consStepperWrap: string;
    floatingCartBar: string;
  }
> = {
  MINT_OCEAN: {
    key: 'MINT_OCEAN',
    name: '🌿 Clinical Mint & Ocean Blue (เขียวมิ้นต์ & ฟ้าน้ำทะเล)',
    shortLabel: '🌿 มิ้นต์-ฟ้า',
    dotClass: 'bg-gradient-to-tr from-teal-500 to-blue-600',
    heroBanner:
      'bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 dark:from-teal-900 dark:via-cyan-900 dark:to-blue-950 border-teal-400/30',
    heroOrbA: 'bg-white/20',
    heroOrbB: 'bg-sky-300/25',
    heroBadge: 'bg-white/20 border-white/30 text-white',
    heroCtaBtn: 'bg-white hover:bg-teal-50 text-teal-900',
    activeCategoryPill: 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold shadow-xs',
    photoBackdrop:
      'bg-gradient-to-br from-teal-50/60 via-white to-sky-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80',
    equipTabActive: 'bg-blue-600 text-white shadow-xs',
    consTabActive: 'bg-teal-600 text-white shadow-xs',
    equipCardActive:
      'bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/25 shadow-md',
    consCardActive:
      'bg-white dark:bg-slate-900 border-teal-500 dark:border-teal-500 ring-2 ring-teal-500/25 shadow-md',
    equipCardHover: 'hover:border-blue-300 dark:hover:border-blue-700',
    consCardHover: 'hover:border-teal-300 dark:hover:border-teal-700',
    equipSelectedPill: 'bg-blue-600',
    consSelectedPill: 'bg-teal-600',
    equipActionBtn:
      'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs',
    consActionBtn:
      'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-xs',
    equipStepperWrap:
      'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    consStepperWrap:
      'bg-teal-50/80 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    floatingCartBar:
      'bg-gradient-to-r from-teal-700 via-cyan-700 to-blue-700 text-white border-white/20',
  },
  ROSE_LAVENDER: {
    key: 'ROSE_LAVENDER',
    name: '🌸 Nursing Rose & Lavender (ชมพูซากุระ & ม่วงลาเวนเดอร์)',
    shortLabel: '🌸 ชมพู-ม่วง',
    dotClass: 'bg-gradient-to-tr from-rose-500 to-violet-600',
    heroBanner:
      'bg-gradient-to-r from-rose-500 via-pink-500 to-violet-600 dark:from-rose-900 dark:via-pink-900 dark:to-violet-950 border-rose-300/30',
    heroOrbA: 'bg-white/20',
    heroOrbB: 'bg-violet-300/25',
    heroBadge: 'bg-white/20 border-white/30 text-white',
    heroCtaBtn: 'bg-white hover:bg-rose-50 text-rose-900',
    activeCategoryPill: 'bg-gradient-to-r from-rose-500 to-violet-600 text-white font-bold shadow-xs',
    photoBackdrop:
      'bg-gradient-to-br from-rose-50/60 via-white to-violet-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80',
    equipTabActive: 'bg-violet-600 text-white shadow-xs',
    consTabActive: 'bg-rose-500 text-white shadow-xs',
    equipCardActive:
      'bg-white dark:bg-slate-900 border-violet-500 dark:border-violet-500 ring-2 ring-violet-500/25 shadow-md',
    consCardActive:
      'bg-white dark:bg-slate-900 border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/25 shadow-md',
    equipCardHover: 'hover:border-violet-300 dark:hover:border-violet-700',
    consCardHover: 'hover:border-rose-300 dark:hover:border-rose-700',
    equipSelectedPill: 'bg-violet-600',
    consSelectedPill: 'bg-rose-500',
    equipActionBtn:
      'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-xs',
    consActionBtn:
      'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-xs',
    equipStepperWrap:
      'bg-violet-50/80 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
    consStepperWrap:
      'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    floatingCartBar:
      'bg-gradient-to-r from-rose-600 via-pink-600 to-violet-700 text-white border-white/20',
  },
  IRIS_SKY: {
    key: 'IRIS_SKY',
    name: '💜 Royal Iris & Sky Studio (ม่วงไอริส & ฟ้าสกาย)',
    shortLabel: '💜 ไอริส-สกาย',
    dotClass: 'bg-gradient-to-tr from-indigo-600 to-purple-600',
    heroBanner:
      'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-950 dark:via-violet-950 dark:to-purple-950 border-indigo-400/30',
    heroOrbA: 'bg-white/20',
    heroOrbB: 'bg-indigo-300/25',
    heroBadge: 'bg-white/20 border-white/30 text-white',
    heroCtaBtn: 'bg-white hover:bg-indigo-50 text-indigo-900',
    activeCategoryPill: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-xs',
    photoBackdrop:
      'bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80',
    equipTabActive: 'bg-indigo-600 text-white shadow-xs',
    consTabActive: 'bg-violet-600 text-white shadow-xs',
    equipCardActive:
      'bg-white dark:bg-slate-900 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/25 shadow-md',
    consCardActive:
      'bg-white dark:bg-slate-900 border-violet-500 dark:border-violet-500 ring-2 ring-violet-500/25 shadow-md',
    equipCardHover: 'hover:border-indigo-300 dark:hover:border-indigo-700',
    consCardHover: 'hover:border-violet-300 dark:hover:border-violet-700',
    equipSelectedPill: 'bg-indigo-600',
    consSelectedPill: 'bg-violet-600',
    equipActionBtn:
      'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-xs',
    consActionBtn:
      'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-xs',
    equipStepperWrap:
      'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    consStepperWrap:
      'bg-violet-50/80 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
    floatingCartBar:
      'bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 text-white border-white/20',
  },
  SAGE_AMBER: {
    key: 'SAGE_AMBER',
    name: '☀️ Botanical Sage & Warm Amber (เขียวใบเสจ & ส้มอำพัน)',
    shortLabel: '☀️ เสจ-อำพัน',
    dotClass: 'bg-gradient-to-tr from-emerald-600 to-amber-500',
    heroBanner:
      'bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-600 dark:from-emerald-950 dark:via-teal-900 dark:to-amber-950 border-emerald-400/30',
    heroOrbA: 'bg-white/20',
    heroOrbB: 'bg-amber-300/25',
    heroBadge: 'bg-white/20 border-white/30 text-white',
    heroCtaBtn: 'bg-white hover:bg-emerald-50 text-emerald-900',
    activeCategoryPill: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-xs',
    photoBackdrop:
      'bg-gradient-to-br from-emerald-50/55 via-white to-amber-50/55 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80',
    equipTabActive: 'bg-emerald-600 text-white shadow-xs',
    consTabActive: 'bg-amber-500 text-white shadow-xs',
    equipCardActive:
      'bg-white dark:bg-slate-900 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/25 shadow-md',
    consCardActive:
      'bg-white dark:bg-slate-900 border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/25 shadow-md',
    equipCardHover: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    consCardHover: 'hover:border-amber-300 dark:hover:border-amber-700',
    equipSelectedPill: 'bg-emerald-600',
    consSelectedPill: 'bg-amber-500',
    equipActionBtn:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs',
    consActionBtn:
      'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs',
    equipStepperWrap:
      'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    consStepperWrap:
      'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    floatingCartBar:
      'bg-gradient-to-r from-emerald-700 via-teal-700 to-amber-600 text-white border-white/20',
  },
  SAPPHIRE_CYAN: {
    key: 'SAPPHIRE_CYAN',
    name: '💎 Smart Sim-Center Sapphire (น้ำเงินแซฟไฟร์ & ฟ้าไซอัน)',
    shortLabel: '💎 แซฟไฟร์',
    dotClass: 'bg-gradient-to-tr from-blue-800 to-cyan-500',
    heroBanner:
      'bg-gradient-to-r from-blue-900 via-indigo-800 to-cyan-600 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-950 border-cyan-400/30',
    heroOrbA: 'bg-cyan-400/20',
    heroOrbB: 'bg-blue-400/20',
    heroBadge: 'bg-cyan-400/20 border-cyan-300/30 text-cyan-100',
    heroCtaBtn: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950',
    activeCategoryPill: 'bg-gradient-to-r from-blue-700 to-cyan-600 text-white font-bold shadow-xs',
    photoBackdrop:
      'bg-gradient-to-br from-sky-50/65 via-white to-indigo-50/55 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80',
    equipTabActive: 'bg-blue-700 text-white shadow-xs',
    consTabActive: 'bg-cyan-600 text-white shadow-xs',
    equipCardActive:
      'bg-white dark:bg-slate-900 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/25 shadow-md',
    consCardActive:
      'bg-white dark:bg-slate-900 border-cyan-500 dark:border-cyan-500 ring-2 ring-cyan-500/25 shadow-md',
    equipCardHover: 'hover:border-blue-300 dark:hover:border-blue-700',
    consCardHover: 'hover:border-cyan-300 dark:hover:border-cyan-700',
    equipSelectedPill: 'bg-blue-700',
    consSelectedPill: 'bg-cyan-600',
    equipActionBtn:
      'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white shadow-xs',
    consActionBtn:
      'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white shadow-xs',
    equipStepperWrap:
      'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    consStepperWrap:
      'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
    floatingCartBar:
      'bg-gradient-to-r from-blue-800 via-indigo-800 to-cyan-700 text-white border-white/20',
  },
};

export default function BorrowCatalogBrowser({
  equipmentList,
  consumablesList,
  practiceKits,
  borrowItems,
  requisitionItems,
  onUpdateBorrowItems,
  onUpdateRequisitionItems,
  readOnly = false,
  initialBorrowDate,
  initialReturnDate,
  onDatesChange,
  courses = [],
  instructors = [],
  isSimulation = true,
  simulatedRole = 'STUDENT',
  onSubmitRealRequest,
}: BorrowCatalogBrowserProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'EQUIPMENT' | 'CONSUMABLE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [hasPhotosOnly, setHasPhotosOnly] = useState(false);
  const [hasSubUnitOnly, setHasSubUnitOnly] = useState(false);
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'RECOMMENDED' | 'STOCK_DESC' | 'NAME_ASC' | 'VALUE_DESC'>(
    'RECOMMENDED'
  );
  const [showHeroBanner, setShowHeroBanner] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [cartToast, setCartToast] = useState<{
    id: number;
    message: string;
    subtext?: string;
  } | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [showKitsSection, setShowKitsSection] = useState(false);
  const [viewMode, setViewMode] = useState<'GALLERY' | 'COMPACT' | 'LIST'>('GALLERY');
  const [activePreset, setActivePreset] = useState<string>('MORNING');
  const [catalogTheme, setCatalogTheme] = useState<CatalogColorThemeKey>('MINT_OCEAN');
  const activeTheme = CATALOG_THEMES[catalogTheme] || CATALOG_THEMES.MINT_OCEAN;

  // Load wishlist and catalog color theme from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem('lab_catalog_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setWishlistIds(parsed);
      }
      const savedTheme = window.localStorage.getItem('lab_catalog_color_theme') as CatalogColorThemeKey | null;
      if (savedTheme && CATALOG_THEMES[savedTheme]) {
        setCatalogTheme(savedTheme);
      }
    } catch {}
  }, []);

  const handleSelectCatalogTheme = (themeKey: CatalogColorThemeKey) => {
    setCatalogTheme(themeKey);
    try {
      window.localStorage.setItem('lab_catalog_color_theme', themeKey);
    } catch {}
    triggerToast(`🎨 เปลี่ยนโทนสีแคตตาล็อกเป็น ${CATALOG_THEMES[themeKey].shortLabel}`);
  };

  const triggerToast = (message: string, subtext?: string) => {
    const toastId = Date.now();
    setCartToast({ id: toastId, message, subtext });
    setTimeout(() => {
      setCartToast((prev) => (prev?.id === toastId ? null : prev));
    }, 2600);
  };

  const handleToggleWishlist = (item: CatalogItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlistIds((prev) => {
      const exists = prev.includes(item.id);
      const next = exists ? prev.filter((id) => id !== item.id) : [...prev, item.id];
      try {
        window.localStorage.setItem('lab_catalog_wishlist', JSON.stringify(next));
      } catch {}
      triggerToast(
        exists ? `นำ "${item.name}" ออกจากรายการโปรด` : `❤️ บันทึก "${item.name}" ลงรายการโปรดแล้ว`,
        exists ? undefined : 'คลิกตัวกรอง "รายการโปรด" เพื่อดูเฉพาะพัสดุที่ใช้บ่อย'
      );
      return next;
    });
  };

  // Preference for items not yet in cart: cardUnitPreference[itemId] = boolean (isSubUnit)
  const [cardUnitPreference, setCardUnitPreference] = useState<Record<string, boolean>>({});

  // Image Preview Modal
  const [previewItem, setPreviewItem] = useState<CatalogItem | null>(null);

  // Custom Badge Overrides & Quick Editor State (Item-level + Per-Asset level + Sensitive Blur)
  const [badgeOverrides, setBadgeOverrides] = useState<
    Record<string, { badge: string | null; color: string | null }>
  >({});
  const [assetBadgeOverrides, setAssetBadgeOverrides] = useState<
    Record<string, { badge: string | null; color: string | null }>
  >({});
  const [blurOverrides, setBlurOverrides] = useState<
    Record<string, { isSensitive: boolean; blurPercent: number }>
  >({});
  const [revealedImages, setRevealedImages] = useState<Record<string, boolean>>({});

  const [isEditingBadge, setIsEditingBadge] = useState(false);
  const [badgeDraftText, setBadgeDraftText] = useState('');
  const [badgeDraftColor, setBadgeDraftColor] = useState('AMBER');
  const [blurDraftEnabled, setBlurDraftEnabled] = useState(false);
  const [blurDraftPercent, setBlurDraftPercent] = useState(80);
  const [savingBadge, setSavingBadge] = useState(false);

  // Per-Asset Badge Inline Editor State inside Quick View
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetBadgeDraftText, setAssetBadgeDraftText] = useState('');
  const [assetBadgeDraftColor, setAssetBadgeDraftColor] = useState('ROSE');
  const [savingAssetBadge, setSavingAssetBadge] = useState(false);

  // Sync badge & blur editor draft when previewItem opens
  useEffect(() => {
    if (previewItem) {
      const ov = badgeOverrides[previewItem.id];
      const currentText = ov !== undefined ? ov.badge || '' : previewItem.customBadge || '';
      const currentColor = ov !== undefined ? ov.color || 'AMBER' : previewItem.customBadgeColor || 'AMBER';
      setBadgeDraftText(currentText);
      setBadgeDraftColor(currentColor);

      const bState = getItemBlurState(previewItem, blurOverrides[previewItem.id]);
      setBlurDraftEnabled(bState.isSensitive);
      setBlurDraftPercent(bState.blurPercent);

      setIsEditingBadge(false);
      setEditingAssetId(null);
    }
  }, [previewItem, badgeOverrides, blurOverrides]);

  const handleSaveCustomBadge = async (
    item: CatalogItem,
    badgeVal: string | null,
    colorVal: string | null,
    isSensitiveVal?: boolean,
    blurPercentVal?: number
  ) => {
    const cleanText = badgeVal && badgeVal.trim() ? badgeVal.trim() : null;
    const cleanColor = cleanText ? colorVal || 'AMBER' : null;
    const finalSensitive =
      isSensitiveVal !== undefined ? isSensitiveVal : blurDraftEnabled;
    const finalBlurPercent = Math.min(
      100,
      Math.max(10, blurPercentVal !== undefined ? blurPercentVal : blurDraftPercent)
    );

    setSavingBadge(true);
    try {
      setBadgeOverrides((prev) => ({
        ...prev,
        [item.id]: { badge: cleanText, color: cleanColor },
      }));
      setBlurOverrides((prev) => ({
        ...prev,
        [item.id]: { isSensitive: finalSensitive, blurPercent: finalBlurPercent },
      }));

      await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customBadge: cleanText,
          customBadgeColor: cleanColor,
          isSensitiveImage: finalSensitive,
          sensitiveBlurLevel: finalBlurPercent,
        }),
      });

      triggerToast(
        `✅ บันทึกการตั้งค่า "${item.name}" แล้ว`,
        `${cleanText ? `ป้าย: ${cleanText} · ` : ''}${
          finalSensitive ? `เบลอรูปภาพ ${finalBlurPercent}%` : 'แสดงรูปภาพปกติ'
        }`
      );
      setIsEditingBadge(false);
    } catch {
      triggerToast('⚠️ ไม่สามารถบันทึกการตั้งค่าลงเซิร์ฟเวอร์ได้');
    } finally {
      setSavingBadge(false);
    }
  };

  const handleSaveAssetCustomBadge = async (
    asset: CatalogAssetItem,
    badgeVal: string | null,
    colorVal: string | null
  ) => {
    const cleanText = badgeVal && badgeVal.trim() ? badgeVal.trim() : null;
    const cleanColor = cleanText ? colorVal || 'ROSE' : null;
    setSavingAssetBadge(true);
    try {
      setAssetBadgeOverrides((prev) => ({
        ...prev,
        [asset.id]: { badge: cleanText, color: cleanColor },
      }));

      await fetch(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customBadge: cleanText,
          customBadgeColor: cleanColor,
        }),
      });

      triggerToast(
        cleanText
          ? `🏷️ ตั้งป้าย "${cleanText}" สำหรับเครื่อง "${asset.assetCode}" แล้ว`
          : `นำป้ายกำกับออกจากเครื่อง "${asset.assetCode}" แล้ว`
      );
      setEditingAssetId(null);
    } catch {
      triggerToast('⚠️ ไม่สามารถบันทึกป้ายกำกับรายชิ้นได้');
    } finally {
      setSavingAssetBadge(false);
    }
  };

  // Broken image tracker
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Real-time Date Window & Conflict State
  const getDefaultDates = () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return {
      borrow: `${y}-${m}-${d}T09:00`,
      return: `${y}-${m}-${d}T12:00`,
    };
  };

  const defaultDates = useMemo(() => getDefaultDates(), []);
  const [borrowDate, setBorrowDate] = useState<string>(initialBorrowDate || defaultDates.borrow);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(
    initialReturnDate || defaultDates.return
  );

  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [simulateConflict, setSimulateConflict] = useState(false);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, ItemAvailability>>({});
  const [selectedConflictModalItem, setSelectedConflictModalItem] =
    useState<ItemAvailability | null>(null);

  // In-Memory Cache to prevent redundant API calls when toggling date presets
  const availabilityCacheRef = useRef<Record<string, Record<string, ItemAvailability>>>({});

  // Sync with prop changes if external form updates
  useEffect(() => {
    if (initialBorrowDate) setBorrowDate(initialBorrowDate);
    if (initialReturnDate) setExpectedReturnDate(initialReturnDate);
  }, [initialBorrowDate, initialReturnDate]);

  // Fetch real-time availability when drawer is open & dates change (with caching + 400ms debounce)
  useEffect(() => {
    let isMounted = true;
    if (!isCartDrawerOpen) return;
    if (!borrowDate || !expectedReturnDate) return;

    // Check in-memory cache first (0 network calls when toggling back and forth)
    const cacheKey = `${borrowDate}_${expectedReturnDate}_${simulateConflict ? '1' : '0'}`;
    if (availabilityCacheRef.current[cacheKey]) {
      setAvailabilityMap(availabilityCacheRef.current[cacheKey]);
      setIsCheckingAvailability(false);
      return;
    }

    // Only fire if full ISO datetime is provided (e.g. YYYY-MM-DDTHH:mm is 16 chars)
    if (borrowDate.length < 16 || expectedReturnDate.length < 16) return;

    const timer = setTimeout(async () => {
      try {
        setIsCheckingAvailability(true);
        const res = await fetch(
          `/api/borrow/availability?borrowDate=${encodeURIComponent(
            borrowDate
          )}&expectedReturnDate=${encodeURIComponent(expectedReturnDate)}${
            simulateConflict ? '&simulate=true' : ''
          }`
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          const map = data.availabilityMap || {};
          availabilityCacheRef.current[cacheKey] = map;
          setAvailabilityMap(map);
        }
      } catch (err) {
        console.error('Failed to fetch borrow availability:', err);
      } finally {
        if (isMounted) setIsCheckingAvailability(false);
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isCartDrawerOpen, borrowDate, expectedReturnDate, simulateConflict]);

  // Conflict summary count
  const conflictSummary = useMemo(() => {
    let count = 0;
    const itemIds = new Set<string>();
    Object.values(availabilityMap).forEach((avail) => {
      if (avail.type === 'EQUIPMENT' && avail.conflictStatus !== 'AVAILABLE') {
        count++;
        itemIds.add(avail.itemId);
      }
    });
    return { count, itemIds };
  }, [availabilityMap]);

  // Quick preset chips handler
  const applyPresetSlot = (preset: 'MORNING' | 'AFTERNOON' | 'FULLDAY' | 'THREE_DAYS' | 'ONE_WEEK') => {
    setActivePreset(preset);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');

    let start = `${y}-${m}-${d}T09:00`;
    let end = `${y}-${m}-${d}T12:00`;

    if (preset === 'AFTERNOON') {
      start = `${y}-${m}-${d}T13:00`;
      end = `${y}-${m}-${d}T16:00`;
    } else if (preset === 'FULLDAY') {
      start = `${y}-${m}-${d}T09:00`;
      end = `${y}-${m}-${d}T16:00`;
    } else if (preset === 'THREE_DAYS') {
      const end3 = new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000);
      const y3 = end3.getFullYear();
      const m3 = String(end3.getMonth() + 1).padStart(2, '0');
      const d3 = String(end3.getDate()).padStart(2, '0');
      start = `${y}-${m}-${d}T09:00`;
      end = `${y3}-${m3}-${d3}T16:00`;
    } else if (preset === 'ONE_WEEK') {
      const end7 = new Date(tomorrow.getTime() + 6 * 24 * 60 * 60 * 1000);
      const y7 = end7.getFullYear();
      const m7 = String(end7.getMonth() + 1).padStart(2, '0');
      const d7 = String(end7.getDate()).padStart(2, '0');
      start = `${y}-${m}-${d}T09:00`;
      end = `${y7}-${m7}-${d7}T16:00`;
    }

    setBorrowDate(start);
    setExpectedReturnDate(end);
    onDatesChange?.({ borrowDate: start, expectedReturnDate: end });
  };

  // Extract unique categories across equipment and consumables
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    const all = [...equipmentList, ...consumablesList];
    all.forEach((it) => {
      const catId = it.category?.id || it.categoryId || 'OTHER';
      const catName = it.category?.name || 'อื่นๆ';
      if (!map.has(catId)) {
        map.set(catId, { id: catId, name: catName, count: 0 });
      }
      map.get(catId)!.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [equipmentList, consumablesList]);

  // Combined, Filtered & Sorted Items (E-Commerce Engine)
  const filteredItems = useMemo(() => {
    let pool: CatalogItem[] = [];
    if (activeTab === 'ALL') {
      pool = [...equipmentList, ...consumablesList];
    } else if (activeTab === 'EQUIPMENT') {
      pool = equipmentList;
    } else {
      pool = consumablesList;
    }

    const filtered = pool.filter((item) => {
      if (wishlistOnly && !wishlistIds.includes(item.id)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchBrand = (item.brand || '').toLowerCase().includes(q);
        const matchModel = (item.model || '').toLowerCase().includes(q);
        const matchLoc = (item.location || '').toLowerCase().includes(q);
        const matchStore = (item.storageLocation?.name || '').toLowerCase().includes(q);
        const matchCat = (item.category?.name || '').toLowerCase().includes(q);
        if (
          !matchName &&
          !matchCode &&
          !matchBrand &&
          !matchModel &&
          !matchLoc &&
          !matchStore &&
          !matchCat
        ) {
          return false;
        }
      }

      if (selectedCategory !== 'ALL') {
        const cId = item.category?.id || item.categoryId || 'OTHER';
        if (cId !== selectedCategory) return false;
      }

      if (inStockOnly) {
        if (item.type === 'EQUIPMENT') {
          const avail = availabilityMap[item.id];
          const stock = avail !== undefined ? avail.availableNow : item.currentStock;
          if (stock <= 0) return false;
        } else {
          const totalPieces =
            item.currentStock * (Number(item.conversionRatio) || 1) +
            (item.openPackRemainder || 0);
          if (totalPieces <= 0) return false;
        }
      }

      if (hasPhotosOnly) {
        if (!item.imageUrl || brokenImages[item.id]) return false;
      }

      if (hasSubUnitOnly) {
        const ratio = Number(item.conversionRatio) || 1;
        const hasSub = item.type === 'CONSUMABLE' && (ratio > 1 || !!item.usageUnit);
        if (!hasSub) return false;
      }

      return true;
    });

    const getEffectiveStock = (it: CatalogItem) => {
      if (it.type === 'EQUIPMENT') {
        const av = availabilityMap[it.id];
        return av !== undefined ? av.availableNow : it.currentStock;
      }
      return it.currentStock;
    };

    return [...filtered].sort((a, b) => {
      if (sortBy === 'STOCK_DESC') {
        return getEffectiveStock(b) - getEffectiveStock(a);
      }
      if (sortBy === 'NAME_ASC') {
        return a.name.localeCompare(b.name, 'th');
      }
      if (sortBy === 'VALUE_DESC') {
        return (Number(b.unitCost) || 0) - (Number(a.unitCost) || 0);
      }
      // RECOMMENDED: Photo items first -> In-stock first -> Wishlist first -> Stock desc
      const aHasImg = !!a.imageUrl && !brokenImages[a.id] ? 1 : 0;
      const bHasImg = !!b.imageUrl && !brokenImages[b.id] ? 1 : 0;
      if (bHasImg !== aHasImg) return bHasImg - aHasImg;

      const aInStock = getEffectiveStock(a) > 0 ? 1 : 0;
      const bInStock = getEffectiveStock(b) > 0 ? 1 : 0;
      if (bInStock !== aInStock) return bInStock - aInStock;

      return getEffectiveStock(b) - getEffectiveStock(a);
    });
  }, [
    equipmentList,
    consumablesList,
    activeTab,
    searchQuery,
    selectedCategory,
    inStockOnly,
    hasPhotosOnly,
    hasSubUnitOnly,
    wishlistOnly,
    wishlistIds,
    sortBy,
    brokenImages,
    availabilityMap,
  ]);

  // Total items in cart
  const totalBorrowQty = borrowItems.reduce(
    (sum, b) => (b.itemId && Number(b.quantity) > 0 ? sum + Number(b.quantity) : sum),
    0
  );
  const totalReqQty = requisitionItems.reduce(
    (sum, r) => (r.itemId && Number(r.quantity) > 0 ? sum + Number(r.quantity) : sum),
    0
  );
  const totalCartCount =
    borrowItems.filter((b) => b.itemId && Number(b.quantity) > 0).length +
    requisitionItems.filter((r) => r.itemId && Number(r.quantity) > 0).length;

  // Helper: check if item is currently in cart
  const getItemCartState = (item: CatalogItem) => {
    if (item.type === 'EQUIPMENT') {
      const found = borrowItems.find((b) => b.itemId === item.id);
      return {
        inCart: !!found && Number(found.quantity) > 0,
        quantity: found ? Number(found.quantity) || 0 : 0,
        isSubUnit: false,
        selectedAssetIds: found?.selectedAssetIds || [],
        selectedAssetCodes: found?.selectedAssetCodes || [],
      };
    } else {
      const found = requisitionItems.find((r) => r.itemId === item.id);
      const isSub = found ? !!found.isSubUnit : (cardUnitPreference[item.id] || false);
      return {
        inCart: !!found && Number(found.quantity) > 0,
        quantity: found ? Number(found.quantity) || 0 : 0,
        isSubUnit: isSub,
        selectedAssetIds: [],
        selectedAssetCodes: [],
      };
    }
  };

  // Handler: Toggle specific equipment asset selection
  const handleToggleEquipmentAsset = (item: CatalogItem, asset: CatalogAssetItem) => {
    if (readOnly || item.type !== 'EQUIPMENT') return;
    let updated = [...borrowItems];
    const idx = updated.findIndex((b) => b.itemId === item.id);
    const currentRow = idx !== -1 ? updated[idx] : null;
    const currentIds = currentRow?.selectedAssetIds ? [...currentRow.selectedAssetIds] : [];
    const currentCodes = currentRow?.selectedAssetCodes ? [...currentRow.selectedAssetCodes] : [];

    const existsIdx = currentIds.indexOf(asset.id);
    let nextIds: string[];
    let nextCodes: string[];

    if (existsIdx !== -1) {
      nextIds = currentIds.filter((id) => id !== asset.id);
      nextCodes = currentCodes.filter((_, i) => i !== existsIdx);
    } else {
      nextIds = [...currentIds, asset.id];
      nextCodes = [...currentCodes, asset.assetCode];
    }

    if (nextIds.length === 0) {
      if (idx !== -1) {
        updated = updated.filter((_, i) => i !== idx);
      }
      triggerToast(`นำ "${asset.assetCode}" ออกจากตะกร้าแล้ว`);
    } else {
      const rowData: BorrowRow = {
        itemId: item.id,
        quantity: nextIds.length,
        categoryId: item.categoryId,
        selectedAssetIds: nextIds,
        selectedAssetCodes: nextCodes,
      };
      if (idx !== -1) {
        updated[idx] = rowData;
      } else {
        updated.push(rowData);
      }
      if (existsIdx === -1) {
        triggerToast(
          `🎯 เลือกเครื่อง "${asset.assetCode}" ลงตะกร้าแล้ว`,
          `รวมเลือกเจาะจง ${nextIds.length} ${item.unit} (${nextCodes.join(', ')})`
        );
      }
    }

    onUpdateBorrowItems(updated.length > 0 ? updated : [{ itemId: '', quantity: '' }]);
  };

  // Handler: Switch preferred subunit mode
  const handleToggleSubUnit = (item: CatalogItem, isSubUnit: boolean) => {
    setCardUnitPreference((prev) => ({ ...prev, [item.id]: isSubUnit }));

    if (item.type === 'CONSUMABLE') {
      const idx = requisitionItems.findIndex((r) => r.itemId === item.id);
      if (idx !== -1 && Number(requisitionItems[idx].quantity) > 0) {
        const updated = [...requisitionItems];
        updated[idx].isSubUnit = isSubUnit;
        updated[idx].requestedUnit = isSubUnit ? (item.usageUnit || 'ชิ้น') : item.unit;
        onUpdateRequisitionItems(updated);
      }
    }
  };

  // Handler: Add or update quantity
  const handleSetItemQuantity = (item: CatalogItem, qty: number, isSubUnit?: boolean) => {
    if (readOnly) return;
    const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
    const maxPieces = item.currentStock * ratio + (item.openPackRemainder || 0);

    const activeIsSub = isSubUnit !== undefined ? isSubUnit : (cardUnitPreference[item.id] || false);

    let maxLimit = activeIsSub ? maxPieces : item.currentStock;
    if (item.type === 'EQUIPMENT') {
      const avail = availabilityMap[item.id];
      if (avail !== undefined) {
        maxLimit = avail.availableNow;
      }
    }

    const targetQty = Math.max(0, Math.min(qty, maxLimit > 0 ? maxLimit : 9999));

    if (item.type === 'EQUIPMENT') {
      let updated = [...borrowItems];
      const idx = updated.findIndex((b) => b.itemId === item.id);
      if (targetQty <= 0) {
        if (idx !== -1) updated = updated.filter((_, i) => i !== idx);
      } else {
        if (idx !== -1) {
          updated[idx].quantity = targetQty;
          if (
            Array.isArray(updated[idx].selectedAssetIds) &&
            updated[idx].selectedAssetIds!.length > targetQty
          ) {
            updated[idx].selectedAssetIds = updated[idx].selectedAssetIds!.slice(0, targetQty);
            updated[idx].selectedAssetCodes = (updated[idx].selectedAssetCodes || []).slice(
              0,
              targetQty
            );
          }
        } else {
          updated.push({ itemId: item.id, quantity: targetQty, categoryId: item.categoryId });
          triggerToast(
            `✨ เพิ่ม "${item.name}" ลงตะกร้าแล้ว`,
            `ยืมครุภัณฑ์ ${targetQty} ${item.unit}`
          );
        }
      }
      onUpdateBorrowItems(updated.length > 0 ? updated : [{ itemId: '', quantity: '' }]);
    } else {
      let updated = [...requisitionItems];
      const idx = updated.findIndex((r) => r.itemId === item.id);
      const unitLabel = activeIsSub ? (item.usageUnit || 'ชิ้น') : item.unit;

      if (targetQty <= 0) {
        if (idx !== -1) updated = updated.filter((_, i) => i !== idx);
      } else {
        if (idx !== -1) {
          updated[idx].quantity = targetQty;
          updated[idx].isSubUnit = activeIsSub;
          updated[idx].requestedUnit = unitLabel;
        } else {
          updated.push({
            itemId: item.id,
            quantity: targetQty,
            isSubUnit: activeIsSub,
            requestedUnit: unitLabel,
            categoryId: item.categoryId,
          });
          triggerToast(
            `✨ เพิ่ม "${item.name}" ลงตะกร้าแล้ว`,
            `เบิกวัสดุ ${targetQty} ${unitLabel}`
          );
        }
      }
      onUpdateRequisitionItems(
        updated.length > 0
          ? updated
          : [{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' }]
      );
    }
  };

  // 1-Click Practice Kit: add all components to cart
  const handleApplyPracticeKit = (kit: PracticeKitComponent) => {
    if (readOnly) return;
    let newBorrow = borrowItems.filter((b) => b.itemId && Number(b.quantity) > 0);
    let newReq = requisitionItems.filter((r) => r.itemId && Number(r.quantity) > 0);

    kit.items.forEach((kitComp) => {
      const it = kitComp.item;
      const neededQty = kitComp.quantity || 1;

      if (it.type === 'EQUIPMENT') {
        const bIdx = newBorrow.findIndex((b) => b.itemId === it.id);
        if (bIdx !== -1) {
          newBorrow[bIdx].quantity = Number(newBorrow[bIdx].quantity) + neededQty;
        } else {
          newBorrow.push({ itemId: it.id, quantity: neededQty });
        }
      } else {
        const rIdx = newReq.findIndex((r) => r.itemId === it.id);
        const hasSub = (Number(it.conversionRatio) || 1) > 1 && !!it.usageUnit;
        if (rIdx !== -1) {
          newReq[rIdx].quantity = Number(newReq[rIdx].quantity) + neededQty;
        } else {
          newReq.push({
            itemId: it.id,
            quantity: neededQty,
            isSubUnit: hasSub,
            requestedUnit: hasSub ? (item.usageUnitFromKit(it)) : it.unit,
          });
        }
      }
    });

    onUpdateBorrowItems(newBorrow.length > 0 ? newBorrow : [{ itemId: '', quantity: '' }]);
    onUpdateRequisitionItems(
      newReq.length > 0
        ? newReq
        : [{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' }]
    );
    setIsCartDrawerOpen(true);
  };

  const item = {
    usageUnitFromKit: (it: { usageUnit?: string | null }) => it.usageUnit || 'ชิ้น',
  };

  // Helper: check total items with photos or subunits for stat display
  const totalWithPhotos = useMemo(() => {
    return (
      equipmentList.filter((it) => !!it.imageUrl).length +
      consumablesList.filter((it) => !!it.imageUrl).length
    );
  }, [equipmentList, consumablesList]);

  const totalWithSubunits = useMemo(() => {
    return consumablesList.filter((it) => {
      const ratio = Number(it.conversionRatio) > 0 ? Number(it.conversionRatio) : 1;
      return ratio > 1 || (!!it.usageUnit && it.usageUnit !== it.unit);
    }).length;
  }, [consumablesList]);

  const hasActiveFilters =
    hasPhotosOnly ||
    hasSubUnitOnly ||
    inStockOnly ||
    wishlistOnly ||
    selectedCategory !== 'ALL' ||
    !!searchQuery.trim();

  return (
    <div className="space-y-5 relative">
      {/* Floating E-Commerce Micro-Toast Notification */}
      {cartToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-200 pointer-events-none">
          <div className="bg-slate-900/95 dark:bg-white/95 backdrop-blur-md text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-white/10 dark:border-slate-200 flex items-center gap-3 max-w-sm">
            <span className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 dark:text-teal-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div className="text-xs">
              <div className="font-black leading-snug">{cartToast.message}</div>
              {cartToast.subtext && (
                <div className="text-[10px] opacity-75 mt-0.5">{cartToast.subtext}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 0. E-Commerce Storefront Hero Showcase Banner */}
      {showHeroBanner ? (
        <div
          className={`relative rounded-3xl overflow-hidden ${activeTheme.heroBanner} text-white p-5 sm:p-6 shadow-lg border transition-colors duration-300`}
        >
          <div
            className={`absolute -right-12 -top-12 w-56 h-56 rounded-full ${activeTheme.heroOrbA} blur-3xl pointer-events-none`}
          />
          <div
            className={`absolute right-24 -bottom-16 w-48 h-48 rounded-full ${activeTheme.heroOrbB} blur-3xl pointer-events-none`}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold backdrop-blur-xs ${activeTheme.heroBadge}`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>NURSING LAB STOREFRONT • ศูนย์บริการเบิก-ยืมพัสดุออนไลน์</span>
              </div>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-white drop-shadow-2xs">
                เลือกช้อปครุภัณฑ์และเวชภัณฑ์ฝึกปฏิบัติการพยาบาลครบวงจร
              </h2>
              <p className="text-xs text-white/90 leading-relaxed">
                ค้นหาง่ายเหมือนร้านค้าออนไลน์ เช็กคิวว่างตามช่วงเวลาจริง กดดูสเปกและตำแหน่งตู้จัดเก็บ
                พร้อมบันทึก <strong className="text-white underline decoration-white/60">❤️ รายการโปรด</strong> สำหรับนิสิตที่ใช้ฝึกสอบ OSCE ประจำ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {practiceKits.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowKitsSection(!showKitsSection)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer ${activeTheme.heroCtaBtn}`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ดูเซ็ตหัตถการสำเร็จรูป ({practiceKits.length} ชุด)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHeroBanner(false)}
                title="พับเก็บแบนเนอร์"
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowHeroBanner(true)}
            className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span>แสดงแบนเนอร์แนะนำหน้าร้าน</span>
          </button>
        </div>
      )}

      {/* 1. Storefront Search & Category Navigation Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Search Bar + Type Switcher + View Mode & Practice Kits Button */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Segmented Type Tabs */}
            <div className="inline-flex rounded-2xl p-1 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 self-start">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({equipmentList.length + consumablesList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('EQUIPMENT')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'EQUIPMENT'
                    ? activeTheme.equipTabActive
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>ครุภัณฑ์ ({equipmentList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CONSUMABLE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'CONSUMABLE'
                    ? activeTheme.consTabActive
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>วัสดุสิ้นเปลือง ({consumablesList.length})</span>
              </button>
            </div>

            {/* Search Input & Action Buttons */}
            <div className="flex items-center gap-2 flex-1 lg:max-w-xl justify-end">
              <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-teal-500/40 focus-within:border-teal-500 transition">
                <Search className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อพัสดุ, รหัส, ยี่ห้อ, ตู้เก็บ..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none border-none p-0"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 1-Click Practice Kits Drawer Toggle Button */}
              {practiceKits.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowKitsSection(!showKitsSection)}
                  className={`px-3 py-2 rounded-2xl text-xs font-bold border transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    showKitsSection
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-teal-50/80 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ชุดหัตถการ ({practiceKits.length})</span>
                  {showKitsSection ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {/* Color Theme Switcher (5 Curated Palettes, Default: Mint & Ocean) */}
              <div
                className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700 shrink-0"
                title={`โทนสีปัจจุบัน: ${activeTheme.name}`}
              >
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hidden xl:inline mr-0.5">
                  🎨 โทนสี:
                </span>
                {(Object.keys(CATALOG_THEMES) as CatalogColorThemeKey[]).map((tKey) => {
                  const tMeta = CATALOG_THEMES[tKey];
                  const isCurrent = catalogTheme === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => handleSelectCatalogTheme(tKey)}
                      title={tMeta.name}
                      className={`w-4 h-4 rounded-full ${tMeta.dotClass} transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white scale-115 shadow-xs'
                          : 'opacity-55 hover:opacity-100 hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>

              {/* View Mode Switcher */}
              <div className="hidden sm:inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('GALLERY')}
                  title="มุมมองการ์ดมาตรฐาน"
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    viewMode === 'GALLERY'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('COMPACT')}
                  title="มุมมองตารางกะทัดรัด (6 คอลัมน์)"
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    viewMode === 'COMPACT'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  title="มุมมองรายการแนวนอน"
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    viewMode === 'LIST'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible 1-Click Practice Kits Showcase */}
          {showKitsSection && practiceKits.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/90 via-cyan-50/60 to-indigo-50/70 dark:from-teal-950/30 dark:via-slate-900 dark:to-indigo-950/30 border border-teal-200/80 dark:border-teal-900/60 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>ชุดฝึกหัตถการสำเร็จรูป (คลิกเดียวหยิบครบทั้งครุภัณฑ์และวัสดุ)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowKitsSection(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ซ่อนแถบนี้
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {practiceKits.map((kit) => (
                  <div
                    key={kit.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-400 transition flex flex-col justify-between gap-2.5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {kit.category || 'ชุดฝึกมาตรฐาน'}
                        </span>
                        <span className="text-teal-600 dark:text-teal-400">
                          {kit.items.length} รายการ
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">
                        {kit.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {kit.items.map((it) => it.item.name).join(', ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyPracticeKit(kit)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>หยิบทั้งชุดลงตะกร้า</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Horizontal Pills + Interactive Filter Chips */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {/* Category Pills with Medical Icons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>ทุกหมวดหมู่</span>
              </button>
              {categories.map((cat) => {
                const meta = getMedicalCategoryMeta(cat.name);
                const CatIcon = meta.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? activeTheme.activeCategoryPill
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80'
                    }`}
                  >
                    <CatIcon className="w-3.5 h-3.5 opacity-80" />
                    <span>{cat.name}</span>
                    <span className="opacity-60 text-[10px]">({cat.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Modern Interactive Filter Chips (including Wishlist ❤️) */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setWishlistOnly(!wishlistOnly)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                  wishlistOnly
                    ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-400 dark:border-rose-700 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                }`}
              >
                <Heart
                  className={`w-3 h-3 ${
                    wishlistOnly || wishlistIds.length > 0
                      ? 'text-rose-500 fill-rose-500'
                      : 'text-slate-400'
                  }`}
                />
                <span>รายการโปรด ({wishlistIds.length})</span>
                {wishlistOnly && <Check className="w-3 h-3 text-rose-600" />}
              </button>

              <button
                type="button"
                onClick={() => setHasPhotosOnly(!hasPhotosOnly)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                  hasPhotosOnly
                    ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-400 dark:border-teal-700 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>มีรูปจริง ({totalWithPhotos})</span>
                {hasPhotosOnly && <Check className="w-3 h-3 text-teal-600" />}
              </button>

              <button
                type="button"
                onClick={() => setHasSubUnitOnly(!hasSubUnitOnly)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                  hasSubUnitOnly
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-400 dark:border-indigo-700 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>แยกชิ้นได้ ({totalWithSubunits})</span>
                {hasSubUnitOnly && <Check className="w-3 h-3 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                  inStockOnly
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span>พร้อมใช้เท่านั้น</span>
                {inStockOnly && <Check className="w-3 h-3 text-emerald-600" />}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setHasPhotosOnly(false);
                    setHasSubUnitOnly(false);
                    setInStockOnly(false);
                    setWishlistOnly(false);
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                  className="px-2 py-1 rounded-full text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>ล้างตัวกรอง</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Catalog Items Grid / List + E-Commerce Sorting Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              แสดงพัสดุ <strong className="text-slate-900 dark:text-white">{filteredItems.length}</strong> รายการ
            </span>
            {totalCartCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                เลือกไว้ในตะกร้า {totalCartCount} รายการ
              </span>
            )}
          </div>

          {/* E-Commerce Sort Bar */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              <span>เรียงตาม:</span>
            </span>
            <div className="inline-flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              {[
                { id: 'RECOMMENDED', label: '🔥 แนะนำ' },
                { id: 'STOCK_DESC', label: '📦 คงเหลือมาก-น้อย' },
                { id: 'NAME_ASC', label: '🔤 ชื่อ ก-ฮ' },
                { id: 'VALUE_DESC', label: '💎 มูลค่าสูง-ต่ำ' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortBy(s.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    sortBy === s.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 space-y-3">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              ไม่พบรายการพัสดุที่ตรงกับเงื่อนไข
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              ลองล้างคำค้นหา หรือปลดตัวกรองหมวดหมู่เพื่อแสดงพัสดุทั้งหมด
            </p>
          </div>
        ) : viewMode === 'LIST' ? (
          /* LIST VIEW MODE */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
            {filteredItems.map((item) => {
              const isEquip = item.type === 'EQUIPMENT';
              const cartState = getItemCartState(item);
              const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
              const hasSubUnit = !isEquip && (ratio > 1 || !!item.usageUnit);
              const activeIsSub = cartState.isSubUnit;
              const avail = isEquip ? availabilityMap[item.id] : undefined;
              const isFullConflict = isEquip && avail && avail.conflictStatus === 'FULL';
              const effectiveStock =
                isEquip && avail !== undefined ? avail.availableNow : item.currentStock;
              const isAvailable = isEquip
                ? effectiveStock > 0
                : item.currentStock > 0 || (item.openPackRemainder || 0) > 0;
              const hasImage = !!item.imageUrl && !brokenImages[item.id];
              const catMeta = getMedicalCategoryMeta(item.category?.name, item.type);
              const CatIcon = catMeta.icon;
              const customBadge = getCustomBadgeMeta(item, badgeOverrides[item.id]);
              const blurState = getItemBlurState(item, blurOverrides[item.id]);
              const isRevealed = !!revealedImages[item.id];
              const assetPool = item.availableAssets || item.assets || [];

              return (
                <div
                  key={item.id}
                  className={`p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition ${
                    cartState.inCart
                      ? 'bg-teal-50/40 dark:bg-teal-950/20'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => setPreviewItem(item)}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 cursor-pointer relative group/thumb"
                  >
                    {hasImage ? (
                      <>
                        <img
                          src={formatImageUrl(item.imageUrl)}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                          }
                          style={
                            blurState.isSensitive && !isRevealed
                              ? {
                                  filter: `blur(${Math.max(4, Math.round(blurState.blurPx * 0.45))}px)`,
                                  transform: 'scale(1.1)',
                                }
                              : undefined
                          }
                          className="w-full h-full object-contain p-1.5 transition-all"
                        />
                        {blurState.isSensitive && !isRevealed && (
                          <span
                            title={`ภาพหุ่นกายวิภาค (เบลอ ${blurState.blurPercent}%)`}
                            className="absolute inset-0 flex items-center justify-center bg-slate-900/20 text-[10px]"
                          >
                            🩺
                          </span>
                        )}
                      </>
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${catMeta.gradient}`}>
                        <CatIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isEquip
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                        }`}
                      >
                        {isEquip ? 'ครุภัณฑ์' : 'วัสดุ'}
                      </span>
                      {customBadge && (
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border shadow-2xs ${customBadge.className}`}
                        >
                          {customBadge.label}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        {item.code}
                      </span>
                      {(item.storageLocation || item.location) && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
                          <span>{item.storageLocation?.name || item.location}</span>
                        </span>
                      )}
                      {Number(item.unitCost) > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                          มูลค่า ฿{Number(item.unitCost).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <h4
                      onClick={() => setPreviewItem(item)}
                      className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5 cursor-pointer hover:text-teal-600 transition"
                    >
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                      <span>
                        คงเหลือ:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {effectiveStock} {item.unit}
                        </strong>
                      </span>
                      {isEquip && assetPool.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer transition"
                        >
                          {cartState.selectedAssetCodes.length > 0
                            ? `🎯 เลือกชิ้น: ${cartState.selectedAssetCodes.join(', ')}`
                            : `🎯 เลือกชิ้น (${assetPool.length} ชิ้น)`}
                        </button>
                      )}
                      {hasSubUnit && (
                        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleToggleSubUnit(item, false)}
                            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                              !activeIsSub
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.unit}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSubUnit(item, true)}
                            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                              activeIsSub
                                ? 'bg-teal-600 text-white'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.usageUnit || 'ชิ้น'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="shrink-0">
                    {isFullConflict ? (
                      <button
                        type="button"
                        onClick={() => avail && setSelectedConflictModalItem(avail)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 text-xs font-bold cursor-pointer"
                      >
                        จองเต็ม (ดูคิว)
                      </button>
                    ) : cartState.inCart ? (
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleSetItemQuantity(item, cartState.quantity - 1, activeIsSub)
                          }
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center cursor-pointer shadow-2xs"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-xs font-bold px-2">
                          {cartState.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleSetItemQuantity(item, cartState.quantity + 1, activeIsSub)
                          }
                          className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSetItemQuantity(item, 1, activeIsSub)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isAvailable
                            ? isEquip
                              ? activeTheme.equipActionBtn
                              : activeTheme.consActionBtn
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เลือก</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* GALLERY & COMPACT CARD GRID */
          <div
            className={
              viewMode === 'COMPACT'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3'
                : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-5'
            }
          >
            {filteredItems.map((item) => {
              const isEquip = item.type === 'EQUIPMENT';
              const cartState = getItemCartState(item);
              const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
              const hasSubUnit = !isEquip && (ratio > 1 || !!item.usageUnit);
              const activeIsSub = cartState.isSubUnit;

              // Time-Conflict State for Equipment
              const avail = isEquip ? availabilityMap[item.id] : undefined;
              const isFullConflict = isEquip && avail && avail.conflictStatus === 'FULL';

              // Effective stock display
              const effectiveStock =
                isEquip && avail !== undefined ? avail.availableNow : item.currentStock;

              const totalPieces = !isEquip
                ? item.currentStock * ratio + (item.openPackRemainder || 0)
                : 0;

              const isAvailable = isEquip
                ? effectiveStock > 0
                : item.currentStock > 0 || (item.openPackRemainder || 0) > 0;

              const hasImage = !!item.imageUrl && !brokenImages[item.id];
              const catMeta = getMedicalCategoryMeta(item.category?.name, item.type);
              const CatIcon = catMeta.icon;
              const customBadge = getCustomBadgeMeta(item, badgeOverrides[item.id]);
              const blurState = getItemBlurState(item, blurOverrides[item.id]);
              const isRevealed = !!revealedImages[item.id];
              const isWishlisted = wishlistIds.includes(item.id);
              const unitCostNum = Number(item.unitCost) || 0;
              const assetPool = item.availableAssets || item.assets || [];
              const reservedAssetSet = new Set(avail?.reservedAssetIds || []);

              return (
                <div
                  key={item.id}
                  className={`group rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                    isFullConflict
                      ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200/90 dark:border-rose-900/60 opacity-85'
                      : cartState.inCart
                      ? isEquip
                        ? activeTheme.equipCardActive
                        : activeTheme.consCardActive
                      : `bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/90 shadow-2xs hover:shadow-xl hover:-translate-y-0.5 ${
                          isEquip ? activeTheme.equipCardHover : activeTheme.consCardHover
                        }`
                  }`}
                >
                  {/* 1. Clean Image Showcase Area */}
                  <div
                    className={`relative w-full ${
                      viewMode === 'COMPACT' ? 'aspect-square' : 'aspect-[4/3]'
                    } overflow-hidden flex items-center justify-center bg-gradient-to-b ${catMeta.gradient} border-b border-slate-100 dark:border-slate-800/80`}
                  >
                    {/* Top Left: Selected Badge OR Type Pill + Custom Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1">
                      {cartState.inCart ? (
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full text-white shadow-xs flex items-center gap-1 ${
                            isEquip ? activeTheme.equipSelectedPill : activeTheme.consSelectedPill
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>
                            {cartState.selectedAssetCodes.length > 0
                              ? `เลือก ${cartState.selectedAssetCodes.length} ชิ้น`
                              : `เลือกแล้ว ${cartState.quantity}`}
                          </span>
                        </span>
                      ) : (
                        <>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${catMeta.badge}`}
                          >
                            {isEquip ? 'ครุภัณฑ์' : 'วัสดุ'}
                          </span>
                          {customBadge && (
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full border shadow-2xs ${customBadge.className}`}
                            >
                              {customBadge.label}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Top Right: Clean Availability Pill */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {isEquip && avail ? (
                        avail.conflictStatus === 'FULL' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedConflictModalItem(avail)}
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-xs flex items-center gap-1 cursor-pointer hover:bg-rose-700"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            <span>จองเต็ม</span>
                          </button>
                        ) : avail.conflictStatus === 'PARTIALLY_AVAILABLE' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedConflictModalItem(avail)}
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs flex items-center gap-1 cursor-pointer hover:bg-amber-600"
                          >
                            <span>
                              ว่าง {avail.availableNow}/{avail.physicalCapacity}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 backdrop-blur-md shadow-2xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>
                              ว่าง {avail.availableNow} {item.unit}
                            </span>
                          </span>
                        )
                      ) : isAvailable ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 backdrop-blur-md shadow-2xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>
                            {item.currentStock} {item.unit}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/90 text-white shadow-2xs">
                          หมดสต็อก
                        </span>
                      )}
                    </div>

                    {/* Bottom Left: E-Commerce Wishlist Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleWishlist(item, e)}
                      title={isWishlisted ? 'นำออกจากรายการโปรด' : 'บันทึกเป็นรายการโปรด'}
                      className={`absolute bottom-2.5 left-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition shadow-2xs cursor-pointer backdrop-blur-md border ${
                        isWishlisted
                          ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-500'
                          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-700 text-slate-400 hover:text-rose-500'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`}
                      />
                    </button>

                    {/* Product Photo OR Boutique Medical Illustration Placeholder */}
                    {hasImage ? (
                      <div
                        onClick={() => setPreviewItem(item)}
                        className={`w-full h-full p-3 sm:p-4 flex items-center justify-center ${activeTheme.photoBackdrop} cursor-pointer relative group/photo overflow-hidden`}
                      >
                        <img
                          src={formatImageUrl(item.imageUrl)}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                          }
                          style={
                            blurState.isSensitive && !isRevealed
                              ? {
                                  filter: `blur(${blurState.blurPx}px)`,
                                  transform: 'scale(1.12)',
                                }
                              : undefined
                          }
                          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-all duration-300"
                        />

                        {/* Sensitive Medical Anatomy Privacy Shield Overlay */}
                        {blurState.isSensitive && !isRevealed ? (
                          <div className="absolute inset-0 bg-slate-900/20 dark:bg-slate-950/35 flex flex-col items-center justify-center p-2 text-center z-10">
                            <div className="px-2.5 py-1.5 rounded-2xl bg-slate-900/80 text-white backdrop-blur-md shadow-md border border-white/15 space-y-1 max-w-[90%]">
                              <div className="text-[10px] font-black leading-tight">
                                🩺 ภาพหุ่นจำลองกายวิภาค
                              </div>
                              <div className="text-[9px] text-slate-300">
                                พรางภาพอัตโนมัติ ({blurState.blurPercent}%)
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRevealedImages((prev) => ({ ...prev, [item.id]: true }));
                                }}
                                className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-[9px] font-black transition cursor-pointer"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                <span>ดูภาพจริง</span>
                              </button>
                            </div>
                          </div>
                        ) : blurState.isSensitive && isRevealed ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRevealedImages((prev) => ({ ...prev, [item.id]: false }));
                            }}
                            className="absolute bottom-2.5 right-2.5 z-10 px-2 py-1 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <EyeOff className="w-3 h-3 text-amber-400" />
                            <span>เบลอภาพกลับ</span>
                          </button>
                        ) : (
                          <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-bold opacity-0 group-hover/photo:opacity-100 transition-opacity backdrop-blur-xs flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>ดูสเปก</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => setPreviewItem(item)}
                        className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none cursor-pointer relative group/photo"
                      >
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${catMeta.iconBg} flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110 shadow-2xs`}
                        >
                          <CatIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 line-clamp-1">
                          {catMeta.label}
                        </span>
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-full bg-slate-900/75 text-white text-[10px] font-bold opacity-0 group-hover/photo:opacity-100 transition-opacity backdrop-blur-xs flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>ดูสเปก</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Clean Structured Card Body */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
                    <div className="space-y-1.5">
                      {/* Code & Storage Location Row */}
                      <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                        <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                          {item.code}
                        </span>
                        {(item.storageLocation || item.location) && (
                          <span
                            className="inline-flex items-center gap-0.5 truncate max-w-[65%] text-slate-500 dark:text-slate-400"
                            title={item.storageLocation?.name || item.location || ''}
                          >
                            <MapPin className="w-2.5 h-2.5 text-teal-500 shrink-0" />
                            <span className="truncate">
                              {item.storageLocation?.name || item.location}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Item Title */}
                      <h4
                        onClick={() => setPreviewItem(item)}
                        className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition"
                        title={item.name}
                      >
                        {item.name}
                      </h4>

                      {/* E-Commerce Value / Brand Subtitle Row */}
                      {viewMode !== 'COMPACT' && (
                        <div className="flex items-center justify-between gap-1 pt-0.5 text-[10px]">
                          <span className="text-slate-400 dark:text-slate-500 truncate">
                            {item.brand || item.model
                              ? `${item.brand || ''} ${item.model || ''}`.trim()
                              : item.category?.name || 'มาตรฐานคลินิก'}
                          </span>
                          {unitCostNum > 0 ? (
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                              มูลค่า ฿{unitCostNum.toLocaleString()}
                            </span>
                          ) : (
                            <span className="font-semibold text-teal-600 dark:text-teal-400 shrink-0">
                              เบิกฝึกฟรี
                            </span>
                          )}
                        </div>
                      )}

                      {/* Equipment Specific Asset Chip Selector (เลือกชิ้นครุภัณฑ์รายหมายเลข) */}
                      {isEquip && assetPool.length > 0 && viewMode !== 'COMPACT' && (
                        <div className="pt-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 px-0.5">
                            <span>เลือกหมายเลขชิ้น:</span>
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {cartState.selectedAssetCodes.length > 0
                                ? `เลือกไว้ ${cartState.selectedAssetCodes.length} ชิ้น`
                                : `ดูทั้งหมด (${assetPool.length})`}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {assetPool.slice(0, 4).map((asset) => {
                              const isPicked = cartState.selectedAssetIds.includes(asset.id);
                              const isRes = reservedAssetSet.has(asset.id);
                              const assetBadge = getCustomBadgeMeta(
                                asset,
                                assetBadgeOverrides[asset.id]
                              );
                              return (
                                <button
                                  key={asset.id}
                                  type="button"
                                  disabled={isRes}
                                  onClick={() => handleToggleEquipmentAsset(item, asset)}
                                  title={
                                    isRes
                                      ? `${asset.assetCode} ติดคิวจองในช่วงเวลานี้`
                                      : `คลิกเพื่อเลือก/ยกเลิกชิ้น ${asset.assetCode}${
                                          assetBadge ? ` [${assetBadge.label}]` : ''
                                        } (${
                                          asset.storageLocation?.name || asset.location || 'คลังพัสดุ'
                                        })`
                                  }
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer inline-flex items-center gap-1 ${
                                    isRes
                                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-400 line-through cursor-not-allowed'
                                      : isPicked
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                                      : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600'
                                  }`}
                                >
                                  <span>{isPicked ? `✓ ${asset.assetCode}` : asset.assetCode}</span>
                                  {assetBadge && (
                                    <span
                                      className={`px-1.5 py-0.2 rounded-full text-[8px] font-sans font-black border ${assetBadge.className}`}
                                    >
                                      {assetBadge.label}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                            {assetPool.length > 4 && (
                              <button
                                type="button"
                                onClick={() => setPreviewItem(item)}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 hover:bg-blue-100 cursor-pointer"
                              >
                                +{assetPool.length - 4} ชิ้น
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Subunit Switcher Pill (Clean iOS Segmented Style) */}
                      {hasSubUnit && viewMode !== 'COMPACT' && (
                        <div className="pt-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 px-0.5">
                            <span>เลือกหน่วยเบิก:</span>
                            <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">
                              รวม {totalPieces} {item.usageUnit || 'ชิ้น'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleToggleSubUnit(item, false)}
                              className={`py-1 rounded-lg font-bold transition cursor-pointer ${
                                !activeIsSub
                                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {item.unit} ({item.currentStock})
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSubUnit(item, true)}
                              className={`py-1 rounded-lg font-bold transition cursor-pointer ${
                                activeIsSub
                                  ? 'bg-teal-600 text-white shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {item.usageUnit || 'ชิ้น'} ({totalPieces})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-1.5">
                      {isFullConflict ? (
                        <button
                          type="button"
                          onClick={() => avail && setSelectedConflictModalItem(avail)}
                          className="w-full py-2 px-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-300 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-rose-200/60 dark:border-rose-800/50"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>ติดจองเต็ม (ดูคิว)</span>
                        </button>
                      ) : cartState.inCart ? (
                        <div
                          className={`flex items-center justify-between gap-1 rounded-2xl p-1 border ${
                            isEquip ? activeTheme.equipStepperWrap : activeTheme.consStepperWrap
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemQuantity(item, cartState.quantity - 1, activeIsSub)
                            }
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <div className="text-center font-bold text-xs font-mono text-slate-900 dark:text-white">
                            <span>{cartState.quantity}</span>
                            <span className="text-[10px] text-slate-500 font-sans ml-1">
                              {activeIsSub ? (item.usageUnit || 'ชิ้น') : item.unit}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemQuantity(item, cartState.quantity + 1, activeIsSub)
                            }
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-white flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0 ${
                              isEquip ? activeTheme.equipActionBtn : activeTheme.consActionBtn
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleSetItemQuantity(item, 1, activeIsSub)}
                          className={`w-full py-2 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            isAvailable
                              ? `${
                                  isEquip ? activeTheme.equipActionBtn : activeTheme.consActionBtn
                                } cursor-pointer`
                              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isEquip ? 'ยืมครุภัณฑ์' : 'เบิกวัสดุ'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Floating Cart Bar (Centered Bottom Floating Pill - completely separated from AI Copilot) */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] sm:w-auto max-w-md animate-in slide-in-from-bottom duration-300 pointer-events-none">
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            className={`pointer-events-auto w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 px-5 sm:px-6 py-3 sm:py-3.5 rounded-full ${activeTheme.floatingCartBar} backdrop-blur-md font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-black/10 dark:ring-white/20 border`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </span>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-black">ตะกร้าพัสดุที่เลือกไว้</div>
                <div className="text-[10px] opacity-85">
                  {totalBorrowQty > 0 && `ยืม ${totalBorrowQty} ชิ้น `}
                  {totalReqQty > 0 && `เบิก ${totalReqQty} หน่วย`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 pl-3 border-l border-white/25 text-xs text-white font-bold">
              <span>ดูรายการ</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* 4. Slide-Over Cart & Checkout Drawer (แทน Popup Modal กลางจอ 100%) */}
      <BorrowCheckoutDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        borrowItems={borrowItems}
        requisitionItems={requisitionItems}
        equipmentList={equipmentList}
        consumablesList={consumablesList}
        courses={courses}
        instructors={instructors}
        borrowDate={borrowDate}
        expectedReturnDate={expectedReturnDate}
        onChangeDates={(dates) => {
          setActivePreset('CUSTOM');
          setBorrowDate(dates.borrowDate);
          setExpectedReturnDate(dates.expectedReturnDate);
          onDatesChange?.(dates);
        }}
        activePreset={activePreset}
        onApplyPreset={applyPresetSlot}
        isCheckingAvailability={isCheckingAvailability}
        simulateConflict={simulateConflict}
        onToggleSimulateConflict={() => setSimulateConflict(!simulateConflict)}
        availabilityMap={availabilityMap}
        onUpdateBorrowItems={onUpdateBorrowItems}
        onUpdateRequisitionItems={onUpdateRequisitionItems}
        isSimulation={isSimulation}
        simulatedRole={simulatedRole}
        onSubmitRealRequest={onSubmitRealRequest}
      />

      {/* 5. Conflict Detail Modal */}
      {selectedConflictModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedConflictModalItem(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                    {selectedConflictModalItem.itemCode}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                    {selectedConflictModalItem.itemName}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConflictModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-amber-900 dark:text-amber-200">
                <div>
                  <div className="font-bold">สถานะความจุในช่วงเวลานี้:</div>
                  <div className="text-[11px] opacity-80">
                    ความจุทั้งหมด {selectedConflictModalItem.physicalCapacity}{' '}
                    {selectedConflictModalItem.unit} | ติดจองแล้ว{' '}
                    {selectedConflictModalItem.reservedCount} {selectedConflictModalItem.unit}
                  </div>
                </div>
                <span className="text-sm font-black px-2.5 py-1 rounded-xl bg-amber-200/80 dark:bg-amber-900/80">
                  ว่าง {selectedConflictModalItem.availableNow} {selectedConflictModalItem.unit}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    รายการที่จองใช้งานซ้อนทับในช่วงเวลานี้ (
                    {selectedConflictModalItem.conflicts.length} รายการ):
                  </span>
                </h4>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedConflictModalItem.conflicts.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">ไม่มีรายการซ้อนทับ</p>
                  ) : (
                    selectedConflictModalItem.conflicts.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {c.requestNumber}
                          </span>
                          <span className="font-bold text-amber-600 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded text-[10px]">
                            {c.status === 'BORROWED'
                              ? 'กำลังยืมอยู่'
                              : c.status === 'APPROVED'
                              ? 'อนุมัติแล้ว'
                              : 'รออนุมัติ'}{' '}
                            ({c.quantity} {selectedConflictModalItem.unit})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ผู้ขอ:{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {c.requesterName}
                          </span>{' '}
                          ({c.requesterRole === 'USER' ? 'นิสิต' : 'อาจารย์'})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ช่วงเวลา: {formatBangkokDateTime(c.borrowDate)} ถึง{' '}
                          {formatBangkokDateTime(c.expectedReturnDate)}
                        </div>
                        {c.purpose && (
                          <div className="text-[10px] text-slate-400 italic">
                            วัตถุประสงค์: {c.purpose}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedConflictModalItem(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. E-Commerce Product Quick View Modal (หน้าต่างดูสเปกและหยิบใส่ตะกร้าแบบเว็บขายของ) */}
      {previewItem &&
        (() => {
          const isEquip = previewItem.type === 'EQUIPMENT';
          const cartState = getItemCartState(previewItem);
          const ratio =
            Number(previewItem.conversionRatio) > 0 ? Number(previewItem.conversionRatio) : 1;
          const hasSubUnit = !isEquip && (ratio > 1 || !!previewItem.usageUnit);
          const activeIsSub = cartState.isSubUnit;
          const avail = isEquip ? availabilityMap[previewItem.id] : undefined;
          const isFullConflict = isEquip && avail && avail.conflictStatus === 'FULL';
          const effectiveStock =
            isEquip && avail !== undefined ? avail.availableNow : previewItem.currentStock;
          const totalPieces = !isEquip
            ? previewItem.currentStock * ratio + (previewItem.openPackRemainder || 0)
            : 0;
          const isAvailable = isEquip
            ? effectiveStock > 0
            : previewItem.currentStock > 0 || (previewItem.openPackRemainder || 0) > 0;
          const hasImage = !!previewItem.imageUrl && !brokenImages[previewItem.id];
          const catMeta = getMedicalCategoryMeta(previewItem.category?.name, previewItem.type);
          const CatIcon = catMeta.icon;
          const customBadge = getCustomBadgeMeta(previewItem, badgeOverrides[previewItem.id]);
          const baseBlurState = getItemBlurState(previewItem, blurOverrides[previewItem.id]);
          const activeBlurSensitive = isEditingBadge
            ? blurDraftEnabled
            : baseBlurState.isSensitive;
          const activeBlurPercent = isEditingBadge
            ? blurDraftPercent
            : baseBlurState.blurPercent;
          const activeBlurPx = Math.max(3, Math.round((activeBlurPercent / 100) * 32));
          const isModalImageRevealed = !!revealedImages[previewItem.id];
          const isWishlisted = wishlistIds.includes(previewItem.id);
          const unitCostNum = Number(previewItem.unitCost) || 0;
          const assetPool = isEquip ? previewItem.availableAssets || previewItem.assets || [] : [];
          const reservedSet = new Set(avail?.reservedAssetIds || []);

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
              onClick={() => setPreviewItem(null)}
            >
              <div
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left Column: Product Showcase Gallery */}
                <div
                  className={`md:w-1/2 p-6 flex flex-col justify-between bg-gradient-to-b ${catMeta.gradient} border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 relative min-h-[260px]`}
                >
                  {/* Top Badges & Wishlist */}
                  <div className="flex items-start justify-between gap-2 z-10">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-md ${catMeta.badge}`}
                      >
                        {isEquip ? 'ครุภัณฑ์ยืม-คืน' : 'วัสดุสิ้นเปลือง'}
                      </span>
                      {customBadge && (
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-2xs ${customBadge.className}`}
                        >
                          {customBadge.label}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingBadge((v) => !v)}
                        className="text-[10px] font-bold px-2 py-1 rounded-full border border-slate-300/80 dark:border-slate-700 bg-white/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:text-amber-600 transition cursor-pointer"
                        title="ตั้งค่าป้ายกำกับพัสดุและระดับการเบลอรูปภาพ"
                      >
                        🏷️ {customBadge ? 'แก้ป้าย' : '+ ตั้งป้าย'} / 🔞 เบลอรูป
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleWishlist(previewItem, e)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border transition cursor-pointer ${
                        isWishlisted
                          ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-600'
                          : 'bg-white/90 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-500'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isWishlisted ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                      <span>{isWishlisted ? 'บันทึกแล้ว' : 'รายการโปรด'}</span>
                    </button>
                  </div>

                  {/* Center Image / Illustration */}
                  <div className="my-4 flex items-center justify-center flex-1 relative overflow-hidden rounded-2xl">
                    {hasImage ? (
                      <div className="relative flex items-center justify-center w-full h-full">
                        <img
                          src={formatImageUrl(previewItem.imageUrl)}
                          alt={previewItem.name}
                          referrerPolicy="no-referrer"
                          style={
                            activeBlurSensitive && !isModalImageRevealed
                              ? {
                                  filter: `blur(${activeBlurPx}px)`,
                                  transform: 'scale(1.08)',
                                }
                              : undefined
                          }
                          className="max-h-[260px] max-w-full object-contain rounded-2xl drop-shadow-md transition-all duration-200"
                        />
                        {activeBlurSensitive && !isModalImageRevealed ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                            <div className="px-4 py-3 rounded-2xl bg-slate-900/85 text-white backdrop-blur-md shadow-xl border border-white/15 space-y-1.5 max-w-xs">
                              <div className="text-xs font-black">
                                🩺 ภาพหุ่นจำลองทางกายวิภาค
                              </div>
                              <p className="text-[10px] text-slate-300">
                                พรางภาพอัตโนมัติที่ความเบลอ {activeBlurPercent}% เพื่อความเหมาะสมในพื้นที่สาธารณะ
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedImages((prev) => ({
                                    ...prev,
                                    [previewItem.id]: true,
                                  }))
                                }
                                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-[11px] font-black transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>กดดูภาพจริง</span>
                              </button>
                            </div>
                          </div>
                        ) : activeBlurSensitive && isModalImageRevealed ? (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedImages((prev) => ({
                                ...prev,
                                [previewItem.id]: false,
                              }))
                            }
                            className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md"
                          >
                            <EyeOff className="w-3 h-3 text-amber-400" />
                            <span>เบลอภาพกลับ ({activeBlurPercent}%)</span>
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div
                          className={`w-20 h-20 rounded-3xl ${catMeta.iconBg} flex items-center justify-center mx-auto mb-3 shadow-sm`}
                        >
                          <CatIcon className="w-10 h-10" />
                        </div>
                        <p className="text-xs font-bold text-slate-500">{catMeta.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          ภาพสัญลักษณ์มาตรฐานประจำหมวดหมู่
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Photo Link */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                    <span>รหัสอ้างอิง: {previewItem.code}</span>
                    {previewItem.imageUrl && (
                      <a
                        href={previewItem.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-bold"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>เปิดภาพขนาดเต็ม</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Right Column: E-Commerce Product Specs & Direct Cart Controls */}
                <div className="md:w-1/2 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-3.5">
                    {/* Header & Close Button */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                          {previewItem.category?.name || catMeta.label}
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug mt-0.5">
                          {previewItem.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewItem(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Custom Badge & Sensitive Image Blur Configuration Panel */}
                    {isEditingBadge && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-3 animate-in fade-in duration-150">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-amber-900 dark:text-amber-200">
                              🏷️ 1. ป้ายกำกับรายการพัสดุหลัก (Item Badge)
                            </span>
                            <span className="text-[10px] text-slate-400">
                              เว้นว่าง = ไม่แสดงป้าย
                            </span>
                          </div>

                          {/* Quick Preset Chips */}
                          <div className="flex flex-wrap gap-1">
                            {[
                              { text: '🔥 ยอดนิยม', color: 'AMBER' },
                              { text: '✨ แนะนำ', color: 'EMERALD' },
                              { text: '🎯 ใช้สอบ OSCE', color: 'ROSE' },
                              { text: '🆕 มาใหม่', color: 'INDIGO' },
                            ].map((p) => (
                              <button
                                key={p.text}
                                type="button"
                                onClick={() => {
                                  setBadgeDraftText(p.text);
                                  setBadgeDraftColor(p.color);
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400 cursor-pointer"
                              >
                                {p.text}
                              </button>
                            ))}
                            {(customBadge || badgeDraftText) && (
                              <button
                                type="button"
                                onClick={() => setBadgeDraftText('')}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-800 cursor-pointer"
                              >
                                ✕ ล้างป้าย
                              </button>
                            )}
                          </div>

                          {/* Custom Text & Color Swatches */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={28}
                              value={badgeDraftText}
                              onChange={(e) => setBadgeDraftText(e.target.value)}
                              placeholder="พิมพ์ข้อความป้ายเอง เช่น 🔥 ยอดนิยม..."
                              className="flex-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              {[
                                { key: 'AMBER', cls: 'bg-amber-500' },
                                { key: 'ROSE', cls: 'bg-rose-600' },
                                { key: 'EMERALD', cls: 'bg-emerald-600' },
                                { key: 'INDIGO', cls: 'bg-indigo-600' },
                                { key: 'PURPLE', cls: 'bg-purple-600' },
                              ].map((sw) => (
                                <button
                                  key={sw.key}
                                  type="button"
                                  onClick={() => setBadgeDraftColor(sw.key)}
                                  className={`w-5 h-5 rounded-full ${sw.cls} transition cursor-pointer ${
                                    badgeDraftColor === sw.key
                                      ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white scale-110'
                                      : 'opacity-65 hover:opacity-100'
                                  }`}
                                  title={`สี ${sw.key}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Sensitive Image Blur Configuration with Selectable % */}
                        <div className="pt-2.5 border-t border-amber-200/70 dark:border-amber-800/60 space-y-2">
                          <label className="flex items-center justify-between gap-2 cursor-pointer">
                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                              🔞 2. เปิดเบลอรูปภาพรายการนี้ (กดเปิด/ปิดเอง)
                            </span>
                            <input
                              type="checkbox"
                              checked={blurDraftEnabled}
                              onChange={(e) => {
                                setBlurDraftEnabled(e.target.checked);
                                if (e.target.checked) {
                                  setRevealedImages((prev) => ({
                                    ...prev,
                                    [previewItem.id]: false,
                                  }));
                                }
                              }}
                              className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                            />
                          </label>

                          {blurDraftEnabled && (
                            <div className="space-y-1.5 bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-amber-200/60 dark:border-slate-700">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-slate-600 dark:text-slate-300">
                                  เลือกระดับความเบลอของภาพ:
                                </span>
                                <span className="font-mono font-black text-teal-600 dark:text-teal-400">
                                  เบลอ {blurDraftPercent}%
                                </span>
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {[
                                  { pct: 50, label: '50% (เบา)' },
                                  { pct: 65, label: '65% (กลาง)' },
                                  { pct: 80, label: '80% (แนะนำ)' },
                                  { pct: 95, label: '95% (ทึบ)' },
                                ].map((lv) => (
                                  <button
                                    key={lv.pct}
                                    type="button"
                                    onClick={() => {
                                      setBlurDraftPercent(lv.pct);
                                      setRevealedImages((prev) => ({
                                        ...prev,
                                        [previewItem.id]: false,
                                      }));
                                    }}
                                    className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                      blurDraftPercent === lv.pct
                                        ? 'bg-teal-600 text-white border-teal-600'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                                    }`}
                                  >
                                    {lv.label}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="range"
                                min={10}
                                max={100}
                                step={5}
                                value={blurDraftPercent}
                                onChange={(e) => {
                                  setBlurDraftPercent(Number(e.target.value));
                                  setRevealedImages((prev) => ({
                                    ...prev,
                                    [previewItem.id]: false,
                                  }));
                                }}
                                className="w-full accent-teal-600 cursor-pointer h-1.5"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsEditingBadge(false)}
                            className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-200/60 transition cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            disabled={savingBadge}
                            onClick={() =>
                              handleSaveCustomBadge(
                                previewItem,
                                badgeDraftText,
                                badgeDraftColor,
                                blurDraftEnabled,
                                blurDraftPercent
                              )
                            }
                            className="px-3.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black transition cursor-pointer shadow-2xs"
                          >
                            {savingBadge ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* E-Commerce Value / Price Tag Strip */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400">
                          {unitCostNum > 0 ? 'มูลค่าอ้างอิงพัสดุต่อหน่วย' : 'สิทธิ์การเบิก-ยืม'}
                        </div>
                        <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {unitCostNum > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-mono">
                              ฿{unitCostNum.toLocaleString()}
                              <span className="text-xs font-sans font-normal text-slate-500">
                                {' '}
                                / {previewItem.unit}
                              </span>
                            </span>
                          ) : (
                            <span className="text-teal-600 dark:text-teal-400">
                              สวัสดิการฝึกปฏิบัติการพยาบาล (เบิกฟรี)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400">สถานะคงเหลือ</div>
                        <div
                          className={`text-xs font-black ${
                            isAvailable
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-500'
                          }`}
                        >
                          {isAvailable
                            ? `พร้อมใช้ ${effectiveStock} ${previewItem.unit}`
                            : 'หมดชั่วคราว'}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Specifications Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] text-slate-400">ยี่ห้อ / รุ่น</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                          {previewItem.brand || previewItem.model
                            ? `${previewItem.brand || ''} ${previewItem.model || ''}`.trim()
                            : 'มาตรฐานห้องปฏิบัติการ'}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] text-slate-400">ตำแหน่งตู้จัดเก็บ</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
                          <span className="truncate">
                            {previewItem.storageLocation?.name ||
                              previewItem.location ||
                              'เคาน์เตอร์จ่ายพัสดุกลาง'}
                          </span>
                        </div>
                      </div>

                      {previewItem.storageLocation?.roomName && (
                        <div className="col-span-2 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">
                            ห้อง: <strong>{previewItem.storageLocation.roomName}</strong>
                            {previewItem.storageLocation.floor
                              ? ` (ชั้น ${previewItem.storageLocation.floor})`
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Clinical Care & Borrowing Note for Students */}
                    <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>คำแนะนำการเบิกและดูแลรักษาสำหรับนิสิต</span>
                      </div>
                      <p className="leading-relaxed text-[10px] opacity-90">
                        {isEquip
                          ? 'กรุณาตรวจสอบความสมบูรณ์ของครุภัณฑ์ก่อนรับและทำความสะอาดหลังฝึกปฏิบัติการทุกครั้ง หากพบความชำรุดให้แจ้งเจ้าหน้าที่ทันที'
                          : 'วัสดุสิ้นเปลืองสามารถเลือกเบิกเป็นหน่วยใหญ่หรือแบ่งเบิกตามจำนวนชิ้นที่ใช้ฝึกจริง เพื่อความประหยัดและคุ้มค่า'}
                      </p>
                    </div>

                    {/* Specific Equipment Asset Selector & Per-Asset Custom Badge inside Quick View */}
                    {isEquip && assetPool.length > 0 && (
                      <div className="space-y-2 p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                            🎯 เลือกเครื่องครุภัณฑ์รายชิ้น ({assetPool.length} ชิ้น)
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {cartState.selectedAssetCodes.length > 0
                              ? `เจาะจงแล้ว ${cartState.selectedAssetCodes.length} ชิ้น`
                              : 'คลิกรหัสเพื่อเลือกชิ้น · กด 🏷️ เพื่อตั้งป้ายแยกชิ้น'}
                          </span>
                        </div>

                        {/* Inline Per-Asset Badge Customizer when an asset's 🏷️ button is clicked */}
                        {editingAssetId &&
                          (() => {
                            const targetAsset = assetPool.find((a) => a.id === editingAssetId);
                            if (!targetAsset) return null;
                            const existingAssetBadge = getCustomBadgeMeta(
                              targetAsset,
                              assetBadgeOverrides[targetAsset.id]
                            );
                            return (
                              <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-amber-900 dark:text-amber-200">
                                    🏷️ ตั้งป้ายเฉพาะเครื่อง:{' '}
                                    <span className="font-mono underline">
                                      {targetAsset.assetCode}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingAssetId(null)}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    ✕ ปิด
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    { text: '🎯 ใช้สอบ OSCE', color: 'ROSE' },
                                    { text: '🆕 เครื่องใหม่', color: 'EMERALD' },
                                    { text: '✨ แนะนำ', color: 'AMBER' },
                                    { text: '⚠️ ใช้เฉพาะในแล็บ', color: 'PURPLE' },
                                  ].map((p) => (
                                    <button
                                      key={p.text}
                                      type="button"
                                      onClick={() => {
                                        setAssetBadgeDraftText(p.text);
                                        setAssetBadgeDraftColor(p.color);
                                      }}
                                      className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400 cursor-pointer"
                                    >
                                      {p.text}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    maxLength={24}
                                    value={assetBadgeDraftText}
                                    onChange={(e) => setAssetBadgeDraftText(e.target.value)}
                                    placeholder={`พิมพ์ป้ายสำหรับ ${targetAsset.assetCode}...`}
                                    className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-900 dark:text-white"
                                  />
                                  <div className="flex items-center gap-1 shrink-0">
                                    {[
                                      { key: 'ROSE', cls: 'bg-rose-600' },
                                      { key: 'AMBER', cls: 'bg-amber-500' },
                                      { key: 'EMERALD', cls: 'bg-emerald-600' },
                                      { key: 'INDIGO', cls: 'bg-indigo-600' },
                                      { key: 'PURPLE', cls: 'bg-purple-600' },
                                    ].map((sw) => (
                                      <button
                                        key={sw.key}
                                        type="button"
                                        onClick={() => setAssetBadgeDraftColor(sw.key)}
                                        className={`w-4 h-4 rounded-full ${sw.cls} cursor-pointer ${
                                          assetBadgeDraftColor === sw.key
                                            ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white'
                                            : 'opacity-60'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
                                  {(existingAssetBadge || assetBadgeDraftText) && (
                                    <button
                                      type="button"
                                      disabled={savingAssetBadge}
                                      onClick={() =>
                                        handleSaveAssetCustomBadge(targetAsset, null, null)
                                      }
                                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-100/70 cursor-pointer"
                                    >
                                      ลบป้ายชิ้นนี้ออก
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={savingAssetBadge}
                                    onClick={() =>
                                      handleSaveAssetCustomBadge(
                                        targetAsset,
                                        assetBadgeDraftText,
                                        assetBadgeDraftColor
                                      )
                                    }
                                    className="px-2.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black cursor-pointer"
                                  >
                                    {savingAssetBadge ? 'กำลังบันทึก...' : 'บันทึกป้ายชิ้นนี้'}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                          {assetPool.map((asset) => {
                            const isPicked = cartState.selectedAssetIds.includes(asset.id);
                            const isReserved = reservedSet.has(asset.id);
                            const condLabel =
                              asset.condition === 'FAIR' ? 'พอใช้' : 'สภาพดี';
                            const locLabel =
                              asset.storageLocation?.name ||
                              asset.location ||
                              previewItem.storageLocation?.name ||
                              previewItem.location ||
                              'พร้อมจ่าย';
                            const assetBadge = getCustomBadgeMeta(
                              asset,
                              assetBadgeOverrides[asset.id]
                            );
                            return (
                              <div
                                key={asset.id}
                                className={`p-2 rounded-xl border text-left transition flex items-center justify-between gap-1.5 ${
                                  isReserved
                                    ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                                    : isPicked
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                                }`}
                              >
                                <button
                                  type="button"
                                  disabled={isReserved}
                                  onClick={() => handleToggleEquipmentAsset(previewItem, asset)}
                                  className="min-w-0 flex-1 text-left cursor-pointer"
                                >
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="font-mono text-[11px] font-black truncate">
                                      {asset.assetCode}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                        isPicked
                                          ? 'bg-white/20 text-white'
                                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                      }`}
                                    >
                                      {isReserved ? 'ติดจอง' : condLabel}
                                    </span>
                                    {assetBadge && (
                                      <span
                                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border ${assetBadge.className}`}
                                      >
                                        {assetBadge.label}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={`text-[10px] truncate mt-0.5 ${
                                      isPicked ? 'text-blue-100' : 'text-slate-400'
                                    }`}
                                  >
                                    📍 {locLabel}
                                  </div>
                                </button>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const ov = assetBadgeOverrides[asset.id];
                                      setAssetBadgeDraftText(
                                        ov !== undefined
                                          ? ov.badge || ''
                                          : asset.customBadge || ''
                                      );
                                      setAssetBadgeDraftColor(
                                        ov !== undefined
                                          ? ov.color || 'ROSE'
                                          : asset.customBadgeColor || 'ROSE'
                                      );
                                      setEditingAssetId((prev) =>
                                        prev === asset.id ? null : asset.id
                                      );
                                    }}
                                    title={`ตั้งป้ายกำกับเฉพาะเครื่อง ${asset.assetCode}`}
                                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] transition cursor-pointer ${
                                      isPicked
                                        ? 'bg-white/20 hover:bg-white/30 text-white'
                                        : 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-600 border border-amber-200/70 dark:border-amber-800'
                                    }`}
                                  >
                                    🏷️
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isReserved}
                                    onClick={() => handleToggleEquipmentAsset(previewItem, asset)}
                                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 cursor-pointer ${
                                      isPicked
                                        ? 'bg-white text-blue-600'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {isPicked ? '✓' : '+'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sub-Unit Switcher inside Quick View */}
                    {hasSubUnit && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-bold">เลือกรูปแบบหน่วยที่ต้องการเบิก:</span>
                          <span className="font-mono">
                            1 {previewItem.unit} = {ratio} {previewItem.usageUnit || 'ชิ้น'} (รวม{' '}
                            {totalPieces} {previewItem.usageUnit || 'ชิ้น'})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleSubUnit(previewItem, false)}
                            className={`py-1.5 rounded-lg font-bold transition cursor-pointer ${
                              !activeIsSub
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-500'
                            }`}
                          >
                            เบิกยก{previewItem.unit} ({previewItem.currentStock})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSubUnit(previewItem, true)}
                            className={`py-1.5 rounded-lg font-bold transition cursor-pointer ${
                              activeIsSub
                                ? 'bg-teal-600 text-white shadow-2xs'
                                : 'text-slate-500'
                            }`}
                          >
                            แบ่งเบิกเป็น{previewItem.usageUnit || 'ชิ้น'} ({totalPieces})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Direct Add-to-Cart Bar inside Quick View */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                    {isFullConflict ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewItem(null);
                          if (avail) setSelectedConflictModalItem(avail);
                        }}
                        className="w-full py-2.5 px-4 rounded-2xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                      >
                        ติดจองเต็มในช่วงเวลานี้ (คลิกดูคิว)
                      </button>
                    ) : cartState.inCart ? (
                      <>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemQuantity(
                                previewItem,
                                cartState.quantity - 1,
                                activeIsSub
                              )
                            }
                            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-mono text-xs font-black px-2">
                            {cartState.quantity}{' '}
                            {activeIsSub ? previewItem.usageUnit || 'ชิ้น' : previewItem.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemQuantity(
                                previewItem,
                                cartState.quantity + 1,
                                activeIsSub
                              )
                            }
                            className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setPreviewItem(null);
                            setIsCartDrawerOpen(true);
                          }}
                          className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <ShoppingCart className="w-4 h-4 text-teal-400 dark:text-teal-600" />
                          <span>เปิดดูตะกร้าพัสดุ</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSetItemQuantity(previewItem, 1, activeIsSub)}
                        className={`w-full py-3 px-4 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 ${
                          isAvailable
                            ? isEquip
                              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md'
                              : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-md'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>
                          {isAvailable
                            ? isEquip
                              ? 'หยิบครุภัณฑ์นี้ลงตะกร้ายืม'
                              : 'หยิบวัสดุนี้ลงตะกร้าเบิก'
                            : 'สินค้าหมดชั่วคราว'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
