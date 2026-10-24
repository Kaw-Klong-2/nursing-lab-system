'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import RequisitionSlipModal from '@/components/slips/RequisitionSlipModal';
import {
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  Home,
  User,
  Boxes,
  AlertCircle,
} from 'lucide-react';
import { formatUserName, formatTeacherName } from '@/lib/user-utils';

export default function UniversalVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || '';

  const [requisition, setRequisition] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSlip, setShowSlip] = useState(false);

  useEffect(() => {
    if (!code) return;

    // If borrow code, redirect to specialized borrow verification page
    if (code.startsWith('BR-') || code.startsWith('BOR-')) {
      router.replace(`/verify/borrow/${encodeURIComponent(code)}`);
      return;
    }

    // Otherwise, fetch requisition or general transaction
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await fetch(`/api/requisitions/${encodeURIComponent(code)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'ไม่พบข้อมูลเอกสารนี้ในระบบ');
        }
        setRequisition(data);
      } catch (err: any) {
        console.error('Universal verification error:', err);
        setErrorMsg(err.message || 'ไม่สามารถโหลดข้อมูลเอกสารได้');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [code, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <LoadingSpinner message="กำลังตรวจสอบรหัสเอกสาร..." submessage="กำลังค้นหาข้อมูลในระบบ" />
      </div>
    );
  }

  if (errorMsg || !requisition) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          ไม่พบข้อมูลเอกสารในระบบ
        </h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
          {errorMsg || 'รหัสที่สแกนอาจไม่ถูกต้อง หรือรายการถูกลบออกจากระบบแล้ว'}
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

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Navigation */}
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
            onClick={() => setShowSlip(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-200 text-xs font-bold shadow-xs hover:bg-teal-50 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-teal-600" />
            <span>พิมพ์สลิปเอกสาร (Slip)</span>
          </button>
        </div>

        {/* Requisition Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                Digital Requisition Docket
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {requisition.requestNumber}
              </h1>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{requisition.status === 'DISPENSED' ? 'จ่ายพัสดุแล้ว' : requisition.status}</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ผู้ขอเบิก:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {formatUserName(requisition.user)} {requisition.user?.studentId ? `(${requisition.user.studentId})` : ''}
              </span>
            </div>
            {requisition.course && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">รายวิชา:</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">
                  [{requisition.course.code}] {requisition.course.name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">วัตถุประสงค์:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{requisition.purpose || '-'}</span>
            </div>
          </div>

          {/* Table */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-teal-600" />
              <span>รายการวัสดุสิ้นเปลืองที่ตัดจ่าย:</span>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3">รายการพัสดุ</th>
                    <th className="p-3 text-center">จำนวน</th>
                    <th className="p-3 text-right">รวมต้นทุน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(requisition.items || []).map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {it.item?.name || it.name}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400">
                        {it.quantityDispensed > 0 ? it.quantityDispensed : it.quantityRequested}{' '}
                        {it.requestedUnit || it.item?.unit || 'หน่วย'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ฿{it.totalCost?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showSlip && (
        <RequisitionSlipModal requisition={requisition} onClose={() => setShowSlip(false)} />
      )}
    </div>
  );
}
