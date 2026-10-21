'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  PackageCheck,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  GraduationCap,
  BookOpen,
  MapPin,
  Boxes,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Sparkles,
  Phone,
  Eye,
  Check,
  Filter,
} from 'lucide-react';
import { formatUserName } from '@/lib/user-utils';

interface QueueItem {
  id: string;
  type: 'REQUISITION' | 'BORROW';
  typeLabel: string;
  requestNumber: string;
  scheduledDate: string;
  expectedReturnDate?: string;
  isToday: boolean;
  isOverdue: boolean;
  user?: {
    id: string;
    name: string;
    prefix?: string;
    studentId?: string;
    department?: string;
    phone?: string;
    email?: string;
  };
  course?: {
    id: string;
    code: string;
    name: string;
    instructorName?: string;
  };
  purpose?: string;
  approver?: {
    id: string;
    name: string;
    prefix?: string;
  };
  approvedAt?: string;
  createdAt: string;
  totalItemsCount: number;
  items: any[];
}

export default function DispenseCenterPage() {
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [summary, setSummary] = useState({
    totalPending: 0,
    todayCount: 0,
    overdueCount: 0,
    upcomingCount: 0,
    requisitionsCount: 0,
    borrowsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'REQUISITION' | 'BORROW'>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'OVERDUE'>('ALL');

  // Modal State
  const [activeItem, setActiveItem] = useState<QueueItem | null>(null);
  const [dispenseNote, setDispenseNote] = useState('');
  const [itemAdjustments, setItemAdjustments] = useState<any[]>([]);
  const [assignedAssets, setAssignedAssets] = useState<{ borrowItemId: string; assetId: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/dispense/queue', {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch dispense queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id && (isOfficer || isAdmin)) {
      fetchQueue();
    }
  }, [currentUser?.id, isOfficer, isAdmin]);

  // กรองรายการตามคำค้นหาและประเภท
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      // ประเภท
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;

      // ตัวกรองเวลา
      if (timeFilter === 'TODAY' && !item.isToday) return false;
      if (timeFilter === 'OVERDUE' && !item.isOverdue) return false;

      // ค้นหาข้อความ
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const reqNum = (item.requestNumber || '').toLowerCase();
        const userName = (item.user?.name || '').toLowerCase();
        const stdId = (item.user?.studentId || '').toLowerCase();
        const cCode = (item.course?.code || '').toLowerCase();
        const cName = (item.course?.name || '').toLowerCase();
        const itemsList = item.items.map((i) => (i.name || '').toLowerCase()).join(' ');

        if (
          !reqNum.includes(q) &&
          !userName.includes(q) &&
          !stdId.includes(q) &&
          !cCode.includes(q) &&
          !cName.includes(q) &&
          !itemsList.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [queue, typeFilter, timeFilter, searchQuery]);

  // เปิด Modal เพื่อจ่ายของ
  const handleOpenDispenseModal = (item: QueueItem) => {
    setActiveItem(item);
    setDispenseNote('');

    if (item.type === 'REQUISITION') {
      setItemAdjustments(
        item.items.map((it) => ({
          id: it.id,
          allowed: true,
          quantity: it.quantityRequested,
          unit: it.unit,
        }))
      );
    } else {
      setItemAdjustments(
        item.items.map((it) => ({
          id: it.id,
          allowed: true,
          quantity: it.quantityRequested,
        }))
      );
      // เตรียม Asset เริ่มต้น
      const initialAssets: { borrowItemId: string; assetId: string }[] = [];
      item.items.forEach((it) => {
        if (it.availableAssets && it.availableAssets.length > 0) {
          initialAssets.push({
            borrowItemId: it.id,
            assetId: it.availableAssets[0].id,
          });
        }
      });
      setAssignedAssets(initialAssets);
    }
  };

  // ยืนยันการจ่ายของ
  const handleConfirmDispense = async () => {
    if (!activeItem || !currentUser?.id) return;
    setSubmitting(true);

    try {
      if (activeItem.type === 'REQUISITION') {
        const res = await fetch(`/api/requisitions/${activeItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'DISPENSE',
            userId: currentUser.id,
            itemAdjustments,
            dispenseNote,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setActionSuccessMessage(`บันทึกจ่ายวัสดุสิ้นเปลืองเลขที่ ${activeItem.requestNumber} สำเร็จ`);
          setActiveItem(null);
          fetchQueue();
        } else {
          alert(data.error || data.message || 'เกิดข้อผิดพลาดในการตัดสต็อกจ่ายของ');
        }
      } else {
        const res = await fetch(`/api/borrow/${activeItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CHECKOUT',
            userId: currentUser.id,
            borrowItemAdjustments: itemAdjustments,
            assignedAssets,
            dispenseNote,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setActionSuccessMessage(`บันทึกส่งมอบครุภัณฑ์เลขที่ ${activeItem.requestNumber} สำเร็จ`);
          setActiveItem(null);
          fetchQueue();
        } else {
          alert(data.error || data.message || 'เกิดข้อผิดพลาดในการส่งมอบครุภัณฑ์');
        }
      }
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  if (!isOfficer && !isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500">
        <PackageCheck className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">สงวนสิทธิ์เฉพาะเจ้าหน้าที่ห้องแล็บและผู้ดูแลระบบ</h2>
        <p className="text-xs text-slate-400 mt-1">กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าหน้าที่เพื่อดำเนินการจ่ายพัสดุ</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Success Alert */}
      {actionSuccessMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/30">
              <PackageCheck className="w-6 h-6" />
            </div>
            <span>ศูนย์จ่ายพัสดุ (Dispense Center)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            คิวรวมการจ่ายวัสดุสิ้นเปลืองและส่งมอบครุภัณฑ์ที่ได้รับการอนุมัติแล้วในหน้าเดียวแบบกระชับ
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          <span>รีเฟรชคิวจ่ายของ</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => {
            setTypeFilter('ALL');
            setTimeFilter('ALL');
          }}
          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-teal-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">คิวรอจ่ายทั้งหมด</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{summary.totalPending}</div>
          <p className="text-[11px] text-slate-400 mt-1">รายการที่ได้รับอนุมัติแล้ว</p>
        </div>

        <div
          onClick={() => setTimeFilter(timeFilter === 'TODAY' ? 'ALL' : 'TODAY')}
          className={`p-4 rounded-3xl border shadow-sm transition cursor-pointer ${
            timeFilter === 'TODAY'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">กำหนดจ่ายวันนี้</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{summary.todayCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">นัดรับในวันนี้ (คลิกเพื่อกรอง)</p>
        </div>

        <div
          onClick={() => setTimeFilter(timeFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`p-4 rounded-3xl border shadow-sm transition cursor-pointer ${
            timeFilter === 'OVERDUE'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-rose-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">เลยวันนัด (ค้างจ่าย)</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">{summary.overdueCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">ยังไม่มารับตามกำหนด</p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">จำแนกตามประเภท</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>วัสดุ: <strong>{summary.requisitionsCount}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span>ครุภัณฑ์: <strong>{summary.borrowsCount}</strong></span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">รอจ่ายออกทั้งหมด</p>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              typeFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            ทั้งหมด ({queue.length})
          </button>
          <button
            onClick={() => setTypeFilter('REQUISITION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              typeFilter === 'REQUISITION'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            🧪 เฉพาะวัสดุสิ้นเปลือง ({summary.requisitionsCount})
          </button>
          <button
            onClick={() => setTypeFilter('BORROW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              typeFilter === 'BORROW'
                ? 'bg-sky-600 text-white'
                : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
            }`}
          >
            🩺 เฉพาะครุภัณฑ์ ({summary.borrowsCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาเลขคำขอ, ชื่อนิมิต, รหัสนิสิต..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Compact Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold">
                <th className="py-3 px-4 w-28">ประเภท</th>
                <th className="py-3 px-4 w-44">เลขที่คำขอ & วันที่นัด</th>
                <th className="py-3 px-4">ผู้ขอ (นิสิต/ผู้ใช้)</th>
                <th className="py-3 px-4">รายวิชา / วัตถุประสงค์</th>
                <th className="py-3 px-4">รายการพัสดุที่รอส่งมอบ</th>
                <th className="py-3 px-4 text-center w-32">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin text-teal-600 mb-2" />
                    <span>กำลังโหลดคิวจ่ายพัสดุ...</span>
                  </td>
                </tr>
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <PackageCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">ไม่มีคิวพัสดุที่รอจ่ายในขณะนี้</p>
                    <p className="text-[11px] text-slate-400 mt-1">เมื่อมีคำขอเบิกหรือยืมที่ได้รับการอนุมัติ รายการจะปรากฏที่นี่โดยอัตโนมัติ</p>
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => {
                  const dateObj = new Date(item.scheduledDate);
                  const formattedDate = dateObj.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: '2-digit',
                  });

                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        item.isOverdue ? 'bg-rose-50/30 dark:bg-rose-950/10' : item.isToday ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Column 1: ประเภท */}
                      <td className="py-3.5 px-4 align-top">
                        {item.type === 'REQUISITION' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-200 dark:border-emerald-800">
                            🧪 วัสดุสิ้นเปลือง
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-extrabold text-[11px] border border-sky-200 dark:border-sky-800">
                            🩺 ยืมครุภัณฑ์
                          </span>
                        )}
                      </td>

                      {/* Column 2: เลขที่คำขอ & วันที่นัด */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <span>{item.requestNumber}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-400">นัด: {formattedDate}</span>
                          {item.isToday && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white font-black text-[10px] animate-pulse">
                              วันนี้
                            </span>
                          )}
                          {item.isOverdue && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-black text-[10px]">
                              เลยนัด
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 3: ผู้ขอ (นิสิต/ผู้ใช้) */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{formatUserName(item.user)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 space-x-2">
                          {item.user?.studentId && <span>รหัสนิสิต: <strong>{item.user.studentId}</strong></span>}
                          {item.user?.phone && (
                            <span className="inline-flex items-center gap-0.5 text-slate-400">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{item.user.phone}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: รายวิชา / วัตถุประสงค์ */}
                      <td className="py-3.5 px-4 align-top">
                        {item.course ? (
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.course.code}
                            </span>{' '}
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                              ({item.course.name})
                            </span>
                            {item.course.instructorName && (
                              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                                อ.ผู้สอน: {item.course.instructorName}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {item.purpose || '-'}
                          </div>
                        )}
                      </td>

                      {/* Column 5: รายการพัสดุที่รอส่งมอบ */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="text-slate-800 dark:text-slate-200 text-xs">
                            {item.items.slice(0, 2).map((it, idx) => (
                              <span key={it.id || idx} className="inline-block mr-2">
                                • {it.name}{' '}
                                <strong className="text-teal-700 dark:text-teal-300">
                                  {it.quantityRequested} {it.requestedUnit || it.unit}
                                </strong>
                              </span>
                            ))}
                            {item.items.length > 2 && (
                              <span className="text-[11px] text-slate-400 font-semibold">
                                (+ อีก {item.items.length - 2} รายการ)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            รวมทั้งหมด <strong>{item.totalItemsCount}</strong> รายการ
                          </div>
                        </div>
                      </td>

                      {/* Column 6: การดำเนินการ */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleOpenDispenseModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm shadow-teal-600/30 transition cursor-pointer"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>จ่ายของ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: ตรวจสอบและยืนยันการจ่ายพัสดุ */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${
                      activeItem.type === 'REQUISITION'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                    }`}
                  >
                    {activeItem.typeLabel}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    จ่ายพัสดุคำขอ: {activeItem.requestNumber}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ผู้ขอ: <strong>{formatUserName(activeItem.user)}</strong> {activeItem.user?.studentId && `(รหัสนิสิต: ${activeItem.user.studentId})`}
                </p>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs">
              <div>
                <span className="text-slate-400">วันที่นัดรับ:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {new Date(activeItem.scheduledDate).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                </p>
              </div>
              <div>
                <span className="text-slate-400">รายวิชา:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {activeItem.course?.code || '-'} {activeItem.course?.instructorName && `(${activeItem.course.instructorName})`}
                </p>
              </div>
              <div>
                <span className="text-slate-400">ผู้อนุมัติ:</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ✓ {formatUserName(activeItem.approver) || 'อนุมัติแล้ว'}
                </p>
              </div>
            </div>

            {/* Items List Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                <span>รายการพัสดุที่จ่าย (สามารถปรับจำนวนหรือตรวจสอบตำแหน่งตู้จัดเก็บ):</span>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-normal">
                  ระบบตัดสต็อกแบบ FIFO อัตโนมัติ
                </span>
              </h4>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">รายการพัสดุ</th>
                      <th className="py-2.5 px-3">ตำแหน่งจัดเก็บ</th>
                      <th className="py-2.5 px-3 text-center">ขอเบิก</th>
                      <th className="py-2.5 px-3 text-center w-28">จ่ายจริง</th>
                      <th className="py-2.5 px-3 text-center w-20">อนุญาต</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeItem.items.map((it, idx) => {
                      const adj = itemAdjustments.find((a) => a.id === it.id) || { allowed: true, quantity: it.quantityRequested };
                      const locName = it.storageLocation?.name || it.location || 'คลังกลาง';

                      return (
                        <tr key={it.id || idx} className={!adj.allowed ? 'opacity-40 bg-slate-50 dark:bg-slate-800/30' : ''}>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-white">{it.name}</span>
                            <div className="text-[10px] text-slate-400">
                              คงเหลือในคลัง: {it.currentStock} {it.unit}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 text-[11px]">
                              <MapPin className="w-3 h-3 text-teal-600" />
                              <span>{locName}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            {it.quantityRequested} {it.requestedUnit || it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              disabled={!adj.allowed}
                              value={adj.quantity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setItemAdjustments((prev) =>
                                  prev.map((a) => (a.id === it.id ? { ...a, quantity: val } : a))
                                );
                              }}
                              className="w-20 px-2 py-1 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold text-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={adj.allowed}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setItemAdjustments((prev) =>
                                  prev.map((a) => (a.id === it.id ? { ...a, allowed: checked } : a))
                                );
                              }}
                              className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dispense Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                หมายเหตุตอนส่งมอบ/จ่ายของ (ถ้ามี):
              </label>
              <input
                type="text"
                placeholder="เช่น จ่ายตามขนาดทดแทนที่แจ้งไว้, นิสิตตัวแทนกลุ่มมารับของแทน..."
                value={dispenseNote}
                onChange={(e) => setDispenseNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDispense}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึกจ่ายของ...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>ยืนยันจ่ายของและตัดสต็อก</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
