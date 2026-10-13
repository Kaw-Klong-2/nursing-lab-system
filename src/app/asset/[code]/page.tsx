'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { formatImageUrl } from '@/lib/image-helper';
import {
  Tag,
  MapPin,
  Calendar,
  Coins,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BriefcaseMedical,
  Stethoscope,
  Building2,
  Share2,
  LogIn,
  ArrowRight,
  ShieldCheck,
  User,
  Info,
  ChevronLeft,
  AlertOctagon,
  Camera,
  Check,
  CheckSquare,
  FileText,
  Send,
  X,
  Activity,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ThemeToggle from '@/components/common/ThemeToggle';

export default function PublicAssetPage() {
  const params = useParams();
  const rawCode = params?.code ? String(params.code) : '';
  const { currentUser } = useAuth();

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Issue Report Modal (for students/teachers/staff via QR)
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccessCode, setReportSuccessCode] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [issueForm, setIssueForm] = useState({
    issueDescription: '',
    urgency: 'NORMAL',
    reporterName: '',
    reporterRole: 'STUDENT',
    contactPhone: '',
    photoUrl: '',
  });

  // Digital Checklist Inspection Modal (Staff only)
  const isStaff = currentUser && ['ADMIN', 'OFFICER', 'APPROVER'].includes(currentUser.role);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectSubmitting, setInspectSubmitting] = useState(false);
  const [inspectSuccess, setInspectSuccess] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<'PASS' | 'PASS_WITH_NOTE' | 'FAIL'>('PASS');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionChecks, setInspectionChecks] = useState<Record<string, boolean>>({
    visualCondition: true,
    powerAndBattery: true,
    functionSelfTest: true,
    cleanliness: true,
    accessoriesComplete: true,
  });

  useEffect(() => {
    if (currentUser) {
      setIssueForm((prev) => ({
        ...prev,
        reporterName: currentUser.name || '',
        reporterRole: currentUser.role === 'TEACHER' ? 'TEACHER' : ['ADMIN', 'OFFICER'].includes(currentUser.role) ? 'OFFICER' : 'STUDENT',
        contactPhone: currentUser.phone || '',
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    if (!rawCode) return;

    async function fetchAsset() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/assets/public/${encodeURIComponent(rawCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.redirectUrl) {
            window.location.replace(data.redirectUrl);
            return;
          }
          setAsset(data);
        } else {
          const err = await res.json();
          setError(err.error || 'ไม่พบข้อมูลอุปกรณ์ชิ้นนี้');
        }
      } catch (err: any) {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
        setLoading(false);
      }
    }

    fetchAsset();
  }, [rawCode]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ภาพต้องไม่เกิน 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setIssueForm((prev) => ({ ...prev, photoUrl: String(event.target?.result) }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.issueDescription.trim()) {
      alert('กรุณาระบุอาการชำรุดหรือปัญหาที่พบ');
      return;
    }
    setReportSubmitting(true);
    setReportError(null);
    try {
      const res = await fetch('/api/maintenance/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          assetCode: asset.assetCode,
          issueDescription: issueForm.issueDescription,
          urgency: issueForm.urgency,
          reporterName: issueForm.reporterName,
          reporterRole: issueForm.reporterRole,
          contactPhone: issueForm.contactPhone,
          photoUrl: issueForm.photoUrl,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReportSuccessCode(data.report?.reportNumber || 'REP-SUCCESS');
        // Refresh asset details
        const refreshRes = await fetch(`/api/assets/public/${encodeURIComponent(rawCode)}`);
        if (refreshRes.ok) setAsset(await refreshRes.json());
      } else {
        setReportError(data.error || 'ไม่สามารถส่งเรื่องแจ้งปัญหาได้');
      }
    } catch (err) {
      setReportError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) {
      alert('กรุณาเข้าสู่ระบบก่อนบันทึกการตรวจสภาพ');
      return;
    }
    setInspectSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          inspectorId: currentUser.id,
          inspectionType: 'ROUTINE',
          result: inspectionResult,
          checklistData: inspectionChecks,
          notes: inspectionNotes,
        }),
      });

      if (res.ok) {
        setInspectSuccess(true);
        setTimeout(async () => {
          setInspectModalOpen(false);
          setInspectSuccess(false);
          const refreshRes = await fetch(`/api/assets/public/${encodeURIComponent(rawCode)}`);
          if (refreshRes.ok) setAsset(await refreshRes.json());
        }, 1200);
      } else {
        const data = await res.json();
        alert(data.error || 'บันทึกการตรวจไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกการตรวจ');
    } finally {
      setInspectSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <LoadingSpinner message="กำลังค้นหาข้อมูลครุภัณฑ์..." submessage="กรุณารอสักครู่" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">ไม่พบข้อมูลครุภัณฑ์</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || 'รหัส QR Code หรือหมายเลขครุภัณฑ์นี้ไม่ถูกต้อง หรืออาจถูกลบออกจากระบบแล้ว'}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>กลับสู่หน้าหลักของระบบ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const photoUrl = formatImageUrl(asset.imageUrl || asset.item?.imageUrl);
  const isAvailable = asset.status === 'AVAILABLE';
  const isBorrowed = asset.status === 'BORROWED';
  const isMaintenance = asset.status === 'MAINTENANCE';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-4 sm:px-6 flex flex-col items-center justify-start font-sans">
      <div className="max-w-xl w-full space-y-4">
        {/* Top Public Header */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Link href="/" className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
                ระบบข้อมูลครุภัณฑ์พยาบาล
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                คณะพยาบาลศาสตร์ / Nursing Lab
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="คัดลอกลิงก์หน้านี้"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {currentUser ? (
              <Link
                href="/inventory"
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1"
              >
                <span>เข้าสู่ระบบแล้ว</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>
        </div>

        {copied && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs text-center font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
            คัดลอกลิงก์หน้าครุภัณฑ์เรียบร้อยแล้ว!
          </div>
        )}

        {/* Main Asset Detail Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          {/* Photo Header */}
          <div className="relative bg-slate-100 dark:bg-slate-850 aspect-video sm:aspect-[2/1] overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={asset.item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-slate-300 flex flex-col items-center gap-2">
                <BriefcaseMedical className="w-16 h-16" />
                <span className="text-xs">ไม่มีรูปภาพครุภัณฑ์</span>
              </div>
            )}

            {/* Floating Status Badge */}
            <div className="absolute top-4 right-4">
              {isAvailable && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" /> พร้อมใช้งาน
                </span>
              )}
              {isBorrowed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                  <Clock className="w-4 h-4" /> กำลังถูกยืมอยู่
                </span>
              )}
              {isMaintenance && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                  <Wrench className="w-4 h-4" /> กำลังส่งซ่อมบำรุง
                </span>
              )}
            </div>

            {/* Sequence Number */}
            <div className="absolute bottom-4 left-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-md">
                {asset.item?.unit || 'ชิ้น'}ที่ {asset.sequenceNumber || 1}
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-7 space-y-5">
            {/* Title & Codes */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800">
                  รหัสแล็บ: {asset.assetCode}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-medium">
                  {asset.item.category}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                {asset.item.name}
              </h1>

              {asset.govAssetCode && (
                <div className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>เลขครุภัณฑ์ราชการ: <b className="text-slate-800 dark:text-slate-200">{asset.govAssetCode}</b></span>
                </div>
              )}
            </div>

            {/* Maintenance Banner (If under repair) */}
            {isMaintenance && asset.activeMaintenance && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300 text-sm">
                  <Wrench className="w-4 h-4 text-rose-600 dark:text-rose-400" /> อยู่ระหว่างการส่งซ่อมบำรุง
                </div>
                <div><b>อาการชำรุด:</b> {asset.activeMaintenance.issue}</div>
                {asset.activeMaintenance.repairShop && (
                  <div><b>ส่งซ่อมที่:</b> {asset.activeMaintenance.repairShop}</div>
                )}
                {asset.activeMaintenance.technicianNote && (
                  <div><b>หมายเหตุช่าง:</b> {asset.activeMaintenance.technicianNote}</div>
                )}
              </div>
            )}

            {/* Available Banner */}
            {isAvailable && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> ครุภัณฑ์นี้พร้อมใช้งานในห้องแล็บ
                </div>
                <div className="text-emerald-700 dark:text-emerald-300 font-medium">
                  สถานะว่าง ไม่มีคิวยืมค้างอยู่ สามารถยื่นคำขอเพื่อนำไปฝึกปฏิบัติการได้ทันที
                </div>
              </div>
            )}

            {/* Borrowed Banner (If currently borrowed) */}
            {isBorrowed && asset.activeBorrow && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                asset.activeBorrow.isOverdue
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
                  : 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="font-black flex items-center gap-1.5 text-sm">
                    <Clock className={`w-4 h-4 ${asset.activeBorrow.isOverdue ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
                    <span>กำลังถูกยืมใช้งาน</span>
                  </div>
                  {asset.activeBorrow.isOverdue ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                      ⚠️ เกินกำหนดส่งคืน
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      กำลังใช้งาน
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">ผู้ยืมปัจจุบัน</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {asset.activeBorrow.borrowerName}
                    </span>
                    {asset.activeBorrow.borrowerStudentId && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        รหัสนิสิต: {asset.activeBorrow.borrowerStudentId}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {asset.activeBorrow.department}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">กำหนดวันเวลาส่งคืน</span>
                    <span className={`font-bold text-xs block ${asset.activeBorrow.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {asset.activeBorrow.expectedReturnDate
                        ? new Date(asset.activeBorrow.expectedReturnDate).toLocaleString('th-TH')
                        : 'ไม่ระบุ'}
                    </span>
                    {asset.activeBorrow.borrowDate && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                        ยืมเมื่อ: {new Date(asset.activeBorrow.borrowDate).toLocaleDateString('th-TH')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-[11px] pt-1 text-slate-700 dark:text-slate-300">
                  {asset.activeBorrow.course && (
                    <div><b>วิชาที่นำไปใช้:</b> {asset.activeBorrow.course}</div>
                  )}
                  {asset.activeBorrow.purpose && (
                    <div><b>วัตถุประสงค์:</b> {asset.activeBorrow.purpose}</div>
                  )}
                  {asset.activeBorrow.requestNumber && (
                    <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      เลขคำขอ: {asset.activeBorrow.requestNumber}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Specs & Location Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> สถานที่จัดเก็บประจำ
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{asset.location}</div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> สภาพอุปกรณ์
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {asset.condition === 'GOOD' ? 'สมบูรณ์ดี (Good)' : asset.condition === 'FAIR' ? 'พอใช้ (Fair)' : 'ชำรุด (Damaged)'}
                </div>
              </div>

              {asset.serialNumber && (
                <div className="space-y-1">
                  <div className="text-slate-400 dark:text-slate-500">Serial Number (SN)</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{asset.serialNumber}</div>
                </div>
              )}

              {asset.cost && asset.cost > 0 && (
                <div className="space-y-1">
                  <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> ราคา/มูลค่าจัดซื้อ
                  </div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">
                    ฿{Number(asset.cost).toLocaleString('th-TH')} บาท
                  </div>
                </div>
              )}

              {asset.receivedDate && (
                <div className="space-y-1">
                  <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> วันที่รับเข้าคลัง
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(asset.receivedDate).toLocaleDateString('th-TH')}
                  </div>
                </div>
              )}

              {(asset.brand || asset.model) && (
                <div className="space-y-1">
                  <div className="text-slate-400 dark:text-slate-500">ยี่ห้อ / รุ่น</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {[asset.brand, asset.model].filter(Boolean).join(' - ')}
                  </div>
                </div>
              )}

              {asset.supplier && (
                <div className="space-y-1">
                  <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> ผู้จัดจำหน่าย
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{asset.supplier}</div>
                </div>
              )}

              {asset.warrantyExpiry && (
                <div className="space-y-1">
                  <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> วันหมดประกัน
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(asset.warrantyExpiry).toLocaleDateString('th-TH')}
                  </div>
                </div>
              )}
            </div>

            {/* Specific Asset Note (Model / Sub-specification) */}
            {asset.note && (
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> ข้อมูลเฉพาะชิ้น / รุ่น / หมายเหตุ:
                </div>
                <div className="text-teal-900 dark:text-teal-200 bg-teal-50/70 dark:bg-teal-950/40 p-3.5 rounded-2xl border border-teal-100 dark:border-teal-900/50 leading-relaxed font-medium">
                  {asset.note}
                </div>
              </div>
            )}

            {/* Description & Usage Guide */}
            {asset.item.description && (
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> รายละเอียดและคำแนะนำการใช้งาน:
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50/70 dark:bg-slate-850/80 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {asset.item.description}
                </p>
              </div>
            )}

            {/* Active Defect / Issue Banner */}
            {asset.activeIssueReports && asset.activeIssueReports.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs space-y-2">
                <div className="font-bold flex items-center justify-between text-amber-900 dark:text-amber-300">
                  <span className="flex items-center gap-1.5 text-sm">
                    <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    มีการแจ้งปัญหา / ข้อบกพร่อง ({asset.activeIssueReports.length} รายการ)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    รอดำเนินการ
                  </span>
                </div>
                <div className="space-y-1.5 divide-y divide-amber-200/60 dark:divide-amber-800/40">
                  {asset.activeIssueReports.map((rep: any) => (
                    <div key={rep.id} className="pt-1.5 first:pt-0">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          rep.urgency === 'CRITICAL' ? 'bg-rose-600 text-white' : rep.urgency === 'URGENT' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }`}>
                          {rep.urgency === 'CRITICAL' ? 'วิกฤต' : rep.urgency === 'URGENT' ? 'เร่งด่วน' : 'ปกติ'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">[{rep.reportNumber}]</span>
                        <span>{rep.issueDescription}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        แจ้งโดย: {rep.reporterName || 'ผู้ใช้ทั่วไป'} ({rep.reporterRole === 'STUDENT' ? 'นิสิต' : rep.reporterRole === 'TEACHER' ? 'อาจารย์' : 'เจ้าหน้าที่'}) • {new Date(rep.createdAt).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance & Inspection Status Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>ประวัติการตรวจเช็กและบำรุงรักษา (PM)</span>
                </div>
                {isStaff && (
                  <button
                    type="button"
                    onClick={() => setInspectModalOpen(true)}
                    className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>ตรวจสภาพด่วน</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-750">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px]">ตรวจสภาพล่าสุด</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {asset.lastInspectedAt ? new Date(asset.lastInspectedAt).toLocaleDateString('th-TH') : 'ยังไม่เคยบันทึก'}
                  </span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-750">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px]">รอบตรวจครั้งถัดไป</span>
                  <span className={`font-bold ${
                    asset.nextInspectionDue && new Date(asset.nextInspectionDue) < new Date()
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {asset.nextInspectionDue ? new Date(asset.nextInspectionDue).toLocaleDateString('th-TH') : 'ตามรอบปกติ'}
                    {asset.nextInspectionDue && new Date(asset.nextInspectionDue) < new Date() && (
                      <span className="ml-1 text-[10px] text-rose-500 font-bold">(เกินกำหนด)</span>
                    )}
                  </span>
                </div>
              </div>

              {asset.inspectionLogs && asset.inspectionLogs.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ประวัติการตรวจล่าสุด</div>
                  {asset.inspectionLogs.map((log: any) => (
                    <div key={log.id} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-750 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          log.result === 'PASS' ? 'bg-emerald-500' : log.result === 'PASS_WITH_NOTE' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <span className="text-slate-700 dark:text-slate-300">
                          {new Date(log.inspectionDate).toLocaleDateString('th-TH')} โดย {log.inspector?.name || 'เจ้าหน้าที่'}
                        </span>
                      </div>
                      <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${
                        log.result === 'PASS'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : log.result === 'PASS_WITH_NOTE'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {log.result === 'PASS' ? 'ปกติ' : log.result === 'PASS_WITH_NOTE' ? 'มีข้อสังเกต' : 'ชำรุด/งดใช้'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setReportSuccessCode(null);
                  setReportModalOpen(true);
                }}
                className="w-full py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>📢 แจ้งปัญหา / พบอุปกรณ์ชำรุด (ส่งเรื่องทันที)</span>
              </button>

              {currentUser ? (
                <Link
                  href={`/borrow?assetCode=${encodeURIComponent(asset.assetCode)}`}
                  className={`w-full py-3 rounded-2xl text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-2 ${
                    isAvailable
                      ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20'
                      : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  <BriefcaseMedical className="w-4 h-4" />
                  <span>{isAvailable ? 'ทำเรื่องขอยืมอุปกรณ์ชิ้นนี้' : 'อุปกรณ์ไม่พร้อมให้ยืมชั่วคราว'}</span>
                </Link>
              ) : (
                <Link
                  href={`/login?redirect=/borrow?assetCode=${encodeURIComponent(asset.assetCode)}`}
                  className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบเพื่อทำเรื่องขอยืมชิ้นนี้</span>
                </Link>
              )}

              <Link
                href="/inventory"
                className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>ดูทะเบียนพัสดุทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
          <div>ระบบบริหารจัดการห้องปฏิบัติการพยาบาลศาสตร์</div>
          <div>สแกน QR Code จากตัวเครื่องเพื่อเปิดดูข้อมูลแบบสาธารณะโดยไม่ต้องล็อกอิน</div>
        </div>
      </div>

      {/* Quick Issue Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">แจ้งปัญหา / ข้อบกพร่อง</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{asset.assetCode} - {asset.item.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccessCode ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">ส่งเรื่องแจ้งปัญหาเรียบร้อยแล้ว</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  รหัสรับเรื่อง: <b className="font-mono text-teal-600 dark:text-teal-400">{reportSuccessCode}</b>
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  เจ้าหน้าที่ห้องปฏิบัติการได้รับข้อมูลแล้ว และจะรีบดำเนินการตรวจสอบความปลอดภัยต่อไป
                </p>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="mt-3 px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow hover:bg-teal-500 transition cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitIssue} className="space-y-3.5 text-xs">
                {reportError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 font-medium">
                    {reportError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ระดับความเร่งด่วน <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'NORMAL', label: 'ปกติ', color: 'border-slate-300 hover:border-teal-500 text-slate-700' },
                      { val: 'URGENT', label: 'เร่งด่วน (มีเรียน)', color: 'border-amber-300 hover:border-amber-500 text-amber-700' },
                      { val: 'CRITICAL', label: 'วิกฤต/หยุดใช้', color: 'border-rose-300 hover:border-rose-500 text-rose-700' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setIssueForm((prev) => ({ ...prev, urgency: item.val }))}
                        className={`p-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                          issueForm.urgency === item.val
                            ? 'bg-teal-50 border-teal-600 text-teal-800 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-400 ring-2 ring-teal-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {issueForm.urgency === 'CRITICAL' && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                      ⚠️ ระบบจะเปลี่ยนสถานะเครื่องเป็น &quot;ส่งซ่อมบำรุง&quot; ทันทีเพื่อความปลอดภัยของนิสิตและบุคลากร
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    อาการชำรุด / ปัญหาที่พบ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={issueForm.issueDescription}
                    onChange={(e) => setIssueForm((prev) => ({ ...prev, issueDescription: e.target.value }))}
                    placeholder="เช่น แขนหุ่นหลวม, สัญญาณไฟไม่ติด, มีเสียงดังผิดปกติ, สายรั่วซึม..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      สถานะผู้แจ้ง
                    </label>
                    <select
                      value={issueForm.reporterRole}
                      onChange={(e) => setIssueForm((prev) => ({ ...prev, reporterRole: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-sans"
                    >
                      <option value="STUDENT">นิสิต (Student)</option>
                      <option value="TEACHER">อาจารย์ผู้สอน (Faculty)</option>
                      <option value="OFFICER">เจ้าหน้าที่ / นักวิทยาศาสตร์</option>
                      <option value="OTHER">บุคคลภายนอก / อื่นๆ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      ชื่อผู้แจ้ง
                    </label>
                    <input
                      type="text"
                      value={issueForm.reporterName}
                      onChange={(e) => setIssueForm((prev) => ({ ...prev, reporterName: e.target.value }))}
                      placeholder="ชื่อ-สกุล"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    เบอร์ติดต่อกลับ (กรณีเจ้าหน้าที่สอบถามเพิ่มเติม)
                  </label>
                  <input
                    type="tel"
                    value={issueForm.contactPhone}
                    onChange={(e) => setIssueForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    แนบรูปภาพจุดที่ชำรุด (ถ้ามี)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-teal-950 dark:file:text-teal-300"
                  />
                  {issueForm.photoUrl && (
                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={issueForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{reportSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งเรื่องแจ้งปัญหา'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Staff Digital Checklist Modal */}
      {inspectModalOpen && isStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">บันทึกตรวจสภาพประจำงวด (Staff)</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{asset.assetCode} - {asset.item.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectSuccess ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">บันทึกผลการตรวจเรียบร้อย</h4>
                <p className="text-xs text-slate-400">ระบบได้อัปเดตรอบการตรวจครั้งถัดไปให้โดยอัตโนมัติ</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitInspection} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                    รายการตรวจเช็กมาตรฐาน (Checklist)
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'visualCondition', label: '1. สภาพภายนอก ไม่แตกร้าว/ผิวหุ่นสมบูรณ์' },
                      { key: 'powerAndBattery', label: '2. สายไฟ / แบตเตอรี่ / จุดเชื่อมต่อแน่นหนา' },
                      { key: 'functionSelfTest', label: '3. การทำงานพื้นฐาน / Self-test ผ่าน' },
                      { key: 'cleanliness', label: '4. ความสะอาด ปราศจากคราบสารคัดหลั่งจำลอง' },
                      { key: 'accessoriesComplete', label: '5. อุปกรณ์เสริม / อะแดปเตอร์ / ชิ้นส่วนครบ' },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={inspectionChecks[item.key] || false}
                          onChange={(e) =>
                            setInspectionChecks((prev) => ({ ...prev, [item.key]: e.target.checked }))
                          }
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สรุปผลการตรวจสภาพ
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'PASS', label: 'ผ่าน (สมบูรณ์)', color: 'text-emerald-600' },
                      { val: 'PASS_WITH_NOTE', label: 'ผ่าน (มีข้อสังเกต)', color: 'text-amber-600' },
                      { val: 'FAIL', label: 'ไม่ผ่าน (ส่งซ่อม)', color: 'text-rose-600' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setInspectionResult(item.val as any)}
                        className={`p-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                          inspectionResult === item.val
                            ? 'bg-teal-50 border-teal-600 text-teal-800 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-400 ring-2 ring-teal-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หมายเหตุ / ข้อแนะนำของเจ้าหน้าที่
                  </label>
                  <textarea
                    rows={2}
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="บันทึกเพิ่มเติม (ถ้ามี)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-xs font-sans"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={inspectSubmitting}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{inspectSubmitting ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจ'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
