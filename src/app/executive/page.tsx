'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Boxes,
  ShieldCheck,
  Building2,
  Wind,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Search,
  Filter,
  Eye,
  ChevronRight,
  RefreshCw,
  Coins,
  Package,
  Layers,
  GraduationCap,
  Calendar,
  X,
  MapPin,
  Tag,
  Info,
  ExternalLink,
  Zap,
  BrainCircuit,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  FileText,
  FlaskConical,
  Award,
  PieChart as PieIcon,
  Activity,
  BarChart3,
  SlidersHorizontal,
  Printer,
  Download,
  Wallet,
  BookOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatUserName, getRoleLabel } from '@/lib/user-utils';
import { formatImageUrl } from '@/lib/image-helper';
import { ORG_CONFIG } from '@/lib/constants/organization';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function ExecutiveDashboardPage() {
  const { currentUser, isExecutive, isAdmin } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Focus / Boardroom Presentation Mode
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BUDGET' | 'ENERGY' | 'ASSETS' | 'CONSUMABLES'>('OVERVIEW');

  // AI Advisor Interactive Inquiry
  const [selectedInquiryId, setSelectedInquiryId] = useState<string>('INSIGHT-CAPITAL');
  const [copySuccess, setCopySuccess] = useState(false);

  // Equipment Drill-down search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'DAMAGED'>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [modalImageError, setModalImageError] = useState(false);

  useEffect(() => {
    setModalImageError(false);
  }, [selectedAsset]);

  // Pagination for equipment drill-down table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset page when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Month & Year Filter for Executive Analytics
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const THAI_MONTHS = [
    { value: 0, label: 'รวมทุกเดือน (ทั้งปี)' },
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' },
  ];

  const years = [2024, 2025, 2026, 2027, 2028];
  const hasInitializedMonthRef = useRef(false);
  const skipNextFetchRef = useRef(false);

  const fetchStats = async (manual = false, m = selectedMonth, y = selectedYear, auto = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(
        `/api/executive/stats?month=${m}&year=${y}${auto ? '&auto=1' : ''}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (
          auto &&
          typeof json.currentMonth === 'number' &&
          typeof json.currentYear === 'number' &&
          (json.currentMonth !== m || json.currentYear !== y)
        ) {
          skipNextFetchRef.current = true;
          setSelectedMonth(json.currentMonth);
          setSelectedYear(json.currentYear);
        }
      }
    } catch (e) {
      console.error('Failed to load executive stats', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    const isInitial = !hasInitializedMonthRef.current;
    hasInitializedMonthRef.current = true;
    fetchStats(false, selectedMonth, selectedYear, isInitial);
  }, [selectedMonth, selectedYear]);

  const kpis = data?.kpis;
  const equipmentList = data?.equipmentList || [];
  const categoryDistribution = kpis?.categoryDistribution || [];
  const labUtilization = kpis?.labUtilizationBreakdown || [];
  const topDemand = kpis?.topDemandEquipment || [];
  const monthlyTrends = kpis?.monthlyTrends || [];
  const courseBudget = kpis?.courseBudgetAnalytics || null;
  const aiInsights = kpis?.aiStrategicInsights || [];
  const nearExpiryItems = kpis?.nearExpiryItems || [];

  const peakMonthSummary = useMemo(() => {
    if (!monthlyTrends.length) return null;
    const sorted = [...monthlyTrends].sort((a: any, b: any) => (b.totalAcHours || 0) - (a.totalAcHours || 0));
    const peak = sorted[0];
    if (!peak || peak.totalAcHours <= 0) return null;
    const totalYearHours = Math.round(monthlyTrends.reduce((s: number, m: any) => s + (m.totalAcHours || 0), 0) * 10) / 10;
    const totalAcademicYear = Math.round(monthlyTrends.reduce((s: number, m: any) => s + (m.academicHours || 0), 0) * 10) / 10;
    return { peak, totalYearHours, totalAcademicYear };
  }, [monthlyTrends]);

  const handleExportExecutiveExcel = () => {
    const periodLabel = `${THAI_MONTHS.find((m) => m.value === selectedMonth)?.label || ''} พ.ศ. ${selectedYear + 543}`;
    const summaryRows = [
      { หัวข้อตัวชี้วัด: 'ช่วงเวลาที่รายงาน', ค่าที่ได้: periodLabel, หน่วย: '-' },
      { หัวข้อตัวชี้วัด: 'มูลค่าครุภัณฑ์รวม', ค่าที่ได้: kpis?.totalValuation || 0, หน่วย: 'บาท' },
      { หัวข้อตัวชี้วัด: 'จำนวนครุภัณฑ์ทั้งหมด', ค่าที่ได้: kpis?.totalAssetsCount || 0, หน่วย: 'ชิ้น' },
      { หัวข้อตัวชี้วัด: 'อัตราพร้อมใช้งาน', ค่าที่ได้: kpis?.readinessRate || 100, หน่วย: '%' },
      { หัวข้อตัวชี้วัด: 'ชั่วโมงเปิดแอร์ช่วงเวลาที่เลือก', ค่าที่ได้: kpis?.totalAcHoursMonth || 0, หน่วย: 'ชม.' },
      { หัวข้อตัวชี้วัด: 'ชั่วโมงเปิดแอร์เพื่อถนอมรักษาอุปกรณ์', ค่าที่ได้: kpis?.maintenanceAcHours || 0, หน่วย: 'ชม.' },
      { หัวข้อตัวชี้วัด: 'ชั่วโมงฝึกทักษะของนิสิต', ค่าที่ได้: kpis?.totalPracticeHours || 0, หน่วย: 'ชม.' },
      { หัวข้อตัวชี้วัด: 'มูลค่าเวชภัณฑ์คงคลังรวม', ค่าที่ได้: Math.round(kpis?.totalConsumablesValuation || 0), หน่วย: 'บาท' },
      { หัวข้อตัวชี้วัด: 'งบประมาณรายวิชาที่เปิดสอนรวม', ค่าที่ได้: courseBudget?.totalAllocatedBudget || 0, หน่วย: 'บาท' },
      { หัวข้อตัวชี้วัด: 'ยอดเบิกจ่ายเวชภัณฑ์จริงรวม', ค่าที่ได้: courseBudget?.totalSpentAmount || 0, หน่วย: 'บาท' },
    ];

    const labRows = labUtilization.map((r: any) => ({
      'รหัสห้อง': r.roomCode,
      'ห้องปฏิบัติการ': r.roomName,
      'การสอนตามตารางวิชา (ชม.)': r.teachingHours,
      'นิสิตจองฝึกอิสระ (ชม.)': r.studentPracticeHours,
      'สอบประเมิน/OSCE (ชม.)': r.examHours,
      'รวมใช้งานทางวิชาการ (ชม.)': r.totalHours,
    }));

    const trendRows = monthlyTrends.map((m: any) => ({
      'เดือน': m.label,
      'การสอน (ชม.)': m.teachingHours,
      'นิสิตฝึกอิสระ (ชม.)': m.studentPracticeHours,
      'สอบ OSCE (ชม.)': m.examHours,
      'ถนอมรักษาอุปกรณ์ (ชม.)': m.preservationHours,
      'ชั่วโมงแอร์รวม (ชม.)': m.totalAcHours,
    }));

    const budgetRows = (courseBudget?.courses || []).map((c: any) => ({
      'รหัสวิชา': c.code,
      'ชื่อรายวิชา': c.name,
      'อาจารย์ผู้รับผิดชอบ': c.instructorName,
      'จำนวนนิสิต (คน)': c.studentCount,
      'งบจัดสรร (บาท)': c.allocatedBudget,
      'เบิกใช้จริง (บาท)': c.spentAmount,
      'คงเหลือ (บาท)': c.remainingBudget,
      'อัตราใช้งบ (%)': c.utilizationPercent,
      'ต้นทุนต่อนิสิต (บาท/คน)': c.costPerStudent,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'สรุปผู้บริหาร');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(labRows), 'ชั่วโมงห้องปฏิบัติการ');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trendRows), 'แนวโน้มรายเดือน');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(budgetRows), 'งบประมาณรายวิชา');
    XLSX.writeFile(wb, `Executive_Dashboard_${selectedYear + 543}_M${selectedMonth}.xlsx`);
  };

  const handlePrintExecutiveSummary = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const labUtilizationSummary = useMemo(() => {
    const teachingTotal = Math.round(labUtilization.reduce((s: number, r: any) => s + (r.teachingHours || 0), 0) * 10) / 10;
    const practiceTotal = Math.round(labUtilization.reduce((s: number, r: any) => s + (r.studentPracticeHours || 0), 0) * 10) / 10;
    const examTotal = Math.round(labUtilization.reduce((s: number, r: any) => s + (r.examHours || 0), 0) * 10) / 10;
    const grandTotal = Math.round((teachingTotal + practiceTotal + examTotal) * 10) / 10;
    const activeUsageRooms = labUtilization.filter((r: any) => (r.totalHours || 0) > 0);
    const sortedByTotal = [...activeUsageRooms].sort((a: any, b: any) => (b.totalHours || 0) - (a.totalHours || 0));
    const practiceRooms = labUtilization.filter((r: any) => (r.studentPracticeHours || 0) > 0);
    return {
      teachingTotal,
      practiceTotal,
      examTotal,
      grandTotal,
      topRoom: sortedByTotal[0] || null,
      secondRoom: sortedByTotal[1] || null,
      practiceRooms,
    };
  }, [labUtilization]);

  // Active AI Insight
  const currentInsight = useMemo(() => {
    return aiInsights.find((i: any) => i.id === selectedInquiryId) || aiInsights[0] || null;
  }, [aiInsights, selectedInquiryId]);

  const handleCopyInsight = () => {
    if (!currentInsight) return;
    const textToCopy = `[บทวิเคราะห์ผู้บริหาร: ${currentInsight.topic}]\nข้อค้นพบ: ${currentInsight.summary}\nข้อเสนอแนะเชิงกลยุทธ์: ${currentInsight.recommendation}`;
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Filtered equipment for drill-down table
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item: any) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.govAssetCode && item.govAssetCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.roomName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'AVAILABLE') return item.status === 'AVAILABLE';
      if (statusFilter === 'BORROWED') return item.status === 'BORROWED';
      if (statusFilter === 'MAINTENANCE') return item.status === 'MAINTENANCE';
      if (statusFilter === 'DAMAGED') return item.condition === 'DAMAGED';

      return true;
    });
  }, [equipmentList, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEquipment.length / (pageSize || 20)));

  const paginatedEquipment = useMemo(() => {
    if (pageSize >= 9999) return filteredEquipment;
    const start = (currentPage - 1) * pageSize;
    return filteredEquipment.slice(start, start + pageSize);
  }, [filteredEquipment, currentPage, pageSize]);

  const formatDateThai = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  // Colors for category donut chart
  const DONUT_COLORS = ['#0d9488', '#0284c7', '#8b5cf6', '#f59e0b', '#3b82f6', '#10b981', '#ec4899'];

  if (loading) {
    return (
      <LoadingSpinner
        message="กำลังเชื่อมต่อฐานข้อมูลภาพรวมเชิงกลยุทธ์..."
        submessage="รวบรวมดัชนีชี้วัดครุภัณฑ์ พื้นที่ห้องแล็บ และการใช้พลังงานสำหรับผู้บริหาร"
      />
    );
  }

  // Permission Guard
  if (!isExecutive && !isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          สงวนสิทธิ์เฉพาะผู้บริหารระดับสูง
        </h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
          หน้านี้เปิดให้เฉพาะคณบดี รองคณบดี และผู้บริหารคณะพยาบาลศาสตร์ เพื่อกำกับดูแลเชิงนโยบายและงบประมาณ
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
    <div className={`space-y-6 pb-16 transition-all duration-300 ${isFocusMode ? 'max-w-full px-2' : ''}`}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: #ffffff !important; color: #0f172a !important; }
          nav, aside, header { display: none !important; }
        }
      `}</style>
      <div className="space-y-6 print:hidden">
      {/* ---------------------------------------------------- */}
      {/* 1. EXECUTIVE COCKPIT 360° BANNER HEADER              */}
      {/* ---------------------------------------------------- */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-50/70 via-white to-fuchsia-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-purple-950/40 rounded-3xl p-6 sm:p-7 shadow-lg shadow-purple-900/5 dark:shadow-black/20 border border-purple-200/80 dark:border-purple-900/60 transition-all">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-purple-400/15 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-fuchsia-400/15 dark:bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-100/80 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200/90 dark:border-purple-800/80 text-xs font-bold uppercase tracking-wide mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
              <span>Executive Cockpit 360° | คณะพยาบาลศาสตร์</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-200/70 dark:bg-purple-800/50 text-purple-900 dark:text-purple-200 font-black">
                6 กราฟตัดสินใจเชิงยุทธศาสตร์
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span>แดชบอร์ดผู้บริหารและการวิเคราะห์เชิงกลยุทธ์</span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              ศูนย์การเรียนรู้ปฏิบัติการทางการพยาบาลเสมือนจริง • ติดตามสุขภาวะสินทรัพย์ งบประมาณรายวิชา ความคุ้มค่าพื้นที่ และพลังงานสีเขียว (Green Lab)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Export Excel & Print Board Summary */}
            <button
              type="button"
              onClick={handleExportExecutiveExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 shadow-xs transition cursor-pointer"
              title="ส่งออกไฟล์สรุปสำหรับผู้บริหารเป็น Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrintExecutiveSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800/60 shadow-xs transition cursor-pointer"
              title="พิมพ์สรุป 1 หน้า A4 สำหรับแนบวาระการประชุมบอร์ด"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">พิมพ์รายงานประชุม</span>
            </button>

            {/* Focus / Boardroom Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-900 dark:text-purple-200 text-xs font-bold border border-purple-200 dark:border-purple-800/60 shadow-xs transition cursor-pointer"
              title={isFocusMode ? 'ออกจากโหมดนำเสนอ' : 'เข้าสู่โหมดนำเสนอสำหรับที่ประชุมบอร์ด'}
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <Maximize2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
              <span className="hidden sm:inline">{isFocusMode ? 'ย่อหน้าต่าง' : 'โหมดนำเสนอ'}</span>
            </button>

            {/* Month & Year Filter Selector */}
            <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-xs">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-slate-800 dark:text-slate-100 text-xs font-bold outline-none cursor-pointer [&>option]:text-slate-900"
              >
                {THAI_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">/</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-slate-800 dark:text-slate-100 text-xs font-bold outline-none cursor-pointer [&>option]:text-slate-900"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden lg:block bg-white/90 dark:bg-slate-800/90 px-3.5 py-1.5 rounded-2xl border border-purple-200 dark:border-purple-800/60 text-right shadow-xs">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">ผู้เข้าใช้งาน</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {currentUser ? `${formatUserName(currentUser) || currentUser.name} (${getRoleLabel(currentUser.role)})` : 'กำลังโหลด...'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-900 dark:text-purple-200 transition border border-purple-200 dark:border-purple-800/60 cursor-pointer disabled:opacity-50 shadow-xs"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. ZERO-PII AI EXECUTIVE ADVISOR COCKPIT             */}
      {/* ---------------------------------------------------- */}
      <div className="bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/60 dark:from-slate-900 dark:via-purple-950/50 dark:to-slate-900 rounded-3xl border border-purple-200/80 dark:border-purple-500/30 p-5 sm:p-6 shadow-xl shadow-purple-900/5 dark:shadow-black/20 text-slate-900 dark:text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200 dark:border-purple-800/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-400/30">
              <BrainCircuit className="w-5 h-5 text-purple-700 dark:text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                  AI Executive Strategic Advisor (Zero-PII Insight Cockpit)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-400/30">
                  Real-time Synthesis
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-purple-200/80">
                ประมวลผลดัชนีชี้วัดเชิงยุทธศาสตร์เพื่อสนับสนุนการตัดสินใจของผู้บริหาร (ไม่ส่งข้อมูลส่วนบุคคลออกนอกระบบ 100%)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyInsight}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-teal-600/30 dark:hover:bg-teal-600/50 text-purple-800 dark:text-cyan-200 text-xs font-semibold border border-purple-200 dark:border-teal-400/30 transition cursor-pointer"
            title="คัดลอกข้อเสนอแนะเชิงกลยุทธ์สำหรับนำเสนอที่ประชุม"
          >
            {copySuccess ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copySuccess ? 'คัดลอกเรียบร้อย' : 'คัดลอกสรุปสำหรับที่ประชุม'}</span>
          </button>
        </div>

        {/* Interactive Inquiry Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">มิติการวิเคราะห์:</span>
          {aiInsights.map((insight: any) => {
            const isSelected = selectedInquiryId === insight.id;
            return (
              <button
                key={insight.id}
                type="button"
                onClick={() => setSelectedInquiryId(insight.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md font-black dark:bg-teal-500 dark:text-slate-950 dark:border-teal-300'
                    : 'bg-white dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                }`}
              >
                <span>{insight.topic.split('(')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Insight Detail Card */}
        {currentInsight && (
          <div className="bg-purple-50/50 dark:bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-purple-200/80 dark:border-teal-500/20 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-purple-900 dark:text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
                {currentInsight.topic}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  currentInsight.priority === 'HIGH'
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40'
                    : currentInsight.priority === 'MEDIUM'
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                }`}
              >
                {currentInsight.priority === 'HIGH' ? 'ประเด็นเร่งด่วน' : 'สถานะปกติ'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              <strong>ข้อค้นพบเชิงสถิติ:</strong> {currentInsight.summary}
            </p>

            <div className="pt-2 border-t border-purple-200 dark:border-slate-800 flex items-start gap-2 text-xs text-purple-900 dark:text-teal-300/90 leading-relaxed">
              <div className="w-5 h-5 rounded-md bg-purple-200 dark:bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5 text-purple-700 dark:text-teal-300 font-bold">
                💡
              </div>
              <div>
                <strong className="text-purple-950 dark:text-teal-200">ข้อเสนอแนะเชิงกลยุทธ์ (Strategic Action):</strong>{' '}
                {currentInsight.recommendation}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. FOUR STRATEGIC KPI CARDS (EDWARD TUFTE STANDARD)   */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Capital Assets & Readiness */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">มูลค่าครุภัณฑ์รวม</span>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono tabular-nums">
            ฿{((kpis?.totalValuation || 0) / 1000000).toFixed(2)}M
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">อัตราพร้อมใช้งาน</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              {kpis?.readinessRate || 100}% (เกณฑ์ดีเยี่ยม)
            </span>
          </div>
        </div>

        {/* KPI 2: Asset Health Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะครุภัณฑ์ในระบบ</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono tabular-nums">
            {kpis?.totalAssetsCount || 0} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">พร้อมใช้ {kpis?.availableCount || 0}</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">ถูกยืม {kpis?.borrowedCount || 0}</span>
            <span className="text-rose-600 dark:text-rose-400 font-bold">ส่งซ่อม {kpis?.maintenanceCount || 0}</span>
          </div>
        </div>

        {/* KPI 3: Energy & AC Monthly Hours */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ชั่วโมงเปิดแอร์ ({THAI_MONTHS.find((m) => m.value === selectedMonth)?.label})
            </span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Wind className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-800 dark:text-cyan-300 mt-2 font-mono tabular-nums">
            {kpis?.totalAcHoursMonth || 0} <span className="text-xs font-normal text-slate-500">ชม.</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">ถนอมรักษาหุ่น AI/Sim</span>
            <span className="font-bold text-cyan-700 dark:text-cyan-400">
              {kpis?.maintenanceAcHours || 0} ชม. (
              {kpis?.totalAcHoursMonth > 0
                ? Math.round(((kpis?.maintenanceAcHours || 0) / kpis.totalAcHoursMonth) * 100)
                : 0}
              %)
            </span>
          </div>
        </div>

        {/* KPI 4: Student Clinical Engagement (นิสิต) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชั่วโมงฝึกของนิสิต</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-800 dark:text-indigo-400 mt-2 font-mono tabular-nums">
            {kpis?.totalPracticeHours || 0} <span className="text-xs font-normal text-slate-500">ชม.-คน</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">ห้องแล็บเปิดให้บริการ</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-400">
              {kpis?.totalRoomsCount || 0} ห้องปฏิบัติการ
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. MULTI-TIER ANALYTIC TABS NAVIGATION               */}
      {/* ---------------------------------------------------- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { key: 'OVERVIEW', label: 'ภาพรวม 6 กราฟตัดสินใจ', icon: BarChart3 },
          { key: 'BUDGET', label: 'งบประมาณ & ต้นทุนรายวิชา', icon: Wallet },
          { key: 'ENERGY', label: 'กรีนแล็บ & การใช้พลังงาน', icon: Wind },
          { key: 'ASSETS', label: 'สำรวจครุภัณฑ์เชิงลึก', icon: Boxes },
          { key: 'CONSUMABLES', label: 'คลังเวชภัณฑ์ & ความเสี่ยง', icon: FlaskConical },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                isActive
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. TAB CONTENT: OVERVIEW (5 STRATEGIC CHARTS)        */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* ROW 1: CAPITAL ALLOCATION DONUT & ASSET READINESS MATRIX */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* CHART 1: Donut Chart - Asset Valuation by Category */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        1. สัดส่วนมูลค่าการลงทุนในครุภัณฑ์แยกตามหมวดหมู่
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      พอร์ตสินทรัพย์รวม ฿{((kpis?.totalValuation || 0) / 1000000).toFixed(2)}M ({kpis?.totalAssetsCount || 0} ชิ้น)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[11px] font-bold border border-teal-200 dark:border-teal-800">
                    Donut Chart
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center my-4">
                  {/* Recharts Pie Donut */}
                  <div className="md:col-span-6 h-64 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryDistribution.length > 0 ? categoryDistribution : [{ name: 'ครุภัณฑ์', value: 100 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'มูลค่า']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] font-bold text-slate-400">มูลค่ารวม</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white font-mono tabular-nums">
                        ฿{((kpis?.totalValuation || 0) / 1000000).toFixed(2)}M
                      </span>
                    </div>
                  </div>

                  {/* Breakdown List */}
                  <div className="md:col-span-6 space-y-2 text-xs">
                    {categoryDistribution.slice(0, 5).map((cat: any, idx: number) => (
                      <div
                        key={cat.name}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span
                            className="w-3 h-3 rounded-md shrink-0"
                            style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                          ></span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0">
                          ฿{(cat.value / 1000000).toFixed(2)}M ({cat.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strategic Decision Insight (Dynamic) */}
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-500/30 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <div>
                  <strong className="font-bold text-teal-950 dark:text-teal-100 block mb-0.5">
                    ข้อเสนอแนะเชิงกลยุทธ์ (Strategic Insight):
                  </strong>
                  {categoryDistribution[0] ? (
                    <>
                      หมวด <strong>{categoryDistribution[0].name}</strong> มีมูลค่าลงทุนสูงสุดในพอร์ตสินทรัพย์ (฿{(categoryDistribution[0].value / 1000000).toFixed(2)}M หรือ <strong>{categoryDistribution[0].percentage}%</strong> ของทั้งหมด
                      {categoryDistribution[1] ? ` รองลงมาคือ ${categoryDistribution[1].name} ${categoryDistribution[1].percentage}%` : ''}
                      ) จึงควรให้ความสำคัญกับแผนบำรุงรักษาเชิงป้องกัน (Preventive Maintenance) และการควบคุมอุณหภูมิห้องแล็บเป็นพิเศษ
                    </>
                  ) : (
                    'ยังไม่มีข้อมูลมูลค่าครุภัณฑ์แยกหมวดหมู่ในระบบ'
                  )}
                </div>
              </div>
            </div>

            {/* CHART 2: Readiness Breakdown Matrix */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        2. ดัชนีความพร้อมใช้งานครุภัณฑ์
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ติดตามสุขภาวะครุภัณฑ์เพื่อวางแผนจัดซื้อทดแทน
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                    Readiness KPI
                  </span>
                </div>

                <div className="my-5 space-y-4">
                  {/* Multi-segment Gradient Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-700 dark:text-slate-300">ความพร้อมใช้งานรวม (Target &gt; 90%)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm font-black">
                        {kpis?.readinessRate || 100}%
                      </span>
                    </div>
                    <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-300 dark:border-slate-700">
                      <div
                        style={{
                          width: `${
                            kpis?.totalAssetsCount > 0
                              ? ((kpis.availableCount || 0) / kpis.totalAssetsCount) * 100
                              : 100
                          }%`,
                        }}
                        className="bg-gradient-to-r from-teal-500 to-emerald-400"
                        title="พร้อมใช้งาน"
                      ></div>
                      <div
                        style={{
                          width: `${
                            kpis?.totalAssetsCount > 0
                              ? ((kpis.borrowedCount || 0) / kpis.totalAssetsCount) * 100
                              : 0
                          }%`,
                        }}
                        className="bg-amber-400"
                        title="กำลังถูกยืม"
                      ></div>
                      <div
                        style={{
                          width: `${
                            kpis?.totalAssetsCount > 0
                              ? ((kpis.maintenanceCount || 0) / kpis.totalAssetsCount) * 100
                              : 0
                          }%`,
                        }}
                        className="bg-rose-500"
                        title="ส่งซ่อมบำรุง"
                      ></div>
                    </div>
                  </div>

                  {/* Health Breakdown Cards */}
                  <div className="space-y-2.5 pt-1 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">พร้อมใช้งานทันที (Available)</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {kpis?.availableCount || 0} ชิ้น ({kpis?.totalAssetsCount > 0 ? Math.round(((kpis.availableCount || 0) / kpis.totalAssetsCount) * 1000) / 10 : 100}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">อยู่ระหว่างการยืมสอน/สอบ (In Use)</span>
                      </div>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {kpis?.borrowedCount || 0} ชิ้น ({kpis?.totalAssetsCount > 0 ? Math.round(((kpis.borrowedCount || 0) / kpis.totalAssetsCount) * 1000) / 10 : 0}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">ส่งซ่อมบำรุง / รออะไหล่ (Repair)</span>
                      </div>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {kpis?.maintenanceCount || 0} ชิ้น ({kpis?.totalAssetsCount > 0 ? Math.round(((kpis.maintenanceCount || 0) / kpis.totalAssetsCount) * 1000) / 10 : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategic Decision Insight (Dynamic) */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <div>
                  <strong className="font-bold text-emerald-950 dark:text-emerald-100 block mb-0.5">
                    ข้อเสนอแนะเชิงกลยุทธ์ (Strategic Insight):
                  </strong>
                  อัตราความพร้อมใช้งานของครุภัณฑ์อยู่ที่ <strong>{kpis?.readinessRate || 100}%</strong> ({(kpis?.readinessRate || 100) >= 90 ? 'สูงกว่าเกณฑ์มาตรฐาน 90%' : 'ต่ำกว่าเกณฑ์มาตรฐาน 90%'}) โดยมีครุภัณฑ์พร้อมใช้ {kpis?.availableCount || 0} ชิ้น กำลังถูกยืม {kpis?.borrowedCount || 0} ชิ้น
                  {(kpis?.maintenanceCount || 0) > 0
                    ? ` และส่งซ่อมบำรุง ${kpis.maintenanceCount} ชิ้น แนะนำติดตามความคืบหน้างานซ่อมเพื่อไม่ให้กระทบการฝึกปฏิบัติของนิสิต`
                    : ' และไม่มีรายการค้างส่งซ่อม พร้อมรองรับตารางการฝึกหัตถการของนิสิตเต็มประสิทธิภาพ'}
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: LAB SPACE UTILIZATION BY PURPOSE (3RD CHART) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    3. สถิติชั่วโมงการใช้งานห้องปฏิบัติการ {labUtilization.length || 10} ห้อง แยกตามวัตถุประสงค์ (คัดแยกห้องเก็บของออกแล้ว)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ชั่วโมงใช้งานจริงจากการเรียนการสอน นิสิตฝึกทักษะ และสอบ OSCE ({THAI_MONTHS.find((m) => m.value === selectedMonth)?.label} พ.ศ. {selectedYear + 543})
                </p>
              </div>

              {/* Custom Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">การสอนตามตารางวิชา</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">นิสิตจองฝึกอิสระ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">การสอบประเมิน/OSCE</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={labUtilization} margin={{ top: 10, right: 10, left: -20, bottom: 25 }} barCategoryGap="24%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" ชม." allowDecimals={false} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1">
                          <div className="font-bold border-b border-slate-700 pb-1 mb-1.5 text-slate-200">
                            {d.roomName}
                          </div>
                          <div className="flex items-center justify-between gap-4 text-blue-300">
                            <span>การสอนตามตารางวิชา:</span>
                            <span className="font-mono font-bold">{d.teachingHours} ชม.</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-emerald-300">
                            <span>นิสิตจองฝึกอิสระ:</span>
                            <span className="font-mono font-bold">{d.studentPracticeHours} ชม.</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-amber-300">
                            <span>การสอบประเมิน/OSCE:</span>
                            <span className="font-mono font-bold">{d.examHours} ชม.</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 font-bold text-teal-300">
                            <span>รวมทั้งสิ้น:</span>
                            <span className="font-mono font-black">{d.totalHours} ชม.</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="teachingHours" name="การสอนตามตารางวิชา" stackId="purpose" fill="#3b82f6" maxBarSize={46} />
                  <Bar dataKey="studentPracticeHours" name="นิสิตจองฝึกอิสระ" stackId="purpose" fill="#10b981" maxBarSize={46} />
                  <Bar dataKey="examHours" name="การสอบ OSCE" stackId="purpose" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={46} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Room Utilization Breakdown Table (ตารางตัวเลขชั่วโมงจริงรายห้อง) */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">รหัสห้อง</th>
                    <th className="p-3">ห้องปฏิบัติการ</th>
                    <th className="p-3 text-right text-blue-700 dark:text-blue-400">การสอนตามตารางวิชา (ชม.)</th>
                    <th className="p-3 text-right text-emerald-700 dark:text-emerald-400">นิสิตจองฝึกอิสระ (ชม.)</th>
                    <th className="p-3 text-right text-amber-700 dark:text-amber-400">สอบประเมิน/OSCE (ชม.)</th>
                    <th className="p-3 text-right">รวมทั้งหมด (ชม.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {labUtilization.map((r: any) => (
                    <tr key={r.roomId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-2.5 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                        {r.roomCode}
                      </td>
                      <td className="p-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {r.shortName}
                        <span className="hidden md:inline text-[11px] text-slate-400 ml-1.5 font-normal">
                          ({r.roomName})
                        </span>
                      </td>
                      <td className="p-2.5 px-3 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                        {r.teachingHours > 0 ? r.teachingHours.toFixed(1) : '-'}
                      </td>
                      <td className="p-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                        {r.studentPracticeHours > 0 ? r.studentPracticeHours.toFixed(1) : '-'}
                      </td>
                      <td className="p-2.5 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                        {r.examHours > 0 ? r.examHours.toFixed(1) : '-'}
                      </td>
                      <td className="p-2.5 px-3 text-right font-mono tabular-nums font-black text-slate-900 dark:text-white">
                        {r.totalHours.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-indigo-50/60 dark:bg-indigo-950/30 border-t-2 border-indigo-200/80 dark:border-indigo-800/60 font-bold">
                  <tr>
                    <td colSpan={2} className="p-3 text-slate-800 dark:text-slate-100">
                      รวมชั่วโมงใช้งานทางวิชาการทั้งหมด ({labUtilization.length} ห้อง)
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-blue-700 dark:text-blue-300">
                      {labUtilizationSummary.teachingTotal.toFixed(1)}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                      {labUtilizationSummary.practiceTotal.toFixed(1)}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-300">
                      {labUtilizationSummary.examTotal.toFixed(1)}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-black text-indigo-800 dark:text-indigo-200">
                      {labUtilizationSummary.grandTotal.toFixed(1)} ชม.
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Strategic Decision Insight (Dynamic) */}
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <div>
                <strong className="font-bold text-indigo-950 dark:text-indigo-100 block mb-0.5">
                  ข้อเสนอแนะเชิงกลยุทธ์ (Strategic Insight):
                </strong>
                {labUtilizationSummary.grandTotal === 0 ? (
                  <span>
                    ยังไม่มีบันทึกการใช้งานห้องปฏิบัติการเพื่อการเรียนการสอนในเดือนที่เลือก — กรุณาเลือกเดือนที่มีการบันทึกข้อมูล (เช่น ตุลาคม 2569) หรือเลือก <strong>&quot;รวมทุกเดือน (ทั้งปี)&quot;</strong> เพื่อดูภาพรวมตลอดปีการศึกษา
                  </span>
                ) : (
                  <span>
                    ช่วงเวลาที่เลือกมีการใช้ห้องปฏิบัติการรวม <strong>{labUtilizationSummary.grandTotal.toFixed(1)} ชม.</strong> (การสอน {labUtilizationSummary.teachingTotal.toFixed(1)} ชม. • นิสิตฝึกซ้อม {labUtilizationSummary.practiceTotal.toFixed(1)} ชม. • สอบ OSCE {labUtilizationSummary.examTotal.toFixed(1)} ชม.) โดยห้องที่มีชั่วโมงใช้งานสูงสุดคือ <strong>{labUtilizationSummary.topRoom?.roomName}</strong> ({labUtilizationSummary.topRoom?.totalHours} ชม.)
                    {labUtilizationSummary.practiceRooms.length > 0 &&
                      ` และพบนิสิตเข้าฝึกซ้อมทักษะเด่นชัดในห้อง ${labUtilizationSummary.practiceRooms.map((p: any) => p.shortName).join(', ')} จึงควรเตรียมอุปกรณ์และช่วงเวลาเปิดให้บริการให้เพียงพอก่อนช่วงสอบ OSCE`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ROW 3: TOP DEMAND EQUIPMENT & AC CLIMATE COMPARISON */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* CHART 4: Top 5 High-Demand Equipment (Horizontal Bar) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        4. 5 อันดับครุภัณฑ์ที่มีความต้องการยืมสูงสุด (Top Demand)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ชี้เป้าจุดคอขวด (Bottleneck) ที่มีความต้องการยืมสะสมสูงสุด
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold border border-amber-200 dark:border-amber-800">
                    High Demand
                  </span>
                </div>

                <div className="h-64 my-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topDemand}
                      margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickFormatter={(val) => (val.length > 18 ? val.substring(0, 18) + '...' : val)}
                      />
                      <RechartsTooltip
                        formatter={(value: any) => [`${value} ครั้ง`, 'จำนวนการยืมสะสม']}
                      />
                      <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Strategic Decision Insight (Dynamic) */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <div>
                  <strong className="font-bold text-amber-950 dark:text-amber-100 block mb-0.5">
                    ข้อเสนอแนะเชิงกลยุทธ์ (Strategic Insight):
                  </strong>
                  {topDemand[0] ? (
                    <>
                      <strong>{topDemand[0].name}</strong> มีความต้องการยืมสะสมสูงสุด ({topDemand[0].count} ชิ้น/ครั้ง)
                      {topDemand[1] ? ` รองลงมาคือ ${topDemand[1].name} (${topDemand[1].count} ชิ้น/ครั้ง)` : ''}
                      {' '}สามารถใช้ข้อมูลสถิติจริงนี้ประกอบการวางแผนจัดซื้อครุภัณฑ์เพิ่มเติมให้สอดคล้องกับจำนวนนิสิต
                    </>
                  ) : (
                    'ยังไม่มีสถิติการยืมครุภัณฑ์สะสมในระบบ'
                  )}
                </div>
              </div>
            </div>

            {/* CHART 5: AC Hours: Teaching vs Asset Climate Preservation */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        5. สถิติชั่วโมงแอร์: การสอน vs การถนอมรักษาอุปกรณ์
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ติดตามนโยบาย Green Lab และความคุ้มค่าของการใช้พลังงาน
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 text-[11px] font-bold border border-cyan-200 dark:border-cyan-800">
                    Green Lab
                  </span>
                </div>

                <div className="h-64 my-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(kpis?.roomAcBreakdown || []).slice(0, 7)}
                      margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis
                        dataKey="roomName"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        tickFormatter={(v) => v.replace('ห้องปฏิบัติการ', '').replace('การพยาบาล', '').trim()}
                      />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" ชม." />
                      <RechartsTooltip />
                      <Bar dataKey="teachingHours" name="การเรียนการสอน" stackId="ac" fill="#0284c7" />
                      <Bar dataKey="preservationHours" name="ถนอมรักษาอุปกรณ์" stackId="ac" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Strategic Decision Insight (Dynamic) */}
              <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/30 text-xs text-cyan-900 dark:text-cyan-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <div>
                  <strong className="font-bold text-cyan-950 dark:text-cyan-100 block mb-0.5">
                    ข้อเสนอแนะเชิงกลยุทธ์ (Strategic Insight):
                  </strong>
                  {kpis?.roomAcBreakdown?.[0] ? (
                    <>
                      ช่วงเวลาที่เลือกมีการเปิดเครื่องปรับอากาศรวม <strong>{kpis?.totalAcHoursMonth || 0} ชม.</strong> โดยห้องที่มีชั่วโมงเปิดแอร์สูงสุดคือ <strong>{kpis.roomAcBreakdown[0].roomName}</strong> ({kpis.roomAcBreakdown[0].totalHours} ชม.) และใช้เพื่อถนอมรักษาอุปกรณ์/เตรียมห้องทั้งศูนย์ <strong>{kpis?.maintenanceAcHours || 0} ชม.</strong> ({kpis?.totalAcHoursMonth > 0 ? Math.round(((kpis?.maintenanceAcHours || 0) / kpis.totalAcHoursMonth) * 100) : 0}%)
                    </>
                  ) : (
                    'ยังไม่มีบันทึกชั่วโมงเครื่องปรับอากาศในเดือนที่เลือก'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ROW 4: 12-MONTH YEARLY TREND CHART (6TH CHART) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    6. แนวโน้มชั่วโมงการใช้งานห้องปฏิบัติการและพลังงานรายเดือนตลอดปี พ.ศ. {selectedYear + 543}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบภาพรวม ม.ค. – ธ.ค. ระหว่างชั่วโมงเรียนการสอน นิสิตฝึกอิสระ สอบ OSCE และชั่วโมงถนอมรักษาอุปกรณ์
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[11px] font-bold border border-purple-200 dark:border-purple-800 self-start sm:self-center">
                Yearly Trend
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" ชม." allowDecimals={false} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1">
                          <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-200">
                            เดือน {d.label} พ.ศ. {selectedYear + 543}
                          </div>
                          <div className="flex justify-between gap-4 text-blue-300">
                            <span>การสอนตามตาราง:</span>
                            <span className="font-mono font-bold">{d.teachingHours} ชม.</span>
                          </div>
                          <div className="flex justify-between gap-4 text-emerald-300">
                            <span>นิสิตฝึกอิสระ:</span>
                            <span className="font-mono font-bold">{d.studentPracticeHours} ชม.</span>
                          </div>
                          <div className="flex justify-between gap-4 text-amber-300">
                            <span>สอบ OSCE:</span>
                            <span className="font-mono font-bold">{d.examHours} ชม.</span>
                          </div>
                          <div className="flex justify-between gap-4 text-cyan-300">
                            <span>ถนอมรักษาอุปกรณ์/จัดห้อง:</span>
                            <span className="font-mono font-bold">{d.preservationHours} ชม.</span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 font-bold text-white">
                            <span>รวมทั้งเดือน:</span>
                            <span className="font-mono font-black">{d.totalAcHours} ชม.</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="teachingHours" name="การสอนตามตาราง" stackId="trend" fill="#3b82f6" />
                  <Bar dataKey="studentPracticeHours" name="นิสิตฝึกอิสระ" stackId="trend" fill="#10b981" />
                  <Bar dataKey="examHours" name="สอบ OSCE" stackId="trend" fill="#f59e0b" />
                  <Bar dataKey="preservationHours" name="ถนอมรักษา/จัดห้อง" stackId="trend" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Strategic Decision Insight (Dynamic) */}
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <div>
                <strong className="font-bold text-purple-950 dark:text-purple-100 block mb-0.5">
                  ข้อเสนอแนะเชิงกลยุทธ์ (Yearly Trend Insight):
                </strong>
                {peakMonthSummary ? (
                  <span>
                    ตลอดปี พ.ศ. {selectedYear + 543} มียอดเปิดใช้งานห้องปฏิบัติการสะสม <strong>{peakMonthSummary.totalYearHours} ชม.</strong> (ภาคการสอน/ฝึก/สอบ {peakMonthSummary.totalAcademicYear} ชม.) โดยเดือนที่มีความหนาแน่นสูงสุดคือ <strong>เดือน {peakMonthSummary.peak.label}</strong> ({peakMonthSummary.peak.totalAcHours} ชม.) แนะนำให้ใช้ข้อมูลแนวโน้มนี้วางแผนจัดสรรบุคลากรและงบค่าพลังงานล่วงหน้า
                  </span>
                ) : (
                  <span>ยังไม่มีสถิติรายเดือนสำหรับปี พ.ศ. {selectedYear + 543}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5.5 TAB CONTENT: COURSE BUDGET & COST ANALYTICS       */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'BUDGET' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                <span>การวิเคราะห์งบประมาณและต้นทุนเวชภัณฑ์รายวิชา (Course Cost & Budget)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                เปรียบเทียบงบประมาณจัดสรรกับยอดเบิกจ่ายเวชภัณฑ์จริงและคำนวณต้นทุนเฉลี่ยต่อนิสิต 1 คนในรายวิชาที่เปิดสอน
              </p>
            </div>

            <Link
              href="/courses"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-500 transition flex items-center gap-1.5 self-start sm:self-center"
            >
              <span>จัดการรายวิชา & รายงานต้นทุน</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
              <span className="text-xs text-slate-500 block font-semibold">งบประมาณจัดสรรรวม</span>
              <span className="text-2xl font-mono font-black text-indigo-900 dark:text-indigo-300 mt-1 block">
                ฿{(courseBudget?.totalAllocatedBudget || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-xs text-slate-500 block font-semibold">เบิกจ่ายเวชภัณฑ์จริง</span>
              <span className="text-2xl font-mono font-black text-amber-900 dark:text-amber-300 mt-1 block">
                ฿{Math.round(courseBudget?.totalSpentAmount || 0).toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                ใช้งบไป {courseBudget?.overallUtilizationPercent || 0}%
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs text-slate-500 block font-semibold">งบประมาณคงเหลือ</span>
              <span className="text-2xl font-mono font-black text-emerald-900 dark:text-emerald-300 mt-1 block">
                ฿{Math.round(courseBudget?.totalRemainingBudget || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
              <span className="text-xs text-slate-500 block font-semibold">ต้นทุนเฉลี่ยต่อนิสิต</span>
              <span className="text-2xl font-mono font-black text-teal-900 dark:text-teal-300 mt-1 block">
                ฿{(courseBudget?.avgCostPerStudent || 0).toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                จำนวนนิสิตรวม {courseBudget?.totalStudentsEnrolled || 0} คน
              </span>
            </div>
          </div>

          {(courseBudget?.courses || []).length > 0 && (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseBudget.courses} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="code" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [`฿${Number(val).toLocaleString()}`, name]}
                  />
                  <Bar dataKey="allocatedBudget" name="งบประมาณจัดสรร" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={56} />
                  <Bar dataKey="spentAmount" name="ยอดเบิกจ่ายจริง" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">รหัสวิชา</th>
                  <th className="p-3">ชื่อรายวิชา / ผู้สอน</th>
                  <th className="p-3 text-right">จำนวนนิสิต</th>
                  <th className="p-3 text-right">งบจัดสรร (บาท)</th>
                  <th className="p-3 text-right">เบิกใช้จริง (บาท)</th>
                  <th className="p-3 text-right">คงเหลือ (บาท)</th>
                  <th className="p-3 text-right">ต้นทุน/นิสิต</th>
                  <th className="p-3 text-center">อัตราใช้งบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(courseBudget?.courses || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      ไม่พบข้อมูลรายวิชาที่เปิดสอนในระบบ
                    </td>
                  </tr>
                ) : (
                  (courseBudget?.courses || []).map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                        {c.code}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.instructorName} • เทอม {c.semester}/{c.academicYear}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">{c.studentCount.toLocaleString()} คน</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        ฿{c.allocatedBudget.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        ฿{c.spentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ฿{c.remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-teal-700 dark:text-teal-300">
                        ฿{c.costPerStudent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                c.utilizationPercent > 85 ? 'bg-rose-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(100, c.utilizationPercent)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold">{c.utilizationPercent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. TAB CONTENT: ENERGY & GREEN LAB                   */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'ENERGY' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wind className="w-5 h-5 text-cyan-600" />
                <span>การวิเคราะห์พลังงานระบบปรับอากาศและเป้าหมาย Green Lab</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                สถิติการใช้งานเครื่องปรับอากาศเปรียบเทียบระหว่างห้องเรียนกับห้องถนอมรักษาสินทรัพย์
              </p>
            </div>

            <Link
              href="/air-conditioning"
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-xs hover:bg-teal-500 transition flex items-center gap-1.5"
            >
              <span>ไปที่ระบบบันทึกเวลาแอร์</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800">
              <span className="text-xs text-slate-500 block font-semibold">ชั่วโมงเปิดแอร์รวมทั้งศูนย์</span>
              <span className="text-2xl font-mono font-black text-cyan-800 dark:text-cyan-300 mt-1 block">
                {kpis?.totalAcHoursMonth || 0} ชม.
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <span className="text-xs text-slate-500 block font-semibold">เพื่อการเรียนการสอนและการฝึก</span>
              <span className="text-2xl font-mono font-black text-blue-800 dark:text-blue-300 mt-1 block">
                {kpis?.teachingAcHours || 0} ชม.
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs text-slate-500 block font-semibold">เพื่อถนอมรักษาหุ่น AI/Sim</span>
              <span className="text-2xl font-mono font-black text-emerald-800 dark:text-emerald-300 mt-1 block">
                {kpis?.maintenanceAcHours || 0} ชม.
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">รหัสห้อง</th>
                  <th className="p-3">ชื่อห้องปฏิบัติการ</th>
                  <th className="p-3 text-right">ชั่วโมงสอน (ชม.)</th>
                  <th className="p-3 text-right">ชั่วโมงถนอมอุปกรณ์ (ชม.)</th>
                  <th className="p-3 text-right">รวมทั้งหมด (ชม.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(kpis?.roomAcBreakdown || []).map((r: any) => (
                  <tr key={r.roomId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-300">{r.roomCode || '-'}</td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{r.roomName}</td>
                    <td className="p-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                      {r.teachingHours?.toFixed(1) || '0.0'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {r.preservationHours?.toFixed(1) || '0.0'}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      {r.totalHours?.toFixed(1) || r.hours?.toFixed(1) || '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 7. TAB CONTENT: ASSETS & DRILL-DOWN TABLE            */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'ASSETS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300">
          {/* Table Header & Search Filter */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-teal-600" />
                  <span>สำรวจรายละเอียดครุภัณฑ์เชิงลึก (Equipment Asset Browser)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  คลิกที่รายการใดก็ได้เพื่อเปิดดูข้อมูลประจำเครื่อง ประวัติ และสถานที่ติดตั้งโดยละเอียด
                </p>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>โหมดสำหรับผู้บริหาร: เรียกดูข้อมูลเชิงลึกได้ทุกชิ้น (Read-Only)</span>
              </div>
            </div>

            {/* Search Input & Status Filter Chips */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัสแล็บ, S/N, ห้อง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500 transition"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
                {[
                  { key: 'ALL', label: 'ทั้งหมด' },
                  { key: 'AVAILABLE', label: 'พร้อมใช้งาน' },
                  { key: 'BORROWED', label: 'กำลังถูกยืม' },
                  { key: 'MAINTENANCE', label: 'ส่งซ่อมบำรุง' },
                  { key: 'DAMAGED', label: 'พบชำรุด' },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                      statusFilter === f.key
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drill-Down Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-12 text-center">ลำดับ</th>
                  <th className="p-3">รหัสแล็บ</th>
                  <th className="p-3">เลขครุภัณฑ์</th>
                  <th className="p-3">ชื่อครุภัณฑ์</th>
                  <th className="p-3">สถานที่ติดตั้ง / ห้อง</th>
                  <th className="p-3 text-right">มูลค่า (บาท)</th>
                  <th className="p-3 text-center">สภาพ</th>
                  <th className="p-3 text-center">สถานะ</th>
                  <th className="p-3 text-center w-20">ดูข้อมูล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                      ไม่พบรายการครุภัณฑ์ตามเงื่อนไขที่ระบุ
                    </td>
                  </tr>
                ) : (
                  paginatedEquipment.map((item: any, idx: number) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    let statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        พร้อมใช้งาน
                      </span>
                    );
                    if (item.status === 'BORROWED') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          กำลังถูกยืม
                        </span>
                      );
                    } else if (item.status === 'MAINTENANCE') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          ส่งซ่อมบำรุง
                        </span>
                      );
                    }

                    let conditionBadge = (
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        ปกติ
                      </span>
                    );
                    if (item.condition === 'DAMAGED') {
                      conditionBadge = (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          ชำรุด
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedAsset(item)}
                        className="hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition cursor-pointer"
                      >
                        <td className="p-3 text-center text-slate-400 font-mono">{rowNumber}</td>
                        <td className="p-3 font-mono font-bold text-teal-800 dark:text-teal-300">
                          {item.assetCode}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {item.govAssetCode || '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            {item.imageUrl ? (
                              <img
                                src={formatImageUrl(item.imageUrl)}
                                alt={item.itemName}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  const rawUrl = item.rawImageUrl || item.imageUrl || '';
                                  if (rawUrl.includes('drive.google.com') && !img.src.includes('googleusercontent.com')) {
                                    const m = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                                    if (m && m[1]) {
                                      img.src = `https://lh3.googleusercontent.com/d/${m[1]}`;
                                      return;
                                    }
                                  }
                                  img.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                <Boxes className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {item.itemName}
                              </div>
                              {item.sequenceNumber && (
                                <div className="text-[10px] text-slate-500">
                                  {item.unit || 'ชิ้น'}ที่ {item.sequenceNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                          {item.roomName}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {item.cost ? `฿${item.cost.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3 text-center">{conditionBadge}</td>
                        <td className="p-3 text-center">{statusBadge}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition cursor-pointer"
                            title="ดูรายละเอียดเชิงลึก"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredEquipment.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>
                  แสดง {Math.min((currentPage - 1) * pageSize + 1, filteredEquipment.length)} - {Math.min(currentPage * pageSize, filteredEquipment.length)} จาก {filteredEquipment.length} รายการ
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div className="flex items-center gap-1.5">
                  <span>แสดงต่อหน้า:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={35}>35</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={9999}>ทั้งหมด ({filteredEquipment.length})</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    ก่อนหน้า
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`min-w-[28px] h-7 px-2 rounded-lg font-bold transition text-xs cursor-pointer ${
                              currentPage === p
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    ถัดไป
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. TAB CONTENT: CONSUMABLES & EXPIRY RISK            */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'CONSUMABLES' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-teal-600" />
                <span>การบริหารความเสี่ยงคลังเวชภัณฑ์และสารเคมี (Consumables Risk Management)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ติดตามมูลค่าคงคลังและการแจ้งเตือนเวชภัณฑ์ใกล้หมดอายุภายใน 90 วัน เพื่อสนับสนุนนโยบาย Zero-Waste
              </p>
            </div>

            <Link
              href="/inventory"
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-xs hover:bg-teal-500 transition flex items-center gap-1.5"
            >
              <span>ไปที่คลังพัสดุ</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
              <span className="text-xs text-slate-500 block font-semibold">มูลค่าเวชภัณฑ์และวัสดุคงคลังรวม</span>
              <span className="text-2xl font-mono font-black text-teal-900 dark:text-teal-300 mt-1 block">
                ฿{Math.round(kpis?.totalConsumablesValuation || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-xs text-slate-500 block font-semibold">จำนวนล็อตที่ใกล้หมดอายุใน 90 วัน</span>
              <span className="text-2xl font-mono font-black text-amber-900 dark:text-amber-400 mt-1 block">
                {kpis?.expiringLotsCount || 0} ล็อต
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs text-slate-500 block font-semibold">ระดับความเสี่ยงการสูญเปล่า</span>
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mt-1 block">
                {kpis?.expiringLotsCount > 5 ? 'ปานกลาง' : 'ต่ำ (อยู่ในเกณฑ์ควบคุมได้)'}
              </span>
            </div>
          </div>

          {nearExpiryItems.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                รายการเวชภัณฑ์ที่ต้องเฝ้าระวังวันหมดอายุ:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {nearExpiryItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs space-y-1"
                  >
                    <span className="font-bold text-amber-950 dark:text-amber-200 block truncate">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>คงเหลือ: {item.quantity} {item.unit}</span>
                      <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                        หมดอายุ: {formatDateThai(item.expiryDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              ไม่มีเวชภัณฑ์หรือสารเคมีที่มีความเสี่ยงหมดอายุในระยะ 90 วัน
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 9. EXECUTIVE DRILL-DOWN ASSET DETAIL MODAL           */}
      {/* ---------------------------------------------------- */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/20 text-white border border-white/20">
                    {selectedAsset.assetCode}
                  </span>
                  <span className="text-[11px] font-semibold text-teal-200">
                    {selectedAsset.categoryName}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black mt-1">
                  {selectedAsset.itemName}
                </h3>
                <p className="text-[11px] text-teal-200/80">
                  {selectedAsset.unit || 'ชิ้น'}ที่ {selectedAsset.sequenceNumber || 1} • เลขครุภัณฑ์: {selectedAsset.govAssetCode || '-'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Asset Photo */}
              {selectedAsset.imageUrl ? (
                <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 group">
                  {modalImageError ? (
                    <div className="flex flex-col items-center justify-center text-center p-4 text-slate-500">
                      <AlertTriangle className="w-6 h-6 text-amber-500 mb-1.5" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ไม่สามารถแสดงรูปภาพตัวอย่างได้โดยตรง
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        (อาจเกิดจากสิทธิ์การแชร์ไฟล์ใน Google Drive)
                      </span>
                      <a
                        href={selectedAsset.rawImageUrl || selectedAsset.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>เปิดดูรูปภาพใน Google Drive</span>
                      </a>
                    </div>
                  ) : (
                    <>
                      <img
                        src={formatImageUrl(selectedAsset.imageUrl)}
                        alt={selectedAsset.itemName}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const img = e.currentTarget;
                          const rawUrl = selectedAsset.rawImageUrl || selectedAsset.imageUrl || '';
                          if (rawUrl.includes('drive.google.com') && !img.src.includes('googleusercontent.com')) {
                            const m = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                            if (m && m[1]) {
                              img.src = `https://lh3.googleusercontent.com/d/${m[1]}`;
                              return;
                            }
                          }
                          setModalImageError(true);
                        }}
                      />
                      <a
                        href={selectedAsset.rawImageUrl || selectedAsset.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold backdrop-blur-md transition flex items-center gap-1 shadow-md opacity-80 hover:opacity-100 cursor-pointer"
                        title="เปิดดูรูปภาพต้นฉบับในแท็บใหม่"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>ดูภาพต้นฉบับ</span>
                      </a>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full py-6 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                  <Boxes className="w-8 h-8 opacity-40" />
                  <span className="text-[11px]">ไม่มีรูปภาพประจำรายการครุภัณฑ์นี้</span>
                </div>
              )}

              {/* Status and Cost Highlights */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-semibold block">ราคาจัดซื้อ / มูลค่า</span>
                  <span className="text-lg font-mono font-black text-slate-900 dark:text-white mt-0.5 block">
                    ฿{(selectedAsset.cost || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-semibold block">สถานะปัจจุบัน</span>
                  <span className="text-sm font-bold text-teal-700 dark:text-teal-300 mt-1 block">
                    {selectedAsset.status === 'AVAILABLE'
                      ? '✓ พร้อมใช้งาน'
                      : selectedAsset.status === 'BORROWED'
                      ? '⏱ กำลังถูกยืม'
                      : '⚠️ ส่งซ่อมบำรุง'}
                  </span>
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-2 p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs border-b border-slate-100 dark:border-slate-700 pb-1.5">
                  ข้อมูลคุณลักษณะประจำเครื่อง
                </h4>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 mb-2">
                  <span className="text-slate-400 block text-[10px]">เลขครุภัณฑ์ (ทางราชการ):</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                    {selectedAsset.govAssetCode || '-'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 block">ยี่ห้อ (Brand):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.brand || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">รุ่น (Model):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.model || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">หมายเลขเครื่อง (S/N):</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.serialNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">วันที่รับเข้า:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateThai(selectedAsset.receivedDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">บริษัทผู้จำหน่าย:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.supplier || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">สิ้นสุดรับประกัน:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateThai(selectedAsset.warrantyExpiry)}</span>
                  </div>
                </div>
              </div>

              {/* Location & Custodian */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs border-b border-slate-100 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>สถานที่จัดเก็บและการครอบครอง</span>
                </h4>
                <div className="space-y-1 pt-1">
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>ห้องประจำ:</strong> {selectedAsset.roomName}
                  </p>
                  <p className="text-slate-500">
                    <strong>หน่วยงานผู้ครอบครอง:</strong> {ORG_CONFIG.FULL_CUSTODIAN_LABEL}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                ข้อมูลตรวจสอบความถูกต้องทางพัสดุราชการ
              </span>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 10. PRINT-ONLY 1-PAGE BOARDROOM EXECUTIVE SUMMARY A4 */}
      {/* ---------------------------------------------------- */}
      <div className="hidden print:block bg-white text-slate-900 p-2 space-y-4 text-xs">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
          <div>
            <h1 className="text-lg font-black text-slate-900">
              รายงานสรุปผู้บริหารห้องปฏิบัติการพยาบาล (Executive Cockpit Summary)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {ORG_CONFIG.FULL_CUSTODIAN_LABEL} • ประจำช่วงเวลา: {THAI_MONTHS.find((m) => m.value === selectedMonth)?.label} พ.ศ. {selectedYear + 543}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <div>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</div>
            <div>ผู้พิมพ์: {currentUser ? formatUserName(currentUser) || currentUser.name : '-'}</div>
          </div>
        </div>

        {/* KPI Snapshot Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-slate-300">
            <div className="text-[10px] text-slate-500 font-bold">มูลค่าครุภัณฑ์รวม</div>
            <div className="text-base font-black font-mono mt-0.5">฿{((kpis?.totalValuation || 0) / 1000000).toFixed(2)}M</div>
            <div className="text-[10px] text-emerald-700 font-bold">พร้อมใช้ {kpis?.readinessRate || 100}% ({kpis?.totalAssetsCount || 0} ชิ้น)</div>
          </div>
          <div className="p-3 rounded-xl border border-slate-300">
            <div className="text-[10px] text-slate-500 font-bold">ชั่วโมงเปิดแอร์ทั้งศูนย์</div>
            <div className="text-base font-black font-mono mt-0.5">{kpis?.totalAcHoursMonth || 0} ชม.</div>
            <div className="text-[10px] text-slate-600">ถนอมหุ่น/อุปกรณ์ {kpis?.maintenanceAcHours || 0} ชม.</div>
          </div>
          <div className="p-3 rounded-xl border border-slate-300">
            <div className="text-[10px] text-slate-500 font-bold">ชั่วโมงฝึกของนิสิต</div>
            <div className="text-base font-black font-mono mt-0.5">{kpis?.totalPracticeHours || 0} ชม.</div>
            <div className="text-[10px] text-slate-600">{kpis?.totalRoomsCount || 10} ห้องปฏิบัติการ</div>
          </div>
          <div className="p-3 rounded-xl border border-slate-300">
            <div className="text-[10px] text-slate-500 font-bold">งบเวชภัณฑ์รายวิชา</div>
            <div className="text-base font-black font-mono mt-0.5">฿{Math.round(courseBudget?.totalSpentAmount || 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-600">จากงบ ฿{(courseBudget?.totalAllocatedBudget || 0).toLocaleString()} ({courseBudget?.overallUtilizationPercent || 0}%)</div>
          </div>
        </div>

        {/* Lab Utilization Compact Print Table */}
        <div>
          <h2 className="text-xs font-black text-slate-900 mb-1.5">
            1. สถิติชั่วโมงการใช้งานห้องปฏิบัติการ {labUtilization.length || 10} ห้อง แยกตามวัตถุประสงค์
          </h2>
          <table className="w-full text-[11px] border-collapse border border-slate-400">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="border border-slate-400 p-1.5 text-left">รหัส</th>
                <th className="border border-slate-400 p-1.5 text-left">ห้องปฏิบัติการ</th>
                <th className="border border-slate-400 p-1.5 text-right">สอนตารางวิชา (ชม.)</th>
                <th className="border border-slate-400 p-1.5 text-right">นิสิตฝึกอิสระ (ชม.)</th>
                <th className="border border-slate-400 p-1.5 text-right">สอบ OSCE (ชม.)</th>
                <th className="border border-slate-400 p-1.5 text-right">รวม (ชม.)</th>
              </tr>
            </thead>
            <tbody>
              {labUtilization.map((r: any) => (
                <tr key={r.roomId}>
                  <td className="border border-slate-300 p-1.5 font-mono">{r.roomCode}</td>
                  <td className="border border-slate-300 p-1.5">{r.roomName}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{r.teachingHours.toFixed(1)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{r.studentPracticeHours.toFixed(1)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">{r.examHours.toFixed(1)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{r.totalHours.toFixed(1)}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={2} className="border border-slate-400 p-1.5">รวมทั้งหมด ({labUtilization.length} ห้อง)</td>
                <td className="border border-slate-400 p-1.5 text-right font-mono">{labUtilizationSummary.teachingTotal.toFixed(1)}</td>
                <td className="border border-slate-400 p-1.5 text-right font-mono">{labUtilizationSummary.practiceTotal.toFixed(1)}</td>
                <td className="border border-slate-400 p-1.5 text-right font-mono">{labUtilizationSummary.examTotal.toFixed(1)}</td>
                <td className="border border-slate-400 p-1.5 text-right font-mono">{labUtilizationSummary.grandTotal.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Course Budget Compact Print Table */}
        {(courseBudget?.courses || []).length > 0 && (
          <div>
            <h2 className="text-xs font-black text-slate-900 mb-1.5">
              2. สรุปงบประมาณและต้นทุนเวชภัณฑ์รายวิชาที่เปิดสอน
            </h2>
            <table className="w-full text-[11px] border-collapse border border-slate-400">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-400 p-1.5 text-left">รหัสวิชา</th>
                  <th className="border border-slate-400 p-1.5 text-left">ชื่อรายวิชา</th>
                  <th className="border border-slate-400 p-1.5 text-right">นิสิต</th>
                  <th className="border border-slate-400 p-1.5 text-right">งบจัดสรร</th>
                  <th className="border border-slate-400 p-1.5 text-right">เบิกใช้จริง</th>
                  <th className="border border-slate-400 p-1.5 text-right">ต้นทุน/นิสิต</th>
                </tr>
              </thead>
              <tbody>
                {courseBudget.courses.map((c: any) => (
                  <tr key={c.id}>
                    <td className="border border-slate-300 p-1.5 font-mono">{c.code}</td>
                    <td className="border border-slate-300 p-1.5">{c.name}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{c.studentCount}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">฿{c.allocatedBudget.toLocaleString()}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">฿{c.spentAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">฿{c.costPerStudent.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
