'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { formatImageUrl } from '@/lib/image-helper';
import {
  ArrowLeft,
  Wrench,
  Camera,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  CheckCircle2,
  Phone,
  User,
  Building2,
  MapPin,
  Tag,
  Sparkles,
  Upload,
  X,
  Search,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

function MaintenanceReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get('assetId');
  const initialAssetCode = searchParams.get('code');

  const { currentUser } = useAuth();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState<any | null>(null);

  // Asset Lookup
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [searchAssetQuery, setSearchAssetQuery] = useState('');

  // Form State
  const [reporterName, setReporterName] = useState('');
  const [reporterRole, setReporterRole] = useState('STUDENT');
  const [contactPhone, setContactPhone] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('NORMAL');
  const [photoUrl, setPhotoUrl] = useState('');
  const [quickSymptom, setQuickSymptom] = useState('');

  // Common Symptom presets
  const commonSymptoms = [
    'เครื่องเปิดไม่ติด / ไฟไม่เข้า',
    'หน้าจอแสดงผลไม่ขึ้น / ดับวูบ',
    'แบตเตอรี่เสื่อม / ชาร์จไฟไม่เข้า',
    'ปุ่มกดค้าง / ทัชสกรีนไม่ตอบสนอง',
    'สายไฟขาด / ข้อต่อหลวม / ชำรุด',
    'มีเสียงดังผิดปกติ / มีกลิ่นไหม้',
    'อุปกรณ์เสริมหรือหัวตรวจชำรุด/สูญหาย',
  ];

  // 1. Fetch Assets & Initial Target
  useEffect(() => {
    let isMounted = true;
    async function init() {
      setLoading(true);
      try {
        const res = await fetch('/api/assets?limit=100');
        let assetList: any[] = [];
        if (res.ok) {
          const data = await res.json();
          assetList = Array.isArray(data) ? data : data.assets || [];
          if (isMounted) setAssets(assetList);
        }

        // Check if preselected by code or id
        if (initialAssetId) {
          const found = assetList.find((a) => a.id === initialAssetId);
          if (found && isMounted) setSelectedAsset(found);
        } else if (initialAssetCode) {
          const found = assetList.find((a) => a.assetCode === initialAssetCode);
          if (found && isMounted) setSelectedAsset(found);
        }

        // Prefill user details
        if (currentUser && isMounted) {
          setReporterName(currentUser.name || '');
          setReporterRole(
            currentUser.role === 'TEACHER'
              ? 'TEACHER'
              : ['ADMIN', 'OFFICER'].includes(currentUser.role)
              ? 'OFFICER'
              : 'STUDENT'
          );
          setContactPhone(currentUser.phone || '');
        }
      } catch (err) {
        console.error('Failed to initialize maintenance report page:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [initialAssetId, initialAssetCode, currentUser]);

  // Handle Photo File Upload / Camera
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      alert('กรุณาเลือกครุภัณฑ์ที่ต้องการแจ้งซ่อมหรือพบปัญหา');
      return;
    }

    const finalDescription = quickSymptom
      ? `${quickSymptom} - ${issueDescription}`.trim()
      : issueDescription.trim();

    if (!finalDescription) {
      alert('กรุณาระบุรายละเอียดอาการชำรุดหรือปัญหาที่พบ');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          assetCode: selectedAsset.assetCode,
          reporterName: reporterName || 'นิสิต (ไม่ระบุชื่อ)',
          reporterRole,
          contactPhone,
          issueDescription: finalDescription,
          urgency,
          photoUrl: photoUrl || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessReport(data.report);
      } else {
        const err = await res.json();
        alert(err.error || 'ไม่สามารถส่งเรื่องแจ้งปัญหาได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Assets for Search
  const filteredAssets = assets
    .filter((a) => {
      if (!searchAssetQuery.trim()) return true;
      const q = searchAssetQuery.toLowerCase();
      return (
        (a.assetCode && a.assetCode.toLowerCase().includes(q)) ||
        (a.item?.name && a.item.name.toLowerCase().includes(q)) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q))
      );
    })
    .slice(0, 8);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <LoadingSpinner />
        <p className="mt-4 text-sm font-medium">กำลังเตรียมฟอร์มแจ้งซ่อมครุภัณฑ์...</p>
      </div>
    );
  }

  // Success Confirmation Screen
  if (successReport) {
    return (
      <div className="max-w-xl mx-auto my-10 px-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-emerald-200 dark:border-emerald-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-full">
              ส่งเรื่องแจ้งซ่อมเรียบร้อย
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-3">
              รหัสแจ้งปัญหา: {successReport.reportNumber}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              ระบบส่งการแจ้งเตือนไปยังนักวิทยาศาสตร์และเจ้าหน้าที่ห้องปฏิบัติการเพื่อประสานงานตรวจเช็กและซ่อมแซมแล้ว
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-left border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">ครุภัณฑ์:</span>
              <span className="font-bold text-slate-800 dark:text-white">{successReport.asset?.item?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">รหัสครุภัณฑ์:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-white">{successReport.asset?.assetCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ระดับความเร่งด่วน:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{successReport.urgency}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/maintenance"
              className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-sm shadow-md transition-colors"
            >
              ดูรายการแจ้งซ่อมทั้งหมด
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessReport(null);
                setIssueDescription('');
                setPhotoUrl('');
                setQuickSymptom('');
              }}
              className="px-5 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              แจ้งซ่อมเครื่องอื่น
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-36 md:pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับระบบซ่อมบำรุง
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-semibold">
          <Wrench className="w-3.5 h-3.5" /> เปิดใบแจ้งซ่อมครุภัณฑ์
        </span>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-amber-600 to-orange-600 text-white rounded-3xl p-6 md:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-semibold mb-3">
              <Wrench className="w-3.5 h-3.5" /> Maintenance & Repair Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              เปิดใบแจ้งซ่อมครุภัณฑ์และรายงานปัญหา
            </h1>
            <p className="text-amber-100 text-sm mt-1">
              แจ้งปัญหาอุปกรณ์ชำรุด ถ่ายภาพความเสียหายเพื่อให้นักวิทยาศาสตร์เข้าตรวจสอบและส่งซ่อม
            </p>
          </div>

          {selectedAsset && (
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-1.5 min-w-[240px] border border-white/20 text-xs">
              <span className="text-amber-200 font-semibold flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> ครุภัณฑ์ที่เลือก:
              </span>
              <div className="font-bold text-sm text-white truncate">{selectedAsset.item?.name}</div>
              <div className="font-mono text-amber-100">{selectedAsset.assetCode}</div>
              {selectedAsset.storageLocation && (
                <div className="text-[11px] text-amber-200 flex items-center gap-1 pt-1 border-t border-white/20">
                  <MapPin className="w-3 h-3" /> {selectedAsset.storageLocation.name}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: Asset Selection */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-900">
                1
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">ระบุครุภัณฑ์ที่พบปัญหา</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">เลือกจากรายการหรือค้นหาด้วยรหัสครุภัณฑ์</p>
              </div>
            </div>
            {selectedAsset && (
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                เปลี่ยนครุภัณฑ์
              </button>
            )}
          </div>

          {selectedAsset ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedAsset.item?.name}
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    รหัส: {selectedAsset.assetCode} {selectedAsset.serialNumber ? `| S/N: ${selectedAsset.serialNumber}` : ''}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-full">
                พร้อมแจ้งซ่อม
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อครุภัณฑ์, รหัสทรัพย์สิน (Asset Code), หรือ Serial Number..."
                  value={searchAssetQuery}
                  onChange={(e) => setSearchAssetQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto">
                {filteredAssets.map((asset) => (
                  <button
                    type="button"
                    key={asset.id}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setSearchAssetQuery('');
                    }}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-left transition-all group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-amber-600">
                        {asset.item?.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{asset.assetCode}</div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      เลือก ➔
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Problem Description & Severity */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-900">
              2
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">รายละเอียดปัญหาและระดับความเร่งด่วน</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">ระบุอาการเสียและระดับความสำคัญ</p>
            </div>
          </div>

          {/* Urgency Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              ระดับความเร่งด่วน <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setUrgency('NORMAL')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  urgency === 'NORMAL'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">🟢 ปกติ (Normal)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ชำรุดเล็กน้อย ใช้งานรอบถัดไปได้</div>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('URGENT')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  urgency === 'URGENT'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">🟡 ด่วน (Urgent)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">จำเป็นต้องใช้ในชั่วโมงเรียนสัปดาห์นี้</div>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('CRITICAL')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  urgency === 'CRITICAL'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/30'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">🔴 วิกฤติ / อันตราย</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ระงับใช้ทันที (ไฟรั่ว/ควันขึ้น/เสียงระเบิด)</div>
              </button>
            </div>
          </div>

          {/* Quick Symptoms */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              เลือกอาการเสียที่พบบ่อย (Quick Symptoms)
            </label>
            <div className="flex flex-wrap gap-2">
              {commonSymptoms.map((sym) => {
                const isSelected = quickSymptom === sym;
                return (
                  <button
                    type="button"
                    key={sym}
                    onClick={() => setQuickSymptom(isSelected ? '' : sym)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              อธิบายรายละเอียดอาการชำรุดเพิ่มเติม <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="ระบุพฤติกรรมของเครื่องที่ผิดปกติ เช่น เมื่อเสียบปลั๊กมีเสียงเปรี๊ยะ หรือไฟไม่ติดขณะเปิดสวิตช์..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* SECTION 3: Photo Capture & Reporter Contact */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-900">
              3
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">ภาพถ่ายความเสียหายและข้อมูลผู้แจ้ง</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">แนบรูปถ่ายจากมือถือเพื่อให้เจ้าหน้าที่ประเมินอะไหล่ได้แม่นยำ</p>
            </div>
          </div>

          {/* Photo Capture */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              ภาพถ่ายครุภัณฑ์ / จุดที่ชำรุด (ไม่บังคับ แต่แนะนำ)
            </label>

            {photoUrl ? (
              <div className="relative inline-block rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700">
                <img src={photoUrl} alt="Issue preview" className="w-48 h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl hover:border-amber-500 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 cursor-pointer transition-all">
                <Camera className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  แตะเพื่อถ่ายรูปจากกล้องมือถือ หรือเลือกไฟล์ภาพ
                </span>
                <span className="text-[11px] text-slate-400 mt-1">รองรับ JPG, PNG ไม่เกิน 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Reporter Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ชื่อผู้แจ้ง
              </label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล หรือชื่อเล่น"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                สถานะผู้แจ้ง
              </label>
              <select
                value={reporterRole}
                onChange={(e) => setReporterRole(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500"
              >
                <option value="STUDENT">นิสิตพยาบาล</option>
                <option value="TEACHER">อาจารย์</option>
                <option value="OFFICER">เจ้าหน้าที่ / นักวิทยาศาสตร์</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                เบอร์โทรศัพท์ติดต่อกลับ
              </label>
              <input
                type="tel"
                placeholder="เช่น 081-234-5678"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Sticky Mobile Bottom Bar (Above Mobile BottomNav) */}
        <div className="fixed bottom-[58px] md:bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <Link
              href="/maintenance"
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </Link>

            <button
              type="submit"
              disabled={submitting || !selectedAsset}
              className="flex-1 sm:flex-none sm:min-w-[260px] px-5 sm:px-6 py-2.5 sm:py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner /> กำลังส่งเรื่อง...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5" /> ยืนยันการส่งใบแจ้งซ่อม
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function MaintenanceReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
          <LoadingSpinner />
          <p className="mt-4 text-sm font-medium">กำลังเตรียมฟอร์มแจ้งซ่อมครุภัณฑ์...</p>
        </div>
      }
    >
      <MaintenanceReportContent />
    </Suspense>
  );
}
