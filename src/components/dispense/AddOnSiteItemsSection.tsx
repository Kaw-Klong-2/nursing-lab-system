'use client';

import React from 'react';
import {
  Plus,
  Trash2,
  Package,
  Boxes,
  Calendar,
  MapPin,
} from 'lucide-react';
import { formatLocationDisplay } from '@/lib/location-utils';

export interface OnSiteBorrowItem {
  tempId: string;
  itemId: string;
  categoryId?: string;
  quantity: number;
  selectedAssetIds: string[];
}

export interface OnSiteReqItem {
  tempId: string;
  itemId: string;
  categoryId?: string;
  quantity: number;
  isSubUnit: boolean;
  requestedUnit: string;
  lotId?: string;
}

interface AddOnSiteItemsSectionProps {
  equipmentList: any[];
  consumablesList: any[];
  addedBorrowItems: OnSiteBorrowItem[];
  setAddedBorrowItems: React.Dispatch<React.SetStateAction<OnSiteBorrowItem[]>>;
  addedReqItems: OnSiteReqItem[];
  setAddedReqItems: React.Dispatch<React.SetStateAction<OnSiteReqItem[]>>;
  showReturnDatePicker?: boolean;
  returnDateValue?: string;
  onChangeReturnDate?: (val: string) => void;
}

export default function AddOnSiteItemsSection({
  equipmentList,
  consumablesList,
  addedBorrowItems,
  setAddedBorrowItems,
  addedReqItems,
  setAddedReqItems,
  showReturnDatePicker = false,
  returnDateValue = '',
  onChangeReturnDate,
}: AddOnSiteItemsSectionProps) {
  const handleAddBorrow = () => {
    setAddedBorrowItems((prev) => [
      ...prev,
      {
        tempId: `onsite-eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: '',
        categoryId: '',
        quantity: 1,
        selectedAssetIds: [],
      },
    ]);
  };

  const handleAddReq = () => {
    setAddedReqItems((prev) => [
      ...prev,
      {
        tempId: `onsite-req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: '',
        categoryId: '',
        quantity: 1,
        isSubUnit: false,
        requestedUnit: '',
        lotId: undefined,
      },
    ]);
  };

  const handleBorrowItemSelect = (tempId: string, newItemId: string) => {
    const matchEq = equipmentList.find((e) => e.id === newItemId);
    const availableAssets = matchEq?.availableAssets || [];
    const preselected = availableAssets.length > 0 ? [availableAssets[0].id] : [];
    setAddedBorrowItems((prev) =>
      prev.map((row) =>
        row.tempId === tempId
          ? {
              ...row,
              itemId: newItemId,
              quantity: 1,
              selectedAssetIds: preselected,
            }
          : row
      )
    );
  };

  const handleBorrowQtyChange = (tempId: string, rawQty: number) => {
    const qty = Math.max(1, Math.round(rawQty || 1));
    setAddedBorrowItems((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        const matchEq = equipmentList.find((e) => e.id === row.itemId);
        const availableAssets = matchEq?.availableAssets || [];
        let nextSelected = [...row.selectedAssetIds].slice(0, qty);
        for (const a of availableAssets) {
          if (nextSelected.length >= qty) break;
          if (!nextSelected.includes(a.id)) nextSelected.push(a.id);
        }
        return { ...row, quantity: qty, selectedAssetIds: nextSelected };
      })
    );
  };

  const handleReqItemSelect = (tempId: string, newItemId: string) => {
    const matchCons = consumablesList.find((c) => c.id === newItemId);
    const lots = matchCons?.stockLots || [];
    setAddedReqItems((prev) =>
      prev.map((row) =>
        row.tempId === tempId
          ? {
              ...row,
              itemId: newItemId,
              quantity: 1,
              isSubUnit: false,
              requestedUnit: matchCons?.unit || 'หน่วย',
              lotId: lots[0]?.id,
            }
          : row
      )
    );
  };

  return (
    <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-800/70 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
          <span>➕ เพิ่มรายการหน้างานขณะส่งมอบ/จ่ายของ (กรณีนิสิตขอเพิ่มหรือหน้างานจ่ายเสริม)</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleAddBorrow}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มครุภัณฑ์หน้างาน</span>
          </button>
          <button
            type="button"
            onClick={handleAddReq}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มวัสดุสิ้นเปลืองหน้างาน</span>
          </button>
        </div>
      </div>

      {/* On-Site Equipment Additions */}
      {addedBorrowItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            <span>ครุภัณฑ์ที่เพิ่มหน้างาน ({addedBorrowItems.length} รายการ):</span>
          </div>

          {showReturnDatePicker && (
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-bold text-slate-700 dark:text-slate-200">
                กำหนดส่งคืนครุภัณฑ์ที่เพิ่มหน้างาน:
              </span>
              <input
                type="datetime-local"
                value={returnDateValue}
                onChange={(e) => onChangeReturnDate?.(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                (หากเว้นว่าง ระบบตั้งให้อัตโนมัติ +4 ชั่วโมง)
              </span>
            </div>
          )}

          {addedBorrowItems.map((row) => {
            const matchEq = equipmentList.find((e) => e.id === row.itemId);
            const availableAssets = matchEq?.availableAssets || [];
            const availCount = availableAssets.length || matchEq?.currentStock || 0;
            const locText = matchEq ? formatLocationDisplay(matchEq) : '';

            return (
              <div
                key={row.tempId}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/70 space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <select
                    value={row.itemId}
                    onChange={(e) => handleBorrowItemSelect(row.tempId, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- เลือกครุภัณฑ์ที่ต้องการเพิ่ม --</option>
                    {equipmentList.map((eq) => {
                      const avail = eq.availableAssets?.length ?? eq.currentStock ?? 0;
                      return (
                        <option key={eq.id} value={eq.id}>
                          [{eq.code}] {eq.name} (ว่าง {avail} {eq.unit})
                        </option>
                      );
                    })}
                  </select>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">จำนวน:</span>
                    <input
                      type="number"
                      min="1"
                      max={availCount > 0 ? availCount : undefined}
                      value={row.quantity}
                      onChange={(e) => handleBorrowQtyChange(row.tempId, parseInt(e.target.value, 10))}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-center font-bold text-xs text-slate-800 dark:text-slate-100"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 min-w-[28px]">
                      {matchEq?.unit || 'ชิ้น'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAddedBorrowItems((prev) => prev.filter((x) => x.tempId !== row.tempId))
                      }
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="ลบรายการหน้างานนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {matchEq && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>พิกัด: <strong className="text-slate-700 dark:text-slate-300">{locText}</strong></span>
                      <span>•</span>
                      <span>พร้อมจ่าย: <strong>{availCount} {matchEq.unit}</strong></span>
                    </div>

                    {availableAssets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: row.quantity }).map((_, slotIdx) => {
                          const currentVal = row.selectedAssetIds[slotIdx] || '';
                          return (
                            <select
                              key={slotIdx}
                              value={currentVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAddedBorrowItems((prev) =>
                                  prev.map((item) => {
                                    if (item.tempId !== row.tempId) return item;
                                    const next = [...item.selectedAssetIds];
                                    next[slotIdx] = val;
                                    return { ...item, selectedAssetIds: next };
                                  })
                                );
                              }}
                              className="px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-[11px] font-mono font-bold text-indigo-800 dark:text-indigo-200"
                            >
                              <option value="">-- ชิ้นที่ {slotIdx + 1}: เลือกอัตโนมัติ --</option>
                              {availableAssets.map((ast: any) => {
                                const usedInOtherSlot = row.selectedAssetIds.some(
                                  (id, idx) => idx !== slotIdx && id === ast.id
                                );
                                return (
                                  <option key={ast.id} value={ast.id} disabled={usedInOtherSlot}>
                                    {ast.assetCode} {ast.serialNumber ? `(${ast.serialNumber})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* On-Site Consumable Additions */}
      {addedReqItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5" />
            <span>วัสดุสิ้นเปลืองที่เพิ่มหน้างาน ({addedReqItems.length} รายการ — ตัดสต็อก FIFO ทันที):</span>
          </div>

          {addedReqItems.map((row) => {
            const matchCons = consumablesList.find((c) => c.id === row.itemId);
            const ratio = Number(matchCons?.conversionRatio) > 0 ? Number(matchCons.conversionRatio) : 1;
            const canSubUnit = Boolean(matchCons && ratio > 1 && matchCons.usageUnit);
            const availLots = matchCons?.stockLots || [];
            const totalPieces =
              (matchCons?.currentStock || 0) * ratio + (matchCons?.openPackRemainder || 0);
            const locText = matchCons ? formatLocationDisplay(matchCons) : '';

            return (
              <div
                key={row.tempId}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/70 space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <select
                    value={row.itemId}
                    onChange={(e) => handleReqItemSelect(row.tempId, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- เลือกวัสดุสิ้นเปลืองที่ต้องการเพิ่ม --</option>
                    {consumablesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name} (คงเหลือ {c.currentStock ?? 0} {c.unit}
                        {c.openPackRemainder > 0 ? ` + เศษ ${c.openPackRemainder} ${c.usageUnit || 'ชิ้น'}` : ''})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">จ่าย:</span>
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => {
                        const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setAddedReqItems((prev) =>
                          prev.map((x) => (x.tempId === row.tempId ? { ...x, quantity: qty } : x))
                        );
                      }}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-center font-bold text-xs text-slate-800 dark:text-slate-100"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 min-w-[36px]">
                      {row.requestedUnit || matchCons?.unit || 'หน่วย'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAddedReqItems((prev) => prev.filter((x) => x.tempId !== row.tempId))
                      }
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="ลบรายการหน้างานนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {matchCons && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span>{locText}</span>
                      </span>
                      <span>•</span>
                      <span>
                        คงเหลือ: <strong>{row.isSubUnit ? `${totalPieces} ${matchCons.usageUnit}` : `${matchCons.currentStock || 0} ${matchCons.unit}`}</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {canSubUnit && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() =>
                              setAddedReqItems((prev) =>
                                prev.map((x) =>
                                  x.tempId === row.tempId
                                    ? { ...x, isSubUnit: false, requestedUnit: matchCons.unit }
                                    : x
                                )
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              !row.isSubUnit
                                ? 'bg-teal-600 text-white'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            ยก{matchCons.unit}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAddedReqItems((prev) =>
                                prev.map((x) =>
                                  x.tempId === row.tempId
                                    ? {
                                        ...x,
                                        isSubUnit: true,
                                        requestedUnit: matchCons.usageUnit || 'ชิ้น',
                                      }
                                    : x
                                )
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              row.isSubUnit
                                ? 'bg-amber-600 text-white'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            ย่อย ({matchCons.usageUnit})
                          </button>
                        </div>
                      )}

                      {availLots.length > 0 && (
                        <select
                          value={row.lotId || availLots[0].id}
                          onChange={(e) => {
                            const lotId = e.target.value;
                            setAddedReqItems((prev) =>
                              prev.map((x) => (x.tempId === row.tempId ? { ...x, lotId } : x))
                            );
                          }}
                          className="px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 text-[10px] font-semibold text-teal-900 dark:text-teal-200"
                        >
                          {availLots.map((l: any, idx: number) => (
                            <option key={l.id} value={l.id}>
                              {idx === 0 ? '⭐ FIFO: ' : ''}Lot {l.lotNumber} (เหลือ {l.quantityRemaining})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
