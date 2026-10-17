'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  CheckSquare,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  BookOpen,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Check,
  Layers,
  History,
  Tag,
  GraduationCap,
  QrCode,
  Sparkles,
  MapPin,
  Package,
  Building2,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  SlidersHorizontal,
  LayoutGrid,
  List
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatUserName, formatTeacherName, stripAllPrefixes, formatApproverDisplay, formatAcknowledgeDisplay } from '@/lib/user-utils';
import { canUserApprove, formatApprovalScopeBadge } from '@/lib/approval-scope';

export default function ApprovalsPage() {
  const { currentUser, isApprover, isAdmin, isOfficer, isTeacher } = useAuth();
  const canApprove = isApprover || isAdmin || isOfficer;
  const isPureTeacher = !canApprove && isTeacher;

  const canApproveBorrow = canApprove && canUserApprove(currentUser, 'BORROW');
  const canApproveReq = canApprove && canUserApprove(currentUser, 'REQUISITION');
  const canApprovePractice = canApprove && canUserApprove(currentUser, 'PRACTICE');
  const canApproveRoom = canApprove && canUserApprove(currentUser, 'ROOM');

  const [allBorrows, setAllBorrows] = useState<any[]>([]);
  const [allRequisitions, setAllRequisitions] = useState<any[]>([]);
  const [allPracticeBookings, setAllPracticeBookings] = useState<any[]>([]);
  const [allRoomBookings, setAllRoomBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [activeTab, setActiveTab] = useState<'ALL' | 'BORROW' | 'REQUISITION' | 'PRACTICE' | 'ROOM'>('ALL');
  const [viewScope, setViewScope] = useState<'RELEVANT' | 'ALL'>('RELEVANT');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'CREATED_ASC' | 'CREATED_DESC' | 'DATE_NEEDED_ASC'>('CREATED_ASC');
  const [urgencyChip, setUrgencyChip] = useState<'ALL' | 'SHORT_NOTICE' | 'PAST_DATE' | 'REGULAR'>('ALL');
  const [listLayout, setListLayout] = useState<'COMPACT' | 'CARDS'>('COMPACT');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    setSelectedItemIds(new Set());
  }, [statusFilter, activeTab, viewScope]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) {
      setListLayout('CARDS');
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('id');
      const targetType = params.get('type');
      const targetBatchId = params.get('batchId') || params.get('batchGroupId');
      if (targetBatchId) {
        setHighlightId(targetBatchId);
        setActiveTab('ROOM');
        setStatusFilter('PENDING');
      } else if (targetId) {
        setHighlightId(targetId);
      }
      if (targetType) {
        const upper = targetType.toUpperCase();
        if (upper === 'BORROW' || upper === 'REQUISITION' || upper === 'PRACTICE' || upper === 'ROOM' || upper === 'BOOKING') {
          setActiveTab(upper === 'BOOKING' ? 'ROOM' : upper as any);
          setStatusFilter('PENDING');
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (highlightId && !loading) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`approval-card-${highlightId}`) || document.getElementById(`approval-row-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightId, loading]);

  useEffect(() => {
    if (currentUser && !isAdmin) {
      // If user came via direct deep link with specific type or id, do not override
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      if (params?.get('type') || params?.get('id') || params?.get('batchId') || params?.get('batchGroupId')) return;

      const hasItems = canUserApprove(currentUser, 'BORROW') || canUserApprove(currentUser, 'REQUISITION');
      const hasRooms = canUserApprove(currentUser, 'PRACTICE') || canUserApprove(currentUser, 'ROOM');
      if (hasRooms && !hasItems) {
        if (canUserApprove(currentUser, 'ROOM') && !canUserApprove(currentUser, 'PRACTICE')) {
          setActiveTab('ROOM');
        } else {
          setActiveTab('PRACTICE');
        }
      } else if (hasItems && !hasRooms) {
        setActiveTab('BORROW');
      }
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setViewScope('ALL');
    } else {
      setViewScope('RELEVANT');
    }
  }, [isAdmin]);

  // Auto-switch tab and statusFilter if a specific item is targeted via query param
  useEffect(() => {
    if (!highlightId || loading) return;
    const all = [
      ...allBorrows.map((b) => ({ ...b, _type: 'BORROW' })),
      ...allRequisitions.map((r) => ({ ...r, _type: 'REQUISITION' })),
      ...allPracticeBookings.map((p) => ({ ...p, _type: 'PRACTICE' })),
      ...allRoomBookings.map((rm) => ({ ...rm, _type: 'ROOM' })),
    ];
    const match = all.find((item) => item.id === highlightId || item.batchGroupId === highlightId);
    if (match) {
      if (match.status === 'PENDING') {
        setStatusFilter('PENDING');
      } else if (isApproved(match.status)) {
        setStatusFilter('APPROVED');
      } else if (match.status === 'REJECTED') {
        setStatusFilter('REJECTED');
      }
      if (match._type === 'ROOM') {
        setActiveTab('ROOM');
      } else if (match._type === 'PRACTICE') {
        setActiveTab('PRACTICE');
      } else if (match._type === 'BORROW') {
        setActiveTab('BORROW');
      } else if (match._type === 'REQUISITION') {
        setActiveTab('REQUISITION');
      }
    }
  }, [highlightId, loading, allBorrows, allRequisitions, allPracticeBookings, allRoomBookings]);

  // Reject Modal State
  const [rejectItem, setRejectItem] = useState<{
    id: string;
    type: 'BORROW' | 'REQUISITION' | 'PRACTICE' | 'ROOM';
    isBatch?: boolean;
    batchGroupId?: string;
    batchCount?: number;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const [borrowRes, reqRes, practiceRes, roomRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/requisitions'),
        fetch('/api/practice/bookings'),
        fetch('/api/room-bookings'),
      ]);

      if (borrowRes.ok) {
        const bData = await borrowRes.json();
        setAllBorrows(bData);
      }
      if (reqRes.ok) {
        const rData = await reqRes.json();
        setAllRequisitions(rData);
      }
      if (practiceRes.ok) {
        const pData = await practiceRes.json();
        setAllPracticeBookings(Array.isArray(pData) ? pData : []);
      }
      if (roomRes.ok) {
        const rmData = await roomRes.json();
        setAllRoomBookings(Array.isArray(rmData) ? rmData : []);
      }
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string, type: 'BORROW' | 'REQUISITION' | 'PRACTICE' | 'ROOM') => {
    if (!canUserApprove(currentUser, type)) {
      alert('ท่านไม่มีสิทธิ์อนุมัติรายการประเภทนี้ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)');
      return;
    }
    setApprovingId(id);
    setSubmitting(true);
    try {
      let itemKnownUpdatedAt: string | undefined;
      if (type === 'BORROW') {
        itemKnownUpdatedAt = allBorrows.find((b) => b.id === id)?.updatedAt;
      } else if (type === 'REQUISITION') {
        itemKnownUpdatedAt = allRequisitions.find((r) => r.id === id)?.updatedAt;
      }

      const endpoint =
        type === 'BORROW'
          ? `/api/borrow/${id}`
          : type === 'REQUISITION'
          ? `/api/requisitions/${id}`
          : type === 'ROOM'
          ? `/api/room-bookings/${id}`
          : `/api/practice/bookings/${id}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          userId: currentUser?.id,
          lastKnownUpdatedAt: itemKnownUpdatedAt,
        }),
      });

      if (res.ok) {
        fetchData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 409 || errorData.error === 'CONCURRENCY_CONFLICT') {
          alert(errorData.message || '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง');
          await fetchData();
        } else {
          alert(errorData.error || errorData.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
        }
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setApprovingId(null);
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (id: string, type: 'BORROW' | 'REQUISITION') => {
    setAcknowledgingId(id);
    try {
      const endpoint = type === 'BORROW' ? `/api/borrow/${id}` : `/api/requisitions/${id}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACKNOWLEDGE',
          userId: currentUser?.id,
          advisorName: (isAdmin || isOfficer || currentUser?.role === 'ADMIN' || currentUser?.role === 'OFFICER')
            ? `${formatUserName(currentUser)} (แอดมิน)`
            : formatTeacherName(currentUser),
        }),
      });

      if (res.ok) {
        await fetchData();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกการรับทราบ');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleBatchRoomApprove = async (batchGroupId: string, count: number) => {
    if (!canApproveRoom) {
      alert('ท่านไม่มีสิทธิ์อนุมัติการจองห้องปฏิบัติการ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)');
      return;
    }
    if (!window.confirm(`ยืนยันการอนุมัติคำขอจองห้องทั้งชุดจำนวน ${count} รายการใช่หรือไม่?`)) {
      return;
    }
    setApprovingId(batchGroupId);
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
        if (data.conflicts && data.conflicts.length > 0) {
          alert(`อนุมัติสำเร็จ ${data.approvedCount} รายการ\n⚠️ พบความขัดแย้งเวลา ${data.conflicts.length} รายการ (ไม่ได้อนุมัติ)`);
        }
        await fetchData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการอนุมัติชุดคำขอ');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setApprovingId(null);
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectItem) return;
    if (!canUserApprove(currentUser, rejectItem.type)) {
      alert('ท่านไม่มีสิทธิ์ปฏิเสธรายการประเภทนี้ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)');
      return;
    }
    setSubmitting(true);
    try {
      if (rejectItem.isBatch && rejectItem.batchGroupId) {
        const res = await fetch('/api/room-bookings/batch-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchGroupId: rejectItem.batchGroupId,
            action: 'REJECT',
            userId: currentUser?.id,
            reason: rejectionReason,
          }),
        });

        if (res.ok) {
          setRejectItem(null);
          setRejectionReason('');
          await fetchData();
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'เกิดข้อผิดพลาดในการไม่อนุมัติชุดคำขอ');
        }
        return;
      }

      const endpoint =
        rejectItem.type === 'BORROW'
          ? `/api/borrow/${rejectItem.id}`
          : rejectItem.type === 'REQUISITION'
          ? `/api/requisitions/${rejectItem.id}`
          : rejectItem.type === 'ROOM'
          ? `/api/room-bookings/${rejectItem.id}`
          : `/api/practice/bookings/${rejectItem.id}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          userId: currentUser?.id,
          reason: rejectionReason,
        }),
      });

      if (res.ok) {
        setRejectItem(null);
        setRejectionReason('');
        fetchData();
      } else {
        alert('เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isApprover && !isAdmin && !isTeacher) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-800">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
        <h3 className="font-bold text-base">เฉพาะอาจารย์ ผู้อนุมัติ หรือผู้บริหาร</h3>
        <p className="text-xs mt-1">
          กรุณาสลับบทบาทเป็น "อาจารย์ผู้สอน", "ผู้อนุมัติ (Approver)" หรือ "ผู้ดูแลระบบ (Admin)" เพื่อพิจารณาคำขอ
        </p>
      </div>
    );
  }

  // Filter helper functions
  const isApproved = (status: string) =>
    ['APPROVED', 'BORROWED', 'RETURNED_COMPLETE', 'RETURNED_WITH_ISSUE', 'DISPENSED', 'CHECKED_IN', 'COMPLETED'].includes(status);

  // Normalize Thai academic titles and prefixes for matching
  const cleanThaiTitle = (name?: string | null) => {
    if (!name) return '';
    return stripAllPrefixes(name).toLowerCase();
  };

  // Check if an item is directly relevant to the current user (as teacher, advisor, course instructor, or creator)
  const isRelevantToTeacher = (item: any, user: any): boolean => {
    if (!user) return false;
    const uClean = cleanThaiTitle(user.name);
    const uId = user.id;

    // Direct creator, assigned approver, or acknowledger
    if (item.userId === uId || item.approverId === uId || item.approvedById === uId || item.acknowledgedById === uId) {
      return true;
    }

    // Check advisorName
    if (item.advisorName) {
      const advClean = cleanThaiTitle(item.advisorName);
      if (advClean && (advClean.includes(uClean) || uClean.includes(advClean))) {
        return true;
      }
    }

    // Check course instructorName
    if (item.course?.instructorName) {
      const instClean = cleanThaiTitle(item.course.instructorName);
      if (instClean && (instClean.includes(uClean) || uClean.includes(instClean))) {
        return true;
      }
    }

    // Check practice booking instructor
    if (item.instructor) {
      const instClean = cleanThaiTitle(item.instructor);
      if (instClean && (instClean.includes(uClean) || uClean.includes(instClean))) {
        return true;
      }
    }

    // Check linked requisition request
    if (item.requisitionRequest) {
      if (item.requisitionRequest.advisorName) {
        const advClean = cleanThaiTitle(item.requisitionRequest.advisorName);
        if (advClean && (advClean.includes(uClean) || uClean.includes(advClean))) {
          return true;
        }
      }
      if (item.requisitionRequest.course?.instructorName) {
        const instClean = cleanThaiTitle(item.requisitionRequest.course.instructorName);
        if (instClean && (instClean.includes(uClean) || uClean.includes(instClean))) {
          return true;
        }
      }
    }

    // Check linked borrow request
    if (item.borrowRequest) {
      if (item.borrowRequest.advisorName) {
        const advClean = cleanThaiTitle(item.borrowRequest.advisorName);
        if (advClean && (advClean.includes(uClean) || uClean.includes(advClean))) {
          return true;
        }
      }
      if (item.borrowRequest.course?.instructorName) {
        const instClean = cleanThaiTitle(item.borrowRequest.course.instructorName);
        if (instClean && (instClean.includes(uClean) || uClean.includes(instClean))) {
          return true;
        }
      }
    }

    return false;
  };

  // Check if an item is relevant to the current user (either by teaching/advising OR by approval responsibility scope)
  const isRelevantToUser = (
    item: any,
    user: any,
    type: 'BORROW' | 'REQUISITION' | 'PRACTICE' | 'ROOM'
  ): boolean => {
    if (!user) return false;
    // Highlighted item from deep link is always visible
    if (item.id === highlightId) return true;
    // If user has approval rights for this scope, all items in this scope are under their responsibility
    if (canUserApprove(user, type)) return true;
    // Otherwise check if teacher/advisor/creator
    return isRelevantToTeacher(item, user);
  };

  // Base datasets filtered by scope (RELEVANT: requests in user's approval scope or assigned teaching vs ALL: all faculty requests)
  const scopedBorrows =
    viewScope === 'ALL'
      ? allBorrows
      : allBorrows.filter((b) => isRelevantToUser(b, currentUser, 'BORROW'));

  const scopedRequisitions =
    viewScope === 'ALL'
      ? allRequisitions
      : allRequisitions.filter((r) => isRelevantToUser(r, currentUser, 'REQUISITION'));

  const scopedPracticeBookings =
    viewScope === 'ALL'
      ? allPracticeBookings
      : allPracticeBookings.filter((p) => isRelevantToUser(p, currentUser, 'PRACTICE'));

  const scopedRoomBookings =
    viewScope === 'ALL'
      ? allRoomBookings
      : allRoomBookings.filter((r) => isRelevantToUser(r, currentUser, 'ROOM'));

  // Total items in system vs relevant to teacher
  const totalSystemItems =
    allBorrows.length +
    allRequisitions.filter((r) => !r.borrowRequest).length +
    allPracticeBookings.length +
    allRoomBookings.length;

  const totalRelevantItems =
    allBorrows.filter((b) => isRelevantToUser(b, currentUser, 'BORROW')).length +
    allRequisitions.filter((r) => !r.borrowRequest && isRelevantToUser(r, currentUser, 'REQUISITION')).length +
    allPracticeBookings.filter((p) => isRelevantToUser(p, currentUser, 'PRACTICE')).length +
    allRoomBookings.filter((r) => isRelevantToUser(r, currentUser, 'ROOM')).length;

  const getStageLabel = (status: string, type: 'BORROW' | 'REQUISITION') => {
    if (type === 'BORROW') {
      switch (status) {
        case 'APPROVED':
          return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">อนุมัติแล้ว (รอจ่ายของ)</span>;
        case 'BORROWED':
          return <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">กำลังยืมอยู่</span>;
        case 'RETURNED_COMPLETE':
          return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">คืนสมบูรณ์แล้ว</span>;
        case 'RETURNED_WITH_ISSUE':
          return <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">คืนแล้ว (มีของชำรุด)</span>;
        default:
          return null;
      }
    } else {
      switch (status) {
        case 'APPROVED':
          return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">อนุมัติแล้ว (รอจัดจ่าย)</span>;
        case 'DISPENSED':
          return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">ตัดจ่ายสต็อกแล้ว</span>;
        default:
          return null;
      }
    }
  };

  // Calculate urgency & timing badge according to rules
  const getItemTimeBadge = (createdAtStr: string, dateNeededStr: string) => {
    const now = new Date();
    const created = new Date(createdAtStr);
    const needed = new Date(dateNeededStr);

    // 1. Is dateNeeded in the past? (Over 1 hour ago)
    if (needed.getTime() < now.getTime() && now.getTime() - needed.getTime() > 60 * 60 * 1000) {
      const formattedDate = needed.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      return {
        type: 'PAST_DATE' as const,
        text: `⚠️ วันที่ขอใช้ผ่านไปแล้ว (${formattedDate})`,
        className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
      };
    }

    // 2. Short notice: submitted < 24 hours before date needed
    const diffHoursNotice = (needed.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (diffHoursNotice > 0 && diffHoursNotice < 24) {
      const roundedHours = Math.max(1, Math.round(diffHoursNotice));
      return {
        type: 'SHORT_NOTICE' as const,
        text: `⚡ ยื่นขอก่อนเวลาใช้งาน <24 ชม. (ล่วงหน้า ${roundedHours} ชม.)`,
        className: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-semibold',
      };
    }

    // 3. Normal queue
    const diffDaysAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const formattedCreated = created.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const daysText = diffDaysAgo <= 0 ? 'วันนี้' : `${diffDaysAgo} วันที่แล้ว`;
    return {
      type: 'REGULAR' as const,
      text: `📋 ยื่น ${formattedCreated} (${daysText})`,
      className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };
  };

  interface UnifiedApprovalItem {
    id: string;
    type: 'BORROW' | 'REQUISITION' | 'PRACTICE' | 'ROOM';
    requestNumber: string;
    createdAt: string;
    dateNeeded: string;
    dateNeededDisplay: string;
    dateNeededDate: string;
    dateNeededTime?: string;
    user: any;
    course?: any;
    purpose: string;
    itemsSummary: string;
    status: string;
    canApprove: boolean;
    instructorAcknowledged?: boolean;
    advisorName?: string;
    badge: {
      type: 'SHORT_NOTICE' | 'PAST_DATE' | 'REGULAR';
      text: string;
      className: string;
    };
    raw: any;
    // Batch group support
    isBatch?: boolean;
    batchGroupId?: string;
    batchCount?: number;
    batchItems?: any[];
    batchType?: 'TIMETABLE' | 'MULTI_ROOM' | 'MULTI_DAY' | 'SPECIAL' | 'SINGLE';
    batchSummary?: {
      roomsCount: number;
      datesCount: number;
      roomNames: string[];
      datesText: string;
      totalSlots: number;
      pendingSlots: number;
      approvedSlots: number;
      rejectedSlots: number;
    };
  }

  const mapBorrowToUnified = (b: any): UnifiedApprovalItem => {
    const borrowDate = b.borrowDate || b.createdAt;
    const reqNum = b.requestNumber + (b.requisitionRequest ? ` + ${b.requisitionRequest.requestNumber}` : '');
    const itemsList = (b.items || []).map((it: any) => `${it.item?.name || 'พัสดุ'} (${it.quantity || 1} ${it.item?.unit || 'ชิ้น'})`);
    const summary = itemsList.length > 0 ? itemsList.join(', ') : 'ครุภัณฑ์ตามรายการ';
    const fullSummary = b.requisitionRequest
      ? `${summary} + วัสดุ ${(b.requisitionRequest.items || []).length} รายการ`
      : summary;

    const dateNeededDate = `ยืม ${new Date(borrowDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}`;
    const dateNeededTime = b.expectedReturnDate
      ? `คืน ${new Date(b.expectedReturnDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}`
      : undefined;

    return {
      id: b.id,
      type: 'BORROW',
      requestNumber: reqNum,
      createdAt: b.createdAt,
      dateNeeded: borrowDate,
      dateNeededDisplay: `${dateNeededDate}${dateNeededTime ? ` (${dateNeededTime})` : ''}`,
      dateNeededDate,
      dateNeededTime,
      user: b.user,
      course: b.course,
      purpose: b.purpose || 'ยืมเพื่อการเรียนการสอน',
      itemsSummary: fullSummary,
      status: b.status,
      canApprove: Boolean(canApproveBorrow),
      instructorAcknowledged: b.instructorAcknowledged,
      advisorName: b.advisorName || b.course?.instructorName,
      badge: getItemTimeBadge(b.createdAt, borrowDate),
      raw: b,
    };
  };

  const mapRequisitionToUnified = (r: any): UnifiedApprovalItem => {
    const dateNeeded = r.dateNeeded || r.createdAt;
    const itemsList = (r.items || []).map((it: any) => `${it.item?.name || 'วัสดุ'} (${it.quantityRequested || 1} ${it.requestedUnit || (it.isSubUnit ? it.item?.usageUnit : it.item?.unit) || it.item?.unit || 'ชิ้น'})`);
    const summary = itemsList.length > 0 ? itemsList.join(', ') : 'วัสดุตามรายการ';
    const dateNeededDate = new Date(dateNeeded).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

    return {
      id: r.id,
      type: 'REQUISITION',
      requestNumber: r.requestNumber,
      createdAt: r.createdAt,
      dateNeeded: dateNeeded,
      dateNeededDisplay: dateNeededDate,
      dateNeededDate,
      user: r.user,
      course: r.course,
      purpose: r.purpose || 'เบิกวัสดุสิ้นเปลือง',
      itemsSummary: summary,
      status: r.status,
      canApprove: Boolean(canApproveReq),
      instructorAcknowledged: r.instructorAcknowledged,
      advisorName: r.advisorName || r.course?.instructorName,
      badge: getItemTimeBadge(r.createdAt, dateNeeded),
      raw: r,
    };
  };

  const mapPracticeToUnified = (p: any): UnifiedApprovalItem => {
    const dateNeeded = p.slot?.date ? `${p.slot.date}T${p.slot.startTime || '08:00'}:00` : p.createdAt;
    const dateNeededDate = p.slot?.date
      ? new Date(p.slot.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
      : '-';
    const dateNeededTime = p.slot?.startTime ? `${p.slot.startTime} - ${p.slot.endTime} น.` : undefined;
    const roomCode = p.slot?.room?.code || p.slot?.room?.name;
    const summaryParts = [roomCode, p.practiceKit?.name, p.additionalEquipment].filter(Boolean);
    const summary = summaryParts.length > 0 ? summaryParts.join(' | ') : 'ขอเข้าฝึกปฏิบัติ';

    return {
      id: p.id,
      type: 'PRACTICE',
      requestNumber: p.bookingNumber,
      createdAt: p.createdAt,
      dateNeeded: dateNeeded,
      dateNeededDisplay: `${dateNeededDate}${dateNeededTime ? ` (${dateNeededTime})` : ''}`,
      dateNeededDate,
      dateNeededTime,
      user: p.user,
      course: p.course,
      purpose: p.skillTopic || 'ฝึกปฏิบัติด้วยตนเอง',
      itemsSummary: summary,
      status: p.status,
      canApprove: Boolean(canApprovePractice),
      instructorAcknowledged: true,
      advisorName: p.advisorName || p.instructor,
      badge: getItemTimeBadge(p.createdAt, dateNeeded),
      raw: p,
    };
  };

  const mapRoomToUnified = (rm: any): UnifiedApprovalItem => {
    const cleanDate = typeof rm.bookingDate === 'string' ? rm.bookingDate.split('T')[0] : new Date(rm.bookingDate).toISOString().split('T')[0];
    const dateNeeded = rm.bookingDate ? `${cleanDate}T${rm.startTime || '08:00'}:00` : rm.createdAt;
    const dateNeededDate = rm.bookingDate
      ? new Date(rm.bookingDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
      : '-';
    const dateNeededTime = rm.startTime ? `${rm.startTime} - ${rm.endTime} น.` : undefined;
    const roomCode = rm.room?.code || rm.room?.name;
    const summaryParts = [
      roomCode,
      rm.attendeesCount ? `${rm.attendeesCount} คน` : null,
      rm.equipmentNeeded,
    ].filter(Boolean);
    const summary = summaryParts.length > 0 ? summaryParts.join(' | ') : 'จองห้องใช้งาน';

    return {
      id: rm.id,
      type: 'ROOM',
      requestNumber: rm.bookingNumber,
      createdAt: rm.createdAt,
      dateNeeded: dateNeeded,
      dateNeededDisplay: `${dateNeededDate}${dateNeededTime ? ` (${dateNeededTime})` : ''}`,
      dateNeededDate,
      dateNeededTime,
      user: rm.user,
      course: rm.course,
      purpose: rm.title ? `${rm.title}${rm.purpose ? ` (${rm.purpose})` : ''}` : (rm.purpose || 'จองห้องปฏิบัติการ'),
      itemsSummary: summary,
      status: rm.status,
      canApprove: Boolean(canApproveRoom),
      instructorAcknowledged: true,
      advisorName: rm.advisorName,
      badge: getItemTimeBadge(rm.createdAt, dateNeeded),
      raw: rm,
    };
  };

  const groupRoomBookingsToUnified = (
    bookingsList: any[],
    targetStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  ): UnifiedApprovalItem[] => {
    const batchMap = new Map<string, any[]>();
    const singles: any[] = [];

    for (const b of bookingsList) {
      if (b.batchGroupId) {
        if (!batchMap.has(b.batchGroupId)) {
          batchMap.set(b.batchGroupId, []);
        }
        batchMap.get(b.batchGroupId)!.push(b);
      } else {
        singles.push(b);
      }
    }

    const result: UnifiedApprovalItem[] = [];

    // 1. Process singles
    for (const b of singles) {
      let matches = false;
      if (targetStatus === 'PENDING') matches = b.status === 'PENDING';
      else if (targetStatus === 'APPROVED') matches = isApproved(b.status);
      else if (targetStatus === 'REJECTED') matches = b.status === 'REJECTED';

      if (matches) {
        result.push(mapRoomToUnified(b));
      }
    }

    // 2. Process batches
    for (const [batchId, items] of batchMap.entries()) {
      const sorted = [...items].sort((a, b) => {
        const dateDiff = new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });

      const pendingSlots = sorted.filter((it) => it.status === 'PENDING');
      const approvedSlots = sorted.filter((it) => isApproved(it.status));
      const rejectedSlots = sorted.filter((it) => it.status === 'REJECTED');

      let matches = false;
      if (targetStatus === 'PENDING') {
        matches = pendingSlots.length > 0;
      } else if (targetStatus === 'APPROVED') {
        matches = approvedSlots.length > 0 && pendingSlots.length === 0;
      } else if (targetStatus === 'REJECTED') {
        matches = rejectedSlots.length > 0 && pendingSlots.length === 0;
      }

      if (!matches) continue;

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

      const firstItem = sorted[0];
      const earliestDate = sorted[0].bookingDate;
      const latestDate = sorted[sorted.length - 1].bookingDate;

      const datesText =
        distinctDates.length === 1
          ? new Date(earliestDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })
          : `${new Date(earliestDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${new Date(latestDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })} (${distinctDates.length} วัน)`;

      const summaryText =
        bType === 'TIMETABLE'
          ? `ตารางเรียน ${sorted.length} คาบ (${distinctRooms.join(', ')})`
          : bType === 'MULTI_ROOM'
          ? `จองพร้อมกัน ${distinctRooms.length} ห้อง (${distinctRooms.join(', ')})`
          : bType === 'MULTI_DAY'
          ? `ต่อเนื่อง ${distinctDates.length} วัน (${distinctRooms.join(', ')})`
          : bType === 'SPECIAL'
          ? `${distinctRooms.length} ห้อง x ${distinctDates.length} วัน (${sorted.length} คาบ)`
          : `${distinctRooms.join(', ')} (${sorted.length} คาบ)`;

      const cleanEarliest =
        typeof earliestDate === 'string'
          ? earliestDate.split('T')[0]
          : new Date(earliestDate).toISOString().split('T')[0];
      const dateNeeded = `${cleanEarliest}T${firstItem.startTime || '08:00'}:00`;

      result.push({
        id: batchId,
        type: 'ROOM',
        requestNumber: batchId,
        createdAt: firstItem.createdAt,
        dateNeeded,
        dateNeededDisplay: datesText,
        dateNeededDate: datesText,
        dateNeededTime: `${firstItem.startTime} - ${firstItem.endTime} น.`,
        user: firstItem.user,
        course: firstItem.course,
        purpose: firstItem.title
          ? `${firstItem.title}${firstItem.purpose ? ` (${firstItem.purpose})` : ''}`
          : (firstItem.purpose || 'จองห้องปฏิบัติการ'),
        itemsSummary: summaryText,
        status: pendingSlots.length > 0 ? 'PENDING' : approvedSlots.length > 0 ? 'APPROVED' : 'REJECTED',
        canApprove: Boolean(canApproveRoom),
        instructorAcknowledged: true,
        advisorName: firstItem.advisorName,
        badge: getItemTimeBadge(firstItem.createdAt, dateNeeded),
        raw: firstItem,
        isBatch: true,
        batchGroupId: batchId,
        batchCount: sorted.length,
        batchItems: sorted,
        batchType: bType,
        batchSummary: {
          roomsCount: distinctRooms.length,
          datesCount: distinctDates.length,
          roomNames: distinctRooms,
          datesText,
          totalSlots: sorted.length,
          pendingSlots: pendingSlots.length,
          approvedSlots: approvedSlots.length,
          rejectedSlots: rejectedSlots.length,
        },
      });
    }

    return result;
  };

  // Filter Borrows by statusFilter
  const filteredBorrows = scopedBorrows.filter((b) => {
    if (statusFilter === 'PENDING') return b.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(b.status);
    if (statusFilter === 'REJECTED') return b.status === 'REJECTED';
    return true;
  });

  // Filter Requisitions by statusFilter (exclude requisitions that are already linked & shown inside a unified BorrowRequest)
  const filteredRequisitions = scopedRequisitions.filter((r) => {
    if (r.borrowRequest) return false;
    if (statusFilter === 'PENDING') return r.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(r.status);
    if (statusFilter === 'REJECTED') return r.status === 'REJECTED';
    return true;
  });

  // Filter Practice Bookings by statusFilter
  const filteredPracticeBookings = scopedPracticeBookings.filter((p) => {
    if (statusFilter === 'PENDING') return p.status === 'PENDING';
    if (statusFilter === 'APPROVED') return isApproved(p.status);
    if (statusFilter === 'REJECTED') return p.status === 'REJECTED';
    return true;
  });

  // Group and Filter Room Bookings
  const roomPendingUnified = groupRoomBookingsToUnified(scopedRoomBookings, 'PENDING');
  const roomApprovedUnified = groupRoomBookingsToUnified(scopedRoomBookings, 'APPROVED');
  const roomRejectedUnified = groupRoomBookingsToUnified(scopedRoomBookings, 'REJECTED');

  const filteredRoomUnified =
    statusFilter === 'PENDING'
      ? roomPendingUnified
      : statusFilter === 'APPROVED'
      ? roomApprovedUnified
      : roomRejectedUnified;

  // Total counts for main status tabs (unified requests counted once)
  const pendingCount =
    scopedBorrows.filter((b) => b.status === 'PENDING').length +
    scopedRequisitions.filter((r) => !r.borrowRequest && r.status === 'PENDING').length +
    scopedPracticeBookings.filter((p) => p.status === 'PENDING').length +
    roomPendingUnified.length;

  const approvedCount =
    scopedBorrows.filter((b) => isApproved(b.status)).length +
    scopedRequisitions.filter((r) => !r.borrowRequest && isApproved(r.status)).length +
    scopedPracticeBookings.filter((p) => isApproved(p.status)).length +
    roomApprovedUnified.length;

  const rejectedCount =
    scopedBorrows.filter((b) => b.status === 'REJECTED').length +
    scopedRequisitions.filter((r) => !r.borrowRequest && r.status === 'REJECTED').length +
    scopedPracticeBookings.filter((p) => p.status === 'REJECTED').length +
    roomRejectedUnified.length;

  const currentTabTotal =
    activeTab === 'ALL'
      ? filteredBorrows.length + filteredRequisitions.length + filteredPracticeBookings.length + filteredRoomUnified.length
      : activeTab === 'BORROW'
      ? filteredBorrows.length
      : activeTab === 'REQUISITION'
      ? filteredRequisitions.length
      : activeTab === 'PRACTICE'
      ? filteredPracticeBookings.length
      : filteredRoomUnified.length;

  const matchesSearch = (item: UnifiedApprovalItem, query: string) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    const userName = formatUserName(item.user).toLowerCase();
    const studentId = (item.user?.studentId || '').toLowerCase();
    const reqNum = (item.requestNumber || '').toLowerCase();
    const batchId = (item.batchGroupId || '').toLowerCase();
    const roomNames = (item.batchSummary?.roomNames || []).join(' ').toLowerCase();
    const purpose = (item.purpose || '').toLowerCase();
    const items = (item.itemsSummary || '').toLowerCase();
    const courseCode = ((item.course?.code || item.course?.courseCode) || '').toLowerCase();
    const courseName = ((item.course?.name || item.course?.courseName) || '').toLowerCase();
    const advisor = (item.advisorName || '').toLowerCase();

    return (
      reqNum.includes(q) ||
      batchId.includes(q) ||
      roomNames.includes(q) ||
      userName.includes(q) ||
      studentId.includes(q) ||
      purpose.includes(q) ||
      items.includes(q) ||
      courseCode.includes(q) ||
      courseName.includes(q) ||
      advisor.includes(q)
    );
  };

  const sortUnifiedItems = (items: UnifiedApprovalItem[], sort: typeof sortOption) => {
    return [...items].sort((a, b) => {
      if (sort === 'CREATED_ASC') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sort === 'CREATED_DESC') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'DATE_NEEDED_ASC') {
        return new Date(a.dateNeeded).getTime() - new Date(b.dateNeeded).getTime();
      }
      return 0;
    });
  };

  const baseUnifiedItems: UnifiedApprovalItem[] = [];
  if (activeTab === 'ALL' || activeTab === 'BORROW') {
    baseUnifiedItems.push(...filteredBorrows.map(mapBorrowToUnified));
  }
  if (activeTab === 'ALL' || activeTab === 'REQUISITION') {
    baseUnifiedItems.push(...filteredRequisitions.map(mapRequisitionToUnified));
  }
  if (activeTab === 'ALL' || activeTab === 'PRACTICE') {
    baseUnifiedItems.push(...filteredPracticeBookings.map(mapPracticeToUnified));
  }
  if (activeTab === 'ALL' || activeTab === 'ROOM') {
    baseUnifiedItems.push(...filteredRoomUnified);
  }

  // Filter with Search query
  const searchedItems = baseUnifiedItems.filter((item) => matchesSearch(item, searchQuery));

  // Count items for urgency chips from searched set
  const countAll = searchedItems.length;
  const countShortNotice = searchedItems.filter((it) => it.badge.type === 'SHORT_NOTICE').length;
  const countPastDate = searchedItems.filter((it) => it.badge.type === 'PAST_DATE').length;
  const countRegular = searchedItems.filter((it) => it.badge.type === 'REGULAR').length;

  // Filter with Urgency Chip
  const chipFilteredItems =
    urgencyChip === 'ALL'
      ? searchedItems
      : searchedItems.filter((it) => it.badge.type === urgencyChip);

  // Apply sorting
  const displayUnifiedItems = sortUnifiedItems(chipFilteredItems, sortOption);

  const handleBatchApprove = async () => {
    if (selectedItemIds.size === 0) return;
    const itemsToApprove = displayUnifiedItems.filter(
      (item) => selectedItemIds.has(item.id) && item.canApprove && item.status === 'PENDING'
    );

    if (itemsToApprove.length === 0) {
      alert('ไม่มีรายการที่ท่านมีสิทธิ์อนุมัติในกลุ่มที่เลือก');
      return;
    }

    if (!window.confirm(`ยืนยันการอนุมัติคำขอที่เลือกทั้งหมด ${itemsToApprove.length} รายการใช่หรือไม่?`)) {
      return;
    }

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToApprove) {
      try {
        if (item.type === 'ROOM' && item.isBatch && item.batchGroupId) {
          const res = await fetch('/api/room-bookings/batch-approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchGroupId: item.batchGroupId,
              action: 'APPROVE',
              userId: currentUser?.id,
            }),
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
          continue;
        }

        const endpoint =
          item.type === 'BORROW'
            ? `/api/borrow/${item.id}`
            : item.type === 'REQUISITION'
            ? `/api/requisitions/${item.id}`
            : item.type === 'ROOM'
            ? `/api/room-bookings/${item.id}`
            : `/api/practice/bookings/${item.id}`;

        const itemKnownUpdatedAt = item.raw?.updatedAt;
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'APPROVE',
            userId: currentUser?.id,
            lastKnownUpdatedAt: itemKnownUpdatedAt,
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setBatchProcessing(false);
    setSelectedItemIds(new Set());
    await fetchData();
    alert(`ดำเนินการอนุมัติสำเร็จ ${successCount} รายการ${failCount > 0 ? ` (ไม่สำเร็จ ${failCount} รายการ)` : ''}`);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const eligibleIds = displayUnifiedItems
      .filter((item) => item.canApprove && item.status === 'PENDING')
      .map((item) => item.id);

    const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedItemIds.has(id));
    if (allSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(eligibleIds));
    }
  };

  const toggleExpandItem = (id: string) => {
    setExpandedItemIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderExpandedDetails = (item: UnifiedApprovalItem) => {
    const raw = item.raw;
    if (item.type === 'BORROW') {
      return (
        <div className="space-y-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">วัตถุประสงค์:</span>
              <span className="text-slate-900 dark:text-slate-100">{raw.purpose || '-'}</span>
              {raw.useTarget === 'HUMAN' ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  🚨 ใช้กับคนจริง
                </span>
              ) : (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  🧪 ฝึกกับหุ่นจำลอง
                </span>
              )}
            </div>
            {raw.advisorName && (
              <div className="text-[11px] text-slate-500">
                อาจารย์ผู้ดูแล: <strong className="text-slate-700 dark:text-slate-300">{formatTeacherName(raw.advisorName)}</strong>
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-teal-600" />
              <span>รายการครุภัณฑ์ที่ขอยืม ({(raw.items || []).length} รายการ):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(raw.items || []).map((it: any) => (
                <div key={it.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs font-semibold">
                  <span>• {it.item?.name} ({it.quantity} {it.item?.unit || 'ชิ้น'})</span>
                  {it.asset && (
                    <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                      {it.asset.assetCode}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {raw.requisitionRequest && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>รายการวัสดุสิ้นเปลืองที่ขอเบิกควบคู่ ({(raw.requisitionRequest.items || []).length} รายการ - ประมาณการ ฿{raw.requisitionRequest.totalCost?.toFixed(2)} บาท):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(raw.requisitionRequest.items || []).map((it: any) => (
                  <div key={it.id} className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs font-semibold">
                    <span>• {it.item?.name}</span>
                    <span className="text-indigo-900 dark:text-indigo-300">{it.quantityRequested} {it.requestedUnit || (it.isSubUnit ? it.item?.usageUnit : it.item?.unit) || it.item?.unit || 'ชิ้น'} (~฿{it.totalCost?.toFixed(2)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'REQUISITION') {
      return (
        <div className="space-y-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">วัตถุประสงค์:</span>
              <span className="text-slate-900 dark:text-slate-100">{raw.purpose || '-'}</span>
            </div>
            <div className="font-black text-emerald-700 dark:text-emerald-400">
              ประมาณการต้นทุนรวม: ฿{(raw.totalCost || 0).toFixed(2)} บาท
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-teal-600" />
              <span>รายการวัสดุที่ขอเบิก ({(raw.items || []).length} รายการ):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(raw.items || []).map((it: any) => (
                <div key={it.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs font-semibold">
                  <span>• {it.item?.name}</span>
                  <span className="text-slate-900 dark:text-slate-100">{it.quantityRequested} {it.requestedUnit || (it.isSubUnit ? it.item?.usageUnit : it.item?.unit) || it.item?.unit} (~฿{it.totalCost?.toFixed(2)})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (item.type === 'PRACTICE') {
      return (
        <div className="space-y-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="font-bold text-slate-500">หัวข้อหัตถการ: </span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">{raw.skillTopic}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500">ห้องแล็บ: </span>
              <span className="text-teal-700 dark:text-teal-400 font-semibold">{raw.slot?.room?.name || 'ห้องปฏิบัติการ'}</span>
            </div>
            {raw.objectives && (
              <div className="sm:col-span-2">
                <span className="font-bold text-slate-500">วัตถุประสงค์: </span>
                <span className="text-slate-700 dark:text-slate-300">{raw.objectives}</span>
              </div>
            )}
            {raw.practiceKit && (
              <div>
                <span className="font-bold text-slate-500">ชุดฝึก: </span>
                <span className="text-amber-700 dark:text-amber-400 font-semibold">{raw.practiceKit.name}</span>
              </div>
            )}
            {raw.additionalEquipment && (
              <div>
                <span className="font-bold text-slate-500">อุปกรณ์ขอเพิ่ม: </span>
                <span className="text-amber-700 dark:text-amber-400 font-semibold">{raw.additionalEquipment}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (item.type === 'ROOM') {
      if (item.isBatch && item.batchItems) {
        return (
          <div className="space-y-3.5 text-xs bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700 dark:text-slate-300">รหัสชุดคำขอ:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">{item.batchGroupId}</span>
                <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  รวม {item.batchCount} สล็อต ({item.batchSummary?.roomsCount} ห้อง, {item.batchSummary?.datesCount} วัน)
                </span>
              </div>
              {item.advisorName && (
                <div className="text-[11px] text-slate-500">
                  อาจารย์ผู้รับผิดชอบ: <strong className="text-slate-700 dark:text-slate-300">{formatTeacherName(item.advisorName)}</strong>
                </div>
              )}
            </div>

            {/* Sub-slots Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3 whitespace-nowrap">วันที่ใช้งาน</th>
                    <th className="py-2 px-3 whitespace-nowrap">ห้องปฏิบัติการ</th>
                    <th className="py-2 px-3 whitespace-nowrap">ช่วงเวลา</th>
                    <th className="py-2 px-3 whitespace-nowrap">สถานะ</th>
                    {statusFilter === 'PENDING' && canApproveRoom && (
                      <th className="py-2 px-3 text-right whitespace-nowrap">พิจารณาเฉพาะสล็อต</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  {item.batchItems.map((slot: any, idx: number) => {
                    const slotPending = slot.status === 'PENDING';
                    const slotApproved = isApproved(slot.status);
                    const slotDate = new Date(slot.bookingDate);
                    return (
                      <tr key={slot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {slotDate.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2 px-3 font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                          {slot.room?.name || slot.roomId} <span className="text-[10px] text-slate-400 font-normal">({slot.room?.code})</span>
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {slot.startTime} - {slot.endTime} น.
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {slotPending ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              รออนุมัติ
                            </span>
                          ) : slotApproved ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              อนุมัติแล้ว
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              ไม่อนุมัติ
                            </span>
                          )}
                        </td>
                        {statusFilter === 'PENDING' && canApproveRoom && (
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            {slotPending ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => setRejectItem({ id: slot.id, type: 'ROOM' })}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                                  title="ไม่อนุมัติเฉพาะสล็อตนี้"
                                >
                                  ไม่อนุมัติ
                                </button>
                                <button
                                  type="button"
                                  disabled={submitting || approvingId === slot.id}
                                  onClick={() => handleApprove(slot.id, 'ROOM')}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-teal-600 hover:bg-teal-500 transition cursor-pointer"
                                  title="อนุมัติเฉพาะสล็อตนี้"
                                >
                                  {approvingId === slot.id ? '...' : 'อนุมัติ'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Batch Action inside expanded drawer */}
            {statusFilter === 'PENDING' && canApproveRoom && (
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ต้องการดำเนินการพร้อมกันทั้งชุด {item.batchSummary?.pendingSlots || item.batchCount} รายการ:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setRejectItem({ id: item.id, type: 'ROOM', isBatch: true, batchGroupId: item.batchGroupId, batchCount: item.batchCount })}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                  >
                    ไม่อนุมัติทั้งชุด
                  </button>
                  <button
                    type="button"
                    disabled={submitting || approvingId === item.batchGroupId}
                    onClick={() => handleBatchRoomApprove(item.batchGroupId!, item.batchCount || 1)}
                    className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-white bg-teal-600 hover:bg-teal-500 shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    {approvingId === item.batchGroupId ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 font-black" />
                    )}
                    <span>อนุมัติทั้งชุด ({item.batchSummary?.pendingSlots || item.batchCount} รายการ)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="space-y-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="font-bold text-slate-500">ห้อง: </span>
              <span className="text-indigo-700 dark:text-indigo-400 font-bold">{raw.room?.name || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500">ผู้เข้าร่วม: </span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">{raw.attendeesCount} คน</span>
            </div>
            {raw.equipmentNeeded && (
              <div className="sm:col-span-2">
                <span className="font-bold text-amber-700 dark:text-amber-400">อุปกรณ์ที่ต้องการ: </span>
                <span className="text-slate-800 dark:text-slate-200">{raw.equipmentNeeded}</span>
              </div>
            )}
            {raw.contactPhone && (
              <div>
                <span className="font-bold text-slate-500">เบอร์ติดต่อ: </span>
                <span className="text-slate-800 dark:text-slate-200">{raw.contactPhone}</span>
              </div>
            )}
            {raw.note && (
              <div>
                <span className="font-bold text-slate-500">หมายเหตุ: </span>
                <span className="text-slate-800 dark:text-slate-200">{raw.note}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderCompactTable = () => {
    const eligibleBatchIds = displayUnifiedItems
      .filter((item) => item.canApprove && item.status === 'PENDING')
      .map((item) => item.id);
    const allBatchSelected = eligibleBatchIds.length > 0 && eligibleBatchIds.every((id) => selectedItemIds.has(id));

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                {statusFilter === 'PENDING' && canApprove && (
                  <th className="py-2.5 px-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={allBatchSelected}
                      onChange={toggleSelectAll}
                      disabled={eligibleBatchIds.length === 0}
                      title="เลือกทั้งหมดที่มีสิทธิ์อนุมัติ"
                      className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-40"
                    />
                  </th>
                )}
                <th className="py-2.5 px-2.5 whitespace-nowrap">ลำดับคิว / วันที่ยื่น</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">เลขคำขอ & ประเภท</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">ผู้ยื่น</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">วันที่ใช้</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">รายวิชา & วัตถุประสงค์</th>
                <th className="py-2.5 px-2.5">รายการสิ่งของ / ห้อง</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayUnifiedItems.map((item) => {
                const isSelected = selectedItemIds.has(item.id);
                const isExpanded = Boolean(expandedItemIds[item.id]);
                const raw = item.raw;

                return (
                  <React.Fragment key={`${item.type}-${item.id}`}>
                    <tr
                      id={`approval-row-${item.id}`}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                        item.id === highlightId ? 'bg-teal-50/40 dark:bg-teal-950/30' : ''
                      } ${isSelected ? 'bg-teal-50/60 dark:bg-teal-950/40' : ''}`}
                    >
                      {statusFilter === 'PENDING' && canApprove && (
                        <td className="py-2 px-2 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item.id)}
                            disabled={!item.canApprove}
                            className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-30"
                          />
                        </td>
                      )}
                      <td className="py-2 px-2.5 align-middle whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badge.className}`}>
                            {item.badge.text}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} {new Date(item.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 align-middle whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {item.requestNumber}
                          </div>
                          <div>
                            {item.type === 'BORROW' ? (
                              raw.requisitionRequest ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-xs inline-flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-300" /> รวม
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  ยืมครุภัณฑ์
                                </span>
                              )
                            ) : item.type === 'REQUISITION' ? (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                เบิกวัสดุ
                              </span>
                            ) : item.type === 'PRACTICE' ? (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5 text-indigo-600" /> ฝึกปฏิบัติ
                              </span>
                            ) : item.isBatch ? (
                              item.batchType === 'TIMETABLE' ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-0.5">
                                  <BookOpen className="w-2.5 h-2.5 text-emerald-600" /> ตารางเรียน ({item.batchCount})
                                </span>
                              ) : item.batchType === 'MULTI_ROOM' ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 inline-flex items-center gap-0.5">
                                  <Building2 className="w-2.5 h-2.5 text-indigo-600" /> หลายห้อง ({item.batchSummary?.roomsCount})
                                </span>
                              ) : item.batchType === 'MULTI_DAY' ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-0.5">
                                  <Calendar className="w-2.5 h-2.5 text-amber-600" /> ต่อเนื่อง ({item.batchSummary?.datesCount} วัน)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 inline-flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" /> พิเศษ ({item.batchCount})
                                </span>
                              )
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center gap-0.5">
                                <Building2 className="w-2.5 h-2.5 text-blue-600" /> จองห้อง
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 align-middle whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px]">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{formatUserName(item.user)}</span>
                          </div>
                          {item.user?.studentId && (
                            <span className="text-[10px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.2 rounded font-mono border border-teal-200 dark:border-teal-800 inline-block">
                              {item.user.studentId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 align-middle whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-teal-600 shrink-0" />
                            <span>{item.dateNeededDate}</span>
                          </div>
                          {item.dateNeededTime && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pl-4 font-normal">
                              <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span>{item.dateNeededTime}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 align-middle max-w-[160px]">
                        <div className="space-y-0.5">
                          {(item.course?.code || item.course?.courseCode) && (
                            <span className="font-mono text-[9px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1 py-0.2 rounded border border-teal-200 dark:border-teal-800 inline-block">
                              {item.course?.code || item.course?.courseCode}
                            </span>
                          )}
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate max-w-[160px]" title={item.purpose}>
                            {item.purpose || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 align-middle max-w-[180px]">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]" title={item.itemsSummary}>
                            {item.itemsSummary}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleExpandItem(item.id)}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                            title="ดูรายละเอียดคำขอ"
                          >
                            <span>{isExpanded ? 'ย่อ' : 'รายละเอียด'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 align-middle text-right whitespace-nowrap">
                        {statusFilter === 'PENDING' ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            {(item.type === 'BORROW' || item.type === 'REQUISITION') && !item.instructorAcknowledged && (isTeacher || canApprove) && (
                              <button
                                type="button"
                                disabled={acknowledgingId === item.id || submitting}
                                onClick={() => handleAcknowledge(item.id, item.type as any)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer flex items-center gap-1"
                                title="อาจารย์ผู้สอนกดรับทราบคำขอ"
                              >
                                {acknowledgingId === item.id ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <GraduationCap className="w-2.5 h-2.5 text-indigo-600" />}
                                <span>รับทราบ</span>
                              </button>
                            )}

                            {item.canApprove ? (
                              <>
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => {
                                    if (item.isBatch && item.batchGroupId) {
                                      setRejectItem({
                                        id: item.id,
                                        type: item.type,
                                        isBatch: true,
                                        batchGroupId: item.batchGroupId,
                                        batchCount: item.batchCount,
                                      });
                                    } else {
                                      setRejectItem({ id: item.id, type: item.type });
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                                >
                                  {item.isBatch ? 'ปฏิเสธทั้งชุด' : 'ไม่อนุมัติ'}
                                </button>
                                <button
                                  type="button"
                                  disabled={submitting || approvingId === (item.batchGroupId || item.id)}
                                  onClick={() => {
                                    if (item.isBatch && item.batchGroupId) {
                                      handleBatchRoomApprove(item.batchGroupId, item.batchCount || 1);
                                    } else {
                                      handleApprove(item.id, item.type);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-xs transition cursor-pointer flex items-center gap-1"
                                >
                                  {approvingId === (item.batchGroupId || item.id) ? (
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    <Check className="w-2.5 h-2.5" />
                                  )}
                                  <span>{item.isBatch ? `อนุมัติทั้งชุด (${item.batchCount})` : 'อนุมัติ'}</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                ไม่มีสิทธิ์อนุมัติ
                              </span>
                            )}
                          </div>
                        ) : statusFilter === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> อนุมัติแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-2.5 h-2.5 text-rose-600" /> ไม่อนุมัติ
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Accordion Details */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 dark:bg-slate-950/40">
                        <td colSpan={statusFilter === 'PENDING' && canApprove ? 8 : 7} className="p-4 border-b border-slate-200 dark:border-slate-800">
                          {renderExpandedDetails(item)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-teal-600" />
            ศูนย์พิจารณาและประวัติการอนุมัติคำขอ (Approval Center)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            พิจารณาอนุมัติคำขอยืมครุภัณฑ์และการเบิกจ่ายวัสดุสิ้นเปลือง พร้อมตรวจสอบประวัติการอนุมัติย้อนหลัง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lastUpdated && (
            <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
              อัปเดตล่าสุด: {lastUpdated} น.
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60 transition active:scale-95"
            title="กดเพื่อดึงข้อมูลคำขอและการอนุมัติล่าสุดทันที"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}</span>
          </button>

          {pendingCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5 animate-pulse">
              <Clock className="w-4 h-4 text-amber-600" /> มีคำขอรอการพิจารณา {pendingCount} รายการ
            </span>
          )}
        </div>
      </div>

      {/* Scope Selector: [ เฉพาะคำขอที่ฉันรับผิดชอบ | ทั้งหมดในระบบ ] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-50/70 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 p-3.5 rounded-2xl border border-teal-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>ขอบเขตรายการที่แสดง:</span>
              <span className="text-teal-700 dark:text-teal-400 font-extrabold">
                {viewScope === 'RELEVANT'
                  ? canApprove
                    ? 'เฉพาะคำขอในขอบเขตหน้าที่ความรับผิดชอบ / รายวิชาที่ดูแล'
                    : 'เฉพาะคำขอที่เกี่ยวข้องกับท่าน (ตามรายวิชา/อาจารย์ที่ปรึกษา)'
                  : 'คำขอทั้งหมดในระบบ (ทุกขอบเขต/ทุกรายวิชา)'}
              </span>
            </div>
            {currentUser && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                <span>
                  {currentUser.role === 'ADMIN'
                    ? 'ผู้ดูแลระบบ (Admin):'
                    : currentUser.role === 'APPROVER'
                    ? 'ผู้อนุมัติ:'
                    : currentUser.role === 'TEACHER'
                    ? 'อาจารย์ผู้รับผิดชอบ:'
                    : currentUser.role === 'OFFICER'
                    ? 'เจ้าหน้าที่ห้องปฏิบัติการ:'
                    : 'ผู้ใช้งาน:'}
                </span>
                <strong className="text-slate-700 dark:text-slate-300">
                  {currentUser.role === 'TEACHER' || currentUser.role === 'APPROVER'
                    ? formatTeacherName(currentUser)
                    : formatUserName(currentUser)}
                </strong>
                {currentUser.department && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    ({currentUser.department})
                  </span>
                )}
                {canApprove && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100/80 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-bold text-[10px] border border-teal-200 dark:border-teal-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{formatApprovalScopeBadge(currentUser.approvalScopes)}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto overflow-x-auto no-scrollbar border border-transparent dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewScope('RELEVANT')}
            className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              viewScope === 'RELEVANT'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>{canApprove ? 'เฉพาะในขอบเขตของฉัน' : 'เฉพาะที่เกี่ยวข้องกับฉัน'} ({totalRelevantItems})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewScope('ALL')}
            className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              viewScope === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>ทั้งหมดในระบบ ({totalSystemItems})</span>
          </button>
        </div>
      </div>

      {/* Main Status Tabs: [ รอพิจารณา | อนุมัติแล้ว | ไม่อนุมัติ ] */}
      <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setStatusFilter('PENDING');
            setActiveTab('ALL');
          }}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>รอพิจารณาอนุมัติ ({pendingCount})</span>
        </button>

        <button
          onClick={() => {
            setStatusFilter('APPROVED');
            setActiveTab('ALL');
          }}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>ประวัติที่อนุมัติแล้ว ({approvedCount})</span>
        </button>

        <button
          onClick={() => {
            setStatusFilter('REJECTED');
            setActiveTab('ALL');
          }}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <XCircle className="w-4 h-4 shrink-0" />
          <span>ประวัติไม่อนุมัติ ({rejectedCount})</span>
        </button>
      </div>

      {/* Sub-tabs: Filter by Request Type */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full sm:w-fit max-w-full overflow-x-auto no-scrollbar border border-transparent dark:border-slate-700">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'ALL'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          ทั้งหมด ({currentTabTotal})
        </button>
        <button
          onClick={() => setActiveTab('BORROW')}
          className={`px-3.5 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'BORROW'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          คำขอเบิก-ยืมพัสดุ ({filteredBorrows.length})
        </button>
        <button
          onClick={() => setActiveTab('REQUISITION')}
          className={`px-3.5 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'REQUISITION'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          คำขอเบิกเฉพาะวัสดุ ({filteredRequisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('PRACTICE')}
          className={`px-3.5 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'PRACTICE'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>ขอฝึกปฏิบัติด้วยตนเอง ({filteredPracticeBookings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('ROOM')}
          className={`px-3.5 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'ROOM'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>จองห้องใช้งาน ({filteredRoomUnified.length})</span>
        </button>
      </div>

      {/* Control Bar: Search, Sort, Layout Switch, Urgency Chips */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาด่วนตามชื่อนิสิต, รหัสนิสิต, เลขที่คำขอ, ชื่อพัสดุ/ห้อง, หรือรหัสวิชา..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
                title="ล้างข้อความค้นหา"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="text-slate-500 font-medium hidden sm:inline">จัดเรียง:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-transparent text-slate-700 dark:text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="CREATED_ASC" className="dark:bg-slate-900">เรียงตามคำขอ (มาก่อนได้ก่อน - FIFO)</option>
                <option value="DATE_NEEDED_ASC" className="dark:bg-slate-900">เรียงตามวันที่ต้องการใช้ (ใกล้สุดก่อน)</option>
                <option value="CREATED_DESC" className="dark:bg-slate-900">เรียงตามคำขอล่าสุด (ใหม่สุดก่อน)</option>
              </select>
            </div>

            {/* Layout Toggle: [ ตารางกระชับ | การ์ดเต็ม ] */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-transparent dark:border-slate-700">
              <button
                type="button"
                onClick={() => setListLayout('COMPACT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  listLayout === 'COMPACT'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="สลับเป็นมุมมองตารางกระชับ"
              >
                <List className="w-3.5 h-3.5" />
                <span>ตารางกระชับ</span>
              </button>
              <button
                type="button"
                onClick={() => setListLayout('CARDS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  listLayout === 'CARDS'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="สลับเป็นมุมมองการ์ดเต็ม"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>การ์ดเต็ม</span>
              </button>
            </div>
          </div>
        </div>

        {/* Urgency Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
            จำแนกความเร่งด่วน:
          </span>
          <button
            type="button"
            onClick={() => setUrgencyChip('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              urgencyChip === 'ALL'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">{countAll}</span>
          </button>

          <button
            type="button"
            onClick={() => setUrgencyChip('SHORT_NOTICE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              urgencyChip === 'SHORT_NOTICE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-850 hover:bg-amber-100'
            }`}
          >
            <span>⚡ ยื่นขอก่อนเวลาใช้งาน &lt;24 ชม.</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20 font-bold">{countShortNotice}</span>
          </button>

          <button
            type="button"
            onClick={() => setUrgencyChip('PAST_DATE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              urgencyChip === 'PAST_DATE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-850 hover:bg-rose-100'
            }`}
          >
            <span>⚠️ วันที่ขอใช้ผ่านไปแล้ว</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20 font-bold">{countPastDate}</span>
          </button>

          <button
            type="button"
            onClick={() => setUrgencyChip('REGULAR')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              urgencyChip === 'REGULAR'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>📋 ยื่นตามเกณฑ์ปกติ</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20 font-bold">{countRegular}</span>
          </button>
        </div>
      </div>

      {/* Floating Sticky Batch Action Bar */}
      {statusFilter === 'PENDING' && canApprove && selectedItemIds.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] sm:w-auto max-w-lg bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-4 sm:px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between sm:justify-center gap-3 sm:gap-4 transition-all animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 shrink-0">
            <CheckSquare className="w-5 h-5 text-teal-400 shrink-0" />
            <span className="text-xs font-bold">
              เลือกแล้ว <span className="text-teal-300 font-extrabold">{selectedItemIds.size}</span> รายการ
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleBatchApprove}
              disabled={batchProcessing}
              className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold shadow-md shadow-teal-500/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {batchProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังอนุมัติ {selectedItemIds.size} รายการ...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 font-black" />
                  <span>อนุมัติที่เลือก ({selectedItemIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <LoadingSpinner
              message="กำลังโหลดข้อมูลคำขอ..."
              submessage="กำลังดึงข้อมูลคำขอยืมและเบิกจ่ายจาก Supabase"
            />
          </div>
        ) : currentTabTotal === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-10 sm:p-12 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs space-y-3 transition-colors">
            {statusFilter === 'PENDING' ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-1 opacity-85" />
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">ไม่มีคำขอค้างรอการอนุมัติในหมวดนี้</p>
                {viewScope === 'RELEVANT' && totalSystemItems > 0 && (
                  <div className="pt-2 text-slate-500 dark:text-slate-400 text-[11px] max-w-md mx-auto space-y-2">
                    <p>
                      {canApprove
                        ? 'ขณะนี้ไม่มีคำขอที่รอการพิจารณาในขอบเขตหน้าที่ความรับผิดชอบของท่าน'
                        : 'ขณะนี้ไม่มีคำขอที่ระบุชื่อของท่านเป็นอาจารย์ผู้รับทราบหรืออาจารย์ประจำวิชาในสถานะนี้'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setViewScope('ALL')}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/80 font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>สลับไปดูคำขอทั้งหมดในระบบ ({totalSystemItems} รายการ)</span>
                    </button>
                  </div>
                )}
              </>
            ) : statusFilter === 'APPROVED' ? (
              <>
                <CheckSquare className="w-10 h-10 text-teal-500 mx-auto mb-1 opacity-85" />
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">ยังไม่มีประวัติรายการที่อนุมัติในหมวดนี้</p>
                {viewScope === 'RELEVANT' && totalSystemItems > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setViewScope('ALL')}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/80 font-bold transition inline-flex items-center gap-1.5 cursor-pointer text-[11px]"
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>ดูประวัติการอนุมัติทั้งหมดในระบบ</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <XCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">ไม่มีรายการที่ไม่อนุมัติในหมวดนี้</p>
              </>
            )}
          </div>
        ) : displayUnifiedItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-10 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs space-y-3">
            <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">ไม่พบคำขอที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือก</p>
            <p className="text-slate-400 text-xs">
              {searchQuery && `คำค้นหา: "${searchQuery}" `}
              {urgencyChip !== 'ALL' && `| ตัวกรองความเร่งด่วน: ${urgencyChip}`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setUrgencyChip('ALL');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold transition inline-flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <span>ล้างคำค้นหาและตัวกรอง</span>
            </button>
          </div>
        ) : listLayout === 'COMPACT' ? (
          renderCompactTable()
        ) : (
          <div className="space-y-4">
            {displayUnifiedItems.map((item) => {
              if (item.type === 'BORROW') {
                const req = item.raw;
                const badge = item.badge;
                return (
                  <div
                    key={req.id}
                    id={`approval-card-${req.id}`}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 border-l-4 transition-all ${
                      req.id === highlightId ? 'ring-2 ring-teal-500 shadow-xl shadow-teal-500/20' : ''
                    } ${
                      statusFilter === 'PENDING'
                        ? 'border-l-amber-500'
                        : statusFilter === 'APPROVED'
                        ? 'border-l-emerald-500'
                        : 'border-l-rose-500'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        {badge && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${badge.className}`}>
                            {badge.text}
                          </span>
                        )}
                        {req.requisitionRequest ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            คำขอรวม (เบิกวัสดุ + ยืมครุภัณฑ์)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">
                            ยืมครุภัณฑ์
                          </span>
                        )}
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {req.requestNumber}
                        {req.requisitionRequest && ` + ${req.requisitionRequest.requestNumber}`}
                      </span>
                      {getStageLabel(req.status, 'BORROW')}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800">{formatUserName(req.user)}</span>
                        {req.user?.studentId && (
                          <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-mono border border-teal-200">
                            {req.user.studentId}
                          </span>
                        )}
                      </div>
                      {req.course && (
                        <div className="font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          {req.course.code}
                        </div>
                      )}
                      {req.requisitionRequest && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-teal-50 to-indigo-50 text-indigo-800 border border-indigo-200">
                          <Sparkles className="w-3 h-3 text-indigo-600" /> คำขอรวม One-Stop
                        </span>
                      )}
                      {req.instructorAcknowledged ? (() => {
                        const ack = formatAcknowledgeDisplay(req.advisorName || req.course?.instructorName);
                        return (
                          <div className={`flex items-center gap-1 text-[11px] font-bold ${ack.colorClass} ${ack.bgClass} border ${ack.borderClass} px-2.5 py-0.5 rounded-full`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{ack.label} ({ack.name}{req.acknowledgedAt ? ` • ${new Date(req.acknowledgedAt).toLocaleDateString('th-TH')}` : ''})</span>
                          </div>
                        );
                      })() : (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>รออาจารย์รับทราบ ({formatTeacherName(req.advisorName || req.course?.instructorName || 'อาจารย์ผู้สอน')})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                      <span className="text-slate-800 font-medium">{req.purpose}</span>
                      {req.useTarget === 'HUMAN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-sm">
                          🚨 ใช้กับคนจริง
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          🧪 ฝึกกับหุ่นจำลอง
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>ยืม: {new Date(req.borrowDate).toLocaleDateString('th-TH')}</span>
                      <span>•</span>
                      <span>กำหนดคืน: {new Date(req.expectedReturnDate).toLocaleDateString('th-TH')}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                        ครุภัณฑ์ที่ขอ:
                      </div>
                      <div className="space-y-1">
                        {req.items?.map((it: any) => (
                          <div key={it.id} className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                            <span>• {it.item?.name} ({it.quantity} {it.item?.unit})</span>
                            {it.asset && (
                              <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/80">
                                {it.asset.assetCode} ({it.item?.unit || 'ชิ้น'}ที่ {it.asset.sequenceNumber || 1})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Linked Consumables in Unified Request */}
                    {req.requisitionRequest && (
                      <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200">
                        <div className="text-[11px] font-bold text-teal-900 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            วัสดุสิ้นเปลืองที่ขอเบิกพร้อมกัน ({req.requisitionRequest.requestNumber}):
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold">
                            คำขอรวม One-Stop
                          </span>
                        </div>
                        <div className="space-y-1">
                          {req.requisitionRequest.items?.map((rIt: any) => (
                            <div key={rIt.id} className="text-xs font-semibold text-teal-900 flex items-center justify-between">
                              <span>• {rIt.item?.name}</span>
                              <span className="font-bold text-teal-700">{rIt.quantityRequested} {rIt.requestedUnit || (rIt.isSubUnit ? rIt.item?.usageUnit : rIt.item?.unit) || rIt.item?.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions / Status Footer */}
                  {statusFilter === 'PENDING' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div>
                        {!req.instructorAcknowledged ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            คำขอนี้ยังไม่ได้รับการกดรับทราบจากอาจารย์ประจำวิชา
                          </span>
                        ) : (() => {
                          const ack = formatAcknowledgeDisplay(req.advisorName || req.course?.instructorName);
                          return (
                            <span className={`text-[11px] ${ack.colorClass} ${ack.bgClass} border ${ack.borderClass} px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {ack.name} รับทราบเรียบร้อยแล้ว
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {!req.instructorAcknowledged && (isTeacher || canApprove) && (
                          <button
                            disabled={acknowledgingId === req.id || submitting}
                            onClick={() => handleAcknowledge(req.id, 'BORROW')}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 shadow-sm transition cursor-pointer flex items-center gap-1.5"
                            title="อาจารย์ประจำวิชากดรับทราบก่อนส่งต่อการอนุมัติขั้นสุดท้าย"
                          >
                            {acknowledgingId === req.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            <span>{acknowledgingId === req.id ? 'กำลังบันทึกการรับทราบ...' : (isAdmin || isOfficer ? 'รับทราบคำขอ (แอดมิน)' : 'อาจารย์กดรับทราบคำขอ')}</span>
                          </button>
                        )}

                        {isPureTeacher && req.instructorAcknowledged && (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ท่านรับทราบแล้ว (รอผู้อนุมัติ/หัวหน้าภาคปล่อยของ)
                          </span>
                        )}

                        {canApprove && (
                          canApproveBorrow ? (
                            <>
                              <button
                                disabled={submitting}
                                onClick={() => setRejectItem({ id: req.id, type: 'BORROW' })}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer"
                              >
                                ไม่อนุมัติ
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => handleApprove(req.id, 'BORROW')}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                              >
                                {approvingId === req.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>กำลังอนุมัติ...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>
                                      {!req.instructorAcknowledged && isRelevantToTeacher(req, currentUser)
                                        ? req.requisitionRequest
                                          ? 'อนุมัติคำขอรวม (ควบรวมรับทราบ)'
                                          : 'อนุมัติคำขอยืม (ควบรวมรับทราบ)'
                                        : req.requisitionRequest
                                        ? 'อนุมัติคำขอรวม (ยืม+เบิก)'
                                        : 'อนุมัติคำขอยืม'}
                                    </span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>ไม่อยู่ในขอบเขตการอนุมัติของคุณ</span>
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ) : statusFilter === 'APPROVED' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          อนุมัติแล้ว {req.approvedAt ? `(${new Date(req.approvedAt).toLocaleDateString('th-TH')})` : ''}
                        </span>
                        {req.approver && (
                          <span className="text-slate-700 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                            ผู้อนุมัติ: <strong className="text-teal-700 dark:text-teal-400">{formatApproverDisplay(req.approver)}</strong>
                          </span>
                        )}
                        {!req.instructorAcknowledged ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            ⚠️ รออาจารย์ประจำวิชา ({formatTeacherName(req.course?.instructorName || req.advisorName || 'อาจารย์')}) รับทราบ
                          </span>
                        ) : (() => {
                          const ack = formatAcknowledgeDisplay(req.advisorName || req.course?.instructorName);
                          return (
                            <span className={`text-[11px] ${ack.colorClass} ${ack.bgClass} border ${ack.borderClass} px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {ack.name} รับทราบแล้ว
                            </span>
                          );
                        })()}
                      </div>

                      {/* Late acknowledgment button for teacher or admin */}
                      {!req.instructorAcknowledged && (isTeacher || canApprove) && (
                        <button
                          disabled={acknowledgingId === req.id || submitting}
                          onClick={() => handleAcknowledge(req.id, 'BORROW')}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 shadow-sm transition cursor-pointer flex items-center gap-1.5"
                          title="อาจารย์ประจำวิชาสามารถกดรับทราบย้อนหลังได้"
                        >
                          {acknowledgingId === req.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          ) : (
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>{acknowledgingId === req.id ? 'กำลังบันทึก...' : (isAdmin || isOfficer ? 'รับทราบคำขอ (แอดมิน)' : 'อาจารย์กดรับทราบคำขอ')}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ไม่อนุมัติคำขอ
                      </span>
                      {req.rejectionReason && (
                        <span className="text-rose-700 font-medium">
                          เหตุผล: <strong>{req.rejectionReason}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (item.type === 'REQUISITION') {
              const req = item.raw;
              const badge = item.badge;
              return (
                <div
                  key={req.id}
                  id={`approval-card-${req.id}`}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 border-l-4 transition-all ${
                    req.id === highlightId ? 'ring-2 ring-teal-500 shadow-xl shadow-teal-500/20' : ''
                  } ${
                    statusFilter === 'PENDING'
                      ? 'border-l-amber-500'
                      : statusFilter === 'APPROVED'
                      ? 'border-l-emerald-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      {badge && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${badge.className}`}>
                          {badge.text}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
                        เบิกวัสดุสิ้นเปลือง
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {req.requestNumber}
                      </span>
                      {getStageLabel(req.status, 'REQUISITION')}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                        [{req.course?.code}] {req.course?.name}
                      </span>
                      <span className="text-slate-500 font-medium">โดย {formatUserName(req.user)}</span>
                      {req.instructorAcknowledged ? (() => {
                        const ack = formatAcknowledgeDisplay(req.advisorName || req.course?.instructorName);
                        return (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${ack.colorClass} ${ack.bgClass} border ${ack.borderClass} px-2.5 py-0.5 rounded-full`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{ack.label} ({ack.name}{req.acknowledgedAt ? ` • ${new Date(req.acknowledgedAt).toLocaleDateString('th-TH')}` : ''})</span>
                          </span>
                        );
                      })() : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>รออาจารย์รับทราบ ({formatTeacherName(req.advisorName || req.course?.instructorName || 'อาจารย์ผู้รับผิดชอบ')})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                      <span className="text-slate-800 font-medium">{req.purpose}</span>
                      {req.useTarget === 'HUMAN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-sm">
                          🚨 ใช้กับคนจริง (ห้ามของหมดอายุ)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          🧪 ฝึกกับหุ่นจำลอง
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>ต้องการใช้: {new Date(req.dateNeeded).toLocaleDateString('th-TH')}</span>
                      <span className="font-black text-emerald-700 text-sm">
                        ประมาณการต้นทุน: ฿{req.totalCost.toFixed(2)} บาท
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                        รายการวัสดุที่ขอเบิก:
                      </div>
                      <div className="space-y-1">
                        {req.items?.map((it: any) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between text-xs font-semibold text-slate-800"
                          >
                            <span>• {it.item?.name}</span>
                            <span>
                              {it.quantityRequested} {it.requestedUnit || (it.isSubUnit ? it.item?.usageUnit : it.item?.unit) || it.item?.unit} (~฿{it.totalCost.toFixed(2)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions / Status Footer */}
                  {statusFilter === 'PENDING' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div>
                        {!req.instructorAcknowledged ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            คำขอนี้ยังไม่ได้รับการกดรับทราบจากอาจารย์ประจำวิชา
                          </span>
                        ) : (() => {
                          const ack = formatAcknowledgeDisplay(req.advisorName || req.course?.instructorName);
                          return (
                            <span className={`text-[11px] ${ack.colorClass} ${ack.bgClass} border ${ack.borderClass} px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {ack.name} รับทราบเรียบร้อยแล้ว
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {!req.instructorAcknowledged && (isTeacher || canApprove) && (
                          <button
                            disabled={acknowledgingId === req.id || submitting}
                            onClick={() => handleAcknowledge(req.id, 'REQUISITION')}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 shadow-sm transition cursor-pointer flex items-center gap-1.5"
                            title="อาจารย์ประจำวิชากดรับทราบก่อนส่งต่อการอนุมัติขั้นสุดท้าย"
                          >
                            {acknowledgingId === req.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            <span>{acknowledgingId === req.id ? 'กำลังบันทึกการรับทราบ...' : (isAdmin || isOfficer ? 'รับทราบคำขอ (แอดมิน)' : 'อาจารย์กดรับทราบคำขอ')}</span>
                          </button>
                        )}

                        {isPureTeacher && req.instructorAcknowledged && (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ท่านรับทราบแล้ว (รอหัวหน้าภาค/เจ้าหน้าที่แล็บอนุมัติจ่ายของ)
                          </span>
                        )}

                        {canApprove && (
                          canApproveReq ? (
                            <>
                              <button
                                disabled={submitting}
                                onClick={() => setRejectItem({ id: req.id, type: 'REQUISITION' })}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer"
                              >
                                ไม่อนุมัติ
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => handleApprove(req.id, 'REQUISITION')}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                              >
                                {approvingId === req.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>กำลังอนุมัติ...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>
                                      {!req.instructorAcknowledged && isRelevantToTeacher(req, currentUser)
                                        ? 'อนุมัติการเบิกจ่าย (ควบรวมรับทราบ)'
                                        : 'อนุมัติการเบิกจ่าย'}
                                    </span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>ไม่อยู่ในขอบเขตการอนุมัติของคุณ</span>
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ) : statusFilter === 'APPROVED' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          อนุมัติแล้ว {req.approvedAt ? `(${new Date(req.approvedAt).toLocaleDateString('th-TH')})` : ''}
                        </span>
                        {req.approver && (
                          <span className="text-slate-700 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                            ผู้อนุมัติ: <strong className="text-teal-700 dark:text-teal-400">{formatApproverDisplay(req.approver)}</strong>
                          </span>
                        )}
                        {!req.instructorAcknowledged ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            ⚠️ รออาจารย์ประจำวิชา ({formatTeacherName(req.course?.instructorName || req.advisorName || 'อาจารย์')}) รับทราบ
                          </span>
                        ) : (() => {
                          const ack = formatAcknowledgeDisplay(req.advisorName || req.course?.instructorName);
                          return (
                            <span className={`text-[11px] ${ack.colorClass} ${ack.bgClass} border ${ack.borderClass} px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {ack.name} รับทราบแล้ว
                            </span>
                          );
                        })()}
                      </div>

                      {/* Late acknowledgment button for teacher or admin */}
                      {!req.instructorAcknowledged && (isTeacher || canApprove) && (
                        <button
                          disabled={acknowledgingId === req.id || submitting}
                          onClick={() => handleAcknowledge(req.id, 'REQUISITION')}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 shadow-sm transition cursor-pointer flex items-center gap-1.5"
                          title="อาจารย์ประจำวิชาสามารถกดรับทราบย้อนหลังได้"
                        >
                          {acknowledgingId === req.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          ) : (
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>{acknowledgingId === req.id ? 'กำลังบันทึก...' : (isAdmin || isOfficer ? 'รับทราบคำขอ (แอดมิน)' : 'อาจารย์กดรับทราบคำขอ')}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ไม่อนุมัติคำขอ
                      </span>
                      {req.rejectionReason && (
                        <span className="text-rose-700 font-medium">
                          เหตุผล: <strong>{req.rejectionReason}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (item.type === 'PRACTICE') {
              const b = item.raw;
              const badge = item.badge;
              return (
                <div
                  key={b.id}
                  id={`approval-card-${b.id}`}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 border-l-4 transition-all ${
                    b.id === highlightId ? 'ring-2 ring-teal-500 shadow-xl shadow-teal-500/20' : ''
                  } ${
                    statusFilter === 'PENDING'
                      ? 'border-l-amber-500'
                      : statusFilter === 'APPROVED'
                      ? 'border-l-teal-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      {badge && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${badge.className}`}>
                          {badge.text}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>ขอเข้าฝึกปฏิบัติด้วยตนเอง</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {b.bookingNumber}
                      </span>
                      {b.status === 'PENDING' && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> รออาจารย์อนุมัติ
                        </span>
                      )}
                      {b.status === 'APPROVED' && (
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" /> อนุมัติแล้ว (พร้อมสแกนเข้า)
                        </span>
                      )}
                      {b.status === 'CHECKED_IN' && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 animate-pulse">
                          กำลังฝึกปฏิบัติในห้องแล็บ
                        </span>
                      )}
                      {b.status === 'COMPLETED' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ฝึกเสร็จสิ้นแล้ว ({b.actualMinutes || 0} นาที)
                        </span>
                      )}
                      {b.status === 'REJECTED' && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          ไม่อนุมัติ
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{formatUserName(b.user)}</span>
                        {b.user?.studentId && (
                          <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-mono border border-teal-200">
                            {b.user.studentId}
                          </span>
                        )}
                      </div>
                      {b.course && (
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                          [{b.course.code}] {b.course.name}
                        </span>
                      )}
                      {b.advisorName && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>อาจารย์ผู้ดูแล: {formatTeacherName(b.advisorName)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-slate-400 font-bold">หัตถการที่ขอฝึก: </span>
                      <span className="text-slate-900 font-black text-sm">{b.skillTopic}</span>
                    </div>

                    {b.objectives && (
                      <div>
                        <span className="text-slate-400 font-bold">วัตถุประสงค์ / ทักษะที่มุ่งเน้น: </span>
                        <span className="text-slate-700 font-medium">{b.objectives}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>วันที่: <strong className="text-slate-900">{b.slot?.date ? new Date(b.slot.date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>เวลา: <strong className="text-slate-900">{b.slot?.startTime} - {b.slot?.endTime} น.</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>ห้องปฏิบัติการ: <strong className="text-teal-800">{b.slot?.room?.name || 'ห้องแล็บพยาบาล'}</strong></span>
                      </div>
                      {b.practiceKit && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>ชุดฝึกที่ขอเบิก: <strong className="text-amber-800">{b.practiceKit.name}</strong></span>
                        </div>
                      )}
                      {b.additionalEquipment && (
                        <div className="flex items-center gap-2 text-slate-700 sm:col-span-2">
                          <Package className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>อุปกรณ์ขอเพิ่ม: <strong className="text-amber-800">{b.additionalEquipment}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions / Status Footer */}
                  {statusFilter === 'PENDING' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>รออาจารย์หรือเจ้าหน้าที่พิจารณาอนุมัติคำขอเข้าฝึกปฏิบัติ</span>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        {canApprove && (
                          canApprovePractice ? (
                            <>
                              <button
                                disabled={submitting}
                                onClick={() => setRejectItem({ id: b.id, type: 'PRACTICE' })}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 transition cursor-pointer"
                              >
                                ไม่อนุมัติ
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => handleApprove(b.id, 'PRACTICE')}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                              >
                                {approvingId === b.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>กำลังอนุมัติ...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>อนุมัติการเข้าฝึกปฏิบัติ</span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>ไม่อยู่ในขอบเขตการอนุมัติของคุณ</span>
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ) : statusFilter === 'APPROVED' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        อนุมัติแล้ว {b.approvedAt ? `(${new Date(b.approvedAt).toLocaleDateString('th-TH')})` : ''}
                      </span>
                      {b.approver?.name && (
                        <span className="text-slate-500 font-medium">
                          ผู้อนุมัติ: <strong className="text-slate-700">{formatUserName(b.approver)}</strong>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ไม่อนุมัติคำขอ
                      </span>
                      {b.rejectionReason && (
                        <span className="text-rose-700 font-medium">
                          เหตุผล: <strong>{b.rejectionReason}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (item.type === 'ROOM') {
              if (item.isBatch) {
                const badge = item.badge;
                const isExpanded = Boolean(expandedItemIds[item.id]);
                return (
                  <div
                    key={`batch-${item.id}`}
                    id={`approval-card-${item.id}`}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4 hover:shadow-md transition shadow-xs border-l-4 ${
                      item.batchType === 'TIMETABLE'
                        ? 'border-l-emerald-500'
                        : item.batchType === 'MULTI_ROOM'
                        ? 'border-l-indigo-500'
                        : item.batchType === 'MULTI_DAY'
                        ? 'border-l-amber-500'
                        : 'border-l-purple-500'
                    } ${item.id === highlightId ? 'ring-2 ring-teal-500 shadow-xl shadow-teal-500/20' : ''}`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {badge && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${badge.className}`}>
                            {badge.text}
                          </span>
                        )}

                        {item.batchType === 'TIMETABLE' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-xs">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>📚 ตารางเรียนประจำภาคเรียน ({item.batchCount} ครั้ง)</span>
                          </span>
                        ) : item.batchType === 'MULTI_ROOM' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1.5 shadow-xs">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>👥 จองหลายห้องพร้อมกัน ({item.batchSummary?.roomsCount} ห้อง)</span>
                          </span>
                        ) : item.batchType === 'MULTI_DAY' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 shadow-xs">
                            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>📅 จองห้องเดียวต่อเนื่อง ({item.batchSummary?.datesCount} วัน)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-700 flex items-center gap-1.5 shadow-xs">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>👥📅 กิจกรรมพิเศษ ({item.batchSummary?.roomsCount} ห้อง x {item.batchSummary?.datesCount} วัน)</span>
                          </span>
                        )}

                        <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {item.batchGroupId}
                        </span>

                        <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                          รวม {item.batchCount} สล็อต
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        ยื่นคำขอเมื่อ: {new Date(item.createdAt).toLocaleDateString('th-TH')} {new Date(item.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </div>
                    </div>

                    {/* Body */}
                    <div className="space-y-2.5 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{item.purpose}</span>
                        </div>
                        <div className="text-slate-500 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>ผู้ขอจอง: <strong className="text-slate-700 dark:text-slate-300">{formatUserName(item.user) || '-'}</strong></span>
                          {item.user?.studentId && (
                            <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-mono border border-teal-200">
                              {item.user.studentId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 4 Summary Stat Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-400">ห้องปฏิบัติการ ({item.batchSummary?.roomsCount} ห้อง)</div>
                            <strong className="text-indigo-800 dark:text-indigo-300">{item.batchSummary?.roomNames.join(', ')}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-400">วันที่ใช้งาน</div>
                            <strong className="text-slate-900 dark:text-slate-100">{item.dateNeededDisplay}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-400">ช่วงเวลา</div>
                            <strong className="text-slate-900 dark:text-slate-100">{item.dateNeededTime}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-400">จำนวนผู้เข้าร่วม</div>
                            <strong className="text-slate-900 dark:text-slate-100">{item.raw?.attendeesCount || 1} คน</strong>
                          </div>
                        </div>
                      </div>

                      {/* Course / Teacher info */}
                      {(item.course || item.advisorName || item.raw?.contactPhone || item.raw?.equipmentNeeded || item.raw?.note) && (
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                          {item.course && (
                            <div>
                              <span className="font-bold text-slate-500">วิชาที่เกี่ยวข้อง: </span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{item.course.code || item.course.courseCode} {item.course.name || item.course.courseName}</span>
                            </div>
                          )}
                          {item.advisorName && (
                            <div>
                              <span className="font-bold text-slate-500">อาจารย์ผู้รับผิดชอบ/ที่ปรึกษา: </span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{formatTeacherName(item.advisorName)}</span>
                            </div>
                          )}
                          {item.raw?.equipmentNeeded && (
                            <div>
                              <span className="font-bold text-amber-700 dark:text-amber-400">อุปกรณ์/ครุภัณฑ์ที่ต้องการใช้: </span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{item.raw.equipmentNeeded}</span>
                            </div>
                          )}
                          {item.raw?.note && (
                            <div>
                              <span className="font-bold text-slate-500">หมายเหตุเพิ่มเติม: </span>
                              <span className="text-slate-800 dark:text-slate-200">{item.raw.note}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expandable Drawer Button */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => toggleExpandItem(item.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 transition inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{isExpanded ? '▲ ซ่อนรายละเอียดสล็อตย่อย' : `▼ ตรวจสอบรายละเอียดรายสล็อต (${item.batchCount} รายการ)`}</span>
                        </button>
                      </div>

                      {/* Expanded Sub-slots Drawer in Card View */}
                      {isExpanded && (
                        <div className="pt-2">
                          {renderExpandedDetails(item)}
                        </div>
                      )}
                    </div>

                    {/* Actions / Status Footer */}
                    {statusFilter === 'PENDING' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>รอพิจารณาอนุมัติคำขอชุดนี้ ({item.batchSummary?.pendingSlots || item.batchCount} รายการ)</span>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          {canApprove && (
                            canApproveRoom ? (
                              <>
                                <button
                                  disabled={submitting}
                                  onClick={() => setRejectItem({ id: item.id, type: 'ROOM', isBatch: true, batchGroupId: item.batchGroupId, batchCount: item.batchCount })}
                                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                                >
                                  ปฏิเสธทั้งชุด
                                </button>
                                <button
                                  disabled={submitting || approvingId === item.batchGroupId}
                                  onClick={() => handleBatchRoomApprove(item.batchGroupId!, item.batchCount || 1)}
                                  className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                                >
                                  {approvingId === item.batchGroupId ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>กำลังอนุมัติทั้งชุด...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5 font-black" />
                                      <span>อนุมัติทั้งชุด ({item.batchSummary?.pendingSlots || item.batchCount} รายการ)</span>
                                    </>
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                                <span>ไม่อยู่ในขอบเขตการอนุมัติของคุณ</span>
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    ) : statusFilter === 'APPROVED' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          อนุมัติแล้วทั้งชุด ({item.batchSummary?.approvedSlots || item.batchCount} รายการ)
                        </span>
                        {(isAdmin || isOfficer) && (
                          <Link
                            href="/rooms"
                            className="px-3 py-1 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition inline-flex items-center gap-1"
                          >
                            <span>ดูที่หน้าตารางห้อง</span>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          ไม่อนุมัติทั้งชุด ({item.batchCount} รายการ)
                        </span>
                      </div>
                    )}
                  </div>
                );
              }

              const rm = item.raw;
              const badge = item.badge;
              return (
                <div
                  key={rm.id}
                  id={`approval-card-${rm.id}`}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 hover:shadow-md transition shadow-xs ${
                    rm.id === highlightId ? 'ring-2 ring-teal-500 shadow-xl shadow-teal-500/20' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {badge && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${badge.className}`}>
                          {badge.text}
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        จองห้องใช้งาน
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {rm.bookingNumber}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      ยื่นคำขอเมื่อ: {new Date(rm.createdAt).toLocaleDateString('th-TH')} {new Date(rm.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{rm.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {rm.purpose}
                        </span>
                      </div>
                      <div className="text-slate-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>ผู้จอง: <strong className="text-slate-700 dark:text-slate-300">{formatUserName(rm.user) || '-'}</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span>ห้อง: <strong className="text-indigo-800 dark:text-indigo-300">{rm.room?.name || 'ห้องปฏิบัติการ'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>วันที่: <strong className="text-slate-900 dark:text-slate-100">{new Date(rm.bookingDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>เวลา: <strong className="text-slate-900 dark:text-slate-100">{rm.startTime} - {rm.endTime} น.</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>ผู้เข้าร่วม: <strong className="text-slate-900 dark:text-slate-100">{rm.attendeesCount} คน</strong></span>
                      </div>
                    </div>

                    {(rm.course || rm.advisorName || rm.contactPhone || rm.equipmentNeeded || rm.note) && (
                      <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
                        {rm.course && (
                          <div>
                            <span className="font-bold text-slate-500">วิชาที่เกี่ยวข้อง: </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{rm.course.courseCode} {rm.course.courseName}</span>
                          </div>
                        )}
                        {rm.advisorName && (
                          <div>
                            <span className="font-bold text-slate-500">อาจารย์ผู้รับผิดชอบ/ที่ปรึกษา: </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{formatTeacherName(rm.advisorName)}</span>
                          </div>
                        )}
                        {rm.contactPhone && (
                          <div>
                            <span className="font-bold text-slate-500">เบอร์โทรศัพท์ติดต่อ: </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{rm.contactPhone}</span>
                          </div>
                        )}
                        {rm.equipmentNeeded && (
                          <div>
                            <span className="font-bold text-amber-700 dark:text-amber-400">อุปกรณ์/ครุภัณฑ์ที่ต้องการใช้: </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{rm.equipmentNeeded}</span>
                          </div>
                        )}
                        {rm.note && (
                          <div>
                            <span className="font-bold text-slate-500">หมายเหตุเพิ่มเติม: </span>
                            <span className="text-slate-800 dark:text-slate-200">{rm.note}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions / Status Footer */}
                  {statusFilter === 'PENDING' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>รออาจารย์หรือเจ้าหน้าที่พิจารณาอนุมัติคำขอใช้ห้องปฏิบัติการ</span>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        {canApprove && (
                          canApproveRoom ? (
                            <>
                              <button
                                disabled={submitting}
                                onClick={() => setRejectItem({ id: rm.id, type: 'ROOM' })}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                              >
                                ไม่อนุมัติ
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => handleApprove(rm.id, 'ROOM')}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
                              >
                                {approvingId === rm.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>กำลังอนุมัติ...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>อนุมัติการใช้ห้อง</span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>ไม่อยู่ในขอบเขตการอนุมัติของคุณ</span>
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ) : statusFilter === 'APPROVED' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        อนุมัติแล้ว {rm.approvedAt ? `(${new Date(rm.approvedAt).toLocaleDateString('th-TH')})` : ''}
                      </span>
                      <div className="flex items-center gap-3">
                        {rm.approver?.name && (
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            ผู้อนุมัติ: <strong className="text-slate-700 dark:text-slate-200">{formatUserName(rm.approver)}</strong>
                          </span>
                        )}
                        {(isAdmin || isOfficer) && (
                          <Link
                            href="/rooms"
                            className="px-3 py-1 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition inline-flex items-center gap-1"
                          >
                            <span>จัดการห้อง (ย้าย/คืนห้อง)</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ไม่อนุมัติคำขอ
                      </span>
                      {rm.rejectionReason && (
                        <span className="text-rose-700 dark:text-rose-400 font-medium">
                          เหตุผล: <strong>{rm.rejectionReason}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>

      {/* Reject Modal */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              ระบุเหตุผลที่ไม่อนุมัติคำขอ
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                เหตุผลประกอบการพิจารณา
              </label>
              <textarea
                rows={3}
                required
                placeholder="เช่น จำนวนที่ขอเกินความจำเป็น, ติดการสอนคาบปฏิบัติการวิชาอื่น, งบประมาณคงเหลือไม่พอ"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRejectItem(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRejectSubmit}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'กำลังบันทึกไม่อนุมัติ...' : 'ยืนยันไม่อนุมัติ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
