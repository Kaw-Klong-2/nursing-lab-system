'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  Sparkles,
  Star,
  Check,
  X,
  RefreshCw,
  Calendar,
  School,
  ArrowRight,
} from 'lucide-react';
import { formatTermName, AcademicTermType } from '@/lib/academicTerm';

interface AcademicTermItem {
  id: string;
  academicYear: string;
  term: AcademicTermType;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'ACTIVE' | 'UPCOMING' | 'CLOSED';
}

export default function AcademicTermsSettingsPage() {
  const { currentUser, isLoading } = useAuth();
  const [terms, setTerms] = useState<AcademicTermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    academicYear: '2569',
    term: 'FIRST' as AcademicTermType,
    startDate: '2026-07-01',
    endDate: '2026-10-31',
    isCurrent: false,
    status: 'ACTIVE' as 'ACTIVE' | 'UPCOMING' | 'CLOSED',
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/academic-terms');
      if (res.ok) {
        const data = await res.json();
        setTerms(data);
      }
    } catch (err) {
      console.error('Failed to load academic terms:', err);
      setFeedback({ type: 'error', message: 'ไม่สามารถโหลดข้อมูลภาคการศึกษาได้' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      academicYear: '2569',
      term: 'FIRST',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isCurrent: false,
      status: 'ACTIVE',
    });
    setModalOpen(true);
  };

  const openEditModal = (term: AcademicTermItem) => {
    setEditingId(term.id);
    setFormData({
      academicYear: term.academicYear,
      term: term.term,
      startDate: term.startDate.split('T')[0],
      endDate: term.endDate.split('T')[0],
      isCurrent: term.isCurrent,
      status: term.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const url = editingId ? `/api/academic-terms/${editingId}` : '/api/academic-terms';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      setFeedback({
        type: 'success',
        message: editingId ? 'อัปเดตภาคการศึกษาเรียบร้อยแล้ว' : 'เพิ่มภาคการศึกษาใหม่เรียบร้อยแล้ว',
      });
      setModalOpen(false);
      await fetchTerms();

      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'บันทึกไม่สำเร็จ' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetCurrent = async (id: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/academic-terms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCurrent: true, status: 'ACTIVE' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ไม่สามารถสลับภาคการศึกษาปัจจุบันได้');
      }

      setFeedback({ type: 'success', message: 'กำหนดเป็นภาคการศึกษาปัจจุบันเรียบร้อยแล้ว' });
      await fetchTerms();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ยืนยันการลบ "${name}" หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/academic-terms/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถลบภาคการศึกษาได้');
      }

      setFeedback({ type: 'success', message: 'ลบภาคการศึกษาเรียบร้อยแล้ว' });
      await fetchTerms();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const calculateDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const currentTerm = terms.find((t) => t.isCurrent);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
              กำหนดภาคการศึกษา (Academic Calendar)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            ตั้งค่าปฏิทินภาคการศึกษา (ภาคต้น / ภาคปลาย / ภาคฤดูร้อน) พร้อมวันเริ่มต้น-สิ้นสุด สำหรับควบคุมการเปิดสอนรายวิชา การจัดสรรครุภัณฑ์ และการยืม-คืนของนิสิตทั้งระบบ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTerms}
            disabled={loading}
            className="p-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มภาคการศึกษา</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl border text-sm animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Current Active Term Banner */}
      {currentTerm ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 sm:p-8 rounded-3xl shadow-md">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>ภาคการศึกษาปัจจุบัน (ACTIVE TERM)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {currentTerm.name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-emerald-100 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-200" />
                  <span>
                    {formatThaiDate(currentTerm.startDate)} – {formatThaiDate(currentTerm.endDate)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-200" />
                  <span>
                    {calculateDaysRemaining(currentTerm.endDate) > 0
                      ? `เหลือเวลาอีก ${calculateDaysRemaining(currentTerm.endDate)} วันจะสิ้นสุดภาคเรียน`
                      : 'สิ้นสุดภาคการศึกษาแล้ว'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => openEditModal(currentTerm)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs sm:text-sm font-medium transition"
              >
                แก้ไขกำหนดการ
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-6 rounded-3xl text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-sm">ยังไม่ได้กำหนดภาคการศึกษาปัจจุบัน</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                กรุณาคลิกปุ่ม &quot;ตั้งเป็นภาคปัจจุบัน&quot; ที่ภาคการศึกษาที่ต้องการใช้งาน
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Academic Terms List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              รายการภาคการศึกษาทั้งหมด ({terms.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              จัดกลุ่มตามปีการศึกษาและภาคเรียน
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">กำลังโหลดข้อมูล...</div>
        ) : terms.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">ยังไม่มีรายการภาคการศึกษาในระบบ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">ปีการศึกษา</th>
                  <th className="py-3 px-4">ภาคการศึกษา</th>
                  <th className="py-3 px-4">วันที่เริ่มต้น</th>
                  <th className="py-3 px-4">วันที่สิ้นสุด</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {terms.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition ${
                      t.isCurrent ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                      {t.academicYear}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {formatTermName(t.term)}
                        </span>
                        {t.isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 rounded-full text-[10px] font-bold">
                            <Star className="w-3 h-3 fill-emerald-600" />
                            ภาคปัจจุบัน
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {formatThaiDate(t.startDate)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {formatThaiDate(t.endDate)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : t.status === 'UPCOMING'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {t.status === 'ACTIVE' ? 'เปิดใช้งาน' : t.status === 'UPCOMING' ? 'กำลังจะมาถึง' : 'ปิดภาคเรียน'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!t.isCurrent && (
                          <button
                            onClick={() => handleSetCurrent(t.id)}
                            disabled={saving}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-lg transition"
                            title="ตั้งเป็นภาคการศึกษาปัจจุบัน"
                          >
                            ตั้งเป็นภาคปัจจุบัน
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!t.isCurrent && (
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Term */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'แก้ไขกำหนดการภาคการศึกษา' : 'เพิ่มภาคการศึกษาใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ปีการศึกษา *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 2569"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ภาคการศึกษา *
                  </label>
                  <select
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value as AcademicTermType })}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                  >
                    <option value="FIRST">ภาคต้น</option>
                    <option value="SECOND">ภาคปลาย</option>
                    <option value="SUMMER">ภาคฤดูร้อน</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่เริ่มต้น * (เปิดเทอม)
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่สิ้นสุด * (ปิดเทอม)
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  สถานะการดำเนินงาน
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                >
                  <option value="ACTIVE">เปิดใช้งาน (ACTIVE)</option>
                  <option value="UPCOMING">กำลังจะมาถึง (UPCOMING)</option>
                  <option value="CLOSED">ปิดภาคการศึกษาแล้ว (CLOSED)</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <input
                    type="checkbox"
                    checked={formData.isCurrent}
                    onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      ตั้งเป็นภาคการศึกษาปัจจุบัน (Set as Current Active Term)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ระบบและหน้าจอทั้งหมดจะใช้วันที่และภาคเรียนนี้เป็นค่าตั้งต้นอัตโนมัติ
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
