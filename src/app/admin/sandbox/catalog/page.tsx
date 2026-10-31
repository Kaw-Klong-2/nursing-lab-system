'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Code,
  CheckCircle2,
  AlertCircle,
  Eye,
  UserCheck,
  GraduationCap,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import BorrowCatalogBrowser, {
  CatalogItem,
  PracticeKitComponent,
  BorrowRow,
  RequisitionRow,
} from '@/components/borrow/BorrowCatalogBrowser';

export default function AdminCatalogSandboxPage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin, isLoading: authLoading } = useAuth();

  const [equipmentList, setEquipmentList] = useState<CatalogItem[]>([]);
  const [consumablesList, setConsumablesList] = useState<CatalogItem[]>([]);
  const [practiceKits, setPracticeKits] = useState<PracticeKitComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playground state
  const [borrowItems, setBorrowItems] = useState<BorrowRow[]>([]);
  const [requisitionItems, setRequisitionItems] = useState<RequisitionRow[]>([]);
  const [simulatedRole, setSimulatedRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  useEffect(() => {
    if (!authLoading && !isOfficer && !isAdmin) {
      router.replace('/');
    }
  }, [authLoading, isOfficer, isAdmin, router]);

  useEffect(() => {
    let isMounted = true;
    async function loadCatalogData() {
      try {
        setLoading(true);
        setError(null);

        const [eqRes, conRes, kitsRes] = await Promise.all([
          fetch('/api/items?type=EQUIPMENT&compact=true'),
          fetch('/api/items?type=CONSUMABLE&compact=true'),
          fetch('/api/kits'),
        ]);

        if (!eqRes.ok || !conRes.ok) {
          throw new Error('ไม่สามารถดึงข้อมูลพัสดุจากคลังได้');
        }

        const eqData = await eqRes.json();
        const conData = await conRes.json();
        const kitsData = kitsRes.ok ? await kitsRes.json() : [];

        if (isMounted) {
          setEquipmentList(Array.isArray(eqData) ? eqData : []);
          setConsumablesList(Array.isArray(conData) ? conData : []);
          setPracticeKits(Array.isArray(kitsData) ? kitsData : []);
        }
      } catch (err: any) {
        console.error('Failed to load catalog data:', err);
        if (isMounted) {
          setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (currentUser && (isOfficer || isAdmin)) {
      loadCatalogData();
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser, isOfficer, isAdmin]);

  const handleResetCart = () => {
    setBorrowItems([]);
    setRequisitionItems([]);
  };

  if (authLoading || loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดห้องทดลองแคตตาล็อกพัสดุ..."
        submessage="ดึงข้อมูลครุภัณฑ์ วัสดุสิ้นเปลือง และชุดเซ็ตฝึกปฏิบัติการ"
      />
    );
  }

  if (!currentUser || (!isOfficer && !isAdmin)) {
    return null;
  }

  const totalSelectedItems = borrowItems.length + requisitionItems.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Navigation & Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/sandbox"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับสู่ Sandbox Hub</span>
            </Link>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Catalog Playground</span>
            </span>
          </div>

          {/* Sandbox Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Simulation Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSimulatedRole('STUDENT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  simulatedRole === 'STUDENT'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>จำลองมุมมองนิสิต</span>
              </button>
              <button
                type="button"
                onClick={() => setSimulatedRole('TEACHER')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  simulatedRole === 'TEACHER'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>จำลองมุมมองอาจารย์</span>
              </button>
            </div>

            {/* Reset Cart */}
            <button
              type="button"
              onClick={handleResetCart}
              disabled={totalSelectedItems === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition"
              title="ล้างรายการที่เลือกทั้งหมดในหน้านี้"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตะกร้า ({totalSelectedItems})</span>
            </button>

            {/* JSON Payload Inspector */}
            <button
              type="button"
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-slate-700 hover:bg-slate-800 transition"
            >
              <Code className="w-3.5 h-3.5 text-teal-400" />
              <span>{showJsonInspector ? 'ซ่อน JSON Payload' : 'ดู JSON Payload'}</span>
              {showJsonInspector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Informational Sandbox Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-transparent p-4 border border-teal-200/80 dark:border-teal-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>พื้นที่ทดสอบแคตตาล็อกเบิก-ยืมพัสดุ (Interactive Playground)</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  {simulatedRole === 'STUDENT' ? '🎓 มุมมองนิสิต' : '👨‍🏫 มุมมองอาจารย์'}
                </span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                ท่านสามารถทดสอบการสลับแท็บพัสดุ, การระบุหน่วยย่อย/กล่อง, การกด 1-Click เพิ่มชุดฝึกทักษะ และสังเกตโครงสร้างข้อมูล JSON ที่ระบบจะส่งไปยัง Backend ได้โดยไม่กระทบคลังจริง
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>คลังจริงปลอดภัย 100%</span>
          </div>
        </div>
      </div>

      {/* JSON Payload Inspector Drawer */}
      {showJsonInspector && (
        <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 shadow-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-teal-400 font-bold">
              <Code className="w-4 h-4" />
              <span>Simulated Request Payload (พร้อมส่งเข้า API /api/borrow หรือ /api/requisitions)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              ยืมครุภัณฑ์: {borrowItems.length} ชิ้น | เบิกวัสดุสิ้นเปลือง: {requisitionItems.length} รายการ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
            <div className="space-y-1">
              <span className="text-teal-300 text-[11px] font-bold">1. borrowItems (ครุภัณฑ์ที่ขอยืม):</span>
              <pre className="p-2.5 rounded-xl bg-slate-950/80 text-[11px] overflow-x-auto text-emerald-300">
                {JSON.stringify(borrowItems, null, 2)}
              </pre>
            </div>
            <div className="space-y-1">
              <span className="text-cyan-300 text-[11px] font-bold">2. requisitionItems (วัสดุสิ้นเปลืองที่ขอเบิก):</span>
              <pre className="p-2.5 rounded-xl bg-slate-950/80 text-[11px] overflow-x-auto text-cyan-300">
                {JSON.stringify(requisitionItems, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* 2. Mount BorrowCatalogBrowser Component */}
      <BorrowCatalogBrowser
        equipmentList={equipmentList}
        consumablesList={consumablesList}
        practiceKits={practiceKits}
        borrowItems={borrowItems}
        requisitionItems={requisitionItems}
        onUpdateBorrowItems={setBorrowItems}
        onUpdateRequisitionItems={setRequisitionItems}
        readOnly={false}
      />
    </div>
  );
}
