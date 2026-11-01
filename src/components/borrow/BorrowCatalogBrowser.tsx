'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { formatImageUrl } from '@/lib/image-helper';

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

interface BorrowCatalogBrowserProps {
  equipmentList: CatalogItem[];
  consumablesList: CatalogItem[];
  practiceKits: PracticeKitComponent[];
  borrowItems: BorrowRow[];
  requisitionItems: RequisitionRow[];
  onUpdateBorrowItems: (items: BorrowRow[]) => void;
  onUpdateRequisitionItems: (items: RequisitionRow[]) => void;
  readOnly?: boolean;
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

  // Extract unique categories across equipment and consumables
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    const all = [...equipmentList, ...consumablesList];
    all.forEach((it) => {
      const catId = it.category?.id || it.categoryId || 'OTHER';
      const catName = it.category?.name || 'หมวดทั่วไป';
      if (!map.has(catId)) {
        map.set(catId, { id: catId, name: catName, count: 1 });
      } else {
        map.get(catId)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [equipmentList, consumablesList]);

  // Combine items according to active type tab and filters
  const displayItems = useMemo(() => {
    let list: CatalogItem[] = [];
    if (activeTab === 'ALL') {
      list = [...equipmentList, ...consumablesList];
    } else if (activeTab === 'EQUIPMENT') {
      list = equipmentList;
    } else {
      list = consumablesList;
    }

    const query = searchQuery.trim().toLowerCase();
    return list.filter((it) => {
      // 1. Search Query
      if (query) {
        const matchName = it.name?.toLowerCase().includes(query);
        const matchCode = it.code?.toLowerCase().includes(query);
        const matchBrand = it.brand?.toLowerCase().includes(query);
        const matchLoc =
          it.location?.toLowerCase().includes(query) ||
          it.storageLocation?.name?.toLowerCase().includes(query) ||
          it.storageLocation?.code?.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchBrand && !matchLoc) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        const itCatId = it.category?.id || it.categoryId;
        if (itCatId !== selectedCategory) return false;
      }

      // 3. In-Stock Only Filter
      if (inStockOnly) {
        const stock = it.currentStock ?? 0;
        const open = it.openPackRemainder ?? 0;
        if (stock <= 0 && open <= 0) return false;
      }

      // 4. Has Photos Filter
      if (hasPhotosOnly) {
        if (!it.imageUrl || brokenImages[it.id]) return false;
      }

      // 5. Has SubUnit Filter
      if (hasSubUnitOnly) {
        const ratio = Number(it.conversionRatio) > 0 ? Number(it.conversionRatio) : 1;
        const hasSub = it.type === 'CONSUMABLE' && (ratio > 1 || (!!it.usageUnit && it.usageUnit !== it.unit));
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
    const maxLimit = activeIsSub ? maxPieces : item.currentStock;

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
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              ทั้งหมด ({equipmentList.length + consumablesList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('EQUIPMENT')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'EQUIPMENT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>ครุภัณฑ์ ({equipmentList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CONSUMABLE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'CONSUMABLE'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>วัสดุสิ้นเปลือง ({consumablesList.length})</span>
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              className="text-xs text-rose-500 hover:underline font-semibold"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* 3. Visual Catalog Items Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            แสดงพัสดุทั้งหมด <strong>{displayItems.length}</strong> รายการ
            {hasPhotosOnly && ' (คัดเฉพาะที่มีรูป)'}
            {hasSubUnitOnly && ' (คัดเฉพาะที่มีหน่วยย่อย)'}
          </span>
          {totalCartCount > 0 && (
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>ดูตะกร้าของฉัน ({totalCartCount} รายการ)</span>
            </button>
          )}
        </div>

        {displayItems.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              ไม่พบพัสดุที่ตรงกับเงื่อนไขการค้นหา
            </p>
            <p className="text-xs text-slate-400">
              ลองปิดตัวกรอง หรือค้นหาด้วยชื่ออื่นดูนะครับ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {displayItems.map((item) => {
              const cartState = getItemCartState(item);
              const isEquip = item.type === 'EQUIPMENT';
              const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
              const hasSubUnit = !isEquip && (ratio > 1 || (!!item.usageUnit && item.usageUnit !== item.unit));
              const activeIsSub = cartState.isSubUnit;
              const activeUnitLabel = activeIsSub ? (item.usageUnit || 'ชิ้น') : item.unit;

              const totalPieces = !isEquip ? item.currentStock * ratio + (item.openPackRemainder || 0) : 0;
              const isAvailable = isEquip
                ? item.currentStock > 0
                : item.currentStock > 0 || (item.openPackRemainder || 0) > 0;

              const hasImage = !!item.imageUrl && !brokenImages[item.id];

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl sm:rounded-3xl border overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-lg ${
                    cartState.inCart
                      ? isEquip
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 ring-2 ring-blue-400/20'
                        : 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-400 dark:border-teal-700 ring-2 ring-teal-400/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  {/* Card Visual Header: Real Photo or Stylized Illustration */}
                  <div className="relative w-full h-32 sm:h-40 md:h-44 bg-slate-100 dark:bg-slate-850 overflow-hidden flex items-center justify-center group/img">
                    {/* Top Left: Type Badge */}
                    <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10">
                      <span
                        className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg uppercase tracking-wider backdrop-blur-md shadow-xs ${
                          isEquip
                            ? 'bg-blue-600/90 text-white'
                            : 'bg-teal-600/90 text-white'
                        }`}
                      >
                        {isEquip ? '🔧 ครุภัณฑ์' : '📦 วัสดุ'}
                      </span>
                    </div>

                    {/* Top Right: Stock Status Badge */}
                    <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10">
                      {isAvailable ? (
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

                    {/* Image Render */}
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
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 text-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900">
                        {isEquip ? (
                          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 shadow-xs">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1 shadow-xs">
                            <Boxes className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                        )}
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 truncate max-w-full px-1">
                          {item.code}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 line-clamp-1">
                          {item.category?.name || 'พัสดุห้องแล็บ'}
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
                        <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          รหัส: {item.code} {item.brand ? `• ${item.brand}` : ''}
                        </p>
                      </div>

                      {/* Subunit Controller: Shown directly on card whenever item supports subunits */}
                      {hasSubUnit && (
                        <div className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1 sm:space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] sm:text-[11px] gap-1">
                            <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1 truncate">
                              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-600 shrink-0" />
                              <span className="truncate">หน่วย:</span>
                            </span>
                            {ratio > 1 && (
                              <span className="text-[9px] sm:text-[10px] font-black text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-950/80 px-1 sm:px-1.5 py-0.2 rounded-md border border-teal-200 dark:border-teal-800 shrink-0">
                                1:{ratio}
                              </span>
                            )}
                          </div>

                          {/* 2-Way Pill Switcher (กล่อง vs ชิ้นย่อย) */}
                          <div className="grid grid-cols-2 gap-0.5 sm:gap-1 p-0.5 rounded-lg sm:rounded-xl bg-slate-200/70 dark:bg-slate-700/60 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => handleToggleSubUnit(item, false)}
                              className={`py-1 px-1 rounded-md sm:rounded-lg text-[9px] sm:text-[11px] font-bold transition text-center cursor-pointer truncate ${
                                !activeIsSub
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                              }`}
                            >
                              {item.unit}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSubUnit(item, true)}
                              className={`py-1 px-1 rounded-md sm:rounded-lg text-[9px] sm:text-[11px] font-bold transition text-center cursor-pointer truncate ${
                                activeIsSub
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                              }`}
                            >
                              {item.usageUnit || 'ชิ้น'} (ย่อย)
                            </button>
                          </div>

                          {/* Live Remainder Note */}
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 truncate">
                            <span className="truncate">คลัง: {item.currentStock} {item.unit}</span>
                            {(item.openPackRemainder || 0) > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-1 rounded shrink-0 ml-1">
                                เศษ: {item.openPackRemainder}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Equipment Details Note */}
                      {isEquip && (
                        <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>พร้อม: {item.currentStock} {item.unit}</span>
                          {item.model && <span className="font-mono truncate ml-1">{item.model}</span>}
                        </div>
                      )}
                    </div>

                    {/* Quantity Controller / Add Button */}
                    <div className="pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800">
                      {cartState.inCart ? (
                        <div className="space-y-1 sm:space-y-1.5">
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold">
                            <span className="text-teal-700 dark:text-teal-300 truncate">
                              ในตะกร้า ({activeUnitLabel})
                            </span>
                            <span className="text-slate-400 shrink-0">
                              {cartState.quantity} {activeUnitLabel}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 sm:gap-2">
                            <div className="flex items-center gap-0.5 sm:gap-1.5 bg-white dark:bg-slate-850 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 p-0.5 sm:p-1 flex-1 shadow-xs justify-between">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetItemQuantity(
                                    item,
                                    cartState.quantity - 1,
                                    cartState.isSubUnit
                                  )
                                }
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              >
                                <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={cartState.quantity}
                                onChange={(e) =>
                                  handleSetItemQuantity(
                                    item,
                                    parseInt(e.target.value, 10) || 0,
                                    cartState.isSubUnit
                                  )
                                }
                                className="w-8 sm:w-12 text-center text-[11px] sm:text-xs font-black bg-transparent text-slate-900 dark:text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetItemQuantity(
                                    item,
                                    cartState.quantity + 1,
                                    cartState.isSubUnit
                                  )
                                }
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSetItemQuantity(item, 0)}
                              className="p-1 sm:p-2 text-slate-400 hover:text-rose-500 rounded-lg sm:rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                              title="ลบออกจากตะกร้า"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!isAvailable || readOnly}
                          onClick={() => handleSetItemQuantity(item, 1, activeIsSub)}
                          className={`w-full py-2 sm:py-2.5 px-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs ${
                            isAvailable
                              ? isEquip
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {isAvailable
                              ? `+ หยิบ (${activeUnitLabel})`
                              : 'ของหมด'}
                          </span>
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

      {/* 4. Floating Cart Summary Bar */}
      {totalCartCount > 0 && (
        <div className="sticky bottom-4 z-20">
          <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white border border-slate-800 shadow-2xl flex items-center justify-between gap-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-bold shadow-md">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black flex items-center gap-2">
                  <span>
                    ตะกร้าพัสดุ: <strong>{totalCartCount}</strong> รายการ
                  </span>
                  <span className="text-[10px] text-teal-300 font-normal">
                    (ครุภัณฑ์ {totalBorrowQty} ชิ้น • วัสดุ {totalReqQty} รายการ)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  พร้อมนำรายการทั้งหมดเข้าสู่ใบคำขอเบิก-ยืมพัสดุ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <span>ตรวจทานตะกร้า ({totalCartCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Cart Review Modal / Drawer */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    ตะกร้าพัสดุที่เลือกไว้ ({totalCartCount} รายการ)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ตรวจสอบรายการครุภัณฑ์และวัสดุสิ้นเปลืองก่อนบันทึกลงฟอร์ม
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Equipment Items */}
              {borrowItems.filter((b) => b.itemId && Number(b.quantity) > 0).length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    <span>ครุภัณฑ์ยืม-คืน (Equipment)</span>
                  </span>
                  <div className="space-y-2">
                    {borrowItems
                      .filter((b) => b.itemId && Number(b.quantity) > 0)
                      .map((b) => {
                        const it = equipmentList.find((x) => x.id === b.itemId);
                        return (
                          <div
                            key={b.itemId}
                            className="p-3 rounded-2xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              {it?.imageUrl ? (
                                <img
                                  src={formatImageUrl(it.imageUrl)}
                                  alt={it.name}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 object-contain rounded-lg bg-white dark:bg-slate-900 border p-0.5"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {it?.name || b.itemId}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  รหัส: {it?.code || '-'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-900 dark:text-blue-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-800">
                                {b.quantity} {it?.unit || 'ชิ้น'}
                              </span>
                              <button
                                type="button"
                                onClick={() => it && handleSetItemQuantity(it, 0)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                                title="ลบรายการนี้"
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

              {/* Consumables Items */}
              {requisitionItems.filter((r) => r.itemId && Number(r.quantity) > 0).length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4" />
                    <span>วัสดุสิ้นเปลือง (Consumables)</span>
                  </span>
                  <div className="space-y-2">
                    {requisitionItems
                      .filter((r) => r.itemId && Number(r.quantity) > 0)
                      .map((r) => {
                        const it = consumablesList.find((x) => x.id === r.itemId);
                        const unitLabel = r.isSubUnit
                          ? it?.usageUnit || 'ชิ้น'
                          : it?.unit || 'หน่วย';
                        return (
                          <div
                            key={r.itemId}
                            className="p-3 rounded-2xl bg-teal-50/50 dark:bg-slate-800/60 border border-teal-200/80 dark:border-teal-900/40 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              {it?.imageUrl ? (
                                <img
                                  src={formatImageUrl(it.imageUrl)}
                                  alt={it.name}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 object-contain rounded-lg bg-white dark:bg-slate-900 border p-0.5"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600">
                                  <Boxes className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {it?.name || r.itemId}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400">
                                    รหัส: {it?.code || '-'}
                                  </span>
                                  {r.isSubUnit && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                      หน่วยย่อย
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-teal-900 dark:text-teal-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-teal-200 dark:border-teal-800">
                                {r.quantity} {unitLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => it && handleSetItemQuantity(it, 0)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                                title="ลบรายการนี้"
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

      {/* 6. Image Preview Modal (Lightbox) */}
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
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                <span>{previewItem.storageLocation?.name || previewItem.location || 'ไม่ระบุที่เก็บ'}</span>
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
