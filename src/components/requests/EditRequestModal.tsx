'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  X,
  Package,
  Boxes,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  BookOpen,
  User,
  Sparkles,
  RefreshCw,
  Layers,
  GraduationCap,
  CheckCircle2,
  Edit3,
  Clock,
} from 'lucide-react';
import { formatTeacherName, formatUserName } from '@/lib/user-utils';

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: any; // BorrowRequest or RequisitionRequest
  requestType: 'BORROW' | 'REQUISITION' | 'UNIFIED';
}

export default function EditRequestModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  requestType,
}: EditRequestModalProps) {
  const { currentUser, isTeacher } = useAuth();
  const isStudent = currentUser?.role === 'USER' && !isTeacher;
  const isAdmin = currentUser?.role === 'ADMIN';
  const [resetToPending, setResetToPending] = useState(false);

  const [loadingItems, setLoadingItems] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [consumablesList, setConsumablesList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [useTarget, setUseTarget] = useState<'SIMULATION' | 'HUMAN'>('SIMULATION');
  const [borrowDate, setBorrowDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [dateNeeded, setDateNeeded] = useState('');

  // Items State
  const [borrowItems, setBorrowItems] = useState<
    {
      itemId: string;
      quantity: number | string;
      originalQuantity?: number | string;
      isOriginal?: boolean;
      categoryId?: string;
    }[]
  >([]);
  const [requisitionItems, setRequisitionItems] = useState<
    {
      itemId: string;
      quantity: number | string;
      originalQuantity?: number | string;
      originalIsSubUnit?: boolean;
      isOriginal?: boolean;
      categoryId?: string;
      isSubUnit?: boolean;
      requestedUnit?: string;
    }[]
  >([]);

  // Format date helper for input type="datetime-local"
  const formatDateTimeLocal = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 16);
  };

  // Format date helper for input type="date"
  const formatDateLocal = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 10);
  };

  // Populate data from initialData when modal opens
  useEffect(() => {
    if (!isOpen || !initialData) return;

    setConflictError(null);
    setCourseId(initialData.courseId || '');
    setAdvisorName(initialData.advisorName || '');
    setPurpose(initialData.purpose || '');
    setUseTarget(initialData.useTarget || 'SIMULATION');

    if (requestType === 'BORROW' || requestType === 'UNIFIED') {
      setBorrowDate(formatDateTimeLocal(initialData.borrowDate));
      setExpectedReturnDate(formatDateTimeLocal(initialData.expectedReturnDate));

      const bItems = (initialData.items || []).map((it: any) => ({
        itemId: it.itemId,
        quantity: it.quantity || 1,
        originalQuantity: it.quantity || 1,
        isOriginal: true,
        categoryId: it.item?.categoryId || '',
      }));
      setBorrowItems(bItems.length > 0 ? bItems : [{ itemId: '', quantity: '', isOriginal: false }]);

      // Check if unified with linked requisition
      const linkedReq = initialData.requisitionRequest;
      if (linkedReq && linkedReq.items) {
        const rItems = linkedReq.items.map((it: any) => {
          const origQty = initialData.status === 'DISPENSED' || initialData.requisitionRequest?.status === 'DISPENSED'
            ? (it.quantityDispensed ?? it.quantityRequested ?? 1)
            : (it.quantityRequested || 1);
          return {
            itemId: it.itemId,
            quantity: origQty,
            originalQuantity: origQty,
            originalIsSubUnit: Boolean(it.isSubUnit),
            isOriginal: true,
            isSubUnit: Boolean(it.isSubUnit),
            requestedUnit: it.requestedUnit || '',
            categoryId: it.item?.categoryId || '',
          };
        });
        setRequisitionItems(rItems.length > 0 ? rItems : [{ itemId: '', quantity: '', isOriginal: false, isSubUnit: false, requestedUnit: '' }]);
      } else {
        setRequisitionItems([]);
      }
    } else {
      // Pure REQUISITION
      setDateNeeded(formatDateLocal(initialData.dateNeeded));
      const rItems = (initialData.items || []).map((it: any) => {
        const origQty = initialData.status === 'DISPENSED' || initialData.requisitionRequest?.status === 'DISPENSED'
          ? (it.quantityDispensed ?? it.quantityRequested ?? 1)
          : (it.quantityRequested || 1);
        return {
          itemId: it.itemId,
          quantity: origQty,
          originalQuantity: origQty,
          originalIsSubUnit: Boolean(it.isSubUnit),
          isOriginal: true,
          isSubUnit: Boolean(it.isSubUnit),
          requestedUnit: it.requestedUnit || '',
          categoryId: it.item?.categoryId || '',
        };
      });
      setRequisitionItems(rItems.length > 0 ? rItems : [{ itemId: '', quantity: '', isOriginal: false, isSubUnit: false, requestedUnit: '' }]);

      // Check if unified with linked borrow
      const linkedBorrow = initialData.borrowRequest;
      if (linkedBorrow && linkedBorrow.items) {
        setBorrowDate(formatDateTimeLocal(linkedBorrow.borrowDate));
        setExpectedReturnDate(formatDateTimeLocal(linkedBorrow.expectedReturnDate));
        const bItems = linkedBorrow.items.map((it: any) => ({
          itemId: it.itemId,
          quantity: it.quantity || 1,
          originalQuantity: it.quantity || 1,
          isOriginal: true,
          categoryId: it.item?.categoryId || '',
        }));
        setBorrowItems(bItems.length > 0 ? bItems : [{ itemId: '', quantity: '', isOriginal: false }]);
      } else {
        setBorrowItems([]);
      }
    }
  }, [isOpen, initialData, requestType]);

  // Load items, courses, instructors
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoadingItems(true);
      try {
        const [eqRes, conRes, cRes, insRes] = await Promise.all([
          fetch('/api/items?type=EQUIPMENT&compact=true'),
          fetch('/api/items?type=CONSUMABLE&compact=true'),
          fetch('/api/courses?compact=true'),
          fetch('/api/users?role=INSTRUCTOR'),
        ]);

        if (eqRes.ok) {
          const rawEq = await eqRes.json();
          setEquipmentList(rawEq.filter((e: any) => e.isBorrowable !== false));
        }
        if (conRes.ok) setConsumablesList(await conRes.json());
        if (cRes.ok) setCourses(await cRes.json());
        if (insRes.ok) setInstructors(await insRes.json());
      } catch (err) {
        console.error('Failed to load edit modal data:', err);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchData();
  }, [isOpen]);

  if (!isOpen || !initialData) return null;


  const showBorrowSection = requestType === 'BORROW' || requestType === 'UNIFIED' || borrowItems.length > 0;
  const showReqSection = requestType === 'REQUISITION' || requestType === 'UNIFIED' || requisitionItems.length > 0;

  // Auto-sync categoryId and requestedUnit when master lists load
  useEffect(() => {
    if (equipmentList.length > 0) {
      setBorrowItems((prev) =>
        prev.map((it) => {
          if (!it.categoryId && it.itemId) {
            const match = equipmentList.find((e) => e.id === it.itemId);
            if (match?.categoryId || match?.category?.id) {
              return { ...it, categoryId: match.category?.id || match.categoryId };
            }
          }
          return it;
        })
      );
    }
  }, [equipmentList]);

  useEffect(() => {
    if (consumablesList.length > 0) {
      setRequisitionItems((prev) =>
        prev.map((it) => {
          if (it.itemId) {
            const match = consumablesList.find((c) => c.id === it.itemId);
            const updated = { ...it };
            if (!updated.categoryId && (match?.categoryId || match?.category?.id)) {
              updated.categoryId = match.category?.id || match.categoryId;
            }
            if (!updated.requestedUnit && match) {
              updated.requestedUnit = updated.isSubUnit ? (match.usageUnit || 'ชิ้น') : match.unit;
            }
            return updated;
          }
          return it;
        })
      );
    }
  }, [consumablesList]);

  // Memoized category lists for category pre-filtering
  const consumableCategories = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    consumablesList.forEach((c) => {
      const catId = c.category?.id || c.categoryId || 'OTHER';
      const catName = c.category?.name || 'วัสดุทั่วไป / อื่นๆ';
      if (!map.has(catId)) {
        map.set(catId, { id: catId, name: catName, count: 0 });
      }
      map.get(catId)!.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [consumablesList]);

  const equipmentCategories = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    equipmentList.forEach((eq) => {
      const catId = eq.category?.id || eq.categoryId || 'OTHER';
      const catName = eq.category?.name || 'ครุภัณฑ์ทั่วไป / อื่นๆ';
      if (!map.has(catId)) {
        map.set(catId, { id: catId, name: catName, count: 0 });
      }
      map.get(catId)!.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [equipmentList]);

  // Delta Summary stats
  const deltaStats = React.useMemo(() => {
    let originalUnchanged = 0;
    let itemsToAdd = 0;
    let itemsToReduce = 0;

    borrowItems.filter((b) => b.itemId).forEach((b) => {
      if (!b.isOriginal) {
        itemsToAdd++;
      } else {
        const diff = Number(b.quantity || 0) - Number(b.originalQuantity || 0);
        if (diff === 0) originalUnchanged++;
        else if (diff > 0) itemsToAdd++;
        else itemsToReduce++;
      }
    });

    requisitionItems.filter((r) => r.itemId).forEach((r) => {
      const match = consumablesList.find((c) => c.id === r.itemId);
      const ratio = Number(match?.conversionRatio) > 0 ? Number(match?.conversionRatio) : 1;
      if (!r.isOriginal) {
        itemsToAdd++;
      } else {
        const origPieces = r.originalIsSubUnit
          ? Number(r.originalQuantity || 0)
          : Number(r.originalQuantity || 0) * ratio;
        const curPieces = r.isSubUnit
          ? Number(r.quantity || 0)
          : Number(r.quantity || 0) * ratio;
        const diff = curPieces - origPieces;
        if (diff === 0) originalUnchanged++;
        else if (diff > 0) itemsToAdd++;
        else itemsToReduce++;
      }
    });

    return { originalUnchanged, itemsToAdd, itemsToReduce };
  }, [borrowItems, requisitionItems, consumablesList]);

  // Handlers for borrow items
  const handleAddBorrowItem = () => {
    setBorrowItems((prev) => [...prev, { itemId: '', quantity: '', isOriginal: false }]);
  };

  const handleRemoveBorrowItem = (index: number) => {
    setBorrowItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBorrowCategoryChange = (index: number, categoryId: string) => {
    setBorrowItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], categoryId };
      if (categoryId && current.itemId) {
        const match = equipmentList.find((e) => e.id === current.itemId);
        const itemCatId = match?.category?.id || match?.categoryId || '';
        if (itemCatId && itemCatId !== categoryId) {
          current.itemId = '';
          current.quantity = '';
        }
      }
      updated[index] = current;
      return updated;
    });
  };

  const handleBorrowItemChange = (index: number, field: string, value: any) => {
    setBorrowItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      if (field === 'itemId') {
        const match = equipmentList.find((e) => e.id === value);
        if (match?.categoryId || match?.category?.id) {
          current.categoryId = match.category?.id || match.categoryId;
        }
      }
      updated[index] = current;
      return updated;
    });
  };

  // Handlers for requisition items
  const handleAddRequisitionItem = () => {
    setRequisitionItems((prev) => [
      ...prev,
      { itemId: '', quantity: '', isOriginal: false, isSubUnit: false, requestedUnit: '' },
    ]);
  };

  const handleRemoveRequisitionItem = (index: number) => {
    setRequisitionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRequisitionCategoryChange = (index: number, categoryId: string) => {
    setRequisitionItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], categoryId };
      if (categoryId && current.itemId) {
        const match = consumablesList.find((c) => c.id === current.itemId);
        const itemCatId = match?.category?.id || match?.categoryId || '';
        if (itemCatId && itemCatId !== categoryId) {
          current.itemId = '';
          current.quantity = '';
          current.isSubUnit = false;
          current.requestedUnit = '';
        }
      }
      updated[index] = current;
      return updated;
    });
  };

  const handleRequisitionItemChange = (index: number, field: string, value: any) => {
    setRequisitionItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      if (field === 'itemId') {
        const match = consumablesList.find((c) => c.id === value);
        if (match) {
          current.categoryId = match.category?.id || match.categoryId || current.categoryId || '';
          current.isSubUnit = false;
          current.requestedUnit = match.unit;
        }
      }
      updated[index] = current;
      return updated;
    });
  };

  // Atomic toggle for Sub-Unit (การเบิกแบบย่อย)
  const handleToggleSubUnit = (index: number, isSub: boolean) => {
    setRequisitionItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const match = consumablesList.find((c) => c.id === item.itemId);
      const unitName = isSub ? (match?.usageUnit || 'ชิ้น') : (match?.unit || 'หน่วย');
      const ratio = Number(match?.conversionRatio) > 0 ? Number(match?.conversionRatio) : 1;
      const totalPieces = (match?.currentStock || 0) * ratio + (match?.openPackRemainder || 0);
      const maxAllowed = isSub ? totalPieces : (match?.currentStock || 0);

      let newQty = item.quantity;
      if (newQty !== '' && maxAllowed > 0 && Number(newQty) > maxAllowed) {
        newQty = maxAllowed;
      }

      updated[index] = {
        ...item,
        isSubUnit: isSub,
        requestedUnit: unitName,
        quantity: newQty,
      };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    if (!purpose.trim()) {
      alert('กรุณาระบุวัตถุประสงค์และสถานที่ใช้งาน');
      return;
    }

    if (isStudent && !advisorName?.trim()) {
      alert('⚠️ เนื่องจากท่านเป็นนิสิต กรุณาระบุหรือเลือกอาจารย์ผู้รับทราบ/อาจารย์ประจำวิชา (ไม่อนุญาตให้เว้นว่าง)');
      return;
    }

    const validBorrow = borrowItems.filter((it) => it.itemId);
    const validReq = requisitionItems.filter((it) => it.itemId);

    if (validBorrow.length === 0 && validReq.length === 0) {
      alert('กรุณาเลือกรายการครุภัณฑ์หรือวัสดุที่ต้องการขออย่างน้อย 1 รายการ');
      return;
    }

    for (const it of validBorrow) {
      const q = Number(it.quantity);
      if (!q || q < 1) {
        alert('กรุณาระบุจำนวนครุภัณฑ์ที่ต้องการยืมให้ถูกต้อง (อย่างน้อย 1)');
        return;
      }
    }

    for (const it of validReq) {
      const q = Number(it.quantity);
      if (!q || q < 1) {
        alert('กรุณาระบุจำนวนวัสดุสิ้นเปลืองที่ต้องการเบิกให้ถูกต้อง (อย่างน้อย 1)');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requests/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: initialData.id,
          requestType,
          lastKnownUpdatedAt: initialData.updatedAt,
          userId: currentUser?.id,
          purpose,
          useTarget,
          courseId: courseId || null,
          advisorName: advisorName || null,
          borrowDate: borrowDate ? new Date(borrowDate).toISOString() : undefined,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
          dateNeeded: dateNeeded ? new Date(dateNeeded).toISOString() : undefined,
          borrowItems: validBorrow,
          requisitionItems: validReq,
          keepApprovalStatus: !resetToPending,
          resetToPending,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.error === 'CONCURRENCY_CONFLICT') {
          setConflictError(data.message || '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง');
          return;
        }
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกการแก้ไขคำขอ');
        return;
      }

      alert(data.message || '✅ บันทึกการแก้ไขคำขอเรียบร้อยแล้ว');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92dvh] sm:max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                ✏️ แก้ไขคำขอ: {initialData.requestNumber}
              </h2>
              <p className="text-xs text-amber-100/90 font-medium">
                {requestType === 'UNIFIED'
                  ? 'คำขอร่วม (ยืมครุภัณฑ์ & เบิกวัสดุสิ้นเปลือง)'
                  : requestType === 'BORROW'
                  ? 'คำขอยืมครุภัณฑ์'
                  : 'คำขอเบิกวัสดุสิ้นเปลือง'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Admin Banners */}
        {isAdmin && initialData.status === 'APPROVED' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shrink-0">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>⚡ โหมดแอดมิน: แก้ไขคำขอที่อนุมัติแล้ว (ระบบจะคงสถานะ &quot;อนุมัติแล้ว&quot; ไว้ตามเดิม ไม่ต้องรออนุมัติซ้ำ)</span>
            </div>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={resetToPending}
                onChange={(e) => setResetToPending(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>ต้องการรีเซ็ตสถานะเป็น &quot;รออนุมัติ&quot; ใหม่</span>
            </label>
          </div>
        )}

        {isAdmin && (initialData.status === 'DISPENSED' || initialData.requisitionRequest?.status === 'DISPENSED') && (
          <div className="bg-teal-50 dark:bg-teal-950/50 border-b border-teal-200 dark:border-teal-800 p-3 sm:p-4 text-xs text-teal-900 dark:text-teal-200 space-y-1 shrink-0">
            <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              <span>⚡ โหมดแอดมิน: ปรับปรุงรายการในใบเบิกที่จ่ายของแล้ว (Two-Way Stock Sync)</span>
            </div>
            <p className="text-[11px] text-teal-700 dark:text-teal-300/80 leading-relaxed">
              • <b>➕ เพิ่มรายการ / เพิ่มจำนวน</b>: ระบบจะตัดสต็อก FIFO และบวกต้นทุนเพิ่มเข้าใบเบิกให้อัตโนมัติ<br />
              • <b>➖ ลดจำนวน / 🗑️ ลบรายการออก</b>: ระบบจะดึงสต็อกกลับเข้าคลัง และปรับลดยอดต้นทุนให้อัตโนมัติทันที
            </p>
          </div>
        )}

        {isAdmin && (initialData.status === 'BORROWED' || initialData.borrowRequest?.status === 'BORROWED') && (
          <div className="bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-800 p-3 sm:p-4 text-xs text-indigo-900 dark:text-indigo-200 space-y-1 shrink-0">
            <div className="flex items-center gap-2 font-bold text-indigo-800 dark:text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>⚡ โหมดแอดมิน: แก้ไขข้อมูลคำขอยืมที่กำลังยืม (เลื่อนวันนัดคืน / ปรับเปลี่ยนครุภัณฑ์)</span>
            </div>
          </div>
        )}



        {/* Conflict Error Notice */}
        {conflictError && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-800 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs font-bold">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{conflictError}</span>
            </div>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition cursor-pointer flex-shrink-0"
            >
              รีเฟรชข้อมูลล่าสุด
            </button>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Course and Advisor */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>รายวิชาและอาจารย์ผู้รับผิดชอบ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  เลือกรายวิชา (ถ้ามี)
                </label>
                <select
                  value={courseId}
                  onChange={(e) => {
                    const selCourseId = e.target.value;
                    setCourseId(selCourseId);
                    const sel = courses.find((c) => c.id === selCourseId);
                    if (sel?.instructorName) {
                      setAdvisorName(sel.instructorName);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- ไม่ระบุรายวิชา (ยืม/เบิกส่วนตัว/กิจกรรม) --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} {c.name} {c.instructorName ? `(${c.instructorName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  อาจารย์ผู้รับทราบ/ผู้อนุมัติ {isStudent && <span className="text-rose-500">* (นิสิตต้องระบุ)</span>}
                </label>
                <div className="flex gap-2">
                  <select
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- เลือกอาจารย์จากรายชื่อ --</option>
                    {instructors.map((ins) => (
                      <option key={ins.id} value={ins.name}>
                        {formatTeacherName(ins.name)}
                      </option>
                    ))}
                    {advisorName && !instructors.some((ins) => ins.name === advisorName) && (
                      <option value={advisorName}>{formatTeacherName(advisorName)} (ระบุเอง)</option>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsEditingAdvisor(!isEditingAdvisor)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                    title="พิมพ์ชื่ออาจารย์เอง"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isEditingAdvisor && (
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อ-นามสกุลอาจารย์ผู้รับผิดชอบ"
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    className="mt-2 w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                )}
              </div>
            </div>

            {/* Purpose & Target */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  วัตถุประสงค์ & สถานที่ใช้งาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ฝึกทักษะการฉีดยา ห้องปฏิบัติการ 301"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  เป้าหมายการใช้งาน
                </label>
                <select
                  value={useTarget}
                  onChange={(e: any) => setUseTarget(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 font-bold"
                >
                  <option value="SIMULATION">🤖 ฝึกกับหุ่นจำลอง (Simulation)</option>
                  <option value="HUMAN">🩺 ใช้กับคนจริง (Human Patients)</option>
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              {showBorrowSection ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      วัน-เวลาที่ขอยืม
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={borrowDate}
                      onChange={(e) => setBorrowDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      วัน-เวลาที่กำหนดส่งคืน
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    วันที่ต้องการใช้พัสดุ
                  </label>
                  <input
                    type="date"
                    required
                    value={dateNeeded}
                    onChange={(e) => setDateNeeded(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Equipment Borrow Items */}
          {showBorrowSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>รายการครุภัณฑ์ที่ขอยืม</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddBorrowItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มครุภัณฑ์</span>
                </button>
              </div>

              <div className="space-y-2">
                {borrowItems.map((item, idx) => {
                  const filteredEquipment = item.categoryId
                    ? equipmentList.filter((e) => (e.category?.id || e.categoryId) === item.categoryId)
                    : equipmentList;
                  const matchEq = equipmentList.find((e) => e.id === item.itemId);
                  const shelfAvail = matchEq?.availableAssets?.length ?? matchEq?.currentStock ?? 0;
                  const alreadyHeldQty = item.isOriginal ? Number(item.originalQuantity || 1) : 0;
                  const effectiveAvail = shelfAvail + alreadyHeldQty;
                  const isOver = item.itemId && Number(item.quantity) > effectiveAvail;
                  const currentQty = Number(item.quantity || 0);
                  const origQty = item.isOriginal ? Number(item.originalQuantity || 0) : 0;
                  const diff = currentQty - origQty;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2"
                    >
                      {/* Status Badge header for clarity */}
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-700/60 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.isOriginal ? (
                            diff === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                📌 รายการเดิม (คงเดิม ไม่ตัดสต็อกเพิ่ม)
                              </span>
                            ) : diff > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                                ➕ ปรับเพิ่ม (+{diff} {matchEq?.unit || 'ชิ้น'} จะตัดสต็อกเพิ่ม)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">
                                ➖ ปรับลด (-{Math.abs(diff)} {matchEq?.unit || 'ชิ้น'} จะคืนเข้าคลัง)
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300">
                              ✨ รายการเพิ่มใหม่ (+{item.quantity || 1} {matchEq?.unit || 'ชิ้น'} จะตัดสต็อกใหม่)
                            </span>
                          )}
                        </div>
                        {matchEq && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {item.isOriginal && alreadyHeldQty > 0
                              ? `(ถือครองอยู่แล้ว ${alreadyHeldQty} + ในคลังว่าง ${shelfAvail})`
                              : `(ในคลังว่าง ${shelfAvail} ${matchEq.unit})`}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        {/* Category Dropdown */}
                        <div className="sm:col-span-4">
                          <select
                            value={item.categoryId || ''}
                            onChange={(e) => handleBorrowCategoryChange(idx, e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            <option value="">📁 ทุกหมวดครุภัณฑ์ ({equipmentList.length})</option>
                            {equipmentCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                📁 {cat.name} ({cat.count})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Equipment Item Dropdown */}
                        <div className="sm:col-span-5">
                          <select
                            value={item.itemId}
                            onChange={(e) => handleBorrowItemChange(idx, 'itemId', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                          >
                            <option value="">-- เลือกครุภัณฑ์ ({filteredEquipment.length}) --</option>
                            {filteredEquipment.map((eq) => (
                              <option key={eq.id} value={eq.id}>
                                {eq.name} (พร้อมใช้ {eq.availableAssets?.length ?? eq.currentStock} {eq.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity & Delete */}
                        <div className="sm:col-span-3 flex items-center justify-end gap-2 w-full">
                          <input
                            type="number"
                            min="1"
                            max={effectiveAvail > 0 ? effectiveAvail : undefined}
                            placeholder="จำนวน"
                            value={item.quantity}
                            onChange={(e) => handleBorrowItemChange(idx, 'quantity', e.target.value)}
                            className={`w-20 text-xs p-2 rounded-xl border text-center font-bold ${
                              isOver
                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                            }`}
                          />
                          <span className="text-xs text-slate-500 min-w-[32px]">
                            {matchEq?.unit || 'ชิ้น'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBorrowItem(idx)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="ลบแถว"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {matchEq && isOver && (
                        <div className="text-[11px] text-rose-600 font-bold pl-1">
                          ⚠️ ระบุเกินโควตาสูงสุด (ถือครองอยู่แล้ว {alreadyHeldQty} + ในคลังมีเพิ่มอีก {shelfAvail} {matchEq.unit})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Requisition Consumable Items */}
          {showReqSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span>รายการวัสดุสิ้นเปลืองที่ขอเบิก</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddRequisitionItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มวัสดุ</span>
                </button>
              </div>

              <div className="space-y-2">
                {requisitionItems.map((item, idx) => {
                  const filteredConsumables = item.categoryId
                    ? consumablesList.filter((c) => (c.category?.id || c.categoryId) === item.categoryId)
                    : consumablesList;
                  const matchCons = consumablesList.find((c) => c.id === item.itemId);
                  const ratio = Number(matchCons?.conversionRatio) > 0 ? Number(matchCons?.conversionRatio) : 1;
                  const canSubUnit = !!(matchCons && ratio > 1 && matchCons.usageUnit);
                  const shelfPieces = (matchCons?.currentStock || 0) * ratio + (matchCons?.openPackRemainder || 0);
                  const alreadyHeldPieces = item.isOriginal
                    ? (item.originalIsSubUnit ? Number(item.originalQuantity || 0) : Number(item.originalQuantity || 0) * ratio)
                    : 0;
                  const effectiveTotalPieces = shelfPieces + alreadyHeldPieces;
                  const isSub = Boolean(item.isSubUnit);
                  const maxAllowed = isSub ? effectiveTotalPieces : Math.floor(effectiveTotalPieces / ratio);
                  const isOver = item.itemId && Number(item.quantity) > maxAllowed;

                  const currentPieces = isSub ? Number(item.quantity || 0) : Number(item.quantity || 0) * ratio;
                  const diffPieces = currentPieces - alreadyHeldPieces;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5"
                    >
                      {/* Status Badge header for clarity */}
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-700/60 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.isOriginal ? (
                            diffPieces === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                📌 รายการเดิม (คงเดิม ไม่ตัดสต็อกเพิ่ม)
                              </span>
                            ) : diffPieces > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                                ➕ ปรับเพิ่ม (+{isSub ? `${diffPieces} ${matchCons?.usageUnit || 'ชิ้น'}` : `${Math.round(diffPieces / ratio)} ${matchCons?.unit || 'หน่วย'}`} จะตัดสต็อกเพิ่ม)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">
                                ➖ ปรับลด (-{isSub ? `${Math.abs(diffPieces)} ${matchCons?.usageUnit || 'ชิ้น'}` : `${Math.round(Math.abs(diffPieces) / ratio)} ${matchCons?.unit || 'หน่วย'}`} จะคืนเข้าคลัง)
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300">
                              ✨ รายการเพิ่มใหม่ (+{item.quantity || 1} {isSub ? (matchCons?.usageUnit || 'ชิ้น') : (matchCons?.unit || 'หน่วย')} จะตัดสต็อกใหม่)
                            </span>
                          )}
                        </div>
                        {matchCons && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {item.isOriginal && alreadyHeldPieces > 0
                              ? isSub
                                ? `(ถือครองอยู่แล้ว ${alreadyHeldPieces} + ในคลังว่าง ${shelfPieces} ${matchCons.usageUnit})`
                                : `(ถือครองอยู่แล้ว ${item.originalQuantity} + ในคลังว่าง ${matchCons.currentStock} ${matchCons.unit})`
                              : isSub
                              ? `(ในคลังว่าง ${shelfPieces} ${matchCons.usageUnit})`
                              : `(ในคลังว่าง ${matchCons.currentStock} ${matchCons.unit})`}
                          </span>
                        )}
                      </div>

                      {/* Step 1: Category & Item Selectors */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5 sm:hidden">
                            หมวดหมู่วัสดุ:
                          </label>
                          <select
                            value={item.categoryId || ''}
                            onChange={(e) => handleRequisitionCategoryChange(idx, e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            <option value="">📁 ทุกหมวดวัสดุ ({consumablesList.length})</option>
                            {consumableCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                📁 {cat.name} ({cat.count})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-8">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5 sm:hidden">
                            รายการวัสดุ:
                          </label>
                          <select
                            value={item.itemId}
                            onChange={(e) => handleRequisitionItemChange(idx, 'itemId', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                          >
                            <option value="">-- เลือกวัสดุสิ้นเปลือง ({filteredConsumables.length}) --</option>
                            {filteredConsumables.map((con) => {
                              const r = Number(con.conversionRatio) > 0 ? Number(con.conversionRatio) : 1;
                              const subText =
                                r > 1 && con.usageUnit
                                  ? ` | ${con.currentStock * r + (con.openPackRemainder || 0)} ${con.usageUnit}`
                                  : '';
                              return (
                                <option key={con.id} value={con.id}>
                                  {con.name} (สต็อก: {con.currentStock} {con.unit}{subText})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      {/* Step 2: Quantity, Sub-unit Selector & Stock Indicator */}
                      {matchCons && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">จำนวน:</span>
                            <input
                              type="number"
                              min="1"
                              max={maxAllowed > 0 ? maxAllowed : undefined}
                              placeholder="จำนวน"
                              value={item.quantity}
                              onChange={(e) => handleRequisitionItemChange(idx, 'quantity', e.target.value)}
                              className={`w-20 text-xs p-2 rounded-xl border text-center font-bold ${
                                isOver
                                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                              }`}
                            />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[36px]">
                              {isSub ? (matchCons.usageUnit || 'ชิ้น') : (matchCons.unit || 'หน่วย')}
                            </span>
                          </div>

                          {/* Sub-Unit Toggle Buttons */}
                          {canSubUnit ? (
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => handleToggleSubUnit(idx, false)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                  !isSub
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                📦 เบิกยก {matchCons.unit}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleSubUnit(idx, true)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                  isSub
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                ✨ เบิกแบบย่อย ({matchCons.usageUnit})
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              (ไม่มีการแตกหน่วยย่อย)
                            </span>
                          )}

                          {/* Stock and Remove */}
                          <div className="flex items-center gap-3 ml-auto">
                            <span className={`text-[11px] ${isOver ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                              {isSub
                                ? `พร้อมเบิกย่อย: ${effectiveTotalPieces} ${matchCons.usageUnit}`
                                : `พร้อมเบิก: ${Math.floor(effectiveTotalPieces / ratio)} ${matchCons.unit}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRequisitionItem(idx)}
                              className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="ลบแถว"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {matchCons && isOver && (
                        <div className="text-[11px] text-rose-600 font-bold pl-1">
                          ⚠️ ระบุเกินโควตาสูงสุด (ถือครองอยู่แล้ว {isSub ? `${alreadyHeldPieces} ${matchCons.usageUnit}` : `${Math.floor(alreadyHeldPieces / ratio)} ${matchCons.unit}`} + ในคลังมีเพิ่มอีก {isSub ? `${shelfPieces} ${matchCons.usageUnit}` : `${matchCons.currentStock} ${matchCons.unit}`})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Delta Summary Bar */}
        <div className="px-5 py-3 bg-amber-50/70 dark:bg-amber-950/30 border-t border-amber-200/80 dark:border-amber-800/50 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>📊 สรุปการแก้ไข:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-[11px]">
                📌 รายการเดิมคงที่: <b>{deltaStats.originalUnchanged}</b>
              </span>
              {deltaStats.itemsToAdd > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 font-semibold text-[11px]">
                  ➕ เพิ่มรายการ/ปรับขึ้น: <b>{deltaStats.itemsToAdd}</b>
                </span>
              )}
              {deltaStats.itemsToReduce > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 font-semibold text-[11px]">
                  ➖ ปรับลด/คืนคลัง: <b>{deltaStats.itemsToReduce}</b>
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            *ระบบจะปรับปรุงเฉพาะส่วนต่าง (Delta) ไม่สร้างรายการซ้ำซ้อน
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
              <span>ตรวจสอบข้อมูลให้ถูกต้องก่อนกดบันทึก</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกการแก้ไข...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกการแก้ไขคำขอ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
