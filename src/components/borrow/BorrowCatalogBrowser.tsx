'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { formatImageUrl } from '@/lib/image-helper';
import { formatBangkokDateTime } from '@/lib/date-time-utils';

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
  categoryId?: string;
  category?: { id: string; name: string };
  isBorrowable?: boolean;
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
}: BorrowCatalogBrowserProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'EQUIPMENT' | 'CONSUMABLE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [hasPhotosOnly, setHasPhotosOnly] = useState(false);
  const [hasSubUnitOnly, setHasSubUnitOnly] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [showKitsSection, setShowKitsSection] = useState(false);
  const [viewMode, setViewMode] = useState<'GALLERY' | 'COMPACT' | 'LIST'>('GALLERY');
  const [activePreset, setActivePreset] = useState<string>('MORNING');

  // Preference for items not yet in cart: cardUnitPreference[itemId] = boolean (isSubUnit)
  const [cardUnitPreference, setCardUnitPreference] = useState<Record<string, boolean>>({});

  // Image Preview Modal
  const [previewItem, setPreviewItem] = useState<CatalogItem | null>(null);

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

  // Sync with prop changes if external form updates
  useEffect(() => {
    if (initialBorrowDate) setBorrowDate(initialBorrowDate);
    if (initialReturnDate) setExpectedReturnDate(initialReturnDate);
  }, [initialBorrowDate, initialReturnDate]);

  // Fetch real-time availability on date changes
  useEffect(() => {
    let isMounted = true;
    if (!borrowDate || !expectedReturnDate) return;

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
          setAvailabilityMap(data.availabilityMap || {});
        }
      } catch (err) {
        console.error('Failed to fetch borrow availability:', err);
      } finally {
        if (isMounted) setIsCheckingAvailability(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [borrowDate, expectedReturnDate, simulateConflict]);

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

  // Combined & Filtered Items
  const filteredItems = useMemo(() => {
    let pool: CatalogItem[] = [];
    if (activeTab === 'ALL') {
      pool = [...equipmentList, ...consumablesList];
    } else if (activeTab === 'EQUIPMENT') {
      pool = equipmentList;
    } else {
      pool = consumablesList;
    }

    return pool.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchBrand = (item.brand || '').toLowerCase().includes(q);
        const matchModel = (item.model || '').toLowerCase().includes(q);
        const matchLoc = (item.location || '').toLowerCase().includes(q);
        const matchStore = (item.storageLocation?.name || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBrand && !matchModel && !matchLoc && !matchStore) {
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
  }, [
    equipmentList,
    consumablesList,
    activeTab,
    searchQuery,
    selectedCategory,
    inStockOnly,
    hasPhotosOnly,
    hasSubUnitOnly,
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
      };
    } else {
      const found = requisitionItems.find((r) => r.itemId === item.id);
      const isSub = found ? !!found.isSubUnit : (cardUnitPreference[item.id] || false);
      return {
        inCart: !!found && Number(found.quantity) > 0,
        quantity: found ? Number(found.quantity) || 0 : 0,
        isSubUnit: isSub,
      };
    }
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
        } else {
          updated.push({ itemId: item.id, quantity: targetQty, categoryId: item.categoryId });
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
    selectedCategory !== 'ALL' ||
    !!searchQuery.trim();

  return (
    <div className="space-y-5">
      {/* 1. Unified Command & Time-Window Studio Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Top Row: Time-Window Selector Bar (Sleek Minimalist Strip) */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-slate-50 via-blue-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-800/60 dark:to-slate-900 border-b border-slate-200/70 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: Status & Date Pickers */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 pr-1">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    ช่วงเวลายืม-คืน
                  </span>
                  {isCheckingAvailability ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 animate-pulse">
                      กำลังเช็กคิว...
                    </span>
                  ) : conflictSummary.count > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                      <span>ติดจอง {conflictSummary.count} รายการ</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                      <span>พร้อมยืมทุกชิ้น</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Date Inputs */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400">รับ:</span>
              <input
                type="datetime-local"
                value={borrowDate}
                onChange={(e) => {
                  setActivePreset('CUSTOM');
                  setBorrowDate(e.target.value);
                  onDatesChange?.({ borrowDate: e.target.value, expectedReturnDate });
                }}
                className="bg-transparent text-slate-800 dark:text-slate-100 font-semibold focus:outline-none text-xs cursor-pointer"
              />
              <span className="text-slate-300 dark:text-slate-600 px-0.5">→</span>
              <span className="text-[11px] font-bold text-slate-400">คืน:</span>
              <input
                type="datetime-local"
                value={expectedReturnDate}
                onChange={(e) => {
                  setActivePreset('CUSTOM');
                  setExpectedReturnDate(e.target.value);
                  onDatesChange?.({ borrowDate, expectedReturnDate: e.target.value });
                }}
                className="bg-transparent text-slate-800 dark:text-slate-100 font-semibold focus:outline-none text-xs cursor-pointer"
              />
            </div>
          </div>

          {/* Right: Preset Pills & Simulation Toggle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'MORNING', label: '🌅 พรุ่งนี้เช้า' },
              { id: 'AFTERNOON', label: '☀️ พรุ่งนี้บ่าย' },
              { id: 'FULLDAY', label: '⏳ เต็มวัน' },
              { id: 'THREE_DAYS', label: '🗓️ 3 วัน' },
              { id: 'ONE_WEEK', label: '📅 1 สัปดาห์' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPresetSlot(p.id as any)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  activePreset === p.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block" />

            <button
              type="button"
              onClick={() => setSimulateConflict(!simulateConflict)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border ${
                simulateConflict
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
              title="คลิกเพื่อจำลองเหตุการณ์ที่มีผู้อื่นจองอุปกรณ์ชนเวลา"
            >
              <FlaskConical className="w-3 h-3" />
              <span>{simulateConflict ? 'จำลองคิวชน: เปิด' : 'จำลองคิวชน'}</span>
            </button>
          </div>
        </div>

        {/* Middle Row: Search Bar + Type Switcher + View Mode & Practice Kits Button */}
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>วัสดุสิ้นเปลือง ({consumablesList.length})</span>
              </button>
            </div>

            {/* Search Input & Action Buttons */}
            <div className="flex items-center gap-2 flex-1 lg:max-w-xl justify-end">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อพัสดุ, รหัส, ยี่ห้อ, ตู้เก็บ..."
                  className="w-full pl-9.5 pr-8 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80'
                }`}
              >
                ทุกหมวดหมู่
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-teal-600 text-white font-bold shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80'
                  }`}
                >
                  {cat.name} <span className="opacity-60 text-[10px]">({cat.count})</span>
                </button>
              ))}
            </div>

            {/* Modern Interactive Filter Chips (Replacing old Checkboxes) */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
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

      {/* 2. Catalog Items Grid / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <span>
              แสดงพัสดุ <strong className="text-slate-900 dark:text-white">{filteredItems.length}</strong> รายการ
            </span>
            {totalCartCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                เลือกไว้ในตะกร้า {totalCartCount} รายการ
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            คลิกที่รูปเพื่อขยายดูภาพใหญ่ • สลับหน่วย กล่อง/ชิ้น ได้บนการ์ด
          </span>
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
                    onClick={() => hasImage && setPreviewItem(item)}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 ${
                      hasImage ? 'cursor-pointer' : ''
                    }`}
                  >
                    {hasImage ? (
                      <img
                        src={formatImageUrl(item.imageUrl)}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="w-full h-full object-contain p-1.5"
                      />
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
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        {item.code}
                      </span>
                      {(item.storageLocation || item.location) && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
                          <span>{item.storageLocation?.name || item.location}</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      <span>
                        คงเหลือ:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {effectiveStock} {item.unit}
                        </strong>
                      </span>
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
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-teal-600 hover:bg-teal-700 text-white'
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

              return (
                <div
                  key={item.id}
                  className={`group rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                    isFullConflict
                      ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200/90 dark:border-rose-900/60 opacity-85'
                      : cartState.inCart
                      ? isEquip
                        ? 'bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'bg-white dark:bg-slate-900 border-teal-500 dark:border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/90 shadow-2xs hover:shadow-xl hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* 1. Clean Image Showcase Area (No dark bottom bar blocking the photo!) */}
                  <div
                    className={`relative w-full ${
                      viewMode === 'COMPACT' ? 'aspect-square' : 'aspect-[4/3]'
                    } overflow-hidden flex items-center justify-center bg-gradient-to-b ${catMeta.gradient} border-b border-slate-100 dark:border-slate-800/80`}
                  >
                    {/* Top Left: Selected Badge OR Minimal Type Pill */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      {cartState.inCart ? (
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full text-white shadow-xs flex items-center gap-1 ${
                            isEquip ? 'bg-blue-600' : 'bg-teal-600'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>เลือกแล้ว {cartState.quantity}</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${catMeta.badge}`}
                        >
                          {isEquip ? 'ครุภัณฑ์' : 'วัสดุ'}
                        </span>
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

                    {/* Product Photo OR Boutique Medical Illustration Placeholder */}
                    {hasImage ? (
                      <div
                        onClick={() => setPreviewItem(item)}
                        className="w-full h-full p-3 sm:p-4 flex items-center justify-center bg-white dark:bg-slate-900 cursor-pointer relative group/photo"
                      >
                        <img
                          src={formatImageUrl(item.imageUrl)}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                          }
                          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white opacity-0 group-hover/photo:opacity-100 transition-opacity backdrop-blur-xs">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none">
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${catMeta.iconBg} flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110 shadow-2xs`}
                        >
                          <CatIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 line-clamp-1">
                          {catMeta.label}
                        </span>
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
                        onClick={() => hasImage && setPreviewItem(item)}
                        className={`text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug ${
                          hasImage ? 'cursor-pointer hover:text-teal-600 transition' : ''
                        }`}
                        title={item.name}
                      >
                        {item.name}
                      </h4>

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
                            isEquip
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                              : 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800'
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
                              isEquip
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-teal-600 hover:bg-teal-700'
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
                              ? isEquip
                                ? 'bg-slate-900 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-white cursor-pointer shadow-2xs'
                                : 'bg-slate-900 hover:bg-teal-600 dark:bg-slate-800 dark:hover:bg-teal-600 text-white cursor-pointer shadow-2xs'
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
            className="pointer-events-auto w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 px-5 sm:px-6 py-3 sm:py-3.5 rounded-full bg-slate-900/95 dark:bg-white/95 backdrop-blur-md text-white dark:text-slate-900 font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-black/10 dark:ring-white/20 border border-white/10 dark:border-slate-800"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="w-8 h-8 rounded-full bg-white/15 dark:bg-slate-900/10 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-teal-400 dark:text-teal-600" />
                </span>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-black">ตะกร้าพัสดุที่เลือกไว้</div>
                <div className="text-[10px] opacity-75">
                  {totalBorrowQty > 0 && `ยืม ${totalBorrowQty} ชิ้น `}
                  {totalReqQty > 0 && `เบิก ${totalReqQty} หน่วย`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 pl-3 border-l border-white/20 dark:border-slate-300 text-xs text-teal-400 dark:text-teal-600 font-bold">
              <span>ดูรายการ</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* 4. Cart Review Drawer Modal */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                  <ShoppingCart className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    ตะกร้าพัสดุที่เลือกไว้ ({totalCartCount} รายการ)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ช่วงเวลา: {borrowDate.replace('T', ' ')} ถึง {expectedReturnDate.replace('T', ' ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {borrowItems.filter((b) => b.itemId && Number(b.quantity) > 0).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>ครุภัณฑ์ (ยืมใช้งานแล้วต้องส่งคืน)</span>
                  </h4>

                  <div className="space-y-2">
                    {borrowItems
                      .filter((b) => b.itemId && Number(b.quantity) > 0)
                      .map((b) => {
                        const eqItem = equipmentList.find((it) => it.id === b.itemId);
                        if (!eqItem) return null;
                        const avail = availabilityMap[eqItem.id];
                        const hasExceeded =
                          avail !== undefined && Number(b.quantity) > avail.availableNow;

                        return (
                          <div
                            key={b.itemId}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                              hasExceeded
                                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                {eqItem.code}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {eqItem.name}
                              </h5>
                              {hasExceeded ? (
                                <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>
                                    เกินจำนวนที่ว่างในช่วงเวลานี้ (ว่าง {avail.availableNow}{' '}
                                    {eqItem.unit})
                                  </span>
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400">
                                  {eqItem.storageLocation?.name || eqItem.location || 'คลังพัสดุ'}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetItemQuantity(eqItem, Number(b.quantity) - 1)
                                  }
                                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center cursor-pointer text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold px-2">
                                  {b.quantity} {eqItem.unit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetItemQuantity(eqItem, Number(b.quantity) + 1)
                                  }
                                  className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer text-xs"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSetItemQuantity(eqItem, 0)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {requisitionItems.filter((r) => r.itemId && Number(r.quantity) > 0).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5" />
                    <span>วัสดุสิ้นเปลือง (เบิกใช้หมดไป)</span>
                  </h4>

                  <div className="space-y-2">
                    {requisitionItems
                      .filter((r) => r.itemId && Number(r.quantity) > 0)
                      .map((r) => {
                        const conItem = consumablesList.find((it) => it.id === r.itemId);
                        if (!conItem) return null;

                        return (
                          <div
                            key={r.itemId}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                                {conItem.code}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {conItem.name}
                              </h5>
                              <p className="text-[10px] text-slate-400">
                                หน่วยเบิก:{' '}
                                {r.requestedUnit ||
                                  (r.isSubUnit ? conItem.usageUnit : conItem.unit)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetItemQuantity(
                                      conItem,
                                      Number(r.quantity) - 1,
                                      r.isSubUnit
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center cursor-pointer text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold px-2">
                                  {r.quantity} {r.requestedUnit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetItemQuantity(
                                      conItem,
                                      Number(r.quantity) + 1,
                                      r.isSubUnit
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center cursor-pointer text-xs"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSetItemQuantity(conItem, 0, r.isSubUnit)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                รวมทั้งหมด:{' '}
                <strong className="text-slate-900 dark:text-white">{totalCartCount}</strong> รายการ
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition hover:opacity-90 cursor-pointer"
              >
                บันทึกและกลับไปเลือกต่อ
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 6. Image Preview Modal (Lightbox) */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  {previewItem.code}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                  {previewItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[500px]">
              {previewItem.imageUrl ? (
                <img
                  src={formatImageUrl(previewItem.imageUrl)}
                  alt={previewItem.name}
                  referrerPolicy="no-referrer"
                  className="max-h-[450px] max-w-full object-contain rounded-2xl shadow-md"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">ไม่มีรูปถ่ายในระบบ</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-500" />
                <span>
                  {previewItem.storageLocation?.name || previewItem.location || 'ไม่ระบุที่เก็บ'}
                </span>
              </div>
              {previewItem.imageUrl && (
                <a
                  href={previewItem.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-600 hover:underline font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ดูไฟล์ต้นฉบับ</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
