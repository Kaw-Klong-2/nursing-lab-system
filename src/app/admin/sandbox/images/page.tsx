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
  SlidersHorizontal,
  Image as ImageIcon,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface CandidateImage {
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: 'EQUIPMENT' | 'CONSUMABLE';
  category: string;
  brand: string;
  model: string;
  unit: string;
  originalSrc: string;
  cutoutSrc: string;
  aspectRatio: string;
  cutoutQuality: string;
  notes: string;
}

export default function AdminCatalogImageReviewPage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin, isLoading: authLoading } = useAuth();

  const [bgMode, setBgMode] = useState<'WHITE' | 'DARK' | 'GRID'>('WHITE');
  const [selectedZoom, setSelectedZoom] = useState<{ img: CandidateImage; mode: 'cutout' | 'original' } | null>(null);
  
  // Track toggle state for each item (default: show cutout)
  const [activeModes, setActiveModes] = useState<Record<string, 'cutout' | 'original'>>({
    'EQ-AI-0001': 'cutout',
    'EQ-MED-0001': 'cutout',
    'EQ-BRE-0001': 'cutout',
    'EQ-URC-0011': 'cutout',
  });

  const toggleMode = (code: string) => {
    setActiveModes((prev) => ({
      ...prev,
      [code]: prev[code] === 'cutout' ? 'original' : 'cutout',
    }));
  };

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

  const realCandidateImages: CandidateImage[] = [
    {
      itemId: 'cmtv0swz2005kliecsy5avwb3',
      itemCode: 'EQ-AI-0001',
      itemName: '(AI) หุ่นฝึกทักษะการพยาบาลขั้นสูง',
      itemType: 'EQUIPMENT',
      category: 'หุ่นฝึกทักษะทางการพยาบาล',
      brand: '3B Scientific',
      model: '101-7140-8Y (KERi)',
      unit: 'ตัว',
      originalSrc: '/catalog-preview/real-ai-mannequin-original.jpg',
      cutoutSrc: '/catalog-preview/real-ai-mannequin-cutout.png',
      aspectRatio: 'Transparent Cutout PNG (IS-Net)',
      cutoutQuality: 'ไดคัทขอบคม 100% เนียนกริบ ไร้พื้นหลังรบกวน',
      notes: 'ภาพถ่ายจริงของหุ่น KERi ในห้องแล็ป ตัดพื้นหลังสตูดิโอเดิมออก เหลือเพียงตัวหุ่นและเสื้อผ้าคมชัด',
    },
    {
      itemId: 'cmtv0v3w8013sliecevza79nk',
      itemCode: 'EQ-MED-0001',
      itemName: 'ชุดถังออกซิเจน 0.5Q พร้อมอุปกรณ์',
      itemType: 'EQUIPMENT',
      category: 'ออกซิเจนและการช่วยหายใจ',
      brand: 'Upright Simulation',
      model: 'Medical Device Standard',
      unit: 'ชุด',
      originalSrc: '/catalog-preview/real-o2tank-original.jpg',
      cutoutSrc: '/catalog-preview/real-o2tank-cutout.png',
      aspectRatio: 'Transparent Cutout PNG (IS-Net)',
      cutoutQuality: 'ไดคัทตัดเตียงคนไข้และผนังแล็ปออก รักษาเกจ์วัดและป้ายรหัสครุภัณฑ์จริง',
      notes: 'ภาพถ่ายจริงในห้องแล็ปข้างเตียงคนไข้ ถูกตัดเตียงและผนังออก คงไว้เฉพาะถังออกซิเจน เกจ์ปรับความดัน และขาตั้งล้อเลื่อน',
    },
    {
      itemId: 'cmtv0t428008oliecs8v9d910',
      itemCode: 'EQ-BRE-0001',
      itemName: 'หุ่นฝึกการตรวจเต้านม',
      itemType: 'EQUIPMENT',
      category: 'หุ่นฝึกทักษะทางการพยาบาล',
      brand: 'Limbs & Things',
      model: '40201',
      unit: 'ตัว',
      originalSrc: '/catalog-preview/real-breast-original.jpg',
      cutoutSrc: '/catalog-preview/real-breast-cutout.png',
      aspectRatio: 'Transparent Cutout PNG (IS-Net)',
      cutoutQuality: 'ไดคัทตัดถาดพยาบาลสีฟ้าและผนังห้องออก',
      notes: 'ภาพถ่ายจริงของหุ่นจำลองบนถาดรถเข็น ตัดพื้นผิวถาดและผนังออกคงรูปโมเดลกายวิภาค',
    },
    {
      itemId: 'cmtv0u4gn00oaliec6pqx1ugh',
      itemCode: 'EQ-URC-0011',
      itemName: 'หุ่นจำลองฝึกสวนปัสสาวะ (ชาย)',
      itemType: 'EQUIPMENT',
      category: 'หุ่นฝึกทักษะทางการพยาบาล',
      brand: 'Limbs & Things',
      model: '60850',
      unit: 'ชุด',
      originalSrc: '/catalog-preview/real-urc-male-original.jpg',
      cutoutSrc: '/catalog-preview/real-urc-male-cutout.png',
      aspectRatio: 'Transparent Cutout PNG (U2-Net)',
      cutoutQuality: 'ไดคัทตัดพื้นไม้ปาร์เกต์ห้องแล็ปออก คงกระเป๋าและอุปกรณ์สาธิตหลัก',
      notes: 'ภาพถ่ายจริงของเซ็ตอุปกรณ์บนพื้นห้องแล็ป ตัดลายไม้ปาร์เกต์ออกคงเหลือตัวหุ่น ถาดไต และกระเป๋าใส่อุปกรณ์',
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
                Real Asset Cut-Out Inspection
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
              <span>ห้องตรวจเช็กภาพถ่ายจริงไดคัท (Real Lab Photos Cut-out)</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ใช้ภาพของจริงในแล็ป 100%
              </span>
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              นำภาพถ่ายพัสดุจริงของห้องปฏิบัติการที่มีอยู่ในระบบ (ภาพเดิม 57 รายการ) มาไดคัทตัดพื้นหลังห้อง เตียงคนไข้ ผนัง และพื้นแล็ปออก เพื่อให้ได้ภาพอุปกรณ์เดี่ยวที่สะอาดตา พร้อมกดสลับดูเปรียบเทียบก่อน-หลังได้ทันที
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
              <span>ตารางหมากรุก (Check Transparency)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Instruction Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>วิธีตรวจสอบ:</strong> สามารถกดปุ่มสลับ <strong>[✨ ภาพไดคัท]</strong> และ <strong>[📷 ภาพถ่ายจริงเดิม]</strong> ที่การ์ดแต่ละใบ เพื่อดูความแตกต่างของการตัดพื้นหลัง หรือคลิกที่ภาพเพื่อขยายดูความละเอียดสูง
          </span>
        </div>
        <span className="font-semibold px-2.5 py-1 rounded-lg bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 shrink-0 text-center">
          ระบบมีภาพจริงทั้งหมด 57 รายการ
        </span>
      </div>

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {realCandidateImages.map((img) => {
          const isEquip = img.itemType === 'EQUIPMENT';
          const isCutout = activeModes[img.itemCode] !== 'original';
          const currentSrc = isCutout ? img.cutoutSrc : img.originalSrc;

          return (
            <div
              key={img.itemId}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between group"
            >
              {/* Image Preview Box with Selected Background */}
              <div
                className={`relative w-full h-72 overflow-hidden flex items-center justify-center p-4 transition-colors ${
                  !isCutout
                    ? 'bg-slate-100 dark:bg-slate-800'
                    : bgMode === 'WHITE'
                    ? 'bg-white'
                    : bgMode === 'DARK'
                    ? 'bg-slate-950'
                    : 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100'
                }`}
              >
                <img
                  src={currentSrc}
                  alt={img.itemName}
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => setSelectedZoom({ img, mode: isCutout ? 'cutout' : 'original' })}
                />

                {/* Floating Top Badges */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider backdrop-blur-md shadow-xs ${
                      isEquip ? 'bg-blue-600/90 text-white' : 'bg-teal-600/90 text-white'
                    }`}
                  >
                    {isEquip ? '🔧 ครุภัณฑ์' : '📦 วัสดุสิ้นเปลือง'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-md shadow-xs ${
                      isCutout
                        ? 'bg-emerald-600/90 text-white'
                        : 'bg-slate-700/90 text-slate-100'
                    }`}
                  >
                    {isCutout ? '✨ ไดคัทแล้ว' : '📷 รูปต้นฉบับ'}
                  </span>
                </div>

                {/* Zoom Button */}
                <button
                  type="button"
                  onClick={() => setSelectedZoom({ img, mode: isCutout ? 'cutout' : 'original' })}
                  className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white transition backdrop-blur-md shadow-md cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>ขยาย</span>
                </button>
              </div>

              {/* View Mode Toggle Buttons */}
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500">โหมดแสดงภาพ:</span>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => toggleMode(img.itemCode)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      isCutout
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    ✨ ไดคัท
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode(img.itemCode)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      !isCutout
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    📷 ต้นฉบับ
                  </button>
                </div>
              </div>

              {/* Card Meta & Quality Review */}
              <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/60 dark:border-teal-800/60">
                      {img.itemCode}
                    </span>
                    <span className="text-[11px] text-slate-400">หน่วย: {img.unit}</span>
                  </div>

                  <h3 className="text-xs font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {img.itemName}
                  </h3>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    ยี่ห้อ: <span className="font-semibold text-slate-700 dark:text-slate-200">{img.brand}</span> | รุ่น: <span className="font-semibold text-slate-700 dark:text-slate-200">{img.model}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {img.notes}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{img.cutoutQuality}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">สถานะ:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" />
                    รอท่านตรวจเช็ก
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Zoom Modal */}
      {selectedZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedZoom(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                  {selectedZoom.img.itemCode}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedZoom.img.itemName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedZoom(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
              >
                ปิดหน้าต่าง (ESC)
              </button>
            </div>

            <div
              className={`w-full h-96 sm:h-[480px] rounded-2xl overflow-hidden flex items-center justify-center p-4 transition-colors ${
                selectedZoom.mode === 'original'
                  ? 'bg-slate-100 dark:bg-slate-800'
                  : bgMode === 'WHITE'
                  ? 'bg-white'
                  : bgMode === 'DARK'
                  ? 'bg-slate-950'
                  : 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100'
              }`}
            >
              <img
                src={selectedZoom.mode === 'cutout' ? selectedZoom.img.cutoutSrc : selectedZoom.img.originalSrc}
                alt={selectedZoom.img.itemName}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>{selectedZoom.img.notes}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedZoom({
                      ...selectedZoom,
                      mode: selectedZoom.mode === 'cutout' ? 'original' : 'cutout',
                    })
                  }
                  className="px-3 py-1 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 cursor-pointer"
                >
                  สลับดู {selectedZoom.mode === 'cutout' ? 'รูปต้นฉบับเดิม' : 'รูปไดคัท'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
