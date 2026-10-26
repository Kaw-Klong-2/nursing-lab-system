'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  Sparkles,
  ShieldCheck,
  FileText,
  Boxes,
} from 'lucide-react';
import { formatUserName } from '@/lib/user-utils';

interface ConsumableReturnModalProps {
  requisition: any;
  currentUserId?: string;
  onClose: () => void;
  onSuccess: (updatedRequisition?: any) => void;
}

export default function ConsumableReturnModal({
  requisition,
  currentUserId,
  onClose,
  onSuccess,
}: ConsumableReturnModalProps) {
  // State for items return form
  const [returnEntries, setReturnEntries] = useState<
    {
      requisitionItemId: string;
      itemName: string;
      requestedUnit: string;
      isSubUnit: boolean;
      usageUnit?: string;
      unitCost: number;
      conversionRatio: number;
      quantityDispensed: number;
      quantityReturned: number;
      maxReturnable: number;
      quantityToReturn: number | '';
      condition: 'SEALED_INTACT' | 'UNSEALED_USABLE_SIM' | 'DAMAGED_DISCARD';
      note: string;
    }[]
  >(() => {
    return (requisition.items || []).map((it: any) => {
      const alreadyRet = it.quantityReturned || 0;
      const maxRet = Math.max(0, it.quantityDispensed - alreadyRet);
      return {
        requisitionItemId: it.id,
        itemName: it.item?.name || it.name,
        requestedUnit: it.requestedUnit || it.item?.unit || 'หน่วย',
        isSubUnit: it.isSubUnit === true,
        usageUnit: it.item?.usageUnit,
        unitCost: it.unitCost || 0,
        conversionRatio: Number(it.item?.conversionRatio) > 0 ? Number(it.item?.conversionRatio) : 1,
        quantityDispensed: it.quantityDispensed,
        quantityReturned: alreadyRet,
        maxReturnable: maxRet,
        quantityToReturn: '',
        condition: 'SEALED_INTACT',
        note: '',
      };
    });
  });

  const [generalNote, setGeneralNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    savedCost: number;
    count: number;
  } | null>(null);

  const handleQuantityChange = (idx: number, val: string) => {
    setReturnEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== idx) return entry;
        if (val === '') return { ...entry, quantityToReturn: '' };
        const num = Math.max(0, parseInt(val, 10) || 0);
        const clamped = Math.min(num, entry.maxReturnable);
        return { ...entry, quantityToReturn: clamped };
      })
    );
  };

  const handleSetMax = (idx: number) => {
    setReturnEntries((prev) =>
      prev.map((entry, i) =>
        i === idx ? { ...entry, quantityToReturn: entry.maxReturnable } : entry
      )
    );
  };

  const handleConditionChange = (
    idx: number,
    cond: 'SEALED_INTACT' | 'UNSEALED_USABLE_SIM' | 'DAMAGED_DISCARD'
  ) => {
    setReturnEntries((prev) =>
      prev.map((entry, i) => (i === idx ? { ...entry, condition: cond } : entry))
    );
  };

  // Calculate total return summary
  const totalItemsToReturn = returnEntries.reduce(
    (acc, curr) => acc + (typeof curr.quantityToReturn === 'number' ? curr.quantityToReturn : 0),
    0
  );

  const estimatedSavedCost = returnEntries.reduce((acc, curr) => {
    const qty = typeof curr.quantityToReturn === 'number' ? curr.quantityToReturn : 0;
    if (qty <= 0) return acc;
    if (curr.condition === 'DAMAGED_DISCARD') return acc; // Discarded waste doesn't credit money
    const itemCost =
      curr.isSubUnit && curr.conversionRatio > 1
        ? qty * (curr.unitCost / curr.conversionRatio)
        : qty * curr.unitCost;
    return acc + itemCost;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalItemsToReturn <= 0) {
      setErrorMsg('กรุณาระบุจำนวนวัสดุที่ต้องการรับคืนอย่างน้อย 1 รายการ');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payloadReturns = returnEntries
        .filter((entry) => typeof entry.quantityToReturn === 'number' && entry.quantityToReturn > 0)
        .map((entry) => ({
          requisitionItemId: entry.requisitionItemId,
          quantity: entry.quantityToReturn,
          isSubUnit: entry.isSubUnit,
          condition: entry.condition,
          note: entry.note,
        }));

      const res = await fetch('/api/requisitions/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitionId: requisition.id,
          operatorId: currentUserId,
          returns: payloadReturns,
          generalNote: generalNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการรับคืนวัสดุ');
      }

      setSuccessData({
        savedCost: data.totalSavedCost || 0,
        count: data.totalItemsReturnedCount || 0,
      });

      if (onSuccess) {
        onSuccess(data.requisition);
      }
    } catch (err: any) {
      console.error('Submit return error:', err);
      setErrorMsg(err.message || 'บันทึกการรับคืนไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92dvh] sm:max-h-[92vh] flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                รับคืนวัสดุสิ้นเปลืองเหลือใช้เข้าคลัง
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {requisition.requestNumber} &bull; ผู้เบิก: {formatUserName(requisition.user)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {successData ? (
          <div className="p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                รับคืนวัสดุเหลือใช้เข้าคลังสำเร็จ!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                รับคืนเข้าสู่สต็อกเรียบร้อยแล้ว {successData.count} ชิ้น
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 max-w-sm mx-auto text-xs space-y-1">
              <div className="text-emerald-800 dark:text-emerald-200 font-bold">
                มูลค่าต้นทุนที่ประหยัดได้คืน:
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                ฿{successData.savedCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-300">
                (ระบบปรับลดยอดค่าใช้จ่ายของคำขอตามจริงแล้ว)
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 shadow-md transition cursor-pointer"
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Instruction Tip */}
            <div className="p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">คำแนะนำการรับคืน:</span> ระบุจำนวนชิ้นที่นิสิตนำมาคืน (รองรับทั้งหน่วยใหญ่และเศษหน่วยย่อย) ระบบจะคำนวณคืนสต็อกเข้าคลังและปรับลดต้นทุนของคำขอให้ทันที
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {returnEntries.map((entry, idx) => (
                <div
                  key={entry.requisitionItemId}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {entry.itemName}
                      </span>
                      {entry.isSubUnit && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 font-bold">
                          เบิกย่อย
                        </span>
                      )}
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        เบิกไป: <b>{entry.quantityDispensed}</b> {entry.requestedUnit} &bull; คืนแล้ว: <b>{entry.quantityReturned}</b> {entry.requestedUnit} &bull; คืนได้อีกสูงสุด: <b className="text-teal-700 dark:text-teal-400">{entry.maxReturnable}</b> {entry.requestedUnit}
                      </div>
                    </div>

                    {/* Input Control */}
                    {entry.maxReturnable > 0 ? (
                      <div className="flex items-center gap-1.5 self-start sm:self-center">
                        <span className="text-[11px] text-slate-500">จำนวนคืน:</span>
                        <input
                          type="number"
                          min={0}
                          max={entry.maxReturnable}
                          value={entry.quantityToReturn}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          placeholder="0"
                          className="w-20 px-2.5 py-1 text-center font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSetMax(idx)}
                          className="px-2 py-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 transition cursor-pointer"
                        >
                          ทั้งหมด
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        ✓ คืนครบจำนวนแล้ว
                      </span>
                    )}
                  </div>

                  {/* Conditions & Note (Only when quantity > 0) */}
                  {typeof entry.quantityToReturn === 'number' && entry.quantityToReturn > 0 && (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 animate-fadeIn">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          สภาพพัสดุ:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleConditionChange(idx, 'SEALED_INTACT')}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                              entry.condition === 'SEALED_INTACT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <span>🟢 ซองสมบูรณ์ (เข้าคลังหลัก)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConditionChange(idx, 'UNSEALED_USABLE_SIM')}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                              entry.condition === 'UNSEALED_USABLE_SIM'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <span>🟡 ซองเปิดแต่สะอาด (เข้าคลังฝึกหุ่น Sim)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConditionChange(idx, 'DAMAGED_DISCARD')}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                              entry.condition === 'DAMAGED_DISCARD'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <span>🔴 ชำรุด/ทิ้ง (ไม่เพิ่มสต็อก)</span>
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={entry.note}
                        onChange={(e) =>
                          setReturnEntries((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, note: e.target.value } : item))
                          )
                        }
                        placeholder="หมายเหตุเฉพาะรายการนี้ (ถ้ามี) เช่น นิสิตใช้ไป 6 ชิ้น เหลือ 4 ชิ้น..."
                        className="w-full text-[11px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* General Note */}
            <div>
              <input
                type="text"
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติมการรับคืนโดยรวม (ถ้ามี)..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Summary & Submit Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs">
                <span className="text-slate-500">รวมส่งคืน:</span>{' '}
                <strong className="text-teal-700 dark:text-teal-400 font-bold">
                  {totalItemsToReturn} ชิ้น
                </strong>
                {estimatedSavedCost > 0 && (
                  <span className="ml-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                    (ประหยัดต้นทุนคืน ฿{estimatedSavedCost.toFixed(2)} บาท)
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting || totalItemsToReturn <= 0}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
                  <span>{submitting ? 'กำลังบันทึกรับคืน...' : 'ยืนยันการรับคืนเข้าคลัง'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
