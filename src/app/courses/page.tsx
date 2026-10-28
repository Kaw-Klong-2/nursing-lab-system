'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart3,
  BookOpen,
  Coins,
  Download,
  Printer,
  Plus,
  Layers,
  Calendar,
  User,
  Users,
  CheckCircle2,
  ChevronRight,
  PieChart,
  FileSpreadsheet,
  Building,
  ShieldAlert,
  Edit3,
  Power,
  Search,
  Filter,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatUserName, formatTeacherName, getExporterSignatureInfo } from '@/lib/user-utils';
import { formatTermName, toLegacySemesterCode } from '@/lib/academicTerm';
import { ORG_CONFIG } from '@/lib/constants/organization';

export default function CoursesPage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin, isTeacher } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [isCustomInstructor, setIsCustomInstructor] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<any>(null);

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | '1' | '2' | '3' | '4'>('ALL');
  const [toggleSubmitting, setToggleSubmitting] = useState(false);

  // New Course Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCourse, setNewCourse] = useState<{
    code: string;
    name: string;
    targetYear: number | null;
    semester: string;
    academicYear: string;
    instructorName: string;
    description: string;
    allocatedBudget: number;
    studentCount: number;
    status: string;
  }>({
    code: '',
    name: '',
    targetYear: 1,
    semester: '1',
    academicYear: '2569',
    instructorName: '',
    description: '',
    allocatedBudget: 50000,
    studentCount: 0,
    status: 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit Course Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCourse, setEditCourse] = useState<{
    id: string;
    code: string;
    name: string;
    targetYear: number | null;
    semester: string;
    academicYear: string;
    instructorName: string;
    description: string;
    allocatedBudget: number;
    studentCount: number;
    status: string;
  } | null>(null);
  const [isEditCustomInstructor, setIsEditCustomInstructor] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchCourses = async () => {
    try {
      const [coursesRes, usersRes] = await Promise.all([
        fetch('/api/courses?status=all'),
        fetch('/api/users?role=INSTRUCTOR'),
      ]);
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data);
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const cid = urlParams.get('courseId') || urlParams.get('id');
          if (cid && data.some((c: any) => c.id === cid)) {
            setSelectedCourseId(cid);
          } else if (data.length > 0 && !selectedCourseId) {
            setSelectedCourseId(data[0].id);
          }
        } else if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].id);
        }
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setInstructors(uData);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'USER' && !isTeacher) {
      router.push('/');
      return;
    }
    fetchCourses();

    // Fetch current active academic term
    fetch('/api/academic-terms?current=true')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.academicYear) {
          setCurrentTerm(data);
          setNewCourse((prev) => ({
            ...prev,
            academicYear: data.academicYear,
            semester: toLegacySemesterCode(data.term),
          }));
        }
      })
      .catch((err) => console.error('Failed to fetch current term:', err));
  }, [currentUser, router, isTeacher]);

  if (currentUser?.role === 'USER' && !isTeacher) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center max-w-md mx-auto space-y-3 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">ไม่มีสิทธิ์เข้าถึงหน้านี้</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          หน้ารายงานต้นทุนวัสดุตามรายวิชาสงวนไว้สำหรับเจ้าหน้าที่ คณาจารย์ผู้สอน และผู้บริหารเท่านั้น
        </p>
      </div>
    );
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name || !newCourse.instructorName) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCourse,
          instructorName: formatTeacherName(newCourse.instructorName),
        }),
      });
      if (res.ok) {
        setShowNewModal(false);
        setNewCourse({
          code: '',
          name: '',
          targetYear: 1,
          semester: currentTerm ? toLegacySemesterCode(currentTerm.term) : '1',
          academicYear: currentTerm?.academicYear || '2569',
          instructorName: '',
          description: '',
          allocatedBudget: 50000,
          studentCount: 0,
          status: 'ACTIVE',
        });
        setIsCustomInstructor(false);
        fetchCourses();
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกรายวิชา');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (course: any) => {
    if (!course) return;
    const formattedInst = formatTeacherName(course.instructorName);
    const inList = instructors.some(
      (inst) => formatTeacherName(inst) === formattedInst || inst.name === course.instructorName
    );
    setEditCourse({
      id: course.id,
      code: course.code,
      name: course.name,
      targetYear:
        course.targetYear !== undefined && course.targetYear !== null
          ? Number(course.targetYear)
          : null,
      semester: course.semester || '1',
      academicYear: course.academicYear || '2569',
      instructorName: formattedInst,
      description: course.description || '',
      allocatedBudget: course.allocatedBudget || 0,
      studentCount: course.studentCount || 0,
      status: course.status || 'ACTIVE',
    });
    setIsEditCustomInstructor(!inList);
    setShowEditModal(true);
  };

  // Update Course Submit Handler
  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourse || !editCourse.code.trim() || !editCourse.name.trim() || !editCourse.instructorName.trim()) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${editCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editCourse,
          instructorName: formatTeacherName(editCourse.instructorName),
          studentCount: Number(editCourse.studentCount) >= 0 ? Math.round(Number(editCourse.studentCount)) : 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditModal(false);
        fetchCourses();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการแก้ไขรายวิชา');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Quick Toggle Open/Close Course Status Handler
  const handleToggleStatus = async (course: any) => {
    if (!course) return;
    const isCurrentlyActive = (course.status || 'ACTIVE') === 'ACTIVE';
    const nextStatus = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = isCurrentlyActive ? 'ปิดรายวิชา' : 'เปิดใช้งานรายวิชา';

    const confirmMsg = isCurrentlyActive
      ? `คุณแน่ใจหรือไม่ว่าต้องการ "${actionLabel}" [${course.code}] ${course.name}?\n\n• เมื่อปิดรายวิชาแล้ว นิสิตจะไม่สามารถเลือกรายวิชานี้ในการขอเบิก/ยืมใหม่ได้\n• ข้อมูล ประวัติ และรายงานเดิมทั้งหมดจะยังคงอยู่ครบถ้วน`
      : `ยืนยันการ "${actionLabel}" [${course.code}] ${course.name} ให้กลับมาเปิดรับคำขออีกครั้ง?`;

    if (!confirm(confirmMsg)) return;

    setToggleSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchCourses();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะรายวิชา');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setToggleSubmitting(false);
    }
  };

  const filteredCourses = courses.filter((c: any) => {
    const courseStatus = c.status || 'ACTIVE';
    const matchesStatus =
      statusFilter === 'ALL' || courseStatus === statusFilter;
    const matchesYear =
      yearFilter === 'ALL' ||
      (c.targetYear ? String(c.targetYear) === yearFilter : false);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.instructorName?.toLowerCase().includes(q);
    return matchesStatus && matchesYear && matchesSearch;
  });

  const activeCount = courses.filter((c: any) => (c.status || 'ACTIVE') === 'ACTIVE').length;
  const inactiveCount = courses.filter((c: any) => c.status === 'INACTIVE').length;

  const selectedCourse = courses.find((c: any) => c.id === selectedCourseId) || filteredCourses[0] || courses[0];

  // Export Cost Report as formatted Excel (.xlsx)
  const handleExportExcel = () => {
    if (!selectedCourse) return;

    const termThai = formatTermName(selectedCourse.semester);
    const dateStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const exporterInfo = getExporterSignatureInfo(currentUser);
    const coordinatorName = selectedCourse.instructorName
      ? formatTeacherName(selectedCourse.instructorName)
      : 'อาจารย์ผู้ประสานงานรายวิชา';

    const items = selectedCourse.itemsUsed || [];
    const totalExpense = Number((selectedCourse.totalExpense || 0).toFixed(2));
    const costPerStudent = Number((selectedCourse.costPerStudent || 0).toFixed(2));
    const studentCount = Number(selectedCourse.studentCount || 0);

    const rows: any[][] = [
      ['', ORG_CONFIG.FULL_ORG_NAME],
      ['', 'รายงานสรุปการใช้วัสดุสิ้นเปลืองและต้นทุนประจำรายวิชา'],
      ['', `ข้อมูล ณ วันที่: ${dateStr} น.`],
      [],
      ['', '', 'รหัสวิชา', selectedCourse.code],
      ['', '', 'ชื่อวิชา', selectedCourse.name],
      ['', '', 'ภาคเรียน/ปีการศึกษา', `${termThai}/${selectedCourse.academicYear}`],
      ['', '', 'จำนวนนิสิต', studentCount, 'คน'],
      ['', '', 'ยอดใช้วัสดุจริงรวม', totalExpense, 'บาท'],
      ['', '', 'ต้นทุนเฉลี่ยต่อนิสิต', costPerStudent, 'บาท/คน'],
      [],
      ['', 'ลำดับ', 'รหัสวัสดุ', 'รายการวัสดุสิ้นเปลือง', 'จำนวนที่ใช้', 'หน่วยนับ', 'รวม (บาท)'],
    ];

    const dataStartRow = 13; // 1-based index in Excel
    items.forEach((item: any, idx: number) => {
      const itemCost = Number((item.totalCost || 0).toFixed(2));
      rows.push([
        '',
        idx + 1,
        item.code,
        item.name,
        item.totalQuantity,
        item.unit,
        itemCost,
      ]);
    });

    const dataEndRow = dataStartRow + items.length - 1;

    // Total Summary Row with Excel formula (if items exist)
    if (items.length > 0) {
      rows.push([
        '',
        '',
        '',
        'รวมมูลค่าวัสดุสิ้นเปลืองที่ใช้ทั้งสิ้น',
        '',
        '',
        { f: `SUM(G${dataStartRow}:G${dataEndRow})` },
      ]);
    } else {
      rows.push(['', '', '', 'รวมมูลค่าวัสดุสิ้นเปลืองที่ใช้ทั้งสิ้น', '', '', 0]);
    }

    rows.push([]);
    rows.push(['', 'ผู้รายงาน']);
    rows.push([]);
    rows.push(['', '', 'ลงชื่อ .................................................', '', 'ลงชื่อ .................................................']);
    rows.push(['', '', `(${exporterInfo.name})`, '', `(${coordinatorName})`]);
    rows.push(['', '', exporterInfo.position, '', 'อาจารย์ผู้ประสานงานรายวิชา']);
    rows.push(['', '', 'วันที่ ........./........./.............', '', 'วันที่ ........./........./.............']);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths for optimal visibility in Excel
    ws['!cols'] = [
      { wch: 3 },  // Col A: Margin
      { wch: 8 },  // Col B: ลำดับ / ผู้รายงาน
      { wch: 22 }, // Col C: รหัสวิชา / รหัสวัสดุ / ลายเซ็นผู้รายงาน
      { wch: 45 }, // Col D: ชื่อวิชา / รายการวัสดุสิ้นเปลือง
      { wch: 20 }, // Col E: จำนวนที่ใช้ / ลายเซ็นอาจารย์
      { wch: 12 }, // Col F: หน่วยนับ
      { wch: 18 }, // Col G: รวม (บาท)
    ];

    // Merge top header rows
    ws['!merges'] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 1 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 6 } },
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = `รายงานต้นทุน_${selectedCourse.code}_${selectedCourse.academicYear}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `รายงานต้นทุน_${selectedCourse.code}_${selectedCourse.academicYear}.xlsx`);
  };

  // CSV Export for the selected course materials breakdown
  const handleExportCSV = () => {
    if (!selectedCourse) return;

    const termThai = formatTermName(selectedCourse.semester);
    const dateStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const exporterInfo = getExporterSignatureInfo(currentUser);
    const coordinatorName = selectedCourse.instructorName
      ? formatTeacherName(selectedCourse.instructorName)
      : 'อาจารย์ผู้ประสานงานรายวิชา';

    const items = selectedCourse.itemsUsed || [];
    const totalExpense = Number((selectedCourse.totalExpense || 0).toFixed(2));
    const costPerStudent = Number((selectedCourse.costPerStudent || 0).toFixed(2));
    const studentCount = Number(selectedCourse.studentCount || 0);

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel in Thai
    csvContent += `,${ORG_CONFIG.FULL_ORG_NAME},,,,,\n`;
    csvContent += `,รายงานสรุปการใช้วัสดุสิ้นเปลืองและต้นทุนประจำรายวิชา,,,,,\n`;
    csvContent += `,ข้อมูล ณ วันที่: ${dateStr} น.,,,,,\n`;
    csvContent += `,,,,,,,\n`;

    csvContent += `,,รหัสวิชา,${selectedCourse.code},,,\n`;
    csvContent += `,,ชื่อวิชา,"${selectedCourse.name}",,,\n`;
    csvContent += `,,ภาคเรียน/ปีการศึกษา,${termThai}/${selectedCourse.academicYear},,,\n`;
    csvContent += `,,จำนวนนิสิต,${studentCount},คน,,\n`;
    csvContent += `,,ยอดใช้วัสดุจริงรวม,${totalExpense},บาท,,\n`;
    csvContent += `,,ต้นทุนเฉลี่ยต่อนิสิต,${costPerStudent},บาท/คน,,\n`;
    csvContent += `,,,,,,,\n`;

    csvContent += `,ลำดับ,รหัสวัสดุ,รายการวัสดุสิ้นเปลือง,จำนวนที่ใช้,หน่วยนับ,รวม (บาท)\n`;

    items.forEach((item: any, idx: number) => {
      const cost = Number((item.totalCost || 0).toFixed(2));
      csvContent += `,${idx + 1},${item.code},"${item.name}",${item.totalQuantity},${item.unit},${cost}\n`;
    });

    csvContent += `,,,รวมมูลค่าวัสดุสิ้นเปลืองที่ใช้ทั้งสิ้น,,,${totalExpense}\n`;
    csvContent += `,,,,,,,\n`;
    csvContent += `,ผู้รายงาน,,,,,,\n`;
    csvContent += `,,ลงชื่อ .................................................,,ลงชื่อ .................................................,,\n`;
    csvContent += `,,(${exporterInfo.name}),,(${coordinatorName}),,\n`;
    csvContent += `,,${exporterInfo.position},,อาจารย์ผู้ประสานงานรายวิชา,,\n`;
    csvContent += `,,วันที่ ........./........./.............,,วันที่ ........./........./.............,,\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานต้นทุน_${selectedCourse.code}_${selectedCourse.academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!selectedCourse) return;

    const termThai = formatTermName(selectedCourse.semester);
    const dateStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const exporterInfo = getExporterSignatureInfo(currentUser);
    const coordinatorName = selectedCourse.instructorName
      ? formatTeacherName(selectedCourse.instructorName)
      : 'อาจารย์ผู้ประสานงานรายวิชา';

    const items = selectedCourse.itemsUsed || [];
    const totalExpense = Number((selectedCourse.totalExpense || 0).toFixed(2));
    const costPerStudent = Number((selectedCourse.costPerStudent || 0).toFixed(2));
    const studentCount = Number(selectedCourse.studentCount || 0);

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const itemsRows = items
      .map(
        (it: any, idx: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-family: monospace; color: #475569; font-size: 11px;">${it.code}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${it.name}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${it.totalQuantity}</td>
          <td style="padding: 6px 8px; text-align: center;">${it.unit}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: ${it.totalCost > 0 ? '#0f172a' : '#64748b'};">
            ฿${Number(it.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            ${it.totalCost === 0 ? '<span style="font-size: 9.5px; color: #64748b; font-weight: normal; display: block;">(ไม่คิดมูลค่า)</span>' : ''}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>รายงานต้นทุนวัสดุ - [${selectedCourse.code}] ${selectedCourse.name}</title>
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 10mm; /* Safe print margin >= 0.8cm, strictly >= 0.5cm */
            }
            html, body {
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 11.5px;
              line-height: 1.4;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-page-wrapper {
              box-sizing: border-box;
              width: 100%;
              max-width: 100%;
              padding: 2mm 3mm;
            }
            .header-container {
              border-bottom: 2px solid #0f766e;
              padding-bottom: 8px;
              margin-bottom: 12px;
              text-align: center;
            }
            .header-container h1 {
              font-size: 14.5px;
              font-weight: 800;
              color: #0f766e;
              margin: 0 0 3px 0;
            }
            .header-container h2 {
              font-size: 13px;
              font-weight: 700;
              color: #1e293b;
              margin: 0 0 3px 0;
            }
            .header-container .date-info {
              font-size: 10.5px;
              color: #64748b;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 6px 14px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 9px 12px;
              margin-bottom: 14px;
              font-size: 11px;
            }
            .meta-item {
              display: flex;
              align-items: baseline;
              gap: 6px;
            }
            .meta-label {
              font-weight: 600;
              color: #475569;
              min-width: 110px;
            }
            .meta-value {
              font-weight: 700;
              color: #0f172a;
            }
            table {
              width: 100%;
              table-layout: fixed;
              border-collapse: collapse;
              word-break: break-word;
              overflow-wrap: break-word;
              margin-bottom: 14px;
              font-size: 11px;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 700;
              padding: 6px 8px;
              border-bottom: 1.5px solid #cbd5e1;
            }
            .signatures-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 28px;
              margin-top: 24px;
              text-align: center;
              font-size: 10.5px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .signature-block {
              border: 1px dashed #cbd5e1;
              border-radius: 8px;
              padding: 12px 10px;
            }
            .sign-line {
              margin-top: 28px;
              border-top: 1px dotted #94a3b8;
              padding-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="print-page-wrapper">
            <div class="header-container">
              <h1>${ORG_CONFIG.FULL_ORG_NAME}</h1>
              <h2>รายงานสรุปการใช้วัสดุสิ้นเปลืองและต้นทุนประจำรายวิชา</h2>
              <div class="date-info">ข้อมูล ณ วันที่: ${dateStr} น.</div>
            </div>

            <div class="meta-grid">
              <div class="meta-item"><span class="meta-label">รหัสวิชา:</span> <span class="meta-value">${selectedCourse.code}</span></div>
              <div class="meta-item"><span class="meta-label">ชื่อวิชา:</span> <span class="meta-value">${selectedCourse.name}</span></div>
              <div class="meta-item"><span class="meta-label">ภาคเรียน/ปีการศึกษา:</span> <span class="meta-value">${termThai}/${selectedCourse.academicYear}</span></div>
              <div class="meta-item"><span class="meta-label">อาจารย์ผู้ประสานงาน:</span> <span class="meta-value">${coordinatorName}</span></div>
              <div class="meta-item"><span class="meta-label">จำนวนนิสิต:</span> <span class="meta-value">${studentCount} คน</span></div>
              <div class="meta-item"><span class="meta-label">ยอดใช้วัสดุจริงรวม:</span> <span class="meta-value" style="color: #047857;">฿${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span></div>
              <div class="meta-item" style="grid-column: span 2;"><span class="meta-label">ต้นทุนเฉลี่ยต่อนิสิต:</span> <span class="meta-value" style="color: #4338ca; font-size: 12px;">฿${costPerStudent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท/คน</span></div>
            </div>

            <table style="width: 100%; table-layout: fixed;">
              <colgroup>
                <col style="width: 36px;" />
                <col style="width: 110px;" />
                <col style="width: auto;" />
                <col style="width: 80px;" />
                <col style="width: 70px;" />
                <col style="width: 110px;" />
              </colgroup>
              <thead>
                <tr>
                  <th style="text-align: center;">ลำดับ</th>
                  <th style="text-align: left;">รหัสวัสดุ</th>
                  <th style="text-align: left;">รายการวัสดุสิ้นเปลือง</th>
                  <th style="text-align: center;">จำนวนที่ใช้</th>
                  <th style="text-align: center;">หน่วยนับ</th>
                  <th style="text-align: right;">รวม (บาท)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #64748b;">ไม่มีรายการวัสดุที่ใช้</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid #0f766e; font-weight: bold; background-color: #f8fafc;">
                  <td colspan="5" style="text-align: right; padding: 7px 8px;">รวมมูลค่าวัสดุสิ้นเปลืองที่ใช้ทั้งสิ้น:</td>
                  <td style="text-align: right; padding: 7px 8px; color: #047857; font-size: 12px;">
                    ฿${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div class="signatures-grid">
              <div class="signature-block">
                <div style="font-weight: bold; color: #475569; margin-bottom: 2px;">ผู้รายงาน</div>
                <div class="sign-line">
                  (${exporterInfo.name})
                </div>
                <div style="color: #64748b; margin-top: 2px; font-weight: 500;">
                  ${exporterInfo.position}
                </div>
                <div style="color: #94a3b8; font-size: 9.5px; margin-top: 6px;">
                  วันที่: .......... / .......... / ................
                </div>
              </div>

              <div class="signature-block">
                <div style="font-weight: bold; color: #475569; margin-bottom: 2px;">อาจารย์ผู้ประสานงานรายวิชา</div>
                <div class="sign-line">
                  (${coordinatorName})
                </div>
                <div style="color: #64748b; margin-top: 2px; font-weight: 500;">
                  อาจารย์ผู้ประสานงานรายวิชา
                </div>
                <div style="color: #94a3b8; font-size: 9.5px; margin-top: 6px;">
                  วันที่: .......... / .......... / ................
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดข้อมูลรายวิชาและวิเคราะห์ต้นทุน..."
        submessage="กำลังคำนวณยอดงบประมาณและการเบิกใช้วัสดุจาก Supabase"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            รายงานสรุปการใช้วัสดุและต้นทุนรายวิชา (Course Cost Analytics)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            วิเคราะห์ปริมาณการใช้วัสดุสิ้นเปลืองจริง และต้นทุนแยกรายวิชาการเรียนการสอนทางการพยาบาล
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/reports?tab=COST_ANALYTICS"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm transition cursor-pointer"
            title="เปิดหน้ารายงานภาพรวมและวิเคราะห์ต้นทุนคณะ"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>รายงานภาพรวมคณะ</span>
          </a>
          {/* Export Excel (.xlsx) */}
          <button
            onClick={handleExportExcel}
            disabled={!selectedCourse}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="ส่งออกรายงานต้นทุนประจำรายวิชานี้เป็นไฟล์ Excel (.xlsx) ตามแบบฟอร์มทางการ"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>ส่งออก Excel (.xlsx)</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!selectedCourse}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="ส่งออกรายงานต้นทุนประจำรายวิชานี้เป็นไฟล์ CSV (UTF-8)"
          >
            <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>CSV</span>
          </button>

          {/* Print A4 Official Slip */}
          <button
            onClick={handlePrint}
            disabled={!selectedCourse}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="พิมพ์รายงานต้นทุนประจำรายวิชาลงบนกระดาษ A4 รูปแบบทางการ"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>พิมพ์รายงาน A4</span>
          </button>
          {(isAdmin || isOfficer || isTeacher) && (
            <button
              onClick={() => {
                setIsCustomInstructor(false);
                setShowNewModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรายวิชา</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Layout: Courses List (Left) + Detail & Cost Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Course Selector Cards & Search/Filter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              รายวิชาทั้งหมด ({courses.length})
            </h3>
            {statusFilter !== 'ALL' && (
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                แสดง {filteredCourses.length} รายวิชา
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหารหัสวิชา, ชื่อวิชา, อาจารย์ผู้สอน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-bold text-center">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ทั้งหมด ({courses.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              เปิดสอน ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ปิดแล้ว ({inactiveCount})
            </button>
          </div>

          {/* Year Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[10px] font-bold text-center">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1.5 shrink-0">ชั้นปี:</span>
            {(['ALL', '1', '2', '3', '4'] as const).map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setYearFilter(yr)}
                className={`flex-1 py-1 rounded-lg transition cursor-pointer ${
                  yearFilter === yr
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {yr === 'ALL' ? 'ทุกปี' : `ปี ${yr}`}
              </button>
            ))}
          </div>

          {/* Course Cards List */}
          <div className="space-y-2.5">
            {filteredCourses.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
                ไม่พบรายวิชาที่ตรงกับเงื่อนไข
              </div>
            ) : (
              filteredCourses.map((c) => {
                const isSelected = selectedCourseId === c.id;
                const percent = Math.min(c.percentUsed, 100);
                const isActive = (c.status || 'ACTIVE') === 'ACTIVE';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-teal-500 dark:border-teal-400 shadow-md ring-2 ring-teal-500/20'
                        : isActive
                        ? 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                        : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {c.code}
                        </span>
                        {c.targetYear && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            ชั้นปีที่ {c.targetYear}
                          </span>
                        )}
                        {isActive ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            เปิดสอน
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            ปิดวิชา
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        ฿{c.totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 line-clamp-1">{c.name}</h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      <span className="truncate">ผู้สอน: {formatTeacherName(c.instructorName)}</span>
                      {c.studentCount > 0 && (
                        <span className="shrink-0 font-medium text-slate-500 dark:text-slate-400">
                          {c.studentCount} คน
                        </span>
                      )}
                    </div>

                    {/* Mini Progress */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                        <span>ใช้วัสดุไปแล้ว {c.percentUsed}%</span>
                        <span>งบ ฿{c.allocatedBudget.toLocaleString('th-TH')} บาท</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            percent > 85 ? 'bg-rose-500' : percent > 50 ? 'bg-amber-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep-dive Breakdown of Materials & Costs for Selected Course */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCourse ? (
            <>
              {/* Course Overview Card */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-600 dark:bg-teal-500 text-white font-mono text-xs font-bold">
                        {selectedCourse.code}
                      </span>
                      {(selectedCourse.status || 'ACTIVE') === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          เปิดการเรียนการสอน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          ปิดรายวิชาแล้ว
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedCourse.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span>ผู้ประสานงาน: <strong className="text-slate-700 dark:text-slate-300">{formatTeacherName(selectedCourse.instructorName)}</strong></span>
                      <span>•</span>
                      <span>{formatTermName(selectedCourse.semester)}/{selectedCourse.academicYear}</span>
                      {selectedCourse.targetYear && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            ชั้นปีที่ {selectedCourse.targetYear}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                        <Users className="w-3 h-3" />
                        นิสิต {selectedCourse.studentCount || 0} คน
                      </span>
                    </p>

                    {/* Action buttons: Edit & Toggle Status */}
                    {(isAdmin || isOfficer || isTeacher) && (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(selectedCourse)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer shadow-xs border border-slate-200/80 dark:border-slate-700"
                          title="แก้ไขข้อมูลรายวิชา"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>แก้ไขรายวิชา</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(selectedCourse)}
                          disabled={toggleSubmitting}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs border disabled:opacity-50 ${
                            (selectedCourse.status || 'ACTIVE') === 'ACTIVE'
                              ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                          title={
                            (selectedCourse.status || 'ACTIVE') === 'ACTIVE'
                              ? 'คลิกเพื่อปิดรายวิชา (ไม่ให้เลือกทำคำขอใหม่)'
                              : 'คลิกเพื่อเปิดใช้งานรายวิชา'
                          }
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>
                            {(selectedCourse.status || 'ACTIVE') === 'ACTIVE'
                              ? 'ปิดรายวิชา'
                              : 'เปิดใช้งานรายวิชา'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-right sm:border-l sm:pl-4 border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold block">ยอดใช้วัสดุจริงสะสม</span>
                    <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                      ฿{selectedCourse.totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </div>
                  </div>
                </div>

                {/* 4 Metric Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-center">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 block">งบที่ได้รับจัดสรร</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      ฿{selectedCourse.allocatedBudget.toLocaleString('th-TH')} บาท
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 text-center">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">งบประมาณคงเหลือ</span>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      ฿{selectedCourse.remainingBudget.toLocaleString('th-TH')} บาท
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800 text-center">
                    <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 block">จำนวนนิสิต</span>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm font-bold text-sky-800 dark:text-sky-200">
                        {selectedCourse.studentCount || 0} คน
                      </span>
                    </div>
                    {selectedCourse.studentCount > 0 && (
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 block mt-0.5">
                        เฉลี่ย ฿{(selectedCourse.costPerStudent || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}/คน
                      </span>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800 text-center">
                    <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 block">จำนวนชนิดวัสดุที่ใช้</span>
                    <span className="text-sm font-bold text-teal-800 dark:text-teal-200">
                      {selectedCourse.itemsUsed?.length || 0} ชนิด
                    </span>
                  </div>
                </div>
              </div>

              {/* Materials Usage Breakdown Table (THE CORE REQUIREMENT) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    รายการวัสดุที่ใช้ไปและต้นทุน (Material Usage & Cost Details)
                  </h4>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    เรียงตามมูลค่าที่ใช้มากที่สุด
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-3">รหัสพัสดุ</th>
                        <th className="py-3 px-3">รายการวัสดุสิ้นเปลือง</th>
                        <th className="py-3 px-3 text-center">ปริมาณที่ใช้ไป</th>
                        <th className="py-3 px-3 text-right">ต้นทุนรวม (บาท)</th>
                        <th className="py-3 px-3 text-right">สัดส่วนในวิชา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {selectedCourse.itemsUsed?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                            ยังไม่มีการบันทึกการเบิกจ่ายวัสดุสำหรับรายวิชานี้
                          </td>
                        </tr>
                      ) : (
                        selectedCourse.itemsUsed.map((item: any) => {
                          const percentOfCourse =
                            selectedCourse.totalExpense > 0
                              ? ((item.totalCost / selectedCourse.totalExpense) * 100).toFixed(1)
                              : '0.0';

                          return (
                            <tr key={item.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                              <td className="py-3 px-3 font-mono text-teal-700 dark:text-teal-400 font-bold">
                                {item.code}
                              </td>
                              <td className="py-3 px-3 text-slate-900 dark:text-slate-100 font-bold">
                                {item.name}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
                                  {item.totalQuantity}
                                </span>{' '}
                                <span className="text-slate-500 dark:text-slate-400">{item.unit}</span>
                              </td>
                              <td className="py-3 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 text-sm">
                                ฿{item.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-slate-500 dark:text-slate-400">
                                {percentOfCourse}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {selectedCourse.itemsUsed?.length > 0 && (
                      <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                        <tr>
                          <td colSpan={3} className="py-3 px-3 text-slate-700 dark:text-slate-300">
                            รวมต้นทุนวัสดุสิ้นเปลืองทั้งหมด
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 text-base font-black">
                            ฿{selectedCourse.totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">100%</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Requisition Request History for this course */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  ประวัติใบเบิกของรายวิชา ({selectedCourse.recentRequisitions?.length || 0} ครั้ง)
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedCourse.recentRequisitions?.map((req: any) => (
                    <div key={req.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{req.requestNumber}</div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {req.purpose} {req.user && <span className="text-teal-700 dark:text-teal-300 font-medium">({formatUserName(req.user)})</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">
                          ฿{req.totalCost.toFixed(2)} บาท
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString('th-TH')}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!selectedCourse.recentRequisitions ||
                    selectedCourse.recentRequisitions.length === 0) && (
                    <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                      ยังไม่มีประวัติใบเบิก
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs">
              กรุณาเลือกรายวิชาเพื่อดูสรุปต้นทุน
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Course */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                เพิ่มรายวิชาพยาบาลศาสตร์ใหม่
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสวิชา (Course Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น NUR2203"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สถานะรายวิชาเริ่มต้น *
                  </label>
                  <select
                    value={newCourse.status}
                    onChange={(e) => setNewCourse({ ...newCourse, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                  >
                    <option value="ACTIVE">🟢 เปิดการเรียนการสอน (ACTIVE)</option>
                    <option value="INACTIVE">⚪ ปิดรายวิชาไว้ก่อน (INACTIVE)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ชั้นปีของนิสิต
                  </label>
                  <select
                    value={newCourse.targetYear === null ? '' : newCourse.targetYear}
                    onChange={(e) =>
                      setNewCourse({
                        ...newCourse,
                        targetYear: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                  >
                    <option value="">ทุกชั้นปี / ไม่ระบุ</option>
                    <option value="1">ชั้นปีที่ 1</option>
                    <option value="2">ชั้นปีที่ 2</option>
                    <option value="3">ชั้นปีที่ 3</option>
                    <option value="4">ชั้นปีที่ 4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ภาคการศึกษา
                  </label>
                  <select
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                  >
                    <option value="1">ภาคต้น</option>
                    <option value="2">ภาคปลาย</option>
                    <option value="3">ภาคฤดูร้อน</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ปีการศึกษา
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourse.academicYear}
                    onChange={(e) => setNewCourse({ ...newCourse, academicYear: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    จำนวนนิสิต (คน)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="เช่น 120"
                    value={newCourse.studentCount || ''}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, studentCount: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อรายวิชา (ภาษาไทยและอังกฤษ) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การพยาบาลสุขภาพจิตและจิตเวช"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    อาจารย์ผู้ประสานงานรายวิชา *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomInstructor(!isCustomInstructor);
                      setNewCourse({ ...newCourse, instructorName: '' });
                    }}
                    className="text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                  >
                    {isCustomInstructor ? '← เลือกจากรายชื่ออาจารย์' : '✍️ กรอกชื่อเอง'}
                  </button>
                </div>

                {!isCustomInstructor ? (
                  <select
                    required
                    value={newCourse.instructorName}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomInstructor(true);
                        setNewCourse({ ...newCourse, instructorName: '' });
                      } else {
                        setNewCourse({ ...newCourse, instructorName: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">-- กรุณาเลือกอาจารย์ผู้ประสานงาน --</option>
                    {instructors.map((inst) => (
                      <option key={inst.id} value={formatTeacherName(inst)}>
                        {formatTeacherName(inst)} {inst.department ? `(${inst.department})` : ''}
                      </option>
                    ))}
                    <option value="__CUSTOM__">✍️ ระบุชื่ออื่นด้วยตนเอง...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="เช่น ผศ.ดร. นภาพร มงคลการ"
                    value={newCourse.instructorName}
                    onChange={(e) => setNewCourse({ ...newCourse, instructorName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  งบประมาณวัสดุที่ได้รับการจัดสรร (บาท) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={newCourse.allocatedBudget}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, allocatedBudget: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกรายวิชา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Course */}
      {showEditModal && editCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    แก้ไขข้อมูลรายวิชา
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    รหัสเดิม: {editCourse.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCourse} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสวิชา (Course Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น NUR2203"
                    value={editCourse.code}
                    onChange={(e) => setEditCourse({ ...editCourse, code: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สถานะรายวิชา *
                  </label>
                  <select
                    value={editCourse.status}
                    onChange={(e) => setEditCourse({ ...editCourse, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                  >
                    <option value="ACTIVE">🟢 เปิดการเรียนการสอน (ACTIVE)</option>
                    <option value="INACTIVE">⚪ ปิดรายวิชาแล้ว (INACTIVE - ไม่รับคำขอใหม่)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ชั้นปีของนิสิต
                  </label>
                  <select
                    value={
                      editCourse.targetYear === null || editCourse.targetYear === undefined
                        ? ''
                        : editCourse.targetYear
                    }
                    onChange={(e) =>
                      setEditCourse({
                        ...editCourse,
                        targetYear: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                  >
                    <option value="">ทุกชั้นปี / ไม่ระบุ</option>
                    <option value="1">ชั้นปีที่ 1</option>
                    <option value="2">ชั้นปีที่ 2</option>
                    <option value="3">ชั้นปีที่ 3</option>
                    <option value="4">ชั้นปีที่ 4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ภาคการศึกษา
                  </label>
                  <select
                    value={editCourse.semester}
                    onChange={(e) => setEditCourse({ ...editCourse, semester: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                  >
                    <option value="1">ภาคต้น</option>
                    <option value="2">ภาคปลาย</option>
                    <option value="3">ภาคฤดูร้อน</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ปีการศึกษา
                  </label>
                  <input
                    type="text"
                    required
                    value={editCourse.academicYear}
                    onChange={(e) => setEditCourse({ ...editCourse, academicYear: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    จำนวนนิสิต (คน)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="เช่น 120"
                    value={editCourse.studentCount || ''}
                    onChange={(e) =>
                      setEditCourse({ ...editCourse, studentCount: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อรายวิชา (ภาษาไทยและอังกฤษ) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การพยาบาลสุขภาพจิตและจิตเวช"
                  value={editCourse.name}
                  onChange={(e) => setEditCourse({ ...editCourse, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    อาจารย์ผู้ประสานงานรายวิชา *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditCustomInstructor(!isEditCustomInstructor);
                    }}
                    className="text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                  >
                    {isEditCustomInstructor ? '← เลือกจากรายชื่ออาจารย์' : '✍️ กรอกชื่อเอง'}
                  </button>
                </div>

                {!isEditCustomInstructor ? (
                  <select
                    required
                    value={editCourse.instructorName}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsEditCustomInstructor(true);
                      } else {
                        setEditCourse({ ...editCourse, instructorName: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                  >
                    <option value="">-- กรุณาเลือกอาจารย์ผู้ประสานงาน --</option>
                    {editCourse.instructorName &&
                      !instructors.some(
                        (inst) =>
                          formatTeacherName(inst) === editCourse.instructorName ||
                          inst.name === editCourse.instructorName
                      ) && (
                        <option value={editCourse.instructorName}>
                          {editCourse.instructorName} (ปัจจุบัน)
                        </option>
                      )}
                    {instructors.map((inst) => (
                      <option key={inst.id} value={formatTeacherName(inst)}>
                        {formatTeacherName(inst)} {inst.department ? `(${inst.department})` : ''}
                      </option>
                    ))}
                    <option value="__CUSTOM__">✍️ ระบุชื่ออื่นด้วยตนเอง...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="เช่น ผศ.ดร. นภาพร มงคลการ"
                    value={editCourse.instructorName}
                    onChange={(e) =>
                      setEditCourse({ ...editCourse, instructorName: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  งบประมาณวัสดุที่ได้รับการจัดสรร (บาท) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={editCourse.allocatedBudget}
                  onChange={(e) =>
                    setEditCourse({
                      ...editCourse,
                      allocatedBudget: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  คำอธิบายหรือรายละเอียดเพิ่มเติม (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น รายวิชาบังคับสำหรับนิสิตพยาบาลชั้นปีที่ 2 ภาคเรียนที่ 1..."
                  value={editCourse.description}
                  onChange={(e) =>
                    setEditCourse({ ...editCourse, description: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {editSubmitting ? (
                    'กำลังบันทึก...'
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>บันทึกการแก้ไข</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
