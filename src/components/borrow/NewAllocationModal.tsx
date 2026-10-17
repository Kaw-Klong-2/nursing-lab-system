'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  BookOpen,
  Calendar,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Sparkles,
  Stethoscope,
  GraduationCap,
  Edit3,
  Layers,
} from 'lucide-react';
import { formatTeacherName } from '@/lib/user-utils';

interface NewAllocationModalProps {
  courses?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewAllocationModal({
  courses = [],
  onClose,
  onSuccess,
}: NewAllocationModalProps) {
  const safeInitialCourses = Array.isArray(courses) ? courses : [];
  const [courseList, setCourseList] = useState<any[]>(safeInitialCourses);
  const [courseId, setCourseId] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);
  const [instructors, setInstructors] = useState<any[]>([]);

  const [targetLocation, setTargetLocation] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [purpose, setPurpose] = useState('จัดสรรหุ่นและครุภัณฑ์ประจำรายวิชาตลอดภาคการศึกษา');

  // Dates: Default 4 months
  const todayStr = new Date().toISOString().slice(0, 10);
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 4);
  const futureStr = futureDate.toISOString().slice(0, 10);

  const [borrowDate, setBorrowDate] = useState(todayStr);
  const [expectedReturnDate, setExpectedReturnDate] = useState(futureStr);

  // Equipment assets list
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [rawEquipment, setRawEquipment] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Sync courseList when courses prop changes
  useEffect(() => {
    if (Array.isArray(courses) && courses.length > 0) {
      setCourseList(courses);
    }
  }, [courses]);

  useEffect(() => {
    // 1. Fetch courses directly if empty
    if (!Array.isArray(courses) || courses.length === 0) {
      fetch('/api/courses?compact=true')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setCourseList(data);
          }
        })
        .catch(() => {});
    }

    // 2. Fetch academic term for default end date
    fetch('/api/academic-terms?current=true')
      .then((res) => (res.ok ? res.json() : null))
      .then((term) => {
        if (term?.endDate && typeof term.endDate === 'string') {
          setExpectedReturnDate(term.endDate.slice(0, 10));
        }
      })
      .catch(() => {});

    // 3. Load practice rooms with sessionStorage caching
    try {
      const cachedRooms = sessionStorage.getItem('cached_practice_rooms');
      if (cachedRooms) {
        const parsed = JSON.parse(cachedRooms);
        if (Array.isArray(parsed)) setRooms(parsed);
      }
    } catch {}

    setLoadingRooms(true);
    fetch('/api/rooms')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setRooms(data);
          try {
            sessionStorage.setItem('cached_practice_rooms', JSON.stringify(data));
          } catch {}
        }
      })
      .catch((err) => console.error('Failed to load rooms', err))
      .finally(() => setLoadingRooms(false));

    // 4. Load approvers/instructors with sessionStorage caching
    try {
      const cachedUsers = sessionStorage.getItem('cached_approver_users');
      if (cachedUsers) {
        const parsed = JSON.parse(cachedUsers);
        if (Array.isArray(parsed)) setInstructors(parsed);
      }
    } catch {}

    fetch('/api/users?role=INSTRUCTOR')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setInstructors(data);
          try {
            sessionStorage.setItem('cached_approver_users', JSON.stringify(data));
          } catch {}
        }
      })
      .catch((err) => console.error('Failed to load instructors', err));

    // 5. Load available equipment items with sessionStorage caching
    try {
      const cachedEq = sessionStorage.getItem('cached_equipment_items');
      if (cachedEq) {
        const parsed = JSON.parse(cachedEq);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRawEquipment(parsed);
          setLoadingAssets(false);
        }
      }
    } catch {}

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    async function fetchAssets() {
      try {
        const res = await fetch('/api/items?type=EQUIPMENT&compact=true', {
          signal: controller.signal,
        });
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            setRawEquipment(items);
            try {
              sessionStorage.setItem('cached_equipment_items', JSON.stringify(items));
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load assets for allocation', err);
        }
      } finally {
        clearTimeout(timeoutId);
        setLoadingAssets(false);
      }
    }
    fetchAssets();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [courses]);

  // Extract unique categories and counts from rawEquipment
  const categories = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; assetCount: number }>();
    if (Array.isArray(rawEquipment)) {
      rawEquipment.forEach((it: any) => {
        if (!it) return;
        const catName = it.category?.name || 'หมวดหมู่อื่นๆ';
        const catId = it.category?.id || catName;
        const aList = it.availableAssets || it.assets || [];
        const count = Array.isArray(aList) ? aList.length : 0;
        if (!map.has(catId)) {
          map.set(catId, { id: catId, name: catName, assetCount: count });
        } else {
          map.get(catId)!.assetCount += count;
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [rawEquipment]);

  const totalAssetsCount = React.useMemo(() => {
    return categories.reduce((sum, c) => sum + c.assetCount, 0);
  }, [categories]);

  // Filter items in the selected category
  const itemsInSelectedCategory = React.useMemo(() => {
    if (!Array.isArray(rawEquipment)) return [];
    if (!selectedCategoryId) return rawEquipment;
    return rawEquipment.filter((it: any) => {
      if (!it) return false;
      return (
        it.categoryId === selectedCategoryId ||
        it.category?.id === selectedCategoryId ||
        it.category?.name === selectedCategoryId
      );
    });
  }, [rawEquipment, selectedCategoryId]);

  // Candidate assets for selection based on category and chosen item
  const allCandidateAssets = React.useMemo(() => {
    const list: any[] = [];
    const sourceItems = selectedItemId
      ? itemsInSelectedCategory.filter((it: any) => it.id === selectedItemId)
      : itemsInSelectedCategory;

    sourceItems.forEach((it: any) => {
      const aList = it.availableAssets || it.assets || [];
      if (Array.isArray(aList)) {
        aList.forEach((a: any) => {
          if (a && (a.status === 'AVAILABLE' || a.isBorrowable !== false)) {
            list.push({
              ...a,
              itemId: it.id,
              itemName: it.name || a.assetCode || 'อุปกรณ์',
              itemCode: it.code || '',
              itemUnit: it.unit || 'ชิ้น',
              categoryName: it.category?.name || 'หมวดหมู่อื่นๆ',
              categoryId: it.category?.id || it.categoryId || '',
            });
          }
        });
      }
    });
    return list;
  }, [itemsInSelectedCategory, selectedItemId]);

  // Full selected assets list across all categories
  const selectedAssetsFullList = React.useMemo(() => {
    if (!Array.isArray(rawEquipment)) return [];
    const map = new Map<string, any>();
    rawEquipment.forEach((it: any) => {
      const aList = it.availableAssets || it.assets || [];
      if (Array.isArray(aList)) {
        aList.forEach((a: any) => {
          if (a && selectedAssetIds.includes(a.id)) {
            map.set(a.id, {
              ...a,
              itemId: it.id,
              itemName: it.name || a.assetCode || 'อุปกรณ์',
              itemCode: it.code || '',
              itemUnit: it.unit || 'ชิ้น',
              categoryName: it.category?.name || 'หมวดหมู่อื่นๆ',
            });
          }
        });
      }
    });
    return Array.from(map.values());
  }, [rawEquipment, selectedAssetIds]);

  // Filtered assets by search keyword and view mode
  const filteredAssets = React.useMemo(() => {
    let list = showOnlySelected ? selectedAssetsFullList : allCandidateAssets;
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter((a) => {
      const code = String(a.assetCode || '').toLowerCase();
      const name = String(a.itemName || '').toLowerCase();
      const loc = String(a.location || '').toLowerCase();
      const cat = String(a.categoryName || '').toLowerCase();
      return code.includes(q) || name.includes(q) || loc.includes(q) || cat.includes(q);
    });
  }, [allCandidateAssets, selectedAssetsFullList, showOnlySelected, searchFilter]);

  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    if (!newCourseId) {
      setAdvisorName('');
      setIsEditingAdvisor(false);
      return;
    }
    const currentCourses = Array.isArray(courseList) ? courseList : [];
    const sel = currentCourses.find((c) => c && c.id === newCourseId);
    if (sel) {
      const teacher =
        sel.instructorName ||
        (Array.isArray(sel.instructors) && sel.instructors[0]?.user?.name) ||
        '';
      if (teacher) {
        setAdvisorName(formatTeacherName(teacher));
        setIsEditingAdvisor(false);
      } else {
        setAdvisorName('');
        setIsEditingAdvisor(true);
      }
    }
  };

  const toggleSelectAsset = (id: string) => {
    if (selectedAssetIds.includes(id)) {
      setSelectedAssetIds(selectedAssetIds.filter((aId) => aId !== id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredAssets.map((a) => a.id);
    if (filteredIds.length === 0) return;
    const allSelected = filteredIds.every((id) => selectedAssetIds.includes(id));
    if (allSelected) {
      setSelectedAssetIds(selectedAssetIds.filter((id) => !filteredIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedAssetIds, ...filteredIds]));
      setSelectedAssetIds(merged);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      alert('กรุณาเลือกรายวิชา');
      return;
    }
    if (!targetLocation || !targetLocation.trim()) {
      alert('กรุณาเลือกห้องปฏิบัติการ');
      return;
    }
    if (selectedAssetIds.length === 0) {
      alert('กรุณาเลือกอุปกรณ์หรือหุ่นจำลองอย่างน้อย 1 ชิ้น');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        courseId,
        advisorName: advisorName ? formatTeacherName(advisorName) : null,
        purpose,
        targetLocation: targetLocation.trim(),
        borrowDate,
        expectedReturnDate,
        assetIds: selectedAssetIds,
      };

      const res = await fetch('/api/borrow/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('จัดสรรครุภัณฑ์ประจำวิชาตลอดเทอมเรียบร้อยแล้ว');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการจัดสรรครุภัณฑ์');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                จัดสรรครุภัณฑ์ประจำรายวิชาตลอดภาคการศึกษา (Course Allocation)
              </h3>
              <p className="text-xs text-slate-500">
                ย้ายตำแหน่งหุ่นและอุปกรณ์ไปตั้งประจำห้องปฏิบัติการตลอดเทอม โดยไม่ต้องกดยืม-คืนทุกวัน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Course & Room Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>รายวิชาที่จัดสรร <span className="text-rose-500">*</span></span>
              </label>
              <select
                required
                value={courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- กรุณาเลือกรายวิชา --</option>
                {Array.isArray(courseList) &&
                  courseList.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name} {c.instructorName ? `(${formatTeacherName(c.instructorName)})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>ห้องปฏิบัติการที่นำไปติดตั้งประจำ <span className="text-rose-500">*</span></span>
              </label>
              <select
                required
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- กรุณาเลือกห้องปฏิบัติการ --</option>
                {Array.isArray(rooms) &&
                  rooms.map((r) => {
                    const roomLabel = r.code ? `[${r.code}] ${r.name}` : r.name;
                    return (
                      <option key={r.id} value={roomLabel}>
                        {roomLabel} {r.location ? `(${r.location})` : ''}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Advisor Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>อาจารย์ผู้รับผิดชอบ</span>
                </label>
                {courseId && advisorName && !isEditingAdvisor && (
                  <button
                    type="button"
                    onClick={() => setIsEditingAdvisor(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>แก้ไขอาจารย์</span>
                  </button>
                )}
                {isEditingAdvisor && courseId && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentCourses = Array.isArray(courseList) ? courseList : [];
                      const sel = currentCourses.find((c) => c && c.id === courseId);
                      const teacher =
                        sel?.instructorName ||
                        (Array.isArray(sel?.instructors) && sel?.instructors[0]?.user?.name) ||
                        '';
                      if (teacher) {
                        setAdvisorName(formatTeacherName(teacher));
                        setIsEditingAdvisor(false);
                      }
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 flex items-center gap-1 cursor-pointer"
                  >
                    <span>ใช้ค่าเริ่มต้น</span>
                  </button>
                )}
              </div>

              {courseId && advisorName && !isEditingAdvisor ? (
                <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 truncate">
                      {formatTeacherName(advisorName)}
                    </span>
                    <span className="text-[10px] bg-indigo-200/70 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                      เลือกให้อัตโนมัติ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingAdvisor(true)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer ml-1"
                  >
                    แก้ไข
                  </button>
                </div>
              ) : (
                <select
                  value={advisorName}
                  onChange={(e) => setAdvisorName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- กรุณาเลือกอาจารย์ผู้รับผิดชอบ --</option>
                  {advisorName && !instructors.some((ins) => (ins && formatTeacherName(ins) === advisorName) || ins?.name === advisorName) && (
                    <option value={advisorName}>
                      {formatTeacherName(advisorName)} (อาจารย์ประจำรายวิชา)
                    </option>
                  )}
                  {Array.isArray(instructors) &&
                    instructors
                      .filter((ins) => Boolean(ins && (ins.name || ins.id)))
                      .map((ins, idx) => {
                        const formatted = formatTeacherName(ins);
                        return (
                          <option key={ins.id || `ins-${idx}`} value={formatted}>
                            {formatted} ({ins.department || 'อาจารย์พยาบาล'})
                          </option>
                        );
                      })}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>วันที่เริ่มจัดสรร (วันเปิดเทอม)</span>
              </label>
              <input
                type="date"
                required
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>กำหนดส่งคืน (วันปิดเทอม / จบ OSCE)</span>
              </label>
              <input
                type="date"
                required
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Asset Selection Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Title & Selected Counter */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>เลือกครุภัณฑ์และหุ่นจำลองที่ต้องการจัดสรร</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black border border-indigo-200/60 dark:border-indigo-800">
                  เลือกแล้ว {selectedAssetIds.length} ชิ้น
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedAssetIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer border ${
                      showOnlySelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{showOnlySelected ? 'แสดงทั้งหมด' : `ดูเฉพาะที่เลือก (${selectedAssetIds.length})`}</span>
                  </button>
                )}
                {filteredAssets.length > 0 && !showOnlySelected && (
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                  >
                    {filteredAssets.every((a) => selectedAssetIds.includes(a.id))
                      ? `ยกเลิกทั้งหมด (${filteredAssets.length} ชิ้น)`
                      : `เลือกทั้งหมดในหมวดนี้ (${filteredAssets.length} ชิ้น)`}
                  </button>
                )}
              </div>
            </div>

            {/* Two-Level Filter: 1. Category Dropdown & 2. Item Dropdown (Like Borrow modal) */}
            <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Category Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>1. เลือกประเภท / หมวดหมู่หุ่น</span>
                  </label>
                  <select
                    value={selectedCategoryId}
                    disabled={showOnlySelected}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value);
                      setSelectedItemId(''); // reset specific item
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="">-- ทุกประเภท / ทุกหมวดหมู่ ({totalAssetsCount} ชิ้น) --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        📁 {cat.name} ({cat.assetCount} ชิ้น)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Specific Equipment Model Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>2. เลือกรายการหุ่น / ครุภัณฑ์</span>
                  </label>
                  <select
                    value={selectedItemId}
                    disabled={showOnlySelected}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="">-- ทุกรายการในประเภทนี้ ({itemsInSelectedCategory.length} รายการ) --</option>
                    {itemsInSelectedCategory.map((it: any) => {
                      const count = (it.availableAssets || it.assets || []).length;
                      return (
                        <option key={it.id} value={it.id}>
                          [{it.code}] {it.name} (พร้อมใช้ {count} {it.unit || 'ชิ้น'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* 3. Search Filter */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาด่วนด้วยรหัสครุภัณฑ์ หรือชื่อหุ่น (เช่น หุ่นทำคลอด, EQ-MNK-001)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-200"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Assets List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
              {loadingAssets ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  กำลังโหลดรายการครุภัณฑ์พร้อมใช้...
                </div>
              ) : filteredAssets.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredAssets.map((asset) => {
                    const isChecked = selectedAssetIds.includes(asset.id);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => toggleSelectAsset(asset.id)}
                        className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/50 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                          )}
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                            {asset.assetCode}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 truncate">
                            {asset.itemName}
                          </span>
                          {asset.categoryName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 truncate hidden sm:inline-block">
                              {asset.categoryName}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                          {asset.location ? `ที่ตั้ง: ${asset.location}` : 'คลังพัสดุ'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-medium text-slate-600 dark:text-slate-400">
                    {showOnlySelected
                      ? 'ยังไม่ได้เลือกครุภัณฑ์หรือหุ่นจำลอง'
                      : 'ไม่พบคลังครุภัณฑ์พร้อมใช้ที่ตรงกับเงื่อนไขการค้นหา'}
                  </p>
                  {(selectedCategoryId || selectedItemId || searchFilter) && !showOnlySelected && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId('');
                        setSelectedItemId('');
                        setSearchFilter('');
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      ล้างตัวกรองทั้งหมด
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || selectedAssetIds.length === 0}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกและจัดสรร...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ยืนยันจัดสรรประจำวิชา ({selectedAssetIds.length} ชิ้น)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
