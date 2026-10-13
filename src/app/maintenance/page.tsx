'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Activity,
  CheckSquare,
  FileText,
  Send,
  Search,
  Filter,
  Plus,
  Coins,
  Building2,
  Calendar,
  ArrowUpRight,
  BarChart3,
  Eye,
  X,
  ChevronRight,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Camera,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Phone,
  User,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Info,
} from 'lucide-react';
import LoadingSpinner, { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function MaintenanceDashboardPage() {
  const { currentUser, isOfficer, isAdmin, isApprover } = useAuth();
  const isStaff = isOfficer || isAdmin || isApprover;

  // Active Tab: 'issues' | 'repairs' | 'inspections' | 'analytics'
  const [activeTab, setActiveTab] = useState<'issues' | 'repairs' | 'inspections' | 'analytics'>('issues');

  // Loading & Refresh
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Data states
  const [issues, setIssues] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // Filters for Issues
  const [issueStatusFilter, setIssueStatusFilter] = useState<string>('ALL');
  const [issueUrgencyFilter, setIssueUrgencyFilter] = useState<string>('ALL');
  const [issueSearch, setIssueSearch] = useState<string>('');

  // Filters for Repairs
  const [repairStatusFilter, setRepairStatusFilter] = useState<string>('ALL');
  const [repairSearch, setRepairSearch] = useState<string>('');

  // Filters for Inspections
  const [pmStatusFilter, setPmStatusFilter] = useState<string>('ALL');
  const [assetSearch, setAssetSearch] = useState<string>('');

  // Modals
  // 1. Photo Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // 2. Acknowledge Issue Modal / State
  const [actionIssueTarget, setActionIssueTarget] = useState<any | null>(null);
  const [issueActionType, setIssueActionType] = useState<'ACKNOWLEDGE' | 'SEND_TO_REPAIR' | 'RESOLVE' | null>(null);
  const [issueActionNote, setIssueActionNote] = useState('');
  const [issueRepairShop, setIssueRepairShop] = useState('ศูนย์ซ่อมบำรุง / ช่างประจำคณะ');
  const [issueRepairCost, setIssueRepairCost] = useState<number>(0);
  const [issueActionSubmitting, setIssueActionSubmitting] = useState(false);

  // 3. New Repair Ticket Modal (Manual)
  const [showNewRepairModal, setShowNewRepairModal] = useState(false);
  const [newRepairForm, setNewRepairForm] = useState({
    assetId: '',
    issue: '',
    repairShop: 'ศูนย์ซ่อมบำรุงพัสดุ / ช่างประจำคณะ',
    repairCost: 0,
    technicianNote: '',
  });
  const [newRepairSubmitting, setNewRepairSubmitting] = useState(false);

  // 4. Complete Repair Modal (Return to stock)
  const [completeRepairTarget, setCompleteRepairTarget] = useState<any | null>(null);
  const [completeForm, setCompleteForm] = useState({
    repairCost: 0,
    repairShop: '',
    technicianNote: 'ซ่อมแซมและทดสอบระบบการทำงานเรียบร้อย สมบูรณ์พร้อมใช้งาน คืนเข้าสต็อก',
  });
  const [completeSubmitting, setCompleteSubmitting] = useState(false);

  // 5. Digital Checklist Inspection Modal
  const [checklistTarget, setChecklistTarget] = useState<any | null>(null);
  const [checklistResult, setChecklistResult] = useState<'PASS' | 'PASS_WITH_NOTE' | 'FAIL'>('PASS');
  const [checklistNotes, setChecklistNotes] = useState('');
  const [checklistIntervalDays, setChecklistIntervalDays] = useState<number>(30);
  const [checklistChecks, setChecklistChecks] = useState<Record<string, boolean>>({
    visualCondition: true,
    powerAndBattery: true,
    functionSelfTest: true,
    cleanliness: true,
    accessoriesComplete: true,
  });
  const [checklistSubmitting, setChecklistSubmitting] = useState(false);

  // 6. Quick Interval Configuration Modal
  const [intervalModalTarget, setIntervalModalTarget] = useState<any | null>(null);
  const [intervalDaysInput, setIntervalDaysInput] = useState<number>(30);
  const [applyToAllSameItem, setApplyToAllSameItem] = useState(false);
  const [intervalSubmitting, setIntervalSubmitting] = useState(false);

  // Fetch all maintenance data
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [issuesRes, repairsRes, inspectionsRes, assetsRes] = await Promise.all([
        fetch('/api/maintenance/issues'),
        fetch('/api/maintenance'),
        fetch('/api/maintenance/inspections'),
        fetch('/api/maintenance/assets'),
      ]);

      if (issuesRes.ok) setIssues(await issuesRes.json());
      if (repairsRes.ok) setRepairs(await repairsRes.json());
      if (inspectionsRes.ok) setInspections(await inspectionsRes.json());
      if (assetsRes.ok) setAssets(await assetsRes.json());

      setLastRefreshed(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      if (issueStatusFilter !== 'ALL' && item.status !== issueStatusFilter) return false;
      if (issueUrgencyFilter !== 'ALL' && item.urgency !== issueUrgencyFilter) return false;
      if (issueSearch) {
        const q = issueSearch.toLowerCase();
        const assetCode = item.asset?.assetCode?.toLowerCase() || '';
        const itemName = item.asset?.item?.name?.toLowerCase() || '';
        const desc = item.issueDescription?.toLowerCase() || '';
        const reporter = item.reporterName?.toLowerCase() || '';
        const repNum = item.reportNumber?.toLowerCase() || '';
        if (!assetCode.includes(q) && !itemName.includes(q) && !desc.includes(q) && !reporter.includes(q) && !repNum.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [issues, issueStatusFilter, issueUrgencyFilter, issueSearch]);

  // Filtered Repairs
  const filteredRepairs = useMemo(() => {
    return repairs.filter((log) => {
      if (repairStatusFilter !== 'ALL' && log.status !== repairStatusFilter) return false;
      if (repairSearch) {
        const q = repairSearch.toLowerCase();
        const code = log.asset?.assetCode?.toLowerCase() || '';
        const name = log.asset?.item?.name?.toLowerCase() || '';
        const shop = log.repairShop?.toLowerCase() || '';
        const issueText = log.issue?.toLowerCase() || '';
        if (!code.includes(q) && !name.includes(q) && !shop.includes(q) && !issueText.includes(q)) return false;
      }
      return true;
    });
  }, [repairs, repairStatusFilter, repairSearch]);

  // Filtered Assets for PM
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (pmStatusFilter !== 'ALL' && a.pmStatus !== pmStatusFilter) return false;
      if (assetSearch) {
        const q = assetSearch.toLowerCase();
        const code = a.assetCode?.toLowerCase() || '';
        const gov = a.govAssetCode?.toLowerCase() || '';
        const name = a.item?.name?.toLowerCase() || '';
        const loc = a.location?.toLowerCase() || '';
        if (!code.includes(q) && !gov.includes(q) && !name.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });
  }, [assets, pmStatusFilter, assetSearch]);

  // Counts & Stats
  const stats = useMemo(() => {
    const totalEquipment = assets.length;
    const underRepair = assets.filter((a) => a.status === 'MAINTENANCE').length;
    const available = assets.filter((a) => a.status === 'AVAILABLE').length;
    const uptimeRate = totalEquipment > 0 ? (((totalEquipment - underRepair) / totalEquipment) * 100).toFixed(1) : '100';

    const pendingIssues = issues.filter((i) => i.status === 'PENDING' || i.status === 'ACKNOWLEDGED').length;
    const criticalIssues = issues.filter((i) => i.status === 'PENDING' && i.urgency === 'CRITICAL').length;

    const overduePM = assets.filter((a) => a.pmStatus === 'OVERDUE').length;
    const dueSoonPM = assets.filter((a) => a.pmStatus === 'DUE_SOON').length;

    const totalRepairCost = repairs.reduce((sum, r) => sum + (Number(r.repairCost) || 0), 0);

    return {
      totalEquipment,
      underRepair,
      available,
      uptimeRate,
      pendingIssues,
      criticalIssues,
      overduePM,
      dueSoonPM,
      totalRepairCost,
    };
  }, [assets, issues, repairs]);

  // Top Defect Items / Assets for Executive view
  const topDefectAssets = useMemo(() => {
    const countMap = new Map<string, { count: number; name: string; code: string; totalCost: number }>();
    repairs.forEach((r) => {
      const code = r.asset?.assetCode || 'UNKNOWN';
      const name = r.asset?.item?.name || 'อุปกรณ์ทั่วไป';
      const existing = countMap.get(code) || { count: 0, name, code, totalCost: 0 };
      existing.count += 1;
      existing.totalCost += Number(r.repairCost) || 0;
      countMap.set(code, existing);
    });
    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [repairs]);

  // Handle Issue Action (Acknowledge, Send to Repair, Resolve)
  const handleExecuteIssueAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionIssueTarget || !issueActionType) return;
    setIssueActionSubmitting(true);
    try {
      const res = await fetch(`/api/maintenance/issues/${actionIssueTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: issueActionType,
          actionNote: issueActionNote,
          userId: currentUser?.id,
          repairShop: issueRepairShop,
          repairCost: issueRepairCost,
        }),
      });

      if (res.ok) {
        setActionIssueTarget(null);
        setIssueActionType(null);
        setIssueActionNote('');
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการทำรายการ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIssueActionSubmitting(false);
    }
  };

  // Handle Manual Repair Creation
  const handleCreateNewRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepairForm.assetId || !newRepairForm.issue) {
      alert('กรุณาเลือกอุปกรณ์และระบุอาการชำรุด');
      return;
    }
    setNewRepairSubmitting(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_REPAIR',
          assetId: newRepairForm.assetId,
          issue: newRepairForm.issue,
          repairShop: newRepairForm.repairShop,
          repairCost: newRepairForm.repairCost,
          technicianNote: newRepairForm.technicianNote,
          userId: currentUser?.id,
        }),
      });

      if (res.ok) {
        setShowNewRepairModal(false);
        setNewRepairForm({
          assetId: '',
          issue: '',
          repairShop: 'ศูนย์ซ่อมบำรุงพัสดุ / ช่างประจำคณะ',
          repairCost: 0,
          technicianNote: '',
        });
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'ส่งซ่อมไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งซ่อม');
    } finally {
      setNewRepairSubmitting(false);
    }
  };

  // Handle Complete Repair (Return to stock)
  const handleCompleteRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeRepairTarget) return;
    setCompleteSubmitting(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMPLETE_REPAIR',
          assetId: completeRepairTarget.assetId,
          logId: completeRepairTarget.id,
          technicianNote: completeForm.technicianNote,
          repairCost: completeForm.repairCost,
          repairShop: completeForm.repairShop || completeRepairTarget.repairShop,
        }),
      });

      if (res.ok) {
        setCompleteRepairTarget(null);
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'บันทึกการซ่อมเสร็จไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  // Handle Checklist Submission
  const handleChecklistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistTarget || !currentUser?.id) return;
    setChecklistSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: checklistTarget.id,
          inspectorId: currentUser.id,
          inspectionType: 'ROUTINE',
          result: checklistResult,
          checklistData: checklistChecks,
          notes: checklistNotes,
          intervalDays: checklistIntervalDays,
        }),
      });

      if (res.ok) {
        setChecklistTarget(null);
        setChecklistNotes('');
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'บันทึกการตรวจไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกการตรวจ');
    } finally {
      setChecklistSubmitting(false);
    }
  };

  // Handle Save Inspection Interval
  const handleSaveInterval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intervalModalTarget) return;
    setIntervalSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: applyToAllSameItem ? undefined : intervalModalTarget.id,
          itemId: applyToAllSameItem ? intervalModalTarget.item?.id : undefined,
          intervalDays: intervalDaysInput,
        }),
      });

      if (res.ok) {
        setIntervalModalTarget(null);
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'บันทึกรอบตรวจไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIntervalSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  ตรวจเช็ก & บำรุงรักษาหุ่นจำลอง
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  PM & Repair Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ระบบ 4 เสาหลัก: ตรวจสอบตามรอบ (PM), แจ้งชำรุดด่วนผ่าน QR, ทะเบียนส่งซ่อม, แดชบอร์ดผู้บริหาร (Informed)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lastRefreshed && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              อัปเดตล่าสุด {lastRefreshed}
            </span>
          )}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          {isStaff && (
            <button
              onClick={() => setShowNewRepairModal(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>แจ้งส่งซ่อมใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Row (Executive Overview) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>อัตราความพร้อมใช้งาน</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.uptimeRate}%
          </div>
          <div className="text-[10px] text-slate-400">
            พร้อมใช้ {stats.available} จาก {stats.totalEquipment} ชิ้น
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>ส่งซ่อมอยู่</span>
            <Wrench className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.underRepair}
          </div>
          <div className="text-[10px] text-slate-400">
            {stats.underRepair > 0 ? 'งดใช้งานชั่วคราว' : 'ไม่มีเครื่องชำรุด'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>เรื่องแจ้งรอดำเนินการ</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.pendingIssues}
          </div>
          <div className="text-[10px] text-slate-400">
            {stats.criticalIssues > 0 ? (
              <span className="text-rose-500 font-bold">⚠️ วิกฤต {stats.criticalIssues} รายการ</span>
            ) : (
              'จาก QR Code หน้าเครื่อง'
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>เกินรอบตรวจ (Overdue PM)</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            <span className={stats.overduePM > 0 ? 'text-rose-600 dark:text-rose-400' : ''}>
              {stats.overduePM}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            ใกล้ครบ 7 วัน: {stats.dueSoonPM} ชิ้น
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>ยอดค่าซ่อมสะสม</span>
            <Coins className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
            ฿{stats.totalRepairCost.toLocaleString('th-TH')}
          </div>
          <div className="text-[10px] text-slate-400">
            รายงานผู้บริหาร (Informed)
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-850 rounded-2xl max-w-fit">
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'issues'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>กล่องรับเรื่องแจ้งปัญหา (QR)</span>
          {stats.pendingIssues > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
              {stats.pendingIssues}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('repairs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'repairs'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>ทะเบียนส่งซ่อมบำรุง</span>
          {stats.underRepair > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
              {stats.underRepair}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inspections')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'inspections'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>ตรวจเช็กสภาพตามรอบ (PM)</span>
          {stats.overduePM > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
              {stats.overduePM}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>แดชบอร์ดผู้บริหาร (Informed)</span>
        </button>
      </div>

      {/* TAB 1: ISSUES INBOX */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหารหัสแล็บ, ชื่ออุปกรณ์, รายละเอียดอาการ, ผู้แจ้ง..."
                value={issueSearch}
                onChange={(e) => setIssueSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={issueStatusFilter}
                onChange={(e) => setIssueStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="PENDING">รอดำเนินการ (Pending)</option>
                <option value="ACKNOWLEDGED">รับเรื่องแล้ว (Acknowledged)</option>
                <option value="SENT_TO_REPAIR">ส่งซ่อมแล้ว (Sent to Repair)</option>
                <option value="RESOLVED">แก้ไขเสร็จแล้ว (Resolved)</option>
              </select>

              <select
                value={issueUrgencyFilter}
                onChange={(e) => setIssueUrgencyFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">ความเร่งด่วนทั้งหมด</option>
                <option value="CRITICAL">🔴 วิกฤต / หยุดใช้ทันที</option>
                <option value="URGENT">🟠 เร่งด่วน (มีเรียน)</option>
                <option value="NORMAL">⚪ ปกติ</option>
              </select>
            </div>
          </div>

          {/* Issues List */}
          {loading ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
              <LoadingSpinner message="กำลังโหลดรายการแจ้งปัญหา..." />
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">ไม่พบรายการแจ้งปัญหาค้างอยู่</h3>
              <p className="text-xs text-slate-400">อุปกรณ์และหุ่นจำลองทั้งหมดอยู่ในสภาพปกติพร้อมใช้งาน</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIssues.map((issue) => {
                const isPending = issue.status === 'PENDING';
                const isAck = issue.status === 'ACKNOWLEDGED';
                const isSent = issue.status === 'SENT_TO_REPAIR';
                const isResolved = issue.status === 'RESOLVED';

                return (
                  <div
                    key={issue.id}
                    className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 space-y-3.5 transition shadow-sm ${
                      issue.urgency === 'CRITICAL'
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                        : issue.urgency === 'URGENT'
                        ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                              issue.urgency === 'CRITICAL'
                                ? 'bg-rose-600 text-white animate-pulse'
                                : issue.urgency === 'URGENT'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {issue.urgency === 'CRITICAL' ? '⚠️ วิกฤต/หยุดใช้' : issue.urgency === 'URGENT' ? 'เร่งด่วน' : 'ปกติ'}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                            {issue.reportNumber}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                          {issue.asset?.item?.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-mono text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                            {issue.asset?.assetCode}
                          </span>
                          <span>{issue.asset?.location || 'ห้องแล็บ'}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          isPending
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : isAck
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isSent
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {isPending ? 'รอดำเนินการ' : isAck ? 'รับเรื่องแล้ว' : isSent ? 'ส่งซ่อมแล้ว' : 'แก้ไขเสร็จแล้ว'}
                      </span>
                    </div>

                    {/* Issue Description */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-750 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      <b className="text-slate-500 block text-[10px] mb-0.5">อาการชำรุด:</b>
                      {issue.issueDescription}
                    </div>

                    {/* Action Note if any */}
                    {issue.actionNote && (
                      <div className="p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 text-[11px] text-teal-900 dark:text-teal-200">
                        <b>บันทึกเจ้าหน้าที่:</b> {issue.actionNote}
                      </div>
                    )}

                    {/* Reporter Info & Photo preview */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {issue.reporterName || 'ไม่ระบุชื่อ'} (
                            {issue.reporterRole === 'STUDENT' ? 'นิสิต' : issue.reporterRole === 'TEACHER' ? 'อาจารย์' : 'เจ้าหน้าที่'})
                          </span>
                        </div>
                        {issue.contactPhone && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Phone className="w-3 h-3" />
                            <span>{issue.contactPhone}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          แจ้งเมื่อ: {new Date(issue.createdAt).toLocaleString('th-TH')}
                        </div>
                      </div>

                      {issue.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(issue.photoUrl)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 text-[10px] font-bold transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>ดูรูปภาพ</span>
                        </button>
                      )}
                    </div>

                    {/* Action Buttons for Staff */}
                    {isStaff && !isResolved && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionIssueTarget(issue);
                              setIssueActionType('ACKNOWLEDGE');
                              setIssueActionNote('เจ้าหน้าที่รับเรื่องเรียบร้อย กำลังเข้าตรวจสอบสภาพอุปกรณ์');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                          >
                            รับเรื่อง
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActionIssueTarget(issue);
                            setIssueActionType('RESOLVE');
                            setIssueActionNote('ตรวจสอบและแก้ไขเรียบร้อย พร้อมใช้งานในห้องแล็บ');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition cursor-pointer"
                        >
                          แก้ไขเสร็จสิ้น
                        </button>

                        {!isSent && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionIssueTarget(issue);
                              setIssueActionType('SEND_TO_REPAIR');
                              setIssueActionNote(`ส่งซ่อมจากเรื่องแจ้ง ${issue.reportNumber}`);
                              setIssueRepairShop('ศูนย์ซ่อมบำรุง / บริษัทผู้ผลิต');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition flex items-center gap-1 cursor-pointer"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>ส่งซ่อมต่อ</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPAIRS TABLE */}
      {activeTab === 'repairs' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหารหัสแล็บ, ชื่ออุปกรณ์, ร้านซ่อม, อาการชำรุด..."
                value={repairSearch}
                onChange={(e) => setRepairSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={repairStatusFilter}
                onChange={(e) => setRepairStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="UNDER_REPAIR">กำลังส่งซ่อม (Under Repair)</option>
                <option value="COMPLETED">ซ่อมเสร็จแล้ว (Completed)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">รหัส / อุปกรณ์</th>
                    <th className="py-3.5 px-4">อาการชำรุด</th>
                    <th className="py-3.5 px-4">ศูนย์ซ่อม / ร้าน</th>
                    <th className="py-3.5 px-4">วันที่ส่งซ่อม</th>
                    <th className="py-3.5 px-4">ค่าใช้จ่าย (฿)</th>
                    <th className="py-3.5 px-4">สถานะ</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <TableLoadingRow colSpan={7} message="กำลังโหลดข้อมูลการส่งซ่อม..." />
                  ) : filteredRepairs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        ไม่พบประวัติการส่งซ่อมตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredRepairs.map((log) => {
                      const isUnderRepair = log.status === 'UNDER_REPAIR';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {log.asset?.item?.name}
                            </div>
                            <div className="font-mono text-[11px] text-teal-700 dark:text-teal-400">
                              {log.asset?.assetCode}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-700 dark:text-slate-300">
                            {log.issue}
                            {log.technicianNote && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                หมายเหตุ: {log.technicianNote}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {log.repairShop || 'ช่างประจำคณะ'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            <div>{new Date(log.sentDate).toLocaleDateString('th-TH')}</div>
                            {log.completedDate && (
                              <div className="text-[10px] text-emerald-600">
                                เสร็จ: {new Date(log.completedDate).toLocaleDateString('th-TH')}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {Number(log.repairCost) > 0
                              ? `฿${Number(log.repairCost).toLocaleString('th-TH')}`
                              : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                                isUnderRepair
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {isUnderRepair ? 'กำลังซ่อมแซม' : 'ซ่อมเสร็จแล้ว'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isStaff && isUnderRepair ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCompleteRepairTarget(log);
                                  setCompleteForm({
                                    repairCost: log.repairCost || 0,
                                    repairShop: log.repairShop || '',
                                    technicianNote: 'ซ่อมแซมและทดสอบระบบการทำงานเรียบร้อย สมบูรณ์พร้อมใช้งาน คืนเข้าสต็อก',
                                  });
                                }}
                                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow transition cursor-pointer"
                              >
                                ตรวจรับคืนสต็อก
                              </button>
                            ) : (
                              <Link
                                href={`/asset/${encodeURIComponent(log.asset?.assetCode || '')}`}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition inline-flex items-center gap-1"
                              >
                                <span>ดูข้อมูล</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PREVENTIVE MAINTENANCE (PM) */}
      {activeTab === 'inspections' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหารหัสแล็บ, เลขครุภัณฑ์, ชื่อหุ่นจำลอง, สถานที่จัดเก็บ..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pmStatusFilter}
                onChange={(e) => setPmStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">สถานะ PM ทั้งหมด</option>
                <option value="OVERDUE">🔴 เกินกำหนดตรวจ (Overdue)</option>
                <option value="DUE_SOON">🟡 ใกล้ถึงกำหนดใน 7 วัน</option>
                <option value="OK">🟢 ตรวจแล้วตามรอบปกติ</option>
                <option value="NEVER">⚪ ยังไม่เคยตรวจ</option>
              </select>
            </div>
          </div>

          {/* Table of Assets */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">รหัส / หุ่นจำลอง & อุปกรณ์</th>
                    <th className="py-3.5 px-4">สถานที่จัดเก็บ</th>
                    <th className="py-3.5 px-4">ตรวจสภาพล่าสุด</th>
                    <th className="py-3.5 px-4">รอบตรวจถัดไป</th>
                    <th className="py-3.5 px-4">ความถี่รอบตรวจ</th>
                    <th className="py-3.5 px-4">สถานะ PM</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <TableLoadingRow colSpan={7} message="กำลังโหลดข้อมูลรายการตรวจเช็ก..." />
                  ) : filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        ไม่พบข้อมูลอุปกรณ์ตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => {
                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {asset.item?.name}
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-teal-700 dark:text-teal-400 font-semibold">{asset.assetCode}</span>
                              {asset.govAssetCode && (
                                <span className="text-slate-400">({asset.govAssetCode})</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {asset.location}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-500">
                            {asset.lastInspectedAt ? (
                              <div>
                                <div>{new Date(asset.lastInspectedAt).toLocaleDateString('th-TH')}</div>
                                {asset.lastInspection?.inspector && (
                                  <div className="text-[10px] text-slate-400">โดย {asset.lastInspection.inspector.name}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">- ยังไม่เคยตรวจ -</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px]">
                            {asset.nextInspectionDue ? (
                              <div
                                className={
                                  asset.pmStatus === 'OVERDUE'
                                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                                    : asset.pmStatus === 'DUE_SOON'
                                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                                    : 'text-slate-700 dark:text-slate-300'
                                }
                              >
                                {new Date(asset.nextInspectionDue).toLocaleDateString('th-TH')}
                                {asset.pmStatus === 'OVERDUE' && (
                                  <span className="block text-[10px] text-rose-500">เกินกำหนดแล้ว</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">- ไม่ระบุ -</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px]">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              ทุก {asset.inspectionIntervalDays || 30} วัน
                            </div>
                            {isStaff && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIntervalModalTarget(asset);
                                  setIntervalDaysInput(asset.inspectionIntervalDays || 30);
                                  setApplyToAllSameItem(false);
                                }}
                                className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-bold mt-0.5 cursor-pointer"
                              >
                                <SlidersHorizontal className="w-2.5 h-2.5" />
                                <span>ตั้งค่ารอบ</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                                asset.pmStatus === 'OVERDUE'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : asset.pmStatus === 'DUE_SOON'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : asset.pmStatus === 'OK'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {asset.pmStatus === 'OVERDUE'
                                ? '⚠️ เกินกำหนด'
                                : asset.pmStatus === 'DUE_SOON'
                                ? 'ใกล้ครบกำหนด'
                                : asset.pmStatus === 'OK'
                                ? 'ปกติ'
                                : 'ยังไม่เคยบันทึก'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isStaff ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setChecklistTarget(asset);
                                  setChecklistResult('PASS');
                                  setChecklistNotes('');
                                  setChecklistIntervalDays(asset.inspectionIntervalDays || 30);
                                  setChecklistChecks({
                                    visualCondition: true,
                                    powerAndBattery: true,
                                    functionSelfTest: true,
                                    cleanliness: true,
                                    accessoriesComplete: true,
                                  });
                                }}
                                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow transition cursor-pointer flex items-center gap-1 inline-flex"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>ตรวจสภาพ (Checklist)</span>
                              </button>
                            ) : (
                              <Link
                                href={`/asset/${encodeURIComponent(asset.assetCode)}`}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition inline-flex items-center gap-1"
                              >
                                <span>ดู QR</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXECUTIVE & AVAILABILITY ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Executive Role Notice */}
          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-950 dark:text-teal-200 text-xs flex items-start gap-3">
            <Info className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm">
                บทบาทผู้บริหาร: ติดตามข้อมูลแบบโปร่งใส (Informed - I)
              </div>
              <p className="leading-relaxed text-teal-800 dark:text-teal-300">
                ระบบเปิดให้ผู้บริหารและคณะกรรมการแล็บเข้าถึงตัวชี้วัดอัตราความพร้อมใช้งาน, ยอดค่าใช้จ่ายซ่อมแซม,
                และรายการอุปกรณ์ที่มีการชำรุดซ้ำซากได้ทันทีแบบเรียลไทม์ โดยไม่ต้องรอขั้นตอนเซ็นอนุมัติซ่อมรายชิ้น
                ทำให้นักวิทยาศาสตร์และเจ้าหน้าที่สามารถดำเนินการซ่อมบำรุงหุ่นจำลองให้พร้อมต่อการเรียนการสอนและการสอบ OSCE ของนิสิตได้ทันท่วงที
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Defect Assets */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    5 อันดับอุปกรณ์ที่ชำรุด / ส่งซ่อมบ่อยที่สุด
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ข้อมูลประกอบการพิจารณาจัดซื้อทดแทน หรือต่อสัญญาบำรุงรักษาพิเศษ
                  </p>
                </div>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>

              {topDefectAssets.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ยังไม่มีประวัติการส่งซ่อมอุปกรณ์
                </div>
              ) : (
                <div className="space-y-3">
                  {topDefectAssets.map((item, idx) => (
                    <div
                      key={item.code}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                          <div className="font-mono text-[10px] text-teal-600">{item.code}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-rose-600 dark:text-rose-400">
                          ส่งซ่อม {item.count} ครั้ง
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ค่าใช้จ่ายรวม ฿{item.totalCost.toLocaleString('th-TH')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PM Compliance Overview */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    ความครอบคลุมการตรวจเช็กตามรอบ (PM Compliance)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    อัตราการปฏิบัติตามมาตรฐานการบำรุงรักษาเชิงป้องกัน
                  </p>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-600 dark:text-slate-400">อุปกรณ์ที่ตรวจครบตามรอบ</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {assets.length > 0
                        ? (((assets.filter((a) => a.pmStatus === 'OK').length) / assets.length) * 100).toFixed(0)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{
                        width: `${assets.length > 0 ? ((assets.filter((a) => a.pmStatus === 'OK').length / assets.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                    <span className="text-[11px] text-rose-800 dark:text-rose-300 font-bold block">
                      เกินกำหนดตรวจ (Overdue)
                    </span>
                    <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                      {stats.overduePM} เครื่อง
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold block">
                      ใกล้ถึงกำหนด 7 วัน
                    </span>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                      {stats.dueSoonPM} เครื่อง
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700 dark:text-slate-300">💡 ข้อเสนอแนะเชิงยุทธศาสตร์:</div>
                  <div>• ให้ความสำคัญกับการตรวจเช็กหุ่นจำลอง High-fidelity ก่อนเริ่มภาคการศึกษา</div>
                  <div>• สรุปรายงานค่าใช้จ่ายซ่อมบำรุงประจำเดือนเพื่อเปรียบเทียบกับงบประมาณที่ตั้งไว้</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PREVIEW PHOTO */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-4">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[80vh] overflow-auto rounded-2xl">
              <img src={previewPhoto} alt="จุดชำรุด" className="w-full h-auto object-contain rounded-2xl" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EXECUTE ISSUE ACTION (Acknowledge / Send to Repair / Resolve) */}
      {actionIssueTarget && issueActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center font-bold">
                  {issueActionType === 'ACKNOWLEDGE' ? '✓' : issueActionType === 'RESOLVE' ? '✔' : '🔧'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {issueActionType === 'ACKNOWLEDGE'
                      ? 'รับเรื่องแจ้งปัญหา'
                      : issueActionType === 'RESOLVE'
                      ? 'บันทึกแก้ไขเสร็จสิ้น'
                      : 'ส่งซ่อมบำรุงต่อ'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">{actionIssueTarget.reportNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setActionIssueTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteIssueAction} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {actionIssueTarget.asset?.item?.name} ({actionIssueTarget.asset?.assetCode})
                </div>
                <div className="text-[11px] text-slate-500">
                  อาการที่ได้รับแจ้ง: {actionIssueTarget.issueDescription}
                </div>
              </div>

              {issueActionType === 'SEND_TO_REPAIR' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ศูนย์ซ่อม / ร้านค้าภายนอก
                    </label>
                    <input
                      type="text"
                      value={issueRepairShop}
                      onChange={(e) => setIssueRepairShop(e.target.value)}
                      placeholder="เช่น ศูนย์บริการ Laerdal, ช่างประจำคณะ..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ประมาณการค่าซ่อม (฿)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={issueRepairCost}
                      onChange={(e) => setIssueRepairCost(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  บันทึกการดำเนินการของเจ้าหน้าที่
                </label>
                <textarea
                  rows={2}
                  value={issueActionNote}
                  onChange={(e) => setIssueActionNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionIssueTarget(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={issueActionSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {issueActionSubmitting ? 'กำลังบันทึก...' : 'ยืนยันทำรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NEW REPAIR TICKET (MANUAL) */}
      {showNewRepairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">แจ้งส่งซ่อมอุปกรณ์ใหม่</h3>
                  <p className="text-[10px] text-slate-400">เปลี่ยนสถานะอุปกรณ์เป็น MAINTENANCE ทันที</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewRepairModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewRepair} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เลือกอุปกรณ์ / หุ่นจำลอง <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={newRepairForm.assetId}
                  onChange={(e) => setNewRepairForm((prev) => ({ ...prev, assetId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="">-- เลือกอุปกรณ์ --</option>
                  {assets
                    .filter((a) => a.status !== 'MAINTENANCE')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.assetCode}] {a.item?.name} - {a.location}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  อาการชำรุด / เหตุผลที่ส่งซ่อม <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={newRepairForm.issue}
                  onChange={(e) => setNewRepairForm((prev) => ({ ...prev, issue: e.target.value }))}
                  placeholder="ระบุอาการชำรุด เช่น มอเตอร์ไม่หมุน, แขนหุ่นหลวม, สายรั่ว..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ผู้รับซ่อม / ศูนย์ซ่อม
                </label>
                <input
                  type="text"
                  value={newRepairForm.repairShop}
                  onChange={(e) => setNewRepairForm((prev) => ({ ...prev, repairShop: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ประมาณการค่าซ่อม (฿)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newRepairForm.repairCost}
                  onChange={(e) => setNewRepairForm((prev) => ({ ...prev, repairCost: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRepairModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={newRepairSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {newRepairSubmitting ? 'กำลังบันทึก...' : 'บันทึกส่งซ่อม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: COMPLETE REPAIR (RETURN TO STOCK) */}
      {completeRepairTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">ตรวจรับคืนสต็อก (ซ่อมเสร็จ)</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{completeRepairTarget.asset?.assetCode}</p>
                </div>
              </div>
              <button
                onClick={() => setCompleteRepairTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteRepairSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {completeRepairTarget.asset?.item?.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  อาการชำรุดเดิม: {completeRepairTarget.issue}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ค่าใช้จ่ายจริงที่เกิดขึ้น (฿)
                </label>
                <input
                  type="number"
                  min={0}
                  value={completeForm.repairCost}
                  onChange={(e) => setCompleteForm((prev) => ({ ...prev, repairCost: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  บันทึกผลการซ่อม / หมายเหตุช่าง
                </label>
                <textarea
                  rows={2}
                  value={completeForm.technicianNote}
                  onChange={(e) => setCompleteForm((prev) => ({ ...prev, technicianNote: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompleteRepairTarget(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={completeSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {completeSubmitting ? 'กำลังบันทึก...' : 'ยืนยันคืนสต็อกพร้อมใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DIGITAL CHECKLIST INSPECTION (PM) */}
      {checklistTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">บันทึกตรวจสภาพประจำงวด (PM)</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {checklistTarget.assetCode} - {checklistTarget.item?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChecklistTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChecklistSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                  รายการตรวจเช็กมาตรฐาน (Checklist)
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'visualCondition', label: '1. สภาพภายนอก ไม่แตกร้าว/ผิวหุ่นสมบูรณ์' },
                    { key: 'powerAndBattery', label: '2. สายไฟ / แบตเตอรี่ / จุดเชื่อมต่อแน่นหนา' },
                    { key: 'functionSelfTest', label: '3. การทำงานพื้นฐาน / Self-test ผ่าน' },
                    { key: 'cleanliness', label: '4. ความสะอาด ปราศจากคราบสารคัดหลั่งจำลอง' },
                    { key: 'accessoriesComplete', label: '5. อุปกรณ์เสริม / อะแดปเตอร์ / ชิ้นส่วนครบ' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checklistChecks[item.key] || false}
                        onChange={(e) =>
                          setChecklistChecks((prev) => ({ ...prev, [item.key]: e.target.checked }))
                        }
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  สรุปผลการตรวจสภาพ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'PASS', label: 'ผ่าน (สมบูรณ์)' },
                    { val: 'PASS_WITH_NOTE', label: 'ผ่าน (มีข้อสังเกต)' },
                    { val: 'FAIL', label: 'ไม่ผ่าน (ส่งซ่อม)' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setChecklistResult(item.val as any)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                        checklistResult === item.val
                          ? 'bg-teal-50 border-teal-600 text-teal-800 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-400 ring-2 ring-teal-500/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุ / ข้อแนะนำของเจ้าหน้าที่
                </label>
                <textarea
                  rows={2}
                  value={checklistNotes}
                  onChange={(e) => setChecklistNotes(e.target.value)}
                  placeholder="บันทึกผลการตรวจสอบเพิ่มเติม (ถ้ามี)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  กำหนดรอบตรวจครั้งถัดไป (PM Interval)
                </label>
                <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                  {[
                    { days: 15, label: 'ทุก 15 วัน' },
                    { days: 30, label: 'ทุก 30 วัน (1 ด.)' },
                    { days: 60, label: 'ทุก 60 วัน (2 ด.)' },
                    { days: 90, label: 'ทุก 90 วัน (3 ด.)' },
                    { days: 180, label: 'ทุก 180 วัน (6 ด.)' },
                    { days: 365, label: 'ทุก 1 ปี' },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setChecklistIntervalDays(p.days)}
                      className={`p-1.5 rounded-lg border text-center font-bold text-[10px] transition cursor-pointer ${
                        checklistIntervalDays === p.days
                          ? 'bg-teal-50 border-teal-600 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">หรือระบุ:</span>
                  <input
                    type="number"
                    min={1}
                    value={checklistIntervalDays}
                    onChange={(e) => setChecklistIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-bold text-xs"
                  />
                  <span className="text-[10px] text-slate-500">วัน</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChecklistTarget(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={checklistSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {checklistSubmitting ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: QUICK INTERVAL CONFIGURATION */}
      {intervalModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">ตั้งค่ารอบความถี่การตรวจ (PM)</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {intervalModalTarget.assetCode} - {intervalModalTarget.item?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIntervalModalTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInterval} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl space-y-1 text-slate-700 dark:text-slate-300">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {intervalModalTarget.item?.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  รอบตรวจปัจจุบัน: <b className="text-teal-600">ทุก {intervalModalTarget.inspectionIntervalDays || 30} วัน</b>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                  เลือกรอบการตรวจเช็กตามมาตรฐาน
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { days: 15, label: 'ทุก 15 วัน', desc: 'หุ่นวิกฤต/CPR ใช้สอนหนัก' },
                    { days: 30, label: 'ทุก 30 วัน (1 เดือน)', desc: 'มาตรฐานแนะนำสำหรับหุ่นทั่วไป' },
                    { days: 60, label: 'ทุก 60 วัน (2 เดือน)', desc: 'อุปกรณ์ฝึกทักษะเฉพาะทาง' },
                    { days: 90, label: 'ทุก 90 วัน (3 เดือน)', desc: 'เตียงคนไข้, เสาน้ำเกลือ, มอนิเตอร์' },
                    { days: 180, label: 'ทุก 180 วัน (6 เดือน)', desc: 'ตรวจรายภาคการศึกษา' },
                    { days: 365, label: 'ทุก 365 วัน (1 ปี)', desc: 'ตรวจเช็กใหญ่ประจำปี' },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setIntervalDaysInput(p.days)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        intervalDaysInput === p.days
                          ? 'bg-teal-50 border-teal-600 text-teal-900 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-400 ring-2 ring-teal-500/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-500 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{p.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">หรือระบุจำนวนวันเอง:</span>
                <input
                  type="number"
                  min={1}
                  value={intervalDaysInput}
                  onChange={(e) => setIntervalDaysInput(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center font-bold text-xs"
                />
                <span className="text-xs text-slate-500 font-bold">วัน</span>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAllSameItem}
                  onChange={(e) => setApplyToAllSameItem(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                />
                <div className="text-[11px] text-teal-950 dark:text-teal-200 leading-snug">
                  <b>ตั้งค่านี้กับหุ่น/อุปกรณ์ชนิดนี้ทุกชิ้นในแล็บ</b>
                  <div className="text-teal-800/80 dark:text-teal-400 text-[10px]">
                    (อัปเดต {intervalModalTarget.item?.name} ทุกหมายเลขเครื่องให้ใช้รอบตรวจเดียวกัน)
                  </div>
                </div>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIntervalModalTarget(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={intervalSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {intervalSubmitting ? 'กำลังบันทึก...' : 'บันทึกรอบตรวจ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
