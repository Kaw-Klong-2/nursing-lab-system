'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import BorrowSlipModal from '@/components/slips/BorrowSlipModal';
import { formatOverdueDuration } from '@/lib/date-time-utils';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Printer,
  Home,
  User,
  BookOpen,
  Calendar,
  Sparkles,
  Stethoscope,
  Boxes,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { formatUserName, formatTeacherName } from '@/lib/user-utils';

export default function BorrowSlipVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;
  const { currentUser, isOfficer, isAdmin, isLoading: isAuthLoading } = useAuth();

  const [borrow, setBorrow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Quick Return Modal State for Staff
  const [showQuickReturnModal, setShowQuickReturnModal] = useState(false);
  const [itemConditions, setItemConditions] = useState<{ id: string; condition: 'GOOD' | 'DAMAGED'; note: string }[]>([]);
  const [returnNote, setReturnNote] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Requisition surplus returns in quick return
  const [reqReturns, setReqReturns] = useState<{ id: string; quantity: number | ''; condition: 'SEALED_INTACT' | 'UNSEALED_USABLE_SIM' }[]>([]);

  const fetchBorrow = async () => {
    if (!code) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/borrow/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่พบข้อมูลคำขอยืมนี้ในระบบ');
      }
      setBorrow(data);

      // Initialize item conditions
      setItemConditions(
        (data.items || []).map((it: any) => ({
          id: it.id,
          condition: (it.returnCondition as 'GOOD' | 'DAMAGED') || 'GOOD',
          note: '',
        }))
      );

      // Initialize requisition surplus items if present
      if (data.requisitionRequest?.items) {
        setReqReturns(
          data.requisitionRequest.items.map((r: any) => ({
            id: r.id,
            quantity: '',
            condition: 'SEALED_INTACT',
          }))
        );
      }
    } catch (err: any) {
      console.error('Fetch borrow slip verification error:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrow();
  }, [code]);

  // Handle Quick Return
  const handleConfirmQuickReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrow) return;

    try {
      setSubmittingReturn(true);

      const hasDamaged = itemConditions.some((it) => it.condition === 'DAMAGED');
      const surplusPayload = reqReturns
        .filter((r) => typeof r.quantity === 'number' && r.quantity > 0)
        .map((r) => ({
          requisitionItemId: r.id,
          quantity: r.quantity,
          condition: r.condition,
        }));

      const res = await fetch(`/api/borrow/${borrow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RETURN',
          userId: currentUser?.id,
          returnCondition: hasDamaged ? 'DAMAGED' : 'GOOD',
          returnNote: returnNote.trim() || undefined,
          itemReturns: itemConditions,
          requisitionReturns: surplusPayload.length > 0 ? surplusPayload : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการตรวจรับคืน');
      }

      setShowQuickReturnModal(false);
      await fetchBorrow();
    } catch (err: any) {
      console.error('Quick return error:', err);
      alert(err.message || 'บันทึกการรับคืนไม่สำเร็จ');
    } finally {
      setSubmittingReturn(false);
    }
  };

  if (loading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <LoadingSpinner
          message="กำลังโหลดข้อมูลใบรายการยืม-คืน..."
          submessage="กำลังตรวจสอบรหัสคำขอและสถานะอุปกรณ์ Real-time"
        />
      </div>
    );
  }

  if (errorMsg || !borrow) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          ไม่พบข้อมูลเอกสารใบยืมนี้
        </h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
          {errorMsg || 'รหัสคำขออาจไม่ถูกต้อง หรือถูกยกเลิกไปแล้ว'}
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-md hover:bg-teal-500 transition"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  // Calculate overdue status
  const overdueInfo = formatOverdueDuration(borrow.expectedReturnDate);
  const isOverdue = borrow.status === 'BORROWED' && overdueInfo.isOverdue;

  // Status Badge Helper
  const getStatusBadge = () => {
    if (borrow.status === 'RETURNED_COMPLETE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>ส่งคืนครบถ้วนแล้ว (RETURNED)</span>
        </span>
      );
    }
    if (borrow.status === 'RETURNED_WITH_ISSUE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>ส่งคืนแล้ว (พบอุปกรณ์ชำรุด)</span>
        </span>
      );
    }
    if (borrow.status === 'BORROWED') {
      if (isOverdue) {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>{overdueInfo.label} (OVERDUE)</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
          <Clock className="w-3.5 h-3.5" />
          <span>อยู่ระหว่างการยืม (BORROWED)</span>
        </span>
      );
    }
    if (borrow.status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>อนุมัติแล้ว (รอรับอุปกรณ์ที่ห้องแล็บ)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300">
        <span>สถานะ: {borrow.status}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Top Navbar / Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition"
          >
            <Home className="w-4 h-4" />
            <span>กลับหน้าหลักระบบ</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowSlipModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-200 text-xs font-bold shadow-xs hover:bg-teal-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>พิมพ์ใบรายการ (A4 / 80mm)</span>
          </button>
        </div>

        {/* Staff Quick Control Bar */}
        {(isOfficer || isAdmin) && (
          <div className="p-4 rounded-3xl bg-teal-600 text-white shadow-lg shadow-teal-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-black text-sm">👮 โหมดเจ้าหน้าที่ห้องปฏิบัติการ</div>
                <div className="text-xs text-teal-100">
                  สแกนเพื่อตรวจสอบสถานะหรือกดรับคืนอุปกรณ์ได้ทันที
                </div>
              </div>
            </div>

            {borrow.status === 'BORROWED' && (
              <button
                type="button"
                onClick={() => setShowQuickReturnModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-teal-900 font-black text-xs hover:bg-teal-50 shadow-md transition cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-teal-700" />
                <span>⚡ ตรวจรับคืนอุปกรณ์ด่วน (Quick Return)</span>
              </button>
            )}
          </div>
        )}

        {/* Main Document Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                Digital Handover Docket & Verification
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {borrow.requestNumber}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                ห้องปฏิบัติการพยาบาลศาสตร์ คณะพยาบาลศาสตร์
              </p>
            </div>
            <div>{getStatusBadge()}</div>
          </div>

          {/* Timeline & Due Date Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">วันเวลานัดรับ / จ่ายของ:</span>
              <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {new Date(borrow.checkedOutAt || borrow.borrowDate).toLocaleString('th-TH', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                น.
              </div>
            </div>
            <div>
              <span className="text-slate-500">กำหนดส่งคืนห้องปฏิบัติการ:</span>
              <div
                className={`font-black mt-0.5 ${
                  isOverdue
                    ? 'text-rose-600 dark:text-rose-400 text-sm'
                    : 'text-teal-700 dark:text-teal-400'
                }`}
              >
                {new Date(borrow.expectedReturnDate).toLocaleString('th-TH', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                น.
              </div>
            </div>
          </div>

          {/* Borrower Information */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600" />
              <span>ข้อมูลผู้ยืม-เบิก:</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ชื่อ-นามสกุล:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatUserName(borrow.user)} {borrow.user?.studentId ? `(${borrow.user.studentId})` : ''}
                </span>
              </div>
              {borrow.course && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">รายวิชา:</span>
                  <span className="font-bold text-teal-700 dark:text-teal-400">
                    [{borrow.course.code}] {borrow.course.name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">อาจารย์ผู้สอน/ที่ปรึกษา:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatTeacherName(borrow.advisorName || borrow.course?.instructorName || '-')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">วัตถุประสงค์:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{borrow.purpose || '-'}</span>
              </div>
            </div>
          </div>

          {/* Equipment Items List */}
          <div className="space-y-2.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-cyan-600" />
                <span>รายการครุภัณฑ์คงทนที่ยืม ({borrow.items?.length || 0} รายการ):</span>
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3">รายการอุปกรณ์</th>
                    <th className="p-3 text-center">รหัส Asset ID</th>
                    <th className="p-3 text-center">จำนวน</th>
                    <th className="p-3 text-right">สถานะชิ้นนี้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(borrow.items || []).map((it: any, idx: number) => {
                    const isItemReturned = it.isReturned === true || borrow.status === 'RETURNED_COMPLETE' || borrow.status === 'RETURNED_WITH_ISSUE';
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                          {it.item?.name || it.name}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-teal-700 dark:text-teal-400">
                          {it.asset?.assetCode || it.assetCode || '-'}
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-300">
                          {it.quantity || 1} {it.item?.unit || it.unit || 'ชิ้น'}
                        </td>
                        <td className="p-3 text-right">
                          {isItemReturned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> คืนแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              <Clock className="w-3 h-3" /> อยู่ระหว่างการยืม
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consumables (if linked requisition) */}
          {borrow.requisitionRequest?.items && borrow.requisitionRequest.items.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-teal-600" />
                <span>วัสดุสิ้นเปลืองที่จ่ายร่วม:</span>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/30">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">รายการพัสดุ</th>
                      <th className="p-2.5 text-right">จำนวนที่จ่าย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {borrow.requisitionRequest.items.map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5 text-slate-800 dark:text-slate-200 font-medium">
                          {r.item?.name || r.name}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                          {r.quantityDispensed > 0 ? r.quantityDispensed : r.quantityRequested}{' '}
                          {r.requestedUnit || r.item?.unit || 'หน่วย'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Return Guideline Advice for Students */}
          <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5 leading-relaxed">
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <div>
              <b>คำแนะนำสำหรับนิสิต:</b> เมื่อถึงกำหนดส่งคืน
              กรุณานำอุปกรณ์ทั้งหมดพร้อมใบรายการนี้มาติดต่อเจ้าหน้าที่ ณ ห้องปฏิบัติการพยาบาลศาสตร์
              เพื่อให้เจ้าหน้าที่สแกน QR Code ตรวจรับคืนเข้าสู่ระบบได้อย่างถูกต้องและรวดเร็ว
            </div>
          </div>
        </div>
      </div>

      {/* Slip Modal */}
      {showSlipModal && (
        <BorrowSlipModal borrow={borrow} onClose={() => setShowSlipModal(false)} />
      )}

      {/* Staff Quick Return Modal */}
      {showQuickReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  ตรวจรับคืนอุปกรณ์ (Quick Return)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickReturnModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickReturn} className="flex-1 flex flex-col overflow-hidden space-y-4 text-xs">
              <p className="text-slate-500">
                ผู้ยืม: <b>{formatUserName(borrow.user)}</b> &bull; คำขอเลขที่ <b>{borrow.requestNumber}</b>
              </p>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  ตรวจเช็คสภาพอุปกรณ์แต่ละชิ้น:
                </div>
                {borrow.items?.map((it: any, idx: number) => {
                  const cond = itemConditions.find((c) => c.id === it.id)?.condition || 'GOOD';
                  return (
                    <div
                      key={it.id}
                      className={`p-3 rounded-2xl border transition ${
                        cond === 'DAMAGED'
                          ? 'bg-rose-50/70 border-rose-300 dark:bg-rose-950/40 dark:border-rose-900'
                          : 'bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{it.item?.name}</div>
                          <div className="text-[10px] font-mono text-teal-700 dark:text-teal-400">
                            Asset ID: {it.asset?.assetCode || '-'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setItemConditions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, condition: 'GOOD' } : item))
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                              cond === 'GOOD'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            ✓ สมบูรณ์
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setItemConditions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, condition: 'DAMAGED' } : item))
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                              cond === 'DAMAGED'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            ⚠️ ชำรุด
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หมายเหตุการตรวจรับคืน (ถ้ามี):
                  </label>
                  <input
                    type="text"
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    placeholder="เช่น นิสิตส่งคืนครบ อุปกรณ์สะอาดพร้อมใช้..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickReturnModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-4 h-4 ${submittingReturn ? 'animate-spin' : ''}`} />
                  <span>{submittingReturn ? 'กำลังบันทึกรับคืน...' : 'ยืนยันการรับคืน'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
