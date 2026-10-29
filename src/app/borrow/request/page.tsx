'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { formatTeacherName, formatUserName } from '@/lib/user-utils';
import {
  ArrowLeft,
  Package,
  Boxes,
  Plus,
  Trash2,
  Calendar,
  BookOpen,
  User,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  Building2,
  Search,
  ShoppingCart,
  ChevronRight,
  RotateCcw,
  Edit3,
  AlertTriangle,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

function BorrowRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode'); // 'BORROW' | 'REQUISITION'
  const preselectedItemId = searchParams.get('itemId');

  const { currentUser, isTeacher } = useAuth();
  const isStudent = currentUser?.role === 'USER' && !isTeacher;

  // Loading States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Master Data
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [consumablesList, setConsumablesList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [useTarget, setUseTarget] = useState<'SIMULATION' | 'HUMAN'>('SIMULATION');
  const [borrowDate, setBorrowDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');

  // Item Rows
  const [borrowItems, setBorrowItems] = useState<{ itemId: string; quantity: number | string; categoryId?: string }[]>([
    { itemId: '', quantity: '', categoryId: '' },
  ]);
  const [requisitionItems, setRequisitionItems] = useState<
    {
      itemId: string;
      quantity: number | string;
      isSubUnit?: boolean;
      requestedUnit?: string;
      categoryId?: string;
    }[]
  >([{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '', categoryId: '' }]);

  const draftKey = `unified_borrow_request_draft_${currentUser?.id || 'guest'}`;

  // 1. Fetch Master Data & Draft
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      try {
        const [eqRes, conRes, cRes, insRes] = await Promise.all([
          fetch('/api/items?type=EQUIPMENT&compact=true'),
          fetch('/api/items?type=CONSUMABLE&compact=true'),
          fetch('/api/courses?compact=true'),
          fetch('/api/users?role=INSTRUCTOR'),
        ]);

        let eqData: any[] = [];
        let conData: any[] = [];
        if (eqRes.ok && isMounted) {
          const raw = await eqRes.json();
          eqData = raw.filter((e: any) => e.isBorrowable !== false);
          setEquipmentList(eqData);
        }
        if (conRes.ok && isMounted) {
          conData = await conRes.json();
          setConsumablesList(conData);
        }
        if (cRes.ok && isMounted) setCourses(await cRes.json());
        if (insRes.ok && isMounted) setInstructors(await insRes.json());

        // Restore draft from sessionStorage
        const savedDraft = sessionStorage.getItem(draftKey);
        if (savedDraft && isMounted) {
          try {
            const parsed = JSON.parse(savedDraft);
            if (parsed.courseId) setCourseId(parsed.courseId);
            if (parsed.advisorName) setAdvisorName(parsed.advisorName);
            if (parsed.purpose) setPurpose(parsed.purpose);
            if (parsed.useTarget) setUseTarget(parsed.useTarget);
            if (parsed.borrowDate) setBorrowDate(parsed.borrowDate);
            if (parsed.expectedReturnDate) setExpectedReturnDate(parsed.expectedReturnDate);
            if (Array.isArray(parsed.borrowItems) && parsed.borrowItems.length > 0) {
              setBorrowItems(parsed.borrowItems);
            }
            if (Array.isArray(parsed.requisitionItems) && parsed.requisitionItems.length > 0) {
              setRequisitionItems(parsed.requisitionItems);
            }
          } catch {}
        } else if (preselectedItemId && isMounted) {
          // Pre-populate if passed from catalog
          const isEq = eqData.some((e: any) => e.id === preselectedItemId);
          if (isEq) {
            const it = eqData.find((e: any) => e.id === preselectedItemId);
            setBorrowItems([{ itemId: preselectedItemId, quantity: 1, categoryId: it?.categoryId || it?.category?.id || '' }]);
          } else {
            const it = conData.find((c: any) => c.id === preselectedItemId);
            setRequisitionItems([{ itemId: preselectedItemId, quantity: 1, isSubUnit: false, requestedUnit: '', categoryId: it?.categoryId || it?.category?.id || '' }]);
          }
        }
      } catch (err) {
        console.error('Failed to load borrow request data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [preselectedItemId]);

  // 2. Auto-save Draft
  useEffect(() => {
    if (!loading && currentUser?.id) {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          courseId,
          advisorName,
          purpose,
          useTarget,
          borrowDate,
          expectedReturnDate,
          borrowItems,
          requisitionItems,
        })
      );
    }
  }, [courseId, advisorName, purpose, useTarget, borrowDate, expectedReturnDate, borrowItems, requisitionItems, loading, currentUser?.id]);

  // Calculations: Consumable cost & active item counts
  const validBorrowCount = borrowItems.filter((i) => i.itemId && Number(i.quantity) > 0).length;
  const validReqCount = requisitionItems.filter((i) => i.itemId && Number(i.quantity) > 0).length;

  const totalEstimatedCost = useMemo(() => {
    return requisitionItems.reduce((sum, row) => {
      if (!row.itemId) return sum;
      const it = consumablesList.find((c) => c.id === row.itemId);
      const q = Number(row.quantity) || 0;
      if (!it) return sum;
      const ratio = Number(it.conversionRatio) > 0 ? Number(it.conversionRatio) : 1;
      const costPerUnit = row.isSubUnit ? (it.unitCost || 0) / ratio : (it.unitCost || 0);
      return sum + costPerUnit * q;
    }, 0);
  }, [requisitionItems, consumablesList]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (validBorrowCount === 0 && validReqCount === 0) {
      alert('กรุณาเลือกรายการครุภัณฑ์หรือวัสดุสิ้นเปลืองอย่างน้อย 1 รายการพร้อมระบุจำนวน');
      return;
    }

    if (isStudent && !advisorName?.trim()) {
      alert('⚠️ เนื่องจากท่านเป็นนิสิต กรุณาระบุหรือเลือกอาจารย์ผู้รับรอง/อาจารย์ประจำวิชา');
      return;
    }

    if (!purpose?.trim()) {
      alert('กรุณาระบุวัตถุประสงค์ในการขอยืม/เบิกพัสดุ');
      return;
    }

    setSubmitting(true);
    try {
      const activeBorrowItems = borrowItems
        .filter((it) => it.itemId && Number(it.quantity) > 0)
        .map((it) => ({ itemId: it.itemId, quantity: Number(it.quantity) }));

      const activeReqItems = requisitionItems
        .filter((it) => it.itemId && Number(it.quantity) > 0)
        .map((it) => ({
          itemId: it.itemId,
          quantity: Number(it.quantity),
          isSubUnit: !!it.isSubUnit,
          requestedUnit: it.requestedUnit || '',
        }));

      const res = await fetch('/api/requests/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          courseId: courseId || null,
          advisorName: advisorName ? formatTeacherName(advisorName) : null,
          purpose,
          useTarget,
          borrowDate: borrowDate || null,
          expectedReturnDate: expectedReturnDate || null,
          borrowItems: activeBorrowItems,
          requisitionItems: activeReqItems,
        }),
      });

      if (res.ok) {
        sessionStorage.removeItem(draftKey);
        alert('ส่งคำขอยืม-เบิกพัสดุสำเร็จ! รออาจารย์และเจ้าหน้าที่พิจารณาอนุมัติ');
        router.push('/borrow');
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการส่งคำขอ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <LoadingSpinner />
        <p className="mt-4 text-sm font-medium">กำลังเตรียมฟอร์มยืม-เบิกพัสดุ...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-36 md:pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/borrow"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับหน้ารายการยืม-คืน
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> ฟอร์มรวมยืมครุภัณฑ์ & เบิกวัสดุ
        </span>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-3xl p-6 md:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-semibold mb-3">
              <Boxes className="w-3.5 h-3.5" /> ระบบบริการยืม-คืนและเบิกจ่ายพัสดุ
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              ยื่นคำขอยืมครุภัณฑ์และเบิกวัสดุ
            </h1>
            <p className="text-indigo-100 text-sm mt-1">
              ทำรายการยืมอุปกรณ์ฝึกและขอเบิกเวชภัณฑ์สิ้นเปลืองพร้อมกันในใบคำขอเดียว
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-2 min-w-[220px] border border-white/20 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-indigo-100 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> ครุภัณฑ์ที่ขอยืม:
              </span>
              <span className="font-bold px-2 py-0.5 rounded-full bg-white/20">{validBorrowCount} รายการ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-indigo-100 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" /> วัสดุสิ้นเปลือง:
              </span>
              <span className="font-bold px-2 py-0.5 rounded-full bg-white/20">{validReqCount} รายการ</span>
            </div>
            {totalEstimatedCost > 0 && (
              <div className="pt-2 border-t border-white/20 flex items-center justify-between font-bold text-amber-200">
                <span>มูลค่าประมาณการ:</span>
                <span>฿{totalEstimatedCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: Academic & Purpose Context */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-900">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">ข้อมูลรายวิชาและวัตถุประสงค์การใช้งาน</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">ระบุวิชา อาจารย์ที่ปรึกษา และเป้าหมายการนำพัสดุไปใช้งาน</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Course */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> รายวิชาที่ขอใช้
              </label>
              <select
                value={courseId}
                onChange={(e) => {
                  const cId = e.target.value;
                  setCourseId(cId);
                  const selectedCourse = courses.find((c) => c.id === cId);
                  if (selectedCourse?.instructorName) {
                    setAdvisorName(formatTeacherName(selectedCourse.instructorName));
                    setIsEditingAdvisor(false);
                  } else if (!cId) {
                    setAdvisorName('');
                  }
                }}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- ไม่ระบุรายวิชา (ฝึกปฏิบัติส่วนบุคคล/กิจกรรมอื่น) --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} {c.name} ({formatTeacherName(c.instructorName || 'อ.ผู้รับผิดชอบ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Advisor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-500" /> อาจารย์ผู้รับทราบ / ประจำวิชา {isStudent && <span className="text-rose-500">*</span>}
                </label>
                {courseId && (
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

              {courseId && !isEditingAdvisor ? (
                <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="font-bold text-teal-900 dark:text-teal-200 text-sm">
                      {formatTeacherName(advisorName || courses.find((c) => c.id === courseId)?.instructorName || 'อาจารย์ผู้รับผิดชอบ')}
                    </span>
                    <span className="text-[10px] bg-teal-200/60 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-md font-bold">
                      ขึ้นให้อัตโนมัติ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingAdvisor(true)}
                    className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                  >
                    แก้ไขอาจารย์
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <select
                    required={isStudent}
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${
                      isStudent && !advisorName
                        ? 'border-amber-300 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-900/50'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">-- กรุณาเลือกอาจารย์จากรายชื่อ --</option>
                    {advisorName && !instructors.some((ins) => formatTeacherName(ins) === advisorName || ins.name === advisorName) && (
                      <option value={advisorName}>
                        {formatTeacherName(advisorName)} (อาจารย์ประจำรายวิชา)
                      </option>
                    )}
                    {instructors.map((ins) => {
                      const formatted = formatTeacherName(ins);
                      return (
                        <option key={ins.id} value={formatted}>
                          {formatted} ({ins.department || 'อาจารย์พยาบาล'})
                        </option>
                      );
                    })}
                  </select>
                  {courseId && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const sc = courses.find((c) => c.id === courseId);
                          if (sc?.instructorName) setAdvisorName(formatTeacherName(sc.instructorName));
                          setIsEditingAdvisor(false);
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                      >
                        ↺ กลับไปใช้อาจารย์ประจำวิชา ({formatTeacherName(courses.find((c) => c.id === courseId)?.instructorName)})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Purpose */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                วัตถุประสงค์ในการยืม-เบิก <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="เช่น ใช้ฝึกหัตถการเย็บแผลและตรวจคัดกรองสัญญาณชีพในชั่วโมงฝึกทักษะด้วยตนเอง"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Use Target & Dates */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                เป้าหมายการใช้งาน
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUseTarget('SIMULATION')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                    useTarget === 'SIMULATION'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🤖 หุ่นฝึกเสมือนจริง (Simulation)
                </button>
                <button
                  type="button"
                  onClick={() => setUseTarget('HUMAN')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                    useTarget === 'HUMAN'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  👤 ฝึกปฏิบัติกับคนจริง (Human)
                </button>
              </div>
            </div>

            {/* Borrow & Return Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  วันที่ต้องการรับพัสดุ
                </label>
                <input
                  type="date"
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  กำหนดส่งคืน (ครุภัณฑ์)
                </label>
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Equipment Borrow Rows (BLUE THEME) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border-2 border-blue-200 dark:border-blue-900/60 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                2
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  รายการครุภัณฑ์ที่ต้องการยืม (Equipment)
                </h2>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  ✓ เป็นของใช้แล้วต้องนำมาส่งคืนห้องปฏิบัติการ เช่น หุ่นฝึก, ชุดตรวจ, เครื่องวัดความดัน
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBorrowItems([...borrowItems, { itemId: '', quantity: '', categoryId: '' }])}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> เพิ่มครุภัณฑ์
            </button>
          </div>

          <div className="space-y-3">
            {borrowItems.map((row, idx) => {
              const categoryMap = new Map<string, string>();
              equipmentList.forEach((eq) => {
                if (eq.category?.name) categoryMap.set(eq.category.id || eq.category.name, eq.category.name);
              });
              const selectedCat = (row as any).categoryId || '';
              const filteredList = selectedCat
                ? equipmentList.filter((eq) => eq.category?.id === selectedCat || eq.category?.name === selectedCat)
                : equipmentList;

              const chosenEq = equipmentList.find((e) => e.id === row.itemId);
              const isOutOfStock = chosenEq && chosenEq.currentStock <= 0;
              const isOverStock = chosenEq && chosenEq.currentStock > 0 && row.quantity !== '' && Number(row.quantity) > chosenEq.currentStock;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition ${
                    isOutOfStock || isOverStock
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                      : 'bg-blue-50/30 dark:bg-slate-800/60 border-blue-200/80 dark:border-blue-900/50'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    {/* หมวดหมู่ครุภัณฑ์ */}
                    <div className="sm:col-span-4">
                      <select
                        value={selectedCat}
                        onChange={(e) => {
                          const catVal = e.target.value;
                          const updated = [...borrowItems];
                          (updated[idx] as any).categoryId = catVal;
                          setBorrowItems(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- ทุกหมวดครุภัณฑ์ --</option>
                        {Array.from(categoryMap.entries()).map(([id, name]) => (
                          <option key={id} value={id}>📁 {name}</option>
                        ))}
                      </select>
                    </div>

                    {/* รายการครุภัณฑ์ */}
                    <div className="sm:col-span-5">
                      <select
                        value={row.itemId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const eq = equipmentList.find((x) => x.id === val);
                          const updated = [...borrowItems];
                          updated[idx].itemId = val;
                          if (eq && (eq.category?.id || eq.category?.name)) {
                            (updated[idx] as any).categoryId = eq.category.id || eq.category.name;
                          }
                          if (!updated[idx].quantity) updated[idx].quantity = 1;
                          if (eq && eq.currentStock > 0 && row.quantity !== '' && Number(updated[idx].quantity) > eq.currentStock) {
                            updated[idx].quantity = eq.currentStock;
                          }
                          setBorrowItems(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- เลือกครุภัณฑ์ ({filteredList.length}) --</option>
                        {filteredList.map((eq) => {
                          const avail = eq.availableStock ?? eq.currentStock;
                          const isReserved = eq.reservedStock > 0;
                          return (
                            <option key={eq.id} value={eq.id}>
                              {eq.name} (พร้อมให้ยืม {avail} {eq.unit}){isReserved ? ` [รอส่งมอบ ${eq.reservedStock}]` : ''}{avail <= 0 ? ' [คิวเต็ม]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* จำนวน + หน่วย + ลบ */}
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="1"
                          max={chosenEq ? Math.max(1, chosenEq.currentStock) : undefined}
                          placeholder="จำนวน"
                          value={row.quantity}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val = raw === '' ? '' : Math.max(1, parseInt(raw, 10));
                            const updated = [...borrowItems];
                            updated[idx].quantity = val;
                            setBorrowItems(updated);
                          }}
                          className={`w-full px-3 py-2 rounded-xl border text-xs text-center font-bold bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 ${
                            isOverStock || isOutOfStock
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                              : 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                          }`}
                        />
                      </div>
                      <span className="text-xs text-blue-900 dark:text-blue-300 min-w-12 text-center font-bold">
                        {chosenEq?.unit || 'ชิ้น'}
                      </span>
                      {borrowItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBorrowItems(borrowItems.filter((_, i) => i !== idx))}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {chosenEq && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                      {isOutOfStock ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          {chosenEq.physicalStock > 0 && chosenEq.reservedStock > 0
                            ? `มีในคลัง ${chosenEq.physicalStock} ${chosenEq.unit} แต่ถูกจองรอส่งมอบแล้ว ${chosenEq.reservedStock} (ไม่เหลือพร้อมให้ยืม)`
                            : `ไม่มีเครื่องพร้อมใช้งานในขณะนี้`}
                        </span>
                      ) : isOverStock ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          ขอยืมเกินยอดพร้อมใช้ (พร้อมให้ยืม {chosenEq.currentStock} จากคลัง {chosenEq.physicalStock ?? chosenEq.currentStock} {chosenEq.unit}{chosenEq.reservedStock ? ` | รอส่งมอบ ${chosenEq.reservedStock}` : ''})
                        </span>
                      ) : (
                        <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                          พร้อมให้ยืม: <strong className="font-bold text-slate-900 dark:text-slate-100">{chosenEq.currentStock} {chosenEq.unit}</strong>
                          {chosenEq.reservedStock > 0 && (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-md font-semibold">
                              คลัง {chosenEq.physicalStock} | รอส่งมอบ {chosenEq.reservedStock}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Consumables Requisition Rows (TEAL / EMERALD THEME) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border-2 border-teal-200 dark:border-teal-900/60 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-teal-100 dark:border-teal-900/40 pb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/70 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold border border-teal-200 dark:border-teal-800">
                3
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-teal-900 dark:text-teal-200 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  รายการวัสดุสิ้นเปลืองที่ขอเบิก (Consumables)
                </h2>
                <p className="text-xs text-teal-700 dark:text-teal-400">
                  ✓ เป็นพัสดุใช้แล้วหมดไป เช่น ถุงมือ, สำลี, เข็มฉีดยา <strong className="underline">ไม่ต้องนำส่งคืน</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setRequisitionItems([
                  ...requisitionItems,
                  { itemId: '', quantity: '', isSubUnit: false, requestedUnit: '', categoryId: '' },
                ])
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold transition-colors shadow-sm shadow-teal-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> เพิ่มวัสดุสิ้นเปลือง
            </button>
          </div>

          <div className="space-y-3">
            {requisitionItems.map((row, idx) => {
              const categoryMap = new Map<string, string>();
              consumablesList.forEach((c) => {
                if (c.category?.name) categoryMap.set(c.category.id || c.category.name, c.category.name);
              });
              const selectedCat = (row as any).categoryId || '';
              const filteredList = selectedCat
                ? consumablesList.filter((c) => c.category?.id === selectedCat || c.category?.name === selectedCat)
                : consumablesList;

              const chosenItem = consumablesList.find((c) => c.id === row.itemId);
              const ratio = Number(chosenItem?.conversionRatio) > 0 ? Number(chosenItem.conversionRatio) : 1;
              const canSubUnit = !!(chosenItem && ratio > 1 && chosenItem.usageUnit && chosenItem.usageUnit !== chosenItem.unit);
              const isSub = row.isSubUnit === true;
              const availablePieces = chosenItem ? (chosenItem.currentStock * ratio) + (chosenItem.openPackRemainder || 0) : 0;
              const maxStock = isSub ? availablePieces : (chosenItem?.currentStock || 0);
              const isOutOfStock = chosenItem && maxStock <= 0;
              const isOverStock = chosenItem && maxStock > 0 && row.quantity !== '' && Number(row.quantity) > maxStock;
              const currentUnitLabel = isSub ? (chosenItem?.usageUnit || 'ชิ้น') : (chosenItem?.unit || 'หน่วย');
              const costPerUnit = isSub ? (chosenItem?.unitCost || 0) / ratio : (chosenItem?.unitCost || 0);

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition ${
                    isOutOfStock || isOverStock
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                      : 'bg-teal-50/30 dark:bg-slate-800/60 border-teal-200/80 dark:border-teal-900/50'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    {/* หมวดหมู่วัสดุสิ้นเปลือง */}
                    <div className="sm:col-span-4">
                      <select
                        value={selectedCat}
                        onChange={(e) => {
                          const catVal = e.target.value;
                          const updated = [...requisitionItems];
                          (updated[idx] as any).categoryId = catVal;
                          setRequisitionItems(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">-- ทุกหมวดวัสดุ --</option>
                        {Array.from(categoryMap.entries()).map(([id, name]) => (
                          <option key={id} value={id}>📁 {name}</option>
                        ))}
                      </select>
                    </div>

                    {/* รายการวัสดุสิ้นเปลือง */}
                    <div className="sm:col-span-5">
                      <select
                        value={row.itemId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const it = consumablesList.find((x) => x.id === val);
                          const updated = [...requisitionItems];
                          updated[idx].itemId = val;
                          if (it && (it.category?.id || it.category?.name)) {
                            (updated[idx] as any).categoryId = it.category.id || it.category.name;
                          }
                          updated[idx].isSubUnit = false;
                          updated[idx].requestedUnit = it?.unit || '';
                          if (!updated[idx].quantity) updated[idx].quantity = 1;
                          if (it && it.currentStock > 0 && row.quantity !== '' && Number(updated[idx].quantity) > it.currentStock) {
                            updated[idx].quantity = it.currentStock;
                          }
                          setRequisitionItems(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">-- เลือกรายการวัสดุ ({filteredList.length}) --</option>
                        {filteredList.map((c) => {
                          const avail = c.availableStock ?? c.currentStock;
                          const isReserved = c.reservedStock > 0;
                          const r = Number(c.conversionRatio) > 0 ? Number(c.conversionRatio) : 1;
                          const subNote = r > 1 && c.usageUnit ? ` [1 ${c.unit} = ${r} ${c.usageUnit}]` : '';
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} (พร้อมเบิก: {avail} {c.unit}){subNote}{isReserved ? ` [รอจ่าย ${c.reservedStock}]` : ''}{avail <= 0 ? ' [คิวเต็ม/หมด]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* จำนวน + หน่วย + Subunit Toggle + ลบ */}
                    <div className="sm:col-span-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="number"
                            min="1"
                            max={chosenItem ? Math.max(1, maxStock) : undefined}
                            placeholder="จำนวน"
                            value={row.quantity}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const val = raw === '' ? '' : Math.max(1, parseInt(raw, 10));
                              const updated = [...requisitionItems];
                              updated[idx].quantity = val;
                              setRequisitionItems(updated);
                            }}
                            className={`w-full px-3 py-2 rounded-xl border text-xs text-center font-bold bg-white dark:bg-slate-900 focus:ring-2 focus:ring-teal-500 ${
                              isOverStock || isOutOfStock
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                : 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                            }`}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 min-w-10 text-center">
                          {currentUnitLabel}
                        </span>
                        {requisitionItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRequisitionItems(requisitionItems.filter((_, i) => i !== idx))}
                            className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {canSubUnit && (
                        <div className="flex items-center justify-end gap-1 text-[10px]">
                          <span className="text-slate-400 text-[9px]">หน่วย:</span>
                          <div className="inline-flex rounded-md p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...requisitionItems];
                                updated[idx].isSubUnit = false;
                                updated[idx].requestedUnit = chosenItem.unit;
                                if (updated[idx].quantity !== '' && Number(updated[idx].quantity) > chosenItem.currentStock) {
                                  updated[idx].quantity = chosenItem.currentStock;
                                }
                                setRequisitionItems(updated);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                !isSub
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-teal-700'
                              }`}
                            >
                              📦 {chosenItem.unit}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...requisitionItems];
                                updated[idx].isSubUnit = true;
                                updated[idx].requestedUnit = chosenItem.usageUnit;
                                setRequisitionItems(updated);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                isSub
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-teal-700'
                              }`}
                            >
                              ✨ {chosenItem.usageUnit} (ย่อย)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {chosenItem && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                      {isOutOfStock ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {chosenItem.physicalStock > 0 && chosenItem.reservedStock > 0
                            ? `มีในคลัง ${chosenItem.physicalStock} ${chosenItem.unit} แต่มีคำขอรอจ่ายแล้ว ${chosenItem.reservedStock} (ไม่เหลือพร้อมให้เบิก)`
                            : `วัสดุนี้หมดในคลัง ไม่สามารถเบิกได้`}
                        </span>
                      ) : isOverStock ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          ขอเกินยอดพร้อมเบิก (พร้อมขอ {maxStock} {currentUnitLabel})
                        </span>
                      ) : (
                        <span className="text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                          พร้อมเบิก: <strong className="font-bold text-slate-900 dark:text-slate-100">{maxStock} {currentUnitLabel}</strong>
                          {canSubUnit && (
                            <span className="text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded-md font-semibold">
                              1 {chosenItem.unit} = {ratio} {chosenItem.usageUnit}
                              {(chosenItem.openPackRemainder || 0) > 0 && ` | มีเศษเปิดอยู่ ${chosenItem.openPackRemainder} ${chosenItem.usageUnit}`}
                            </span>
                          )}
                        </span>
                      )}
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        ประมาณการ: ฿{(costPerUnit * (Number(row.quantity) || 0)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky Mobile Bottom Bar (Positioned above Mobile BottomNav) */}
        <div className="fixed bottom-[58px] md:bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <Link
              href="/borrow"
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </Link>

            <button
              type="submit"
              disabled={submitting || (validBorrowCount === 0 && validReqCount === 0)}
              className="flex-1 sm:flex-none sm:min-w-[260px] px-5 sm:px-6 py-2.5 sm:py-3.5 bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner /> กำลังส่งคำขอ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> ยื่นคำขอยืม-เบิก ({validBorrowCount + validReqCount} รายการ)
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function BorrowRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
          <LoadingSpinner />
          <p className="mt-4 text-sm font-medium">กำลังเตรียมฟอร์มยืม-เบิกพัสดุ...</p>
        </div>
      }
    >
      <BorrowRequestContent />
    </Suspense>
  );
}
