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
  Tag,
  MapPin,
  Trash2,
  ShoppingCart,
  Layers,
  ArrowRight,
  Info,
  Building2,
  AlertCircle,
  X,
  Eye,
  Camera,
  ExternalLink,
  ChevronRight,
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
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-900',
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
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-900',
      label: 'เตียงและเฟอร์นิเจอร์วอร์ด',
    };
  }
  if (name.includes('หุ่น') || name.includes('จำลอง') || name.includes('ทักษะ')) {
    return {
      icon: Activity,
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-900',
      label: 'หุ่นฝึกทักษะการแพทย์',
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
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      text: 'text-sky-600 dark:text-sky-400',
      border: 'border-sky-200 dark:border-sky-900',
      label: 'สารน้ำทางหลอดเลือด',
    };
  }
  if (name.includes('แอลกอฮอล์') || name.includes('ล้าง') || name.includes('ฆ่าเชื้อ')) {
    return {
      icon: Sparkles,
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-200 dark:border-cyan-900',
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
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-900',
      label: 'เวชภัณฑ์ทำแผล',
    };
  }
  return {
    icon: itemType === 'EQUIPMENT' ? Package : Boxes,
    bg:
      itemType === 'EQUIPMENT'
        ? 'bg-blue-50 dark:bg-blue-950/30'
        : 'bg-teal-50 dark:bg-teal-950/30',
    text:
      itemType === 'EQUIPMENT'
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-teal-600 dark:text-teal-400',
    border:
      itemType === 'EQUIPMENT'
        ? 'border-blue-200 dark:border-blue-900'
        : 'border-teal-200 dark:border-teal-900',
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
      // 1. Search Query
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

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        const cId = item.category?.id || item.categoryId || 'OTHER';
        if (cId !== selectedCategory) return false;
      }

      // 3. In Stock Only
      if (inStockOnly) {
        if (item.type === 'EQUIPMENT') {
          // If conflict map loaded, respect availableNow; otherwise currentStock
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

      // 4. Photos Only
      if (hasPhotosOnly) {
        if (!item.imageUrl || brokenImages[item.id]) return false;
      }

      // 5. Subunits Only
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

  // Handler: Switch preferred subunit mode (whether in cart or before adding)
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

    // If equipment and availability is known, limit by availableNow
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
            requestedUnit: hasSub ? (it.usageUnit || 'ชิ้น') : it.unit,
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

  return (
    <div className="space-y-6">
      {/* 0. Real-time Date Window & Conflict Checker Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/60 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-2xl bg-blue-600 text-white shadow-xs shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  ระบบเช็กสต็อกและวันซ้อนทับแบบเรียลไทม์ (Time-Conflict Checker)
                </h3>
                {isCheckingAvailability ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 animate-pulse">
                    กำลังคำนวณการชนเวลา...
                  </span>
                ) : conflictSummary.count > 0 ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>มี {conflictSummary.count} รายการติดจองในช่วงเวลานี้</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>ครุภัณฑ์ทุกชิ้นว่างพร้อมใช้งาน</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เลือกวัน-เวลาที่ต้องการฝึกปฏิบัติการ ระบบจะตัดรายการที่กลุ่มอื่นจองไว้แล้วออกให้อัตโนมัติ ป้องกันการจองชนกัน
              </p>
            </div>
          </div>

          {/* Date & Time Input Boxes */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 shrink-0">วันยืม:</span>
              <input
                type="datetime-local"
                value={borrowDate}
                onChange={(e) => {
                  setBorrowDate(e.target.value);
                  onDatesChange?.({ borrowDate: e.target.value, expectedReturnDate });
                }}
                className="bg-transparent text-slate-900 dark:text-white font-medium focus:outline-none text-xs cursor-pointer"
              />
            </div>
            <span className="text-slate-400 text-xs font-bold shrink-0">ถึง</span>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 shrink-0">กำหนดคืน:</span>
              <input
                type="datetime-local"
                value={expectedReturnDate}
                onChange={(e) => {
                  setExpectedReturnDate(e.target.value);
                  onDatesChange?.({ borrowDate, expectedReturnDate: e.target.value });
                }}
                className="bg-transparent text-slate-900 dark:text-white font-medium focus:outline-none text-xs cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Preset Slot Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-blue-100/80 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>ทางลัดเลือกช่วงเวลา:</span>
          </span>
          <button
            type="button"
            onClick={() => applyPresetSlot('MORNING')}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/90 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer shadow-2xs"
          >
            🌅 พรุ่งนี้เช้า (09:00 - 12:00)
          </button>
          <button
            type="button"
            onClick={() => applyPresetSlot('AFTERNOON')}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/90 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer shadow-2xs"
          >
            ☀️ พรุ่งนี้บ่าย (13:00 - 16:00)
          </button>
          <button
            type="button"
            onClick={() => applyPresetSlot('FULLDAY')}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/90 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer shadow-2xs"
          >
            ⏳ พรุ่งนี้เต็มวัน (09:00 - 16:00)
          </button>
          <button
            type="button"
            onClick={() => applyPresetSlot('THREE_DAYS')}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/90 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer shadow-2xs"
          >
            🗓️ ยืม 3 วัน
          </button>
          <button
            type="button"
            onClick={() => applyPresetSlot('ONE_WEEK')}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/90 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer shadow-2xs"
          >
            📅 ยืม 1 สัปดาห์
          </button>

          <button
            type="button"
            onClick={() => setSimulateConflict(!simulateConflict)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs border ml-auto ${
              simulateConflict
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
            title="คลิกเพื่อทดสอบการจำลองเหตุการณ์ที่มีผู้อื่นจองอุปกรณ์ชนเวลา"
          >
            🧪 {simulateConflict ? 'โหมดจำลองติดจอง: เปิดใช้งาน' : 'จำลองสถานการณ์ติดจอง'}
          </button>
        </div>
      </div>

      {/* 1. Quick 1-Click Practice Kits Carousel / Grid */}
      {practiceKits.length > 0 && (
        <div className="bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-purple-500/10 dark:from-teal-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 p-4 sm:p-5 rounded-3xl border border-teal-200/80 dark:border-teal-900/60 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-teal-600 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>ชุดฝึกหัตถการสำเร็จรูป (1-Click Practice Kits)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 font-bold">
                    เลือกทั้งชุดใน 1 วินาที
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  กดปุ่มเดียวระบบจะหยิบทั้งครุภัณฑ์และวัสดุที่ต้องใช้ในหัตถการนั้นลงตะกร้าให้อัตโนมัติ
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {practiceKits.slice(0, 4).map((kit) => (
              <div
                key={kit.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-teal-400 dark:hover:border-teal-600 transition flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {kit.category || 'ชุดฝึกมาตรฐาน'}
                    </span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                      {kit.items.length} รายการในชุด
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                    {kit.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                    {kit.items.map((it) => it.item.name).join(', ') ||
                      kit.description ||
                      'อุปกรณ์มาตรฐานพร้อมฝึก'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyPracticeKit(kit)}
                  className="w-full py-1.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white dark:bg-teal-950/60 dark:hover:bg-teal-600 dark:text-teal-300 dark:hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ เลือกชุดนี้ลงตะกร้า</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Search, Type Filters & Feature Toggles */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {/* Row 1: Search & Type Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Type Filter Tabs */}
          <div className="inline-flex rounded-2xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 self-start">
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
              <span>ครุภัณฑ์</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {equipmentList.length}
              </span>
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
              <span>วัสดุสิ้นเปลือง</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {consumablesList.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อพัสดุ, รหัส, ยี่ห้อ, ตู้เก็บ..."
              className="w-full pl-9.5 pr-8 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
        </div>

        {/* Row 2: Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Row 3: Feature Filter Checkboxes */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Has Photos Toggle */}
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPhotosOnly}
                onChange={(e) => setHasPhotosOnly(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
              />
              <Camera className="w-3.5 h-3.5 text-teal-600" />
              <span>เฉพาะที่มีรูปถ่ายจริง ({totalWithPhotos})</span>
            </label>

            {/* Has SubUnit Toggle */}
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSubUnitOnly}
                onChange={(e) => setHasSubUnitOnly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>เฉพาะที่มีหน่วยย่อย ({totalWithSubunits})</span>
            </label>

            {/* In Stock Only */}
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
              />
              <span>เฉพาะที่มีของพร้อมใช้</span>
            </label>
          </div>

          {(hasPhotosOnly || hasSubUnitOnly || inStockOnly || selectedCategory !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setHasPhotosOnly(false);
                setHasSubUnitOnly(false);
                setInStockOnly(false);
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-rose-500 hover:text-rose-700 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Catalog Items Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            แสดงพัสดุ <strong>{filteredItems.length}</strong> รายการ
          </span>
          <span className="text-[11px] text-slate-400">
            แตะที่การ์ดเพื่อขยายดูรูป หรือเพิ่มลงตะกร้า
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredItems.map((item) => {
              const isEquip = item.type === 'EQUIPMENT';
              const cartState = getItemCartState(item);
              const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
              const hasSubUnit = !isEquip && (ratio > 1 || !!item.usageUnit);
              const activeIsSub = cartState.isSubUnit;

              // Time-Conflict State for Equipment
              const avail = isEquip ? availabilityMap[item.id] : undefined;
              const hasConflict = isEquip && avail && avail.conflictStatus !== 'AVAILABLE';
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
                  className={`rounded-2xl sm:rounded-3xl border overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-lg ${
                    isFullConflict
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 opacity-90'
                      : cartState.inCart
                      ? isEquip
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 ring-2 ring-blue-400/20'
                        : 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-400 dark:border-teal-700 ring-2 ring-teal-400/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  {/* Card Visual Header: Real Photo or Smart Category Medical Icon */}
                  <div className="relative w-full h-32 sm:h-40 md:h-44 bg-slate-100 dark:bg-slate-850 overflow-hidden flex items-center justify-center group/img">
                    {/* Top Left: Type Badge */}
                    <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10">
                      <span
                        className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg uppercase tracking-wider backdrop-blur-md shadow-xs ${
                          isEquip ? 'bg-blue-600/90 text-white' : 'bg-teal-600/90 text-white'
                        }`}
                      >
                        {isEquip ? '🔧 ครุภัณฑ์' : '📦 วัสดุ'}
                      </span>
                    </div>

                    {/* Top Right: Stock & Time-Conflict Status Badge */}
                    <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10 flex flex-col items-end gap-1">
                      {isEquip && avail ? (
                        avail.conflictStatus === 'FULL' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedConflictModalItem(avail)}
                            className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-rose-600 text-white backdrop-blur-md shadow-xs flex items-center gap-1 cursor-pointer hover:bg-rose-700"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            <span>จองเต็มแล้ว</span>
                          </button>
                        ) : avail.conflictStatus === 'PARTIALLY_AVAILABLE' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedConflictModalItem(avail)}
                            className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-amber-500 text-white backdrop-blur-md shadow-xs flex items-center gap-1 cursor-pointer hover:bg-amber-600"
                          >
                            <span>ว่าง {avail.availableNow}/{avail.physicalCapacity} {item.unit}</span>
                          </button>
                        ) : (
                          <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-emerald-500/90 text-white backdrop-blur-md shadow-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            <span>ว่าง {avail.availableNow} {item.unit}</span>
                          </span>
                        )
                      ) : isAvailable ? (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-emerald-500/90 text-white backdrop-blur-md shadow-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          <span>
                            {item.currentStock} {item.unit}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-rose-500/90 text-white backdrop-blur-md shadow-xs">
                          หมด
                        </span>
                      )}
                    </div>

                    {/* Image Render or Smart Medical Category Placeholder */}
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
                          onClick={() => setPreviewItem(item)}
                          className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300 cursor-pointer bg-white dark:bg-slate-900"
                        />
                        {/* Hover Zoom Pill */}
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold cursor-pointer"
                        >
                          <ZoomIn className="w-4 h-4" />
                          <span className="hidden sm:inline">ดูรูปขนาดใหญ่</span>
                        </button>
                      </>
                    ) : (
                      <div
                        className={`w-full h-full flex flex-col items-center justify-center p-3 text-center transition-colors ${catMeta.bg}`}
                      >
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${catMeta.bg} ${catMeta.text} border ${catMeta.border} flex items-center justify-center mb-1.5 shadow-xs`}
                        >
                          <CatIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 truncate max-w-full px-1">
                          {item.code}
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {item.brand ? `${item.brand} ${item.model || ''}` : catMeta.label}
                        </span>
                      </div>
                    )}

                    {/* Bottom Location Overlay Tag */}
                    {(item.storageLocation || item.location) && (
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-2 sm:left-2 sm:right-2 z-10 flex items-center justify-between px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-slate-900/80 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-medium">
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-teal-400 shrink-0" />
                          <span className="truncate">
                            {item.storageLocation?.name || item.location}
                          </span>
                        </div>
                        {item.storageLocation?.roomName && (
                          <span className="text-[8px] sm:text-[9px] text-slate-300 shrink-0 ml-1 hidden xs:inline">
                            {item.storageLocation.roomName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Body: Info & Controllers */}
                  <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Name & Brand */}
                      <div>
                        <h4
                          className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-tight sm:leading-snug cursor-pointer hover:text-teal-600 transition"
                          title={item.name}
                          onClick={() => hasImage && setPreviewItem(item)}
                        >
                          {item.name}
                        </h4>
                        {(item.brand || item.model) && (
                          <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {item.brand} {item.model}
                          </p>
                        )}
                      </div>

                      {/* Consumable: Open Pack Remainder & Conversion */}
                      {!isEquip && (
                        <div className="text-[10px] sm:text-[11px] bg-slate-50 dark:bg-slate-800/60 p-1.5 sm:p-2 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-slate-500">
                            <span>คงเหลือสุทธิ:</span>
                            <strong className="text-slate-900 dark:text-slate-100 font-mono">
                              {totalPieces} {item.usageUnit || item.unit}
                            </strong>
                          </div>
                          {(item.openPackRemainder || 0) > 0 && (
                            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-[9px] sm:text-[10px]">
                              <span>เศษที่เปิดแล้ว:</span>
                              <span className="font-bold">
                                {item.openPackRemainder} {item.usageUnit || 'ชิ้น'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Unit Switcher (Whole Pack vs Subunit) */}
                      {hasSubUnit && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleToggleSubUnit(item, false)}
                            className={`flex-1 py-1 rounded-md font-bold transition cursor-pointer text-center ${
                              !activeIsSub
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            กล่อง ({item.unit})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSubUnit(item, true)}
                            className={`flex-1 py-1 rounded-md font-bold transition cursor-pointer text-center ${
                              activeIsSub
                                ? 'bg-teal-600 text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            ชิ้น ({item.usageUnit})
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quantity Selector / Add to Cart Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      {isFullConflict ? (
                        <button
                          type="button"
                          onClick={() => avail && setSelectedConflictModalItem(avail)}
                          className="w-full py-1.5 px-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>ติดจองเต็มในช่วงนี้ (ดูรายละเอียด)</span>
                        </button>
                      ) : cartState.inCart ? (
                        <div className="flex items-center justify-between gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemQuantity(item, cartState.quantity - 1, activeIsSub)
                            }
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <div className="text-center font-bold text-xs sm:text-sm font-mono text-slate-900 dark:text-white">
                            <span>{cartState.quantity}</span>
                            <span className="text-[10px] text-slate-400 font-sans ml-1">
                              {activeIsSub ? (item.usageUnit || 'ชิ้น') : item.unit}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemQuantity(item, cartState.quantity + 1, activeIsSub)
                            }
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleSetItemQuantity(item, 1, activeIsSub)}
                          className={`w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs ${
                            isAvailable
                              ? isEquip
                                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ เพิ่มลงรายการ</span>
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

      {/* 4. Floating Cart Drawer Button */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 animate-in slide-in-from-bottom duration-300">
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white font-bold shadow-xl hover:shadow-teal-500/25 hover:scale-105 transition-all cursor-pointer border border-white/20"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                {totalCartCount}
              </span>
            </div>
            <div className="text-left leading-tight hidden xs:block">
              <div className="text-xs">รายการที่เลือกไว้</div>
              <div className="text-[10px] opacity-90">
                {totalBorrowQty > 0 && `ยืม ${totalBorrowQty} ชิ้น `}
                {totalReqQty > 0 && `เบิก ${totalReqQty} หน่วย`}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 ml-1 opacity-80" />
          </button>
        </div>
      )}

      {/* 5. Cart Review Drawer Modal */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                  <ShoppingCart className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    ตะกร้าพัสดุที่เลือกไว้ ({totalCartCount} ชิ้น)
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

            {/* Modal Body: List of selected items */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Equipment Items in Cart */}
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
                        const item = equipmentList.find((it) => it.id === b.itemId);
                        if (!item) return null;
                        const avail = availabilityMap[item.id];
                        const hasExceeded = avail !== undefined && Number(b.quantity) > avail.availableNow;

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
                                {item.code}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {item.name}
                              </h5>
                              {hasExceeded ? (
                                <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>เกินจำนวนที่ว่างในช่วงเวลานี้ (ว่าง {avail.availableNow} {item.unit})</span>
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400">
                                  {item.storageLocation?.name || item.location || 'คลังพัสดุ'}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetItemQuantity(item, Number(b.quantity) - 1)
                                  }
                                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center cursor-pointer text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold px-2">
                                  {b.quantity} {item.unit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetItemQuantity(item, Number(b.quantity) + 1)
                                  }
                                  className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer text-xs"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSetItemQuantity(item, 0)}
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

              {/* Consumables in Cart */}
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
                        const item = consumablesList.find((it) => it.id === r.itemId);
                        if (!item) return null;

                        return (
                          <div
                            key={r.itemId}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                                {item.code}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {item.name}
                              </h5>
                              <p className="text-[10px] text-slate-400">
                                หน่วยเบิก: {r.requestedUnit || (r.isSubUnit ? item.usageUnit : item.unit)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetItemQuantity(
                                      item,
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
                                      item,
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
                                onClick={() => handleSetItemQuantity(item, 0, r.isSubUnit)}
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

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                รวมทั้งหมด: <strong className="text-slate-900 dark:text-white">{totalCartCount}</strong> รายการ
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

      {/* 6. Conflict Detail Modal */}
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
                    ความจุทั้งหมด {selectedConflictModalItem.physicalCapacity} {selectedConflictModalItem.unit} | ติดจองแล้ว {selectedConflictModalItem.reservedCount} {selectedConflictModalItem.unit}
                  </div>
                </div>
                <span className="text-sm font-black px-2.5 py-1 rounded-xl bg-amber-200/80 dark:bg-amber-900/80">
                  ว่าง {selectedConflictModalItem.availableNow} {selectedConflictModalItem.unit}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>รายการที่จองใช้งานซ้อนทับในช่วงเวลานี้ ({selectedConflictModalItem.conflicts.length} รายการ):</span>
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
                            {c.status === 'BORROWED' ? 'กำลังยืมอยู่' : c.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รออนุมัติ'} ({c.quantity} {selectedConflictModalItem.unit})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ผู้ขอ: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.requesterName}</span> ({c.requesterRole === 'USER' ? 'นิสิต' : 'อาจารย์'})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ช่วงเวลา: {formatBangkokDateTime(c.borrowDate)} ถึง {formatBangkokDateTime(c.expectedReturnDate)}
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

      {/* 7. Image Preview Modal (Lightbox) */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col">
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
