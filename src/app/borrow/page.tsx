'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  RefreshCw,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  BookOpen,
  ArrowRight,
  ClipboardCheck,
  RotateCcw,
  Check,
  ShieldCheck,
  Search,
  GraduationCap,
  Sparkles,
  Boxes,
  Package,
  X,
  QrCode,
  Tag,
  Edit3,
  Building2,
  MapPin,
  Info,
  FileText,
  Bell,
  Printer,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import BorrowSlipModal from '@/components/slips/BorrowSlipModal';
import EditRequestModal from '@/components/requests/EditRequestModal';
import NewAllocationModal from '@/components/borrow/NewAllocationModal';
import BulkAllocationReturnModal from '@/components/borrow/BulkAllocationReturnModal';
import { formatUserName, formatTeacherName, formatApproverDisplay, formatAcknowledgeDisplay } from '@/lib/user-utils';
import { formatLocationDisplay } from '@/lib/location-utils';

export default function BorrowPage() {
  const { currentUser, isOfficer, isApprover, isAdmin, isTeacher } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewScope, setViewScope] = useState<'ALL' | 'MY'>('ALL');
  const [activeSlipBorrow, setActiveSlipBorrow] = useState<any | null>(null);
  const [reqSurplusReturns, setReqSurplusReturns] = useState<{ id: string; quantity: number | ''; condition: string }[]>([]);

  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Action Modals (Checkout & Return)
  const [activeBorrowForAction, setActiveBorrowForAction] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'CHECKOUT' | 'RETURN' | null>(null);
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'DAMAGED'>('GOOD');
  const [returnNote, setReturnNote] = useState('');
  const [checkoutNote, setCheckoutNote] = useState('');
  const [itemReturns, setItemReturns] = useState<{ id: string; condition: 'GOOD' | 'DAMAGED'; note: string }[]>([]);
  const [consumablesList, setConsumablesList] = useState<any[]>([]);
  const [checkoutBorrowItems, setCheckoutBorrowItems] = useState<{
    id: string;
    itemId?: string;
    name: string;
    unit: string;
    requestedQty: number;
    quantity: number | string;
    allowed: boolean;
    assetId?: string | null;
    assetCode: string | null;
    selectedAssetIds: string[];
  }[]>([]);
  const [checkoutReqItems, setCheckoutReqItems] = useState<{
    id: string;
    itemId?: string;
    name: string;
    unit: string;
    requestedQty: number;
    quantity: number | string;
    allowed: boolean;
    isSubUnit?: boolean;
    requestedUnit?: string;
    conversionRatio?: number;
    usageUnit?: string | null;
    currentStock: number;
    lotId?: string;
    stockLots?: any[];
  }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const handleRemindStudent = async (borrowId: string) => {
    if (!confirm('ยืนยันส่งการแจ้งเตือนเตือนคืนอุปกรณ์ไปยังนิสิตผู้ยืม?')) return;
    setRemindingId(borrowId);
    try {
      const res = await fetch(`/api/borrow/${borrowId}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUser?.id }),
      });
      if (res.ok) {
        alert('ส่งการแจ้งเตือนกำหนดคืนให้นิสิตเรียบร้อยแล้ว');
        fetchBorrowData();
      } else {
        const data = await res.json();
        alert(data.error || 'ไม่สามารถส่งการแจ้งเตือนได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setRemindingId(null);
    }
  };

  const [isRunningDailyReminder, setIsRunningDailyReminder] = useState(false);

  const handleRunDailyReminders = async () => {
    if (!currentUser?.id) return;
    if (!confirm('ยืนยันให้ระบบตรวจสอบและส่งการแจ้งเตือนเตือนคืนครุภัณฑ์ประจำวันตามรอบอัตโนมัติ?')) return;
    setIsRunningDailyReminder(true);
    try {
      const res = await fetch('/api/cron/reminders?type=morning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        let msg = `ตรวจรอบวันสำเร็จ: ส่งเตือนนิสิต ${data.overdueAlertsSent + data.dDayAlertsSent} รายการ (พบรายการค้างส่ง ${data.overdueCount} รายการ)`;
        if (data.todayDispenseCount !== undefined) {
          msg += `\n📦 รายการรอจ่ายของวันนี้: ${data.todayDispenseCount} รายการ ${data.dispenseDigestSent ? '(ส่งแจ้งเตือนแล้ว)' : ''}`;
        }
        if (data.todayRoomCount !== undefined) {
          msg += `\n🏫 ตารางใช้ห้องวันนี้: ${data.todayRoomCount} รายการ ${data.roomDigestSent ? '(ส่งแจ้งเตือนแล้ว)' : ''}`;
        }
        alert(msg);
        fetchBorrowData(true);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการตรวจสอบและส่งแจ้งเตือน');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsRunningDailyReminder(false);
    }
  };

  // Course Allocation State
  const [primaryTab, setPrimaryTab] = useState<'REQUESTS' | 'ALLOCATION'>('REQUESTS');
  const [allocations, setAllocations] = useState<any[]>([]);
  const [showNewAllocationModal, setShowNewAllocationModal] = useState(false);
  const [activeAllocationForReturn, setActiveAllocationForReturn] = useState<any | null>(null);
  const [loadingAllocations, setLoadingAllocations] = useState(false);

  const fetchAllocations = async () => {
    setLoadingAllocations(true);
    try {
      const res = await fetch('/api/borrow/allocation');
      if (res.ok) {
        const data = await res.json();
        setAllocations(data);
      }
    } catch (err) {
      console.error('Failed to fetch allocations', err);
    } finally {
      setLoadingAllocations(false);
    }
  };

  const fetchBorrowData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    fetchAllocations();
    try {
      const [borrowRes, itemsRes, consumablesRes, coursesRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/items?type=EQUIPMENT&compact=true'),
        fetch('/api/items?type=CONSUMABLE&compact=true'),
        fetch('/api/courses?compact=true'),
      ]);

      if (borrowRes.ok) {
        const data = await borrowRes.json();
        if (Array.isArray(data)) {
          setRequests(data);
          try { sessionStorage.setItem('cached_borrow_requests', JSON.stringify(data)); } catch {}
        }
      }
      if (itemsRes.ok) {
        const items = await itemsRes.json();
        if (Array.isArray(items)) {
          const filtered = items.filter((i: any) => i.isBorrowable !== false);
          setEquipmentList(filtered);
          try { sessionStorage.setItem('cached_borrow_equipment', JSON.stringify(filtered)); } catch {}
        }
      }
      if (consumablesRes.ok) {
        const cItems = await consumablesRes.json();
        if (Array.isArray(cItems)) {
          setConsumablesList(cItems);
          try { sessionStorage.setItem('cached_borrow_consumables', JSON.stringify(cItems)); } catch {}
        }
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        if (Array.isArray(cData)) {
          setCourses(cData);
          try { sessionStorage.setItem('cached_borrow_courses', JSON.stringify(cData)); } catch {}
        }
      }
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    try {
      const cReqs = sessionStorage.getItem('cached_borrow_requests');
      const cEq = sessionStorage.getItem('cached_borrow_equipment');
      const cCon = sessionStorage.getItem('cached_borrow_consumables');
      const cCourses = sessionStorage.getItem('cached_borrow_courses');

      if (cReqs) {
        try {
          const parsed = JSON.parse(cReqs);
          if (Array.isArray(parsed)) {
            setRequests(parsed);
            setLoading(false);
          }
        } catch {}
      }
      if (cEq) {
        try {
          const parsed = JSON.parse(cEq);
          if (Array.isArray(parsed)) setEquipmentList(parsed);
        } catch {}
      }
      if (cCon) {
        try {
          const parsed = JSON.parse(cCon);
          if (Array.isArray(parsed)) setConsumablesList(parsed);
        } catch {}
      }
      if (cCourses) {
        try {
          const parsed = JSON.parse(cCourses);
          if (Array.isArray(parsed)) setCourses(parsed);
        } catch {}
      }
    } catch {}

    fetchBorrowData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('status') || params.get('tab');
      if (s) setFilterStatus(s);
    }
  }, []);

  const handleActionSubmit = async () => {
    if (!activeBorrowForAction || !actionType) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/borrow/${activeBorrowForAction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          userId: currentUser?.id,
          returnCondition: actionType === 'RETURN' ? returnCondition : undefined,
          returnNote: actionType === 'RETURN' ? returnNote : undefined,
          checkoutNote: actionType === 'CHECKOUT' ? checkoutNote : undefined,
          itemReturns: actionType === 'RETURN' ? itemReturns : undefined,
          borrowItemAdjustments:
            actionType === 'CHECKOUT'
              ? checkoutBorrowItems.map((i) => ({
                  ...i,
                  quantity:
                    typeof i.quantity === 'number' && i.quantity >= 1
                      ? i.quantity
                      : parseInt(String(i.quantity), 10) || 1,
                }))
              : undefined,
          assignedAssets:
            actionType === 'CHECKOUT'
              ? checkoutBorrowItems
                  .filter((i) => i.allowed && (i.selectedAssetIds?.length > 0 || i.assetId))
                  .map((i) => ({
                    borrowItemId: i.id,
                    assetId: i.selectedAssetIds?.[0] || i.assetId,
                    assetIds:
                      i.selectedAssetIds && i.selectedAssetIds.length > 0
                        ? i.selectedAssetIds
                        : i.assetId
                        ? [i.assetId]
                        : [],
                  }))
              : undefined,
          requisitionItemAdjustments:
            actionType === 'CHECKOUT'
              ? checkoutReqItems.map((i) => ({
                  ...i,
                  quantity:
                    typeof i.quantity === 'number' && i.quantity >= 1
                      ? i.quantity
                      : parseInt(String(i.quantity), 10) || 1,
                }))
              : undefined,
          requisitionReturns:
            actionType === 'RETURN'
              ? reqSurplusReturns
                  .filter((r) => typeof r.quantity === 'number' && r.quantity > 0)
                  .map((r) => ({ requisitionItemId: r.id, quantity: r.quantity, condition: r.condition }))
              : undefined,
        }),
      });

      if (res.ok) {
        setActiveBorrowForAction(null);
        setActionType(null);
        setReturnNote('');
        setCheckoutNote('');
        setItemReturns([]);
        setCheckoutBorrowItems([]);
        setCheckoutReqItems([]);
        setReqSurplusReturns([]);
        const checkedOutReq = activeBorrowForAction;
        const wasCheckout = actionType === 'CHECKOUT';
        fetchBorrowData();
        if (wasCheckout && checkedOutReq) {
          setActiveSlipBorrow(checkedOutReq);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Action failed');
      }
    } catch (err) {
      alert('Error updating borrow request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (borrowId: string) => {
    setAcknowledgingId(borrowId);
    try {
      const res = await fetch(`/api/borrow/${borrowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACKNOWLEDGE',
          userId: currentUser?.id,
          advisorName: (isAdmin || isOfficer || currentUser?.role === 'ADMIN' || currentUser?.role === 'OFFICER')
            ? `${formatUserName(currentUser)} (แอดมิน)`
            : formatTeacherName(currentUser),
        }),
      });

      if (res.ok) {
        await fetchBorrowData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to acknowledge');
      }
    } catch (err) {
      alert('Error updating borrow request');
    } finally {
      setAcknowledgingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> รออนุมัติ
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Check className="w-3 h-3 text-blue-600" /> อนุมัติแล้ว (รอจ่ายของ)
          </span>
        );
      case 'BORROWED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <RefreshCw className="w-3 h-3 text-purple-600" /> กำลังยืมอยู่
          </span>
        );
      case 'RETURNED_COMPLETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ส่งคืนเรียบร้อย
          </span>
        );
      case 'RETURNED_WITH_ISSUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> คืนแล้ว (ชำรุด/มีปัญหา)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-3 h-3 text-slate-500" /> ไม่อนุมัติ
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  const isStaff = isOfficer || isApprover || currentUser?.role === 'ADMIN';

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // If not staff (e.g. student/general user) or if viewScope is 'MY', only show own requests
      if (!isStaff || viewScope === 'MY') {
        if (r.userId !== currentUser?.id) return false;
      }
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'OVERDUE') {
        return r.status === 'BORROWED' && new Date(r.expectedReturnDate).getTime() < Date.now();
      }
      return r.status === filterStatus;
    });
  }, [requests, isStaff, viewScope, currentUser?.id, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-teal-600" />
            ระบบเบิก-ยืมพัสดุและครุภัณฑ์ (One-Stop Hub)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ศูนย์รวมยื่นคำขอเบิกวัสดุสิ้นเปลืองและยืมครุภัณฑ์ในใบเดียว อนุมัติและบันทึกจ่ายของสะดวกพร้อมกัน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {lastUpdated && (
            <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              อัปเดตล่าสุด: {lastUpdated}
            </span>
          )}
          <button
            onClick={() => {
              fetchBorrowData(true);
              fetchAllocations();
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-60"
            title="รีเฟรชข้อมูลรายการคำขอทันที"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
          </button>
          {(isOfficer || isAdmin) && (
            <button
              onClick={handleRunDailyReminders}
              disabled={isRunningDailyReminder}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-60"
              title="ตรวจสอบรายการค้างส่งคืนและส่งแจ้งเตือนอัตโนมัติประจำวัน (จันทร์-ศุกร์)"
            >
              <Bell className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isRunningDailyReminder ? 'animate-bounce' : ''}`} />
              <span>{isRunningDailyReminder ? 'กำลังประมวลผล...' : 'ตรวจเตือนรอบวัน (09:00)'}</span>
            </button>
          )}
          {primaryTab === 'ALLOCATION' ? (
            <button
              onClick={() => setShowNewAllocationModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black shadow-lg shadow-indigo-600/25 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>+ จัดสรรอุปกรณ์ประจำวิชาตลอดเทอม</span>
            </button>
          ) : (
            <>
              <Link
                href="/borrow/request"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-teal-600/25 transition cursor-pointer ring-2 ring-teal-400/30"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>+ ยื่นคำขอเบิก-ยืมพัสดุ</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Primary Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setPrimaryTab('REQUESTS')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            primaryTab === 'REQUESTS'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          <span>📋 รายการยืม-เบิกทั่วไป ({requests.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPrimaryTab('ALLOCATION');
            fetchAllocations();
          }}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            primaryTab === 'ALLOCATION'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>🏫 จัดสรรประจำรายวิชาตลอดภาคการศึกษา ({allocations.length})</span>
        </button>
      </div>

      {primaryTab === 'REQUESTS' ? (
        <>
          {/* Filter Tabs & Scope */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap">
          {[
            { key: 'ALL', label: 'ทั้งหมด' },
            { key: 'PENDING', label: 'รออนุมัติ' },
            { key: 'APPROVED', label: 'รอจ่ายของ' },
            { key: 'BORROWED', label: '🔄 กำลังยืมอยู่' },
            { key: 'OVERDUE', label: '🔴 เกินกำหนดคืน' },
            { key: 'RETURNED_COMPLETE', label: 'คืนแล้ว (สมบูรณ์)' },
            { key: 'RETURNED_WITH_ISSUE', label: 'คืนแล้ว (พบชำรุด)' },
          ].map((tab) => {
            const count = tab.key === 'ALL'
              ? requests.length
              : tab.key === 'OVERDUE'
              ? requests.filter((b: any) => b.status === 'BORROWED' && new Date(b.expectedReturnDate).getTime() < Date.now()).length
              : requests.filter((b: any) => b.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === tab.key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterStatus === tab.key ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View Scope (Toggle for Staff / Info pill for Student) */}
        {isStaff ? (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold self-start md:self-auto">
            <button
              onClick={() => setViewScope('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewScope === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              รายการทั้งหมดในระบบ
            </button>
            <button
              onClick={() => setViewScope('MY')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewScope === 'MY'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              เฉพาะของฉัน
            </button>
          </div>
        ) : (
          <div className="text-xs font-medium text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-200/70 dark:border-teal-800 flex items-center gap-1.5 self-start md:self-auto">
            <span>📌</span>
            <span>แสดงเฉพาะรายการยืมของท่าน ({formatUserName(currentUser) || 'นิสิต'})</span>
          </div>
        )}
      </div>

      {/* Return Helper Info Banner */}
      {(filterStatus === 'BORROWED' || filterStatus === 'OVERDUE') && (
        <div className="bg-purple-50/90 border border-purple-200 text-purple-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-600/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-purple-900 text-sm font-bold block">ศูนย์ตรวจรับคืนอุปกรณ์ (Equipment Return & Check-in)</strong>
              <p className="text-purple-700 text-xs font-medium mt-0.5">
                {isOfficer
                  ? 'เมื่อผู้ยืมนำอุปกรณ์มาส่งคืน ให้เจ้าหน้าที่กดปุ่มสีม่วง "ตรวจรับคืนอุปกรณ์ (Check-in & Inspect)" ในรายการด้านล่าง เพื่อตรวจสภาพรายชิ้นและนำกลับเข้าคลังพร้อมใช้'
                  : 'รายการที่ท่านกำลังยืมอยู่ เมื่อใช้งานเสร็จเรียบร้อย กรุณานำอุปกรณ์มาส่งคืนและตรวจเช็คสภาพกับเจ้าหน้าที่ที่ห้องปฏิบัติการ'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <LoadingSpinner
              message="กำลังโหลดรายการคำขอยืม-คืน..."
              submessage="กำลังดึงข้อมูลสถานะการอนุมัติและประวัติการส่งคืนจาก Supabase"
            />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs">
            ไม่พบคำขอยืมครุภัณฑ์ในหมวดหมู่นี้
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-black text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2.5 py-1 rounded-lg border border-teal-100 dark:border-teal-800/60">
                    {req.requestNumber}
                  </span>
                  <div>{getStatusBadge(req.status)}</div>
                  {req.status === 'APPROVED' && req.approver && (
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      ผู้อนุมัติ: <strong className="text-teal-700 dark:text-teal-300">{formatApproverDisplay(req.approver)}</strong>
                    </span>
                  )}
                  {req.requisitionRequest && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-950/60 dark:to-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> คำขอรวม One-Stop
                    </span>
                  )}
                  {(req.status === 'APPROVED' || req.status === 'BORROWED' || req.status === 'RETURNED_COMPLETE' || req.status === 'RETURNED_WITH_ISSUE') && (
                    <button
                      type="button"
                      onClick={() => setActiveSlipBorrow(req)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-200 text-[11px] font-bold transition cursor-pointer shadow-xs"
                      title="ดูและพิมพ์ใบรายการยืม-คืน (A4/80mm) พร้อม QR Code"
                    >
                      <Printer className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      <span>ใบยืม-คืน (Slip)</span>
                    </button>
                  )}
                  {((req.status === 'PENDING' && (currentUser?.id === req.userId || isOfficer || isAdmin)) ||
                    (['APPROVED', 'BORROWED'].includes(req.status) && isAdmin)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRequest(req);
                        setShowEditModal(true);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                        req.status === 'BORROWED'
                          ? 'border-indigo-300 dark:border-indigo-700/60 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                          : req.status === 'APPROVED'
                          ? 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                          : 'border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                      }`}
                      title={req.status === 'BORROWED' ? 'แอดมินแก้ไขวันนัดคืนหรือรายการครุภัณฑ์' : 'แก้ไขรายการหรือรายละเอียดคำขอ'}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{req.status === 'BORROWED' ? 'แก้ไข/เลื่อนวันคืน' : 'แก้ไข'}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="dark:text-slate-200">ผู้ยืม: {formatUserName(req.user)}</span>
                    {req.user?.studentId && (
                      <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                        {req.user.studentId}
                      </span>
                    )}
                  </div>
                  {req.course && (
                    <div className="flex items-center gap-1.5 font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded border border-teal-100 dark:border-teal-800/60">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{req.course.code}</span>
                    </div>
                  )}
                  {req.instructorAcknowledged ? (() => {
                    const ack = formatAcknowledgeDisplay(req.advisorName || req.course?.instructorName);
                    return (
                      <div className={`flex items-center gap-1 text-[11px] font-bold ${ack.colorClass} ${ack.bgClass} border ${ack.borderClass} px-2.5 py-0.5 rounded-full`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{ack.label} ({ack.name}{req.acknowledgedAt ? ` • ${new Date(req.acknowledgedAt).toLocaleDateString('th-TH')}` : ''})</span>
                      </div>
                    );
                  })() : (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>รออาจารย์รับทราบ ({formatTeacherName(req.advisorName || req.course?.instructorName || 'อาจารย์ผู้สอน')})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Purpose & Detailed Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                <div className="md:col-span-6">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-slate-400 dark:text-slate-500 font-bold">วัตถุประสงค์การใช้งาน & สถานที่:</span>
                    {req.useTarget === 'HUMAN' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                        🚨 ใช้กับคนจริง (ห้ามของหมดอายุ)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        🧪 ฝึกกับหุ่นจำลอง
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{req.purpose}</p>
                </div>

                {/* Scheduled Times */}
                <div className="md:col-span-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/80 space-y-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block border-b border-slate-200 dark:border-slate-700 pb-1">
                    📅 นัดหมายรับ-คืนของ:
                  </span>
                  <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-800 dark:text-slate-100">เวลานัดรับ:</strong>{' '}
                        {new Date(req.borrowDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 flex-wrap">
                      <Clock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-800 dark:text-slate-100">กำหนดคืน:</strong>{' '}
                        {new Date(req.expectedReturnDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.
                      </span>
                      {req.status === 'BORROWED' && (() => {
                        const now = new Date().getTime();
                        const due = new Date(req.expectedReturnDate).getTime();
                        const diffHours = (due - now) / (1000 * 60 * 60);
                        if (diffHours < 0) {
                          const overdueDays = Math.ceil(Math.abs(diffHours) / 24);
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 animate-pulse ml-1">
                              🔴 เกินกำหนด {overdueDays} วัน
                            </span>
                          );
                        } else if (diffHours <= 24) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 ml-1">
                              🟠 ครบกำหนดภายใน 24 ชม.
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {req.lastRemindedAt && (
                      <div className="text-[10px] text-violet-600 dark:text-violet-400 flex items-center gap-1 pt-0.5">
                        <Bell className="w-3 h-3" />
                        <span>แจ้งเตือนล่าสุด: {new Date(req.lastRemindedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actual Operation Logs (Checked out & Returned) */}
                <div className="md:col-span-3 bg-teal-50/40 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900/50 space-y-1.5">
                  <span className="text-teal-800 dark:text-teal-300 font-bold text-[11px] block border-b border-teal-200 dark:border-teal-800 pb-1">
                    ⏱️ เวลาดำเนินการจริง:
                  </span>
                  <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex items-start gap-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>เวลาจ่ายของ:</strong>{' '}
                        {req.checkedOutAt ? (
                          <span className="text-teal-800 dark:text-teal-300 font-bold">
                            {new Date(req.checkedOutAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                            {req.officer?.name && <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">จนท. ผู้จ่าย: {formatUserName(req.officer)}</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">ยังไม่จ่ายอุปกรณ์</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>เวลารับคืน:</strong>{' '}
                        {req.actualReturnDate ? (
                          <span className="text-purple-800 dark:text-purple-300 font-bold">
                            {new Date(req.actualReturnDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">ยังไม่ส่งคืน</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>รายการครุภัณฑ์ที่ยืม:</span>
                  {(req.status === 'RETURNED_COMPLETE' || req.status === 'RETURNED_WITH_ISSUE') && (
                    <span className="text-[10px] text-slate-500 font-semibold">
                      ผลการตรวจรับคืน
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {req.items?.map((it: any) => (
                    <div
                      key={it.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200 p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                        <span className="text-slate-900 dark:text-slate-100">{it.item?.name}</span>
                        {it.asset && (
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-teal-300 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-md font-semibold shadow-2xs">
                            Asset: {it.asset.assetCode} ({it.item?.unit || 'ชิ้น'}ที่ {it.asset.sequenceNumber || 1})
                          </span>
                        )}
                        <span className="text-slate-500 dark:text-slate-400 font-normal text-[11px]">
                          จำนวน {it.quantity} {it.item?.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {it.isReturned && (
                          it.returnCondition === 'DAMAGED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              ชำรุด / เสียหาย
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              คืนสมบูรณ์
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Linked Requisition Items for Unified Requests */}
                {req.requisitionRequest && (
                  <div className="mt-3 p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                      <span className="flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-teal-600" />
                        🧪 วัสดุสิ้นเปลืองที่ขอเบิกพร้อมกัน ({req.requisitionRequest.requestNumber}):
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold border border-teal-200">
                        {req.requisitionRequest.status === 'DISPENSED' ? '✓ ตัดจ่ายแล้ว (ไม่ต้องคืน)' : 'รอจ่ายพร้อมกัน'}
                      </span>
                    </div>
                    <div className="space-y-1 pl-5 text-[11px] text-teal-900 divide-y divide-teal-100/80">
                      {req.requisitionRequest.items?.map((rItem: any, rIdx: number) => (
                        <div key={rIdx} className="flex items-center justify-between pt-1">
                          <span>
                            • {rItem.item?.name}
                            {rItem.isSubUnit && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-teal-100 text-teal-800 font-bold">
                                เบิกย่อย
                              </span>
                            )}
                          </span>
                          <span className="font-bold text-teal-700">
                            จำนวน {rItem.quantityRequested} {rItem.requestedUnit || (rItem.isSubUnit ? rItem.item?.usageUnit : rItem.item?.unit) || rItem.item?.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {req.checkoutNote && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-indigo-800 dark:text-indigo-300 font-medium flex items-start gap-1.5 bg-indigo-50/60 dark:bg-indigo-950/40 p-2 rounded-lg">
                    <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span><strong>หมายเหตุตอนส่งมอบ:</strong> {req.checkoutNote}</span>
                  </div>
                )}

                {req.returnNote && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-rose-700 font-medium flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>บันทึกความเสียหาย/หมายเหตุ: {req.returnNote}</span>
                  </div>
                )}
              </div>

              {/* Instructor Acknowledgment Button (shown whenever not yet acknowledged, even if already approved) */}
              {!req.instructorAcknowledged && req.status !== 'REJECTED' && req.status !== 'CANCELLED' && req.status !== 'RETURNED_COMPLETE' && (isTeacher || isApprover || isAdmin) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 bg-indigo-50/40 -mx-5 -mb-5 p-3.5 rounded-b-2xl">
                  <span className="text-xs text-indigo-900 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    คำขอนี้ยังรอยืนยันการรับทราบจากอาจารย์ประจำวิชา ({formatTeacherName(req.course?.instructorName || req.advisorName || 'อาจารย์ประจำวิชา')})
                  </span>
                  <button
                    disabled={acknowledgingId === req.id || submitting}
                    onClick={() => handleAcknowledge(req.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    {acknowledgingId === req.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึกการรับทราบ...</span>
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-4 h-4" />
                        <span>{isAdmin || isOfficer ? 'รับทราบคำขอ (แอดมิน)' : 'อาจารย์กดรับทราบคำขอ (Acknowledge)'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}



              {/* Action Buttons for Officer & Admin */}
              {(isOfficer || isAdmin) && (
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {req.status === 'APPROVED' && (
                    <button
                      onClick={() => {
                        setActiveBorrowForAction(req);
                        setActionType('CHECKOUT');
                        setCheckoutNote('');
                        setCheckoutBorrowItems(
                          (req.items || []).map((it: any) => {
                            const matchEq = equipmentList.find((e) => e.id === it.itemId);
                            const availableAssets = matchEq?.availableAssets || [];
                            const qty = it.quantity || 1;
                            const preselected: string[] = [];
                            if (it.assetId) {
                              preselected.push(it.assetId);
                            }
                            for (const a of availableAssets) {
                              if (preselected.length >= qty) break;
                              if (!preselected.includes(a.id)) {
                                preselected.push(a.id);
                              }
                            }
                            const defaultAssetId =
                              preselected[0] || it.assetId || (availableAssets.length > 0 ? availableAssets[0].id : null);
                            const defaultAssetCode =
                              availableAssets.find((a: any) => a.id === defaultAssetId)?.assetCode ||
                              it.asset?.assetCode ||
                              null;

                            return {
                              id: it.id,
                              itemId: it.itemId,
                              name: it.item?.name || 'ครุภัณฑ์',
                              unit: it.item?.unit || 'ชิ้น',
                              requestedQty: it.quantity,
                              quantity: it.quantity,
                              allowed: true,
                              assetId: defaultAssetId,
                              assetCode: defaultAssetCode,
                              selectedAssetIds: preselected,
                            };
                          })
                        );
                        setCheckoutReqItems(
                          (req.requisitionRequest?.items || []).map((it: any) => {
                            const matchCons = consumablesList.find((c) => c.id === it.itemId);
                            const lots = it.item?.stockLots ?? matchCons?.stockLots ?? [];
                            return {
                              id: it.id,
                              itemId: it.itemId,
                              lotId: lots.length > 0 ? lots[0].id : undefined,
                              name: it.item?.name || matchCons?.name || 'วัสดุสิ้นเปลือง',
                              unit: it.item?.unit || matchCons?.unit || 'หน่วย',
                              requestedQty: it.quantityRequested,
                              quantity: it.quantityRequested,
                              allowed: true,
                              isSubUnit: it.isSubUnit,
                              requestedUnit: it.requestedUnit || (it.isSubUnit ? (it.item?.usageUnit || matchCons?.usageUnit) : (it.item?.unit || matchCons?.unit)) || it.item?.unit || matchCons?.unit || 'หน่วย',
                              conversionRatio: it.item?.conversionRatio || matchCons?.conversionRatio || 1,
                              usageUnit: it.item?.usageUnit || matchCons?.usageUnit,
                              currentStock: it.item?.currentStock ?? matchCons?.currentStock ?? 0,
                              stockLots: lots,
                            };
                          })
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>{req.requisitionRequest ? 'ส่งมอบครุภัณฑ์ & จ่ายวัสดุ (Check-out)' : 'ส่งมอบอุปกรณ์ (Check-out)'}</span>
                    </button>
                  )}

                  {req.status === 'BORROWED' && (
                    <>
                      <button
                        onClick={() => handleRemindStudent(req.id)}
                        disabled={remindingId === req.id}
                        title="ส่งแจ้งเตือนกำหนดคืนทาง In-app และ Web Push ให้นิสิตทันที"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Bell className={`w-3.5 h-3.5 ${remindingId === req.id ? 'animate-bounce' : ''}`} />
                        <span>{remindingId === req.id ? 'กำลังส่งเตือน...' : 'ส่งเตือนนิสิต'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveBorrowForAction(req);
                          setActionType('RETURN');
                          setReturnCondition('GOOD');
                          setReturnNote('');
                          setItemReturns(
                            (req.items || []).map((it: any) => ({
                              id: it.id,
                              condition: 'GOOD',
                              note: '',
                            }))
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>ตรวจรับคืนอุปกรณ์ (Check-in & Inspect)</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      </>
    ) : (
      <div className="space-y-4">
        {/* Course Allocation Section Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/40 p-5 sm:p-6 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-lg shadow-indigo-900/5 dark:shadow-black/20">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-400/15 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100/80 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/80 mb-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>Semester-Long Course Allocation</span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">การจัดสรรครุภัณฑ์ประจำห้องปฏิบัติการสำหรับรายวิชา</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                จัดสรรหุ่นฝึกทักษะและครุภัณฑ์ประจำห้องแล็ปตลอดภาคการศึกษา ระบบจะเปลี่ยนสถานที่ตั้งและสถานะของครุภัณฑ์เป็น "ประจำวิชา" เมื่อสิ้นภาคการศึกษาสามารถกด <strong>"ตรวจรับคืนทั้งหมดเข้าคลัง (Bulk Return)"</strong> เพื่อย้ายกลับเข้าชั้นวางเดิมอัตโนมัติ
              </p>
            </div>
            <button
              onClick={() => setShowNewAllocationModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition cursor-pointer self-start md:self-auto flex-shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>+ จัดสรรอุปกรณ์ประจำวิชาใหม่</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs relative z-10">
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">การจัดสรรทั้งหมด</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{allocations.length} รายการ</div>
            </div>
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">กำลังประจำห้องแล็ป</div>
              <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
                {allocations.filter((a) => a.status === 'BORROWED').length} วิชา
              </div>
            </div>
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">คืนเข้าคลังเรียบร้อย</div>
              <div className="text-xl font-black mt-0.5 text-purple-600 dark:text-purple-300">
                {allocations.filter((a) => a.status === 'RETURNED_COMPLETE' || a.status === 'RETURNED_WITH_ISSUE').length} วิชา
              </div>
            </div>
            <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">จำนวนหุ่น/เครื่องมือที่จัดสรร</div>
              <div className="text-xl font-black mt-0.5 text-amber-600 dark:text-amber-400">
                {allocations.reduce((acc, a) => acc + (a.items?.length || 0), 0)} ชิ้น
              </div>
            </div>
          </div>
        </div>

        {/* Allocation List */}
        {loadingAllocations ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <LoadingSpinner />
            <p className="text-xs text-slate-500 mt-2 font-medium">กำลังโหลดข้อมูลการจัดสรรประจำรายวิชา...</p>
          </div>
        ) : allocations.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Building2 className="w-12 h-12 text-indigo-400 mx-auto opacity-50" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
              ยังไม่มีข้อมูลการจัดสรรครุภัณฑ์ประจำรายวิชา
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ท่านสามารถจัดสรรหุ่นฝึกทักษะและครุภัณฑ์ไปยังห้องปฏิบัติการสำหรับใช้ตลอดเทอมได้โดยกดปุ่มด้านล่าง
            </p>
            <button
              onClick={() => setShowNewAllocationModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>สร้างการจัดสรรประจำวิชาชิ้นแรก</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {allocations.map((alloc) => {
              const isOngoing = alloc.status === 'BORROWED';

              return (
                <div
                  key={alloc.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-all hover:border-indigo-300 dark:hover:border-indigo-800"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/60">
                          {alloc.requestNumber}
                        </span>
                        {isOngoing ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            🟢 กำลังใช้งานประจำห้องแล็ป
                          </span>
                        ) : alloc.status === 'RETURNED_COMPLETE' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> ตรวจรับคืนเข้าคลังครบถ้วน
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> คืนแล้ว (พบชำรุดบางรายการ)
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          🏫 จัดสรรตลอดภาคการศึกษา
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                        {alloc.course && (
                          <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>[{alloc.course.code}] {alloc.course.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>ห้องที่ติดตั้ง: <strong>{alloc.targetLocation || 'ห้องปฏิบัติการ'}</strong></span>
                        </div>
                        {alloc.advisorName && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>อาจารย์ผู้รับผิดชอบ: <strong>{formatTeacherName(alloc.advisorName)}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bulk Return Button for Staff */}
                    {isOngoing && isStaff && (
                      <button
                        onClick={() => setActiveAllocationForReturn(alloc)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md shadow-purple-600/20 transition cursor-pointer self-start sm:self-auto flex-shrink-0"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>⚡ ตรวจรับคืนทั้งหมดเข้าคลัง (Bulk Return)</span>
                      </button>
                    )}
                  </div>

                  {/* Purpose & Schedule */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                    <div className="md:col-span-6 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 dark:text-slate-500 font-bold block text-[11px] mb-1">
                        วัตถุประสงค์การจัดสรร:
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">{alloc.purpose || 'ประจำห้องแล็ปตลอดภาคการศึกษา'}</p>
                    </div>
                    <div className="md:col-span-6 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                      <span className="text-slate-400 dark:text-slate-500 font-bold block text-[11px] mb-1">
                        ระยะเวลาที่จัดสรรประจำห้อง:
                      </span>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {new Date(alloc.borrowDate).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                          {' ถึง '}
                          {new Date(alloc.expectedReturnDate).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                        </span>
                        {alloc.actualReturnDate && (
                          <span className="ml-auto text-[11px] text-purple-700 font-bold">
                            (รับคืนจริง: {new Date(alloc.actualReturnDate).toLocaleDateString('th-TH')})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assets Grid */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>รายการครุภัณฑ์และหุ่นที่จัดสรร ({alloc.items?.length || 0} รายการ):</span>
                      <span className="text-[10px] text-indigo-600 font-medium">ตำแหน่งเดิมก่อนย้าย ➔ สถานที่ติดตั้งปัจจุบัน</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {alloc.items?.map((it: any) => {
                        const asset = it.asset;
                        return (
                          <div
                            key={it.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-[11px] bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                  {asset?.assetCode || it.item?.itemCode}
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {it.item?.name || asset?.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <span className="text-slate-400">ชั้นวางเดิม: {asset?.previousLocation || it.previousLocation || 'คลังหลัก'}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-indigo-700 dark:text-indigo-300 font-semibold">{alloc.targetLocation}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              {isOngoing ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ประจำห้อง
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  คืนเข้าคลังแล้ว
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* Modal: Checkout / Return Action (Mobile Bottom Sheet + Sticky Footer) */}
      {activeBorrowForAction && actionType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className={`bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full p-4 sm:p-6 shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 space-y-3.5 max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden ${actionType === 'CHECKOUT' ? 'max-w-2xl' : 'max-w-md'}`}>
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden shrink-0" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {actionType === 'CHECKOUT' ? (
                <>
                  <ClipboardCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  {activeBorrowForAction.requisitionRequest
                    ? 'ตรวจจ่ายพัสดุและส่งมอบครุภัณฑ์ (Check-out & Dispense)'
                    : 'ยืนยันการส่งมอบครุภัณฑ์ (Check-out)'}
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  ตรวจรับคืนครุภัณฑ์ (Check-in)
                </>
              )}
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  คำขอเลขที่: {activeBorrowForAction.requestNumber}
                  {activeBorrowForAction.requisitionRequest && ` + ${activeBorrowForAction.requisitionRequest.requestNumber}`}
                </span>
                <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                  ผู้ยืม/เบิก: {formatUserName(activeBorrowForAction.user)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">เวลานัดรับของ:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(activeBorrowForAction.borrowDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">กำหนดส่งคืน (เฉพาะครุภัณฑ์):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(activeBorrowForAction.expectedReturnDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                  </span>
                </div>
              </div>
            </div>

            {actionType === 'CHECKOUT' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* 1. Equipment Section */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      รายการครุภัณฑ์ที่ส่งมอบ (ตรวจสอบ / ปรับจำนวนจ่ายได้):
                    </span>
                    <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                      อนุญาต {checkoutBorrowItems.filter((i) => i.allowed).length}/{checkoutBorrowItems.length} รายการ
                    </span>
                  </div>

                  <div className="space-y-2">
                    {checkoutBorrowItems.map((it, idx) => {
                      const matchEq = equipmentList.find((e) => e.id === it.itemId);
                      const availableAssets = matchEq?.availableAssets || [];
                      const selectedAsset = availableAssets.find((a: any) => a.assetCode === it.assetCode);
                      const locText = formatLocationDisplay(selectedAsset || matchEq);

                      return (
                        <div
                          key={it.id}
                          className={`p-3 rounded-xl border transition text-xs space-y-2 ${
                            it.allowed
                              ? 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/60 shadow-sm'
                              : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 opacity-80'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{it.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                ขอมา: {it.requestedQty} {it.unit}
                                {it.assetCode && (
                                  <span className="ml-1.5 font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-bold">
                                    เครื่องที่เลือก: {it.assetCode}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                  พิกัดจัดเก็บ: <strong className="text-slate-800 dark:text-slate-200">{locText}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                              {it.allowed && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">จ่าย:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max={it.requestedQty}
                                    value={it.quantity === 0 ? '' : it.quantity}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw === '') {
                                        setCheckoutBorrowItems((prev) =>
                                          prev.map((item, i) => (i === idx ? { ...item, quantity: '' } : item))
                                        );
                                        return;
                                      }
                                      const val = parseInt(raw, 10);
                                      if (!isNaN(val)) {
                                        const clamped = Math.min(it.requestedQty, Math.max(1, val));
                                        setCheckoutBorrowItems((prev) =>
                                          prev.map((item, i) => {
                                            if (i !== idx) return item;
                                            const currentSelected = [...(item.selectedAssetIds || [])];
                                            if (clamped > currentSelected.length) {
                                              const unused = availableAssets.filter((a: any) => !currentSelected.includes(a.id));
                                              const needed = clamped - currentSelected.length;
                                              currentSelected.push(...unused.slice(0, needed).map((a: any) => a.id));
                                            } else if (clamped < currentSelected.length) {
                                              currentSelected.splice(clamped);
                                            }
                                            return {
                                              ...item,
                                              quantity: clamped,
                                              selectedAssetIds: currentSelected,
                                              assetId: currentSelected[0] || null,
                                              assetCode:
                                                availableAssets.find((a: any) => a.id === currentSelected[0])?.assetCode ||
                                                item.assetCode ||
                                                null,
                                            };
                                          })
                                        );
                                      }
                                    }}
                                    onBlur={() => {
                                      setCheckoutBorrowItems((prev) =>
                                        prev.map((item, i) => {
                                          if (i !== idx) return item;
                                          const currentQty =
                                            typeof item.quantity === 'number' && item.quantity >= 1
                                              ? Math.min(item.requestedQty, item.quantity)
                                              : 1;
                                          const currentSelected = [...(item.selectedAssetIds || [])];
                                          if (currentQty > currentSelected.length) {
                                            const unused = availableAssets.filter((a: any) => !currentSelected.includes(a.id));
                                            const needed = currentQty - currentSelected.length;
                                            currentSelected.push(...unused.slice(0, needed).map((a: any) => a.id));
                                          } else if (currentQty < currentSelected.length) {
                                            currentSelected.splice(currentQty);
                                          }
                                          return {
                                            ...item,
                                            quantity: currentQty,
                                            selectedAssetIds: currentSelected,
                                            assetId: currentSelected[0] || null,
                                            assetCode:
                                              availableAssets.find((a: any) => a.id === currentSelected[0])?.assetCode ||
                                              item.assetCode ||
                                              null,
                                          };
                                        })
                                      );
                                    }}
                                    className="w-14 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-center text-slate-800 dark:text-slate-200"
                                  />
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{it.unit}</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setCheckoutBorrowItems((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, allowed: !item.allowed } : item))
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                  it.allowed
                                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-800'
                                    : 'bg-rose-600 text-white hover:bg-rose-700'
                                }`}
                              >
                                {it.allowed ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>อนุญาต</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3.5 h-3.5" />
                                    <span>ไม่อนุญาต</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Multi-Asset Selector: Individual slot for each unit being lent */}
                          {it.allowed && availableAssets.length > 0 && (() => {
                            const numSlots =
                              typeof it.quantity === 'number' && it.quantity >= 1
                                ? it.quantity
                                : parseInt(String(it.quantity), 10) || 1;
                            return (
                              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    ระบุครุภัณฑ์รายชิ้นที่ส่งมอบ ({numSlots} ชิ้น):
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    พร้อมจ่ายในคลัง {availableAssets.length} ชิ้น
                                  </span>
                                </div>

                                {/* Quick-Pick Chips */}
                                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                                  <span className="text-[10.5px] font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1 shrink-0">
                                    <Sparkles className="w-3 h-3 text-amber-500" /> เลือกด่วน:
                                  </span>
                                  {availableAssets.map((ast: any) => {
                                    const isSelected = (it.selectedAssetIds || []).includes(ast.id);
                                    return (
                                      <button
                                        key={ast.id}
                                        type="button"
                                        onClick={() => {
                                          setCheckoutBorrowItems((prev) =>
                                            prev.map((item, i) => {
                                              if (i !== idx) return item;
                                              let selected = [...(item.selectedAssetIds || [])];
                                              if (isSelected) {
                                                selected = selected.filter((id) => id !== ast.id);
                                              } else {
                                                if (selected.length < numSlots) {
                                                  selected.push(ast.id);
                                                } else if (selected.length > 0) {
                                                  selected[selected.length - 1] = ast.id;
                                                } else {
                                                  selected = [ast.id];
                                                }
                                              }
                                              return {
                                                ...item,
                                                selectedAssetIds: selected,
                                                assetId: selected[0] || null,
                                                assetCode:
                                                  availableAssets.find((a: any) => a.id === selected[0])?.assetCode ||
                                                  item.assetCode ||
                                                  null,
                                              };
                                            })
                                          );
                                        }}
                                        className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold transition flex items-center gap-1 cursor-pointer border ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                        }`}
                                        title={`คลิกเพื่อเลือก/ยกเลิกเครื่อง ${ast.assetCode}`}
                                      >
                                        {isSelected ? <Check className="w-3 h-3" /> : null}
                                        <span>{ast.assetCode}</span>
                                        {ast.serialNumber && (
                                          <span className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            ({ast.serialNumber})
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Individual Slot Selectors */}
                                <div className="space-y-1.5">
                                  {Array.from({ length: numSlots }).map((_, slotIdx) => {
                                    const currentSlotAssetId = it.selectedAssetIds?.[slotIdx] || '';
                                    const currentAsset = availableAssets.find((a: any) => a.id === currentSlotAssetId);
                                    return (
                                      <div
                                        key={slotIdx}
                                        className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]"
                                      >
                                        <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0 w-16">
                                          ชิ้นที่ {slotIdx + 1}:
                                        </span>
                                        <select
                                          value={currentSlotAssetId}
                                          onChange={(e) => {
                                            const chosenId = e.target.value;
                                            setCheckoutBorrowItems((prev) =>
                                              prev.map((item, i) => {
                                                if (i !== idx) return item;
                                                const selected = [...(item.selectedAssetIds || [])];
                                                selected[slotIdx] = chosenId;
                                                return {
                                                  ...item,
                                                  selectedAssetIds: selected,
                                                  assetId: selected[0] || null,
                                                  assetCode:
                                                    availableAssets.find((a: any) => a.id === selected[0])?.assetCode ||
                                                    item.assetCode ||
                                                    null,
                                                };
                                              })
                                            );
                                          }}
                                          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 flex-1 font-mono"
                                        >
                                          <option value="">-- เลือกหมายเลขเครื่อง --</option>
                                          {availableAssets.map((ast: any) => {
                                            const isSelectedInOtherSlot = (it.selectedAssetIds || []).some(
                                              (id, sIdx) => id === ast.id && sIdx !== slotIdx
                                            );
                                            return (
                                              <option
                                                key={ast.id}
                                                value={ast.id}
                                                disabled={isSelectedInOtherSlot}
                                              >
                                                {ast.assetCode} {ast.serialNumber ? `(S/N: ${ast.serialNumber})` : ''} - {ast.location || 'ห้องแล็บ'} {isSelectedInOtherSlot ? '(ถูกเลือกในชิ้นอื่นแล้ว)' : ''}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        {currentAsset?.location && (
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-0.5">
                                            <MapPin className="w-2.5 h-2.5 text-rose-500" />
                                            {currentAsset.location}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Linked Consumables Section */}
                {activeBorrowForAction.requisitionRequest && checkoutReqItems.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        รายการวัสดุสิ้นเปลืองที่จ่ายร่วม (ตัดสต็อก FIFO):
                      </span>
                      <span className="text-[11px] font-medium text-teal-700 dark:text-teal-300">
                        อนุญาต {checkoutReqItems.filter((i) => i.allowed).length}/{checkoutReqItems.length} รายการ
                      </span>
                    </div>

                    <div className="space-y-2">
                      {checkoutReqItems.map((it, idx) => {
                        const matchCons = consumablesList.find((c) => c.id === it.itemId);
                        const recPacks = matchCons?.nextRecommendedPacks;
                        const consLoc = formatLocationDisplay(matchCons);

                        return (
                          <div
                            key={it.id}
                            className={`p-3 rounded-xl border transition text-xs space-y-2 ${
                              it.allowed
                                ? 'bg-white dark:bg-slate-900 border-teal-100 dark:border-teal-900/60 shadow-sm'
                                : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 opacity-80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                  {it.name}
                                  {it.isSubUnit && (
                                    <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 font-bold">
                                      เบิกย่อย
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  ขอมา: {it.requestedQty} {it.requestedUnit || it.unit}
                                  {it.currentStock !== undefined && (
                                    <span className="ml-1.5 text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                                      คงคลัง: {it.currentStock} {it.unit}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                    พิกัดจัดเก็บ: <strong className="text-slate-800 dark:text-slate-200">{consLoc}</strong>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center">
                                {it.allowed && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">จ่าย:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max={it.requestedQty}
                                      value={it.quantity === 0 ? '' : it.quantity}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === '') {
                                          setCheckoutReqItems((prev) =>
                                            prev.map((item, i) => (i === idx ? { ...item, quantity: '' } : item))
                                          );
                                          return;
                                        }
                                        const val = parseInt(raw, 10);
                                        if (!isNaN(val)) {
                                          const clamped = Math.min(it.requestedQty, Math.max(1, val));
                                          setCheckoutReqItems((prev) =>
                                            prev.map((item, i) => (i === idx ? { ...item, quantity: clamped } : item))
                                          );
                                        }
                                      }}
                                      onBlur={() => {
                                        setCheckoutReqItems((prev) =>
                                          prev.map((item, i) => {
                                            if (i !== idx) return item;
                                            const currentQty =
                                              typeof item.quantity === 'number' && item.quantity >= 1
                                                ? Math.min(item.requestedQty, item.quantity)
                                                : 1;
                                            return { ...item, quantity: currentQty };
                                          })
                                        );
                                      }}
                                      className="w-14 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-center text-slate-800 dark:text-slate-200"
                                    />
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{it.requestedUnit || it.unit}</span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setCheckoutReqItems((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, allowed: !item.allowed } : item))
                                    );
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                    it.allowed
                                      ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-200 border border-teal-300 dark:border-teal-800'
                                      : 'bg-rose-600 text-white hover:bg-rose-700'
                                  }`}
                                >
                                  {it.allowed ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>ให้เบิก</span>
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-3.5 h-3.5" />
                                      <span>ไม่อนุญาต</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Option A Smart Guidance for Sub-Unit Items */}
                            {it.isSubUnit && it.allowed && (
                              <div className="p-2.5 rounded-lg bg-teal-50/90 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-950 dark:text-teal-200 space-y-1">
                                <div className="font-bold flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>💡 คำแนะนำการจ่ายพัสดุ (ทางเลือก A - เบิกย่อย):</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 font-extrabold">
                                    1 {it.unit} = {it.conversionRatio} {it.requestedUnit}
                                  </span>
                                </div>
                                {(() => {
                                  const ratio = Number(it.conversionRatio) > 0 ? Number(it.conversionRatio) : 1;
                                  const numQty = typeof it.quantity === 'number' ? it.quantity : (parseInt(String(it.quantity), 10) || 0);
                                  const wholePacks = Math.floor(numQty / ratio);
                                  const loosePieces = numQty % ratio;
                                  const openRemainder = matchCons?.stockLots?.find((l: any) => (l.openPackRemainder || 0) > 0)?.openPackRemainder || 0;

                                  return (
                                    <div className="pl-5 space-y-0.5 text-slate-700 dark:text-slate-300">
                                      {wholePacks > 0 && (
                                        <div className="flex items-center gap-1">
                                          <span>• จ่ายแพ็คเต็ม:</span>
                                          <strong className="text-teal-900 dark:text-teal-100">{wholePacks} {it.unit}</strong>
                                          <span className="text-slate-500 dark:text-slate-400">({wholePacks * ratio} {it.requestedUnit})</span>
                                        </div>
                                      )}
                                      {loosePieces > 0 && (
                                        <div className="flex items-center gap-1">
                                          <span>• เศษที่ต้องจ่าย ({loosePieces} {it.requestedUnit}):</span>
                                          {openRemainder >= loosePieces ? (
                                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                              หยิบจากแพ็คเปิดเดิม {loosePieces} {it.requestedUnit} (เหลือเศษในแพ็คอีก {openRemainder - loosePieces} {it.requestedUnit})
                                            </span>
                                          ) : (
                                            <span className="text-amber-800 dark:text-amber-300 font-semibold">
                                              เปิดแพ็คใหม่ 1 {it.unit} → จ่าย {loosePieces} {it.requestedUnit} (เก็บเศษ {ratio - loosePieces} {it.requestedUnit} ไว้ในแพ็คเปิด)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Consumable Recommended FIFO Lot */}
                            {it.allowed && (it.stockLots || matchCons?.stockLots) && (it.stockLots || matchCons?.stockLots).length > 0 && (() => {
                              const availLots = it.stockLots?.length ? it.stockLots : (matchCons?.stockLots || []);
                              return (
                                <div className="p-2 rounded-lg bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60 flex flex-wrap items-center gap-2 text-[11px] text-teal-900 dark:text-teal-200">
                                  <span className="font-semibold flex items-center gap-1">
                                    <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                    📦 ล็อตที่ตัดสต็อก (FIFO แนะนำ):
                                  </span>
                                  {availLots.length === 1 ? (
                                    <span className="font-mono font-bold text-teal-800 dark:text-teal-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                                      Lot {availLots[0].lotNumber} {availLots[0].expiryDate ? `(EXP: ${new Date(availLots[0].expiryDate).toLocaleDateString('th-TH')})` : ''} - คงเหลือ {availLots[0].quantityRemaining} {it.unit}
                                    </span>
                                  ) : (
                                    <select
                                      value={it.lotId || availLots[0].id}
                                      onChange={(e) => {
                                        const chosenLotId = e.target.value;
                                        setCheckoutReqItems((prev) =>
                                          prev.map((item, i) => (i === idx ? { ...item, lotId: chosenLotId } : item))
                                        );
                                      }}
                                      className="bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 text-xs font-semibold rounded-lg px-2 py-1 focus:ring-1 focus:ring-teal-500"
                                    >
                                      {availLots.map((l: any, lIdx: number) => (
                                        <option key={l.id} value={l.id}>
                                          {lIdx === 0 ? '⭐ [FIFO แนะนำ] ' : ''}Lot {l.lotNumber} {l.expiryDate ? `(EXP: ${new Date(l.expiryDate).toLocaleDateString('th-TH')})` : '(ไม่ระบุวันหมดอายุ)'} - คงเหลือ {l.quantityRemaining} {it.unit}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Sterile Repack Recommendation */}
                            {recPacks && it.allowed && (
                              <div className="mt-2 pt-2 border-t border-teal-100/80 dark:border-teal-900/60 flex flex-wrap items-center justify-between gap-1 text-[11px] text-teal-900 dark:text-teal-200 bg-teal-50/80 dark:bg-teal-950/40 px-2.5 py-1.5 rounded-lg">
                                <span className="font-bold flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                  📦 แนะนำหยิบซองปลอดเชื้อตามลำดับ (FEFO):
                                </span>
                                <span className="font-mono font-bold text-teal-800 dark:text-teal-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                                  {recPacks.packs.slice(0, it.quantity).map((p: any) => `#${p.packNumber} (${p.packCode})`).join(', ')}
                                </span>
                                {recPacks.expiryDate && (
                                  <span className="text-[10px] text-teal-700 dark:text-teal-400">
                                    วันหมดอายุ: {new Date(recPacks.expiryDate).toLocaleDateString('th-TH')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Checkout Note Input Field */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>หมายเหตุการส่งมอบ / การจ่ายของ (ถ้ามี):</span>
                  </label>
                  <textarea
                    rows={2}
                    value={checkoutNote}
                    onChange={(e) => setCheckoutNote(e.target.value)}
                    placeholder="เช่น ส่งมอบพร้อมสาย AC 1 เส้นและกระเป๋า, ตัวเครื่องมีรอยขีดข่วนเดิมที่ฐาน, นิสิตตัวแทนกลุ่มมารับแทน..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    * ข้อความนี้จะถูกบันทึกในประวัติคำขอและแสดงให้นิสิตผู้ยืมทราบ เพื่อเป็นหลักฐานการส่งมอบร่วมกัน
                  </p>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
                  💡 เมื่อกดยืนยัน ระบบจะส่งมอบเฉพาะรายการที่ <b>"อนุญาต"</b> เท่านั้น พร้อมตัดสต็อกวัสดุสิ้นเปลืองอัตโนมัติ (FIFO) ตามจำนวนที่จ่ายจริง
                </p>
              </div>
            )}

            {actionType === 'RETURN' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ตรวจรับคืนและประเมินสภาพแยกตามรายชิ้น (Item Inspection) *
                  </label>
                  <div className="space-y-2.5">
                    {activeBorrowForAction.items?.map((it: any) => {
                      const currentItemRet = itemReturns.find((ir) => ir.id === it.id);
                      const condition = currentItemRet?.condition || 'GOOD';

                      return (
                        <div
                          key={it.id}
                          className={`p-3 rounded-xl border transition ${
                            condition === 'DAMAGED'
                              ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                              : 'bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${condition === 'DAMAGED' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                                <span>{it.item?.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                จำนวน {it.quantity} {it.item?.unit}
                                {it.asset && (
                                  <span className="font-mono text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-teal-700 dark:text-teal-300 ml-1.5">
                                    รหัส: {it.asset.assetCode} ({it.item?.unit || 'ชิ้น'}ที่ {it.asset.sequenceNumber || 1})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setItemReturns((prev) =>
                                    prev.map((ir) =>
                                      ir.id === it.id ? { ...ir, condition: 'GOOD' } : ir
                                    )
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                  condition === 'GOOD'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>สมบูรณ์</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setItemReturns((prev) =>
                                    prev.map((ir) =>
                                      ir.id === it.id ? { ...ir, condition: 'DAMAGED' } : ir
                                    )
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                  condition === 'DAMAGED'
                                    ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>ชำรุด</span>
                              </button>
                            </div>
                          </div>

                          {condition === 'DAMAGED' && (
                            <div className="mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/60">
                              <input
                                type="text"
                                placeholder="ระบุอาการชำรุดของรายการนี้ เช่น หูฟังยางฉีกขาด, หน้าจอไม่ติด"
                                value={currentItemRet?.note || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setItemReturns((prev) =>
                                    prev.map((ir) =>
                                      ir.id === it.id ? { ...ir, note: val } : ir
                                    )
                                  );
                                }}
                                className="w-full bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-800 rounded-lg px-2.5 py-1 text-xs text-rose-900 dark:text-rose-200 placeholder:text-rose-300 dark:placeholder:text-rose-500 focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {activeBorrowForAction.requisitionRequest?.items?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>รับคืนวัสดุสิ้นเปลืองเหลือใช้ (ถ้ามี):</span>
                      </span>
                      <span className="text-[10px] text-teal-700 dark:text-teal-300">
                        (ระบุเฉพาะชิ้นที่นำมาคืน)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {activeBorrowForAction.requisitionRequest.items.map((rIt: any) => {
                        const currentQty = reqSurplusReturns.find((r) => r.id === rIt.id)?.quantity ?? '';
                        const maxCan = Math.max(0, rIt.quantityDispensed - (rIt.quantityReturned || 0));
                        return (
                          <div key={rIt.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-100 dark:border-teal-900/60 flex items-center justify-between gap-2 text-xs">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{rIt.item?.name}</div>
                              <div className="text-[10px] text-slate-500">จ่ายไป: {rIt.quantityDispensed} {rIt.requestedUnit || rIt.item?.unit} (คืนได้สูงสุด {maxCan})</div>
                            </div>
                            {maxCan > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500">คืน:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={maxCan}
                                  value={currentQty}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.min(maxCan, Math.max(0, parseInt(e.target.value, 10) || 0));
                                    setReqSurplusReturns((prev) => {
                                      const existing = prev.find((p) => p.id === rIt.id);
                                      if (existing) {
                                        return prev.map((p) => (p.id === rIt.id ? { ...p, quantity: val } : p));
                                      }
                                      return [...prev, { id: rIt.id, quantity: val, condition: 'SEALED_INTACT' }];
                                    });
                                  }}
                                  placeholder="0"
                                  className="w-16 px-2 py-1 text-center font-bold text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                                />
                                <span className="text-[10px] text-slate-500">{rIt.requestedUnit || rIt.item?.unit}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-bold">✓ คืนครบแล้ว</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หมายเหตุภาพรวมการตรวจรับคืน (ถ้ามี)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="บันทึกเพิ่มเติมจากเจ้าหน้าที่ประจำห้องปฏิบัติการ..."
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveBorrowForAction(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleActionSubmit}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {submitting ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Borrow Slip Modal */}
      {activeSlipBorrow && (
        <BorrowSlipModal
          borrow={activeSlipBorrow}
          onClose={() => setActiveSlipBorrow(null)}
        />
      )}

      {/* Edit Request Modal */}
      {editingRequest && (
        <EditRequestModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingRequest(null);
          }}
          onSuccess={() => {
            fetchBorrowData(true);
          }}
          initialData={editingRequest}
          requestType={editingRequest.requisitionRequest ? 'UNIFIED' : 'BORROW'}
        />
      )}

      {/* New Semester-Long Course Allocation Modal */}
      {showNewAllocationModal && (
        <NewAllocationModal
          courses={Array.isArray(courses) ? courses : []}
          onClose={() => setShowNewAllocationModal(false)}
          onSuccess={() => {
            fetchAllocations();
            fetchBorrowData();
          }}
        />
      )}

      {/* Bulk Allocation Return Modal (End of Semester) */}
      {activeAllocationForReturn && (
        <BulkAllocationReturnModal
          allocation={activeAllocationForReturn}
          onClose={() => setActiveAllocationForReturn(null)}
          onSuccess={() => {
            fetchAllocations();
            fetchBorrowData();
          }}
        />
      )}
    </div>
  );
}
