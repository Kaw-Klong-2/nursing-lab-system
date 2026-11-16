'use client';

import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Clock,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Sparkles,
  Search,
  Download,
  Filter,
  Users,
  Eye,
  Award,
  BookOpen,
  MapPin,
  Building2,
  FileSpreadsheet,
  History,
  TrendingUp,
  UserCheck,
  ChevronRight,
  Printer,
  ChevronDown,
  Layers,
  ArrowUpDown,
  QrCode
} from 'lucide-react';
import { formatUserName, formatTeacherName } from '@/lib/user-utils';
import { formatTermName, getAcademicTermByDate, toLegacySemesterCode, AcademicTermInfo } from '@/lib/academicTerm';

function normalizeInstructorKey(name?: string | null): string {
  if (!name) return '';
  return name
    .replace(/^(ศ\.ดร\.|รศ\.ดร\.|ผศ\.ดร\.|ผศ\.|รศ\.|ศ\.|ดร\.|อาจารย์|อ\.|นางสาว|นาง|นาย)\s*/g, '')
    .trim()
    .toLowerCase();
}

interface PracticeHoursSummaryProps {
  bookings: any[];
  currentUser: any;
  isOfficer: boolean;
  isApprover: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  canManageSlots: boolean;
  rooms?: any[];
  courses?: any[];
  initialCourseId?: string | null;
  onOpenQrCode?: (booking: any) => void;
}

export default function PracticeHoursSummary({
  bookings = [],
  currentUser,
  isOfficer,
  isApprover,
  isTeacher,
  isAdmin,
  canManageSlots,
  rooms = [],
  courses = [],
  initialCourseId = null,
  onOpenQrCode,
}: PracticeHoursSummaryProps) {
  const isStudent = currentUser?.role === 'USER' && !isTeacher && !isOfficer && !isAdmin;

  // Academic Terms State
  const [academicTerms, setAcademicTerms] = useState<AcademicTermInfo[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || 'ALL');
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('ALL');
  const [onlyMyCourses, setOnlyMyCourses] = useState<boolean>(false);
  const [teacherViewMode, setTeacherViewMode] = useState<'BY_COURSE' | 'BY_STUDENT' | 'BY_SESSION'>(
    initialCourseId ? 'BY_STUDENT' : 'BY_COURSE'
  );

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
      setTeacherViewMode('BY_STUDENT');
    }
  }, [initialCourseId]);

  useEffect(() => {
    fetch('/api/academic-terms')
      .then((res) => res.json())
      .then((data) => {
        if (data?.terms) {
          setAcademicTerms(data.terms);
        }
      })
      .catch((err) => console.error('Failed to load academic terms in PracticeHoursSummary:', err));
  }, []);

  // Active Term Object
  const activeTerm = useMemo(() => {
    if (selectedTermId === 'ALL') return null;
    return academicTerms.find((t) => t.id === selectedTermId) || null;
  }, [academicTerms, selectedTermId]);

  // Bookings filtered by Academic Term
  const termFilteredBookings = useMemo(() => {
    if (!activeTerm) return bookings;
    const start = new Date(activeTerm.startDate!);
    const end = new Date(new Date(activeTerm.endDate!).getTime() + 86399999);
    const termSem = toLegacySemesterCode(activeTerm.term);
    const termYear = String(activeTerm.academicYear || '');
    return bookings.filter((b) => {
      const dStr = b.slot?.date || b.createdAt;
      if (dStr) {
        const d = new Date(dStr);
        if (d >= start && d <= end) return true;
      }
      if (b.course && termYear && String(b.course.academicYear) === termYear && String(b.course.semester) === termSem) {
        return true;
      }
      return false;
    });
  }, [bookings, activeTerm]);

  // Smart Course List: all ACTIVE courses (matching selected term if chosen) + any closed course with bookings in that term
  const availableCourses = useMemo(() => {
    const bookedCourseIds = new Set(termFilteredBookings.map((b) => b.courseId).filter(Boolean));
    const termSem = activeTerm ? toLegacySemesterCode(activeTerm.term) : null;
    const termYear = activeTerm?.academicYear ? String(activeTerm.academicYear) : null;

    return courses.filter((c) => {
      if (bookedCourseIds.has(c.id)) return true;
      if ((c.status || 'ACTIVE') !== 'ACTIVE') return false;
      if (termSem && termYear) {
        return String(c.semester) === termSem && String(c.academicYear) === termYear;
      }
      return true;
    });
  }, [courses, termFilteredBookings, activeTerm]);

  // Unique Advisors / Course Instructors for filter dropdown
  const availableAdvisors = useMemo(() => {
    const names = new Set<string>();
    availableCourses.forEach((c) => {
      if (c.instructorName) names.add(formatTeacherName(c.instructorName));
    });
    termFilteredBookings.forEach((b) => {
      if (b.advisorName) names.add(formatTeacherName(b.advisorName));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'th'));
  }, [availableCourses, termFilteredBookings]);

  const currentUserInstructorKey = useMemo(
    () => normalizeInstructorKey(formatUserName(currentUser) || currentUser?.name),
    [currentUser]
  );

  // Bookings filtered by Term + Course + Instructor
  const scopedBookings = useMemo(() => {
    return termFilteredBookings.filter((b) => {
      if (selectedCourseId === 'NONE') {
        if (b.courseId) return false;
      } else if (selectedCourseId !== 'ALL') {
        if (b.courseId !== selectedCourseId) return false;
      }

      if (onlyMyCourses && currentUserInstructorKey) {
        const advKey = normalizeInstructorKey(b.advisorName);
        const courseInstKey = normalizeInstructorKey(b.course?.instructorName);
        if (!advKey.includes(currentUserInstructorKey) && !courseInstKey.includes(currentUserInstructorKey)) {
          return false;
        }
      }

      if (selectedAdvisor !== 'ALL') {
        const targetKey = normalizeInstructorKey(selectedAdvisor);
        const advKey = normalizeInstructorKey(b.advisorName);
        const courseInstKey = normalizeInstructorKey(b.course?.instructorName);
        if (advKey !== targetKey && courseInstKey !== targetKey) {
          return false;
        }
      }

      return true;
    });
  }, [termFilteredBookings, selectedCourseId, onlyMyCourses, currentUserInstructorKey, selectedAdvisor]);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [hourFilter, setHourFilter] = useState<'ALL' | 'GE10' | '5TO10' | 'LT5'>('ALL');
  const [sortBy, setSortBy] = useState<'HOURS_DESC' | 'HOURS_ASC' | 'ID_ASC' | 'NAME_ASC' | 'DATE_DESC'>('HOURS_DESC');
  const [selectedStudentModal, setSelectedStudentModal] = useState<any | null>(null);

  // Student Personal Bookings
  const studentBookings = useMemo(() => {
    if (isStudent) {
      return scopedBookings.filter(b => b.userId === currentUser?.id || !b.userId);
    }
    return [];
  }, [scopedBookings, currentUser, isStudent]);

  // Student KPI Calculations
  const studentStats = useMemo(() => {
    const completed = studentBookings.filter(b => b.status === 'COMPLETED');
    const checkedIn = studentBookings.filter(b => b.status === 'CHECKED_IN');
    const totalMinutes = completed.reduce((sum, b) => sum + (Number(b.actualMinutes) || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const uniqueSkills = Array.from(new Set(completed.map(b => b.skillTopic).filter(Boolean)));
    const uniqueRooms = Array.from(new Set(completed.map(b => b.slot?.room?.name || b.slot?.room?.code).filter(Boolean)));

    return {
      completedCount: completed.length,
      activeCount: checkedIn.length,
      totalMinutes,
      totalHours,
      uniqueSkillsCount: uniqueSkills.length,
      uniqueRoomsCount: uniqueRooms.length,
      skills: uniqueSkills,
    };
  }, [studentBookings]);

  // Aggregated Course Summary for Teachers / Staff (BY_COURSE view)
  const courseSummaryList = useMemo(() => {
    const map: Record<
      string,
      {
        courseId: string;
        code: string;
        name: string;
        semester: string;
        academicYear: string;
        instructorName: string;
        enrolledCount: number;
        studentIds: Set<string>;
        totalBookings: number;
        completedCount: number;
        totalMinutes: number;
        skillsCount: Record<string, number>;
      }
    > = {};

    // Seed with available courses matching active filters so courses with 0 sessions still appear clearly
    availableCourses.forEach((c) => {
      if (selectedCourseId !== 'ALL' && selectedCourseId !== c.id) return;
      if (onlyMyCourses && currentUserInstructorKey) {
        if (!normalizeInstructorKey(c.instructorName).includes(currentUserInstructorKey)) return;
      }
      if (selectedAdvisor !== 'ALL') {
        if (normalizeInstructorKey(c.instructorName) !== normalizeInstructorKey(selectedAdvisor)) return;
      }
      map[c.id] = {
        courseId: c.id,
        code: c.code || '-',
        name: c.name || 'รายวิชา',
        semester: c.semester || '-',
        academicYear: c.academicYear || '-',
        instructorName: c.instructorName ? formatTeacherName(c.instructorName) : '-',
        enrolledCount: Number(c.studentCount) || 0,
        studentIds: new Set<string>(),
        totalBookings: 0,
        completedCount: 0,
        totalMinutes: 0,
        skillsCount: {},
      };
    });

    scopedBookings.forEach((b) => {
      const cid = b.courseId || 'NONE';
      if (!map[cid]) {
        map[cid] = {
          courseId: cid,
          code: b.course?.code || (cid === 'NONE' ? 'GENERAL' : '-'),
          name: b.course?.name || (cid === 'NONE' ? 'ฝึกทักษะทั่วไป (ไม่ระบุรายวิชา)' : 'รายวิชา'),
          semester: b.course?.semester || '-',
          academicYear: b.course?.academicYear || '-',
          instructorName: b.course?.instructorName
            ? formatTeacherName(b.course.instructorName)
            : b.advisorName
            ? formatTeacherName(b.advisorName)
            : '-',
          enrolledCount: Number(b.course?.studentCount) || 0,
          studentIds: new Set<string>(),
          totalBookings: 0,
          completedCount: 0,
          totalMinutes: 0,
          skillsCount: {},
        };
      }
      const g = map[cid];
      if (b.userId) g.studentIds.add(b.userId);
      g.totalBookings += 1;
      if (b.status === 'COMPLETED') {
        g.completedCount += 1;
        g.totalMinutes += Number(b.actualMinutes) || 0;
        if (b.skillTopic) {
          g.skillsCount[b.skillTopic] = (g.skillsCount[b.skillTopic] || 0) + 1;
        }
      }
    });

    return Object.values(map)
      .filter((c) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.instructorName.toLowerCase().includes(q)
        );
      })
      .map((c) => ({
        ...c,
        activeStudentCount: c.studentIds.size,
        totalHoursFormatted: (c.totalMinutes / 60).toFixed(1),
        topSkills: Object.entries(c.skillsCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([skill]) => skill),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes || a.code.localeCompare(b.code));
  }, [availableCourses, scopedBookings, selectedCourseId, onlyMyCourses, currentUserInstructorKey, selectedAdvisor, searchTerm]);

  // Aggregated Cohort Data for Teachers / Staff
  const cohortData = useMemo(() => {
    const studentMap: Record<string, {
      userId: string;
      studentId: string;
      name: string;
      department: string;
      avatar?: string;
      completedCount: number;
      totalMinutes: number;
      skillsCount: Record<string, number>;
      coursesMap: Record<string, { code: string; name: string }>;
      lastDate: string;
      records: any[];
    }> = {};

    scopedBookings.forEach(b => {
      const u = b.user || {};
      const uid = b.userId || u.id || u.studentId || 'UNKNOWN';
      const studentId = u.studentId || '-';
      const name = formatUserName(u) || u.name || 'ไม่ระบุชื่อ';
      const dept = u.department || 'พยาบาลศาสตร์';

      if (!studentMap[uid]) {
        studentMap[uid] = {
          userId: uid,
          studentId,
          name,
          department: dept,
          avatar: u.avatar,
          completedCount: 0,
          totalMinutes: 0,
          skillsCount: {},
          coursesMap: {},
          lastDate: '',
          records: [],
        };
      }

      studentMap[uid].records.push(b);

      if (b.course) {
        studentMap[uid].coursesMap[b.course.id] = {
          code: b.course.code,
          name: b.course.name,
        };
      } else {
        studentMap[uid].coursesMap['NONE'] = {
          code: 'ฝึกทั่วไป',
          name: 'ฝึกทักษะทั่วไป',
        };
      }

      if (b.status === 'COMPLETED') {
        studentMap[uid].completedCount += 1;
        studentMap[uid].totalMinutes += Number(b.actualMinutes) || 0;
        if (b.skillTopic) {
          studentMap[uid].skillsCount[b.skillTopic] = (studentMap[uid].skillsCount[b.skillTopic] || 0) + 1;
        }
      }

      const bookingDate = b.slot?.date || b.createdAt;
      if (bookingDate && (!studentMap[uid].lastDate || bookingDate > studentMap[uid].lastDate)) {
        studentMap[uid].lastDate = bookingDate;
      }
    });

    const list = Object.values(studentMap).map(s => {
      const totalHours = (s.totalMinutes / 60).toFixed(1);
      const topSkills = Object.entries(s.skillsCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([skill]) => skill);

      return {
        ...s,
        coursesList: Object.values(s.coursesMap),
        totalHours: parseFloat(totalHours),
        totalHoursFormatted: totalHours,
        topSkills,
      };
    });

    return list;
  }, [scopedBookings]);

  // Filtered & Sorted Cohort List
  const filteredCohort = useMemo(() => {
    let result = cohortData.filter(s => {
      const matchSearch =
        !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.coursesList.some((c) => c.code.toLowerCase().includes(searchTerm.toLowerCase()) || c.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchDept = selectedDept === 'ALL' || s.department === selectedDept;

      let matchHours = true;
      if (hourFilter === 'GE10') matchHours = s.totalHours >= 10;
      else if (hourFilter === '5TO10') matchHours = s.totalHours >= 5 && s.totalHours < 10;
      else if (hourFilter === 'LT5') matchHours = s.totalHours < 5;

      return matchSearch && matchDept && matchHours;
    });

    result.sort((a, b) => {
      if (sortBy === 'HOURS_DESC') return b.totalHours - a.totalHours;
      if (sortBy === 'HOURS_ASC') return a.totalHours - b.totalHours;
      if (sortBy === 'ID_ASC') return a.studentId.localeCompare(b.studentId);
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sortBy === 'DATE_DESC') return (b.lastDate || '').localeCompare(a.lastDate || '');
      return 0;
    });

    return result;
  }, [cohortData, searchTerm, selectedDept, hourFilter, sortBy]);

  // Filtered Session Log List (BY_SESSION view)
  const filteredSessions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scopedBookings
      .filter((b) => {
        if (!q) return true;
        const sName = (formatUserName(b.user) || b.user?.name || '').toLowerCase();
        const sId = (b.user?.studentId || '').toLowerCase();
        const cName = (b.course?.name || '').toLowerCase();
        const cCode = (b.course?.code || '').toLowerCase();
        const sk = (b.skillTopic || '').toLowerCase();
        return sName.includes(q) || sId.includes(q) || cName.includes(q) || cCode.includes(q) || sk.includes(q);
      })
      .sort((a, b) => {
        const da = a.slot?.date || a.createdAt || '';
        const db = b.slot?.date || b.createdAt || '';
        return db.localeCompare(da);
      });
  }, [scopedBookings, searchTerm]);

  // Overall Cohort Metrics
  const cohortMetrics = useMemo(() => {
    const totalStudents = cohortData.length;
    const totalMins = cohortData.reduce((acc, s) => acc + s.totalMinutes, 0);
    const totalSessions = cohortData.reduce((acc, s) => acc + s.completedCount, 0);
    const totalHours = (totalMins / 60).toFixed(1);
    const avgHoursPerStudent = totalStudents > 0 ? (totalMins / totalStudents / 60).toFixed(1) : '0.0';

    return {
      totalStudents,
      totalHours,
      totalSessions,
      avgHoursPerStudent,
    };
  }, [cohortData]);

  // Export to Excel handler (Teacher / Staff Cohort — 3 Sheets)
  const handleExportExcel = () => {
    try {
      // 1. Course Summary Sheet
      const courseRows = courseSummaryList.map((c, index) => ({
        ลำดับ: index + 1,
        รหัสวิชา: c.code,
        ชื่อรายวิชา: c.name,
        ภาคการศึกษา: c.semester !== '-' ? formatTermName(c.semester) : 'ทุกภาคการศึกษา',
        ปีการศึกษา: c.academicYear,
        อาจารย์ผู้รับผิดชอบ: c.instructorName,
        'นิสิตที่เข้าฝึก (คน)': c.activeStudentCount,
        'นิสิตในวิชา (คน)': c.enrolledCount || '-',
        'รอบฝึกสำเร็จ (ครั้ง)': c.completedCount,
        'ชั่วโมงสะสมรวม (ชม.)': c.totalHoursFormatted,
        หัตถการยอดนิยม: c.topSkills.join(', ') || '-',
      }));

      // 2. Student Summary Sheet
      const summaryRows = filteredCohort.map((s, index) => {
        const lastTerm = s.lastDate ? getAcademicTermByDate(s.lastDate, academicTerms) : null;
        return {
          ลำดับ: index + 1,
          รหัสนิสิต: s.studentId,
          'ชื่อ-นามสกุล': s.name,
          สาขาวิชา: s.department,
          รายวิชาที่เข้าฝึก: s.coursesList.map((c) => `${c.code} ${c.name}`).join(', ') || '-',
          ภาคการศึกษา: activeTerm ? formatTermName(activeTerm.term) : (lastTerm?.termName || 'ทุกภาคการศึกษา'),
          ปีการศึกษา: activeTerm ? (activeTerm.academicYear || '-') : (lastTerm?.academicYear || '-'),
          'จำนวนครั้งที่ฝึก (ครั้ง)': s.completedCount,
          'ชั่วโมงสะสม (ชม.)': s.totalHoursFormatted,
          'นาทีสะสม (นาที)': s.totalMinutes,
          หัตถการหลักที่ฝึก: s.topSkills.join(', ') || '-',
          วันที่เข้าฝึกล่าสุด: s.lastDate ? new Date(s.lastDate).toLocaleDateString('th-TH') : '-',
        };
      });

      // 3. Itemized Raw Sessions Sheet
      const rawRows: any[] = [];
      let rawIdx = 1;
      filteredCohort.forEach(s => {
        s.records.forEach(r => {
          const sessionDate = r.slot?.date || r.createdAt;
          const termInfo = getAcademicTermByDate(sessionDate, academicTerms);
          rawRows.push({
            ลำดับ: rawIdx++,
            รหัสนิสิต: s.studentId,
            'ชื่อ-นามสกุล': s.name,
            รหัสวิชา: r.course?.code || '-',
            ชื่อรายวิชา: r.course?.name || 'ฝึกทักษะทั่วไป',
            ภาคการศึกษา: r.course?.semester ? formatTermName(r.course.semester) : termInfo.termName,
            ปีการศึกษา: r.course?.academicYear || termInfo.academicYear,
            วันที่ฝึก: r.slot?.date ? new Date(r.slot.date).toLocaleDateString('th-TH') : '-',
            ช่วงเวลา: r.slot ? `${r.slot.startTime} - ${r.slot.endTime}` : '-',
            ห้องปฏิบัติการ: r.slot?.room?.name || r.slot?.room?.code || '-',
            หัตถการ: r.skillTopic || '-',
            อาจารย์ที่ปรึกษา: r.advisorName ? formatTeacherName(r.advisorName) : '-',
            เวลาเช็คอิน: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-',
            เวลาเช็คเอาท์: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-',
            'เวลาฝึกจริง (นาที)': r.actualMinutes || 0,
            'ชั่วโมงฝึกจริง (ชม.)': r.actualMinutes ? (r.actualMinutes / 60).toFixed(1) : '0.0',
            สถานะ: r.status === 'COMPLETED' ? 'เสร็จสิ้น' : r.status === 'CHECKED_IN' ? 'กำลังฝึก' : r.status,
          });
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(courseRows), 'สรุปตามรายวิชา');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'สรุปชั่วโมงนิสิต');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawRows), 'บันทึกเวลาฝึกรายครั้ง');

      const dateStr = new Date().toISOString().slice(0, 10);
      const selectedCourseObj = availableCourses.find((c) => c.id === selectedCourseId);
      const fileCourseSuffix = selectedCourseObj ? `_${selectedCourseObj.code}` : '';
      const fileTermSuffix = activeTerm ? `_${(activeTerm.name || activeTerm.term || 'term').replace(/\s+/g, '_')}` : '';
      XLSX.writeFile(wb, `รายงานสรุปชั่วโมงฝึกปฏิบัติการพยาบาล${fileCourseSuffix}${fileTermSuffix}_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
    }
  };

  // Export Student Personal Logbook (For Students)
  const handleExportStudentLogbook = () => {
    try {
      const studentName = formatUserName(currentUser) || currentUser?.name || 'นิสิต';
      const studentId = currentUser?.studentId || '-';
      const rows = studentBookings.map((b, idx) => {
        const sessionDate = b.slot?.date || b.createdAt;
        const termInfo = getAcademicTermByDate(sessionDate, academicTerms);
        return {
          ลำดับ: idx + 1,
          รหัสนิสิต: studentId,
          'ชื่อ-นามสกุล': studentName,
          รหัสวิชา: b.course?.code || '-',
          ชื่อรายวิชา: b.course?.name || 'ฝึกทักษะทั่วไป',
          ภาคการศึกษา: b.course?.semester ? formatTermName(b.course.semester) : termInfo.termName,
          ปีการศึกษา: b.course?.academicYear || termInfo.academicYear,
          วันที่ฝึก: b.slot?.date ? new Date(b.slot.date).toLocaleDateString('th-TH') : '-',
          ช่วงเวลา: b.slot ? `${b.slot.startTime} - ${b.slot.endTime}` : '-',
          ห้องปฏิบัติการ: b.slot?.room?.name || b.slot?.room?.code || '-',
          หัตถการ: b.skillTopic || '-',
          อาจารย์ที่ปรึกษา: b.advisorName ? formatTeacherName(b.advisorName) : '-',
          เวลาเช็คอิน: b.checkInTime ? new Date(b.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-',
          เวลาเช็คเอาท์: b.checkOutTime ? new Date(b.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-',
          'เวลาฝึกจริง (นาที)': b.actualMinutes || 0,
          'ชั่วโมงฝึกจริง (ชม.)': b.actualMinutes ? (b.actualMinutes / 60).toFixed(1) : '0.0',
          สถานะ: b.status === 'COMPLETED' ? 'เสร็จสิ้น' : b.status === 'CHECKED_IN' ? 'กำลังฝึก' : b.status,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'ประวัติการฝึกปฏิบัติการ');
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `สมุดบันทึกชั่วโมงฝึก_${studentId}_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Export student logbook failed:', err);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. STUDENT VIEW: PERSONAL LOGBOOK & HOURS SUMMARY        */}
      {/* ======================================================== */}
      {isStudent ? (
        <div className="space-y-6">
          {/* Top KPI Cards for Student */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Accumulated Hours */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-5 text-white shadow-lg shadow-teal-500/20 relative overflow-hidden">
              <div className="absolute -right-3 -bottom-3 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-100 uppercase tracking-wider">ชั่วโมงฝึกสะสมทั้งหมด</span>
                <Clock className="w-5 h-5 text-teal-200" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black">{studentStats.totalHours}</span>
                <span className="text-sm font-semibold text-teal-100">ชั่วโมง</span>
              </div>
              <p className="mt-1 text-[11px] text-teal-100/90 font-medium">
                ({studentStats.totalMinutes.toLocaleString()} นาที จากรอบที่บันทึกสำเร็จ)
              </p>
            </div>

            {/* KPI 2: Completed Sessions */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">รอบที่เข้าฝึกสำเร็จ</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{studentStats.completedCount}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ครั้ง</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                เช็คอินและเช็คเอาท์ครบถ้วน
              </p>
            </div>

            {/* KPI 3: Unique Skills Practiced */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ทักษะหัตถการที่ฝึก</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{studentStats.uniqueSkillsCount}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ทักษะ</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                พัฒนาสมรรถนะวิชาชีพพยาบาล
              </p>
            </div>

            {/* KPI 4: Lab Rooms Used */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ห้องแล็บที่เข้าใช้งาน</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{studentStats.uniqueRoomsCount}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ห้อง</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                ห้องปฏิบัติการทักษะพยาบาล
              </p>
            </div>
          </div>

          {/* Student Skills Badges */}
          {studentStats.skills.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                หัตถการที่ผ่านการฝึกฝนแล้ว ({studentStats.skills.length} รายการ)
              </h4>
              <div className="flex flex-wrap gap-2">
                {studentStats.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Student Attendance Log History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  สมุดบันทึกประวัติการเข้าฝึกปฏิบัติการ (Logbook)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ประวัติการจอง เวลาเช็คอิน-เช็คเอาท์ และจำนวนชั่วโมงฝึกสะสมของนิสิต
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportStudentLogbook}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer self-start sm:self-auto shadow-sm"
                  title="ส่งออกประวัติการฝึกปฏิบัติการเป็นไฟล์ Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออก Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบบันทึกสะสมชั่วโมง</span>
                </button>
              </div>
            </div>

            {studentBookings.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">ยังไม่มีประวัติการเข้าฝึกปฏิบัติการ</p>
                <p className="text-xs text-slate-400">เมื่อนิสิตทำการจองรอบฝึกและเช็คอิน-เช็คเอาท์ผ่าน QR Code ประวัติจะปรากฏที่นี่</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black">
                      <th className="py-3.5 px-4">วันที่ฝึก</th>
                      <th className="py-3.5 px-4">ภาคการศึกษา</th>
                      <th className="py-3.5 px-4">ห้องปฏิบัติการ</th>
                      <th className="py-3.5 px-4">หัตถการ / วัตถุประสงค์</th>
                      <th className="py-3.5 px-4 text-center">เวลาเช็คอิน</th>
                      <th className="py-3.5 px-4 text-center">เวลาเช็คเอาท์</th>
                      <th className="py-3.5 px-4 text-center">เวลาฝึกจริง</th>
                      <th className="py-3.5 px-4">อาจารย์ที่ปรึกษา</th>
                      <th className="py-3.5 px-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {studentBookings.map((b) => {
                      const sessionDate = b.slot?.date || b.createdAt;
                      const dateStr = b.slot?.date ? new Date(b.slot.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
                      const inTimeStr = b.checkInTime ? new Date(b.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                      const outTimeStr = b.checkOutTime ? new Date(b.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                      const durationHours = b.actualMinutes ? (b.actualMinutes / 60).toFixed(1) : '-';
                      const termInfo = getAcademicTermByDate(sessionDate, academicTerms);

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{dateStr}</div>
                            <div className="text-[11px] text-slate-400">{b.slot?.startTime} - {b.slot?.endTime}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {termInfo.termName} {termInfo.academicYear}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-teal-700 dark:text-teal-400">
                              {b.slot?.room?.name || b.slot?.room?.code || '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{b.skillTopic || '-'}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                {b.course ? `${b.course.code} ${b.course.name}` : 'ฝึกทักษะทั่วไป'}
                              </span>
                            </div>
                            {b.objectives && (
                              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{b.objectives}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                            {inTimeStr}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                            {outTimeStr}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {b.actualMinutes ? (
                              <span className="inline-flex items-center gap-1 font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800/60">
                                <span>{durationHours} ชม.</span>
                                <span className="text-[10px] text-teal-600/80 dark:text-teal-400 font-normal">({b.actualMinutes} น.)</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {b.advisorName ? formatTeacherName(b.advisorName) : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {b.status === 'COMPLETED' ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ฝึกสำเร็จ</span>
                              </span>
                            ) : b.status === 'CHECKED_IN' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 inline-flex items-center gap-1 animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  <span>กำลังฝึก</span>
                                </span>
                                {onOpenQrCode && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenQrCode(b)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow-sm transition cursor-pointer"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>เปิด QR</span>
                                  </button>
                                )}
                              </div>
                            ) : b.status === 'APPROVED' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                  อนุมัติแล้ว
                                </span>
                                {onOpenQrCode && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenQrCode(b)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow-sm transition cursor-pointer"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>เปิด QR</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {b.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 2. TEACHER / OFFICER VIEW: COHORT OVERVIEW & DRILLDOWN   */
        /* ======================================================== */
        <div className="space-y-6">
          {/* Cohort Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Total Active Students */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">นิสิตที่เข้าฝึกทั้งหมด</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{cohortMetrics.totalStudents}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">คน</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                มีประวัติยื่นขอเข้าฝึกในระบบ
              </p>
            </div>

            {/* Metric 2: Total Cohort Hours */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-5 text-white shadow-lg shadow-teal-500/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-100 uppercase tracking-wider">ชั่วโมงฝึกสะสมรวมทั้งคณะ</span>
                <Clock className="w-5 h-5 text-teal-200" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black">{cohortMetrics.totalHours}</span>
                <span className="text-sm font-semibold text-teal-100">ชั่วโมง</span>
              </div>
              <p className="mt-1 text-[11px] text-teal-100/90 font-medium">
                บันทึกเวลาจริงจากระบบ QR Check-in
              </p>
            </div>

            {/* Metric 3: Total Completed Sessions */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">จำนวนรอบฝึกที่สำเร็จ</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{cohortMetrics.totalSessions}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ครั้ง</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                เช็คเอาท์และคำนวณเวลาเสร็จสมบูรณ์
              </p>
            </div>

            {/* Metric 4: Average Hours Per Student */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ชั่วโมงฝึกเฉลี่ย / คน</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{cohortMetrics.avgHoursPerStudent}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">ชม./คน</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                ค่าเฉลี่ยนิสิตที่เข้าฝึกปฏิบัติการ
              </p>
            </div>
          </div>

          {/* Search, Filter & Export Action Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-4">
            {/* Row 1: Search, Quick View Tabs & Export/Print */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อนิสิต, รหัสนิสิต, รหัสวิชา หรือหัตถการ..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* View Mode Switcher & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5">
                  <button
                    type="button"
                    onClick={() => setTeacherViewMode('BY_COURSE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      teacherViewMode === 'BY_COURSE'
                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    สรุปตามรายวิชา
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherViewMode('BY_STUDENT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      teacherViewMode === 'BY_STUDENT'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    สรุปรายบุคคล
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherViewMode('BY_SESSION')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      teacherViewMode === 'BY_SESSION'
                        ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    บันทึกรายครั้ง
                  </button>
                </div>

                {/* Export Excel Button */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออก Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                  title="พิมพ์รายงานสรุปการเข้าฝึก (A4)"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">พิมพ์สรุป</span>
                </button>
              </div>
            </div>

            {/* Row 2: Academic Term, Course, Instructor & Hour Filters */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Academic Term Filter */}
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                title="เลือกกรองข้อมูลตามภาคการศึกษา"
              >
                <option value="ALL">ภาคการศึกษา: ทั้งหมด</option>
                {academicTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isCurrent ? '(ปัจจุบัน)' : ''}
                  </option>
                ))}
              </select>

              {/* Smart Course Filter (Active courses + Past courses with records in selected term) */}
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/40 text-xs font-bold text-indigo-900 dark:text-indigo-200 focus:outline-none cursor-pointer max-w-xs"
                title="เลือกกรองข้อมูลตามรายวิชา"
              >
                <option value="ALL">รายวิชา: ทั้งหมด</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} {c.name}
                    {(c.status || 'ACTIVE') !== 'ACTIVE' ? ' (ปิดแล้ว)' : ''}
                  </option>
                ))}
                <option value="NONE">ไม่ระบุรายวิชา (ฝึกทักษะทั่วไป)</option>
              </select>

              {/* Advisor / Instructor Filter */}
              <select
                value={selectedAdvisor}
                onChange={(e) => setSelectedAdvisor(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[220px]"
                title="เลือกกรองตามอาจารย์ผู้รับผิดชอบ"
              >
                <option value="ALL">อาจารย์ผู้สอน: ทั้งหมด</option>
                {availableAdvisors.map((adv) => (
                  <option key={adv} value={adv}>
                    {adv}
                  </option>
                ))}
              </select>

              {/* Quick Filter: My Courses / Students */}
              {(isTeacher || isApprover || isAdmin) && currentUserInstructorKey && (
                <button
                  type="button"
                  onClick={() => setOnlyMyCourses((v) => !v)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    onlyMyCourses
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>เฉพาะวิชา/นิสิตของฉัน</span>
                </button>
              )}

              {/* Hours Range Filter & Sort (for Student View) */}
              {teacherViewMode === 'BY_STUDENT' && (
                <>
                  <select
                    value={hourFilter}
                    onChange={(e) => setHourFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">ชั่วโมงฝึก: ทั้งหมด</option>
                    <option value="GE10">สะสม ≥ 10 ชั่วโมง</option>
                    <option value="5TO10">สะสม 5 - 9.9 ชั่วโมง</option>
                    <option value="LT5">สะสม &lt; 5 ชั่วโมง</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="HOURS_DESC">เรียงตาม: ชั่วโมงฝึกมากสุด</option>
                    <option value="HOURS_ASC">เรียงตาม: ชั่วโมงฝึกน้อยสุด</option>
                    <option value="ID_ASC">เรียงตาม: รหัสนิสิต</option>
                    <option value="NAME_ASC">เรียงตาม: ชื่อ ก-ฮ</option>
                    <option value="DATE_DESC">เรียงตาม: เข้าฝึกล่าสุด</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {/* VIEW 1: COURSE-GROUPED SUMMARY (BY_COURSE) */}
          {teacherViewMode === 'BY_COURSE' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    สรุปการเข้าฝึกปฏิบัติของนิสิตแยกตามรายวิชา ({courseSummaryList.length} รายวิชา)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    คลิกที่รายวิชาใดก็ได้เพื่อดูรายชื่อนิสิตและบันทึกชั่วโมงสะสมเฉพาะวิชานั้น
                  </p>
                </div>
              </div>

              {courseSummaryList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">ไม่พบข้อมูลรายวิชาตามเงื่อนไขที่เลือก</p>
                  <p className="text-xs text-slate-400">ลองเปลี่ยนตัวกรองภาคการศึกษาหรืออาจารย์ผู้รับผิดชอบ</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black">
                        <th className="py-3.5 px-4">รหัสวิชา</th>
                        <th className="py-3.5 px-4">ชื่อรายวิชา / อาจารย์ผู้รับผิดชอบ</th>
                        <th className="py-3.5 px-4">ภาค/ปีการศึกษา</th>
                        <th className="py-3.5 px-4 text-center">นิสิตที่เข้าฝึก</th>
                        <th className="py-3.5 px-4 text-center">ฝึกสำเร็จ (ครั้ง)</th>
                        <th className="py-3.5 px-4 text-center">ชั่วโมงสะสมรวม</th>
                        <th className="py-3.5 px-4">หัตถการที่ฝึกบ่อย</th>
                        <th className="py-3.5 px-4 text-center">ดูรายชื่อ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {courseSummaryList.map((c) => (
                        <tr
                          key={c.courseId}
                          onClick={() => {
                            setSelectedCourseId(c.courseId);
                            setTeacherViewMode('BY_STUDENT');
                          }}
                          className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition cursor-pointer"
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-indigo-700 dark:text-indigo-300">
                            {c.code}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              อาจารย์: {c.instructorName}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {c.semester !== '-' ? (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {formatTermName(c.semester)}/{c.academicYear}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-black text-slate-900 dark:text-white">{c.activeStudentCount}</span>
                            {c.enrolledCount > 0 && (
                              <span className="text-slate-400 text-[11px]"> / {c.enrolledCount} คน</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">{c.completedCount}</td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800/60">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{c.totalHoursFormatted} ชม.</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {c.topSkills.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {c.topSkills.map((sk, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/80 dark:border-indigo-800/60">
                              <Users className="w-3.5 h-3.5" />
                              <span>ดูรายชื่อ</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: AGGREGATED STUDENT TABLE (BY_STUDENT) */}
          {teacherViewMode === 'BY_STUDENT' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  ตารางสรุปชั่วโมงฝึกสะสมรายบุคคล ({filteredCohort.length} คน)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  คลิกที่แถวหรือปุ่ม "ดูประวัติ" เพื่อดูรายละเอียดรอบฝึกทั้งหมดของนิสิตแต่ละคน
                </p>
              </div>
              {selectedCourseId !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedCourseId('ALL')}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  ↺ แสดงทุกรายวิชา
                </button>
              )}
            </div>

            {filteredCohort.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">ไม่พบนิสิตตามเงื่อนไขที่ค้นหา</p>
                <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหาหรือตัวกรองรายวิชา/ภาคการศึกษา</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black">
                      <th className="py-3.5 px-4 text-center w-12">#</th>
                      <th className="py-3.5 px-4">รหัสนิสิต</th>
                      <th className="py-3.5 px-4">ชื่อ-นามสกุล</th>
                      <th className="py-3.5 px-4">รายวิชาที่เข้าฝึก</th>
                      <th className="py-3.5 px-4 text-center">ฝึกสำเร็จ (ครั้ง)</th>
                      <th className="py-3.5 px-4 text-center">ชั่วโมงสะสม</th>
                      <th className="py-3.5 px-4">หัตถการหลักที่ฝึก</th>
                      <th className="py-3.5 px-4 text-center">เข้าฝึกล่าสุด</th>
                      <th className="py-3.5 px-4 text-center">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {filteredCohort.map((student, idx) => {
                      const lastDateStr = student.lastDate
                        ? new Date(student.lastDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '-';

                      return (
                        <tr
                          key={student.userId}
                          onClick={() => setSelectedStudentModal(student)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                        >
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-teal-800 dark:text-teal-300">
                            {student.studentId}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{student.name}</div>
                            <div className="text-[10px] text-slate-400">{student.department}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {student.coursesList.map((c, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60"
                                  title={c.name}
                                >
                                  {c.code}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-slate-100">
                            {student.completedCount}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800/60">
                              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              <span>{student.totalHoursFormatted} ชม.</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {student.topSkills.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {student.topSkills.map((sk, skIdx) => (
                                  <span
                                    key={skIdx}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  >
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-500 dark:text-slate-400">
                            {lastDateStr}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedStudentModal(student)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-bold transition cursor-pointer border border-teal-200/80 dark:border-teal-800/60"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ดูประวัติ</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {/* VIEW 3: ITEMIZED CHRONOLOGICAL SESSION LOG (BY_SESSION) */}
          {teacherViewMode === 'BY_SESSION' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ประวัติการเข้าฝึกรายครั้งทั้งหมด ({filteredSessions.length} รายการ)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  แสดงบันทึกวัน-เวลาที่เข้าฝึกจริง เรียงตามวันที่ล่าสุด พร้อมรายวิชา ห้องแล็บ และอาจารย์ผู้รับรอง
                </p>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">ไม่พบบันทึกการเข้าฝึกตามเงื่อนไขที่เลือก</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black">
                        <th className="py-3.5 px-4">วันที่ฝึก</th>
                        <th className="py-3.5 px-4">นิสิต</th>
                        <th className="py-3.5 px-4">รายวิชา</th>
                        <th className="py-3.5 px-4">ห้องแล็บ</th>
                        <th className="py-3.5 px-4">หัตถการ / อาจารย์</th>
                        <th className="py-3.5 px-4 text-center">เช็คอิน - ออก</th>
                        <th className="py-3.5 px-4 text-center">เวลาจริง</th>
                        <th className="py-3.5 px-4 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {filteredSessions.map((r: any) => {
                        const sessionDate = r.slot?.date || r.createdAt;
                        const dateStr = r.slot?.date ? new Date(r.slot.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
                        const termInfo = getAcademicTermByDate(sessionDate, academicTerms);
                        const inTime = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                        const outTime = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                        const uName = formatUserName(r.user) || r.user?.name || 'ไม่ระบุชื่อ';

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900 dark:text-slate-100">{dateStr}</div>
                              <div className="text-[10px] text-slate-400">
                                {termInfo.termName} {termInfo.academicYear}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900 dark:text-slate-100">{uName}</div>
                              <div className="text-[10px] font-mono text-teal-700 dark:text-teal-400">{r.user?.studentId || '-'}</div>
                            </td>
                            <td className="py-3 px-4">
                              {r.course ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                                  {r.course.code} {r.course.name}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">ฝึกทักษะทั่วไป</span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-teal-700 dark:text-teal-400 font-bold">
                              {r.slot?.room?.name || r.slot?.room?.code || '-'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold">{r.skillTopic || '-'}</div>
                              {r.advisorName && (
                                <div className="text-[10px] text-slate-400">อาจารย์: {formatTeacherName(r.advisorName)}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {inTime} - {outTime}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-teal-700 dark:text-teal-300">
                              {r.actualMinutes ? `${(r.actualMinutes / 60).toFixed(1)} ชม.` : '-'}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'COMPLETED'
                                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300'
                                  : r.status === 'CHECKED_IN'
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {r.status === 'COMPLETED' ? 'ฝึกสำเร็จ' : r.status === 'CHECKED_IN' ? 'กำลังฝึก' : r.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. STUDENT DETAIL MODAL (Itemized Drilldown)              */}
      {/* ======================================================== */}
      {selectedStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-lg">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    {selectedStudentModal.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>รหัสนิสิต: <strong className="font-mono text-teal-700 dark:text-teal-400">{selectedStudentModal.studentId}</strong></span>
                    <span>•</span>
                    <span>สาขาวิชา: {selectedStudentModal.department}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Quick Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">ชั่วโมงสะสมรวม</span>
                <p className="text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">
                  {selectedStudentModal.totalHoursFormatted} ชม.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">ฝึกสำเร็จ</span>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedStudentModal.completedCount} ครั้ง
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">รายการคำขอทั้งหมด</span>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedStudentModal.records.length} รายการ
                </p>
              </div>
            </div>

            {/* Itemized Session Table in Modal */}
            <div className="flex-1 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-800 rounded-2xl p-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-black sticky top-0">
                    <th className="py-2.5 px-3">วันที่</th>
                    <th className="py-2.5 px-3">ห้องแล็บ</th>
                    <th className="py-2.5 px-3">หัตถการ</th>
                    <th className="py-2.5 px-3 text-center">เวลาเข้า-ออก</th>
                    <th className="py-2.5 px-3 text-center">เวลาจริง</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {selectedStudentModal.records.map((r: any) => {
                    const sessionDate = r.slot?.date || r.createdAt;
                    const dateStr = r.slot?.date ? new Date(r.slot.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }) : '-';
                    const inTime = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                    const outTime = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                    const termInfo = getAcademicTermByDate(sessionDate, academicTerms);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                          <div>{dateStr}</div>
                          <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">{termInfo.termName} {termInfo.academicYear}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-teal-700 dark:text-teal-400">
                          {r.slot?.room?.name || r.slot?.room?.code || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold">{r.skillTopic || '-'}</span>
                          <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {r.course ? `${r.course.code} ${r.course.name}` : 'ฝึกทักษะทั่วไป'}
                          </div>
                          {r.advisorName && <div className="text-[10px] text-slate-400">อาจารย์: {formatTeacherName(r.advisorName)}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {inTime} - {outTime}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-teal-700 dark:text-teal-300 whitespace-nowrap">
                          {r.actualMinutes ? `${(r.actualMinutes / 60).toFixed(1)} ชม.` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'COMPLETED'
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300'
                              : r.status === 'CHECKED_IN'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
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
