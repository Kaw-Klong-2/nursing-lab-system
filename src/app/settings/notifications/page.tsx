'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Bell,
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Smartphone,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Check,
  Send,
  Calendar,
  Clock,
  Megaphone,
  Users,
  Trash2,
  Play,
  X,
  ExternalLink,
  ChevronRight,
  Flame,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { formatUserName, formatTeacherName } from '@/lib/user-utils';

interface NotificationTemplateItem {
  id: string;
  category: string;
  name: string;
  description: string;
  title: string;
  message: string;
  isActive: boolean;
  defaultTitle: string;
  defaultMessage: string;
  variablesList: { name: string; label: string }[];
}

const CATEGORIES = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'BORROW', label: 'ยืม-คืนอุปกรณ์' },
  { key: 'REQUISITION', label: 'เบิกจ่ายวัสดุ' },
  { key: 'ROOM', label: 'จองห้องปฏิบัติการ' },
  { key: 'PRACTICE', label: 'จองฝึกปฏิบัติ' },
  { key: 'SYSTEM', label: 'ระบบ & คลังพัสดุ' },
];

const BROADCAST_PRESETS = [
  {
    title: '📢 แจ้งเปิดรอบฝึกทักษะเพิ่มเติมประจำสัปดาห์',
    message: 'ห้องปฏิบัติการพยาบาลได้เปิดรอบฝึกทักษะด้วยตนเองเพิ่มเติม นิสิตสามารถเข้าไปตรวจสอบตารางเวลาและยื่นจองรอบฝึกได้แล้ววันนี้',
    linkUrl: '/practice',
    priority: 'NORMAL',
  },
  {
    title: '🔒 ประกาศงดใช้ห้องปฏิบัติการชั่วคราว (เตรียมสอบ OSCE)',
    message: 'ขอแจ้งงดให้บริการห้องปฏิบัติการพยาบาลชั่วคราว เพื่อเตรียมความพร้อมสำหรับการจัดสอบประเมินทักษะทางการพยาบาล (OSCE)',
    linkUrl: '/schedule',
    priority: 'HIGH',
  },
  {
    title: '⏰ แจ้งเตือนการตรวจสอบและส่งคืนอุปกรณ์ก่อนสิ้นภาคการศึกษา',
    message: 'เรียนนิสิตทุกท่าน กรุณาตรวจสอบรายการครุภัณฑ์และอุปกรณ์ที่ยืมค้างไว้ และนำส่งคืนที่ห้องเตรียมการปฏิบัติการพยาบาลให้ครบถ้วนก่อนปิดภาคเรียน',
    linkUrl: '/borrow',
    priority: 'URGENT',
  },
  {
    title: '📦 แจ้งรับชุดฝึกปฏิบัติการ (Practice Kits) ที่ห้องเตรียมการ',
    message: 'ชุดฝึกปฏิบัติการพยาบาลที่ท่านได้ยื่นจองไว้ได้รับการจัดเตรียมพร้อมแล้ว สามารถติดต่อรับได้ที่ห้องปฏิบัติการก่อนเริ่มรอบฝึก 15 นาที',
    linkUrl: '/practice',
    priority: 'NORMAL',
  },
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { currentUser, isAdmin, isOfficer, isLoading } = useAuth();
  const canManage = isAdmin || isOfficer;

  // Main Tabs: BROADCAST vs TEMPLATES
  const [mainTab, setMainTab] = useState<'BROADCAST' | 'TEMPLATES'>('BROADCAST');

  // --- Broadcast Messaging States ---
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [broadcastFilter, setBroadcastFilter] = useState<'ALL' | 'SCHEDULED' | 'SENT'>('ALL');
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedCustomUsers, setSelectedCustomUsers] = useState<any[]>([]);
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Broadcast Form
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    targetType: 'ALL_STUDENTS', // ALL_STUDENTS, CUSTOM_USERS, ALL_TEACHERS, ALL_USERS
    priority: 'NORMAL', // NORMAL, HIGH, URGENT
    linkUrl: '/practice',
    customLinkUrl: '',
    isScheduled: false,
    scheduleDate: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().slice(0, 10);
    })(),
    scheduleTime: '08:30',
  });

  // --- Template Customization States ---
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ [id: string]: { type: 'success' | 'error'; message: string } }>({});

  useEffect(() => {
    if (!isLoading && !canManage) {
      router.replace('/');
    }
  }, [isLoading, canManage, router]);

  const formatBroadcastDate = (dateVal: any) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleString('th-TH');
    } catch {
      return String(dateVal);
    }
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await fetch('/api/settings/notifications');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch Broadcast Messages
  const fetchBroadcasts = async () => {
    try {
      setLoadingBroadcasts(true);
      const res = await fetch('/api/notifications/broadcast');
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load broadcasts:', err);
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  // Fetch Users for Custom Picker
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsersList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    if (canManage) {
      fetchTemplates();
      fetchBroadcasts();
      fetchUsers();
    }
  }, [canManage]);

  // --- Broadcast Handlers ---
  const handleApplyPreset = (preset: typeof BROADCAST_PRESETS[0]) => {
    setBroadcastForm((prev) => ({
      ...prev,
      title: preset.title,
      message: preset.message,
      linkUrl: preset.linkUrl,
      priority: preset.priority,
    }));
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      alert('กรุณากรอกหัวข้อและเนื้อหาข้อความ');
      return;
    }

    if (broadcastForm.targetType === 'CUSTOM_USERS' && selectedCustomUsers.length === 0) {
      alert('กรุณาเลือกนิสิตหรือผู้รับเป้าหมายอย่างน้อย 1 ท่าน');
      return;
    }

    let scheduledAt: string | null = null;
    if (broadcastForm.isScheduled) {
      if (!broadcastForm.scheduleDate || !broadcastForm.scheduleTime) {
        alert('กรุณาระบุวันและเวลาที่ต้องการให้ส่งข้อความ');
        return;
      }
      scheduledAt = `${broadcastForm.scheduleDate}T${broadcastForm.scheduleTime}:00`;
      const targetTime = new Date(scheduledAt);
      if (targetTime <= new Date()) {
        alert('วัน-เวลาที่ตั้งไว้ผ่านมาแล้ว กรุณาเลือกวัน-เวลาในอนาคต หรือเลือกส่งทันที');
        return;
      }
    }

    const finalLink =
      broadcastForm.linkUrl === 'CUSTOM'
        ? broadcastForm.customLinkUrl.trim()
        : broadcastForm.linkUrl;

    setSubmittingBroadcast(true);
    setBroadcastFeedback(null);

    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastForm.title,
          message: broadcastForm.message,
          targetType: broadcastForm.targetType,
          targetUserIds: selectedCustomUsers.map((u) => u.id),
          priority: broadcastForm.priority,
          linkUrl: finalLink || null,
          isScheduled: broadcastForm.isScheduled,
          scheduledAt,
          authorId: currentUser?.id,
          authorName: formatUserName(currentUser) || 'แอดมิน',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBroadcastFeedback({
          type: 'success',
          message: broadcastForm.isScheduled
            ? 'บันทึกการตั้งเวลาส่งข้อความเรียบร้อยแล้ว 🗓️'
            : `ส่งข้อความประกาศสำเร็จทันที (${data.dispatchedCount || 0} ท่าน) ⚡`,
        });

        // Reset form
        setBroadcastForm((prev) => ({
          ...prev,
          title: '',
          message: '',
          isScheduled: false,
        }));
        setSelectedCustomUsers([]);
        fetchBroadcasts();
      } else {
        const err = await res.json();
        setBroadcastFeedback({
          type: 'error',
          message: err.error || 'เกิดข้อผิดพลาดในการส่งประกาศ',
        });
      }
    } catch (err: any) {
      setBroadcastFeedback({
        type: 'error',
        message: err.message || 'การเชื่อมต่อขัดข้อง',
      });
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  const handleSendNow = async (id: string) => {
    if (!confirm('ยืนยันส่งข้อความประกาศนี้ทันทีเดี๋ยวนี้หรือไม่?')) return;
    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'SEND_NOW' }),
      });
      if (res.ok) {
        fetchBroadcasts();
      } else {
        alert('ไม่สามารถส่งข้อความได้');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleCancelBroadcast = async (id: string) => {
    if (!confirm('ต้องการยกเลิกการส่งข้อความนี้ที่ตั้งเวลาไว้ใช่หรือไม่?')) return;
    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'CANCEL' }),
      });
      if (res.ok) {
        fetchBroadcasts();
      } else {
        alert('ไม่สามารถยกเลิกได้');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm('ยืนยันการลบรายการประกาศนี้ออกจากระบบ?')) return;
    try {
      const res = await fetch(`/api/notifications/broadcast?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchBroadcasts();
      } else {
        alert('ไม่สามารถลบรายการได้');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  // --- Template Handlers ---
  const handleFieldChange = (id: string, field: 'title' | 'message' | 'isActive', value: any) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleInsertVariable = (id: string, varName: string) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            message: `${t.message} {${varName}}`,
          };
        }
        return t;
      })
    );
  };

  const handleSave = async (item: NotificationTemplateItem) => {
    if (!currentUser?.id) return;
    setSavingId(item.id);
    setFeedback((prev) => ({ ...prev, [item.id]: { type: 'success', message: '' } }));

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          message: item.message,
          isActive: item.isActive,
          userId: currentUser.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'บันทึกไม่สำเร็จ');
      }

      setFeedback((prev) => ({
        ...prev,
        [item.id]: { type: 'success', message: 'บันทึกการเปลี่ยนแปลงแล้ว ✅' },
      }));
      setTimeout(() => {
        setFeedback((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }, 3000);
    } catch (err: any) {
      setFeedback((prev) => ({
        ...prev,
        [item.id]: { type: 'error', message: err.message || 'เกิดข้อผิดพลาด' },
      }));
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = async (id: string) => {
    if (!currentUser?.id) return;
    if (!confirm('ต้องการคืนค่าข้อความเป็นค่าเริ่มต้นของระบบใช่หรือไม่?')) return;

    setResettingId(id);
    try {
      const res = await fetch('/api/settings/notifications/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: currentUser.id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.template) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === id ? { ...t, title: data.template.title, message: data.template.message, isActive: true } : t))
          );
        }
        setFeedback((prev) => ({
          ...prev,
          [id]: { type: 'success', message: 'คืนค่าเริ่มต้นเรียบร้อยแล้ว' },
        }));
        setTimeout(() => {
          setFeedback((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 3000);
      }
    } catch (err) {
      alert('ไม่สามารถคืนค่าได้');
    } finally {
      setResettingId(null);
    }
  };

  const handleResetAll = async () => {
    if (!currentUser?.id) return;
    if (!confirm('⚠️ คำเตือน: คุณต้องการคืนค่าเริ่มต้นของทุกข้อความแจ้งเตือนในระบบใช่หรือไม่?')) return;

    try {
      setLoadingTemplates(true);
      const res = await fetch('/api/settings/notifications/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'ALL', userId: currentUser.id }),
      });
      if (res.ok) {
        await fetchTemplates();
        alert('คืนค่าเริ่มต้นทุกรายการเรียบร้อยแล้ว');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการคืนค่า');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Helper สำหรับจำลองข้อความตัวอย่างใน Live Preview
  const renderPreview = (text: string, variablesList?: { name: string; label: string }[]) => {
    if (!text) return '';
    let preview = text;
    const sampleValues: Record<string, string> = {
      studentName: 'นริศรา สุขใจ',
      student_name: 'นริศรา สุขใจ',
      name: 'นริศรา สุขใจ',
      requestNumber: 'REQ-25690923-001',
      itemSummary: 'หูฟังแพทย์ (Stethoscope) 2 ชิ้น',
      approverName: 'อ.พรทิพย์ สว่างเนตร',
      reason: 'อุปกรณ์ไม่เพียงพอในวันดังกล่าว',
      roomName: 'ห้องปฏิบัติการพยาบาล 401',
      date: '25 ต.ค. 2569',
      timeSlot: '09:00 - 12:00',
    };

    for (const [key, val] of Object.entries(sampleValues)) {
      preview = preview.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi'), val);
    }
    return preview;
  };

  if (isLoading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดข้อมูลศูนย์ส่งข้อความและการแจ้งเตือน..."
        submessage="กำลังตรวจสอบสิทธิ์การเข้าใช้งาน"
      />
    );
  }

  if (!canManage) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">ไม่มีสิทธิ์เข้าถึงหน้านี้ (Access Denied)</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          หน้านี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบและเจ้าหน้าที่ห้องปฏิบัติการเท่านั้น
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-md hover:bg-teal-500 transition"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const filteredTemplates = templates.filter((t) => {
    const matchCategory = activeCategory === 'ALL' || t.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const filteredBroadcasts = broadcasts.filter((b) => {
    if (broadcastFilter === 'SCHEDULED') return b.status === 'SCHEDULED';
    if (broadcastFilter === 'SENT') return b.status === 'SENT';
    return true;
  });

  const scheduledCount = broadcasts.filter((b) => b.status === 'SCHEDULED').length;
  const sentCount = broadcasts.filter((b) => b.status === 'SENT').length;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-800 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30">
                  {isAdmin ? 'ผู้ดูแลระบบ (Admin)' : 'เจ้าหน้าที่ห้องปฏิบัติการ (Officer)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/30 text-amber-200 border border-amber-300/40">
                  In-App & Web Push
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black mt-1 text-white">
                ศูนย์ส่งข้อความและตั้งค่าการแจ้งเตือน
              </h1>
              <p className="text-xs md:text-sm text-teal-100/90 mt-0.5">
                เขียนประกาศ ส่งข้อความเตือนนิสิตรายบุคคลหรือทั้งรุ่น ตั้งเวลาส่งล่วงหน้า และปรับแต่งแม่แบบแจ้งเตือนอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1.5 bg-black/20 backdrop-blur-md rounded-2xl border border-white/15">
            <button
              type="button"
              onClick={() => setMainTab('BROADCAST')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                mainTab === 'BROADCAST'
                  ? 'bg-white text-teal-900 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>ส่งประกาศ & ตั้งเวลา</span>
              {scheduledCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black flex items-center justify-center">
                  {scheduledCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMainTab('TEMPLATES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                mainTab === 'TEMPLATES'
                  ? 'bg-white text-teal-900 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>แม่แบบระบบอัตโนมัติ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BROADCAST & SCHEDULED MESSAGING CENTER            */}
      {/* ======================================================== */}
      {mainTab === 'BROADCAST' && (
        <div className="space-y-6">
          {/* Top Presets Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                เทมเพลตข้อความด่วน (คลิกเพื่อเลือกใช้งานทันที):
              </span>
              <span className="text-[10px] text-slate-400">แก้ไขข้อความเพิ่มเติมได้ในฟอร์มด้านล่าง</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
              {BROADCAST_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200/80 dark:border-slate-700 text-left transition cursor-pointer group"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-300 line-clamp-1">
                    {preset.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {preset.message}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Compose Form & Live Preview Grid */}
          <form onSubmit={handleSendBroadcast} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-teal-600" />
                  <span>เขียนข้อความประกาศ / แจ้งเตือน</span>
                </h3>
                <span className="text-[11px] text-slate-400">ส่งตรงเข้ากล่องข้อความ + Web Push</span>
              </div>

              {/* Target Audience Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  กลุ่มผู้รับเป้าหมาย <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'ALL_STUDENTS', label: '🎓 นิสิตทั้งหมด', desc: 'บทบาท USER' },
                    { key: 'CUSTOM_USERS', label: '🎯 เลือกเฉพาะคน', desc: 'ค้นหารหัส/ชื่อ' },
                    { key: 'ALL_TEACHERS', label: '👩‍🏫 อาจารย์ทั้งหมด', desc: 'อาจารย์ & ผู้อนุมัติ' },
                    { key: 'ALL_USERS', label: '🌐 ทุกคนในระบบ', desc: 'ทุกบัญชีผู้ใช้' },
                  ].map((target) => (
                    <button
                      key={target.key}
                      type="button"
                      onClick={() => setBroadcastForm({ ...broadcastForm, targetType: target.key })}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        broadcastForm.targetType === target.key
                          ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/20 text-teal-900 dark:text-teal-200'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs font-bold block">{target.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{target.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Users Picker */}
                {broadcastForm.targetType === 'CUSTOM_USERS' && (
                  <div className="pt-2 space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      เลือกนิสิตหรือผู้รับเป้าหมาย (เลือกแล้ว {selectedCustomUsers.length} ท่าน):
                    </span>

                    {/* Selected Chips */}
                    {selectedCustomUsers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCustomUsers.map((u) => (
                          <div
                            key={u.id}
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 text-xs font-medium border border-teal-200 dark:border-teal-800"
                          >
                            <span>{formatUserName(u)}</span>
                            {u.studentId && (
                              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">
                                ({u.studentId})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedCustomUsers(selectedCustomUsers.filter((x) => x.id !== u.id))}
                              className="w-4 h-4 rounded-full hover:bg-teal-200 dark:hover:bg-teal-800 flex items-center justify-center text-teal-700 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Search Input & Dropdown */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="พิมพ์รหัสนิสิต หรือชื่อ-นามสกุล เพื่อค้นหา..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    {userSearchQuery.trim() && (
                      <div className="max-h-40 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 shadow-lg">
                        {allUsersList
                          .filter((u) => {
                            if (selectedCustomUsers.some((x) => x.id === u.id)) return false;
                            const query = userSearchQuery.trim().toLowerCase();
                            const uName = (u.name || '').toLowerCase();
                            const uCode = (u.studentId || '').toLowerCase();
                            return uName.includes(query) || uCode.includes(query);
                          })
                          .slice(0, 8)
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomUsers([...selectedCustomUsers, u]);
                                setUserSearchQuery('');
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center justify-between cursor-pointer transition"
                            >
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatUserName(u)}
                              </span>
                              <span className="text-[10px] text-teal-600 font-mono">
                                {u.studentId || u.role}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้อประกาศ (Title) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 📢 แจ้งเตือนการตรวจสอบและส่งคืนอุปกรณ์ก่อนปิดภาคเรียน"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    เนื้อหาข้อความ (Message) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setBroadcastForm({
                        ...broadcastForm,
                        message: `${broadcastForm.message} {student_name}`,
                      })
                    }
                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>+{`{student_name}`} แทรกชื่อนิสิต</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="ระบุข้อความที่ต้องการแจ้งเตือนนิสิต..."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
                />
              </div>

              {/* Priority & Link URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ระดับความสำคัญ (Priority)
                  </label>
                  <select
                    value={broadcastForm.priority}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="NORMAL">🟢 ปกติ (Normal)</option>
                    <option value="HIGH">🟠 สำคัญ (High)</option>
                    <option value="URGENT">🔴 ด่วนที่สุด (Urgent - เด้งเตือนทันที)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หน้าเว็บปลายทางเมื่อกดอ่าน
                  </label>
                  <select
                    value={broadcastForm.linkUrl}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, linkUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="/practice">/practice (จองรอบฝึกปฏิบัติการ)</option>
                    <option value="/borrow">/borrow (ยืม-คืนอุปกรณ์)</option>
                    <option value="/requisitions">/requisitions (เบิกจ่ายพัสดุ)</option>
                    <option value="/schedule">/schedule (ตารางการใช้ห้อง)</option>
                    <option value="/">/ (หน้าแรก Home)</option>
                    <option value="CUSTOM">🔗 ระบุลิงก์อื่นเอง...</option>
                  </select>
                  {broadcastForm.linkUrl === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="เช่น /verify หรือ URL ภายนอก"
                      value={broadcastForm.customLinkUrl}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, customLinkUrl: e.target.value })}
                      className="mt-1.5 w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  )}
                </div>
              </div>

              {/* Delivery Timing Mode (Immediate vs Scheduled) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  กำหนดการส่งข้อความ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastForm({ ...broadcastForm, isScheduled: false })}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                      !broadcastForm.isScheduled
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border flex items-center justify-center">
                      {!broadcastForm.isScheduled && <div className="w-2 h-2 rounded-full bg-teal-600" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold block">⚡ ส่งทันทีเดี๋ยวนี้</span>
                      <span className="text-[10px] text-slate-500 block">แจ้งเตือนนิสิตทันที</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastForm({ ...broadcastForm, isScheduled: true })}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                      broadcastForm.isScheduled
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border flex items-center justify-center">
                      {broadcastForm.isScheduled && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold block">🗓️ ตั้งวัน-เวลาส่งล่วงหน้า</span>
                      <span className="text-[10px] text-slate-500 block">เข้าคิวรอส่งอัตโนมัติ</span>
                    </div>
                  </button>
                </div>

                {/* Date & Time Picker */}
                {broadcastForm.isScheduled && (
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" /> วันที่ต้องการให้ส่ง
                      </label>
                      <input
                        type="date"
                        required={broadcastForm.isScheduled}
                        value={broadcastForm.scheduleDate}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, scheduleDate: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" /> เวลาที่ต้องการให้ส่ง
                      </label>
                      <input
                        type="time"
                        required={broadcastForm.isScheduled}
                        value={broadcastForm.scheduleTime}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, scheduleTime: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback and Submit Button */}
              {broadcastFeedback && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    broadcastFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {broadcastFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{broadcastFeedback.message}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={submittingBroadcast}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                    broadcastForm.isScheduled
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                      : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20'
                  }`}
                >
                  {submittingBroadcast ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : broadcastForm.isScheduled ? (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>บันทึกการตั้งเวลาส่ง</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ส่งประกาศเดี๋ยวนี้ ⚡</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                  ตัวอย่างการแสดงผลบนจอนิสิต (Live Preview)
                </span>

                {/* Mobile Notification Card Mockup */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-md bg-teal-600 flex items-center justify-center text-[10px] text-white font-black">
                        N
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">ระบบห้องปฏิบัติการพยาบาล</span>
                    </div>
                    <span>{broadcastForm.isScheduled ? 'ตั้งเวลาไว้' : 'ตอนนี้'}</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {broadcastForm.title ? renderPreview(broadcastForm.title) : 'หัวข้อประกาศจะปรากฏที่นี่...'}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {broadcastForm.message
                        ? renderPreview(broadcastForm.message)
                        : 'ข้อความประกาศแจ้งเตือนจะแสดงผลที่นี่ โดยตัวแปร {student_name} จะถูกแทนที่ด้วยชื่อจริงของนิสิตแต่ละคน...'}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                      🔍 แตะเพื่อเปิดดูรายละเอียด
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        broadcastForm.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-700'
                          : broadcastForm.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {broadcastForm.priority === 'URGENT' ? 'ด่วนที่สุด' : broadcastForm.priority === 'HIGH' ? 'สำคัญ' : 'ปกติ'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-[11px] text-slate-500 space-y-1">
                  <span className="font-bold block text-slate-700 dark:text-slate-300">💡 การทำงานของระบบ:</span>
                  <p>• เมื่อส่งแล้ว ข้อความจะเข้าสู่ไอคอนกระดิ่งแจ้งเตือนของผู้รับทุกคนทันที</p>
                  <p>• หากผู้รับเปิดสิทธิ์ Web Push ไว้ ข้อความจะเด้งบนหน้าจอมือถือ/แท็บเล็ตแม้จะไม่ได้เปิดหน้าเว็บอยู่</p>
                </div>
              </div>
            </div>
          </form>

          {/* ======================================================== */}
          {/* QUEUE & BROADCAST HISTORY LIST                           */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <span>คิวรอส่งตามเวลาและประวัติการส่งประกาศ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ติดตามรายการที่ตั้งเวลาไว้ ตรวจสอบจำนวนคนที่อ่านแล้ว และจัดการข้อความย้อนหลัง
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5">
                {[
                  { key: 'ALL', label: `ทั้งหมด (${broadcasts.length})` },
                  { key: 'SCHEDULED', label: `⏳ รอส่ง (${scheduledCount})` },
                  { key: 'SENT', label: `✅ ส่งแล้ว (${sentCount})` },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setBroadcastFilter(f.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      broadcastFilter === f.key
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingBroadcasts ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
                <span>กำลังโหลดประวัติการประกาศ...</span>
              </div>
            ) : filteredBroadcasts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                ยังไม่มีรายการประกาศในหมวดนี้
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBroadcasts.map((b) => {
                  const isScheduled = b.status === 'SCHEDULED';
                  const isSent = b.status === 'SENT';
                  const isCancelled = b.status === 'CANCELLED';

                  return (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isScheduled && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> รอส่ง: {formatBroadcastDate(b.scheduledAt)}
                            </span>
                          )}
                          {isSent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> ส่งแล้ว: {formatBroadcastDate(b.sentAt)}
                            </span>
                          )}
                          {isCancelled && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              ✕ ยกเลิกแล้ว
                            </span>
                          )}

                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                            {b.targetType === 'ALL_STUDENTS'
                              ? '🎓 นิสิตทั้งหมด'
                              : b.targetType === 'ALL_TEACHERS'
                              ? '👩‍🏫 อาจารย์ทั้งหมด'
                              : b.targetType === 'ALL_USERS'
                              ? '🌐 ทุกคนในระบบ'
                              : '🎯 เฉพาะกลุ่ม'}
                          </span>

                          {b.priority === 'URGENT' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
                              ด่วนที่สุด
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {b.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {b.message}
                        </p>
                      </div>

                      {/* Right Stats & Actions */}
                      <div className="flex items-center gap-3 self-end md:self-center">
                        {isSent && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">สถิติการเปิดอ่าน:</span>
                            <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                              👀 {b.readCount || 0} / {b.totalRecipients || 0} คน
                            </span>
                          </div>
                        )}

                        {isScheduled && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendNow(b.id)}
                              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shadow-sm transition cursor-pointer flex items-center gap-1"
                              title="ส่งทันทีเดี๋ยวนี้"
                            >
                              <Play className="w-3 h-3" />
                              <span>ส่งทันที</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelBroadcast(b.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer"
                              title="ยกเลิกการส่ง"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteBroadcast(b.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SYSTEM NOTIFICATION TEMPLATES (แม่แบบอัตโนมัติเดิม)   */}
      {/* ======================================================== */}
      {mainTab === 'TEMPLATES' && (
        <div className="space-y-6">
          {/* Header Controls for Templates */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                แม่แบบข้อความแจ้งเตือนอัตโนมัติของระบบ (System Templates)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ปรับแต่งข้อความแจ้งเตือนที่ถูกส่งโดยอัตโนมัติเมื่อเกิดกิจกรรม เช่น ยืม-คืน, อนุมัติคำขอ, หรือเตือนส่งคืน
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={handleResetAll}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>คืนค่าเริ่มต้นทั้งหมด</span>
              </button>
            )}
          </div>

          {/* Filter and Category Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeCategory === cat.key
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeCategory === cat.key
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {cat.key === 'ALL'
                      ? templates.length
                      : templates.filter((t) => t.category === cat.key).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาตามชื่อเทมเพลต, หัวข้อ หรือข้อความ..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Templates List */}
          {loadingTemplates ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
              <span>กำลังโหลดเทมเพลตข้อความ...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              ไม่พบรายการเทมเพลตที่ตรงกับเงื่อนไขการค้นหา
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTemplates.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl shadow-sm transition-all overflow-hidden ${
                    item.isActive
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-950/40'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {CATEGORIES.find((c) => c.key === item.category)?.label || item.category}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </h3>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={item.isActive}
                          onChange={(e) => handleFieldChange(item.id, 'isActive', e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                        />
                        <span>{item.isActive ? 'เปิดใช้งาน' : 'ปิดการแจ้งเตือน'}</span>
                      </label>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Inputs Column */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Title Input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          หัวข้อการแจ้งเตือน (Title)
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                          placeholder="ระบุหัวข้อแจ้งเตือน..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      {/* Message Input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          เนื้อหาข้อความ (Message)
                        </label>
                        <textarea
                          rows={3}
                          value={item.message}
                          onChange={(e) => handleFieldChange(item.id, 'message', e.target.value)}
                          placeholder="ระบุเนื้อหาข้อความ..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
                        />
                      </div>

                      {/* Variables Helper */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                          คลิกเพื่อแทรกตัวแปรอัตโนมัติ (Placeholders):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.variablesList?.map((v) => (
                            <button
                              key={v.name}
                              type="button"
                              onClick={() => handleInsertVariable(item.id, v.name)}
                              className="px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-700 dark:text-teal-300 font-mono transition cursor-pointer flex items-center gap-1"
                              title={`แทรก ${v.label}`}
                            >
                              <span>+{`{${v.name}}`}</span>
                              <span className="text-[10px] text-teal-600/70 dark:text-teal-400/70 font-sans">
                                ({v.label})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live Preview Column */}
                    <div className="lg:col-span-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          <Smartphone className="w-4 h-4 text-teal-600" />
                          <span>ตัวอย่างการแสดงผลจริง (Live Preview)</span>
                        </div>

                        {/* Mobile Notification Mockup */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/80 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3.5 h-3.5 rounded-md bg-teal-600 flex items-center justify-center text-[9px] text-white font-bold">
                                N
                              </div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">ระบบห้องปฏิบัติการพยาบาล</span>
                            </div>
                            <span>ตอนนี้</span>
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                              {renderPreview(item.title, item.variablesList) || 'หัวข้อแจ้งเตือน'}
                            </h4>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                              {renderPreview(item.message, item.variablesList) || 'เนื้อหาข้อความแจ้งเตือน...'}
                            </p>
                          </div>

                          <div className="pt-1 flex gap-1.5">
                            <div className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-[9px] text-teal-700 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800/50">
                              🔍 ดูรายละเอียด
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons & Feedback */}
                      <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 mt-4">
                        <button
                          type="button"
                          onClick={() => handleReset(item.id)}
                          disabled={resettingId === item.id || savingId === item.id}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{resettingId === item.id ? 'กำลังคืนค่า...' : 'คืนค่าเริ่มต้น'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {feedback[item.id] && (
                            <span
                              className={`text-xs font-bold flex items-center gap-1 ${
                                feedback[item.id].type === 'success'
                                  ? 'text-teal-600 dark:text-teal-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {feedback[item.id].message}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSave(item)}
                            disabled={savingId === item.id}
                            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{savingId === item.id ? 'กำลังบันทึก...' : 'บันทึก'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
