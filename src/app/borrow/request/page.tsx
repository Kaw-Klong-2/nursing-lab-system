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
  const [borrowItems, setBorrowItems] = useState<{ itemId: string; quantity: number | string }[]>([
    { itemId: '', quantity: '' },
  ]);
  const [requisitionItems, setRequisitionItems] = useState<
    {
      itemId: string;
      quantity: number | string;
      isSubUnit?: boolean;
      requestedUnit?: string;
    }[]
  >([{ itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' }]);

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
          const isEq = eqData.some((e) => e.id === preselectedItemId);
          if (isEq) {
            setBorrowItems([{ itemId: preselectedItemId, quantity: 1 }]);
          } else {
            setRequisitionItems([{ itemId: preselectedItemId, quantity: 1, isSubUnit: false, requestedUnit: '' }]);
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
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-32">
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
                  const selC = courses.find((c) => c.id === cId);
                  if (selC?.instructorName) setAdvisorName(selC.instructorName);
                }}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- ไม่ระบุรายวิชา (ฝึกปฏิบัติส่วนบุคคล) --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Advisor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" /> อาจารย์ผู้รับรอง / ประจำวิชา {isStudent && <span className="text-rose-500">*</span>}
              </label>

              {isEditingAdvisor ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    required={isStudent}
                    placeholder="ระบุชื่ออาจารย์ (เช่น อ.ดร. นันทนา)"
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingAdvisor(false)}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-200"
                  >
                    เลือกจากรายชื่อ
                  </button>
                </div>
              ) : (
                <select
                  value={advisorName}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsEditingAdvisor(true);
                      setAdvisorName('');
                    } else {
                      setAdvisorName(e.target.value);
                    }
                  }}
                  required={isStudent}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- เลือกอาจารย์ผู้รับรอง --</option>
                  {instructors.map((ins) => (
                    <option key={ins.id} value={ins.name}>
                      {formatTeacherName(ins.name)}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ ระบุชื่ออาจารย์ด้วยตนเอง</option>
                </select>
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

        {/* SECTION 2: Equipment Borrow Rows */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-900">
                2
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">รายการครุภัณฑ์ที่ต้องการยืม (Equipment)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">ต้องส่งคืนหลังเสร็จสิ้นการฝึกปฏิบัติ</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBorrowItems([...borrowItems, { itemId: '', quantity: '' }])}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> เพิ่มครุภัณฑ์
            </button>
          </div>

          <div className="space-y-3">
            {borrowItems.map((row, idx) => {
              const selectedEq = equipmentList.find((e) => e.id === row.itemId);
              const maxStock = selectedEq?.currentStock || 0;
              const isOverStock = selectedEq && Number(row.quantity) > maxStock;

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl"
                >
                  <div className="flex-1">
                    <select
                      value={row.itemId}
                      onChange={(e) => {
                        const newRows = [...borrowItems];
                        newRows[idx].itemId = e.target.value;
                        if (!newRows[idx].quantity) newRows[idx].quantity = 1;
                        setBorrowItems(newRows);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- เลือกครุภัณฑ์ --</option>
                      {equipmentList.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} (คงเหลือ: {eq.currentStock} {eq.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-28">
                      <input
                        type="number"
                        min="1"
                        max={maxStock || 99}
                        placeholder="จำนวน"
                        value={row.quantity}
                        onChange={(e) => {
                          const newRows = [...borrowItems];
                          newRows[idx].quantity = e.target.value;
                          setBorrowItems(newRows);
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs text-center font-bold bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 ${
                          isOverStock ? 'border-red-500 text-red-600' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-12 text-center">
                      {selectedEq?.unit || 'ชิ้น'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBorrowItems(borrowItems.filter((_, i) => i !== idx))}
                      disabled={borrowItems.length === 1 && !row.itemId}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Consumables Requisition Rows */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-900">
                3
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">รายการวัสดุสิ้นเปลืองที่ขอเบิก (Consumables)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">เวชภัณฑ์และวัสดุใช้แล้วหมดไป ไม่ต้องส่งคืน</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setRequisitionItems([
                  ...requisitionItems,
                  { itemId: '', quantity: '', isSubUnit: false, requestedUnit: '' },
                ])
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> เพิ่มวัสดุสิ้นเปลือง
            </button>
          </div>

          <div className="space-y-3">
            {requisitionItems.map((row, idx) => {
              const selectedCon = consumablesList.find((c) => c.id === row.itemId);
              const ratio = Number(selectedCon?.conversionRatio) > 0 ? Number(selectedCon.conversionRatio) : 1;
              const hasSubUnit = selectedCon?.usageUnit && selectedCon.usageUnit !== selectedCon.unit;

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl"
                >
                  <div className="flex-1">
                    <select
                      value={row.itemId}
                      onChange={(e) => {
                        const newRows = [...requisitionItems];
                        newRows[idx].itemId = e.target.value;
                        if (!newRows[idx].quantity) newRows[idx].quantity = 1;
                        newRows[idx].isSubUnit = false;
                        setRequisitionItems(newRows);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- เลือกวัสดุสิ้นเปลือง --</option>
                      {consumablesList.map((con) => (
                        <option key={con.id} value={con.id}>
                          {con.name} (สต็อก: {con.currentStock} {con.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        placeholder="จำนวน"
                        value={row.quantity}
                        onChange={(e) => {
                          const newRows = [...requisitionItems];
                          newRows[idx].quantity = e.target.value;
                          setRequisitionItems(newRows);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-center font-bold bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Unit Switcher */}
                    {hasSubUnit ? (
                      <button
                        type="button"
                        onClick={() => {
                          const newRows = [...requisitionItems];
                          newRows[idx].isSubUnit = !newRows[idx].isSubUnit;
                          newRows[idx].requestedUnit = newRows[idx].isSubUnit ? selectedCon?.usageUnit : selectedCon?.unit;
                          setRequisitionItems(newRows);
                        }}
                        className="px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
                      >
                        {row.isSubUnit ? selectedCon?.usageUnit : selectedCon?.unit} ⇄
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-12 text-center">
                        {selectedCon?.unit || 'ชิ้น'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setRequisitionItems(requisitionItems.filter((_, i) => i !== idx))}
                      disabled={requisitionItems.length === 1 && !row.itemId}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky Mobile Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <Link
              href="/borrow"
              className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </Link>

            <button
              type="submit"
              disabled={submitting || (validBorrowCount === 0 && validReqCount === 0)}
              className="flex-1 sm:flex-none sm:min-w-[260px] px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner /> กำลังส่งคำขอ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> ยื่นคำขอยืม-เบิก ({validBorrowCount + validReqCount} รายการ)
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
