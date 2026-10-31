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
} from 'lucide-react';

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
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

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

  // Combine items according to active type tab
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

      return true;
    });
  }, [equipmentList, consumablesList, activeTab, searchQuery, selectedCategory, inStockOnly]);

  // Total items in cart
  const totalBorrowQty = borrowItems.reduce((sum, b) => (b.itemId && Number(b.quantity) > 0 ? sum + Number(b.quantity) : sum), 0);
  const totalReqQty = requisitionItems.reduce((sum, r) => (r.itemId && Number(r.quantity) > 0 ? sum + Number(r.quantity) : sum), 0);
  const totalCartCount = (borrowItems.filter((b) => b.itemId && Number(b.quantity) > 0).length) +
    (requisitionItems.filter((r) => r.itemId && Number(r.quantity) > 0).length);

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
      return {
        inCart: !!found && Number(found.quantity) > 0,
        quantity: found ? Number(found.quantity) || 0 : 0,
        isSubUnit: !!found?.isSubUnit,
      };
    }
  };

  // Handler: Add or update quantity
  const handleSetItemQuantity = (item: CatalogItem, qty: number, isSubUnit?: boolean) => {
    if (readOnly) return;
    const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
    const maxPieces = (item.currentStock * ratio) + (item.openPackRemainder || 0);
    const maxLimit = isSubUnit ? maxPieces : item.currentStock;

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
      if (targetQty <= 0) {
        if (idx !== -1) updated = updated.filter((_, i) => i !== idx);
      } else {
        const sub = isSubUnit !== undefined ? isSubUnit : (idx !== -1 ? updated[idx].isSubUnit : false);
        const unitLabel = sub ? (item.usageUnit || 'ชิ้น') : item.unit;
        if (idx !== -1) {
          updated[idx].quantity = targetQty;
          updated[idx].isSubUnit = sub;
          updated[idx].requestedUnit = unitLabel;
        } else {
          updated.push({
            itemId: item.id,
            quantity: targetQty,
            isSubUnit: sub,
            requestedUnit: unitLabel,
            categoryId: item.categoryId,
          });
        }
      }
      onUpdateRequisitionItems(updated.length > 0 ? updated : [{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' }]);
    }
  };

  // Handler: Quick apply entire Practice Kit
  const handleApplyPracticeKit = (kit: PracticeKitComponent) => {
    if (readOnly) return;

    let newBorrow = [...borrowItems.filter((b) => b.itemId && Number(b.quantity) > 0)];
    let newReq = [...requisitionItems.filter((r) => r.itemId && Number(r.quantity) > 0)];

    kit.items.forEach((kitItem) => {
      const targetId = kitItem.itemId;
      const targetItem = [...equipmentList, ...consumablesList].find((it) => it.id === targetId) || kitItem.item;
      const addQty = kitItem.quantity || 1;

      if (targetItem.type === 'EQUIPMENT') {
        const existingIdx = newBorrow.findIndex((b) => b.itemId === targetId);
        if (existingIdx !== -1) {
          newBorrow[existingIdx].quantity = Number(newBorrow[existingIdx].quantity) + addQty;
        } else {
          newBorrow.push({ itemId: targetId, quantity: addQty });
        }
      } else {
        const existingIdx = newReq.findIndex((r) => r.itemId === targetId);
        if (existingIdx !== -1) {
          newReq[existingIdx].quantity = Number(newReq[existingIdx].quantity) + addQty;
        } else {
          newReq.push({
            itemId: targetId,
            quantity: addQty,
            isSubUnit: false,
            requestedUnit: targetItem.unit,
          });
        }
      }
    });

    onUpdateBorrowItems(newBorrow.length > 0 ? newBorrow : [{ itemId: '', quantity: '' }]);
    onUpdateRequisitionItems(newReq.length > 0 ? newReq : [{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' }]);
    setIsCartDrawerOpen(true);
  };

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
                    {kit.items.map((it) => it.item.name).join(', ') || kit.description || 'อุปกรณ์มาตรฐานพร้อมฝึก'}
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

      {/* 2. Search, Type Filters & Category Pills */}
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
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
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
              <span>ครุภัณฑ์ยืม-คืน ({equipmentList.length})</span>
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

        {/* Row 2: Category Pills & In-Stock Toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
            />
            <span>เฉพาะที่มีของพร้อมใช้</span>
          </label>
        </div>
      </div>

      {/* 3. Visual Catalog Items Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>พบพัสดุทั้งหมด <strong>{displayItems.length}</strong> รายการ</span>
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
              ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูนะครับ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
            {displayItems.map((item) => {
              const cartState = getItemCartState(item);
              const isEquip = item.type === 'EQUIPMENT';
              const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
              const canSubUnit = !isEquip && ratio > 1 && !!item.usageUnit && item.usageUnit !== item.unit;
              const totalPieces = !isEquip ? (item.currentStock * ratio) + (item.openPackRemainder || 0) : 0;
              const isAvailable = isEquip ? item.currentStock > 0 : (item.currentStock > 0 || (item.openPackRemainder || 0) > 0);

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl p-4 border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                    cartState.inCart
                      ? isEquip
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-400/20'
                        : 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-400 dark:border-teal-700 ring-2 ring-teal-400/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:shadow-md'
                  }`}
                >
                  {/* Card Header & Badge */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isEquip
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300'
                        }`}
                      >
                        {isEquip ? '🔧 ครุภัณฑ์ยืม-คืน' : '📦 วัสดุสิ้นเปลือง'}
                      </span>

                      {/* Stock Badge */}
                      {isAvailable ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>พร้อม: {item.currentStock} {item.unit}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>หมดชั่วคราว</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Code */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        รหัส: {item.code} {item.brand ? `• ยี่ห้อ: ${item.brand}` : ''}
                      </p>
                    </div>

                    {/* Location Tag */}
                    {(item.storageLocation || item.location) && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{item.storageLocation?.name || item.location}</span>
                      </div>
                    )}

                    {/* Remainder Notes */}
                    {!isEquip && (item.openPackRemainder || 0) > 0 && (
                      <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md font-semibold border border-amber-200 dark:border-amber-900/60 w-fit">
                        มีเศษเปิดซอง: {item.openPackRemainder} {item.usageUnit || 'ชิ้น'}
                      </div>
                    )}
                  </div>

                  {/* Quantity Controller / Add Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {/* Subunit toggle for Consumables */}
                    {canSubUnit && cartState.inCart && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">หน่วยที่เบิก:</span>
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleSetItemQuantity(item, cartState.quantity, false)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              !cartState.isSubUnit
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {item.unit}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetItemQuantity(item, cartState.quantity, true)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              cartState.isSubUnit
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {item.usageUnit} (ย่อย)
                          </button>
                        </div>
                      </div>
                    )}

                    {cartState.inCart ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 p-1 flex-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleSetItemQuantity(item, cartState.quantity - 1, cartState.isSubUnit)}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={cartState.quantity}
                            onChange={(e) => handleSetItemQuantity(item, parseInt(e.target.value, 10) || 0, cartState.isSubUnit)}
                            className="w-12 text-center text-xs font-black bg-transparent text-slate-900 dark:text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSetItemQuantity(item, cartState.quantity + 1, cartState.isSubUnit)}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSetItemQuantity(item, 0)}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="ลบออกจากตะกร้า"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!isAvailable || readOnly}
                        onClick={() => handleSetItemQuantity(item, 1, false)}
                        className={`w-full py-2 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          isAvailable
                            ? isEquip
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAvailable ? '+ หยิบใส่ตะกร้า' : 'ของหมดในคลัง'}</span>
                      </button>
                    )}
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
              <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-bold">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black flex items-center gap-2">
                  <span>ตะกร้าพัสดุ: <strong>{totalCartCount}</strong> รายการ</span>
                  <span className="text-[10px] text-teal-300 font-normal">
                    (ครุภัณฑ์ {totalBorrowQty} ชิ้น • วัสดุ {totalReqQty} หน่วย)
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
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                ตรวจทานตะกร้า
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
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{it?.name || b.itemId}</div>
                              <span className="text-[10px] text-slate-400">รหัส: {it?.code || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-900 dark:text-blue-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-800">
                                {b.quantity} {it?.unit || 'ชิ้น'}
                              </span>
                              <button
                                type="button"
                                onClick={() => it && handleSetItemQuantity(it, 0)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
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
                        const unitLabel = r.isSubUnit ? (it?.usageUnit || 'ชิ้น') : (it?.unit || 'หน่วย');
                        return (
                          <div
                            key={r.itemId}
                            className="p-3 rounded-2xl bg-teal-50/50 dark:bg-slate-800/60 border border-teal-200/80 dark:border-teal-900/40 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{it?.name || r.itemId}</div>
                              <span className="text-[10px] text-slate-400">
                                รหัส: {it?.code || '-'} {r.isSubUnit ? `(เบิกหน่วยย่อย)` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-teal-900 dark:text-teal-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-teal-200 dark:border-teal-800">
                                {r.quantity} {unitLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => it && handleSetItemQuantity(it, 0)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
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
              <button
                type="button"
                onClick={() => {
                  onUpdateBorrowItems([{ itemId: '', quantity: '' }]);
                  onUpdateRequisitionItems([{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' }]);
                  setIsCartDrawerOpen(false);
                }}
                className="text-xs text-rose-500 hover:underline font-bold"
              >
                ล้างตะกร้าทั้งหมด
              </button>

              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                เสร็จสิ้น / กลับสู่หน้าฟอร์ม
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
