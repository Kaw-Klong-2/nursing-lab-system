'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { formatTeacherName, formatUserName } from '@/lib/user-utils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Building2,
  Users,
  Stethoscope,
  BookOpen,
  GraduationCap,
  Boxes,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

function PracticeBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slotId = searchParams.get('slotId');

  const { currentUser, isTeacher } = useAuth();
  const isStudent = currentUser?.role === 'USER' && !isTeacher;

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slot, setSlot] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [practiceKits, setPracticeKits] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Form State
  const [bookingForm, setBookingForm] = useState({
    skillTopic: '',
    isCustomSkill: false,
    customSkillText: '',
    objectives: '',
    advisorName: '',
    courseId: '',
    practiceKitId: '',
    additionalEquipment: '',
  });
  const [isEditingAdvisor, setIsEditingAdvisor] = useState(false);

  // Group Companions State
  const [selectedCompanions, setSelectedCompanions] = useState<any[]>([]);
  const [companionSearchQuery, setCompanionSearchQuery] = useState('');

  // Draft auto-save key
  const draftKey = `practice_booking_draft_${slotId || 'general'}`;

  // 1. Fetch Slot & Lookup Data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [coursesRes, kitsRes, instRes, usersRes] = await Promise.all([
          fetch('/api/courses?compact=true'),
          fetch('/api/kits'),
          fetch('/api/users?role=APPROVER'),
          fetch('/api/users?role=USER'),
        ]);

        if (coursesRes.ok && isMounted) setCourses(await coursesRes.json());
        if (kitsRes.ok && isMounted) setPracticeKits(await kitsRes.json());
        if (instRes.ok && isMounted) setInstructors(await instRes.json());
        if (usersRes.ok && isMounted) setAllStudents(await usersRes.json());

        if (slotId) {
          const slotRes = await fetch(`/api/practice/slots?id=${slotId}`);
          if (slotRes.ok) {
            const data = await slotRes.json();
            const foundSlot = Array.isArray(data) ? data.find((s: any) => s.id === slotId) || data[0] : data;
            if (isMounted) setSlot(foundSlot);

            // Check draft in sessionStorage
            const cachedDraft = sessionStorage.getItem(draftKey);
            if (cachedDraft && isMounted) {
              try {
                const parsed = JSON.parse(cachedDraft);
                setBookingForm(parsed.bookingForm || parsed);
                if (parsed.selectedCompanions) setSelectedCompanions(parsed.selectedCompanions);
              } catch {}
            } else if (foundSlot && isMounted) {
              const slotSkills = foundSlot.availableSkills
                ? foundSlot.availableSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [];
              const defaultSkill = slotSkills.length > 0 ? slotSkills[0] : '';
              const matchedKit = kitsRes.ok
                ? (await kitsRes.clone().json()).find((k: any) =>
                    defaultSkill && (k.name.includes(defaultSkill) || defaultSkill.includes(k.name.slice(0, 5)))
                  )
                : null;

              setBookingForm((prev) => ({
                ...prev,
                skillTopic: defaultSkill,
                isCustomSkill: slotSkills.length === 0,
                practiceKitId: matchedKit ? matchedKit.id : '',
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error loading practice booking context:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [slotId]);

  // 2. Auto-save Draft to sessionStorage
  useEffect(() => {
    if (!loading && slotId) {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          bookingForm,
          selectedCompanions,
        })
      );
    }
  }, [bookingForm, selectedCompanions, loading, slotId]);

  // Available skills in this slot
  const slotSkills = useMemo(() => {
    if (!slot?.availableSkills) return [];
    return slot.availableSkills.split(',').map((s: string) => s.trim()).filter(Boolean);
  }, [slot]);

  // Remaining capacity calculation
  const currentSlotBookingsCount = slot?.bookings?.length || 0;
  const maxCap = slot?.maxCapacity || 6;
  const remainingSlots = Math.max(0, maxCap - currentSlotBookingsCount);
  const totalGroupSize = 1 + selectedCompanions.length;
  const isOverCapacity = totalGroupSize > remainingSlots;

  // Filter companions
  const filteredStudents = useMemo(() => {
    if (!companionSearchQuery.trim()) return [];
    const query = companionSearchQuery.toLowerCase();
    return allStudents
      .filter((s) => s.id !== currentUser?.id)
      .filter((s) => !selectedCompanions.some((c) => c.id === s.id))
      .filter((s) => (s.name && s.name.toLowerCase().includes(query)) || (s.email && s.email.toLowerCase().includes(query)))
      .slice(0, 8);
  }, [allStudents, currentUser, selectedCompanions, companionSearchQuery]);

  // Add / Remove companion
  const handleAddCompanion = (student: any) => {
    if (selectedCompanions.length + 1 >= remainingSlots) {
      alert(`ไม่สามารถเพิ่มเพื่อนร่วมกลุ่มได้ เนื่องจากรอบนี้รองรับได้อีกเพียง ${remainingSlots} คน (รวมตัวท่านเอง)`);
      return;
    }
    setSelectedCompanions([...selectedCompanions, student]);
    setCompanionSearchQuery('');
  };

  const handleRemoveCompanion = (studentId: string) => {
    setSelectedCompanions(selectedCompanions.filter((c) => c.id !== studentId));
  };

  // Submit Booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot || !currentUser) return;

    const finalSkill = bookingForm.isCustomSkill
      ? bookingForm.customSkillText.trim()
      : bookingForm.skillTopic;

    if (!finalSkill) {
      alert('กรุณาระบุหัตถการทางการพยาบาลที่ต้องการฝึกปฏิบัติ');
      return;
    }

    if (isStudent && !bookingForm.advisorName?.trim()) {
      alert('⚠️ เนื่องจากท่านเป็นนิสิต กรุณาระบุหรือเลือกอาจารย์ผู้รับรอง/อาจารย์ประจำวิชา (ไม่อนุญาตให้เว้นว่าง)');
      return;
    }

    if (isOverCapacity) {
      alert(`จำนวนสมาชิกในกลุ่ม (${totalGroupSize} คน) เกินที่นั่งว่างที่เปิดรับ (${remainingSlots} ที่นั่ง)`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/practice/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          slotId: slot.id,
          skillTopic: finalSkill,
          objectives: bookingForm.objectives,
          advisorName: bookingForm.advisorName ? formatTeacherName(bookingForm.advisorName) : null,
          courseId: bookingForm.courseId || null,
          practiceKitId: bookingForm.practiceKitId || null,
          additionalEquipment: bookingForm.additionalEquipment || null,
          companionUserIds: selectedCompanions.map((c) => c.id),
        }),
      });

      if (res.ok) {
        sessionStorage.removeItem(draftKey);
        if (selectedCompanions.length > 0) {
          alert(`ยื่นคำขอเข้าฝึกปฏิบัติการสำเร็จ (กลุ่ม ${selectedCompanions.length + 1} คน)! นิสิตทุกคนในกลุ่มจะได้รับ QR Code ประจำตัวหลังจากอาจารย์อนุมัติ`);
        } else {
          alert('ยื่นคำขอเข้าฝึกปฏิบัติด้วยตนเองสำเร็จ! รออาจารย์พิจารณาอนุมัติ');
        }
        router.push('/practice');
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการยื่นคำขอจอง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <LoadingSpinner />
        <p className="mt-4 text-sm font-medium">กำลังโหลดข้อมูลรอบฝึกปฏิบัติการ...</p>
      </div>
    );
  }

  if (!slot && !loading) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900 shadow-xl text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">ไม่พบข้อมูลรอบฝึกปฏิบัติ</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
          รอบเวลาที่ท่านต้องการจองอาจถูกปิด ยกเลิก หรือไม่มีอยู่ในระบบ กรุณาเลือกรอบเวลาจากตารางใหม่อีกครั้ง
        </p>
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> กลับสู่ตารางรอบเวลา
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-36 md:pb-24">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับตารางรอบเวลา
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> ฟอร์มจองรอบฝึกปฏิบัติ
        </span>
      </div>

      {/* Main Context Card (Slot Summary) */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-3xl p-6 md:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-semibold mb-3">
              <Building2 className="w-3.5 h-3.5" /> {slot.room?.name || 'ห้องปฏิบัติการพยาบาล'} (ชั้น {slot.room?.floor || '1'})
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              ยื่นคำขอจองรอบฝึกปฏิบัติการ
            </h1>
            <p className="text-rose-100 text-sm mt-1">
              ฝึกทักษะการพยาบาลด้วยตนเองเดี่ยวหรือกลุ่มเพื่อน พร้อมเบิกชุดฝึกปฏิบัติ
            </p>
          </div>

          {/* Quick Slot Timing Badges */}
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-2 min-w-[240px] border border-white/20">
            <div className="flex items-center gap-2.5 text-sm">
              <Calendar className="w-4 h-4 text-rose-200 shrink-0" />
              <span className="font-semibold">{formatDateDisplay(slot.date)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="w-4 h-4 text-rose-200 shrink-0" />
              <span className="font-semibold">{slot.startTime} - {slot.endTime} น.</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/20 text-xs">
              <span className="text-rose-100 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> ว่างอีก:
              </span>
              <span className={`font-bold px-2 py-0.5 rounded-full ${remainingSlots > 0 ? 'bg-emerald-400/30 text-emerald-100' : 'bg-red-400/30 text-white'}`}>
                {remainingSlots} จาก {maxCap} ที่นั่ง
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: Practice Skills & Objectives */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">ทักษะทางการพยาบาลและวัตถุประสงค์</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">ระบุหัตถการที่ต้องการฝึกซ้อมเพื่อให้ห้องปฏิบัติการจัดเตรียมอุปกรณ์</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              หัตถการทางการพยาบาลที่ต้องการฝึกซ้อม <span className="text-rose-500">*</span>
            </label>

            {slotSkills.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {slotSkills.map((sk: string) => {
                  const isChecked = !bookingForm.isCustomSkill && bookingForm.skillTopic === sk;
                  return (
                    <button
                      type="button"
                      key={sk}
                      onClick={() => {
                        setBookingForm({
                          ...bookingForm,
                          skillTopic: sk,
                          isCustomSkill: false,
                        });
                        // Auto-match Kit
                        const matched = practiceKits.find((k) => k.name.includes(sk) || sk.includes(k.name.slice(0, 5)));
                        if (matched) {
                          setBookingForm((prev) => ({ ...prev, practiceKitId: matched.id }));
                        }
                      }}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm font-semibold transition-all text-left ${
                        isChecked
                          ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{sk}</span>
                      {isChecked && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Skill Option */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={bookingForm.isCustomSkill}
                  onChange={(e) => setBookingForm({ ...bookingForm, isCustomSkill: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                ระบุหัตถการหรือหัวข้อฝึกปฏิบัตินอกเหนือจากรายการที่เปิด
              </label>

              {bookingForm.isCustomSkill && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    required={bookingForm.isCustomSkill}
                    placeholder="เช่น การใส่สายสวนกระเพาะปัสสาวะ (Foley's Catheter), การเจาะน้ำไขสันหลัง"
                    value={bookingForm.customSkillText}
                    onChange={(e) => setBookingForm({ ...bookingForm, customSkillText: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            {/* Objectives */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                วัตถุประสงค์ในการฝึกซ้อม (ไม่บังคับ)
              </label>
              <textarea
                rows={2}
                placeholder="เช่น เตรียมความพร้อมก่อนสอบ OSCE รายวิชาการพยาบาลผู้ใหญ่, ทบทวนขั้นตอนการเปลี่ยนถุงน้ำดี"
                value={bookingForm.objectives}
                onChange={(e) => setBookingForm({ ...bookingForm, objectives: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Group Companions */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
                2
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">เพื่อนร่วมกลุ่มนิสิต (Group Companions)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ดึงเพื่อนร่วมกลุ่มเพื่อฝึกซ้อมพร้อมกัน ทุกคนจะได้รับ QR Code ประจำตัว
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
              รวม {totalGroupSize} คน / ว่าง {remainingSlots} ที่
            </span>
          </div>

          {/* Current Member List */}
          <div className="space-y-3">
            {/* Primary User (You) */}
            <div className="flex items-center justify-between p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
                  {currentUser?.name?.slice(0, 1) || 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {formatUserName(currentUser?.name)}
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-600 text-white rounded-full">
                      ผู้จองหลัก
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{currentUser?.email}</div>
                </div>
              </div>
            </div>

            {/* Selected Companions */}
            {selectedCompanions.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                    {comp.name?.slice(0, 1) || 'S'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white">
                      {formatUserName(comp.name)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{comp.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCompanion(comp.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Search and Add Companion Input */}
            {totalGroupSize < remainingSlots ? (
              <div className="relative pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อหรืออีเมลเพื่อค้นหานิสิตเพื่อนร่วมกลุ่ม..."
                    value={companionSearchQuery}
                    onChange={(e) => setCompanionSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Dropdown Candidate Results */}
                {filteredStudents.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredStudents.map((st) => (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => handleAddCompanion(st)}
                        className="w-full flex items-center justify-between p-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-white">
                            {formatUserName(st.name)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{st.email}</div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                          <Plus className="w-3.5 h-3.5" /> เพิ่มเข้ากลุ่ม
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                รอบเวลานี้มีที่นั่งว่างสำหรับสมาชิกกลุ่มได้สูงสุด {remainingSlots} คน (รวมตัวท่านแล้ว)
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Course, Advisor & Kits */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
              3
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">รายวิชา อาจารย์ผู้รับรอง และชุดฝึกปฏิบัติ</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">ระบุอาจารย์ผู้รับผิดชอบและชุดอุปกรณ์ที่ต้องเบิกใช้งาน</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Course Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-rose-500" /> รายวิชาที่เกี่ยวข้อง
              </label>
              <select
                value={bookingForm.courseId}
                onChange={(e) => {
                  const cId = e.target.value;
                  const selectedC = courses.find((c) => c.id === cId);
                  setBookingForm((prev) => ({
                    ...prev,
                    courseId: cId,
                    advisorName: selectedC?.instructorName || prev.advisorName,
                  }));
                }}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- ไม่ระบุรายวิชา (ฝึกทักษะทั่วไป) --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Advisor Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-rose-500" /> อาจารย์ผู้รับรอง / ประจำวิชา {isStudent && <span className="text-rose-500">*</span>}
              </label>

              {isEditingAdvisor ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    required={isStudent}
                    placeholder="ระบุชื่ออาจารย์ (เช่น อ.ดร. นันทนา)"
                    value={bookingForm.advisorName}
                    onChange={(e) => setBookingForm({ ...bookingForm, advisorName: e.target.value })}
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
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
                <div className="flex gap-2">
                  <select
                    value={bookingForm.advisorName}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsEditingAdvisor(true);
                        setBookingForm({ ...bookingForm, advisorName: '' });
                      } else {
                        setBookingForm({ ...bookingForm, advisorName: e.target.value });
                      }
                    }}
                    required={isStudent}
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">-- เลือกอาจารย์ผู้รับรอง --</option>
                    {instructors.map((ins) => (
                      <option key={ins.id} value={ins.name}>
                        {formatTeacherName(ins.name)}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ ระบุชื่ออาจารย์ด้วยตนเอง</option>
                  </select>
                </div>
              )}
            </div>

            {/* Practice Kit Selector */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-rose-500" /> ชุดฝึกปฏิบัติ (Practice Kit)
              </label>
              <select
                value={bookingForm.practiceKitId}
                onChange={(e) => setBookingForm({ ...bookingForm, practiceKitId: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- ไม่ต้องการเบิกชุด Kit (เตรียมอุปกรณ์มาเอง / ใช้อุปกรณ์ในห้อง) --</option>
                {practiceKits.map((k) => (
                  <option key={k.id} value={k.id}>
                    📦 {k.name} {k.description ? `(${k.description})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Equipment Request */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                อุปกรณ์เพิ่มเติมที่ต้องการให้เจ้าหน้าที่จัดเตรียม
              </label>
              <input
                type="text"
                placeholder="เช่น เครื่องวัดความดันแบบล้อเลื่อน, หุ่นฝึกฉีดยาเข้ากล้ามเนื้อสะโพก 1 ตัว"
                value={bookingForm.additionalEquipment}
                onChange={(e) => setBookingForm({ ...bookingForm, additionalEquipment: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Sticky Mobile Bottom Bar & Action Buttons (Above Mobile BottomNav) */}
        <div className="fixed bottom-[58px] md:bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <Link
              href="/practice"
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </Link>

            <button
              type="submit"
              disabled={submitting || isOverCapacity}
              className="flex-1 sm:flex-none sm:min-w-[240px] px-5 sm:px-6 py-2.5 sm:py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner /> กำลังบันทึกคำขอ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> ยืนยันการจองรอบฝึกปฏิบัติ
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function PracticeBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
          <LoadingSpinner />
          <p className="mt-4 text-sm font-medium">กำลังเตรียมฟอร์มจองรอบฝึกปฏิบัติ...</p>
        </div>
      }
    >
      <PracticeBookingContent />
    </Suspense>
  );
}
