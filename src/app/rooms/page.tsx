'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Building,
  Building2,
  CalendarDays,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Plus,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Users,
  Search,
  Filter,
  RefreshCw,
  Archive,
  MapPin,
  Sparkles,
  Phone,
  BookOpen,
  GraduationCap,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Layers,
  SlidersHorizontal,
  Check,
  Edit3,
  ShieldCheck,
  DoorOpen,
  DoorClosed,
  ArrowRightLeft,
  CheckSquare,
  Square,
  Info
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatUserName, formatTeacherName } from '@/lib/user-utils';
import CalendarHoverCard, { CalendarHoverItem } from '@/components/calendar/CalendarHoverCard';

type RoomCategory = 'ALL' | 'SKILL' | 'SIMULATION' | 'SPECIALTY' | 'SUPPORT';

const ROOM_CATEGORIES: { id: RoomCategory; label: string; shortLabel: string; icon: string }[] = [
  { id: 'ALL', label: 'ทุกหมวดหมู่', shortLabel: 'ทั้งหมด', icon: '🏢' },
  { id: 'SKILL', label: 'ทักษะพื้นฐาน (Skill Labs)', shortLabel: 'Skill Labs', icon: '🩺' },
  { id: 'SIMULATION', label: 'จำลองสถานการณ์เสมือนจริง (Sim Labs)', shortLabel: 'Sim Labs', icon: '🤖' },
  { id: 'SPECIALTY', label: 'การพยาบาลเฉพาะทาง (Specialty)', shortLabel: 'เฉพาะทาง', icon: '🏥' },
  { id: 'SUPPORT', label: 'คลัง & ห้องจัดเตรียม (Support)', shortLabel: 'คลัง/เตรียม', icon: '📦' },
];

function getRoomCategory(code: string, name: string): RoomCategory {
  const c = (code || '').toUpperCase();
  const n = name || '';
  if (
    c.includes('SIM') ||
    n.includes('SIM') ||
    n.includes('debrief') ||
    n.includes('จำลอง') ||
    n.includes('สังเกตการณ์')
  ) {
    return 'SIMULATION';
  }
  if (
    c.startsWith('LAB-01') ||
    c.startsWith('LAB-1') ||
    n.includes('พื้นฐาน') ||
    n.includes('Skill')
  ) {
    return 'SKILL';
  }
  if (
    c.includes('CS') ||
    c.includes('EQ') ||
    n.includes('พัสดุ') ||
    n.includes('วัสดุ') ||
    n.includes('ครุภัณฑ์') ||
    n.includes('เก็บของ')
  ) {
    return 'SUPPORT';
  }
  return 'SPECIALTY';
}

const DAYS_OF_WEEK = [
  { day: 1, label: 'จันทร์', short: 'จ.' },
  { day: 2, label: 'อังคาร', short: 'อ.' },
  { day: 3, label: 'พุธ', short: 'พ.' },
  { day: 4, label: 'พฤหัสบดี', short: 'พฤ.' },
  { day: 5, label: 'ศุกร์', short: 'ศ.' },
  { day: 6, label: 'เสาร์', short: 'ส.' },
  { day: 0, label: 'อาทิตย์', short: 'อา.' },
];

// Helper to extract YYYY-MM-DD cleanly without timezone offset bugs
function getCleanLocalDateStr(d?: Date | string | null): string {
  if (!d) return '';
  if (typeof d === 'string') {
    return d.slice(0, 10);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function RoomsPage() {
  const { currentUser, isOfficer, isAdmin, isTeacher, isApprover } = useAuth();
  const canManageRooms = isOfficer || isAdmin;
  const canApprove = isApprover || isAdmin || isOfficer || isTeacher;

  // Tabs
  const [activeTab, setActiveTab] = useState<'TIMETABLE' | 'REQUESTS'>('TIMETABLE');

  // Main Data States
  const [rooms, setRooms] = useState<any[]>([]);
  const [showArchivedRooms, setShowArchivedRooms] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Checks if a room has been permanently deactivated / soft-deleted
  const isRoomArchived = (r: any) =>
    r.isActive === false &&
    (r.closeReason?.includes('ปิดการใช้งานถาวร') ||
      r.closeReason?.includes('ประวัติการจอง') ||
      r.closeReason?.includes('เลิกใช้งาน'));

  // Operational rooms (excludes permanently archived rooms by default)
  const visibleRooms = useMemo(() => {
    if (showArchivedRooms) return rooms;
    return rooms.filter((r) => !isRoomArchived(r));
  }, [rooms, showArchivedRooms]);

  const archivedRoomsCount = useMemo(() => rooms.filter(isRoomArchived).length, [rooms]);

  // Room Category Filter & Overview Expansion
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory>('ALL');
  const [isRoomsOverviewExpanded, setIsRoomsOverviewExpanded] = useState(false);

  // Category-filtered rooms
  const categoryFilteredRooms = useMemo(() => {
    if (selectedCategory === 'ALL') return visibleRooms;
    return visibleRooms.filter((r) => getRoomCategory(r.code, r.name) === selectedCategory);
  }, [visibleRooms, selectedCategory]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<RoomCategory, number> = {
      ALL: visibleRooms.length,
      SKILL: 0,
      SIMULATION: 0,
      SPECIALTY: 0,
      SUPPORT: 0,
    };
    visibleRooms.forEach((r) => {
      const cat = getRoomCategory(r.code, r.name);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [visibleRooms]);

  // Filter States
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');

  // Calendar States
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getCleanLocalDateStr(new Date());
  });

  // Calendar Hover / Pin Tooltip State
  const [hoverPopover, setHoverPopover] = useState<{
    isOpen: boolean;
    isPinned?: boolean;
    anchorRect: DOMRect | null;
    dateStr: string;
    items: CalendarHoverItem[];
  } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setHoverPopover((prev) => (prev?.isPinned ? prev : null));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const buildHoverItemsForRooms = (bookings: any[]): CalendarHoverItem[] =>
    bookings.map((b) => ({
      id: b.id,
      code: b.bookingNumber,
      roomCode: b.room?.code,
      roomName: b.room?.name,
      title: b.title,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      userName: formatUserName(b.user),
      courseCode: b.course?.code,
      courseName: b.course?.name,
      participants: b.attendeesCount,
      equipmentNeeded: b.equipmentNeeded,
      type: 'ROOM_BOOKING',
    }));

  const handleCellPointerEnter = (e: React.PointerEvent<HTMLElement>, dateStr: string, bookings: any[]) => {
    if (e.pointerType !== 'mouse') return;
    if (hoverPopover?.isPinned) return;
    if (bookings.length === 0) {
      setHoverPopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPopover({
      isOpen: true,
      isPinned: false,
      anchorRect: rect,
      dateStr,
      items: buildHoverItemsForRooms(bookings),
    });
  };

  const handleCellPointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    setHoverPopover((prev) => (prev?.isPinned ? prev : null));
  };

  const handleCellClick = (e: React.MouseEvent<HTMLElement>, dateStr: string, bookings: any[]) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (isMobile) {
      setSelectedDate(dateStr);
      setHoverPopover(null);
      setTimeout(() => {
        const detailEl = document.getElementById('rooms-selected-day-panel');
        if (detailEl) {
          detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
      return;
    }

    // Desktop UX
    setSelectedDate(dateStr);
    if (bookings.length === 0) {
      setHoverPopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPopover((prev) => {
      if (prev?.isPinned && prev.dateStr === dateStr) {
        return null;
      }
      return {
        isOpen: true,
        isPinned: true,
        anchorRect: rect,
        dateStr,
        items: buildHoverItemsForRooms(bookings),
      };
    });
  };

  // Modal: Booking Form
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);
  const [bookingForm, setBookingForm] = useState<{
    roomId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    title: string;
    purpose: string;
    attendeesCount: number | string;
    courseId: string;
    advisorName: string;
    contactPhone: string;
    equipmentNeeded: string;
    note: string;
  }>({
    roomId: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    title: '',
    purpose: '',
    attendeesCount: '',
    courseId: '',
    advisorName: '',
    contactPhone: '',
    equipmentNeeded: '',
    note: '',
  });

  // Booking Modes: SINGLE (normal single room), MULTI_ROOM (multiple rooms on 1 date), MULTI_DAY (continuous multi-day), TIMETABLE (recurring course schedule)
  const [bookingMode, setBookingMode] = useState<'SINGLE' | 'MULTI_ROOM' | 'MULTI_DAY' | 'TIMETABLE'>('SINGLE');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  // Multi-Day State (General non-timetable continuous booking)
  const [multiDayStartDate, setMultiDayStartDate] = useState<string>('');
  const [multiDayEndDate, setMultiDayEndDate] = useState<string>('');

  // Timetable & Academic Terms State
  const [academicTerms, setAcademicTerms] = useState<any[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [timetableStartDate, setTimetableStartDate] = useState<string>('');
  const [timetableEndDate, setTimetableEndDate] = useState<string>('');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([1]); // default: Monday
  const [timetableFrequency, setTimetableFrequency] = useState<'WEEKLY' | 'BIWEEKLY'>('WEEKLY');
  const [autoApproveBatch, setAutoApproveBatch] = useState<boolean>(true);
  const [skipConflicts, setSkipConflicts] = useState<boolean>(true);

  // Live Conflict Preview Analysis
  const [checkingConflicts, setCheckingConflicts] = useState<boolean>(false);
  const [previewAnalysis, setPreviewAnalysis] = useState<{
    totalSlots: number;
    availableCount: number;
    conflictedCount: number;
    availableSlots: any[];
    conflictedSlots: any[];
  } | null>(null);

  // Modal: Add / Edit Room
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<any>(null);
  const [roomForm, setRoomForm] = useState<{
    code: string;
    name: string;
    location: string;
    capacity: number | string;
    description: string;
    closeReason: string;
  }>({
    code: '',
    name: '',
    location: '',
    capacity: '',
    description: '',
    closeReason: '',
  });

  // Modal: Toggle Room Status with Reason
  const [roomToToggle, setRoomToToggle] = useState<any>(null);
  const [roomToggleReason, setRoomToggleReason] = useState('');

  // Modal: Cancel Approved Booking (Admin / Officer)
  const [cancelModalBooking, setCancelModalBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Modal: Reassign Room (Admin / Officer)
  const [reassignModalBooking, setReassignModalBooking] = useState<any>(null);
  const [targetRoomIdForReassign, setTargetRoomIdForReassign] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Batch Bookings Expanded Drawers State
  const [expandedBatchIds, setExpandedBatchIds] = useState<string[]>([]);
  const toggleExpandBatch = (batchId: string) => {
    setExpandedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleTodayMonth = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(getCleanLocalDateStr(today));
  };

  // Fetch Data
  const fetchData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      // In CALENDAR view we fetch by month for fast render; in REQUESTS view we fetch all bookings so user can view/manage across months
      const bookingsUrl =
        activeTab === 'REQUESTS'
          ? '/api/room-bookings'
          : `/api/room-bookings?year=${year}&month=${month}`;

      const [roomsRes, bookingsRes, coursesRes, usersRes, termsRes] = await Promise.all([
        fetch('/api/rooms?includeInactive=true&includeArchived=true'),
        fetch(bookingsUrl),
        fetch('/api/courses?compact=true'),
        fetch('/api/users?role=INSTRUCTOR'),
        fetch('/api/academic-terms'),
      ]);

      if (roomsRes.ok) {
        const rList = await roomsRes.json();
        setRooms(rList);
      }

      if (bookingsRes.ok) {
        setBookings(await bookingsRes.json());
      }

      if (coursesRes.ok) {
        setCourses(await coursesRes.json());
      }

      if (usersRes.ok) {
        const uList = await usersRes.json();
        setTeachers(Array.isArray(uList) ? uList : []);
      }

      if (termsRes.ok) {
        const tList = await termsRes.json();
        const termsArr = Array.isArray(tList) ? tList : [];
        setAcademicTerms(termsArr);
        if (termsArr.length > 0 && !selectedTermId) {
          const current = termsArr.find((t: any) => t.isCurrent) || termsArr[0];
          if (current) {
            setSelectedTermId(current.id);
            setTimetableStartDate(getCleanLocalDateStr(current.startDate));
            setTimetableEndDate(getCleanLocalDateStr(current.endDate));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching room data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth, activeTab]);

  // Timetable & Multi-room helper functions
  const handleSelectTerm = (termId: string) => {
    setSelectedTermId(termId);
    const term = academicTerms.find((t) => t.id === termId);
    if (term) {
      setTimetableStartDate(getCleanLocalDateStr(term.startDate));
      setTimetableEndDate(getCleanLocalDateStr(term.endDate));
    }
  };

  const toggleSelectRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const handleSelectAllRooms = () => {
    const activeIds = visibleRooms.filter((r) => r.isActive).map((r) => r.id);
    setSelectedRoomIds(activeIds);
  };

  const handleSelectRoomsByCategory = (category: RoomCategory) => {
    const matchedIds = visibleRooms
      .filter((r) => r.isActive && getRoomCategory(r.code, r.name) === category)
      .map((r) => r.id);
    setSelectedRoomIds((prev) => Array.from(new Set([...prev, ...matchedIds])));
  };

  const handleClearSelectedRooms = () => {
    setSelectedRoomIds([]);
  };

  const toggleDayOfWeek = (dayNumber: number) => {
    setSelectedDaysOfWeek((prev) => {
      if (prev.includes(dayNumber)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayNumber);
      }
      return [...prev, dayNumber].sort((a, b) => a - b);
    });
  };

  const resetBookingModal = (mode: 'SINGLE' | 'MULTI_ROOM' | 'TIMETABLE' = 'SINGLE') => {
    setBookingMode(mode);
    setBookingForm({
      roomId: '',
      bookingDate: selectedDate || getCleanLocalDateStr(new Date()),
      startTime: '',
      endTime: '',
      title: '',
      purpose: mode === 'TIMETABLE' ? 'การเรียนการสอน' : '',
      attendeesCount: '',
      courseId: '',
      advisorName: '',
      contactPhone: currentUser?.phone || '',
      equipmentNeeded: '',
      note: '',
    });
    setSelectedRoomIds([]);
    setIsEditingAdvisor(false);
    setPreviewAnalysis(null);
    setCheckingConflicts(false);
  };

  // Compute recurring dates for timetable
  const computedTimetableDates = useMemo(() => {
    if (bookingMode !== 'TIMETABLE') return [];
    if (!timetableStartDate || !timetableEndDate || selectedDaysOfWeek.length === 0) return [];

    // Parse YYYY-MM-DD components directly to local noon (12:00:00) to be 100% immune to timezone shifts
    const [sY, sM, sD] = timetableStartDate.split('-').map(Number);
    const [eY, eM, eD] = timetableEndDate.split('-').map(Number);
    if (!sY || !sM || !sD || !eY || !eM || !eD) return [];

    const start = new Date(sY, sM - 1, sD, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD, 12, 0, 0);
    if (start > end) return [];

    const dates: string[] = [];
    const cur = new Date(start);
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const startMs = start.getTime();

    while (cur <= end) {
      const dOfWeek = cur.getDay();
      if (selectedDaysOfWeek.includes(dOfWeek)) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        if (timetableFrequency === 'BIWEEKLY') {
          const diffWeeks = Math.floor((cur.getTime() - startMs) / msInWeek);
          if (diffWeeks % 2 === 0) {
            dates.push(dateStr);
          }
        } else {
          dates.push(dateStr);
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [bookingMode, timetableStartDate, timetableEndDate, selectedDaysOfWeek, timetableFrequency]);

  // Compute dates for multi-day continuous booking
  const computedMultiDayDates = useMemo(() => {
    if (bookingMode !== 'MULTI_DAY') return [];
    if (!multiDayStartDate || !multiDayEndDate) return [];
    const [sY, sM, sD] = multiDayStartDate.split('-').map(Number);
    const [eY, eM, eD] = multiDayEndDate.split('-').map(Number);
    if (!sY || !sM || !sD || !eY || !eM || !eD) return [];

    const start = new Date(sY, sM - 1, sD, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD, 12, 0, 0);
    if (start > end) return [];

    const dates: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [bookingMode, multiDayStartDate, multiDayEndDate]);

  // Reset preview when key booking attributes change
  useEffect(() => {
    setPreviewAnalysis(null);
  }, [selectedRoomIds, bookingForm.bookingDate, computedTimetableDates, computedMultiDayDates, bookingForm.startTime, bookingForm.endTime, bookingMode]);

  // Set user info to form when available
  useEffect(() => {
    if (currentUser && !bookingForm.contactPhone && currentUser.phone) {
      setBookingForm((prev) => ({ ...prev, contactPhone: currentUser.phone || '' }));
    }
  }, [currentUser]);

  // Deep Link support from external systems (e.g. ?bookingNumber=ROOM-xxxx or ?id=xxxx)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const bCode = params.get('bookingNumber') || params.get('booking_code') || params.get('id');
      if (bCode) {
        setSearchQuery(bCode);
        setActiveTab('REQUESTS');
      }

      const targetDate = params.get('date');
      if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        setSelectedDate(targetDate);
      }

      const targetRoomCode = params.get('room_code');
      if (targetRoomCode) {
        setSelectedCategory('ALL');
        setSearchQuery(targetRoomCode);
      }
    }
  }, []);

  // Real-time conflict detection for the selected room and date
  const selectedRoomBookings = useMemo(() => {
    if (!bookingForm.roomId || !bookingForm.bookingDate) return [];
    return bookings.filter((b) => {
      if (b.roomId !== bookingForm.roomId) return false;
      if (!b.bookingDate) return false;
      const bDateStr = getCleanLocalDateStr(b.bookingDate);
      return bDateStr === bookingForm.bookingDate && (b.status === 'APPROVED' || b.status === 'PENDING');
    });
  }, [bookings, bookingForm.roomId, bookingForm.bookingDate]);

  const conflictItem = useMemo(() => {
    if (!bookingForm.startTime || !bookingForm.endTime) return null;
    return selectedRoomBookings.find(
      (b) => bookingForm.startTime < b.endTime && bookingForm.endTime > b.startTime
    );
  }, [selectedRoomBookings, bookingForm.startTime, bookingForm.endTime]);

  // Actions: Live Conflict Preview for Multi-room & Timetable
  const handlePreviewConflicts = async () => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการตรวจสอบ');
      return;
    }
    if (selectedRoomIds.length === 0) {
      alert('กรุณาเลือกห้องปฏิบัติการอย่างน้อย 1 ห้อง');
      return;
    }

    const targetDates =
      bookingMode === 'MULTI_ROOM'
        ? (bookingForm.bookingDate ? [bookingForm.bookingDate] : [])
        : bookingMode === 'MULTI_DAY'
        ? computedMultiDayDates
        : computedTimetableDates;

    if (targetDates.length === 0) {
      alert(
        bookingMode === 'MULTI_ROOM'
          ? 'กรุณาระบุวันที่ต้องการใช้งานห้อง'
          : bookingMode === 'MULTI_DAY'
          ? 'กรุณาระบุวันที่เริ่มต้นและสิ้นสุดของกิจกรรมต่อเนื่อง'
          : 'ไม่พบวันที่ตรงกับเงื่อนไขตารางเรียน กรุณาตรวจสอบวันเริ่มต้น-สิ้นสุด และวันในสัปดาห์ที่เลือก'
      );
      return;
    }

    if (!bookingForm.startTime || !bookingForm.endTime) {
      alert('กรุณาระบุช่วงเวลาเริ่มต้นและสิ้นสุด');
      return;
    }
    if (bookingForm.startTime >= bookingForm.endTime) {
      alert('เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุด');
      return;
    }

    setCheckingConflicts(true);
    try {
      const res = await fetch('/api/room-bookings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomIds: selectedRoomIds,
          dates: targetDates,
          startTime: bookingForm.startTime,
          endTime: bookingForm.endTime,
          title: bookingForm.title || 'ตรวจสอบความพร้อม',
          purpose: bookingForm.purpose || 'การเรียนการสอน',
          attendeesCount: Number(bookingForm.attendeesCount) || 1,
          previewOnly: true,
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPreviewAnalysis(data);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการตรวจสอบความขัดแย้ง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Actions: Submit Batch / Timetable Booking
  const handleBatchBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย (@ku.th) ก่อนทำรายการ');
      return;
    }
    if (selectedRoomIds.length === 0) {
      alert('กรุณาเลือกห้องปฏิบัติการอย่างน้อย 1 ห้อง');
      return;
    }

    const targetDates =
      bookingMode === 'MULTI_ROOM'
        ? (bookingForm.bookingDate ? [bookingForm.bookingDate] : [])
        : bookingMode === 'MULTI_DAY'
        ? computedMultiDayDates
        : computedTimetableDates;

    if (targetDates.length === 0) {
      alert(
        bookingMode === 'MULTI_ROOM'
          ? 'กรุณาระบุวันที่ต้องการใช้งานห้อง'
          : bookingMode === 'MULTI_DAY'
          ? 'กรุณาระบุวันที่เริ่มต้นและสิ้นสุดของกิจกรรมต่อเนื่อง'
          : 'ไม่พบวันที่ตรงกับเงื่อนไขตารางเรียน กรุณาตรวจสอบช่วงวันที่และวันในสัปดาห์'
      );
      return;
    }

    if (!bookingForm.startTime || !bookingForm.endTime) {
      alert('กรุณาระบุช่วงเวลาเริ่มต้นและสิ้นสุด');
      return;
    }
    if (bookingForm.startTime >= bookingForm.endTime) {
      alert('เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุด');
      return;
    }
    if (!bookingForm.title?.trim()) {
      alert('กรุณากรอกหัวข้อ / ชื่องานที่ขอใช้งานห้อง');
      return;
    }
    if (!bookingForm.purpose) {
      alert('กรุณาเลือกวัตถุประสงค์การใช้งานห้อง');
      return;
    }
    if (!bookingForm.attendeesCount || Number(bookingForm.attendeesCount) <= 0) {
      alert('กรุณากรอกจำนวนผู้เข้าใช้งาน (คน) ให้ถูกต้อง');
      return;
    }

    const currentTermObj = academicTerms.find((t) => t.id === selectedTermId);

    setSubmitting(true);
    try {
      const res = await fetch('/api/room-bookings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomIds: selectedRoomIds,
          dates: targetDates,
          startTime: bookingForm.startTime,
          endTime: bookingForm.endTime,
          title: bookingForm.title.trim(),
          purpose: bookingForm.purpose,
          attendeesCount: Number(bookingForm.attendeesCount) || 1,
          courseId: bookingForm.courseId || null,
          advisorName: bookingForm.advisorName ? formatTeacherName(bookingForm.advisorName) : null,
          contactPhone: bookingForm.contactPhone || null,
          equipmentNeeded: bookingForm.equipmentNeeded || null,
          note: bookingForm.note || null,
          isTimetable: canManageRooms && bookingMode === 'TIMETABLE',
          autoApprove: canManageRooms ? autoApproveBatch : false,
          skipConflicts: skipConflicts,
          previewOnly: false,
          termName: currentTermObj?.name || '',
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || `บันทึกรายการสำเร็จ ${data.createdCount} รายการ`);
        setShowBookingModal(false);
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกรายการ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Submit Booking Request
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingMode !== 'SINGLE') {
      return handleBatchBookingSubmit(e);
    }
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย (@ku.th) ก่อนยื่นคำขอจองห้อง');
      return;
    }
    if (!bookingForm.roomId) {
      alert('กรุณาเลือกห้องปฏิบัติการที่ต้องการขอใช้');
      return;
    }
    if (!bookingForm.bookingDate) {
      alert('กรุณาระบุวันที่ต้องการใช้งานห้อง');
      return;
    }
    if (!bookingForm.startTime || !bookingForm.endTime) {
      alert('กรุณาระบุช่วงเวลาเริ่มต้นและสิ้นสุด');
      return;
    }
    if (bookingForm.startTime >= bookingForm.endTime) {
      alert('เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุด');
      return;
    }
    if (conflictItem) {
      alert(
        `ช่วงเวลา ${bookingForm.startTime} - ${bookingForm.endTime} น. ทับซ้อนกับคำขออื่น ("${conflictItem.title}") สถานะ: ${
          conflictItem.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รอพิจารณา'
        } กรุณาเลือกช่วงเวลาอื่น`
      );
      return;
    }
    if (!bookingForm.title?.trim()) {
      alert('กรุณากรอกหัวข้อ / ชื่องานที่ขอใช้งานห้อง');
      return;
    }
    if (!bookingForm.purpose) {
      alert('กรุณาเลือกวัตถุประสงค์การใช้งานห้อง');
      return;
    }
    if (!bookingForm.attendeesCount || Number(bookingForm.attendeesCount) <= 0) {
      alert('กรุณากรอกจำนวนผู้เข้าใช้งาน (คน) ให้ถูกต้อง');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/room-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingForm,
          isTimetable: false,
          advisorName: bookingForm.advisorName ? formatTeacherName(bookingForm.advisorName) : null,
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`ยื่นคำขอจองห้องสำเร็จ! เลขที่คำขอ: ${data.bookingNumber}`);
        setShowBookingModal(false);
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการยื่นคำขอจองห้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Approve Booking
  const handleApprove = async (bookingId: string) => {
    if (!confirm('ยืนยันการอนุมัติคำขอใช้ห้องนี้?')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/room-bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('อนุมัติคำขอจองห้องเรียบร้อยแล้ว');
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการอนุมัติ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Reject Booking
  const handleReject = async (bookingId: string) => {
    const reason = prompt('กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอ:');
    if (reason === null) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/room-bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          userId: currentUser?.id,
          reason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('บันทึกไม่อนุมัติคำขอเรียบร้อยแล้ว');
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Cancel Booking (by Requester for Pending)
  const handleCancel = async (bookingId: string) => {
    if (!confirm('คุณต้องการยกเลิกคำขอจองห้องนี้ใช่หรือไม่?')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/room-bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL', userId: currentUser?.id }),
      });

      if (res.ok) {
        alert('ยกเลิกคำขอจองห้องเรียบร้อยแล้ว');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการยกเลิก');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Approve Batch Bookings (1-Click for Admin/Officer)
  const handleBatchRoomApprove = async (batchGroupId: string, count: number) => {
    if (!confirm(`ยืนยันการอนุมัติคำขอจองห้องทั้งชุด (${count} รายการ)?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/room-bookings/batch-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchGroupId,
          action: 'APPROVE',
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`อนุมัติคำขอจองห้องทั้งชุดเรียบร้อยแล้ว (${data.approvedCount} รายการ)`);
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการอนุมัติชุดคำขอ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Reject Batch Bookings (with reason for Admin/Officer)
  const handleBatchRoomReject = async (batchGroupId: string, count: number) => {
    const reason = prompt(`กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอทั้งชุด (${count} รายการ):`);
    if (reason === null) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/room-bookings/batch-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchGroupId,
          action: 'REJECT',
          userId: currentUser?.id,
          reason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`บันทึกไม่อนุมัติคำขอทั้งชุดเรียบร้อยแล้ว (${data.rejectedCount} รายการ)`);
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Cancel Batch Bookings (by Requester or Admin)
  const handleBatchRoomCancel = async (batchGroupId: string, count: number) => {
    if (!confirm(`คุณต้องการยกเลิกคำขอจองห้องทั้งชุด (${count} รายการ) ใช่หรือไม่?`)) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/room-bookings/batch-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchGroupId,
          action: 'CANCEL',
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || `ยกเลิกคำขอทั้งชุดเรียบร้อยแล้ว (${count} รายการ)`);
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการยกเลิกชุดคำขอ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Open Cancel Approved Booking Modal
  const handleOpenCancelModal = (booking: any) => {
    setCancelModalBooking(booking);
    setCancelReason('');
  };

  // Actions: Confirm Cancel Approved Booking (by Admin / Lab Officer)
  const handleConfirmCancelApproved = async () => {
    if (!cancelModalBooking) return;
    if (!cancelReason.trim()) {
      alert('กรุณาระบุเหตุผลในการยกเลิกการจองห้อง');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/room-bookings/${cancelModalBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL',
          userId: currentUser?.id,
          reason: cancelReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('ยกเลิกการจองและคืนห้องว่างเรียบร้อยแล้ว');
        setCancelModalBooking(null);
        setCancelReason('');
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการยกเลิก');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Open Reassign Modal
  const handleOpenReassignModal = (booking: any) => {
    setReassignModalBooking(booking);
    setTargetRoomIdForReassign('');
    setReassignReason('');
  };

  // Actions: Confirm Reassign Room (by Admin / Lab Officer)
  const handleConfirmReassign = async () => {
    if (!reassignModalBooking) return;
    if (!targetRoomIdForReassign) {
      alert('กรุณาเลือกห้องปฏิบัติการใหม่ที่ต้องการย้ายไป');
      return;
    }
    if (targetRoomIdForReassign === reassignModalBooking.roomId) {
      alert('ห้องที่เลือกเป็นห้องเดิม กรุณาเลือกห้องอื่น');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/room-bookings/${reassignModalBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REASSIGN_ROOM',
          userId: currentUser?.id,
          targetRoomId: targetRoomIdForReassign,
          reason: reassignReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'ย้ายห้องปฏิบัติการเรียบร้อยแล้ว');
        setReassignModalBooking(null);
        setTargetRoomIdForReassign('');
        setReassignReason('');
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการย้ายห้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Permanent Delete Booking (by Admin only)
  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการจองห้องนี้ทิ้งถาวร? (เฉพาะแอดมิน) การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/room-bookings/${bookingId}?userId=${currentUser?.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        alert('ลบรายการจองห้องถาวรเรียบร้อยแล้ว');
        fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการลบรายการ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Save Room (Create or Edit)
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.code || !roomForm.name) {
      alert('กรุณากรอกรหัสและชื่อห้อง');
      return;
    }

    setSubmitting(true);
    try {
      const url = roomToEdit ? `/api/rooms/${roomToEdit.id}` : '/api/rooms';
      const method = roomToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomForm),
      });

      if (res.ok) {
        alert(roomToEdit ? 'แก้ไขห้องสำเร็จ!' : 'เพิ่มห้องปฏิบัติการใหม่สำเร็จ!');
        setShowRoomModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการบันทึกห้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Actions: Toggle Room Status (Open / Close)
  const handleConfirmToggleRoom = async () => {
    if (!roomToToggle) return;
    const newStatus = !roomToToggle.isActive;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${roomToToggle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: newStatus,
          closeReason: newStatus ? null : (roomToggleReason || 'ปิดให้บริการชั่วคราว'),
        }),
      });

      if (res.ok) {
        setRoomToToggle(null);
        setRoomToggleReason('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหรือปิดการใช้งานห้อง "${roomName}"?`)) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
      const data = await res.json();
      alert(data.message || 'ดำเนินการเรียบร้อย');
      fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบห้อง');
    }
  };

  // Helpers: Date formatting
  const thaiMonthDisplay = currentMonth.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return '-';
    try {
      const clean = getCleanLocalDateStr(dateStr);
      const [y, m, d] = clean.split('-');
      if (!y || !m || !d) return '-';
      const year = parseInt(y, 10) + 543;
      return `${d}/${m}/${year}`;
    } catch {
      return '-';
    }
  };

  // Calendar cells generation (42 cells)
  const currentYear = currentMonth.getFullYear();
  const currentMonthIdx = currentMonth.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInCurrentMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonthIdx, 0).getDate();

  const calendarCells: {
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[] = [];

  const todayDateStr = getCleanLocalDateStr(new Date());

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const d = new Date(currentYear, currentMonthIdx - 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNumber: dayNum, isCurrentMonth: false, isToday: dateStr === todayDateStr });
  }

  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNumber: dayNum, isCurrentMonth: true, isToday: dateStr === todayDateStr });
  }

  const remainingCells = 42 - calendarCells.length;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const d = new Date(currentYear, currentMonthIdx + 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNumber: dayNum, isCurrentMonth: false, isToday: false });
  }

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    if (selectedRoomId !== 'ALL' && b.roomId !== selectedRoomId) return false;
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBatch = b.batchGroupId?.toLowerCase().includes(q);
      const matchNumber = b.bookingNumber?.toLowerCase().includes(q);
      const matchTitle = b.title?.toLowerCase().includes(q);
      const matchPurpose = b.purpose?.toLowerCase().includes(q);
      const matchUser = b.user?.name?.toLowerCase().includes(q) || b.user?.studentId?.toLowerCase().includes(q);
      const matchRoom = b.room?.name?.toLowerCase().includes(q) || b.room?.code?.toLowerCase().includes(q);
      if (!matchBatch && !matchNumber && !matchTitle && !matchPurpose && !matchUser && !matchRoom) return false;
    }
    return true;
  });

  interface GroupedRoomBooking {
    isBatch: boolean;
    batchGroupId?: string;
    batchType?: 'TIMETABLE' | 'MULTI_ROOM' | 'MULTI_DAY' | 'SPECIAL' | 'SINGLE';
    batchSummary?: {
      totalSlots: number;
      pendingSlots: number;
      approvedSlots: number;
      rejectedSlots: number;
      cancelledSlots: number;
      roomNames: string[];
      datesText: string;
      earliestDate: string;
      latestDate: string;
      slots: any[];
    };
    primary: any;
  }

  const groupedBookings: GroupedRoomBooking[] = useMemo(() => {
    const batchMap = new Map<string, any[]>();
    const singles: any[] = [];

    for (const b of filteredBookings) {
      if (b.batchGroupId) {
        if (!batchMap.has(b.batchGroupId)) {
          batchMap.set(b.batchGroupId, []);
        }
        batchMap.get(b.batchGroupId)!.push(b);
      } else {
        singles.push(b);
      }
    }

    const result: GroupedRoomBooking[] = [];

    // Add batches
    for (const [batchId, items] of batchMap.entries()) {
      const sorted = [...items].sort((a, b) => {
        const dateDiff = new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });

      const pendingSlots = sorted.filter((it) => it.status === 'PENDING').length;
      const approvedSlots = sorted.filter((it) => it.status === 'APPROVED').length;
      const rejectedSlots = sorted.filter((it) => it.status === 'REJECTED').length;
      const cancelledSlots = sorted.filter((it) => it.status === 'CANCELLED').length;

      const distinctRooms = Array.from(new Set(sorted.map((it) => it.room?.name || it.roomId)));
      const distinctDates = Array.from(
        new Set(
          sorted.map((it) =>
            typeof it.bookingDate === 'string'
              ? it.bookingDate.split('T')[0]
              : new Date(it.bookingDate).toISOString().split('T')[0]
          )
        )
      );

      let bType: 'TIMETABLE' | 'MULTI_ROOM' | 'MULTI_DAY' | 'SPECIAL' | 'SINGLE' = 'SINGLE';
      if (sorted.some((it) => it.isTimetable || it.note?.includes('[ตารางเรียน'))) {
        bType = 'TIMETABLE';
      } else if (distinctRooms.length > 1 && distinctDates.length === 1) {
        bType = 'MULTI_ROOM';
      } else if (distinctRooms.length === 1 && distinctDates.length > 1) {
        bType = 'MULTI_DAY';
      } else if (distinctRooms.length > 1 && distinctDates.length > 1) {
        bType = 'SPECIAL';
      } else {
        bType = 'SINGLE';
      }

      const earliestDate = sorted[0].bookingDate;
      const latestDate = sorted[sorted.length - 1].bookingDate;
      let datesText = '';
      if (distinctDates.length === 1) {
        datesText = formatDate(earliestDate);
      } else {
        datesText = `${formatDate(earliestDate)} - ${formatDate(latestDate)} (${distinctDates.length} วัน)`;
      }

      result.push({
        isBatch: true,
        batchGroupId: batchId,
        batchType: bType,
        batchSummary: {
          totalSlots: sorted.length,
          pendingSlots,
          approvedSlots,
          rejectedSlots,
          cancelledSlots,
          roomNames: distinctRooms,
          datesText,
          earliestDate: typeof earliestDate === 'string' ? earliestDate : earliestDate.toISOString(),
          latestDate: typeof latestDate === 'string' ? latestDate : latestDate.toISOString(),
          slots: sorted,
        },
        primary: sorted[0],
      });
    }

    // Add singles
    for (const b of singles) {
      result.push({
        isBatch: false,
        primary: b,
      });
    }

    // Sort by latest created or earliest bookingDate
    return result.sort((a, b) => {
      const timeA = new Date(a.primary.createdAt || a.primary.bookingDate).getTime();
      const timeB = new Date(b.primary.createdAt || b.primary.bookingDate).getTime();
      return timeB - timeA;
    });
  }, [filteredBookings]);

  // Request-level pending count (counting batch groups as 1 request)
  const pendingRequestsCount = useMemo(() => {
    const batchSet = new Set<string>();
    let count = 0;
    for (const b of bookings) {
      if (b.status === 'PENDING') {
        if (b.batchGroupId) {
          if (!batchSet.has(b.batchGroupId)) {
            batchSet.add(b.batchGroupId);
            count++;
          }
        } else {
          count++;
        }
      }
    }
    return count;
  }, [bookings]);

  // Selected date bookings
  const selectedDateBookings = filteredBookings.filter((b) => {
    return getCleanLocalDateStr(b.bookingDate) === selectedDate;
  });

  // KPI calculations
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const approvedCount = bookings.filter((b) => b.status === 'APPROVED').length;
  const activeRoomsCount = visibleRooms.filter((r) => r.isActive !== false).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>ระบบจองห้องปฏิบัติการสำหรับใช้งาน (Room Reservation)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              ตารางและการยื่นคำขอจองห้องปฏิบัติการ
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              ขอใช้ห้องปฏิบัติการสำหรับการเรียนการสอน การสอบประเมิน การฝึกกลุ่ม และกิจกรรมต่างๆ พร้อมระบบตรวจสอบช่วงเวลาไม่ให้ชนกัน
            </p>
          </div>

          {/* Quick Action Button & Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (!currentUser) {
                  if (confirm('คุณจำเป็นต้องเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย (@ku.th) ก่อนทำรายการจองห้อง ต้องการเข้าสู่ระบบตอนนี้หรือไม่?')) {
                    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                  }
                  return;
                }
                resetBookingModal('SINGLE');
                setShowBookingModal(true);
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-teal-500/30 transition cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>+ ยื่นคำขอจองห้องใช้งาน</span>
            </button>

            {canManageRooms && (
              <button
                onClick={() => {
                  resetBookingModal('TIMETABLE');
                  setShowBookingModal(true);
                }}
                className="px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-1.5"
                title="จัดตารางเรียนรายวิชาประจำภาคการศึกษา หรือจองหลายห้องพร้อมกัน"
              >
                <CalendarDays className="w-4 h-4 text-indigo-200" />
                <span>+ จัดตารางเรียน / จองหลายห้อง</span>
              </button>
            )}

            {canManageRooms && (
              <button
                onClick={() => {
                  setRoomToEdit(null);
                  setRoomForm({
                    code: `LAB-SIM-0${rooms.length + 1}`,
                    name: '',
                    location: '',
                    capacity: 10,
                    description: '',
                    closeReason: '',
                  });
                  setShowRoomModal(true);
                }}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition cursor-pointer flex items-center gap-1.5"
              >
                <Building className="w-4 h-4 text-teal-300" />
                <span>+ เพิ่มห้องใหม่</span>
              </button>
            )}
          </div>
        </div>

        {/* Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 block">ห้องที่เปิดให้จอง</span>
            <div className="text-xl font-black text-emerald-300 mt-0.5">
              {activeRoomsCount} <span className="text-xs font-normal text-slate-300">/ {visibleRooms.length} ห้อง</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 block">คำขอรออนุมัติ</span>
            <div className="text-xl font-black text-amber-300 mt-0.5">
              {pendingCount} <span className="text-xs font-normal text-slate-300">รายการ</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 block">อนุมัติแล้วในเดือนนี้</span>
            <div className="text-xl font-black text-teal-300 mt-0.5">
              {approvedCount} <span className="text-xs font-normal text-slate-300">รอบใช้งาน</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 block">การจองทั้งหมด</span>
            <div className="text-xl font-black text-indigo-300 mt-0.5">
              {bookings.length} <span className="text-xs font-normal text-slate-300">รายการ</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button
            onClick={() => setActiveTab('TIMETABLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'TIMETABLE'
                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>ตารางการใช้ห้อง (Timetable & Calendar)</span>
          </button>

          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'REQUESTS'
                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>รายการคำขอ & การอนุมัติ ({bookings.length})</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-900 font-black rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="ml-auto p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-16 shadow-sm flex items-center justify-center">
          <LoadingSpinner
            message="กำลังโหลดข้อมูลห้องปฏิบัติการและตารางการจอง..."
            submessage="กำลังเชื่อมต่อและดึงข้อมูลสถานะห้องและรายการจองใช้งาน"
          />
        </div>
      ) : (
        <>
          {/* TAB 1: TIMETABLE & CALENDAR VIEW */}
          {activeTab === 'TIMETABLE' && (
        <div className="space-y-6">
          {/* SECTION 1: ROOM STATUS & AVAILABILITY BAR */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    สถานะห้องปฏิบัติการ ({visibleRooms.length} ห้อง)
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    เปิด {activeRoomsCount}
                  </span>
                  {visibleRooms.length - activeRoomsCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      ปิด {visibleRooms.length - activeRoomsCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เลือกดูสถานะห้องตามหมวดหมู่ หรือคลิกชิปห้องเพื่อกรองตารางเวลาทันที
                </p>
              </div>

              {/* Action Buttons & Room Filter Dropdown */}
              <div className="flex flex-wrap items-center gap-2">
                {canManageRooms && archivedRoomsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowArchivedRooms(!showArchivedRooms)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                      showArchivedRooms
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                    title={showArchivedRooms ? 'คลิกเพื่อซ่อนห้องที่เลิกใช้งาน' : 'คลิกเพื่อดูห้องที่ถูกปิดถาวร/เลิกใช้งาน'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{showArchivedRooms ? 'ซ่อนห้องที่เลิกใช้งาน' : `ห้องที่เลิกใช้งาน (${archivedRoomsCount})`}</span>
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">กรองห้อง:</span>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="ALL">ทุกห้องปฏิบัติการ ({visibleRooms.length})</option>
                    {ROOM_CATEGORIES.filter((c) => c.id !== 'ALL').map((category) => {
                      const catRooms = visibleRooms.filter(
                        (r) => getRoomCategory(r.code, r.name) === category.id
                      );
                      if (catRooms.length === 0) return null;
                      return (
                        <optgroup key={category.id} label={`${category.icon} ${category.shortLabel}`}>
                          {catRooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.code} - {r.name} {isRoomArchived(r) ? '(เลิกใช้งาน)' : ''}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                {/* Toggle Expand/Collapse Cards */}
                <button
                  type="button"
                  onClick={() => setIsRoomsOverviewExpanded(!isRoomsOverviewExpanded)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                    isRoomsOverviewExpanded
                      ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                  title={isRoomsOverviewExpanded ? 'ย่อมุมมองการ์ดให้กะทัดรัด' : 'ขยายดูการ์ดห้องแบบละเอียดเพื่อจัดการสถานะ'}
                >
                  <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{isRoomsOverviewExpanded ? 'ย่อมุมมองการ์ด' : 'ขยายดูการ์ดห้อง'}</span>
                  {isRoomsOverviewExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> หมวดหมู่:
              </span>
              {ROOM_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                      isActive
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/30'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.shortLabel}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* COMPACT VIEW (DEFAULT): Horizontal Room Pill Chips */}
            {!isRoomsOverviewExpanded ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {categoryFilteredRooms.map((room) => {
                  const isArchived = isRoomArchived(room);
                  const isOpen = room.isActive !== false;
                  const isSelected = selectedRoomId === room.id;

                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoomId(selectedRoomId === room.id ? 'ALL' : room.id)}
                      className={`group px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 border ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/30 text-teal-900 dark:text-teal-200 font-bold shadow-sm'
                          : isArchived
                          ? 'bg-slate-100/60 dark:bg-slate-850/40 border-slate-300 dark:border-slate-700 text-slate-500 opacity-70'
                          : isOpen
                          ? 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 text-slate-800 dark:text-slate-200'
                          : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
                      }`}
                      title={`${room.code}: ${room.name} (${isOpen ? 'เปิดให้จอง' : 'ปิดให้บริการ'})`}
                    >
                      {/* Status Dot */}
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isArchived
                            ? 'bg-slate-400'
                            : isOpen
                            ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-mono font-bold text-[11px] text-teal-800 dark:text-teal-300">
                        {room.code}
                      </span>
                      <span className="truncate max-w-[140px] text-slate-700 dark:text-slate-300">
                        {room.name}
                      </span>
                      {!isOpen && !isArchived && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-1 rounded">
                          ปิด
                        </span>
                      )}
                    </button>
                  );
                })}

                {canManageRooms && (
                  <button
                    type="button"
                    onClick={() => setIsRoomsOverviewExpanded(true)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50/60 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-800/60 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>จัดการ/แก้ไขสถานะห้อง</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              /* EXPANDED VIEW: Detailed Grid Cards (Filtered by Category) */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {categoryFilteredRooms.map((room) => {
                  const isArchived = isRoomArchived(room);
                  const isOpen = room.isActive !== false;
                  return (
                    <div
                      key={room.id}
                      className={`rounded-2xl p-4 border transition flex flex-col justify-between space-y-3 ${
                        isArchived
                          ? 'bg-slate-100/60 dark:bg-slate-850/40 border-slate-300 dark:border-slate-700/60 opacity-75'
                          : isOpen
                          ? 'bg-slate-50/50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 hover:border-teal-300'
                          : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-90'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                            {room.code}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isArchived
                                ? 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                : isOpen
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isArchived ? (
                              <>
                                <Archive className="w-2.5 h-2.5" />
                                <span>เลิกใช้งานถาวร</span>
                              </>
                            ) : isOpen ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>เปิดให้จอง</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <span>ปิดให้บริการ</span>
                              </>
                            )}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                          {room.name}
                        </h4>

                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                          {room.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {room.location}
                            </span>
                          )}
                          <span>•</span>
                          <span>ความจุ {room.capacity} คน</span>
                        </div>

                        {!isOpen && room.closeReason && (
                          <div
                            className={`mt-2 p-2 rounded-xl border text-[11px] flex items-start gap-1.5 ${
                              isArchived
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {isArchived ? (
                              <Archive className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                            )}
                            <span>เหตุผล: {room.closeReason}</span>
                          </div>
                        )}
                      </div>

                      {/* Staff/Admin Open/Close Controls */}
                      {canManageRooms && (
                        <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setRoomToToggle(room);
                              setRoomToggleReason(room.closeReason || '');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                              isOpen
                                ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300'
                            }`}
                          >
                            {isOpen ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>ปิดรับจอง</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>เปิดรับจอง</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setRoomToEdit(room);
                                setRoomForm({
                                  code: room.code,
                                  name: room.name,
                                  location: room.location || '',
                                  capacity: room.capacity || 10,
                                  description: room.description || '',
                                  closeReason: room.closeReason || '',
                                });
                                setShowRoomModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="แก้ไขข้อมูลห้อง"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id, room.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="ลบหรือปิดห้อง"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: CALENDAR & TIMETABLE CONTROLS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Month Navigator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handlePrevMonth}
                    title="เดือนก่อนหน้า"
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="px-4 py-0.5 text-center min-w-[150px]">
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
                      {thaiMonthDisplay}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      (พ.ศ. {currentMonth.getFullYear() + 543})
                    </span>
                  </div>
                  <button
                    onClick={handleNextMonth}
                    title="เดือนถัดไป"
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleTodayMonth}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  วันนี้
                </button>
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => setViewMode('CALENDAR')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'CALENDAR'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>📅 ปฏิทินรายเดือน</span>
                </button>
                <button
                  onClick={() => setViewMode('LIST')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'LIST'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>📋 ตารางรายการ</span>
                </button>
              </div>
            </div>

            {/* VIEW 2.1: MONTHLY CALENDAR GRID */}
            {viewMode === 'CALENDAR' && (
              <div className="space-y-6 pt-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {/* Days Header */}
                  <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-center text-xs font-black text-slate-700 dark:text-slate-300 py-2.5">
                    <div className="text-rose-500">อา.</div>
                    <div>จ.</div>
                    <div>อ.</div>
                    <div>พ.</div>
                    <div>พฤ.</div>
                    <div>ศ.</div>
                    <div className="text-teal-600">ส.</div>
                  </div>

                  {/* 42 Date Cells */}
                  <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                    {calendarCells.map((cell) => {
                      const dayBookings = filteredBookings.filter((b) => {
                        return getCleanLocalDateStr(b.bookingDate) === cell.dateStr;
                      });
                      const approved = dayBookings.filter((b) => b.status === 'APPROVED');
                      const pending = dayBookings.filter((b) => b.status === 'PENDING');
                      const isSelected = selectedDate === cell.dateStr;

                      return (
                        <div
                          key={cell.dateStr}
                          data-calendar-cell="true"
                          onClick={(e) => handleCellClick(e, cell.dateStr, dayBookings)}
                          onPointerEnter={(e) => handleCellPointerEnter(e, cell.dateStr, dayBookings)}
                          onPointerLeave={handleCellPointerLeave}
                          className={`min-h-[68px] sm:min-h-[95px] p-1 sm:p-2 transition cursor-pointer flex flex-col justify-between overflow-hidden ${
                            !cell.isCurrentMonth
                              ? 'bg-slate-50/40 dark:bg-slate-900/30 opacity-40'
                              : isSelected
                              ? 'bg-teal-50/70 dark:bg-teal-950/40 ring-2 ring-inset ring-teal-500 z-10'
                              : cell.isToday
                              ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/40'
                              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-0.5">
                            <span
                              className={`text-[11px] sm:text-xs font-bold rounded-md sm:rounded-lg w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0 ${
                                cell.isToday
                                  ? 'bg-teal-600 text-white font-black shadow-sm'
                                  : isSelected
                                  ? 'bg-teal-100 text-teal-900 font-black'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {cell.dayNumber}
                            </span>

                            {dayBookings.length > 0 && (
                              <>
                                <span className="sm:hidden text-[9px] font-black text-teal-700 dark:text-teal-300 bg-teal-100/90 dark:bg-teal-950 px-1 py-0.2 rounded-full leading-none">
                                  {dayBookings.length}
                                </span>
                                <span className="hidden sm:inline text-[10px] font-bold text-slate-400">
                                  {dayBookings.length} คิว
                                </span>
                              </>
                            )}
                          </div>

                          {/* Day Badges */}
                          <div className="space-y-0.5 sm:space-y-1 my-0.5 sm:my-1">
                            {approved.length > 0 && (
                              <div className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 truncate">
                                🟢 <span className="hidden sm:inline">อนุมัติ </span>{approved.length}<span className="hidden sm:inline"> รายการ</span>
                              </div>
                            )}
                            {pending.length > 0 && (
                              <div className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 truncate">
                                ⏳ <span className="hidden sm:inline">รออนุมัติ </span>{pending.length}<span className="hidden sm:inline"> รายการ</span>
                              </div>
                            )}
                          </div>

                          <div className="h-0.5 sm:h-1">
                            {isSelected && <div className="w-full h-0.5 sm:h-1 bg-teal-500 rounded-full"></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Floating Calendar Hover / Pin Popover */}
                  {hoverPopover && (
                    <CalendarHoverCard
                      isOpen={hoverPopover.isOpen}
                      isPinned={hoverPopover.isPinned}
                      anchorRect={hoverPopover.anchorRect}
                      dateStr={hoverPopover.dateStr}
                      items={hoverPopover.items}
                      onClose={() => setHoverPopover(null)}
                    />
                  )}
                </div>

                {/* Day Detail Panel */}
                <div
                  id="rooms-selected-day-panel"
                  className="bg-slate-50/70 dark:bg-slate-850/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 scroll-mt-20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>คิวการจองห้องประจำวัน: {formatDate(selectedDate)}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        พบ {selectedDateBookings.length} รายการที่ขอใช้ห้องในวันนี้
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (!currentUser) {
                          if (confirm('คุณจำเป็นต้องเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย (@ku.th) ก่อนทำรายการจองห้อง ต้องการเข้าสู่ระบบตอนนี้หรือไม่?')) {
                            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                          }
                          return;
                        }
                        resetBookingModal('SINGLE');
                        setBookingForm((prev) => ({
                          ...prev,
                          bookingDate: selectedDate || '',
                        }));
                        setShowBookingModal(true);
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>จองห้องวันนี้</span>
                    </button>
                  </div>

                  {selectedDateBookings.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      ไม่มีการจองห้องในวันนี้ ทุกห้องเปิดว่างพร้อมรับการจอง
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedDateBookings.map((b) => (
                        <div
                          key={b.id}
                          className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm space-y-2 border-l-4 ${
                            b.status === 'APPROVED'
                              ? 'border-l-emerald-500 border-slate-200'
                              : b.status === 'PENDING'
                              ? 'border-l-amber-500 border-slate-200'
                              : 'border-l-rose-500 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                                {b.room?.name} ({b.room?.code})
                              </span>
                              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                                {b.title}
                              </h5>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                b.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.status === 'APPROVED' && 'อนุมัติแล้ว'}
                              {b.status === 'PENDING' && 'รออนุมัติ'}
                              {b.status === 'REJECTED' && 'ไม่อนุมัติ'}
                              {b.status === 'CANCELLED' && 'ยกเลิกแล้ว'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 font-bold text-teal-700">
                              <Clock className="w-3.5 h-3.5" />
                              {b.startTime} - {b.endTime} น.
                            </span>
                            <span>•</span>
                            <span>วัตถุประสงค์: {b.purpose}</span>
                            <span>•</span>
                            <span>ผู้ขอ: {formatUserName(b.user)} ({b.attendeesCount} คน)</span>
                          </div>

                          {/* Quick Approval Buttons for Pending */}
                          {b.status === 'PENDING' && canApprove && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleReject(b.id)}
                                className="px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                              >
                                ไม่อนุมัติ
                              </button>
                              <button
                                onClick={() => handleApprove(b.id)}
                                className="px-3 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm transition"
                              >
                                อนุมัติคำขอ
                              </button>
                            </div>
                          )}

                          {/* Quick Actions for Approved (Admin & Officer only) */}
                          {b.status === 'APPROVED' && canManageRooms && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenReassignModal(b)}
                                className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                                title="ย้ายห้องปฏิบัติการ"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>ย้ายห้อง</span>
                              </button>
                              <button
                                onClick={() => handleOpenCancelModal(b)}
                                className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                                title="ยกเลิกการจองและคืนห้อง"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>ยกเลิกการจอง</span>
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteBooking(b.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition cursor-pointer"
                                  title="ลบรายการถาวร"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2.2: LIST VIEW */}
            {viewMode === 'LIST' && (
              <div className="space-y-3 pt-2">
                {filteredBookings.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    ไม่พบรายการจองห้องที่ตรงกับเงื่อนไข
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {b.bookingNumber}
                            </span>
                            <span className="font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">
                              {b.room?.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                b.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.status === 'APPROVED' && 'อนุมัติแล้ว'}
                              {b.status === 'PENDING' && 'รออนุมัติ'}
                              {b.status === 'REJECTED' && 'ไม่อนุมัติ'}
                              {b.status === 'CANCELLED' && 'ยกเลิกแล้ว'}
                            </span>
                          </div>

                          <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {b.title}
                          </h5>

                          <div className="flex flex-wrap items-center gap-3 text-slate-500">
                            <span>วันที่: <strong>{formatDate(b.bookingDate)}</strong></span>
                            <span>เวลา: <strong>{b.startTime} - {b.endTime} น.</strong></span>
                            <span>ผู้ขอ: <strong>{formatUserName(b.user)}</strong></span>
                            {b.contactPhone && <span>โทร: {b.contactPhone}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          {b.status === 'PENDING' && canApprove && (
                            <>
                              <button
                                onClick={() => handleReject(b.id)}
                                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
                              >
                                ไม่อนุมัติ
                              </button>
                              <button
                                onClick={() => handleApprove(b.id)}
                                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-sm cursor-pointer"
                              >
                                อนุมัติ
                              </button>
                            </>
                          )}
                          {b.status === 'APPROVED' && canManageRooms && (
                            <>
                              <button
                                onClick={() => handleOpenReassignModal(b)}
                                className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                title="ย้ายห้องปฏิบัติการ"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>ย้ายห้อง</span>
                              </button>
                              <button
                                onClick={() => handleOpenCancelModal(b)}
                                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                title="ยกเลิกการจองและคืนห้อง"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>ยกเลิกการจอง</span>
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteBooking(b.id)}
                              className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer"
                              title="ลบรายการถาวร"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REQUESTS & APPROVALS */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          {/* Status Filter Tabs & Search */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL', label: `ทั้งหมด (${bookings.length})` },
                { key: 'PENDING', label: `รออนุมัติ (${pendingRequestsCount})` },
                { key: 'APPROVED', label: `อนุมัติแล้ว (${bookings.filter((b) => b.status === 'APPROVED').length})` },
                { key: 'REJECTED', label: 'ไม่อนุมัติ' },
                { key: 'CANCELLED', label: 'ยกเลิก' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="ค้นหาชื่อห้อง / หัวข้องาน / ผู้ขอ / รหัสชุด..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:ring-2 focus:ring-teal-500/20"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Bookings Card List */}
          {groupedBookings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs shadow-sm">
              ไม่พบรายการคำขอจองห้องที่ตรงกับเงื่อนไข
            </div>
          ) : (
            <div className="space-y-4">
              {groupedBookings.map((item) => {
                if (item.isBatch && item.batchSummary && item.batchGroupId) {
                  const b = item.primary;
                  const isBatchPending = item.batchSummary.pendingSlots > 0;
                  const isBatchApproved =
                    item.batchSummary.pendingSlots === 0 && item.batchSummary.approvedSlots > 0;
                  const isBatchRejected =
                    item.batchSummary.pendingSlots === 0 &&
                    item.batchSummary.approvedSlots === 0 &&
                    item.batchSummary.rejectedSlots > 0;
                  const isBatchCancelled =
                    item.batchSummary.cancelledSlots === item.batchSummary.totalSlots;
                  const isMyBooking = currentUser?.id === b.userId;
                  const isExpanded = expandedBatchIds.includes(item.batchGroupId);

                  // Visual theme borders by batchType
                  const themeBorder =
                    item.batchType === 'TIMETABLE'
                      ? 'border-l-emerald-500'
                      : item.batchType === 'MULTI_ROOM'
                      ? 'border-l-indigo-500'
                      : item.batchType === 'MULTI_DAY'
                      ? 'border-l-amber-500'
                      : item.batchType === 'SPECIAL'
                      ? 'border-l-purple-500'
                      : isBatchApproved
                      ? 'border-l-emerald-500'
                      : isBatchPending
                      ? 'border-l-amber-500'
                      : 'border-l-slate-400';

                  return (
                    <div
                      key={item.batchGroupId}
                      id={`booking-card-${item.batchGroupId}`}
                      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 border-l-4 ${themeBorder} transition-all`}
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded">
                            {item.batchGroupId}
                          </span>

                          {/* Batch Type Badge */}
                          {item.batchType === 'TIMETABLE' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>ตารางเรียนรายวิชา ({item.batchSummary.totalSlots} คาบ)</span>
                            </span>
                          )}
                          {item.batchType === 'MULTI_ROOM' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full">
                              <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>จองหลายห้อง ({item.batchSummary.roomNames.length} ห้อง)</span>
                            </span>
                          )}
                          {item.batchType === 'MULTI_DAY' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
                              <CalendarDays className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>จองห้องเดียวต่อเนื่อง ({item.batchSummary.totalSlots} วัน)</span>
                            </span>
                          )}
                          {item.batchType === 'SPECIAL' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 rounded-full">
                              <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>กิจกรรมพิเศษ ({item.batchSummary.roomNames.length} ห้อง x {item.batchSummary.totalSlots} สล็อต)</span>
                            </span>
                          )}

                          {/* Overall Status Badge */}
                          {isBatchPending && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>รออนุมัติ ({item.batchSummary.pendingSlots}/{item.batchSummary.totalSlots})</span>
                            </span>
                          )}
                          {isBatchApproved && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>อนุมัติแล้วทั้งชุด ({item.batchSummary.approvedSlots})</span>
                            </span>
                          )}
                          {isBatchRejected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>ไม่อนุมัติ ({item.batchSummary.rejectedSlots})</span>
                            </span>
                          )}
                          {isBatchCancelled && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                              ยกเลิกแล้วทั้งชุด
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatUserName(b.user)}</span>
                          {b.user?.studentId && (
                            <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                              {b.user.studentId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="md:col-span-2 space-y-1.5">
                          <div>
                            <span className="text-slate-400 font-bold">ชื่องาน/การใช้งาน: </span>
                            <span className="text-slate-900 dark:text-slate-100 font-black text-sm">{b.title}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{b.purpose}</span>
                          </div>

                          {b.course && (
                            <div className="inline-flex items-center gap-1.5 text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded font-bold border border-teal-100 dark:border-teal-800">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>รายวิชา: [{b.course.code}] {b.course.name}</span>
                              {b.course.targetYear && (
                                <span className="text-[10px] bg-teal-200/80 dark:bg-teal-900 text-teal-900 dark:text-teal-200 px-1.5 py-0.2 rounded font-bold">
                                  ชั้นปีที่ {b.course.targetYear}
                                </span>
                              )}
                            </div>
                          )}

                          {b.advisorName && (
                            <div className="flex items-center gap-1 text-indigo-700 font-semibold">
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                              <span>อาจารย์ผู้รับผิดชอบ/ที่ปรึกษา: {formatTeacherName(b.advisorName)}</span>
                            </div>
                          )}

                          {b.equipmentNeeded && (
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-medium flex items-start gap-1.5">
                              <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span>อุปกรณ์ที่ขอให้จัดเตรียม: <strong>{b.equipmentNeeded}</strong></span>
                            </div>
                          )}

                          {b.note && (
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-[11px] whitespace-pre-line">
                              <strong>หมายเหตุ/ประวัติ:</strong> {b.note}
                            </div>
                          )}
                        </div>

                        {/* Stat Summary Box */}
                        <div className="space-y-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-start gap-1.5">
                            <Building2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {item.batchSummary.roomNames.length === 1
                                  ? item.batchSummary.roomNames[0]
                                  : `${item.batchSummary.roomNames.length} ห้องปฏิบัติการ`}
                              </span>
                              {item.batchSummary.roomNames.length > 1 && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {item.batchSummary.roomNames.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-1.5 font-bold">
                            <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                            <span>{item.batchSummary.datesText}</span>
                          </div>

                          <div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-400">
                            <Clock className="w-4 h-4 text-teal-600" />
                            <span>เวลา: {b.startTime} - {b.endTime} น.</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>จำนวนผู้ใช้: {b.attendeesCount} คน</span>
                            {b.contactPhone && (
                              <span className="ml-auto flex items-center gap-1 text-[11px]">
                                <Phone className="w-3 h-3 text-slate-400" /> {b.contactPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {/* Drawer Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleExpandBatch(item.batchGroupId!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5 text-teal-600" />
                              <span>ซ่อนรายละเอียดรายสล็อต</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                              <span>ตรวจสอบรายละเอียดรายสล็อต ({item.batchSummary.totalSlots} รายการ)</span>
                            </>
                          )}
                        </button>

                        {/* Batch Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {/* Cancel whole batch for Requester */}
                          {isBatchPending && isMyBooking && (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() =>
                                handleBatchRoomCancel(
                                  item.batchGroupId!,
                                  item.batchSummary!.pendingSlots
                                )
                              }
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                            >
                              ยกเลิกคำขอทั้งชุด ({item.batchSummary.pendingSlots})
                            </button>
                          )}

                          {/* Approver 1-Click Batch Actions */}
                          {isBatchPending && canApprove && (
                            <>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() =>
                                  handleBatchRoomReject(
                                    item.batchGroupId!,
                                    item.batchSummary!.pendingSlots
                                  )
                                }
                                className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                              >
                                ไม่อนุมัติทั้งชุด
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() =>
                                  handleBatchRoomApprove(
                                    item.batchGroupId!,
                                    item.batchSummary!.pendingSlots
                                  )
                                }
                                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>อนุมัติทั้งชุด ({item.batchSummary.pendingSlots})</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expandable Drawer of Sub-Slots */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between pb-1">
                            <span>รายการสล็อตการใช้ห้องในชุดคำขอนี้ ({item.batchSummary.totalSlots} รายการ)</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              คลิกจัดการสล็อตเดี่ยวหรืออนุมัติ/ไม่อนุมัติเป็นรายตัวได้
                            </span>
                          </div>

                          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                  <th className="py-2.5 px-3">#</th>
                                  <th className="py-2.5 px-3">รหัสคำขอ</th>
                                  <th className="py-2.5 px-3">ห้องปฏิบัติการ</th>
                                  <th className="py-2.5 px-3">วันที่ใช้งาน</th>
                                  <th className="py-2.5 px-3">ช่วงเวลา</th>
                                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                                  <th className="py-2.5 px-3 text-right">การจัดการ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {item.batchSummary.slots.map((slot, sIdx) => {
                                  const slotPending = slot.status === 'PENDING';
                                  const slotApproved = slot.status === 'APPROVED';
                                  const slotRejected = slot.status === 'REJECTED';
                                  const slotCancelled = slot.status === 'CANCELLED';

                                  return (
                                    <tr
                                      key={slot.id}
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                                    >
                                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                                        {sIdx + 1}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                        {slot.bookingNumber}
                                      </td>
                                      <td className="py-2.5 px-3 font-bold text-teal-800 dark:text-teal-300">
                                        {slot.room?.name} ({slot.room?.code})
                                      </td>
                                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                                        {formatDate(slot.bookingDate)}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                                        {slot.startTime} - {slot.endTime} น.
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        {slotPending && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                            <Clock className="w-2.5 h-2.5 text-amber-600" /> รออนุมัติ
                                          </span>
                                        )}
                                        {slotApproved && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> อนุมัติแล้ว
                                          </span>
                                        )}
                                        {slotRejected && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                                            <XCircle className="w-2.5 h-2.5 text-rose-600" /> ไม่อนุมัติ
                                          </span>
                                        )}
                                        {slotCancelled && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                            ยกเลิกแล้ว
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {slotPending && isMyBooking && (
                                            <button
                                              type="button"
                                              onClick={() => handleCancel(slot.id)}
                                              className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer"
                                            >
                                              ยกเลิก
                                            </button>
                                          )}
                                          {slotPending && canApprove && (
                                            <>
                                              <button
                                                type="button"
                                                disabled={submitting}
                                                onClick={() => handleReject(slot.id)}
                                                className="px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-bold cursor-pointer"
                                              >
                                                ไม่อนุมัติ
                                              </button>
                                              <button
                                                type="button"
                                                disabled={submitting}
                                                onClick={() => handleApprove(slot.id)}
                                                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold cursor-pointer flex items-center gap-1"
                                              >
                                                <Check className="w-2.5 h-2.5" />
                                                <span>อนุมัติ</span>
                                              </button>
                                            </>
                                          )}
                                          {slotApproved && canManageRooms && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenReassignModal(slot)}
                                                className="px-2 py-1 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 text-[10px] font-bold cursor-pointer"
                                                title="ย้ายห้อง"
                                              >
                                                ย้ายห้อง
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenCancelModal(slot)}
                                                className="px-2 py-1 rounded-lg border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 text-[10px] font-bold cursor-pointer"
                                                title="คืนห้อง"
                                              >
                                                คืนห้อง
                                              </button>
                                            </>
                                          )}
                                          {isAdmin && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteBooking(slot.id)}
                                              className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-[10px] cursor-pointer"
                                              title="ลบรายการถาวร"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                } else {
                  // Render Single Booking Card
                  const b = item.primary;
                  const isPending = b.status === 'PENDING';
                  const isApproved = b.status === 'APPROVED';
                  const isRejected = b.status === 'REJECTED';
                  const isCancelled = b.status === 'CANCELLED';
                  const isMyBooking = currentUser?.id === b.userId;

                  return (
                    <div
                      key={b.id}
                      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 border-l-4 ${
                        isApproved
                          ? 'border-l-emerald-500'
                          : isPending
                          ? 'border-l-amber-500'
                          : 'border-l-rose-500'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded">
                            {b.bookingNumber}
                          </span>
                          <span className="text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2.5 py-0.5 rounded border border-teal-100 dark:border-teal-800">
                            {b.room?.name} ({b.room?.code})
                          </span>

                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" /> รออนุมัติ
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> อนุมัติแล้ว
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3 text-rose-600" /> ไม่อนุมัติ
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                              ยกเลิกแล้ว
                            </span>
                          )}
                          {(b.isTimetable || b.note?.includes('[ตารางเรียน')) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                              <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> ตารางเรียน
                            </span>
                          )}
                          {b.note?.includes('[จองหลายห้อง]') && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">
                              <Building2 className="w-3 h-3 text-purple-600 dark:text-purple-400" /> จองหลายห้อง
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatUserName(b.user)}</span>
                          {b.user?.studentId && (
                            <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                              {b.user.studentId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="md:col-span-2 space-y-1.5">
                          <div>
                            <span className="text-slate-400 font-bold">ชื่องาน/การใช้งาน: </span>
                            <span className="text-slate-900 dark:text-slate-100 font-black text-sm">{b.title}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{b.purpose}</span>
                          </div>

                          {b.course && (
                            <div className="inline-flex items-center gap-1.5 text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded font-bold border border-teal-100 dark:border-teal-800">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>รายวิชา: [{b.course.code}] {b.course.name}</span>
                              {b.course.targetYear && (
                                <span className="text-[10px] bg-teal-200/80 dark:bg-teal-900 text-teal-900 dark:text-teal-200 px-1.5 py-0.2 rounded font-bold">
                                  ชั้นปีที่ {b.course.targetYear}
                                </span>
                              )}
                            </div>
                          )}

                          {b.advisorName && (
                            <div className="flex items-center gap-1 text-indigo-700 font-semibold">
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                              <span>อาจารย์ผู้รับผิดชอบ/ที่ปรึกษา: {formatTeacherName(b.advisorName)}</span>
                            </div>
                          )}

                          {b.equipmentNeeded && (
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-medium flex items-start gap-1.5">
                              <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span>อุปกรณ์ที่ขอให้จัดเตรียม: <strong>{b.equipmentNeeded}</strong></span>
                            </div>
                          )}

                          {isRejected && b.rejectionReason && (
                            <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-medium">
                              เหตุผลที่ไม่อนุมัติ: <strong>{b.rejectionReason}</strong>
                            </div>
                          )}

                          {isCancelled && b.rejectionReason && (
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                              เหตุผลที่ยกเลิก: <strong>{b.rejectionReason}</strong>
                            </div>
                          )}

                          {b.note && (
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-[11px] whitespace-pre-line">
                              <strong>หมายเหตุ/ประวัติ:</strong> {b.note}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-1.5 font-bold">
                            <Calendar className="w-4 h-4 text-teal-600" />
                            <span>วันที่: {formatDate(b.bookingDate)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-teal-700">
                            <Clock className="w-4 h-4 text-teal-600" />
                            <span>เวลา: {b.startTime} - {b.endTime} น.</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>จำนวนผู้ใช้: {b.attendeesCount} คน</span>
                          </div>
                          {b.contactPhone && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>โทร: {b.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          {b.approver && (
                            <span className="text-[11px] text-slate-400">
                              ผู้อนุมัติ: {formatUserName(b.approver)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && isMyBooking && (
                            <button
                              onClick={() => handleCancel(b.id)}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                            >
                              ยกเลิกคำขอ
                            </button>
                          )}

                          {isPending && canApprove && (
                            <>
                              <button
                                disabled={submitting}
                                onClick={() => handleReject(b.id)}
                                className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                              >
                                ไม่อนุมัติ
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => handleApprove(b.id)}
                                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>อนุมัติคำขอ</span>
                              </button>
                            </>
                          )}

                          {/* Approved Actions: Only Admin & Lab Officer can Reassign or Cancel approved bookings */}
                          {isApproved && canManageRooms && (
                            <>
                              <button
                                onClick={() => handleOpenReassignModal(b)}
                                className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                                title="ย้ายห้องปฏิบัติการสำหรับรายการที่อนุมัติแล้ว"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>ย้ายห้อง</span>
                              </button>
                              <button
                                onClick={() => handleOpenCancelModal(b)}
                                className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                                title="ยกเลิกการจองและคืนห้องว่างเข้าสู่ระบบ"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>ยกเลิกการจอง (คืนห้อง)</span>
                              </button>
                            </>
                          )}

                          {/* Admin permanent delete */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteBooking(b.id)}
                              className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer"
                              title="ลบรายการทิ้งถาวร (เฉพาะแอดมิน)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* MODAL: SUBMIT ROOM BOOKING (SINGLE / MULTI-ROOM / TIMETABLE) */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div
            className={`bg-white dark:bg-slate-900 rounded-3xl ${
              bookingMode === 'SINGLE' ? 'max-w-xl' : 'max-w-3xl'
            } w-full p-5 sm:p-7 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 max-h-[92vh] overflow-y-auto transition-all`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 px-2 py-0.5 rounded uppercase">
                  {bookingMode === 'SINGLE'
                    ? 'แบบฟอร์มขอใช้ห้อง'
                    : bookingMode === 'MULTI_ROOM'
                    ? 'การจองหลายห้องพร้อมกัน'
                    : 'จัดตารางเรียนรายวิชา / ตลอดภาคการศึกษา'}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                  {bookingMode === 'SINGLE' ? (
                    <Building2 className="w-5 h-5 text-teal-600" />
                  ) : bookingMode === 'MULTI_ROOM' ? (
                    <Layers className="w-5 h-5 text-purple-600" />
                  ) : (
                    <CalendarDays className="w-5 h-5 text-indigo-600" />
                  )}
                  <span>
                    {bookingMode === 'SINGLE'
                      ? 'ยื่นคำขอจองห้องปฏิบัติการสำหรับใช้งาน'
                      : bookingMode === 'MULTI_ROOM'
                      ? 'จองหลายห้องปฏิบัติการพร้อมกัน (Multi-Room)'
                      : 'จัดตารางเรียนรายวิชา / ประจำภาคการศึกษา'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {bookingMode === 'SINGLE'
                    ? 'ระบุห้อง วันที่ และช่วงเวลาที่ต้องการใช้งานห้องปฏิบัติการ'
                    : bookingMode === 'MULTI_ROOM'
                    ? 'เลือกหลายห้องในวันเดียวกัน เช่น สอบ OSCE หรือกิจกรรมหลายฐาน'
                    : 'กำหนดวันในสัปดาห์และช่วงวันที่ของภาคการศึกษา เพื่อสร้างตารางเรียนตลอดภาค'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher */}
            {canManageRooms ? (
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                    <span>เลือกประเภทการดำเนินการ:</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-600" />
                    <span>สิทธิ์เฉพาะแอดมิน & เจ้าหน้าที่</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* ปุ่ม 1: จองห้องปกติทั่วไป */}
                  <button
                    type="button"
                    onClick={() => {
                      if (bookingMode === 'TIMETABLE') setBookingMode('SINGLE');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-start gap-2.5 border ${
                      bookingMode !== 'TIMETABLE'
                        ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-sm border-teal-500/40 ring-1 ring-teal-500/20'
                        : 'bg-white/60 dark:bg-slate-850 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${bookingMode !== 'TIMETABLE' ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <Building className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold flex items-center gap-1">
                        <span>จองห้องทั่วไป / กิจกรรม</span>
                        {bookingMode !== 'TIMETABLE' && <span className="text-[10px] text-teal-600">✓ เลือกอยู่</span>}
                      </div>
                      <div className="text-[10px] opacity-75 font-normal">จองห้องเดียว, หลายห้อง, อบรม, สอบ OSCE</div>
                    </div>
                  </button>

                  {/* ปุ่ม 2: ตารางเรียน */}
                  <button
                    type="button"
                    onClick={() => {
                      setBookingMode('TIMETABLE');
                      if (bookingForm.roomId && !selectedRoomIds.includes(bookingForm.roomId)) {
                        setSelectedRoomIds([bookingForm.roomId]);
                      }
                      if (!bookingForm.purpose) {
                        setBookingForm((prev) => ({ ...prev, purpose: 'การเรียนการสอน' }));
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-start gap-2.5 border ${
                      bookingMode === 'TIMETABLE'
                        ? 'bg-white dark:bg-slate-700 text-indigo-800 dark:text-indigo-200 shadow-sm border-indigo-500/40 ring-2 ring-indigo-500/20'
                        : 'bg-white/60 dark:bg-slate-855 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${bookingMode === 'TIMETABLE' ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold flex items-center gap-1">
                        <span>ตารางเรียนประจำภาคเรียน</span>
                        {bookingMode === 'TIMETABLE' && <span className="text-[10px] text-indigo-600">✓ เลือกอยู่</span>}
                      </div>
                      <div className="text-[10px] opacity-75 font-normal">ระบุชั้นปีนิสิต & ขึ้นตารางสอนฝั่งระบบกลาง</div>
                    </div>
                  </button>
                </div>

                {/* Sub-modes for จองห้องปกติ */}
                {bookingMode !== 'TIMETABLE' ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] font-semibold text-slate-500">รูปแบบการจอง:</span>
                    <button
                      type="button"
                      onClick={() => setBookingMode('SINGLE')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        bookingMode === 'SINGLE'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <Building className="w-3 h-3" />
                      <span>ห้องเดียว (1 วัน)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingMode('MULTI_ROOM');
                        if (bookingForm.roomId && !selectedRoomIds.includes(bookingForm.roomId)) {
                          setSelectedRoomIds([bookingForm.roomId]);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        bookingMode === 'MULTI_ROOM'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>หลายห้อง (วันเดียว)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingMode('MULTI_DAY');
                        if (bookingForm.roomId && !selectedRoomIds.includes(bookingForm.roomId)) {
                          setSelectedRoomIds([bookingForm.roomId]);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        bookingMode === 'MULTI_DAY'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <CalendarDays className="w-3 h-3" />
                      <span>ต่อเนื่องหลายวัน</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded-xl text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>ข้อมูลจะถูกส่งไปยัง <strong>&ldquo;ตารางสอน & ตารางเรียนประจำภาคเรียน&rdquo;</strong> ฝั่งระบบกลางของคณะ พร้อมชั้นปีของนิสิต</span>
                  </div>
                )}
              </div>
            ) : isTeacher ? (
              /* อาจารย์ผู้สอน: เลือกจองทั่วไปได้ทั้ง 3 แบบ (ไม่เห็นตารางเรียน) */
              <div className="space-y-2 bg-purple-50/60 dark:bg-purple-950/30 p-2.5 rounded-2xl border border-purple-200/80 dark:border-purple-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <span>แบบฟอร์มการจองห้องสำหรับอาจารย์ผู้สอน:</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 dark:bg-purple-900/60 px-2 py-0.5 rounded-full">
                    รอเจ้าหน้าที่อนุมัติ
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-purple-200/60 dark:border-purple-800/60">
                  <span className="text-[11px] font-semibold text-slate-500">รูปแบบการจอง:</span>
                  <button
                    type="button"
                    onClick={() => setBookingMode('SINGLE')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      bookingMode === 'SINGLE'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <Building className="w-3 h-3" />
                    <span>ห้องเดียว (1 วัน)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingMode('MULTI_ROOM');
                      if (bookingForm.roomId && !selectedRoomIds.includes(bookingForm.roomId)) {
                        setSelectedRoomIds([bookingForm.roomId]);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      bookingMode === 'MULTI_ROOM'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>หลายห้อง (วันเดียว เช่น OSCE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingMode('MULTI_DAY');
                      if (bookingForm.roomId && !selectedRoomIds.includes(bookingForm.roomId)) {
                        setSelectedRoomIds([bookingForm.roomId]);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      bookingMode === 'MULTI_DAY'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <CalendarDays className="w-3 h-3" />
                    <span>ต่อเนื่องหลายวัน (เช่น อบรม CPR)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* นิสิต / ผู้ใช้ทั่วไป: ล็อกเป็นจองห้องเดียว 1 วัน */
              <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 p-2.5 rounded-2xl flex items-center gap-2 text-xs text-teal-800 dark:text-teal-200">
                <Building className="w-4 h-4 text-teal-600 shrink-0" />
                <span>แบบฟอร์มยื่นคำขอจองห้องปฏิบัติการพยาบาลสำหรับนิสิต (จองห้องเดียว 1 วัน)</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* ROOM SELECTION: SINGLE MODE */}
              {bookingMode === 'SINGLE' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ห้องปฏิบัติการที่ต้องการขอใช้ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={bookingForm.roomId}
                    onChange={(e) => setBookingForm({ ...bookingForm, roomId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">-- กรุณาเลือกห้องปฏิบัติการ --</option>
                    {ROOM_CATEGORIES.filter((c) => c.id !== 'ALL').map((category) => {
                      const catRooms = rooms.filter(
                        (r) => !isRoomArchived(r) && getRoomCategory(r.code, r.name) === category.id
                      );
                      if (catRooms.length === 0) return null;
                      return (
                        <optgroup key={category.id} label={`${category.icon} ${category.label}`}>
                          {catRooms.map((r) => (
                            <option key={r.id} value={r.id} disabled={!r.isActive}>
                              {r.code} - {r.name} {r.location ? `(${r.location})` : ''} {!r.isActive ? '(ปิดให้บริการ)' : ''}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              ) : (
                /* ROOM SELECTION: MULTI-ROOM / TIMETABLE MODE */
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      ห้องปฏิบัติการที่ต้องการขอใช้ <span className="text-rose-500">*</span>
                      <span className="ml-2 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                        (เลือกแล้ว {selectedRoomIds.length} ห้อง)
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={handleSelectAllRooms}
                        className="px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 transition cursor-pointer"
                      >
                        เลือกทุกห้อง
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSelectedRooms}
                        className="px-2 py-0.5 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        ล้างที่เลือก
                      </button>
                    </div>
                  </div>

                  {/* Category quick selectors */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-1">เลือกตามกลุ่ม:</span>
                    {ROOM_CATEGORIES.filter((c) => c.id !== 'ALL').map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleSelectRoomsByCategory(category.id)}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        {category.icon} {category.shortLabel}
                      </button>
                    ))}
                  </div>

                  {/* Room checkbox grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white dark:bg-slate-900">
                    {rooms
                      .filter((r) => !isRoomArchived(r))
                      .map((r) => {
                        const isSelected = selectedRoomIds.includes(r.id);
                        const isDisabled = !r.isActive;
                        return (
                          <div
                            key={r.id}
                            onClick={() => !isDisabled && toggleSelectRoom(r.id)}
                            className={`flex items-start gap-2 p-2 rounded-xl border text-xs transition cursor-pointer select-none ${
                              isDisabled
                                ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                                : isSelected
                                ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 font-bold'
                                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-teal-300 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="shrink-0 mt-0.5">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold flex items-center justify-between gap-1">
                                <span className="truncate">{r.code}</span>
                                <span className="text-[10px] text-slate-400 font-normal shrink-0">
                                  {r.capacity} คน
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {r.name}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {selectedRoomIds.length === 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      กรุณาคลิกเลือกห้องปฏิบัติการอย่างน้อย 1 ห้อง
                    </p>
                  )}
                </div>
              )}

              {/* TIMETABLE SCHEDULE CONTROLS */}
              {bookingMode === 'TIMETABLE' && (
                <div className="space-y-3 bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>กำหนดการตารางเรียนประจำภาคการศึกษา</span>
                  </div>

                  {/* Select Term */}
                  {academicTerms.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        เลือกภาคการศึกษา (กำหนดช่วงวันที่อัตโนมัติ)
                      </label>
                      <select
                        value={selectedTermId}
                        onChange={(e) => handleSelectTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100"
                      >
                        <option value="">-- กำหนดช่วงวันที่เอง (Custom Range) --</option>
                        {academicTerms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.name} ({new Date(term.startDate).toLocaleDateString('th-TH')} - {new Date(term.endDate).toLocaleDateString('th-TH')}) {term.isCurrent ? '⭐ (ภาคเรียนปัจจุบัน)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Date Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        วันเริ่มต้นตารางเรียน <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={timetableStartDate}
                        onChange={(e) => setTimetableStartDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        วันสิ้นสุดตารางเรียน <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={timetableEndDate}
                        onChange={(e) => setTimetableEndDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Days of Week Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      วันในสัปดาห์ที่มีการเรียนการสอน <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {DAYS_OF_WEEK.map((d) => {
                        const isSelected = selectedDaysOfWeek.includes(d.day);
                        return (
                          <button
                            key={d.day}
                            type="button"
                            onClick={() => toggleDayOfWeek(d.day)}
                            className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                            }`}
                          >
                            <span>{d.short}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Frequency & Computed Dates summary */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-200/50 dark:border-indigo-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">ความถี่:</span>
                      <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="frequency"
                          value="WEEKLY"
                          checked={timetableFrequency === 'WEEKLY'}
                          onChange={() => setTimetableFrequency('WEEKLY')}
                          className="text-indigo-600"
                        />
                        <span>ทุกสัปดาห์</span>
                      </label>
                      <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-slate-700 dark:text-slate-300 ml-2">
                        <input
                          type="radio"
                          name="frequency"
                          value="BIWEEKLY"
                          checked={timetableFrequency === 'BIWEEKLY'}
                          onChange={() => setTimetableFrequency('BIWEEKLY')}
                          className="text-indigo-600"
                        />
                        <span>สัปดาห์เว้นสัปดาห์</span>
                      </label>
                    </div>

                    <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      📅 รวม {computedTimetableDates.length} วันเรียน ({selectedRoomIds.length} ห้อง × {computedTimetableDates.length} วัน = {selectedRoomIds.length * computedTimetableDates.length} สล็อต)
                    </div>
                  </div>
                </div>
              )}

              {/* DATE & TIME SECTION */}
              {bookingMode === 'SINGLE' || bookingMode === 'MULTI_ROOM' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      วันที่ต้องการใช้งาน <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingForm.bookingDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ช่วงเวลา <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, startTime: '08:30', endTime: '12:00' })}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      >
                        เช้า (08:30-12)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, startTime: '13:00', endTime: '16:30' })}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      >
                        บ่าย (13-16:30)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, startTime: '08:30', endTime: '16:30' })}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      >
                        เต็มวัน
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <input
                        type="time"
                        required
                        value={bookingForm.startTime}
                        onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="time"
                        required
                        value={bookingForm.endTime}
                        onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              ) : bookingMode === 'MULTI_DAY' ? (
                /* MULTI-DAY DATE RANGE & TIME CONTROLS */
                <div className="space-y-3 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>กำหนดช่วงวันที่จัดกิจกรรมต่อเนื่อง (ไม่ใช่ตารางเรียน)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        วันที่เริ่มต้น <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={multiDayStartDate}
                        onChange={(e) => setMultiDayStartDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        วันที่สิ้นสุด <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={multiDayEndDate}
                        onChange={(e) => setMultiDayEndDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {computedMultiDayDates.length > 0 && (
                    <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                      <span>📅 รวม {computedMultiDayDates.length} วันต่อเนื่อง ({selectedRoomIds.length} ห้อง × {computedMultiDayDates.length} วัน = {selectedRoomIds.length * computedMultiDayDates.length} สล็อต)</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-amber-200/50 dark:border-amber-800/50">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        ช่วงเวลาการใช้งานในแต่ละวัน <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-1 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setBookingForm({ ...bookingForm, startTime: '08:30', endTime: '12:00' })}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-amber-100 rounded-lg transition cursor-pointer text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          เช้า (08:30-12)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingForm({ ...bookingForm, startTime: '13:00', endTime: '16:30' })}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-amber-100 rounded-lg transition cursor-pointer text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          บ่าย (13-16:30)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingForm({ ...bookingForm, startTime: '08:30', endTime: '16:30' })}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-amber-100 rounded-lg transition cursor-pointer text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          เต็มวัน
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 mb-1 block">เวลาเริ่มต้น:</span>
                        <input
                          type="time"
                          required
                          value={bookingForm.startTime}
                          onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 mb-1 block">เวลาสิ้นสุด:</span>
                        <input
                          type="time"
                          required
                          value={bookingForm.endTime}
                          onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TIME PICKER FOR TIMETABLE MODE */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      ช่วงเวลาการเรียนการสอนในแต่ละวัน <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, startTime: '08:30', endTime: '12:00' })}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      >
                        เช้า (08:30-12)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, startTime: '13:00', endTime: '16:30' })}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      >
                        บ่าย (13-16:30)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, startTime: '08:30', endTime: '16:30' })}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      >
                        เต็มวัน
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 mb-1 block">เวลาเริ่มต้น:</span>
                      <input
                        type="time"
                        required
                        value={bookingForm.startTime}
                        onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 mb-1 block">เวลาสิ้นสุด:</span>
                      <input
                        type="time"
                        required
                        value={bookingForm.endTime}
                        onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONFLICT STATUS & BATCH CONFLICT PREVIEW */}
              {bookingMode === 'SINGLE' ? (
                /* SINGLE MODE CONFLICT STATUS BANNER */
                bookingForm.roomId && bookingForm.bookingDate && (
                  <div className="space-y-2">
                    {conflictItem ? (
                      <div className="flex items-start gap-2.5 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold">
                            ช่วงเวลาที่เลือกทับซ้อนกับคำขออื่น ({conflictItem.startTime} - {conflictItem.endTime} น.)
                          </p>
                          <p className="text-[11px] text-rose-700 dark:text-rose-400">
                            ชื่องาน: &ldquo;{conflictItem.title}&rdquo; (สถานะ: {conflictItem.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รอพิจารณา'}) — กรุณาเลือกช่วงเวลาอื่น
                          </p>
                        </div>
                      </div>
                    ) : selectedRoomBookings.length > 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
                            <span>ตารางการใช้ห้องในวันที่เลือก:</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">มี {selectedRoomBookings.length} รายการ</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedRoomBookings.map((b) => (
                            <span
                              key={b.id}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                b.status === 'APPROVED'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>
                                {b.startTime} - {b.endTime} น. ({b.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รออนุมัติ'})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>ห้องว่างตลอดทั้งวัน สามารถเลือกช่วงเวลาที่ต้องการได้</span>
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* MULTI-ROOM & TIMETABLE CONFLICT ANALYSIS SECTION */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-teal-600" />
                      <span>ตรวจสอบตารางเวลาและสล็อตห้อง</span>
                    </span>
                    <button
                      type="button"
                      onClick={handlePreviewConflicts}
                      disabled={checkingConflicts || selectedRoomIds.length === 0}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {checkingConflicts ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {checkingConflicts
                          ? 'กำลังตรวจสอบ...'
                          : `ตรวจสอบเวลาทับซ้อน (${
                              selectedRoomIds.length *
                              (bookingMode === 'MULTI_ROOM' ? 1 : bookingMode === 'MULTI_DAY' ? computedMultiDayDates.length : computedTimetableDates.length)
                            } สล็อต)`}
                      </span>
                    </button>
                  </div>

                  {previewAnalysis && (
                    <div className="p-3.5 rounded-2xl border space-y-3 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ผลการวิเคราะห์ {previewAnalysis.totalSlots} สล็อต:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ว่าง {previewAnalysis.availableCount} สล็อต
                          </span>
                          {previewAnalysis.conflictedCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded-md">
                              <AlertCircle className="w-3.5 h-3.5" />
                              ชน {previewAnalysis.conflictedCount} สล็อต
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 px-2 py-0.5 rounded-md">
                              ✨ ไม่พบเวลาทับซ้อน
                            </span>
                          )}
                        </div>
                      </div>

                      {previewAnalysis.conflictedCount > 0 && (
                        <div className="space-y-2">
                          <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-rose-50/60 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-[11px]">
                            <p className="font-bold text-rose-800 dark:text-rose-300">
                              รายการสล็อตที่มีการจองหรือกิจกรรมอื่นอยู่แล้ว:
                            </p>
                            {previewAnalysis.conflictedSlots.map((c: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-start justify-between gap-2 text-rose-700 dark:text-rose-300 border-b border-rose-100 dark:border-rose-900/40 pb-1 last:border-0 last:pb-0"
                              >
                                <div>
                                  <span className="font-bold">[{c.roomCode}]</span> {c.date} ({c.startTime} - {c.endTime} น.)
                                  <div className="text-[10px] text-rose-600 dark:text-rose-400">
                                    ชนกับ: &ldquo;{c.conflictWith}&rdquo; ({c.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รออนุมัติ'})
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={skipConflicts}
                              onChange={(e) => setSkipConflicts(e.target.checked)}
                              className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                            />
                            <span>
                              ข้ามรายการที่ทับซ้อน และดำเนินการจองเฉพาะ {previewAnalysis.availableCount} สล็อตที่ห้องว่าง
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Title & Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้อ / ชื่องานที่ขอใช้งานห้อง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การเรียนการสอนวิชา NUR201, ซ้อม OSCE กลุ่ม 2, ติวทบทวนวิชาพยาบาลเด็ก"
                  value={bookingForm.title}
                  onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วัตถุประสงค์การใช้งาน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={bookingForm.purpose}
                    onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- กรุณาเลือกวัตถุประสงค์การใช้งาน --</option>
                    <option value="การเรียนการสอน">การเรียนการสอนภาคปฏิบัติ</option>
                    <option value="สอบประเมินทักษะ / OSCE">สอบประเมินทักษะ / OSCE</option>
                    <option value="ติว / ทบทวนบทเรียนกลุ่ม">ติว / ทบทวนบทเรียนกลุ่ม</option>
                    <option value="อบรมเชิงปฏิบัติการ / Workshop">อบรมเชิงปฏิบัติการ / Workshop</option>
                    <option value="กิจกรรมชมรม / คณะ">กิจกรรมชมรม / คณะ</option>
                    <option value="ประชุมสัมมนา">ประชุมสัมมนา</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    จำนวนผู้เข้าใช้งาน (คน) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    required
                    placeholder="กรุณากรอกจำนวนผู้เข้าใช้งาน (คน)"
                    value={bookingForm.attendeesCount}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        attendeesCount: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)),
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Course & Advisor with Auto-fill & Edit Dropdown */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {bookingMode === 'TIMETABLE' ? (
                        <span className="text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>รายวิชาที่จัดตารางเรียน <span className="text-rose-500">*</span></span>
                        </span>
                      ) : (
                        <span>รายวิชาที่เกี่ยวข้อง (ถ้ามี)</span>
                      )}
                    </label>
                    <select
                      required={bookingMode === 'TIMETABLE'}
                      value={bookingForm.courseId}
                      onChange={(e) => {
                        const cId = e.target.value;
                        const selectedC = courses.find((c) => c.id === cId);
                        setBookingForm((prev) => ({
                          ...prev,
                          courseId: cId,
                          advisorName: selectedC?.instructorName ? formatTeacherName(selectedC.instructorName) : (cId ? prev.advisorName : ''),
                          title: bookingMode === 'TIMETABLE' && selectedC ? `${selectedC.code} ${selectedC.name} (ชั้นปีที่ ${selectedC.targetYear || 1})` : prev.title,
                          purpose: bookingMode === 'TIMETABLE' ? 'การเรียนการสอน' : prev.purpose,
                        }));
                        if (selectedC?.instructorName) {
                          setIsEditingAdvisor(false);
                        }
                      }}
                      className={`w-full bg-white dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 ${
                        bookingMode === 'TIMETABLE'
                          ? 'border-indigo-300 dark:border-indigo-700 focus:ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-teal-500/20'
                      }`}
                    >
                      <option value="">{bookingMode === 'TIMETABLE' ? '-- กรุณาเลือกรายวิชา --' : '-- ไม่ระบุรายวิชา (ฝึกอิสระ/กิจกรรม) --'}</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.name} {c.targetYear ? `(ชั้นปีที่ ${c.targetYear})` : ''} ({formatTeacherName(c.instructorName || 'อาจารย์ผู้รับผิดชอบ')})
                        </option>
                      ))}
                    </select>

                    {/* Display active course student year and semester badge */}
                    {bookingForm.courseId && (() => {
                      const curC = courses.find((c) => c.id === bookingForm.courseId);
                      if (!curC) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                            <GraduationCap className="w-3 h-3 text-indigo-600" />
                            <span>นิสิตชั้นปีที่ {curC.targetYear || 1}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            ภาคเรียน {curC.semester}/{curC.academicYear}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        อาจารย์ผู้รับผิดชอบ / ที่ปรึกษา
                      </label>
                      {bookingForm.courseId && (
                        <button
                          type="button"
                          onClick={() => setIsEditingAdvisor(!isEditingAdvisor)}
                          className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEditingAdvisor ? 'ซ่อนตัวเลือก' : 'แก้ไขอาจารย์'}</span>
                        </button>
                      )}
                    </div>

                    {bookingForm.courseId && !isEditingAdvisor ? (
                      <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                          <span className="font-bold text-teal-900 dark:text-teal-200">
                            {formatTeacherName(bookingForm.advisorName || 'อาจารย์ประจำรายวิชา')}
                          </span>
                          <span className="text-[10px] bg-teal-200/60 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded-md font-bold">
                            ขึ้นให้อัตโนมัติ
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingAdvisor(true)}
                          className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                        >
                          แก้ไขอาจารย์
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <select
                          value={bookingForm.advisorName}
                          onChange={(e) => setBookingForm((prev) => ({ ...prev, advisorName: e.target.value }))}
                          className="w-full bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20"
                        >
                          <option value="">-- กรุณาเลือกอาจารย์ผู้รับผิดชอบจากรายชื่อ --</option>
                          {bookingForm.advisorName && !teachers.some((t) => formatTeacherName(t) === bookingForm.advisorName || t.name === bookingForm.advisorName) && (
                            <option value={bookingForm.advisorName}>
                              {formatTeacherName(bookingForm.advisorName)} (อาจารย์ประจำวิชา)
                            </option>
                          )}
                          {teachers.map((t) => {
                            const formatted = formatTeacherName(t);
                            return (
                              <option key={t.id} value={formatted}>
                                {formatted} ({t.department || 'คณะพยาบาลศาสตร์'})
                              </option>
                            );
                          })}
                        </select>
                        {bookingForm.courseId && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const c = courses.find((x) => x.id === bookingForm.courseId);
                                setBookingForm((prev) => ({ ...prev, advisorName: formatTeacherName(c?.instructorName || '') }));
                                setIsEditingAdvisor(false);
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                            >
                              ↺ กลับไปใช้อาจารย์ประจำวิชา ({formatTeacherName(courses.find((x) => x.id === bookingForm.courseId)?.instructorName)})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Phone & Equipment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="tel"
                    placeholder="08x-xxx-xxxx"
                    value={bookingForm.contactPhone}
                    onChange={(e) => setBookingForm({ ...bookingForm, contactPhone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    อุปกรณ์ที่ต้องการให้จัดเตรียม
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น โปรเจกเตอร์, หุ่น CPR, แขนเจาะเลือด"
                    value={bookingForm.equipmentNeeded}
                    onChange={(e) => setBookingForm({ ...bookingForm, equipmentNeeded: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Admin Auto-Approve Checkbox (for Batch & Timetable) */}
              {canManageRooms && bookingMode !== 'SINGLE' && (
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        อนุมัติรายการทันที (Auto-Approve สำหรับแอดมิน/เจ้าหน้าที่)
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        คำขอที่สร้างจะเปลี่ยนสถานะเป็น &ldquo;อนุมัติแล้ว&rdquo; และล็อกตารางห้องเรียนทันที
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoApproveBatch}
                    onChange={(e) => setAutoApproveBatch(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={
                    Boolean(
                      submitting ||
                      (bookingMode === 'SINGLE' ? !!conflictItem : (
                        selectedRoomIds.length === 0 ||
                        (bookingMode === 'TIMETABLE' && computedTimetableDates.length === 0) ||
                        (bookingMode === 'MULTI_ROOM' && !bookingForm.bookingDate) ||
                        (bookingMode === 'MULTI_DAY' && computedMultiDayDates.length === 0) ||
                        (previewAnalysis && previewAnalysis.conflictedCount > 0 && !skipConflicts) ||
                        (previewAnalysis && previewAnalysis.availableCount === 0)
                      ))
                    )
                  }
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : bookingMode === 'SINGLE' ? (
                    conflictItem ? (
                      '⚠️ เวลาซ้ำซ้อน ไม่สามารถจองได้'
                    ) : (
                      'ยื่นคำขอจองห้อง'
                    )
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        ยืนยันการจอง{' '}
                        {previewAnalysis
                          ? skipConflicts
                            ? `${previewAnalysis.availableCount} สล็อต (ที่ว่าง)`
                            : `${previewAnalysis.totalSlots} สล็อต`
                          : `${
                              selectedRoomIds.length *
                              (bookingMode === 'MULTI_ROOM' ? 1 : bookingMode === 'MULTI_DAY' ? computedMultiDayDates.length : computedTimetableDates.length)
                            } สล็อต`}
                        {canManageRooms && autoApproveBatch ? ' (อนุมัติทันที)' : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ROOM */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-teal-600" />
                {roomToEdit ? 'แก้ไขข้อมูลห้องปฏิบัติการ' : 'เพิ่มห้องปฏิบัติการใหม่'}
              </h3>
              <button
                onClick={() => setShowRoomModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รหัสห้อง (Code) *
                </label>
                <input
                  type="text"
                  required
                  value={roomForm.code}
                  onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อห้องปฏิบัติการ *
                </label>
                <input
                  type="text"
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สถานที่ตั้ง
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น อาคาร 3 ชั้น 2"
                    value={roomForm.location}
                    onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ความจุ (คน) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  คำอธิบาย / อุปกรณ์ประจำห้อง
                </label>
                <textarea
                  rows={2}
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition flex items-center gap-1"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลห้อง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOGGLE ROOM STATUS WITH REASON */}
      {roomToToggle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {roomToToggle.isActive ? <Lock className="w-5 h-5 text-rose-600" /> : <Unlock className="w-5 h-5 text-emerald-600" />}
                <span>{roomToToggle.isActive ? 'ปิดรับการจองห้องชั่วคราว' : 'เปิดรับการจองห้อง'}</span>
              </h3>
              <button
                onClick={() => setRoomToToggle(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              ห้อง: <strong className="text-slate-900 dark:text-slate-100">{roomToToggle.name} ({roomToToggle.code})</strong>
            </p>

            {roomToToggle.isActive ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ระบุเหตุผลที่ปิดห้อง (จะแสดงให้ผู้ใช้งานรับทราบ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ปิดปรับปรุงระบบปรับอากาศ, ปิดซ่อมบำรุงประจำเดือน"
                  value={roomToggleReason}
                  onChange={(e) => setRoomToggleReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            ) : (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                เมื่อเปิดใช้งาน ห้องนี้จะกลับมาเปิดรับการจองใช้งานในระบบทันที
              </p>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRoomToToggle(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmToggleRoom}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow transition flex items-center gap-1 ${
                  roomToToggle.isActive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {submitting ? 'กำลังบันทึก...' : (roomToToggle.isActive ? 'ยืนยันปิดห้อง' : 'ยืนยันเปิดห้อง')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL APPROVED ROOM BOOKING */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    ยกเลิกการจองห้องปฏิบัติการ (คืนห้อง)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เฉพาะผู้ดูแลระบบและเจ้าหน้าที่ห้องแล็บ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                เมื่อยืนยันยกเลิก ห้องปฏิบัติการนี้จะถูกปลดล็อกให้ว่างบนตารางปฏิทินทันที และระบบจะส่งการแจ้งเตือนไปยังผู้ขอใช้ห้อง
              </span>
            </div>

            {/* Booking Details Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-500">{cancelModalBooking.bookingNumber}</span>
                <span className="font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                  {cancelModalBooking.room?.name} ({cancelModalBooking.room?.code})
                </span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {cancelModalBooking.title}
              </div>
              <div className="text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1 pt-1">
                <span>วันที่: <strong>{formatDate(cancelModalBooking.bookingDate)}</strong></span>
                <span>เวลา: <strong>{cancelModalBooking.startTime} - {cancelModalBooking.endTime} น.</strong></span>
                <span>ผู้ขอ: <strong>{formatUserName(cancelModalBooking.user)}</strong></span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ระบุเหตุผลในการยกเลิก <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="เช่น ผู้ขอแจ้งยกเลิกผ่านเจ้าหน้าที่, มีการย้ายสถานที่สอน, ห้องปิดปรับปรุงเร่งด่วน"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                disabled={submitting || !cancelReason.trim()}
                onClick={handleConfirmCancelApproved}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{submitting ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกและคืนห้อง'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REASSIGN ROOM */}
      {reassignModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    ย้ายห้องปฏิบัติการ (เปลี่ยนห้อง)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เปลี่ยนห้องโดยยังคงวัน เวลา และสถานะอนุมัติเดิม
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReassignModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Info */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-500">{reassignModalBooking.bookingNumber}</span>
                <span className="font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  ห้องปัจจุบัน: {reassignModalBooking.room?.name} ({reassignModalBooking.room?.code})
                </span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {reassignModalBooking.title}
              </div>
              <div className="text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1 pt-1">
                <span>วันที่: <strong>{formatDate(reassignModalBooking.bookingDate)}</strong></span>
                <span>เวลา: <strong>{reassignModalBooking.startTime} - {reassignModalBooking.endTime} น.</strong></span>
                <span>จำนวน: <strong>{reassignModalBooking.attendeesCount} คน</strong></span>
              </div>
            </div>

            {/* Select Target Room */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                เลือกห้องปฏิบัติการใหม่ที่ต้องการย้ายไป <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetRoomIdForReassign}
                onChange={(e) => setTargetRoomIdForReassign(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">-- กรุณาเลือกห้องปฏิบัติการ --</option>
                {visibleRooms
                  .filter((r) => r.id !== reassignModalBooking.roomId && r.isActive)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}) {r.capacity ? `- ความจุ ${r.capacity} คน` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                เหตุผลในการย้ายห้อง (จะบันทึกในหมายเหตุและแจ้งเตือนผู้ขอ)
              </label>
              <input
                type="text"
                placeholder="เช่น ห้องเดิมเครื่องปรับอากาศขัดข้อง, จัดสรรห้องใหม่ให้เหมาะสมกับจำนวนนิสิต"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReassignModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting || !targetRoomIdForReassign}
                onClick={handleConfirmReassign}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{submitting ? 'กำลังย้ายห้อง...' : 'ยืนยันย้ายห้อง'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
