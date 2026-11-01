'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Eye,
  Layers,
  ZoomIn,
  Sun,
  Moon,
  ExternalLink,
  UploadCloud,
  Check,
  RotateCcw,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface CandidateImage {
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: 'EQUIPMENT' | 'CONSUMABLE';
  category: string;
  unit: string;
  imageSrc: string;
  aspectRatio: string;
  cutoutQuality: string;
  notes: string;
}

export default function AdminCatalogImageReviewPage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin, isLoading: authLoading } = useAuth();

  const [bgMode, setBgMode] = useState<'WHITE' | 'DARK' | 'GRID'>('WHITE');
  const [selectedZoom, setSelectedZoom] = useState<CandidateImage | null>(null);

  if (authLoading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดห้องตรวจรับภาพพัสดุไดคัท..."
        submessage="ตรวจสอบสิทธิ์ผู้ดูแลระบบและเจ้าหน้าที่"
      />
    );
  }

  if (!currentUser || (!isOfficer && !isAdmin)) {
    return null;
  }

  const candidateImages: CandidateImage[] = [
    {
      itemId: 'cmtv0sscz003mliecvgtkhr5o',
      itemCode: 'EQ-AED-0001',
      itemName: 'เครื่องกระตุกไฟฟ้าหัวใจ (Automated External Defibrillator / AED)',
      itemType: 'EQUIPMENT',
      category: 'เครื่องกระตุกไฟฟ้าหัวใจและ AED',
      unit: 'เครื่อง',
      imageSrc: '/catalog-preview/aed.jpg',
      aspectRatio: '1:1 Square Studio',
      cutoutQuality: 'ไดคัทพื้นหลังขาวสะอาด 100% (Isolated White)',
      notes: 'ตัวเครื่องสีแดง-เหลืองตามมาตรฐานการแพทย์ พร้อมแผ่นอิเล็กโทรด แผ่นสอนตำแหน่ง และจอแสดงคลื่น ECG ชัดเจน',
    },
    {
      itemId: 'cmtv0suwd004qliecyiu0tzjl',
      itemCode: 'EQ-BED-0001',
      itemName: 'เตียงนอนไฟฟ้า (Hospital Electric Patient Bed)',
      itemType: 'EQUIPMENT',
      category: 'เตียงและตู้ข้างเตียง',
      unit: 'หลัง',
      imageSrc: '/catalog-preview/hospital-bed.jpg',
      aspectRatio: '1:1 Square Studio',
      cutoutQuality: 'ไดคัทพื้นหลังขาวสะอาด 100% (Isolated White)',
      notes: 'เตียงไฟฟ้าพยาบาลพร้อมเบาะไวนิลสีฟ้า ราวกั้นเตียงสไลด์ รีโมตควบคุม และล้อล็อกพยาบาล มองเห็นโครงสร้างครบถ้วน',
    },
    {
      itemId: 'cmty1g2go005blij8esy8vebr',
      itemCode: 'CS-ALC-PAD',
      itemName: 'แผ่นสำลีชุบแอลกอฮอล์ (Alcohol Prep Pads 70%)',
      itemType: 'CONSUMABLE',
      category: 'แอลกอฮอล์',
      unit: 'กล่อง',
      imageSrc: '/catalog-preview/alcohol-pad.jpg',
      aspectRatio: '1:1 Square Studio',
      cutoutQuality: 'ไดคัทพื้นหลังขาวสะอาด 100% (Isolated White)',
      notes: 'กล่องบรรจุ 200 ซอง พร้อมซองฟอยล์ปลอดเชื้อและตัวอย่างแผ่นสำลีคลี่ออก มีข้อความภาษาไทยและอังกฤษตรงตามมาตรฐานเวชภัณฑ์',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-purple-500/10 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 p-6 sm:p-7 border border-teal-200/80 dark:border-teal-900/60 shadow-lg shadow-teal-900/5">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link
                href="/admin/sandbox"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับสู่ Sandbox Hub</span>
              </Link>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100/90 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Camera className="w-3.5 h-3.5 text-purple-600" />
                Image Quality Inspection
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>ห้องตรวจเช็กภาพถ่ายพัสดุไดคัท (Catalog Image Review)</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                รอตรวจรับก่อนขึ้นไดรฟ์
              </span>
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              ภาพถ่ายพัสดุชุดทดสอบที่ผ่านการตัดต่อและไดคัทพื้นหลังแบบ Isolated Studio Cut-out เพื่อให้ท่านได้ตรวจเช็กคุณภาพ ความคมชัด และความถูกต้องของอุปกรณ์ ก่อนส่งขึ้น Google Drive ของคณะ
            </p>
          </div>

          {/* Background Tester Switcher */}
          <div className="flex items-center bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs self-start md:self-center gap-1">
            <span className="text-xs font-bold text-slate-500 px-2">ทดสอบฉากหลัง:</span>
            <button
              type="button"
              onClick={() => setBgMode('WHITE')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                bgMode === 'WHITE'
                  ? 'bg-slate-100 text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>พื้นขาว</span>
            </button>
            <button
              type="button"
              onClick={() => setBgMode('DARK')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                bgMode === 'DARK'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>พื้นมืด</span>
            </button>
            <button
              type="button"
              onClick={() => setBgMode('GRID')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                bgMode === 'GRID'
                  ? 'bg-purple-100 text-purple-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>ลายตารางตารางหมากรุก (Check Transparency)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {candidateImages.map((img) => {
          const isEquip = img.itemType === 'EQUIPMENT';

          return (
            <div
              key={img.itemId}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between group"
            >
              {/* Image Preview Box with Selected Background */}
              <div
                className={`relative w-full h-72 overflow-hidden flex items-center justify-center p-4 transition-colors ${
                  bgMode === 'WHITE'
                    ? 'bg-white'
                    : bgMode === 'DARK'
                    ? 'bg-slate-950'
                    : 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100'
                }`}
              >
                <img
                  src={img.imageSrc}
                  alt={img.itemName}
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => setSelectedZoom(img)}
                />

                {/* Floating Top Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider backdrop-blur-md shadow-xs ${
                      isEquip ? 'bg-blue-600/90 text-white' : 'bg-teal-600/90 text-white'
                    }`}
                  >
                    {isEquip ? '🔧 ครุภัณฑ์' : '📦 วัสดุสิ้นเปลือง'}
                  </span>
                </div>

                {/* Zoom Button */}
                <button
                  type="button"
                  onClick={() => setSelectedZoom(img)}
                  className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white transition backdrop-blur-md shadow-md cursor-pointer flex items-center gap-1 text-xs font-bold"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span>ขยายดูความละเอียด</span>
                </button>
              </div>

              {/* Card Meta & Quality Review */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/60 dark:border-teal-800/60">
                      {img.itemCode}
                    </span>
                    <span className="text-[11px] text-slate-400">หน่วยนับ: {img.unit}</span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                    {img.itemName}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {img.notes}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{img.cutoutQuality}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>อัตราส่วนภาพ: {img.aspectRatio}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>รอท่านอนุมัติ</span>
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    (พร้อมอัปขึ้น Google Drive ทันทีที่ท่านอนุมัติ)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Zoom Modal */}
      {selectedZoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  {selectedZoom.itemCode}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                  {selectedZoom.itemName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedZoom(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 flex items-center justify-center min-h-[350px]">
              <img
                src={selectedZoom.imageSrc}
                alt={selectedZoom.itemName}
                className="max-h-[500px] max-w-full object-contain rounded-2xl shadow-xl"
              />
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>{selectedZoom.cutoutQuality}</span>
              <button
                type="button"
                onClick={() => setSelectedZoom(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
