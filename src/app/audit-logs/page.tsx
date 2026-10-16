'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  History,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  KeyRound,
  Trash2,
  UserCheck,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Package,
  DoorOpen,
  GraduationCap,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ActivityLogItem {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  details?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    id: string;
    prefix?: string | null;
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { currentUser, isAdmin, isOfficer, isLoading: authLoading } = useAuth();

  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayCount: 0,
    todayApprovals: 0,
    todayCheckouts: 0,
    todayReturns: 0,
  });

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [activeLog, setActiveLog] = useState<ActivityLogItem | null>(null);

  const fetchLogs = async (isManualRefresh = false) => {
    if (!currentUser?.id) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('userId', currentUser.id);
      params.set('page', String(page));
      params.set('limit', '25');

      if (selectedAction !== 'ALL') params.set('action', selectedAction);
      if (selectedEntity !== 'ALL') params.set('entityType', selectedEntity);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const now = new Date();
      if (dateFilter === 'TODAY') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        params.set('startDate', start);
      } else if (dateFilter === '7DAYS') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        params.set('startDate', start);
      } else if (dateFilter === '30DAYS') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        params.set('startDate', start);
      }

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.totalCount || 0);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id && (isAdmin || isOfficer)) {
      fetchLogs();
    }
  }, [currentUser?.id, isAdmin, isOfficer, page, selectedAction, selectedEntity, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleExportExcel = () => {
    if (logs.length === 0) {
      alert('ไม่มีข้อมูลที่สามารถส่งออกได้');
      return;
    }

    const exportRows = logs.map((log, idx) => ({
      ลำดับ: idx + 1,
      วันเวลา: new Date(log.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'medium' }),
      ผู้ทำรายการ: log.userName || log.user?.name || 'ระบบอัตโนมัติ',
      บทบาทผู้ทำรายการ: log.userRole || log.user?.role || 'SYSTEM',
      การกระทำ: formatActionLabel(log.action),
      หมวดหมู่: formatEntityLabel(log.entityType),
      เลขอ้างอิง: log.entityTitle || log.entityId || '-',
      รายละเอียด: log.details || '-',
      IP: log.ipAddress || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AuditLogs');
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    XLSX.writeFile(wb, `activity_audit_logs_${timestamp}.xlsx`);
  };

  // Helper Labels & Badges
  const formatActionLabel = (action: string) => {
    switch (action) {
      case 'APPROVE':
        return 'อนุมัติรายการ';
      case 'REJECT':
        return 'ปฏิเสธคำขอ';
      case 'CHECKOUT':
        return 'จ่ายของ/รับอุปกรณ์';
      case 'DISPENSE':
        return 'จ่ายวัสดุสิ้นเปลือง';
      case 'RETURN':
        return 'รับคืนอุปกรณ์';
      case 'REMIND':
        return 'ส่งการแจ้งเตือนกำหนดคืน';
      case 'ROLE_UPDATE':
        return 'ปรับเปลี่ยนสิทธิ์/บทบาท';
      case 'UPDATE':
        return 'แก้ไขข้อมูล';
      case 'DELETE':
        return 'ลบรายการ';
      case 'STOCK_IN':
        return 'รับของเข้าคลัง';
      case 'STOCK_ADJUST':
        return 'ปรับยอดสต็อก';
      default:
        return action;
    }
  };

  const formatEntityLabel = (entity: string) => {
    switch (entity) {
      case 'BORROW':
        return 'การยืม-คืนพัสดุ';
      case 'REQUISITION':
        return 'การเบิกวัสดุสิ้นเปลือง';
      case 'ROOM_BOOKING':
        return 'การจองห้องปฏิบัติการ';
      case 'PRACTICE_BOOKING':
        return 'การจองฝึกทักษะ';
      case 'USER':
        return 'จัดการผู้ใช้งาน';
      case 'ITEM':
      case 'STOCK':
        return 'คลังพัสดุ/ครุภัณฑ์';
      case 'SYSTEM':
        return 'ระบบงานส่วนกลาง';
      default:
        return entity;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'APPROVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            อนุมัติ
          </span>
        );
      case 'REJECT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            ปฏิเสธ
          </span>
        );
      case 'CHECKOUT':
      case 'DISPENSE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {action === 'DISPENSE' ? 'จ่ายวัสดุ' : 'จ่ายของ'}
          </span>
        );
      case 'RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            รับคืน
          </span>
        );
      case 'REMIND':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-300 dark:border-violet-800">
            <Bell className="w-3.5 h-3.5" />
            ส่งเตือน
          </span>
        );
      case 'ROLE_UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <KeyRound className="w-3.5 h-3.5" />
            ปรับสิทธิ์
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            <Trash2 className="w-3.5 h-3.5" />
            ลบข้อมูล
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            {action}
          </span>
        );
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'BORROW':
        return <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'REQUISITION':
        return <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'ROOM_BOOKING':
        return <DoorOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'PRACTICE_BOOKING':
        return <GraduationCap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case 'USER':
        return <UserIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <History className="w-4 h-4 text-slate-500" />;
    }
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </div>
    );
  }

  // Strict Role Guard: Only ADMIN and OFFICER
  if (!isAdmin && !isOfficer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-8 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            ไม่มีสิทธิ์เข้าถึง (Access Denied)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            หน้านี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) และเจ้าหน้าที่ห้องปฏิบัติการ (Officer) เท่านั้น หากท่านต้องการตรวจสอบข้อมูลธุรกรรม กรุณาติดต่อเจ้าหน้าที่ดูแลระบบ
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-sm transition"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-2xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                ประวัติการทำรายการ (System Activity Log)
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                บันทึกการอนุมัติ, จ่ายพัสดุ, รับคืน, แจ้งเตือนนิสิต, และการปรับเปลี่ยนสิทธิ์ผู้ใช้
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-sm font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">รายการวันนี้</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stats.todayCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">บันทึกกิจกรรมทั้งหมดในระบบวันนี้</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">อนุมัติคำขอวันนี้</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.todayApprovals.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">คำขอยืมและเบิกที่อนุมัติแล้ว</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">จ่ายพัสดุวันนี้</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.todayCheckouts.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">ส่งมอบอุปกรณ์/วัสดุให้นิสิต</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">รับคืนพัสดุวันนี้</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {stats.todayReturns.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">ตรวจรับคืนอุปกรณ์เข้าคลัง</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้ทำรายการ, รหัสคำขอ, รายละเอียด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </form>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-48 py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="ALL">การกระทำ: ทั้งหมด</option>
            <option value="APPROVE">อนุมัติ (APPROVE)</option>
            <option value="REJECT">ปฏิเสธ (REJECT)</option>
            <option value="CHECKOUT">จ่ายของ (CHECKOUT)</option>
            <option value="DISPENSE">จ่ายวัสดุ (DISPENSE)</option>
            <option value="RETURN">รับคืน (RETURN)</option>
            <option value="REMIND">ส่งเตือน (REMIND)</option>
            <option value="ROLE_UPDATE">ปรับเปลี่ยนสิทธิ์ (ROLE_UPDATE)</option>
            <option value="DELETE">ลบข้อมูล (DELETE)</option>
          </select>

          {/* Entity Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => {
              setSelectedEntity(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-48 py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="ALL">หมวดหมู่: ทั้งหมด</option>
            <option value="BORROW">ยืม-คืนพัสดุ (BORROW)</option>
            <option value="REQUISITION">เบิกวัสดุสิ้นเปลือง (REQUISITION)</option>
            <option value="ROOM_BOOKING">จองห้องปฏิบัติการ (ROOM)</option>
            <option value="PRACTICE_BOOKING">จองฝึกทักษะ (PRACTICE)</option>
            <option value="USER">ผู้ใช้งาน (USER)</option>
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
            {(['ALL', 'TODAY', '7DAYS', '30DAYS'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setDateFilter(mode);
                  setPage(1);
                }}
                className={`flex-1 md:flex-none px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dateFilter === mode
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {mode === 'ALL' && 'ทั้งหมด'}
                {mode === 'TODAY' && 'วันนี้'}
                {mode === '7DAYS' && '7 วัน'}
                {mode === '30DAYS' && '30 วัน'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">วันเวลา (Time)</th>
                <th className="py-3 px-4">ผู้ทำรายการ (Actor)</th>
                <th className="py-3 px-4">การกระทำ (Action)</th>
                <th className="py-3 px-4">หมวดหมู่ & อ้างอิง (Entity)</th>
                <th className="py-3 px-4">รายละเอียด (Details)</th>
                <th className="py-3 px-4 text-center">ข้อมูลเชิงลึก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    กำลังโหลดข้อมูลประวัติการทำรายการ...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    ไม่พบรายการบันทึกกิจกรรมตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(log.createdAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {new Date(log.createdAt).toLocaleTimeString('th-TH')} น.
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px] text-slate-600 dark:text-slate-300 uppercase">
                          {(log.userName || log.user?.name || 'S')[0]}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {log.userName || log.user?.name || 'ระบบอัตโนมัติ'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {log.userRole || log.user?.role || 'SYSTEM'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">{getActionBadge(log.action)}</td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getEntityIcon(log.entityType)}
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {log.entityTitle || log.entityId || formatEntityLabel(log.entityType)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatEntityLabel(log.entityType)}</div>
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {log.details || '-'}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setActiveLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>รายละเอียด</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            แสดงผลรวมทั้งสิ้น <span className="font-semibold text-slate-800 dark:text-slate-200">{totalCount.toLocaleString()}</span> รายการ
            (หน้า {page} จาก {totalPages})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300 px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  รายละเอียดกิจกรรม (Activity Snapshot)
                </h3>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400 block mb-0.5">วันเวลา:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(activeLog.createdAt).toLocaleDateString('th-TH', { dateStyle: 'long' })}, {new Date(activeLog.createdAt).toLocaleTimeString('th-TH')} น.
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">การกระทำ:</span>
                  <div>{getActionBadge(activeLog.action)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">ผู้ทำรายการ:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeLog.userName || activeLog.user?.name || 'ระบบอัตโนมัติ'} ({activeLog.userRole || 'SYSTEM'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">หมวดหมู่งาน:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatEntityLabel(activeLog.entityType)}
                  </span>
                </div>
              </div>

              {activeLog.details && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">คำอธิบาย/หมายเหตุ:</span>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                    {activeLog.details}
                  </div>
                </div>
              )}

              {activeLog.metadata && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">ข้อมูลเชิงลึก (Metadata Payload):</span>
                  <pre className="p-3 rounded-xl bg-slate-900 text-teal-300 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(activeLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
