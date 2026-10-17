'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Package,
  ArrowRight,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  Phone,
  BookOpen,
  Boxes,
  ShieldCheck,
  Check,
  GraduationCap,
  Sparkles,
  MapPin,
  QrCode,
  Users,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Building2,
  Wrench,
  ClipboardCheck,
  CheckSquare,
  Layers,
  CalendarCheck,
  FileText,
  Table,
  ListFilter
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatUserName, formatTeacherName } from '@/lib/user-utils';
import CalendarHoverCard, { CalendarHoverItem } from '@/components/calendar/CalendarHoverCard';

export default function SchedulePage() {
  const { currentUser, isOfficer, isAdmin, isApprover } = useAuth();
  const [borrowList, setBorrowList] = useState<any[]>([]);
  const [requisitionList, setRequisitionList] = useState<any[]>([]);
  const [practiceList, setPracticeList] = useState<any[]>([]);
  const [roomBookingList, setRoomBookingList] = useState<any[]>([]);
  const [inspectionPlansList, setInspectionPlansList] = useState<any[]>([]);
  const [pmAssetsList, setPmAssetsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'PENDING' | 'BORROWED' | 'UPCOMING' | 'OVERDUE' | 'AUDIT' | 'PM'>('ALL');
  const [listLayout, setListLayout] = useState<'COMPACT' | 'CARDS'>('COMPACT');
  const [futureCollapsed, setFutureCollapsed] = useState(false);
  const [expandedSlotIds, setExpandedSlotIds] = useState<Record<string, boolean>>({});

  const toLocalDateKey = (dateInput?: string | Date): string => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      return dateInput.trim();
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calendar View States
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return toLocalDateKey(new Date());
  });
  const [dayTypeFilter, setDayTypeFilter] = useState<'ALL' | 'PICKUP' | 'RETURN' | 'ROOM' | 'PRACTICE' | 'AUDIT' | 'PM'>('ALL');

  // Calendar Hover Tooltip State
  const [hoverPopover, setHoverPopover] = useState<{
    isOpen: boolean;
    anchorRect: DOMRect | null;
    dateStr: string;
    items: CalendarHoverItem[];
  } | null>(null);

  useEffect(() => {
    const handleScroll = () => setHoverPopover(null);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCellMouseEnter = (e: React.MouseEvent<HTMLElement>, dateStr: string, dayTasks: any[]) => {
    if (dayTasks.length === 0) {
      setHoverPopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const items: CalendarHoverItem[] = dayTasks.map((t: any) => {
      let title = t.purpose || 'งานนัดหมาย';
      if (t.type === 'BORROW') {
        const itemCount = t.items?.length || 0;
        const firstItem = t.items?.[0]?.item?.name || '';
        const actionPrefix = t.status === 'BORROWED' ? 'กำหนดคืน' : 'นัดรับยืม';
        title = `${actionPrefix}: ${firstItem ? firstItem + (itemCount > 1 ? ` (+${itemCount - 1})` : '') : 'อุปกรณ์การพยาบาล'}`;
      } else if (t.type === 'REQUISITION') {
        const itemCount = t.items?.length || 0;
        const firstItem = t.items?.[0]?.item?.name || '';
        title = `เบิก: ${firstItem ? firstItem + (itemCount > 1 ? ` (+${itemCount - 1})` : '') : 'เวชภัณฑ์การแพทย์'}`;
      } else if (t.type === 'ROOM_BOOKING') {
        title = `จองห้อง: ${t.purpose || t.roomName || 'ห้องปฏิบัติการ'}`;
      } else if (t.type === 'PRACTICE_EVENT') {
        title = `ฝึกปฏิบัติ: ${t.roomName || 'ห้องปฏิบัติการพยาบาล'}`;
      } else if (t.type === 'INSPECTION_PLAN') {
        title = `ตรวจสภาพ: ${t.title || t.purpose || 'แผนตรวจสภาพครุภัณฑ์'}`;
      } else if (t.type === 'MAINTENANCE_PM') {
        title = `ตรวจ PM: ครุภัณฑ์ ${t.assets?.length || 0} รายการ`;
      }

      let startTime: string | undefined = undefined;
      let endTime: string | undefined = undefined;
      if (t.timeSlot) {
        const parts = t.timeSlot.replace(' น.', '').split('-');
        if (parts.length === 2) {
          startTime = parts[0].trim();
          endTime = parts[1].trim();
        }
      }

      return {
        id: t.id,
        code: t.requestNumber,
        roomCode: t.roomCode,
        roomName: t.roomName,
        title,
        startTime,
        endTime,
        status: t.status,
        userName: t.user ? formatUserName(t.user) : t.createdBy?.name,
        courseCode: t.course?.code,
        courseName: t.course?.name,
        participants: t.attendeesCount || t.maxCapacity,
        equipmentNeeded: t.equipmentNeeded,
        type: t.type === 'PRACTICE_EVENT' ? 'PRACTICE_SLOT' : t.type,
      };
    });

    setHoverPopover({
      isOpen: true,
      anchorRect: rect,
      dateStr,
      items,
    });
  };

  const handleCellMouseLeave = () => {
    setHoverPopover(null);
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayMonth = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toLocalDateKey(today));
  };

  const toggleSlotExpand = (slotKey: string) => {
    setExpandedSlotIds((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  // Edit Dates Modal State (For Admin & Officer)
  const [editingItem, setEditingItem] = useState<{
    id: string;
    type: 'BORROW' | 'REQUISITION';
    title: string;
    borrowDate: string;
    expectedReturnDate?: string;
  } | null>(null);
  const [newBorrowDate, setNewBorrowDate] = useState('');
  const [newReturnDate, setNewReturnDate] = useState('');
  const [savingDates, setSavingDates] = useState(false);

  const fetchScheduleData = async () => {
    try {
      const [bRes, rRes, pRes, rmRes, ipRes, pmRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/requisitions'),
        fetch('/api/practice/bookings'),
        fetch('/api/room-bookings?status=APPROVED'),
        fetch('/api/maintenance/plans'),
        fetch('/api/maintenance/assets'),
      ]);

      if (bRes.ok) {
        const bData = await bRes.json();
        const relevantBorrows = bData.filter((b: any) =>
          ['APPROVED', 'BORROWED'].includes(b.status)
        );
        setBorrowList(relevantBorrows);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        const relevantReqs = rData.filter((r: any) => r.status === 'APPROVED');
        setRequisitionList(relevantReqs);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        const relevantPractices = Array.isArray(pData)
          ? pData.filter((p: any) => ['APPROVED', 'CHECKED_IN'].includes(p.status))
          : [];
        setPracticeList(relevantPractices);
      }
      if (rmRes.ok) {
        const rmData = await rmRes.json();
        setRoomBookingList(Array.isArray(rmData) ? rmData : []);
      }
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        const validPlans = Array.isArray(ipData)
          ? ipData.filter((p: any) => p.status !== 'CANCELLED')
          : [];
        setInspectionPlansList(validPlans);
      }
      if (pmRes.ok) {
        const pmData = await pmRes.json();
        const validPm = Array.isArray(pmData)
          ? pmData.filter((a: any) => Boolean(a.nextInspectionDue))
          : [];
        setPmAssetsList(validPm);
      }
    } catch (err) {
      console.error('Failed to load schedule data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const formatDate = (dateStr?: string) => {
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

  const formatThaiFullDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const toInputDateFormat = (dateStr?: string) => {
    return toLocalDateKey(dateStr);
  };

  const todayDateStr = toLocalDateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowDateStr = toLocalDateKey(tomorrowDate);

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    return toLocalDateKey(dateStr) === todayDateStr;
  };

  const isPast = (dateStr?: string) => {
    if (!dateStr) return false;
    const key = toLocalDateKey(dateStr);
    return Boolean(key && key < todayDateStr);
  };

  // Combine borrow and requisition items into unified schedule tasks
  const combinedTasks = [
    ...borrowList.map((b) => {
      const isApprovedWaitingPickup = b.status === 'APPROVED';
      const isBorrowedWaitingReturn = b.status === 'BORROWED';
      const returnOverdue = isBorrowedWaitingReturn && isPast(b.expectedReturnDate);
      const pickupToday = isApprovedWaitingPickup && isToday(b.borrowDate);
      const returnToday = isBorrowedWaitingReturn && isToday(b.expectedReturnDate);

      return {
        id: b.id,
        type: 'BORROW' as const,
        requestNumber: b.requestNumber,
        status: b.status,
        user: b.user,
        course: b.course,
        advisorName: b.advisorName || b.course?.instructorName,
        purpose: b.purpose,
        pickupDate: b.borrowDate,
        returnDate: b.expectedReturnDate,
        activeDate: isBorrowedWaitingReturn ? b.expectedReturnDate : b.borrowDate,
        items: b.items || [],
        isOverdue: returnOverdue,
        isPickupToday: pickupToday,
        isReturnToday: returnToday,
      };
    }),
    ...requisitionList.map((r) => {
      const pickupToday = r.status === 'APPROVED' && isToday(r.dateNeeded);
      return {
        id: r.id,
        type: 'REQUISITION' as const,
        requestNumber: r.requestNumber,
        status: r.status,
        user: r.user,
        course: r.course,
        advisorName: r.advisorName || r.course?.instructorName,
        purpose: r.purpose,
        pickupDate: r.dateNeeded,
        returnDate: undefined,
        activeDate: r.dateNeeded,
        items: r.items || [],
        isOverdue: false,
        isPickupToday: pickupToday,
        isReturnToday: false,
      };
    }),
  ];

  // Group practiceList by Slot (Event)
  const practiceSlotGroups: Record<string, any> = {};
  practiceList.forEach((p) => {
    const sId = p.slotId || (p.slot ? p.slot.id : `unknown-${p.id}`);
    if (!practiceSlotGroups[sId]) {
      practiceSlotGroups[sId] = {
        id: sId,
        type: 'PRACTICE_EVENT' as const,
        slot: p.slot,
        roomName: p.slot?.room?.name || 'ห้องปฏิบัติการพยาบาล',
        roomCode: p.slot?.room?.code,
        pickupDate: p.slot?.date,
        activeDate: p.slot?.date,
        timeSlot: p.slot ? `${p.slot.startTime} - ${p.slot.endTime} น.` : '-',
        maxCapacity: p.slot?.maxCapacity || 6,
        isPickupToday: isToday(p.slot?.date),
        isReturnToday: false,
        isOverdue: false,
        students: [],
        kitsSummary: {} as Record<string, { name: string; count: number }>,
        additionalItems: [] as string[],
      };
    }
    practiceSlotGroups[sId].students.push(p);

    // Aggregate Kits
    if (p.practiceKit) {
      const kId = p.practiceKit.id;
      if (!practiceSlotGroups[sId].kitsSummary[kId]) {
        practiceSlotGroups[sId].kitsSummary[kId] = {
          name: p.practiceKit.name,
          count: 0,
        };
      }
      practiceSlotGroups[sId].kitsSummary[kId].count += 1;
    }

    // Aggregate Additional equipment
    if (p.additionalEquipment) {
      practiceSlotGroups[sId].additionalItems.push(
        `${formatUserName(p.user) || 'นิสิต'}: ${p.additionalEquipment}`
      );
    }
  });

  const practiceEventTasks = Object.values(practiceSlotGroups);

  // 1. Transform inspection campaigns/audits
  const inspectionPlanTasks = inspectionPlansList.map((plan) => {
    const planDate = plan.targetDate || plan.startDate || plan.createdAt;
    const isCompleted = (plan.status || '').toUpperCase() === 'COMPLETED';
    const isTodayPlan = !isCompleted && isToday(planDate);
    const isOverdue = !isCompleted && isPast(planDate);
    return {
      id: plan.id,
      type: 'INSPECTION_PLAN' as const,
      requestNumber: `INSP-${plan.id.slice(0, 8)}`,
      title: plan.title,
      status: plan.status,
      planType: plan.planType,
      scopeType: plan.scopeType,
      purpose: plan.title,
      description: plan.description,
      pickupDate: planDate,
      activeDate: planDate,
      returnDate: undefined,
      targetDate: plan.targetDate,
      startDate: plan.startDate,
      targetLocation: plan.targetLocation,
      targetCategory: plan.targetCategory,
      targetCourse: plan.targetCourse,
      metrics: plan.metrics,
      createdBy: plan.createdBy,
      isOverdue,
      isPickupToday: isTodayPlan,
      isReturnToday: false,
    };
  });

  // 2. Group routine PM assets by nextInspectionDue date
  const pmDateGroups: Record<string, any[]> = {};
  pmAssetsList.forEach((asset) => {
    if (!asset.nextInspectionDue) return;
    const dateKey = toLocalDateKey(asset.nextInspectionDue);
    if (!dateKey) return;
    if (!pmDateGroups[dateKey]) {
      pmDateGroups[dateKey] = [];
    }
    pmDateGroups[dateKey].push(asset);
  });

  const pmDueGroupTasks = Object.entries(pmDateGroups).map(([dateKey, assets]) => {
    const hasOverdue = isPast(dateKey);
    const isDueToday = isToday(dateKey);
    return {
      id: `pm-group-${dateKey}`,
      type: 'MAINTENANCE_PM' as const,
      requestNumber: `PM-${dateKey.replace(/-/g, '')}`,
      title: `ตรวจ PM ครุภัณฑ์ (${assets.length} รายการ)`,
      purpose: `กำหนดตรวจบำรุงรักษาเชิงป้องกัน (PM) (${assets.length} เครื่อง/ชิ้น)`,
      pickupDate: dateKey,
      activeDate: dateKey,
      returnDate: undefined,
      assets,
      status: hasOverdue ? 'OVERDUE' : isDueToday ? 'DUE_SOON' : 'SCHEDULED',
      isOverdue: hasOverdue,
      isPickupToday: isDueToday,
      isReturnToday: false,
    };
  });

  const allDisplayTasks = [
    ...roomBookingList.map((rb) => {
      const isUsageToday = isToday(rb.bookingDate);
      return {
        id: rb.id,
        type: 'ROOM_BOOKING' as const,
        requestNumber: rb.bookingNumber,
        status: rb.status,
        user: rb.user,
        course: rb.course,
        advisorName: rb.advisorName,
        purpose: rb.title,
        usagePurpose: rb.purpose,
        pickupDate: rb.bookingDate,
        activeDate: rb.bookingDate,
        returnDate: undefined,
        timeSlot: `${rb.startTime} - ${rb.endTime} น.`,
        roomName: rb.room?.name || 'ห้องปฏิบัติการ',
        roomCode: rb.room?.code,
        attendeesCount: rb.attendeesCount,
        equipmentNeeded: rb.equipmentNeeded,
        contactPhone: rb.contactPhone || rb.user?.phone,
        items: [],
        isOverdue: false,
        isPickupToday: isUsageToday,
        isReturnToday: false,
      };
    }),

    ...combinedTasks,
    ...practiceEventTasks,
    ...inspectionPlanTasks,
    ...pmDueGroupTasks,
  ];

  // Active duty queue for List View & KPI Summary Cards:
  // Exclude past room bookings, past practice sessions, and already-completed inspection plans
  const activeQueueTasks = allDisplayTasks.filter((t: any) => {
    if (t.type === 'ROOM_BOOKING' || t.type === 'PRACTICE_EVENT') {
      const dKey = toLocalDateKey(t.pickupDate);
      return Boolean(dKey && dKey >= todayDateStr);
    }
    if (t.type === 'INSPECTION_PLAN') {
      return (t.status || '').toUpperCase() !== 'COMPLETED';
    }
    return true;
  });

  const getTaskActiveDateKey = (t: any): string => {
    if (t.type === 'BORROW' && t.status === 'BORROWED') {
      return toLocalDateKey(t.returnDate);
    }
    return toLocalDateKey(t.activeDate || t.pickupDate || t.returnDate);
  };

  // True "Past Pending Pickup": Only APPROVED Borrow or Requisition whose scheduled pickup date has already passed
  const isTaskPastPending = (t: any) => {
    if (t.type !== 'BORROW' && t.type !== 'REQUISITION') return false;
    if (t.status !== 'APPROVED') return false;
    const pDate = toLocalDateKey(t.pickupDate);
    return Boolean(pDate && pDate < todayDateStr);
  };

  // All requests awaiting item dispense (for KPI Card #2 & PENDING filter tab)
  const isTaskAwaitingDispense = (t: any) => {
    return (t.type === 'BORROW' || t.type === 'REQUISITION') && t.status === 'APPROVED';
  };

  const isTaskUpcoming = (t: any) => {
    if (t.isOverdue || t.isPickupToday || t.isReturnToday || isTaskPastPending(t)) return false;
    const activeKey = getTaskActiveDateKey(t);
    return Boolean(activeKey && activeKey > todayDateStr);
  };

  // Apply filters for List View
  const filteredTasks = activeQueueTasks.filter((task: any) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (task.type === 'PRACTICE_EVENT') {
        const matchRoom = task.roomName?.toLowerCase().includes(q);
        const matchStudent = task.students?.some(
          (s: any) =>
            s.user?.name?.toLowerCase().includes(q) ||
            s.user?.studentId?.toLowerCase().includes(q) ||
            s.skillTopic?.toLowerCase().includes(q) ||
            s.advisorName?.toLowerCase().includes(q) ||
            s.bookingNumber?.toLowerCase().includes(q)
        );
        if (!matchRoom && !matchStudent) return false;
      } else if (task.type === 'INSPECTION_PLAN') {
        const matchTitle = task.title?.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        const matchLoc = task.targetLocation?.name?.toLowerCase().includes(q) || task.targetLocation?.roomName?.toLowerCase().includes(q);
        const matchCat = task.targetCategory?.name?.toLowerCase().includes(q);
        const matchCreator = task.createdBy?.name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc && !matchCat && !matchCreator) return false;
      } else if (task.type === 'MAINTENANCE_PM') {
        const matchCode = task.requestNumber?.toLowerCase().includes(q);
        const matchAssets = task.assets?.some(
          (a: any) =>
            a.assetCode?.toLowerCase().includes(q) ||
            a.govAssetCode?.toLowerCase().includes(q) ||
            a.item?.name?.toLowerCase().includes(q) ||
            a.location?.toLowerCase().includes(q)
        );
        if (!matchCode && !matchAssets) return false;
      } else {
        const matchNumber = task.requestNumber?.toLowerCase().includes(q);
        const matchUser = task.user?.name?.toLowerCase().includes(q);
        const matchStudentId = task.user?.studentId?.toLowerCase().includes(q);
        const matchCourse = task.course?.name?.toLowerCase().includes(q) || task.course?.code?.toLowerCase().includes(q);
        const matchPurpose = task.purpose?.toLowerCase().includes(q);
        if (!matchNumber && !matchUser && !matchStudentId && !matchCourse && !matchPurpose) {
          return false;
        }
      }
    }

    if (timeFilter === 'TODAY') {
      return task.isPickupToday || task.isReturnToday;
    }
    if (timeFilter === 'PENDING') {
      return isTaskAwaitingDispense(task);
    }
    if (timeFilter === 'BORROWED') {
      return task.type === 'BORROW' && task.status === 'BORROWED';
    }
    if (timeFilter === 'OVERDUE') {
      return task.isOverdue;
    }
    if (timeFilter === 'AUDIT') {
      return task.type === 'INSPECTION_PLAN';
    }
    if (timeFilter === 'PM') {
      return task.type === 'MAINTENANCE_PM';
    }
    if (timeFilter === 'UPCOMING') {
      return isTaskUpcoming(task);
    }
    return true;
  });

  const getTaskTriageScore = (t: any) => {
    // 0: Overdue (Highest urgency)
    if (t.isOverdue) return 0;
    // 1: Today shift
    if (t.isPickupToday || t.isReturnToday) return 1;
    // 2: Past pending pickup (approved Borrow/Requisition whose pickup date has passed)
    if (isTaskPastPending(t)) return 2;
    // 3: Tomorrow schedule
    const activeKey = getTaskActiveDateKey(t);
    if (activeKey === tomorrowDateStr) return 3;
    // 4: Future upcoming
    return 4;
  };

  const getTaskTimeMinutes = (t: any) => {
    if (t.timeSlot) {
      const match = t.timeSlot.match(/(\d{1,2}):(\d{2})/);
      if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    if (t.isReturnToday) return 16 * 60 + 30; // 16:30 standard return
    if (t.isPickupToday) return 9 * 60; // 09:00 standard pickup
    return 12 * 60;
  };

  const sortedTasks = [...filteredTasks].sort((a: any, b: any) => {
    const scoreA = getTaskTriageScore(a);
    const scoreB = getTaskTriageScore(b);
    if (scoreA !== scoreB) return scoreA - scoreB;

    const dateA = getTaskActiveDateKey(a);
    const dateB = getTaskActiveDateKey(b);

    // Today: chronological order by time of day
    if (scoreA === 1) {
      const timeA = getTaskTimeMinutes(a);
      const timeB = getTaskTimeMinutes(b);
      if (timeA !== timeB) return timeA - timeB;
    }

    return dateA.localeCompare(dateB);
  });

  // Timeline Sections for High-Volume Segmentation
  const overdueSectionTasks = sortedTasks.filter((t: any) => Boolean(t.isOverdue));
  const todaySectionTasks = sortedTasks.filter((t: any) => (t.isPickupToday || t.isReturnToday) && !t.isOverdue);
  const pastPendingSectionTasks = sortedTasks.filter((t: any) => !t.isOverdue && !t.isPickupToday && !t.isReturnToday && isTaskPastPending(t));
  const tomorrowSectionTasks = sortedTasks.filter((t: any) => {
    if (t.isOverdue || t.isPickupToday || t.isReturnToday || isTaskPastPending(t)) return false;
    return getTaskActiveDateKey(t) === tomorrowDateStr;
  });
  const futureSectionTasks = sortedTasks.filter((t: any) => {
    if (t.isOverdue || t.isPickupToday || t.isReturnToday || isTaskPastPending(t)) return false;
    const activeKey = getTaskActiveDateKey(t);
    return Boolean(activeKey && activeKey > tomorrowDateStr);
  });

  // Calendar calculations
  const thaiMonthDisplay = currentMonth.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

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

  // 1. Prev month padding
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const d = new Date(currentYear, currentMonthIdx - 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayDateStr,
    });
  }

  // 2. Current month days
  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === todayDateStr,
    });
  }

  // 3. Next month padding
  const remainingCells = 42 - calendarCells.length;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const d = new Date(currentYear, currentMonthIdx + 1, dayNum);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Helper: check if a task is an item pickup (APPROVED Borrow or Requisition) on dateStr
  const isPickupOnDate = (t: any, dateStr: string) => {
    if (t.type !== 'BORROW' && t.type !== 'REQUISITION') return false;
    if (t.status !== 'APPROVED') return false;
    return toLocalDateKey(t.pickupDate) === dateStr;
  };

  // Helper: check if a task is an item return (BORROW) on dateStr
  const isReturnOnDate = (t: any, dateStr: string) => {
    if (t.type !== 'BORROW') return false;
    return toLocalDateKey(t.returnDate) === dateStr;
  };

  // Helper: tasks for any given date on the Calendar
  const getTasksForDate = (dateStr: string) => {
    return allDisplayTasks.filter((t: any) => {
      if (t.type === 'BORROW') {
        if (t.status === 'BORROWED') {
          // Already picked up; only show on expectedReturnDate
          return toLocalDateKey(t.returnDate) === dateStr;
        }
        // Still APPROVED (waiting for pickup): show on pickupDate and planned returnDate
        return toLocalDateKey(t.pickupDate) === dateStr || toLocalDateKey(t.returnDate) === dateStr;
      }
      return toLocalDateKey(t.pickupDate) === dateStr;
    });
  };

  // Selected date tasks with sub-filter
  const selectedDateAllTasks = getTasksForDate(selectedDate);
  const selectedDateTasks = selectedDateAllTasks.filter((t: any) => {
    const pDate = toLocalDateKey(t.pickupDate);

    if (dayTypeFilter === 'PICKUP') return isPickupOnDate(t, selectedDate);
    if (dayTypeFilter === 'RETURN') return isReturnOnDate(t, selectedDate);
    if (dayTypeFilter === 'ROOM') return pDate === selectedDate && t.type === 'ROOM_BOOKING';
    if (dayTypeFilter === 'PRACTICE') return pDate === selectedDate && t.type === 'PRACTICE_EVENT';
    if (dayTypeFilter === 'AUDIT') return pDate === selectedDate && t.type === 'INSPECTION_PLAN';
    if (dayTypeFilter === 'PM') return pDate === selectedDate && t.type === 'MAINTENANCE_PM';
    return true;
  });

  // Open Edit Dates modal
  const handleOpenEditDates = (task: typeof combinedTasks[0]) => {
    setEditingItem({
      id: task.id,
      type: task.type,
      title: `${task.requestNumber} - ${formatUserName(task.user)}`,
      borrowDate: task.pickupDate,
      expectedReturnDate: task.returnDate,
    });
    setNewBorrowDate(toInputDateFormat(task.pickupDate));
    setNewReturnDate(toInputDateFormat(task.returnDate));
  };

  // Submit Edit Dates
  const handleSaveDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingDates(true);

    try {
      const endpoint =
        editingItem.type === 'BORROW'
          ? `/api/borrow/${editingItem.id}`
          : `/api/requisitions/${editingItem.id}`;

      const payload: any = {
        action: 'UPDATE_DATES',
      };

      if (editingItem.type === 'BORROW') {
        payload.borrowDate = newBorrowDate;
        payload.expectedReturnDate = newReturnDate;
      } else {
        payload.dateNeeded = newBorrowDate;
      }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingItem(null);
        fetchScheduleData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการแก้ไขวันที่');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSavingDates(false);
    }
  };

  const canEdit = isAdmin || isOfficer;

  // Render individual task card
  const renderTaskCard = (task: any) => {
    if (task.type === 'INSPECTION_PLAN') {
      const planTypeLabels: Record<string, string> = {
        ROUTINE_PM: 'ตรวจบำรุงรักษาตามรอบ (PM)',
        ANNUAL_INVENTORY: 'ตรวจนับครุภัณฑ์ประจำปี',
        SEMESTER_AUDIT: 'ตรวจเช็กความพร้อมประจำภาคการศึกษา',
        COURSE_PREPARATION: 'เตรียมความพร้อมก่อนเปิดรายวิชา',
        POST_ACTIVITY_CHECK: 'ตรวจเช็กหลังเสร็จสิ้นกิจกรรม',
        CUSTOM: 'ตรวจสภาพเฉพาะกิจ',
      };
      const scopeText =
        task.scopeType === 'ALL'
          ? 'ทุกรายการในระบบ'
          : task.scopeType === 'LOCATION'
          ? `พื้นที่: ${task.targetLocation?.name || task.targetLocation?.roomName || 'ระบุห้อง'}`
          : task.scopeType === 'CATEGORY'
          ? `หมวดหมู่: ${task.targetCategory?.name || 'ระบุหมวด'}`
          : task.scopeType === 'COURSE'
          ? `รายวิชา: [${task.targetCourse?.code}] ${task.targetCourse?.name}`
          : 'กำหนดรายการเอง';

      const metrics = task.metrics || { total: 0, checked: 0, progressPercent: 0, pass: 0, passWithNote: 0, fail: 0 };
      const statusUpper = (task.status || '').toUpperCase();
      const isCompleted = statusUpper === 'COMPLETED';
      const isInProgress = statusUpper === 'IN_PROGRESS';

      return (
        <div
          key={`insp-${task.id}`}
          className={`bg-white dark:bg-slate-900 rounded-3xl border-2 p-5 shadow-sm space-y-3 transition hover:shadow-md ${
            task.isOverdue
              ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
              : isInProgress
              ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/10'
              : 'border-teal-200 dark:border-teal-900/60'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                <ClipboardCheck className="w-3 h-3 text-teal-600" />
                <span>🔍 แผนตรวจสภาพครุภัณฑ์ (Inspection Campaign)</span>
              </span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {planTypeLabels[task.planType] || task.planType}
              </span>
              {task.isPickupToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                  ⚡ ถึงกำหนดตรวจวันนี้!
                </span>
              )}
              {task.isOverdue && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm animate-pulse">
                  🚨 เกินกำหนดตรวจ!
                </span>
              )}
              {isCompleted && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✓ ตรวจเสร็จสิ้น
                </span>
              )}
              {isInProgress && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  ⏳ กำลังดำเนินการตรวจ
                </span>
              )}
            </div>

            {task.createdBy && (
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">ผู้สร้างแผน: {task.createdBy.name}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="md:col-span-2 space-y-1.5">
              <div>
                <span className="text-slate-400 font-bold">ชื่อแผนงาน: </span>
                <span className="text-slate-900 dark:text-slate-100 font-black text-sm">{task.title}</span>
              </div>
              {task.description && (
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="text-slate-400 font-bold">รายละเอียด: </span>
                  <span>{task.description}</span>
                </div>
              )}
              <div className="text-teal-700 dark:text-teal-400 font-semibold">
                ขอบเขต: {scopeText}
              </div>

              {/* Progress Bar */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">ความคืบหน้าการตรวจนับ</span>
                  <span className="text-teal-700 dark:text-teal-300">
                    {metrics.checked} / {metrics.total} ชิ้น ({metrics.progressPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${metrics.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                  <span className="text-emerald-600 font-bold">ผ่าน: {metrics.pass}</span>
                  <span className="text-amber-600 font-bold">มีหมายเหตุ: {metrics.passWithNote}</span>
                  <span className="text-rose-600 font-bold">ชำรุด/ไม่ผ่าน: {metrics.fail}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>กำหนดเป้าหมาย: {formatDate(task.pickupDate)}</span>
              </div>
              {task.startDate && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>เริ่มตรวจ: {formatDate(task.startDate)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>จำนวนครุภัณฑ์ในแผน: {metrics.total} รายการ</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              * เจ้าหน้าที่สามารถสแกนบาร์โค้ดเพื่อตรวจสภาพและบันทึกผลได้ทันที
            </span>
            <Link
              href="/maintenance"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>ไปหน้าตรวจนับ / บันทึกผล</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      );
    }

    if (task.type === 'MAINTENANCE_PM') {
      const assets = task.assets || [];
      return (
        <div
          key={`pm-${task.id}`}
          className={`bg-white dark:bg-slate-900 rounded-3xl border-2 p-5 shadow-sm space-y-3 transition hover:shadow-md ${
            task.isOverdue
              ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
              : 'border-amber-200 dark:border-amber-900/60'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Wrench className="w-3 h-3 text-amber-600" />
                <span>🔧 ตรวจบำรุงรักษาเชิงป้องกัน (Routine PM Due)</span>
              </span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {task.requestNumber}
              </span>
              {task.isPickupToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                  ⚡ ครบรอบตรวจ PM วันนี้!
                </span>
              )}
              {task.isOverdue && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm animate-pulse">
                  🚨 เกินรอบตรวจ PM แล้ว!
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 font-bold">
              ครุภัณฑ์ที่ต้องตรวจ: <span className="text-amber-700 dark:text-amber-300">{assets.length} เครื่อง/ชิ้น</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <span className="text-slate-400 font-bold">รายละเอียดงาน: </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ครุภัณฑ์ถึงกำหนดรอบตรวจสอบสภาพและบำรุงรักษาเชิงป้องกัน (Preventive Maintenance) ประจำวันที่ {formatDate(task.pickupDate)}
              </span>
            </div>

            {/* List of Assets Due */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {assets.slice(0, 6).map((a: any) => (
                <div
                  key={a.id}
                  className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-300 text-[11px]">
                      {a.assetCode}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        a.pmStatus === 'OVERDUE'
                          ? 'bg-rose-100 text-rose-800'
                          : a.pmStatus === 'DUE_SOON'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {a.pmStatus === 'OVERDUE' ? 'เกินกำหนด' : a.pmStatus === 'DUE_SOON' ? 'ใกล้ถึงกำหนด' : 'ปกติ'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {a.item?.name || 'ครุภัณฑ์'}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{a.location || 'ห้องปฏิบัติการ'}</span>
                  </div>
                </div>
              ))}
              {assets.length > 6 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs flex items-center justify-center text-slate-500 font-bold">
                  +{assets.length - 6} รายการเพิ่มเติม
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              * สามารถบันทึกประวัติการบำรุงรักษา หรือสร้างแผนตรวจสภาพครุภัณฑ์เพื่อตรวจเช็คทั้งห้องได้
            </span>
            <Link
              href="/maintenance"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>ไปหน้าระบบบำรุงรักษา (PM)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      );
    }

    if (task.type === 'ROOM_BOOKING') {
      return (
        <div
          key={`room-${task.id}`}
          className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/60 p-5 shadow-sm space-y-3 transition hover:shadow-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>จองใช้ห้องปฏิบัติการ (Room Reservation)</span>
              </span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {task.requestNumber}
              </span>
              <span className="font-bold text-xs text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-100">
                {task.roomName} {task.roomCode ? `(${task.roomCode})` : ''}
              </span>
              {task.isPickupToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                  ⚡ ใช้งานวันนี้!
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatUserName(task.user)}</span>
              {task.user?.studentId && (
                <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                  {task.user.studentId}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="md:col-span-2 space-y-1.5">
              <div>
                <span className="text-slate-400 font-bold">ชื่องาน/การใช้งาน: </span>
                <span className="text-slate-900 dark:text-slate-100 font-black text-sm">{task.purpose}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                <span>{task.usagePurpose}</span>
              </div>
              {task.course && (
                <div className="text-teal-700 font-semibold">
                  รายวิชา: [{task.course.code}] {task.course.name}
                </div>
              )}
              {task.advisorName && (
                <div className="text-indigo-700 font-medium flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{formatTeacherName(task.advisorName)}</span>
                </div>
              )}
              {task.equipmentNeeded && (
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-start gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>อุปกรณ์ที่ขอจัดเตรียม: <strong>{task.equipmentNeeded}</strong></span>
                </div>
              )}
            </div>

            <div className="space-y-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>วันที่: {formatDate(task.pickupDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-teal-700">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>เวลา: {task.timeSlot}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>ผู้เข้าใช้: ~{task.attendeesCount || 1} คน</span>
              </div>
              {task.contactPhone && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>โทร: {task.contactPhone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              * ได้รับอนุมัติให้เข้าใช้ห้องเรียบร้อยแล้ว
            </span>
            <Link
              href="/rooms"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
            >
              <span>ดูตารางการใช้ห้อง</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      );
    }

    if (task.type === 'PRACTICE_EVENT') {
      const isExpanded = expandedSlotIds[task.id] !== false; // default expanded
      const checkedInCount = task.students.filter((s: any) => s.status === 'CHECKED_IN').length;
      const completedCount = task.students.filter((s: any) => s.status === 'COMPLETED').length;
      const kitKeys = Object.keys(task.kitsSummary);

      return (
        <div
          key={`event-${task.id}`}
          className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-indigo-200/90 dark:border-indigo-900/60 shadow-md shadow-indigo-500/5 overflow-hidden transition"
        >
          {/* Event Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-teal-950 p-4 sm:p-5 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-300" />
                    <span>รอบฝึกปฏิบัติการ (Practice Session Event)</span>
                  </span>
                  {task.isPickupToday && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                      ⚡ เข้าฝึกวันนี้!
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 mt-1">
                  <MapPin className="w-5 h-5 text-teal-400 flex-shrink-0" />
                  <span>{task.roomName}</span>
                  {task.roomCode && (
                    <span className="text-xs font-mono font-bold text-teal-300/80 bg-teal-900/50 px-2 py-0.5 rounded border border-teal-500/30">
                      {task.roomCode}
                    </span>
                  )}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-0.5 font-medium">
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    <span>{formatDate(task.pickupDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>รอบเวลา: {task.timeSlot}</span>
                  </div>
                </div>
              </div>

              {/* Right Stats & Controls */}
              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-right">
                  <span className="text-[10px] text-slate-300 block uppercase font-bold">ผู้เข้าฝึกในรอบนี้</span>
                  <div className="text-sm font-black text-white flex items-center justify-end gap-1.5">
                    <Users className="w-4 h-4 text-teal-400" />
                    <span>{task.students.length} / {task.maxCapacity} คน</span>
                  </div>
                </div>

                <button
                  onClick={() => toggleSlotExpand(task.id)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title={isExpanded ? 'ย่อรายละเอียด' : 'ขยายดูรายชื่อนิสิต'}
                >
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-white/10 text-xs">
              <span className="text-slate-300">
                สถานะผู้เข้าฝึก: <strong>{checkedInCount}</strong> กำลังฝึก • <strong>{completedCount}</strong> ฝึกเสร็จแล้ว • <strong>{task.students.length - checkedInCount - completedCount}</strong> รอเข้าฝึก
              </span>
            </div>
          </div>

          {/* Collapsible Content */}
          {isExpanded && (
            <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {/* Materials Summary */}
              {kitKeys.length > 0 && (
                <div className="bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-2xl p-3.5 text-xs space-y-1.5">
                  <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>ชุดพัสดุหัตถการที่ต้องจัดเตรียมล่วงหน้าประจำรอบนี้:</span>
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {kitKeys.map((kId) => {
                      const kit = task.kitsSummary[kId];
                      return (
                        <span
                          key={kId}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 text-teal-800 dark:text-teal-300 font-bold shadow-sm"
                        >
                          <span>{kit.name}</span>
                          <span className="bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-1.5 py-0.2 rounded text-[11px]">
                            x{kit.count} ชุด
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Student List in this slot */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  รายชื่อนิสิตในรอบเวลานี้ ({task.students.length} คน):
                </span>
                {task.students.map((studentBooking: any) => {
                  const isApproved = studentBooking.status === 'APPROVED';
                  const isCheckedIn = studentBooking.status === 'CHECKED_IN';
                  const isCompleted = studentBooking.status === 'COMPLETED';
                  const isPending = studentBooking.status === 'PENDING';

                  return (
                    <div
                      key={studentBooking.id}
                      className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {formatUserName(studentBooking.user)}
                            </span>
                            {studentBooking.user?.studentId && (
                              <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                                {studentBooking.user.studentId}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              ({studentBooking.bookingNumber})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-slate-600">
                            <div>
                              <span className="text-slate-400 font-semibold">หัตถการ: </span>
                              <strong className="text-slate-800 dark:text-slate-200">{studentBooking.skillTopic}</strong>
                            </div>
                            {studentBooking.course ? (
                              <span className="text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-100 dark:border-teal-800">
                                [{studentBooking.course.code}] {studentBooking.course.name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                ฝึกอิสระ/OSCE
                              </span>
                            )}
                            {studentBooking.advisorName && (
                              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{formatTeacherName(studentBooking.advisorName)}</span>
                              </span>
                            )}
                          </div>

                          {studentBooking.additionalEquipment && (
                            <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block font-medium">
                              ขอเพิ่ม: {studentBooking.additionalEquipment}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badge per student */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-teal-600" />
                            <span>อนุมัติแล้ว (รอเข้าแล็บ)</span>
                          </span>
                        )}
                        {isCheckedIn && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>กำลังฝึกในห้องแล็บ</span>
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ฝึกเสร็จสิ้น</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>รออนุมัติ</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Event Card Footer */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  * เจ้าหน้าที่สามารถตรวจสอบการเข้าฝึกและสแกน QR Code เพื่อบันทึกเวลาได้ที่หน้าระบบฝึกปฏิบัติ
                </span>
                <Link
                  href="/practice"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>เปิดจุดสแกนรับนิสิตรอบนี้</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Borrow or Requisition card
    return (
      <div
        key={`${task.type}-${task.id}`}
        className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm space-y-4 transition hover:shadow-md ${
          task.isOverdue
            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
            : task.isReturnToday
            ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20'
            : task.status === 'APPROVED'
            ? 'border-blue-200 dark:border-blue-900/60'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                task.type === 'BORROW'
                  ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
              }`}
            >
              {task.type === 'BORROW' ? 'ยืมครุภัณฑ์' : 'เบิกวัสดุ'}
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              {task.requestNumber}
            </span>

            {/* Status Badge */}
            {task.status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                อนุมัติแล้ว (รอจัดเตรียม & จ่ายของ)
              </span>
            )}
            {task.status === 'BORROWED' && !task.isOverdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <RefreshCw className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                จ่ายของแล้ว (กำลังยืมใช้งาน)
              </span>
            )}
            {task.isOverdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                เกินกำหนดส่งคืนห้องแล็บ!
              </span>
            )}
            {task.isReturnToday && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                ครบกำหนดส่งคืนวันนี้ (16:30 น.)
              </span>
            )}
          </div>

          {/* User & Course info */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatUserName(task.user)}</span>
              {task.user?.studentId && (
                <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                  {task.user.studentId}
                </span>
              )}
            </div>
            {task.user?.phone && (
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Phone className="w-3 h-3" /> {task.user.phone}
              </span>
            )}
          </div>
        </div>

        {/* Schedule Timeline Dates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/70 dark:bg-slate-850/80 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          {/* 1. Preparation & Pickup Date */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {task.status === 'BORROWED'
                ? '📦 วันที่รับของไปแล้ว'
                : '📦 วันที่ต้องเตรียมของ / นัดรับของ'}
            </span>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{formatDate(task.pickupDate)}</span>
              {task.isPickupToday && (
                <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.2 rounded-full">
                  วันนี้!
                </span>
              )}
              {task.status === 'APPROVED' && isPast(task.pickupDate) && (
                <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.2 rounded-full">
                  เลยวันนัดรับ
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {task.status === 'APPROVED'
                ? 'เจ้าหน้าที่จัดเตรียมไว้เพื่อรอจ่ายของ'
                : 'จ่ายของให้นิสิต/ผู้ยืมเรียบร้อยแล้ว'}
            </p>
          </div>

          {/* 2. Expected Return Date */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              🔄 กำหนดวันคืนของ
            </span>
            {task.type === 'BORROW' ? (
              <>
                <div
                  className={`font-bold flex items-center gap-1.5 text-sm ${
                    task.isOverdue
                      ? 'text-rose-600 dark:text-rose-400'
                      : task.isReturnToday
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>{formatDate(task.returnDate)}</span>
                  {task.isReturnToday && (
                    <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.2 rounded-full">
                      คืนวันนี้!
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {task.isOverdue
                    ? '⚠️ เกินกำหนดส่งคืน กรุณาโทรติดตาม'
                    : task.status === 'BORROWED'
                    ? 'อยู่ระหว่างยืมใช้งาน (รอรับคืนตามกำหนด)'
                    : 'กำหนดส่งคืนตามแผนหลังรับของ'}
                </p>
              </>
            ) : (
              <div className="text-slate-400 dark:text-slate-500 italic text-xs py-1">
                วัสดุสิ้นเปลือง (ไม่ต้องส่งคืน)
              </div>
            )}
          </div>

          {/* 3. Course, Advisor & Purpose */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              📚 รายวิชา / อาจารย์ผู้รับทราบ
            </span>
            {task.course ? (
              <div className="font-bold text-teal-800 dark:text-teal-300 text-xs">
                {task.course.code} - {task.course.name}
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 font-medium text-xs">
                กิจกรรมฝึกทักษะทั่วไป (นอกรายวิชา)
              </div>
            )}
            {task.advisorName && (
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{formatTeacherName(task.advisorName)}</span>
              </div>
            )}
            <div className="text-slate-600 dark:text-slate-400 line-clamp-2 text-xs">
              "{task.purpose}"
            </div>
          </div>
        </div>

        {/* Items List inside task */}
        <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
            {task.status === 'BORROWED' ? 'รายการครุภัณฑ์ที่ต้องตรวจรับคืน:' : 'รายการของที่ต้องจัดเตรียม:'}
          </span>
          <div className="flex flex-wrap gap-2">
            {task.items.map((it: any) => (
              <div
                key={it.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{it.item?.name}</span>
                <span className="text-slate-500 dark:text-slate-400 font-normal">
                  ({it.quantity || it.quantityRequested} {it.requestedUnit || (it.isSubUnit ? it.item?.usageUnit : it.item?.unit) || it.item?.unit})
                </span>
                {it.asset && (
                  <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-1 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                    {it.asset.assetCode}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => handleOpenEditDates(task)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>แก้ไขกำหนดวันรับ / วันคืน</span>
              </button>
            )}
          </div>

          <Link
            href={
              task.type === 'BORROW'
                ? task.status === 'APPROVED'
                  ? '/borrow?status=APPROVED'
                  : '/borrow?status=BORROWED'
                : '/requisitions'
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
          >
            <span>
              {task.status === 'APPROVED'
                ? 'ไปหน้าบันทึกจ่ายของ'
                : 'ไปหน้าตรวจรับคืน'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  };

  // Compact Duty Row for High-Density Operations (15-20 rows visible per screen)
  const renderCompactTableRow = (task: any) => {
    // 1. Time / Urgency Badge
    let timeBadge = null;
    if (task.isOverdue) {
      timeBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse shrink-0">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>🚨 เกินกำหนด ({formatDate(task.returnDate || task.pickupDate)})</span>
        </span>
      );
    } else if (task.isPickupToday || task.isReturnToday) {
      const timeStr = task.timeSlot
        ? task.timeSlot.split('-')[0].trim() + ' น.'
        : task.isReturnToday
        ? 'กำหนดคืน 16:30'
        : task.type === 'INSPECTION_PLAN'
        ? 'ตรวจสภาพ'
        : task.type === 'MAINTENANCE_PM'
        ? 'ตรวจ PM'
        : 'รอจ่ายของ';
      timeBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
          <Clock className="w-3 h-3 text-amber-700" />
          <span>⚡ วันนี้ ({timeStr})</span>
        </span>
      );
    } else if (isTaskPastPending(task)) {
      timeBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
          <Clock className="w-3 h-3 text-amber-700" />
          <span>⏳ ค้างจ่าย ({formatDate(task.pickupDate)})</span>
        </span>
      );
    } else if (task.type === 'BORROW' && task.status === 'BORROWED') {
      timeBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 shrink-0">
          <RefreshCw className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          <span>คืน: {formatDate(task.returnDate)}</span>
        </span>
      );
    } else if ((task.type === 'BORROW' || task.type === 'REQUISITION') && task.status === 'APPROVED') {
      timeBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 shrink-0">
          <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span>นัดรับ: {formatDate(task.pickupDate)}</span>
        </span>
      );
    } else {
      timeBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 shrink-0">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>{formatDate(task.activeDate || task.pickupDate || task.returnDate)}</span>
        </span>
      );
    }

    // 2. Type Badge
    let typeBadge = null;
    if (task.type === 'BORROW') {
      typeBadge = (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
          {task.status === 'BORROWED' ? '🔄 รอรับคืน' : '📦 ยืมของ'}
        </span>
      );
    } else if (task.type === 'REQUISITION') {
      typeBadge = (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
          📝 เบิกวัสดุ
        </span>
      );
    } else if (task.type === 'ROOM_BOOKING') {
      typeBadge = (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
          🏢 จองห้อง
        </span>
      );
    } else if (task.type === 'PRACTICE_EVENT') {
      typeBadge = (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
          🏥 แล็บ
        </span>
      );
    } else if (task.type === 'INSPECTION_PLAN') {
      typeBadge = (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
          🔍 ตรวจสภาพ
        </span>
      );
    } else if (task.type === 'MAINTENANCE_PM') {
      typeBadge = (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
          🔧 ตรวจ PM
        </span>
      );
    }

    // 3. Details summary
    let detailTitle = task.purpose || '-';
    let detailSub = '';
    let actionBtn = null;

    if (task.type === 'BORROW' || task.type === 'REQUISITION') {
      const itemsCount = task.items?.length || 0;
      const firstItem = task.items?.[0]?.item?.name || '';
      detailTitle = firstItem ? `${firstItem}${itemsCount > 1 ? ` (+${itemsCount - 1} รายการ)` : ''}` : task.purpose;
      detailSub = task.course ? `[${task.course.code}] ${task.course.name}` : `รหัส: ${task.requestNumber}`;
      actionBtn = (
        <Link
          href={
            task.type === 'BORROW'
              ? task.status === 'APPROVED'
                ? '/borrow?status=APPROVED'
                : '/borrow?status=BORROWED'
              : '/requisitions'
          }
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition inline-flex items-center gap-1 shadow-sm shrink-0"
        >
          <span>{task.status === 'APPROVED' ? 'จ่ายของ' : 'รับคืน'}</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      );
    } else if (task.type === 'ROOM_BOOKING') {
      detailTitle = task.purpose || task.usagePurpose || 'เข้าใช้ห้องปฏิบัติการ';
      detailSub = `ผู้เข้าใช้ ~${task.attendeesCount || 1} คน • เวลา: ${task.timeSlot}`;
      actionBtn = (
        <Link
          href="/rooms"
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition inline-flex items-center gap-1 shadow-sm shrink-0"
        >
          <span>ดูห้อง</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      );
    } else if (task.type === 'PRACTICE_EVENT') {
      detailTitle = `รอบฝึกปฏิบัติการ (${task.students?.length || 0}/${task.maxCapacity || 6} คน)`;
      detailSub = `รอบเวลา: ${task.timeSlot}`;
      actionBtn = (
        <Link
          href="/practice"
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition inline-flex items-center gap-1 shadow-sm shrink-0"
        >
          <QrCode className="w-3 h-3" />
          <span>สแกนรับ</span>
        </Link>
      );
    } else if (task.type === 'INSPECTION_PLAN') {
      const metrics = task.metrics || { total: 0, checked: 0, progressPercent: 0 };
      detailTitle = task.title;
      detailSub = `ความคืบหน้า ${metrics.checked}/${metrics.total} ชิ้น (${metrics.progressPercent}%)`;
      actionBtn = (
        <Link
          href="/maintenance"
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition inline-flex items-center gap-1 shadow-sm shrink-0"
        >
          <CheckSquare className="w-3 h-3" />
          <span>ตรวจนับ</span>
        </Link>
      );
    } else if (task.type === 'MAINTENANCE_PM') {
      detailTitle = `ตรวจ PM ครุภัณฑ์ (${task.assets?.length || 0} เครื่อง)`;
      detailSub = `รอบวันที่: ${formatDate(task.pickupDate)}`;
      actionBtn = (
        <Link
          href="/maintenance"
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition inline-flex items-center gap-1 shadow-sm shrink-0"
        >
          <Wrench className="w-3 h-3" />
          <span>ตรวจ PM</span>
        </Link>
      );
    }

    const requesterName = task.user ? formatUserName(task.user) : task.createdBy?.name || '-';
    const requesterId = task.user?.studentId;
    const roomDisp = task.roomCode || task.roomName || task.targetLocation?.name || task.location || '-';

    return (
      <tr
        key={`row-${task.type}-${task.id}`}
        className={`border-b border-slate-100 dark:border-slate-800 transition hover:bg-teal-50/40 dark:hover:bg-slate-800/60 ${
          task.isOverdue
            ? 'bg-rose-50/30 dark:bg-rose-950/20'
            : task.isPickupToday || task.isReturnToday
            ? 'bg-amber-50/20 dark:bg-amber-950/15'
            : ''
        }`}
      >
        <td className="py-2.5 px-3 whitespace-nowrap">
          {timeBadge}
        </td>
        <td className="py-2.5 px-2 whitespace-nowrap">
          {typeBadge}
        </td>
        <td className="py-2.5 px-3 min-w-[200px]">
          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
            {detailTitle}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
            {detailSub}
          </div>
        </td>
        <td className="py-2.5 px-3 whitespace-nowrap text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            {requesterName}
          </div>
          {requesterId && (
            <div className="text-[10px] font-mono text-teal-700 dark:text-teal-400">
              {requesterId}
            </div>
          )}
        </td>
        <td className="py-2.5 px-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-[120px]">{roomDisp}</span>
          </span>
        </td>
        <td className="py-2.5 px-3 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-1.5">
            {actionBtn}
          </div>
        </td>
      </tr>
    );
  };

  const renderCompactTable = (tasks: any[]) => {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">เวลา / กำหนด</th>
                <th className="py-2.5 px-2">ประเภท</th>
                <th className="py-2.5 px-3">รหัส / รายการงาน</th>
                <th className="py-2.5 px-3">ผู้ขอ / นิสิต</th>
                <th className="py-2.5 px-3">สถานที่ / ห้อง</th>
                <th className="py-2.5 px-3 text-right">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => renderCompactTableRow(task))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-teal-600" />
            ตารางงานเจ้าหน้าที่ & กำหนดการรับ-คืน (Duty Schedule)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ติดตามรายการที่อนุมัติแล้ว: วันที่ต้องจัดเตรียมของ วันที่ผู้รับจะมารับ กำหนดส่งคืน และคิวฝึกปฏิบัติการในห้องแล็บ
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>สิทธิ์แอดมิน/เจ้าหน้าที่: สามารถแก้ไขกำหนดวันรับและวันคืนได้</span>
          </div>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => { setViewMode('LIST'); setTimeFilter('ALL'); }}
          title="คลิกเพื่อดูคิวงานที่ต้องดำเนินการทั้งหมดในมุมมองรายการ"
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">คิวงานทั้งหมด</span>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {activeQueueTasks.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">งาน</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => { setViewMode('LIST'); setTimeFilter('PENDING'); }}
          title="คลิกเพื่อดูรายการเบิก-ยืมที่อนุมัติแล้วและรอจ่ายของ/ตัดสต็อก"
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition"
        >
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">รอจ่ายของ</span>
            <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
              {combinedTasks.filter((t) => t.status === 'APPROVED').length}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => { setViewMode('LIST'); setTimeFilter('BORROWED'); }}
          title="คลิกเพื่อดูรายการครุภัณฑ์ที่จ่ายออกไปแล้วและรอรับคืน"
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition"
        >
          <div>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">กำลังยืม (รอคืน)</span>
            <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">
              {combinedTasks.filter((t) => t.status === 'BORROWED').length}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => { setViewMode('LIST'); setTimeFilter('OVERDUE'); }}
          title="คลิกเพื่อดูรายการเกินกำหนดคืน"
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md transition"
        >
          <div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">เกินกำหนดคืน</span>
            <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">
              {combinedTasks.filter((t) => t.isOverdue).length}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">รายการ</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">คิวฝึกแล็บ</span>
            <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
              {practiceList.filter((p: any) => !isPast(p.slot?.date)).length}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">คน</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => { setViewMode('LIST'); setTimeFilter('PM'); }}
          title="คลิกเพื่อดูรายการตรวจสภาพ & PM"
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition"
        >
          <div>
            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase">ตรวจสภาพ & PM</span>
            <div className="text-xl font-black text-teal-700 dark:text-teal-400 mt-1">
              {inspectionPlansList.filter((p: any) => (p.status || '').toUpperCase() !== 'COMPLETED').length}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">แผน ({pmAssetsList.filter((a: any) => a.pmStatus === 'OVERDUE' || a.pmStatus === 'DUE_SOON').length} ชิ้น)</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* View Switcher & Calendar Navigator Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'CALENDAR' && (
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
          )}

          {viewMode === 'CALENDAR' && (
            <button
              onClick={handleTodayMonth}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              วันนี้
            </button>
          )}
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold self-start sm:self-auto">
          <button
            onClick={() => setViewMode('CALENDAR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'CALENDAR'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>📅 ปฏิทินรายเดือน (Calendar View)</span>
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'LIST'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>📋 มุมมองรายการ (List View)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE MONTHLY CALENDAR */}
      {viewMode === 'CALENDAR' && (
        <div className="space-y-6">
          {/* Calendar Grid Container */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Legend Bar */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">สัญลักษณ์งาน:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                  📦 จ่ายของ
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                  🔄 กำหนดคืน
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  🏢 ใช้ห้อง
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  🏥 คิวแล็บ
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-bold">
                  🔍 ตรวจสภาพ
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                  🔧 ตรวจ PM
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold animate-pulse">
                  🚨 เกินกำหนด
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                คลิกที่วันที่เพื่อดูรายละเอียดงานและจัดการรายการประจำวัน
              </span>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-center text-xs font-black text-slate-700 dark:text-slate-300 py-3">
              <div className="text-rose-500">อาทิตย์</div>
              <div>จันทร์</div>
              <div>อังคาร</div>
              <div>พุธ</div>
              <div>พฤหัสบดี</div>
              <div>ศุกร์</div>
              <div className="text-teal-600">เสาร์</div>
            </div>

            {/* 42 Calendar Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
              {calendarCells.map((cell) => {
                const dayTasks = getTasksForDate(cell.dateStr);
                const pickups = dayTasks.filter((t: any) => isPickupOnDate(t, cell.dateStr));
                const returns = dayTasks.filter((t: any) => isReturnOnDate(t, cell.dateStr));
                const practices = dayTasks.filter((t: any) => {
                  return toLocalDateKey(t.pickupDate) === cell.dateStr && t.type === 'PRACTICE_EVENT';
                });
                const roomTasks = dayTasks.filter((t: any) => {
                  return toLocalDateKey(t.pickupDate) === cell.dateStr && t.type === 'ROOM_BOOKING';
                });
                const auditTasks = dayTasks.filter((t: any) => {
                  return toLocalDateKey(t.pickupDate) === cell.dateStr && t.type === 'INSPECTION_PLAN';
                });
                const pmTasks = dayTasks.filter((t: any) => {
                  return toLocalDateKey(t.pickupDate) === cell.dateStr && t.type === 'MAINTENANCE_PM';
                });
                const overdues = dayTasks.filter((t: any) => {
                  if (!t.isOverdue) return false;
                  if (t.type === 'BORROW') return toLocalDateKey(t.returnDate) === cell.dateStr;
                  return toLocalDateKey(t.pickupDate) === cell.dateStr;
                });

                const isSelected = selectedDate === cell.dateStr;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => {
                      setSelectedDate(cell.dateStr);
                      setHoverPopover(null);
                    }}
                    onMouseEnter={(e) => handleCellMouseEnter(e, cell.dateStr, dayTasks)}
                    onMouseLeave={handleCellMouseLeave}
                    className={`min-h-[105px] p-2 transition cursor-pointer flex flex-col justify-between ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/40 dark:bg-slate-900/30 opacity-40'
                        : isSelected
                        ? 'bg-teal-50/70 dark:bg-teal-950/40 ring-2 ring-teal-500 z-10'
                        : cell.isToday
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/40'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-lg w-6 h-6 flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-teal-600 text-white font-black shadow-sm'
                            : isSelected
                            ? 'bg-teal-100 text-teal-900 font-black'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {dayTasks.length} งาน
                        </span>
                      )}
                    </div>

                    {/* Task Badges Stack */}
                    <div className="space-y-1 my-1">
                      {pickups.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 truncate flex items-center gap-1">
                          <span>📦 จ่าย</span>
                          <span className="ml-auto font-black">{pickups.length}</span>
                        </div>
                      )}
                      {returns.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 truncate flex items-center gap-1">
                          <span>🔄 คืน</span>
                          <span className="ml-auto font-black">{returns.length}</span>
                        </div>
                      )}
                      {practices.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 truncate flex items-center gap-1">
                          <span>🏥 แล็บ</span>
                          <span className="ml-auto font-black">{practices.length}</span>
                        </div>
                      )}
                      {roomTasks.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 truncate flex items-center gap-1">
                          <span>🏢 ใช้ห้อง</span>
                          <span className="ml-auto font-black">{roomTasks.length}</span>
                        </div>
                      )}
                      {auditTasks.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 truncate flex items-center gap-1">
                          <span>🔍 ตรวจสภาพ</span>
                          <span className="ml-auto font-black">{auditTasks.length}</span>
                        </div>
                      )}
                      {pmTasks.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 truncate flex items-center gap-1">
                          <span>🔧 ตรวจ PM</span>
                          <span className="ml-auto font-black">{pmTasks.length}</span>
                        </div>
                      )}
                      {overdues.length > 0 && (
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 truncate flex items-center gap-1 animate-pulse">
                          <span>🚨 เกิน</span>
                          <span className="ml-auto font-black">{overdues.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator */}
                    <div className="h-1">
                      {isSelected && (
                        <div className="w-full h-1 bg-teal-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Calendar Hover Popover */}
            {hoverPopover && (
              <CalendarHoverCard
                isOpen={hoverPopover.isOpen}
                anchorRect={hoverPopover.anchorRect}
                dateStr={hoverPopover.dateStr}
                items={hoverPopover.items}
              />
            )}
          </div>

          {/* Selected Date Duty Detail Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    ตารางคิวงานประจำวัน: {formatThaiFullDate(selectedDate)}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  พบทั้งหมด {selectedDateAllTasks.length} รายการที่ต้องดำเนินการในวันที่เลือก
                </p>
              </div>

              {/* Sub-filter chips for selected day */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'ALL', label: `ทั้งหมด (${selectedDateAllTasks.length})` },
                  { key: 'PICKUP', label: `📦 จ่ายของ (${selectedDateAllTasks.filter((t: any) => isPickupOnDate(t, selectedDate)).length})` },
                  { key: 'RETURN', label: `🔄 กำหนดคืน (${selectedDateAllTasks.filter((t: any) => isReturnOnDate(t, selectedDate)).length})` },
                  { key: 'ROOM', label: `🏢 ใช้ห้อง (${selectedDateAllTasks.filter((t: any) => toLocalDateKey(t.pickupDate) === selectedDate && t.type === 'ROOM_BOOKING').length})` },
                  { key: 'PRACTICE', label: `🏥 คิวแล็บ (${selectedDateAllTasks.filter((t: any) => toLocalDateKey(t.pickupDate) === selectedDate && t.type === 'PRACTICE_EVENT').length})` },
                  { key: 'AUDIT', label: `🔍 ตรวจสภาพ (${selectedDateAllTasks.filter((t: any) => toLocalDateKey(t.pickupDate) === selectedDate && t.type === 'INSPECTION_PLAN').length})` },
                  { key: 'PM', label: `🔧 ตรวจ PM (${selectedDateAllTasks.filter((t: any) => toLocalDateKey(t.pickupDate) === selectedDate && t.type === 'MAINTENANCE_PM').length})` },
                ].map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setDayTypeFilter(chip.key as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      dayTypeFilter === chip.key
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Tasks for Selected Date */}
            {selectedDateTasks.length === 0 ? (
              <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  ไม่มีคิวงานในหมวดที่เลือกสำหรับวันที่ ({formatDate(selectedDate)})
                </p>
                <p>สามารถคลิกเลือกวันอื่นบนปฏิทิน หรือเปลี่ยนตัวกรองเพื่อดูรายการทั้งหมดได้</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateTasks.map((task) => renderTaskCard(task))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: FULL LIST VIEW */}
      {viewMode === 'LIST' && (
        <div className="space-y-4">
          {/* Filter, Search & Layout Switch Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL', label: `ทั้งหมด (${activeQueueTasks.length})` },
                { key: 'TODAY', label: `⚡ ต้องทำวันนี้ (${activeQueueTasks.filter((t: any) => t.isPickupToday || t.isReturnToday).length})` },
                { key: 'PENDING', label: `📦 รอจ่ายของ (${activeQueueTasks.filter(isTaskAwaitingDispense).length})` },
                { key: 'BORROWED', label: `🔄 กำลังยืม/รอคืน (${activeQueueTasks.filter((t: any) => t.type === 'BORROW' && t.status === 'BORROWED').length})` },
                { key: 'UPCOMING', label: `🗓️ ตามกำหนดการ (${activeQueueTasks.filter(isTaskUpcoming).length})` },
                { key: 'OVERDUE', label: `🚨 เกินกำหนด (${activeQueueTasks.filter((t: any) => t.isOverdue).length})` },
                { key: 'AUDIT', label: `🔍 ตรวจสภาพ (${activeQueueTasks.filter((t: any) => t.type === 'INSPECTION_PLAN').length})` },
                { key: 'PM', label: `🔧 ตรวจ PM (${activeQueueTasks.filter((t: any) => t.type === 'MAINTENANCE_PM').length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTimeFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    timeFilter === tab.key
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Controls: Search & Layout Switcher */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อนิสิต / รหัส / รายวิชา..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Layout Switcher (Compact Table vs Cards) */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setListLayout('COMPACT')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    listLayout === 'COMPACT'
                      ? 'bg-teal-600 text-white shadow-sm font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="ตารางกระชับ กวาดสายตาเร็ว เหมาะสำหรับ 50-200 รายการ"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>ตารางกระชับ (Compact)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setListLayout('CARDS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    listLayout === 'CARDS'
                      ? 'bg-teal-600 text-white shadow-sm font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="การ์ดละเอียด แสดงรายละเอียดรายการอุปกรณ์ครบถ้วน"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>การ์ดละเอียด (Cards)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Schedule Content */}
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                <LoadingSpinner
                  message="กำลังโหลดตารางงานและกำหนดการ..."
                  submessage="กำลังดึงข้อมูลคิวงานของเจ้าหน้าที่จาก Supabase"
                />
              </div>
            ) : sortedTasks.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-75" />
                ไม่มีคิวงานที่ตรงกับเงื่อนไขในขณะนี้
              </div>
            ) : timeFilter !== 'ALL' ? (
              /* Specific Filter View: render directly */
              listLayout === 'COMPACT' ? (
                renderCompactTable(sortedTasks)
              ) : (
                <div className="space-y-4">
                  {sortedTasks.map((task: any) => renderTaskCard(task))}
                </div>
              )
            ) : (
              /* High-Volume Overview (timeFilter === 'ALL'): Segmented by Timeline Triage */
              <div className="space-y-6">
                {/* 1. OVERDUE SECTION */}
                {overdueSectionTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-4 py-2.5 rounded-xl">
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-black text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                        <span>🚨 งานเกินกำหนดที่ต้องติดตามเร่งด่วน ({overdueSectionTasks.length} รายการ)</span>
                      </div>
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                        ต้องโทรติดตามนิสิตหรือนำส่งตรวจซ่อม
                      </span>
                    </div>
                    {listLayout === 'COMPACT' ? (
                      renderCompactTable(overdueSectionTasks)
                    ) : (
                      <div className="space-y-4">
                        {overdueSectionTasks.map((task: any) => renderTaskCard(task))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. TODAY SHIFT SECTION */}
                {todaySectionTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-4 py-2.5 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-xs">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>⚡ งานประจำวันนี้ ({todaySectionTasks.length} รายการ)</span>
                      </div>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                        เรียงตามลำดับช่วงเวลา (เช้า ➔ บ่าย ➔ คืนของ)
                      </span>
                    </div>
                    {listLayout === 'COMPACT' ? (
                      renderCompactTable(todaySectionTasks)
                    ) : (
                      <div className="space-y-4">
                        {todaySectionTasks.map((task: any) => renderTaskCard(task))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. PAST PENDING / AWAITING DISPENSE SECTION */}
                {pastPendingSectionTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 px-4 py-2.5 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-xs">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>⏳ รายการค้างจ่าย / เลยวันนัดรับของแล้วแต่ยังไม่ได้จ่ายของ ({pastPendingSectionTasks.length} รายการ)</span>
                      </div>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                        รายการเบิก-ยืมที่อนุมัติแล้วแต่ยังไม่ได้บันทึกจ่ายของหรือตัดสต็อก
                      </span>
                    </div>
                    {listLayout === 'COMPACT' ? (
                      renderCompactTable(pastPendingSectionTasks)
                    ) : (
                      <div className="space-y-4">
                        {pastPendingSectionTasks.map((task: any) => renderTaskCard(task))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. TOMORROW PREPARATION & SCHEDULE SECTION */}
                {tomorrowSectionTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-4 py-2.5 rounded-xl">
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-black text-xs">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span>📅 กำหนดการวันพรุ่งนี้ — เตรียมจ่ายของ / รับคืน / ตารางใช้ห้อง ({tomorrowSectionTasks.length} รายการ)</span>
                      </div>
                      <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">
                        จัดเตรียมพัสดุล่วงหน้าและติดตามรายการครบกำหนดคืนวันพรุ่งนี้
                      </span>
                    </div>
                    {listLayout === 'COMPACT' ? (
                      renderCompactTable(tomorrowSectionTasks)
                    ) : (
                      <div className="space-y-4">
                        {tomorrowSectionTasks.map((task: any) => renderTaskCard(task))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. FUTURE UPCOMING SECTION */}
                {futureSectionTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-black text-xs">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>🗓️ กำหนดการถัดไปในสัปดาห์นี้และอนาคต ({futureSectionTasks.length} รายการ)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFutureCollapsed(!futureCollapsed)}
                        className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{futureCollapsed ? '▼ ขยายดูรายการ' : '▲ ยุบเก็บไว้'}</span>
                      </button>
                    </div>
                    {!futureCollapsed && (
                      listLayout === 'COMPACT' ? (
                        renderCompactTable(futureSectionTasks)
                      ) : (
                        <div className="space-y-4">
                          {futureSectionTasks.map((task: any) => renderTaskCard(task))}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Dates (Admin & Officer) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                แก้ไขกำหนดวันรับและวันคืน
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              รายการ: <strong className="text-slate-800 dark:text-slate-200">{editingItem.title}</strong>
            </p>

            <form onSubmit={handleSaveDates} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วันที่ผู้รับมารับของ / วันที่ต้องจัดเตรียม
                </label>
                <input
                  type="date"
                  required
                  value={newBorrowDate}
                  onChange={(e) => setNewBorrowDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {editingItem.type === 'BORROW' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    กำหนดวันส่งคืนของ
                  </label>
                  <input
                    type="date"
                    required
                    value={newReturnDate}
                    onChange={(e) => setNewReturnDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingDates}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {savingDates ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
