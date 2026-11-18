'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-context';
import {
  Star,
  Sliders,
  Sparkles,
  Download,
  Plus,
  Edit3,
  Trash2,
  ShieldCheck,
  Search,
  RefreshCw,
  Check,
  Users,
  BarChart3,
  MessageSquare,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatUserName } from '@/lib/user-utils';
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_QUICK_TAGS,
  FEEDBACK_ROLE_LABELS,
  RATING_LABELS,
} from '@/lib/feedback-constants';

interface FeedbackRecord {
  id: string;
  userId?: string | null;
  user?: {
    id: string;
    prefix?: string | null;
    name: string;
    studentId?: string | null;
    role: string;
    department?: string | null;
  } | null;
  userName?: string | null;
  userRole?: string | null;
  rating: number;
  easeOfUseRating?: number | null;
  speedRating?: number | null;
  category: string;
  actionLabel?: string | null;
  pagePath?: string | null;
  quickTags?: string | null;
  comment?: string | null;
  isAnonymous: boolean;
  isEditedByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackSummary {
  totalCount: number;
  avgRating: number;
  avgEaseOfUse: number | null;
  avgSpeed: number | null;
  positiveCount: number;
  positiveRatePercent: number;
  starCounts: Record<number, number>;
  byRole: Array<{ role: string; count: number; avgRating: number }>;
  byCategory: Array<{ category: string; count: number; avgRating: number }>;
}

export default function AdminFeedbackPage() {
  const { currentUser, isAdmin, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedbackRecord[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary>({
    totalCount: 0,
    avgRating: 0,
    avgEaseOfUse: null,
    avgSpeed: null,
    positiveCount: 0,
    positiveRatePercent: 0,
    starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    byRole: [],
    byCategory: [],
  });

  // Config States
  const [configForm, setConfigForm] = useState({
    isEnabled: true,
    randomChancePercent: 50,
    cooldownHoursAfterSubmit: 0,
    promptTitle: 'ทำรายการสำเร็จ! ให้คะแนนความพึงพอใจการใช้ระบบ',
    promptSubtitle: 'ความคิดเห็นของท่านช่วยให้เราพัฒนาห้องปฏิบัติการพยาบาลให้ดียิ่งขึ้น',
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Edit / Create Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FeedbackRecord | null>(null);
  const [formState, setFormState] = useState({
    rating: 5,
    easeOfUseRating: 5,
    speedRating: 5,
    category: 'OVERALL',
    actionLabel: '',
    userName: '',
    userRole: 'USER',
    quickTags: '',
    comment: '',
    isAnonymous: false,
    createdDate: new Date().toISOString().slice(0, 16),
  });
  const [savingItem, setSavingItem] = useState(false);

  const fetchAll = async () => {
    if (!currentUser?.id || !isAdmin) return;
    setLoading(true);
    try {
      const [fbRes, cfgRes] = await Promise.all([
        fetch(`/api/feedback?actorUserId=${encodeURIComponent(currentUser.id)}`),
        fetch('/api/feedback/config'),
      ]);

      if (fbRes.ok) {
        const data = await fbRes.json();
        setItems(Array.isArray(data.items) ? data.items : []);
        if (data.summary) setSummary(data.summary);
      }
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setConfigForm({
          isEnabled: cfg.isEnabled !== false,
          randomChancePercent:
            typeof cfg.randomChancePercent === 'number' ? cfg.randomChancePercent : 50,
          cooldownHoursAfterSubmit:
            typeof cfg.cooldownHoursAfterSubmit === 'number' ? cfg.cooldownHoursAfterSubmit : 0,
          promptTitle: cfg.promptTitle || 'ทำรายการสำเร็จ! ให้คะแนนความพึงพอใจการใช้ระบบ',
          promptSubtitle:
            cfg.promptSubtitle ||
            'ความคิดเห็นของท่านช่วยให้เราพัฒนาห้องปฏิบัติการพยาบาลให้ดียิ่งขึ้น',
        });
      }
    } catch (err) {
      console.error('Error loading admin feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser && isAdmin) {
      fetchAll();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, currentUser?.id, isAdmin]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (starFilter !== 'ALL' && item.rating !== Number(starFilter)) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      const rRole = item.userRole || item.user?.role || 'USER';
      if (roleFilter !== 'ALL' && rRole !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const uName = item.isAnonymous
          ? 'ไม่ระบุชื่อ'
          : item.userName || (item.user ? formatUserName(item.user) : '');
        const matchText =
          uName.toLowerCase().includes(q) ||
          (item.user?.studentId || '').toLowerCase().includes(q) ||
          (item.comment || '').toLowerCase().includes(q) ||
          (item.quickTags || '').toLowerCase().includes(q) ||
          (item.actionLabel || '').toLowerCase().includes(q);
        if (!matchText) return false;
      }
      return true;
    });
  }, [items, starFilter, categoryFilter, roleFilter, searchQuery]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setSavingConfig(true);
    try {
      const res = await fetch('/api/feedback/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          ...configForm,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        window.dispatchEvent(
          new CustomEvent('lab-feedback-config-updated', { detail: updated })
        );
        alert('บันทึกการตั้งค่าระบบสุ่มให้ดาวเรียบร้อยแล้ว');
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      alert('ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleQuickStarEdit = async (item: FeedbackRecord, newStar: number) => {
    if (!currentUser?.id || newStar === item.rating) return;
    try {
      const res = await fetch(`/api/feedback/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId: currentUser.id,
          rating: newStar,
        }),
      });
      if (res.ok) {
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || 'ไม่สามารถแก้ไขคะแนนได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormState({
      rating: 5,
      easeOfUseRating: 5,
      speedRating: 5,
      category: 'OVERALL',
      actionLabel: 'เพิ่มผลประเมินโดยผู้ดูแลระบบ',
      userName: '',
      userRole: 'USER',
      quickTags: 'ใช้งานง่าย, รวดเร็วทันใจ',
      comment: '',
      isAnonymous: false,
      createdDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }) +
        'T' +
        new Date().toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
    });
    setShowEditModal(true);
  };

  const handleOpenEditModal = (item: FeedbackRecord) => {
    setEditingItem(item);
    const dObj = new Date(item.createdAt);
    const dateVal =
      dObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }) +
      'T' +
      dObj.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

    setFormState({
      rating: item.rating,
      easeOfUseRating: item.easeOfUseRating || 0,
      speedRating: item.speedRating || 0,
      category: item.category || 'OVERALL',
      actionLabel: item.actionLabel || '',
      userName: item.userName || (item.user ? formatUserName(item.user) : ''),
      userRole: item.userRole || item.user?.role || 'USER',
      quickTags: item.quickTags || '',
      comment: item.comment || '',
      isAnonymous: item.isAnonymous,
      createdDate: dateVal,
    });
    setShowEditModal(true);
  };

  const handleSaveFeedbackModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setSavingItem(true);
    try {
      const isoCreated = formState.createdDate ? `${formState.createdDate}:00+07:00` : undefined;
      if (editingItem) {
        const res = await fetch(`/api/feedback/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorUserId: currentUser.id,
            rating: formState.rating,
            easeOfUseRating: formState.easeOfUseRating || null,
            speedRating: formState.speedRating || null,
            category: formState.category,
            actionLabel: formState.actionLabel,
            userName: formState.userName,
            userRole: formState.userRole,
            quickTags: formState.quickTags,
            comment: formState.comment,
            isAnonymous: formState.isAnonymous,
            createdAt: isoCreated,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'ไม่สามารถแก้ไขข้อมูลได้');
          return;
        }
      } else {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorUserId: currentUser.id,
            isAddedByAdmin: true,
            rating: formState.rating,
            easeOfUseRating: formState.easeOfUseRating || null,
            speedRating: formState.speedRating || null,
            category: formState.category,
            actionLabel: formState.actionLabel,
            userName: formState.userName || 'ผู้ประเมิน',
            userRole: formState.userRole,
            quickTags: formState.quickTags,
            comment: formState.comment,
            isAnonymous: formState.isAnonymous,
            createdAt: isoCreated,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'ไม่สามารถเพิ่มข้อมูลได้');
          return;
        }
      }
      setShowEditModal(false);
      fetchAll();
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: FeedbackRecord) => {
    if (!currentUser?.id) return;
    if (!confirm(`ยืนยันการลบรายการประเมิน (${item.rating} ดาว) นี้ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(
        `/api/feedback/${item.id}?actorUserId=${encodeURIComponent(currentUser.id)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || 'ไม่สามารถลบรายการได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleExportExcel = () => {
    const rows = filteredItems.map((it, idx) => ({
      ลำดับ: idx + 1,
      วันที่เวลา: new Date(it.createdAt).toLocaleString('th-TH'),
      บทบาท: FEEDBACK_ROLE_LABELS[it.userRole || it.user?.role || 'USER'] || it.userRole || '-',
      ชื่อผู้ประเมิน: it.isAnonymous
        ? 'ไม่ระบุชื่อ'
        : it.userName || (it.user ? formatUserName(it.user) : '-'),
      กิจกรรม: it.actionLabel || '-',
      หมวดหมู่: FEEDBACK_CATEGORY_LABELS[it.category] || it.category,
      คะแนนรวม_ดาว: it.rating,
      ความง่าย_ดาว: it.easeOfUseRating || '-',
      ความรวดเร็ว_ดาว: it.speedRating || '-',
      แท็กความรู้สึก: it.quickTags || '-',
      ความคิดเห็น: it.comment || '-',
      สถานะ: it.isEditedByAdmin ? 'ปรับปรุงโดย Admin' : 'ผู้ใช้งานส่งตรง',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'ผลประเมินความพึงพอใจ');
    XLSX.writeFile(
      wb,
      `system_satisfaction_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  if (authLoading || loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดผลประเมินความพึงพอใจ..."
        submessage="รวบรวมคะแนนดาวและการตั้งค่าการสุ่ม (เฉพาะผู้ดูแลระบบ)"
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-8 text-center shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          หน้าดูและแก้ไขผลประเมินความพึงพอใจของการใช้งานระบบสงวนสิทธิ์ไว้เฉพาะบัญชีผู้ดูแลระบบ (ADMIN) เท่านั้น
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับหน้าหลัก</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ADMIN ONLY • ระบบประเมินความพึงพอใจ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              ผลประเมินความพึงพอใจ & ตั้งค่าการสุ่มให้ดาว
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              ดูคะแนนความพึงพอใจจากผู้ใช้งาน ปรับแก้คะแนนดาว และตั้งค่าความถี่ในการสุ่มเด้งหลังทำรายการสำเร็จ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('lab-post-action-feedback', {
                    detail: {
                      forcePreview: true,
                      category: 'OVERALL',
                      actionLabel: 'ทดสอบหน้าต่างให้ดาว (Admin Preview)',
                      pagePath: '/admin/feedback',
                    },
                  })
                );
              }}
              className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>ทดสอบเด้งให้ดาว (Preview)</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>คะแนนเฉลี่ยรวม</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {summary.avgRating.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 5.00</span>
          </div>
          <div className="flex items-center gap-0.5 mt-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= Math.round(summary.avgRating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 dark:text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>จำนวนผู้ประเมินทั้งหมด</span>
            <MessageSquare className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-teal-600 dark:text-teal-400">
            {summary.totalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            พึงพอใจ 4–5 ดาว: <strong className="text-emerald-600">{summary.positiveRatePercent}%</strong> ({summary.positiveCount} รายการ)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>ความง่ายในการใช้งานเฉลี่ย</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {summary.avgEaseOfUse !== null ? summary.avgEaseOfUse.toFixed(2) : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ความรวดเร็วระบบ: <strong>{summary.avgSpeed !== null ? summary.avgSpeed.toFixed(2) : '-'}</strong> / 5
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>อัตราการสุ่มแสดงผลปัจจุบัน</span>
            <Sliders className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {configForm.isEnabled ? `${configForm.randomChancePercent}%` : 'ปิด'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {configForm.cooldownHoursAfterSubmit === 0
              ? 'ไม่มีระยะพัก (สุ่มทุกครั้งหลังทำรายการ)'
              : `พัก ${configForm.cooldownHoursAfterSubmit} ชม. หลังส่งคะแนน`}
          </div>
        </div>
      </div>

      {/* Distribution + Random Prompt Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Star Distribution & Breakdown */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <span>สัดส่วนคะแนน 1–5 ดาว และแยกตามบทบาท</span>
          </h3>

          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.starCounts[star] || 0;
              const pct = summary.totalCount > 0 ? Math.round((count / summary.totalCount) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setStarFilter(starFilter === String(star) ? 'ALL' : String(star))}
                    className="w-12 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer hover:text-amber-600"
                  >
                    <span>{star}</span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </button>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        star >= 4 ? 'bg-amber-400' : star === 3 ? 'bg-sky-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-16 text-right font-mono text-[11px] font-bold text-slate-500">
                    {count} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>

          {summary.byRole.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>คะแนนเฉลี่ยแยกตามกลุ่มผู้ใช้งาน</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {summary.byRole.map((r) => (
                  <div
                    key={r.role}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {FEEDBACK_ROLE_LABELS[r.role] || r.role}
                      </div>
                      <div className="text-[10px] text-slate-400">{r.count} ครั้ง</div>
                    </div>
                    <div className="font-mono font-black text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <span>{r.avgRating.toFixed(1)}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Admin Random Prompt Configuration */}
        <form
          onSubmit={handleSaveConfig}
          className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-600" />
                <span>ตั้งค่าระบบสุ่มให้ดาวหลังทำรายการสำเร็จ</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                หน้าต่างให้คะแนนจะสุ่มแสดงทันทีหลังจากนิสิตหรือผู้ใช้งานยื่นคำขอ/จองห้อง/เช็คเอาท์เสร็จสิ้น
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={configForm.isEnabled}
                onChange={(e) =>
                  setConfigForm((prev) => ({ ...prev, isEnabled: e.target.checked }))
                }
                className="w-4 h-4 accent-teal-600 rounded"
              />
              <span className={configForm.isEnabled ? 'text-teal-600' : 'text-slate-400'}>
                {configForm.isEnabled ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>โอกาสสุ่มเด้งหลังทำรายการ (%)</span>
                <span className="font-mono text-teal-600 dark:text-teal-400 font-black">
                  {configForm.randomChancePercent}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={configForm.randomChancePercent}
                onChange={(e) =>
                  setConfigForm((prev) => ({
                    ...prev,
                    randomChancePercent: Number(e.target.value),
                  }))
                }
                className="w-full accent-teal-600 cursor-pointer"
              />
              <div className="flex flex-wrap gap-1.5">
                {[20, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() =>
                      setConfigForm((prev) => ({ ...prev, randomChancePercent: pct }))
                    }
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                      configForm.randomChancePercent === pct
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {pct === 100 ? '100% (ทุกครั้ง)' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                ระยะเวลาพักหลังส่งคะแนนแล้ว (ชั่วโมง)
              </label>
              <input
                type="number"
                min={0}
                max={720}
                value={configForm.cooldownHoursAfterSubmit}
                onChange={(e) =>
                  setConfigForm((prev) => ({
                    ...prev,
                    cooldownHoursAfterSubmit: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
              <p className="text-[10px] text-slate-400">
                ตั้งเป็น <strong>0</strong> = ไม่พัก (สุ่มได้ทุกครั้งหลังทำรายการเสร็จ) • กดปิด/ไว้คราวหลังไม่มีการล็อกเวลา
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                หัวข้อบนหน้าต่างให้ดาว
              </label>
              <input
                type="text"
                value={configForm.promptTitle}
                onChange={(e) =>
                  setConfigForm((prev) => ({ ...prev, promptTitle: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ข้อความอธิบายรอง
              </label>
              <input
                type="text"
                value={configForm.promptSubtitle}
                onChange={(e) =>
                  setConfigForm((prev) => ({ ...prev, promptSubtitle: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>บันทึกการตั้งค่าการสุ่ม</span>
            </button>
          </div>
        </form>
      </div>

      {/* Feedback Table + Inline Admin Star Editor */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              รายการผลประเมินทั้งหมด ({filteredItems.length} รายการ)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              แอดมินสามารถคลิกเปลี่ยนจำนวนดาวในตารางได้โดยตรง หรือกดปุ่ม ✏️ แก้ไขเพื่อปรับรายละเอียดทั้งหมด
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, คอมเมนต์, กิจกรรม..."
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white w-48 sm:w-56"
              />
            </div>

            <select
              value={starFilter}
              onChange={(e) => setStarFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">ทุกคะแนนดาว</option>
              <option value="5">5 ดาว</option>
              <option value="4">4 ดาว</option>
              <option value="3">3 ดาว</option>
              <option value="2">2 ดาว</option>
              <option value="1">1 ดาว</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">ทุกหมวดหมู่</option>
              {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">ทุกบทบาท</option>
              {Object.entries(FEEDBACK_ROLE_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มผลประเมิน</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black">
                <th className="py-3.5 px-4">วันที่/เวลา</th>
                <th className="py-3.5 px-4">ผู้ประเมิน / บทบาท</th>
                <th className="py-3.5 px-4">รายการที่ทำ</th>
                <th className="py-3.5 px-4">คะแนนดาว (คลิกแก้ได้ทันที)</th>
                <th className="py-3.5 px-4">แท็ก & ความคิดเห็น</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ยังไม่มีข้อมูลการประเมินความพึงพอใจตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const rRole = item.userRole || item.user?.role || 'USER';
                  const displayName = item.isAnonymous
                    ? 'ไม่ระบุชื่อ (Anonymous)'
                    : item.userName || (item.user ? formatUserName(item.user) : 'ผู้ใช้งาน');

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <div className="font-bold">
                          {new Date(item.createdAt).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          น.
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {displayName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {FEEDBACK_ROLE_LABELS[rRole] || rRole}
                          </span>
                          {item.isEditedByAdmin && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              Admin แก้ไข
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {item.actionLabel || FEEDBACK_CATEGORY_LABELS[item.category] || item.category}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {FEEDBACK_CATEGORY_LABELS[item.category] || item.category}
                          {item.pagePath ? ` • ${item.pagePath}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((starNum) => (
                            <button
                              key={starNum}
                              type="button"
                              onClick={() => handleQuickStarEdit(item, starNum)}
                              title={`คลิกเพื่อปรับเป็น ${starNum} ดาว`}
                              className="p-0.5 hover:scale-125 transition-transform cursor-pointer"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  starNum <= item.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-200 dark:text-slate-700'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="ml-1.5 font-mono font-black text-amber-600 dark:text-amber-400">
                            {item.rating}.0
                          </span>
                        </div>
                        {(item.easeOfUseRating || item.speedRating) && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ง่าย: {item.easeOfUseRating || '-'} • เร็ว: {item.speedRating || '-'}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {item.quickTags && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {item.quickTags.split(',').map((t, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[10px] font-bold"
                              >
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-slate-600 dark:text-slate-300 break-words">
                          {item.comment || <span className="text-slate-400 italic">- ไม่มีข้อเสนอแนะ -</span>}
                        </p>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                            title="แก้ไขคะแนนและข้อมูล"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Admin Edit / Create Feedback */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingItem ? 'แก้ไขคะแนนและผลประเมิน (Admin)' : 'เพิ่มผลประเมินความพึงพอใจ (Admin)'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFeedbackModal} className="space-y-4">
              {/* Primary Stars */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center space-y-1.5">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  คะแนนความพึงพอใจหลัก (1–5 ดาว) *
                </div>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, rating: n }))}
                      className="p-1 hover:scale-120 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          n <= formState.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {formState.rating} ดาว — {RATING_LABELS[formState.rating]?.text}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ความง่ายในการใช้งาน (1–5)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={formState.easeOfUseRating}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        easeOfUseRating: Math.min(5, Math.max(0, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ความรวดเร็วของระบบ (1–5)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={formState.speedRating}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        speedRating: Math.min(5, Math.max(0, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    บทบาทผู้ประเมิน
                  </label>
                  <select
                    value={formState.userRole}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, userRole: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    {Object.entries(FEEDBACK_ROLE_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อผู้ประเมิน
                  </label>
                  <input
                    type="text"
                    value={formState.userName}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, userName: e.target.value }))
                    }
                    placeholder="เช่น นิสิตพยาบาล ปี 2"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่-เวลาประเมิน
                  </label>
                  <input
                    type="datetime-local"
                    value={formState.createdDate}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, createdDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  กิจกรรม / รายการที่ทำ
                </label>
                <input
                  type="text"
                  value={formState.actionLabel}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, actionLabel: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  แท็กความรู้สึก (คั่นด้วยจุลภาค)
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {FEEDBACK_QUICK_TAGS.map((tg) => (
                    <button
                      key={tg}
                      type="button"
                      onClick={() => {
                        const cur = formState.quickTags
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const next = cur.includes(tg)
                          ? cur.filter((x) => x !== tg)
                          : [...cur, tg];
                        setFormState((prev) => ({ ...prev, quickTags: next.join(', ') }));
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-700 cursor-pointer"
                    >
                      + {tg}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formState.quickTags}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, quickTags: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ความคิดเห็น / ข้อเสนอแนะ
                </label>
                <textarea
                  rows={2}
                  value={formState.comment}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.isAnonymous}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, isAnonymous: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-amber-600"
                />
                <span>ซ่อนชื่อผู้ประเมิน (ไม่ระบุชื่อ)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {savingItem ? 'กำลังบันทึก...' : 'บันทึกผลประเมิน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
