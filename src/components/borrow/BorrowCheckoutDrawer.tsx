'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShoppingCart,
  Package,
  Boxes,
  Minus,
  Plus,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Clock,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Check,
  ShieldCheck,
  QrCode,
  Printer,
  RotateCcw,
  UserCheck,
  Building2,
  Info,
  ExternalLink,
  Layers,
  FlaskConical,
  HeartPulse,
} from 'lucide-react';
import { CatalogItem, BorrowRow, RequisitionRow, ItemAvailability } from './BorrowCatalogBrowser';
import { formatImageUrl } from '@/lib/image-helper';
import { formatBangkokDateTime } from '@/lib/date-time-utils';
import { formatUserName } from '@/lib/user-utils';

export interface CourseItem {
  id: string;
  code: string;
  name: string;
  instructorName?: string | null;
}

export interface InstructorItem {
  id: string;
  name: string;
  prefix?: string | null;
  department?: string | null;
  role?: string;
}

interface BorrowCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  borrowItems: BorrowRow[];
  requisitionItems: RequisitionRow[];
  equipmentList: CatalogItem[];
  consumablesList: CatalogItem[];
  courses?: CourseItem[];
  instructors?: InstructorItem[];
  borrowDate: string;
  expectedReturnDate: string;
  onChangeDates?: (dates: { borrowDate: string; expectedReturnDate: string }) => void;
  activePreset?: string;
  onApplyPreset?: (
    preset: 'MORNING' | 'AFTERNOON' | 'FULLDAY' | 'THREE_DAYS' | 'ONE_WEEK'
  ) => void;
  isCheckingAvailability?: boolean;
  simulateConflict?: boolean;
  onToggleSimulateConflict?: () => void;
  availabilityMap?: Record<string, ItemAvailability>;
  onUpdateBorrowItems: (items: BorrowRow[]) => void;
  onUpdateRequisitionItems: (items: RequisitionRow[]) => void;
  isSimulation?: boolean;
  simulatedRole?: 'STUDENT' | 'TEACHER';
  onSubmitRealRequest?: (payload: any) => Promise<{ success: boolean; data?: any; error?: string }>;
}

export default function BorrowCheckoutDrawer({
  isOpen,
  onClose,
  borrowItems,
  requisitionItems,
  equipmentList,
  consumablesList,
  courses = [],
  instructors = [],
  borrowDate,
  expectedReturnDate,
  onChangeDates,
  activePreset = 'MORNING',
  onApplyPreset,
  isCheckingAvailability = false,
  simulateConflict = false,
  onToggleSimulateConflict,
  availabilityMap = {},
  onUpdateBorrowItems,
  onUpdateRequisitionItems,
  isSimulation = true,
  simulatedRole = 'STUDENT',
  onSubmitRealRequest,
}: BorrowCheckoutDrawerProps) {
  // Drawer Stages: 'CART' | 'CHECKOUT_FORM' | 'CONFIRMATION_SLIP'
  const [stage, setStage] = useState<'CART' | 'CHECKOUT_FORM' | 'CONFIRMATION_SLIP'>('CART');

  // Checkout Form State
  const [courseId, setCourseId] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [useTarget, setUseTarget] = useState<'SIMULATION' | 'HUMAN'>('SIMULATION');

  // Simulated Lifecycle State (Stage 3 Role Play)
  const [simulatedStatus, setSimulatedStatus] = useState<
    'PENDING' | 'APPROVED' | 'DISPENSED' | 'RETURNED'
  >('PENDING');
  const [simulatedRequestNumbers, setSimulatedRequestNumbers] = useState<{
    borrowNumber?: string;
    requisitionNumber?: string;
    submittedAt?: string;
  }>({});
  const [mockAssignedAssets, setMockAssignedAssets] = useState<
    Array<{ itemName: string; assetCode: string }>
  >([]);

  // When drawer opens, reset to CART if previously closed
  useEffect(() => {
    if (isOpen) {
      if (stage === 'CONFIRMATION_SLIP') {
        // keep current slip if still in confirmation
      } else {
        setStage('CART');
      }
    }
  }, [isOpen]);

  // Handle course change: auto-select instructor if available
  const handleCourseChange = (selectedId: string) => {
    setCourseId(selectedId);
    const found = courses.find((c) => c.id === selectedId);
    if (found?.instructorName) {
      setAdvisorName(found.instructorName);
      setIsEditingAdvisor(false);
    } else {
      setAdvisorName('');
    }
  };

  // Helper: Get counts
  const validBorrowRows = useMemo(
    () => borrowItems.filter((b) => b.itemId && Number(b.quantity) > 0),
    [borrowItems]
  );
  const validReqRows = useMemo(
    () => requisitionItems.filter((r) => r.itemId && Number(r.quantity) > 0),
    [requisitionItems]
  );
  const totalCartCount = validBorrowRows.length + validReqRows.length;

  const totalBorrowPieces = validBorrowRows.reduce(
    (sum, b) => sum + Number(b.quantity),
    0
  );
  const totalReqPieces = validReqRows.reduce(
    (sum, r) => sum + Number(r.quantity),
    0
  );

  // Check if any equipment exceeds availability in the time window
  const conflictWarnings = useMemo(() => {
    const list: string[] = [];
    validBorrowRows.forEach((b) => {
      const avail = availabilityMap[b.itemId];
      if (avail && Number(b.quantity) > avail.availableNow) {
        list.push(`${avail.itemName} (ต้องการ ${b.quantity} แต่ว่างเพียง ${avail.availableNow})`);
      }
    });
    return list;
  }, [validBorrowRows, availabilityMap]);

  // Handler: Update quantity for equipment
  const handleSetEquipmentQty = (itemId: string, newQty: number) => {
    const targetQty = Math.max(0, newQty);
    let updated = [...borrowItems];
    const idx = updated.findIndex((b) => b.itemId === itemId);
    if (targetQty === 0) {
      if (idx !== -1) updated = updated.filter((_, i) => i !== idx);
    } else {
      if (idx !== -1) {
        updated[idx].quantity = targetQty;
      } else {
        updated.push({ itemId, quantity: targetQty });
      }
    }
    onUpdateBorrowItems(updated.length > 0 ? updated : [{ itemId: '', quantity: '' }]);
  };

  // Handler: Update quantity for consumable
  const handleSetConsumableQty = (itemId: string, newQty: number, isSubUnit?: boolean) => {
    const targetQty = Math.max(0, newQty);
    let updated = [...requisitionItems];
    const idx = updated.findIndex((r) => r.itemId === itemId);
    const item = consumablesList.find((it) => it.id === itemId);
    const unitLabel = isSubUnit ? item?.usageUnit || 'ชิ้น' : item?.unit || 'หน่วย';

    if (targetQty === 0) {
      if (idx !== -1) updated = updated.filter((_, i) => i !== idx);
    } else {
      if (idx !== -1) {
        updated[idx].quantity = targetQty;
        if (isSubUnit !== undefined) {
          updated[idx].isSubUnit = isSubUnit;
          updated[idx].requestedUnit = unitLabel;
        }
      } else {
        updated.push({
          itemId,
          quantity: targetQty,
          isSubUnit: isSubUnit || false,
          requestedUnit: unitLabel,
        });
      }
    }
    onUpdateRequisitionItems(
      updated.length > 0
        ? updated
        : [{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' }]
    );
  };

  // Submit simulated or real request
  const handleProceedSubmit = async () => {
    if (!purpose.trim()) {
      alert('กรุณาระบุวัตถุประสงค์ในการยืม-เบิกพัสดุ');
      return;
    }

    if (isSimulation) {
      // Generate Simulated Numbers
      const now = new Date();
      const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
      const simBorrow = validBorrowRows.length > 0 ? `BR-${ymd}-SIM01` : undefined;
      const simReq = validReqRows.length > 0 ? `RQ-${ymd}-SIM01` : undefined;

      setSimulatedRequestNumbers({
        borrowNumber: simBorrow,
        requisitionNumber: simReq,
        submittedAt: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      });
      setSimulatedStatus('PENDING');

      // Create mock assigned assets for equipment items
      const mockAssets = validBorrowRows.map((b, i) => {
        const item = equipmentList.find((it) => it.id === b.itemId);
        return {
          itemName: item?.name || 'ครุภัณฑ์',
          assetCode: `${item?.code || 'EQ'}-ASSET-${String(i + 1).padStart(2, '0')}`,
        };
      });
      setMockAssignedAssets(mockAssets);

      setStage('CONFIRMATION_SLIP');
    } else if (onSubmitRealRequest) {
      // Connect to real backend
      const payload = {
        courseId: courseId || null,
        advisorName: advisorName || null,
        purpose,
        useTarget,
        borrowDate,
        expectedReturnDate,
        borrowItems: validBorrowRows,
        requisitionItems: validReqRows,
      };
      const result = await onSubmitRealRequest(payload);
      if (result.success) {
        setStage('CONFIRMATION_SLIP');
      } else {
        alert(result.error || 'ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 1. Backdrop Blur (Click outside to close) */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* 2. Slide-Over Panel from Right */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div className="w-screen max-w-md md:max-w-xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
          {/* ========================================================= */}
          {/* STAGE 1: CART REVIEW (ตรวจสอบรายการในตะกร้า) */}
          {/* ========================================================= */}
          {stage === 'CART' && (
            <>
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                    <ShoppingCart className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>ตะกร้าพัสดุที่เลือกไว้</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {totalCartCount} รายการ
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ตรวจสอบรายการและจำนวนก่อนเข้าสู่ขั้นตอนระบุวัน-เวลาและรายวิชา
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="ปิดแผงสไลด์"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conflict Alert Banner if any item has time conflict */}
              {conflictWarnings.length > 0 && (
                <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">แจ้งเตือนคิวเวลาชนกัน:</strong>
                    <ul className="list-disc list-inside text-[11px] mt-0.5 space-y-0.5 text-amber-800 dark:text-amber-300">
                      {conflictWarnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Body: Items List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                {totalCartCount === 0 ? (
                  <div className="text-center py-20 space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 opacity-40" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      ยังไม่มีรายการพัสดุในตะกร้า
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      คลิกปุ่ม "+ เลือก" บนการ์ดพัสดุในแคตตาล็อกเพื่อหยิบใส่ตะกร้า
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Equipment Section */}
                    {validBorrowRows.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Package className="w-4 h-4" />
                            <span>ครุภัณฑ์ (ยืมใช้งานแล้วต้องส่งคืน)</span>
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            รวม {totalBorrowPieces} ชิ้น
                          </span>
                        </div>

                        <div className="space-y-2">
                          {validBorrowRows.map((b) => {
                            const item = equipmentList.find((it) => it.id === b.itemId);
                            if (!item) return null;
                            const avail = availabilityMap[item.id];
                            const isOver = avail && Number(b.quantity) > avail.availableNow;

                            return (
                              <div
                                key={b.itemId}
                                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                                  isOver
                                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                                    : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 shadow-2xs'
                                }`}
                              >
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.imageUrl ? (
                                    <img
                                      src={formatImageUrl(item.imageUrl)}
                                      alt={item.name}
                                      className="w-full h-full object-contain p-1"
                                    />
                                  ) : (
                                    <Package className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>

                                {/* Title & Storage */}
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                    {item.code}
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {item.name}
                                  </h5>
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                    <Building2 className="w-3 h-3 text-teal-500 shrink-0" />
                                    <span>{item.storageLocation?.name || item.location || 'คลังพัสดุ'}</span>
                                  </p>
                                </div>

                                {/* Stepper & Remove */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetEquipmentQty(item.id, Number(b.quantity) - 1)
                                      }
                                      className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center cursor-pointer shadow-2xs text-slate-700 dark:text-slate-200"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono text-xs font-bold px-2">
                                      {b.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetEquipmentQty(item.id, Number(b.quantity) + 1)
                                      }
                                      className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center cursor-pointer shadow-2xs"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleSetEquipmentQty(item.id, 0)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
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

                    {/* Consumables Section */}
                    {validReqRows.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Boxes className="w-4 h-4" />
                            <span>วัสดุสิ้นเปลือง (เบิกใช้หมดไป)</span>
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            รวม {totalReqPieces} หน่วย
                          </span>
                        </div>

                        <div className="space-y-2">
                          {validReqRows.map((r) => {
                            const item = consumablesList.find((it) => it.id === r.itemId);
                            if (!item) return null;
                            const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
                            const hasSub = ratio > 1 || !!item.usageUnit;

                            return (
                              <div
                                key={r.itemId}
                                className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3"
                              >
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.imageUrl ? (
                                    <img
                                      src={formatImageUrl(item.imageUrl)}
                                      alt={item.name}
                                      className="w-full h-full object-contain p-1"
                                    />
                                  ) : (
                                    <Boxes className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>

                                {/* Title & Subunit Switcher */}
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                                    {item.code}
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {item.name}
                                  </h5>

                                  {hasSub && (
                                    <div className="inline-flex items-center gap-1 mt-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetConsumableQty(item.id, Number(r.quantity), false)
                                        }
                                        className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                                          !r.isSubUnit
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        กล่อง
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetConsumableQty(item.id, Number(r.quantity), true)
                                        }
                                        className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                                          r.isSubUnit
                                            ? 'bg-teal-600 text-white shadow-2xs'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        ชิ้น ({item.usageUnit || 'ย่อย'})
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Stepper & Remove */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetConsumableQty(
                                          item.id,
                                          Number(r.quantity) - 1,
                                          r.isSubUnit
                                        )
                                      }
                                      className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center cursor-pointer shadow-2xs text-slate-700 dark:text-slate-200"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono text-xs font-bold px-2">
                                      {r.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetConsumableQty(
                                          item.id,
                                          Number(r.quantity) + 1,
                                          r.isSubUnit
                                        )
                                      }
                                      className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center cursor-pointer shadow-2xs"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSetConsumableQty(item.id, 0, r.isSubUnit)
                                    }
                                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
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
                  </>
                )}
              </div>

              {/* Footer: Proceed to Checkout Button */}
              {totalCartCount > 0 && (
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>ยอดรวมทั้งหมด:</span>
                    <strong className="text-slate-900 dark:text-white font-black text-sm">
                      {totalBorrowPieces > 0 && `ยืม ${totalBorrowPieces} ชิ้น `}
                      {totalReqPieces > 0 && `เบิก ${totalReqPieces} หน่วย`}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStage('CHECKOUT_FORM')}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-teal-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    <span>ระบุข้อมูลเพื่อขอยืม-เบิกพัสดุ</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* STAGE 2: CHECKOUT FORM (กรอกข้อมูลการยืม-เบิก) */}
          {/* ========================================================= */}
          {stage === 'CHECKOUT_FORM' && (
            <>
              {/* Header with Back button */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStage('CART')}
                    className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    title="กลับไปแก้ไขตะกร้า"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      ข้อมูลคำขอยืม-เบิกพัสดุ
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      กรอกข้อมูลสำหรับอนุมัติและจัดเตรียมพัสดุ ({totalCartCount} รายการ)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
                {/* 1. Course Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                    <span>รายวิชาที่ใช้ฝึกปฏิบัติการ</span>
                  </label>
                  <select
                    value={courseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  >
                    <option value="">-- ไม่ระบุรายวิชา (ฝึกทักษะด้วยตนเอง) --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} {c.name} {c.instructorName ? `(${c.instructorName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Advisor / Responsible Instructor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-teal-500" />
                      <span>อาจารย์ผู้รับทราบ / อนุมัติคำขอ</span>
                    </label>
                    {courseId && (
                      <button
                        type="button"
                        onClick={() => setIsEditingAdvisor(!isEditingAdvisor)}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        {isEditingAdvisor ? 'ใช้อาจารย์ประจำวิชา' : 'เปลี่ยนอาจารย์'}
                      </button>
                    )}
                  </div>

                  {courseId && !isEditingAdvisor && advisorName ? (
                    <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-teal-600" />
                        <span className="font-bold text-teal-900 dark:text-teal-200">
                          {advisorName}
                        </span>
                      </div>
                      <span className="text-[10px] bg-teal-200/60 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-md font-bold">
                        อาจารย์ประจำวิชา
                      </span>
                    </div>
                  ) : (
                    <select
                      value={advisorName}
                      onChange={(e) => setAdvisorName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                    >
                      <option value="">-- กรุณาเลือกอาจารย์จากรายชื่อ --</option>
                      {instructors.map((ins) => {
                        const formatted = formatUserName(ins);
                        return (
                          <option key={ins.id} value={formatted}>
                            {formatted} ({ins.department || 'อาจารย์พยาบาล'})
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* 3. Clinical Safety Target (หุ่นจำลอง vs คนจริง) */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    เป้าหมายการนำไปใช้งาน (Safety & Clinical Target) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUseTarget('SIMULATION')}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                        useTarget === 'SIMULATION'
                          ? 'bg-teal-50/90 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500/20 text-teal-900 dark:text-teal-200 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-lg">🧪</span>
                        <span>ฝึกกับหุ่นจำลอง</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        อนุญาตให้เบิกวัสดุฝึกซ้ำได้ (Sim-Lab)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseTarget('HUMAN')}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                        useTarget === 'HUMAN'
                          ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/20 text-rose-900 dark:text-rose-200 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-lg">🧑‍⚕️</span>
                        <span className="text-rose-700 dark:text-rose-400">ใช้กับคนจริง / คลินิก</span>
                      </div>
                      <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 leading-tight">
                        ระบบบล็อกเวชภัณฑ์หมดอายุ 100%
                      </p>
                    </button>
                  </div>
                </div>

                {/* 4. Purpose with Quick Presets */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    วัตถุประสงค์ในการยืม-เบิก <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="เช่น ใช้ฝึกหัตถการแทงเส้นและให้สารน้ำในชั่วโมงฝึกทักษะด้วยตนเอง"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  />

                  {/* Purpose Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-400 font-bold">ตัวเลือกด่วน:</span>
                    {[
                      'ฝึกแทงเส้น IV และให้สารน้ำ',
                      'ฝึกทำแผลแห้งและแผลเปียก',
                      'ฝึก CPR และใช้เครื่อง AED',
                      'ฝึกใส่สายยางให้อาหาร (NG Tube)',
                    ].map((pre) => (
                      <button
                        key={pre}
                        type="button"
                        onClick={() => setPurpose(pre)}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[10px] transition cursor-pointer"
                      >
                        + {pre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Interactive Date & Time Window Picker (ย้ายมากรอกในหน้าข้อมูลคำขอยืม-เบิกโดยตรง) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>
                        {validBorrowRows.length > 0
                          ? 'กำหนดวัน-เวลารับและส่งคืนพัสดุ'
                          : 'กำหนดวัน-เวลารับวัสดุสิ้นเปลือง'}
                      </span>
                      <span className="text-rose-500">*</span>
                    </div>

                    {/* Real-time Availability Badge for Equipment in Cart */}
                    {validBorrowRows.length > 0 && (
                      <div>
                        {isCheckingAvailability ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 animate-pulse">
                            กำลังเช็กคิวว่าง...
                          </span>
                        ) : conflictWarnings.length > 0 ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>คิวชน {conflictWarnings.length} รายการ</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>ครุภัณฑ์ว่างพร้อมยืม</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Time-Slot Preset Pills */}
                  {onApplyPreset && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { id: 'MORNING', label: '🌅 พรุ่งนี้เช้า' },
                        { id: 'AFTERNOON', label: '☀️ พรุ่งนี้บ่าย' },
                        { id: 'FULLDAY', label: '⏳ เต็มวัน' },
                        ...(validBorrowRows.length > 0
                          ? [
                              { id: 'THREE_DAYS', label: '🗓️ 3 วัน' },
                              { id: 'ONE_WEEK', label: '📅 1 สัปดาห์' },
                            ]
                          : []),
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onApplyPreset(p.id as any)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                            activePreset === p.id
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}

                      {isSimulation && validBorrowRows.length > 0 && onToggleSimulateConflict && (
                        <button
                          type="button"
                          onClick={onToggleSimulateConflict}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center gap-1 border ml-auto ${
                            simulateConflict
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-amber-50'
                          }`}
                          title="ทดสอบจำลองเหตุการณ์ที่มีผู้อื่นจองครุภัณฑ์ชนเวลา"
                        >
                          <FlaskConical className="w-3 h-3" />
                          <span>{simulateConflict ? 'จำลองคิวชน: เปิด' : 'จำลองคิวชน'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Date-Time Inputs Grid */}
                  <div
                    className={`grid ${
                      validBorrowRows.length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                    } gap-2.5`}
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                        วัน-เวลารับพัสดุ:
                      </label>
                      <input
                        type="datetime-local"
                        value={borrowDate}
                        onChange={(e) =>
                          onChangeDates?.({
                            borrowDate: e.target.value,
                            expectedReturnDate,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer"
                      />
                    </div>

                    {validBorrowRows.length > 0 ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                          วัน-เวลากำหนดส่งคืนครุภัณฑ์:
                        </label>
                        <input
                          type="datetime-local"
                          value={expectedReturnDate}
                          onChange={(e) =>
                            onChangeDates?.({
                              borrowDate,
                              expectedReturnDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer"
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>รายการในตะกร้าเป็นวัสดุสิ้นเปลืองทั้งหมด (เบิกใช้งานโดยไม่ต้องระบุวันส่งคืน)</span>
                      </p>
                    )}
                  </div>

                  {/* Conflict Warning Detail inside Checkout Form */}
                  {validBorrowRows.length > 0 && conflictWarnings.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>ครุภัณฑ์บางรายการมีคิวจองซ้อนทับในช่วงเวลาที่คุณเลือก:</span>
                      </div>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 pl-1">
                        {conflictWarnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 pt-0.5">
                        💡 แนะนำให้ปรับขยับช่วงเวลา หรือกดย้อนกลับไปลดจำนวนในตะกร้า
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Footer: Submit Button */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStage('CART')}
                  className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ย้อนกลับ
                </button>

                <button
                  type="button"
                  onClick={handleProceedSubmit}
                  className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isSimulation ? 'ยืนยันและจำลองการออกสลิป ✨' : 'ส่งคำขอยืม-เบิกจริง'}
                  </span>
                </button>
              </div>
            </>
          )}

          {/* ========================================================= */}
          {/* STAGE 3: CONFIRMATION SLIP & ROLE PLAY SIMULATOR */}
          {/* ========================================================= */}
          {stage === 'CONFIRMATION_SLIP' && (
            <>
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                      ยืนยันคำขอจำลองสำเร็จ!
                    </h3>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      ระบบได้สร้างรหัสคำขอและสลิปดิจิทัลเรียบร้อยแล้ว
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body: Simulated Digital Slip & Role Play Controls */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
                {/* 1. Digital Requisition Slip (ใบสลิปดิจิทัล) */}
                <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between border-b border-slate-200/70 dark:border-slate-700 pb-3">
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-teal-600 uppercase">
                        KUNURSE+ LAB SLIP (SIMULATED)
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        ใบคำขอยืม-เบิกพัสดุห้องปฏิบัติการ
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        เวลาที่ส่ง: {simulatedRequestNumbers.submittedAt || '13:30 น.'}
                      </p>
                    </div>

                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 text-slate-800 dark:text-slate-200">
                      <QrCode className="w-10 h-10" />
                    </div>
                  </div>

                  {/* Tracking Codes */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {simulatedRequestNumbers.borrowNumber && (
                      <div className="p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-bold">
                          รหัสใบยืมครุภัณฑ์:
                        </span>
                        <strong className="font-mono text-slate-900 dark:text-white text-xs">
                          {simulatedRequestNumbers.borrowNumber}
                        </strong>
                      </div>
                    )}

                    {simulatedRequestNumbers.requisitionNumber && (
                      <div className="p-2 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900">
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 block font-bold">
                          รหัสใบเบิกวัสดุ:
                        </span>
                        <strong className="font-mono text-slate-900 dark:text-white text-xs">
                          {simulatedRequestNumbers.requisitionNumber}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Requester & Course Info */}
                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <div>
                      ผู้ขอ:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {simulatedRole === 'STUDENT' ? 'นิสิตทดสอบระบบ' : 'อาจารย์ผู้สอน'}
                      </strong>
                    </div>
                    {advisorName && (
                      <div>
                        อาจารย์ผู้รับทราบ:{' '}
                        <strong className="text-slate-900 dark:text-white">{advisorName}</strong>
                      </div>
                    )}
                    {purpose && (
                      <div>
                        วัตถุประสงค์: <span className="italic">{purpose}</span>
                      </div>
                    )}
                  </div>

                  {/* Current Status Pill */}
                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">สถานะคำขอปัจจุบัน:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                        simulatedStatus === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : simulatedStatus === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                          : simulatedStatus === 'DISPENSED'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                      <span>
                        {simulatedStatus === 'PENDING'
                          ? '⏳ รออาจารย์อนุมัติ'
                          : simulatedStatus === 'APPROVED'
                          ? '✓ อาจารย์อนุมัติแล้ว (พร้อมรับของ)'
                          : simulatedStatus === 'DISPENSED'
                          ? '📦 เจ้าหน้าที่จ่ายของแล้ว (กำลังยืม)'
                          : '✨ ส่งคืนครุภัณฑ์เรียบร้อย'}
                      </span>
                    </span>
                  </div>

                  {/* Assigned Assets if dispensed */}
                  {simulatedStatus === 'DISPENSED' && mockAssignedAssets.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-1">
                      <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>หมายเลขเครื่องจริงที่จ่ายออก (Assigned Assets):</span>
                      </div>
                      <div className="space-y-0.5 font-mono text-[11px]">
                        {mockAssignedAssets.map((a, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-300">{a.itemName}</span>
                            <strong className="text-purple-700 dark:text-purple-300">{a.assetCode}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Interactive Role Play Simulator (สนามทดสอบสลับบทบาท) */}
                <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-teal-50/70 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-teal-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                    <FlaskConical className="w-4 h-4 text-indigo-600" />
                    <span>จำลองกระบวนการทำงานจริง (Interactive Workflow Simulation):</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    คลิกปุ่มเพื่อทดสอบว่าเมื่อระบบนำไปใช้จริง ขั้นตอนของอาจารย์และเจ้าหน้าที่จะทำงานอย่างไร:
                  </p>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {/* Step A: Teacher Approve */}
                    <button
                      type="button"
                      disabled={simulatedStatus !== 'PENDING'}
                      onClick={() => setSimulatedStatus('APPROVED')}
                      className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center justify-between cursor-pointer ${
                        simulatedStatus === 'PENDING'
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                          : 'bg-white/80 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span>1. จำลอง: อาจารย์กดอนุมัติคำขอ</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Step B: Lab Officer Dispense / POS Scan */}
                    <button
                      type="button"
                      disabled={simulatedStatus !== 'APPROVED'}
                      onClick={() => setSimulatedStatus('DISPENSED')}
                      className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center justify-between cursor-pointer ${
                        simulatedStatus === 'APPROVED'
                          ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                          : 'bg-white/80 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>2. จำลอง: เจ้าหน้าที่หน้าแล็ปยิงจ่ายของ (POS)</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Step C: Student Return */}
                    <button
                      type="button"
                      disabled={simulatedStatus !== 'DISPENSED'}
                      onClick={() => setSimulatedStatus('RETURNED')}
                      className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center justify-between cursor-pointer ${
                        simulatedStatus === 'DISPENSED'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                          : 'bg-white/80 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        <span>3. จำลอง: นิสิตส่งคืนครุภัณฑ์</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Slip Footer: Reset or Close */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStage('CART');
                    setSimulatedStatus('PENDING');
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition cursor-pointer text-center"
                >
                  เริ่มจำลองรายการใหม่
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
