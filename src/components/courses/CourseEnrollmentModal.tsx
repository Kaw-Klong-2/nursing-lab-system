'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Users,
  UserPlus,
  Search,
  Trash2,
  Upload,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Loader2,
  UserCheck,
  ClipboardPaste,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { formatUserName } from '@/lib/user-utils';
import { formatTermName } from '@/lib/academicTerm';

interface EnrolledItem {
  id: string;
  userId: string;
  enrolledAt: string;
  cohort: string;
  user: {
    id: string;
    prefix?: string | null;
    name: string;
    email: string;
    studentId?: string | null;
    department?: string | null;
    status?: string;
  };
}

interface SystemStudent {
  id: string;
  prefix?: string | null;
  name: string;
  email: string;
  studentId?: string | null;
  department?: string | null;
  role: string;
  status?: string;
}

interface CourseSummary {
  id: string;
  code: string;
  name: string;
  semester: string;
  academicYear: string;
  studentCount: number;
  enrolledCount?: number;
  status?: string;
}

interface CourseEnrollmentModalProps {
  isOpen: boolean;
  course: CourseSummary | null;
  allCourses: CourseSummary[];
  canManage: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function getCohortPrefix(studentId?: string | null): string {
  const cleaned = (studentId || '').trim().toLowerCase();
  if (!cleaned) return 'ไม่ระบุรุ่น';
  const match = cleaned.match(/^([a-z]?\d{2})/);
  return match ? match[1] : 'อื่นๆ';
}

function parseStudentIdsFromText(text: string): string[] {
  const tokens = text
    .split(/[\r\n,;\t\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && /\d{4,}/.test(t));
  return Array.from(new Set(tokens));
}

export default function CourseEnrollmentModal({
  isOpen,
  course,
  allCourses,
  canManage,
  onClose,
  onUpdated,
}: CourseEnrollmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrolledItem[]>([]);
  const [allStudents, setAllStudents] = useState<SystemStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Left panel: Enrolled list filters & bulk remove
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [enrolledCohort, setEnrolledCohort] = useState<string>('ALL');
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());

  // Right panel: Add tabs ('select' | 'bulk' | 'copy')
  const [activeTab, setActiveTab] = useState<'select' | 'bulk' | 'copy'>('select');

  // Tab 1: Select from system
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCohort, setPickerCohort] = useState<string>('ALL');
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());

  // Tab 2: Bulk paste / Excel
  const [bulkText, setBulkText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 3: Copy from another course
  const [sourceCourseId, setSourceCourseId] = useState('');

  // Action feedback state
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    notFoundStudentIds?: string[];
  } | null>(null);

  const fetchEnrollments = async (courseId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments`);
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.enrollments || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: 'error', message: err.error || 'ไม่สามารถโหลดรายชื่อนิสิตได้' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/users?role=USER');
      if (res.ok) {
        const data: SystemStudent[] = await res.json();
        const activeOnly = data.filter((u) => !u.status || u.status === 'ACTIVE');
        activeOnly.sort((a, b) =>
          (a.studentId || a.name || '').localeCompare(b.studentId || b.name || '', 'th')
        );
        setAllStudents(activeOnly);
      }
    } catch {
      // ignore silently, handled by empty state
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !course) return;
    setFeedback(null);
    setSelectedToRemove(new Set());
    setSelectedToAdd(new Set());
    setEnrolledSearch('');
    setEnrolledCohort('ALL');
    setPickerSearch('');
    setPickerCohort('ALL');
    setBulkText('');
    setUploadedFileName(null);
    setSourceCourseId('');
    fetchEnrollments(course.id);
    if (canManage) {
      fetchSystemStudents();
    }
  }, [isOpen, course?.id, canManage]);

  const enrolledUserIdSet = useMemo(
    () => new Set(enrollments.map((e) => e.userId)),
    [enrollments]
  );

  const enrolledCohorts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of enrollments) {
      const c = item.cohort || getCohortPrefix(item.user.studentId);
      map[c] = (map[c] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [enrollments]);

  const filteredEnrolled = useMemo(() => {
    const q = enrolledSearch.trim().toLowerCase();
    return enrollments.filter((item) => {
      const c = item.cohort || getCohortPrefix(item.user.studentId);
      if (enrolledCohort !== 'ALL' && c !== enrolledCohort) return false;
      if (!q) return true;
      return (
        (item.user.studentId || '').toLowerCase().includes(q) ||
        item.user.name.toLowerCase().includes(q) ||
        (item.user.email || '').toLowerCase().includes(q)
      );
    });
  }, [enrollments, enrolledCohort, enrolledSearch]);

  // Available (not yet enrolled) students in system
  const availableStudents = useMemo(
    () => allStudents.filter((s) => !enrolledUserIdSet.has(s.id)),
    [allStudents, enrolledUserIdSet]
  );

  const pickerCohorts = useMemo(() => {
    const map: Record<string, { total: number; available: number }> = {};
    for (const s of allStudents) {
      const c = getCohortPrefix(s.studentId);
      if (!map[c]) map[c] = { total: 0, available: 0 };
      map[c].total += 1;
      if (!enrolledUserIdSet.has(s.id)) {
        map[c].available += 1;
      }
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allStudents, enrolledUserIdSet]);

  const filteredAvailable = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return availableStudents.filter((s) => {
      const c = getCohortPrefix(s.studentId);
      if (pickerCohort !== 'ALL' && c !== pickerCohort) return false;
      if (!q) return true;
      return (
        (s.studentId || '').toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
    });
  }, [availableStudents, pickerCohort, pickerSearch]);

  const parsedBulkIds = useMemo(() => parseStudentIdsFromText(bulkText), [bulkText]);

  const copyCandidateCourses = useMemo(
    () => allCourses.filter((c) => course && c.id !== course.id),
    [allCourses, course]
  );

  if (!isOpen || !course) return null;

  const toggleSelectToAdd = (uid: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleSelectAllFilteredAvailable = () => {
    const allFilteredSelected =
      filteredAvailable.length > 0 &&
      filteredAvailable.every((s) => selectedToAdd.has(s.id));

    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredAvailable.forEach((s) => next.delete(s.id));
      } else {
        filteredAvailable.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const toggleSelectToRemove = (uid: string) => {
    setSelectedToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleToggleSelectAllEnrolled = () => {
    const allChecked =
      filteredEnrolled.length > 0 &&
      filteredEnrolled.every((e) => selectedToRemove.has(e.userId));
    setSelectedToRemove((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        filteredEnrolled.forEach((e) => next.delete(e.userId));
      } else {
        filteredEnrolled.forEach((e) => next.add(e.userId));
      }
      return next;
    });
  };

  const handleAddBySelect = async () => {
    if (selectedToAdd.size === 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/courses/${course.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'select',
          userIds: Array.from(selectedToAdd),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message });
        setSelectedToAdd(new Set());
        await fetchEnrollments(course.id);
        onUpdated();
      } else {
        setFeedback({ type: 'error', message: data.error || 'ไม่สามารถเพิ่มรายชื่อนิสิตได้' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const extracted: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        for (const row of rows) {
          if (!Array.isArray(row)) continue;
          for (const cell of row) {
            if (cell === null || cell === undefined) continue;
            const str = String(cell).trim();
            // จับรูปแบบรหัสนิสิต เช่น b6811700017 หรือ 6811700017 (ตัวเลข 8-12 หลัก นำหน้าด้วย b หรือไม่ก็ได้)
            if (/^[a-zA-Z]?\d{8,12}$/.test(str)) {
              extracted.push(str);
            }
          }
        }
      }

      const uniqueExtracted = Array.from(new Set(extracted));
      if (uniqueExtracted.length === 0) {
        setFeedback({
          type: 'warning',
          message: `ไม่พบรหัสนิสิตในไฟล์ "${file.name}" กรุณาตรวจสอบว่าคอลัมน์รหัสนิสิตเป็นรูปแบบ เช่น b6811700017 หรือ 6811700017`,
        });
      } else {
        setUploadedFileName(file.name);
        setBulkText((prev) => {
          const merged = Array.from(new Set([...parseStudentIdsFromText(prev), ...uniqueExtracted]));
          return merged.join('\n');
        });
        setFeedback({
          type: 'success',
          message: `อ่านรหัสนิสิตจากไฟล์ "${file.name}" ได้ ${uniqueExtracted.length} รหัส — ตรวจสอบรายการด้านล่างแล้วกด "นำเข้ารายชื่อนิสิต"`,
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'ไม่สามารถอ่านไฟล์ Excel/CSV นี้ได้ กรุณาตรวจสอบรูปแบบไฟล์' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadSampleExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('รายชื่อนิสิต');
    ws.columns = [
      { header: 'รหัสนิสิต', key: 'studentId', width: 20 },
      { header: 'ชื่อ-นามสกุล (ไม่บังคับ)', key: 'name', width: 30 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.addRow({ studentId: 'b6811700017', name: 'ตัวอย่าง นิสิตคนที่ 1' });
    ws.addRow({ studentId: 'b6811700025', name: 'ตัวอย่าง นิสิตคนที่ 2' });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_course_students_${course.code}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportEnrolledExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('รายชื่อนิสิต');
    ws.columns = [
      { header: 'ลำดับ', key: 'no', width: 8 },
      { header: 'รหัสนิสิต', key: 'studentId', width: 18 },
      { header: 'ชื่อ-นามสกุล', key: 'name', width: 32 },
      { header: 'อีเมล', key: 'email', width: 30 },
      { header: 'รุ่น', key: 'cohort', width: 12 },
    ];
    ws.getRow(1).font = { bold: true };
    enrollments.forEach((item, idx) => {
      ws.addRow({
        no: idx + 1,
        studentId: item.user.studentId || '-',
        name: formatUserName(item.user),
        email: item.user.email,
        cohort: item.cohort,
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `รายชื่อนิสิต_${course.code}_${course.academicYear}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddByBulk = async () => {
    if (parsedBulkIds.length === 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/courses/${course.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bulk',
          studentIds: parsedBulkIds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const notFound: string[] = data.notFoundStudentIds || [];
        setFeedback({
          type: notFound.length > 0 ? 'warning' : 'success',
          message: `${data.message}${data.alreadyEnrolledCount > 0 ? ` (มีชื่ออยู่แล้ว ${data.alreadyEnrolledCount} คน)` : ''}${notFound.length > 0 ? ` • ไม่พบในระบบ ${notFound.length} รหัส` : ''}`,
          notFoundStudentIds: notFound,
        });
        if (data.addedCount > 0 && notFound.length === 0) {
          setBulkText('');
          setUploadedFileName(null);
        }
        await fetchEnrollments(course.id);
        onUpdated();
      } else {
        setFeedback({ type: 'error', message: data.error || 'ไม่สามารถนำเข้ารายชื่อนิสิตได้' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddByCopy = async () => {
    if (!sourceCourseId) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/courses/${course.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'copy',
          sourceCourseId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `${data.message}${data.alreadyEnrolledCount > 0 ? ` (ข้ามที่มีชื่ออยู่แล้ว ${data.alreadyEnrolledCount} คน)` : ''}`,
        });
        await fetchEnrollments(course.id);
        onUpdated();
      } else {
        setFeedback({ type: 'error', message: data.error || 'ไม่สามารถคัดลอกรายชื่อนิสิตได้' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUsers = async (payload: {
    userId?: string;
    userIds?: string[];
    clearAll?: boolean;
  }) => {
    if (payload.clearAll) {
      if (!confirm(`ยืนยันการล้างรายชื่อนิสิตทั้งหมด (${enrollments.length} คน) ออกจากรายวิชา ${course.code}?`)) {
        return;
      }
    } else if (payload.userIds && payload.userIds.length > 1) {
      if (!confirm(`ยืนยันการลบนิสิตที่เลือก ${payload.userIds.length} คน ออกจากรายวิชา ${course.code}?`)) {
        return;
      }
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/courses/${course.id}/enrollments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message });
        setSelectedToRemove(new Set());
        await fetchEnrollments(course.id);
        onUpdated();
      } else {
        setFeedback({ type: 'error', message: data.error || 'ไม่สามารถลบรายชื่อนิสิตได้' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-50/80 to-emerald-50/40 dark:from-teal-950/40 dark:to-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg bg-teal-600 text-white font-mono text-xs font-bold">
                  {course.code}
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  {canManage ? 'จัดการรายชื่อนิสิตในรายวิชา' : 'รายชื่อนิสิตที่ลงทะเบียนในรายวิชา'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <UserCheck className="w-3.5 h-3.5" />
                  ลงทะเบียนแล้ว {enrollments.length} คน
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                {course.name} • {formatTermName(course.semester)}/{course.academicYear} (ซิงก์ตัวเลขจำนวนนิสิตอัตโนมัติ)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {enrollments.length > 0 && (
              <button
                type="button"
                onClick={handleExportEnrolledExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-slate-700 transition cursor-pointer"
                title="ส่งออกรายชื่อนิสิตเป็นไฟล์ Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">ส่งออก Excel</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mx-6 mt-4 px-4 py-3 rounded-2xl border text-xs flex flex-col gap-1.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : feedback.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 font-bold">
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {feedback.notFoundStudentIds && feedback.notFoundStudentIds.length > 0 && (
              <div className="pl-6 text-[11px] leading-relaxed">
                <span className="font-bold">รหัสนิสิตที่ยังไม่พบบัญชีในระบบ: </span>
                <span className="font-mono break-all">
                  {feedback.notFoundStudentIds.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Main Body */}
        <div
          className={`flex-1 overflow-y-auto p-6 grid gap-6 ${
            canManage ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
          }`}
        >
          {/* Left Panel: Enrolled Roster */}
          <div className={`${canManage ? 'lg:col-span-6' : ''} flex flex-col min-h-[380px] bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                รายชื่อนิสิตในรายวิชา ({filteredEnrolled.length}
                {filteredEnrolled.length !== enrollments.length ? ` / ${enrollments.length}` : ''} คน)
              </h4>
              {canManage && enrollments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {selectedToRemove.size > 0 && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRemoveUsers({ userIds: Array.from(selectedToRemove) })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      ลบที่เลือก ({selectedToRemove.size})
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRemoveUsers({ clearAll: true })}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer disabled:opacity-50"
                  >
                    ล้างทั้งหมด
                  </button>
                </div>
              )}
            </div>

            {/* Cohort Filter Chips + Search */}
            <div className="space-y-2 mb-3">
              {enrolledCohorts.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEnrolledCohort('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      enrolledCohort === 'ALL'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    ทั้งหมด ({enrollments.length})
                  </button>
                  {enrolledCohorts.map(([cohort, count]) => (
                    <button
                      key={cohort}
                      type="button"
                      onClick={() => setEnrolledCohort(cohort)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        enrolledCohort === cohort
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      รุ่น {cohort} ({count})
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={enrolledSearch}
                  onChange={(e) => setEnrolledSearch(e.target.value)}
                  placeholder="ค้นหารหัสนิสิต หรือ ชื่อ-นามสกุล..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>
            </div>

            {/* Roster List */}
            <div className="flex-1 overflow-y-auto max-h-[420px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                  กำลังโหลดรายชื่อนิสิต...
                </div>
              ) : filteredEnrolled.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
                  <Users className="w-8 h-8 mx-auto opacity-40" />
                  <p className="font-bold text-slate-500 dark:text-slate-400">
                    {enrollments.length === 0
                      ? 'ยังไม่มีรายชื่อนิสิตในรายวิชานี้'
                      : 'ไม่พบนิสิตที่ตรงกับเงื่อนไขการค้นหา'}
                  </p>
                  {enrollments.length === 0 && canManage && (
                    <p>เลือกเพิ่มนิสิตจากแถบด้านขวา (เลือกตามรุ่น / วางรหัส-Excel / คัดลอกจากวิชาอื่น)</p>
                  )}
                </div>
              ) : (
                <>
                  {canManage && (
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 sticky top-0 z-10">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={
                            filteredEnrolled.length > 0 &&
                            filteredEnrolled.every((e) => selectedToRemove.has(e.userId))
                          }
                          onChange={handleToggleSelectAllEnrolled}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        เลือกทั้งหมดในหน้านี้ ({filteredEnrolled.length} คน)
                      </label>
                      <span>การจัดการ</span>
                    </div>
                  )}
                  {filteredEnrolled.map((item, idx) => (
                    <div
                      key={item.id}
                      className="px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {canManage ? (
                          <input
                            type="checkbox"
                            checked={selectedToRemove.has(item.userId)}
                            onChange={() => toggleSelectToRemove(item.userId)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400 w-5 text-right shrink-0">
                            {idx + 1}.
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.user.studentId && (
                              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900">
                                {item.user.studentId}
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {formatUserName(item.user)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {item.user.email}
                          </div>
                        </div>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleRemoveUsers({ userId: item.userId })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer shrink-0 disabled:opacity-40"
                          title="ลบนิสิตออกจากรายวิชา"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Right Panel: Add Students (3 Tabs) */}
          {canManage && (
            <div className="lg:col-span-6 flex flex-col min-h-[380px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  เพิ่มนิสิตเข้ารายวิชา
                </h4>
              </div>

              {/* 3-Method Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('select')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'select'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">เลือกจากระบบ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bulk')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'bulk'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">วางรหัส / Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('copy')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'copy'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">คัดลอกจากวิชาอื่น</span>
                </button>
              </div>

              {/* TAB 1: Select from System */}
              {activeTab === 'select' && (
                <div className="flex-1 flex flex-col">
                  {/* Cohort quick filters */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                    <button
                      type="button"
                      onClick={() => setPickerCohort('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        pickerCohort === 'ALL'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      ทุกรุ่นที่ยังไม่ลง ({availableStudents.length})
                    </button>
                    {pickerCohorts.map(([cohort, info]) => (
                      <button
                        key={cohort}
                        type="button"
                        onClick={() => setPickerCohort(cohort)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          pickerCohort === cohort
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        รุ่น {cohort} ({info.available}/{info.total})
                      </button>
                    ))}
                  </div>

                  {/* Search + Select All Filtered */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder="ค้นหารหัสนิสิตหรือชื่อ..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={filteredAvailable.length === 0}
                      onClick={handleSelectAllFilteredAvailable}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer disabled:opacity-40 whitespace-nowrap"
                    >
                      {filteredAvailable.length > 0 &&
                      filteredAvailable.every((s) => selectedToAdd.has(s.id))
                        ? 'ยกเลิกเลือกกลุ่มนี้'
                        : `เลือกทั้งกลุ่ม (${filteredAvailable.length})`}
                    </button>
                  </div>

                  {/* Student Checklist */}
                  <div className="flex-1 overflow-y-auto max-h-[300px] rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 mb-3">
                    {loadingStudents ? (
                      <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        กำลังโหลดรายชื่อนิสิตในระบบ...
                      </div>
                    ) : filteredAvailable.length === 0 ? (
                      <div className="py-10 px-4 text-center text-xs text-slate-400 dark:text-slate-500">
                        {availableStudents.length === 0
                          ? 'นิสิตทุกคนในระบบลงทะเบียนในรายวิชานี้ครบแล้ว'
                          : 'ไม่พบนิสิตที่ยังไม่ลงทะเบียนตามตัวกรองนี้'}
                      </div>
                    ) : (
                      filteredAvailable.map((s) => {
                        const checked = selectedToAdd.has(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`px-3 py-2 flex items-center gap-2.5 cursor-pointer transition ${
                              checked
                                ? 'bg-teal-50/70 dark:bg-teal-950/30'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelectToAdd(s.id)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {s.studentId && (
                                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {s.studentId}
                                  </span>
                                )}
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                                  {formatUserName(s)}
                                </span>
                              </div>
                            </div>
                            {checked && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                          </label>
                        );
                      })
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={submitting || selectedToAdd.size === 0}
                    onClick={handleAddBySelect}
                    className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>เพิ่มนิสิตที่เลือก ({selectedToAdd.size} คน)</span>
                  </button>
                </div>
              )}

              {/* TAB 2: Bulk Paste / Excel Import */}
              {activeTab === 'bulk' && (
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <div className="text-xs min-w-0">
                        <div className="font-bold text-slate-700 dark:text-slate-200 truncate">
                          {uploadedFileName
                            ? `อัปโหลดแล้ว: ${uploadedFileName}`
                            : 'อัปโหลดไฟล์ Excel (.xlsx / .csv) รายชื่อนิสิต'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          ระบบจะสแกนหาคอลัมน์รหัสนิสิตให้อัตโนมัติ (รองรับทั้ง b68... และ 68...)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleDownloadSampleExcel}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        ตัวอย่าง
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        เลือกไฟล์
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        หรือวางรหัสนิสิตหลายบรรทัด (คั่นด้วยขึ้นบรรทัดใหม่, จุลภาค หรือเว้นวรรค)
                      </label>
                      <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                        ตรวจพบ {parsedBulkIds.length} รหัส
                      </span>
                    </div>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      rows={9}
                      placeholder={'b6811700017\nb6811700025\nb6811700033\n...'}
                      className="w-full flex-1 p-3 rounded-xl font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={submitting || parsedBulkIds.length === 0}
                    onClick={handleAddByBulk}
                    className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>นำเข้ารายชื่อนิสิต ({parsedBulkIds.length} รหัส)</span>
                  </button>
                </div>
              )}

              {/* TAB 3: Copy from Another Course */}
              {activeTab === 'copy' && (
                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      คัดลอกรายชื่อนิสิตทั้งหมดจากรายวิชาอื่นที่มีผู้เรียนชุดเดียวกันมาลงทะเบียนใน{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {course.code} {course.name}
                      </strong>{' '}
                      (นิสิตที่มีชื่ออยู่แล้วในวิชานี้จะถูกข้ามโดยอัตโนมัติ ไม่เกิดข้อมูลซ้ำ)
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        เลือกรายวิชาต้นทาง
                      </label>
                      <select
                        value={sourceCourseId}
                        onChange={(e) => setSourceCourseId(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      >
                        <option value="">-- กรุณาเลือกรายวิชาที่ต้องการคัดลอกรายชื่อ --</option>
                        {copyCandidateCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            [{c.code}] {c.name} ({formatTermName(c.semester)}/{c.academicYear}) — ผู้เรียน{' '}
                            {c.enrolledCount ?? 0} คน
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={submitting || !sourceCourseId}
                    onClick={handleAddByCopy}
                    className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>คัดลอกรายชื่อนิสิตเข้าวิชานี้</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
