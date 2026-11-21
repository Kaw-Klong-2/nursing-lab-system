'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  Save,
  Settings2,
  Users,
  X,
} from 'lucide-react';
import {
  type AcMemoConfig,
  type MemoUrgencyLevel,
  type MonthlyAcApiPayload,
  buildAcMemoPrintHtml,
  buildMultiMonthAcAttachmentPrintHtml,
  DEFAULT_AC_MEMO_CONFIG,
  downloadAcMemoDocx,
  enumerateMonthRange,
  formatDigits,
  formatMemoDateText,
  formatThaiPeriodText,
  THAI_MONTHS,
} from '@/lib/ac-memo-docx';

interface AcMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: number;
  currentYear: number;
  selectedRoomIds: string[];
}

type PeriodMode = 'quarter' | 'single' | 'custom';
type EditorTab = 'period' | 'content' | 'signers';

const QUARTERS = [
  { id: 1, label: 'ม.ค. – มี.ค.', startMonth: 1, endMonth: 3 },
  { id: 2, label: 'เม.ย. – มิ.ย.', startMonth: 4, endMonth: 6 },
  { id: 3, label: 'ก.ค. – ก.ย.', startMonth: 7, endMonth: 9 },
  { id: 4, label: 'ต.ค. – ธ.ค.', startMonth: 10, endMonth: 12 },
] as const;

export default function AcMemoModal({
  isOpen,
  onClose,
  currentMonth,
  currentYear,
  selectedRoomIds,
}: AcMemoModalProps) {
  const [config, setConfig] = useState<AcMemoConfig>(DEFAULT_AC_MEMO_CONFIG);
  const [activeTab, setActiveTab] = useState<EditorTab>('period');

  // Period selection
  const [periodMode, setPeriodMode] = useState<PeriodMode>('quarter');
  const [quarterNum, setQuarterNum] = useState<number>(() => Math.ceil(currentMonth / 3));
  const [quarterYear, setQuarterYear] = useState<number>(currentYear);

  const [singleMonth, setSingleMonth] = useState<number>(currentMonth);
  const [singleYear, setSingleYear] = useState<number>(currentYear);

  const [customStartMonth, setCustomStartMonth] = useState<number>(currentMonth);
  const [customStartYear, setCustomStartYear] = useState<number>(currentYear);
  const [customEndMonth, setCustomEndMonth] = useState<number>(currentMonth);
  const [customEndYear, setCustomEndYear] = useState<number>(currentYear);

  // Memo Document Date
  const [blankDay, setBlankDay] = useState<boolean>(true);
  const [docDay, setDocDay] = useState<number>(() => new Date().getDate());
  const [docMonth, setDocMonth] = useState<number>(() => (currentMonth % 12) + 1);
  const [docYear, setDocYear] = useState<number>(() =>
    currentMonth === 12 ? currentYear + 1 : currentYear
  );

  // Action states
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [printingAttachments, setPrintingAttachments] = useState(false);

  // Initialize period defaults cleanly on modal open and load saved faculty config
  useEffect(() => {
    if (!isOpen) return;
    setSaveMessage(null);
    const q = Math.ceil(currentMonth / 3);
    setQuarterNum(q);
    setQuarterYear(currentYear);
    setSingleMonth(currentMonth);
    setSingleYear(currentYear);
    setCustomStartMonth(currentMonth);
    setCustomStartYear(currentYear);
    setCustomEndMonth(currentMonth);
    setCustomEndYear(currentYear);

    const endM = periodMode === 'quarter' ? q * 3 : currentMonth;
    const nextM = endM === 12 ? 1 : endM + 1;
    const nextY = endM === 12 ? currentYear + 1 : currentYear;
    setDocMonth(nextM);
    setDocYear(nextY);

    let cancelled = false;
    setLoadingConfig(true);
    fetch('/api/ac-logs/memo-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json?.success && json.config) {
          setConfig(json.config);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentMonth, currentYear]);

  // Compute effective start/end range
  const { startMonth, startYear, endMonth, endYear } = useMemo(() => {
    if (periodMode === 'quarter') {
      const qDef = QUARTERS.find((x) => x.id === quarterNum) || QUARTERS[0];
      return {
        startMonth: qDef.startMonth,
        startYear: quarterYear,
        endMonth: qDef.endMonth,
        endYear: quarterYear,
      };
    }
    if (periodMode === 'single') {
      return {
        startMonth: singleMonth,
        startYear: singleYear,
        endMonth: singleMonth,
        endYear: singleYear,
      };
    }
    // Custom: normalize if user picked start > end
    const startVal = customStartYear * 12 + customStartMonth;
    const endVal = customEndYear * 12 + customEndMonth;
    if (startVal <= endVal) {
      return {
        startMonth: customStartMonth,
        startYear: customStartYear,
        endMonth: customEndMonth,
        endYear: customEndYear,
      };
    }
    return {
      startMonth: customEndMonth,
      startYear: customEndYear,
      endMonth: customStartMonth,
      endYear: customStartYear,
    };
  }, [
    periodMode,
    quarterNum,
    quarterYear,
    singleMonth,
    singleYear,
    customStartMonth,
    customStartYear,
    customEndMonth,
    customEndYear,
  ]);

  // Update suggested memo date month when switching quarter preset
  const handleSelectQuarter = (qId: number, yearVal = quarterYear) => {
    setQuarterNum(qId);
    setQuarterYear(yearVal);
    const endM = qId * 3;
    const nextM = endM === 12 ? 1 : endM + 1;
    const nextY = endM === 12 ? yearVal + 1 : yearVal;
    setDocMonth(nextM);
    setDocYear(nextY);
  };

  const periodText = useMemo(
    () => formatThaiPeriodText(startMonth, startYear, endMonth, endYear, config.useThaiDigits),
    [startMonth, startYear, endMonth, endYear, config.useThaiDigits]
  );

  const docDateText = useMemo(
    () =>
      formatMemoDateText({
        blankDay,
        day: docDay,
        month: docMonth,
        yearCE: docYear,
        useThaiDigits: config.useThaiDigits,
      }),
    [blankDay, docDay, docMonth, docYear, config.useThaiDigits]
  );

  const monthsList = useMemo(
    () => enumerateMonthRange(startMonth, startYear, endMonth, endYear, 12),
    [startMonth, startYear, endMonth, endYear]
  );

  const updateField = <K extends keyof AcMemoConfig>(key: K, value: AcMemoConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaveMessage(null);
  };

  const handleSaveDefaultConfig = async () => {
    setSavingConfig(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/ac-logs/memo-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'ไม่สามารถบันทึกค่าตั้งต้นได้');
        return;
      }
      setConfig(json.config);
      setSaveMessage('บันทึกค่าตั้งต้นของคณะแล้ว');
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อบันทึกค่าตั้งต้น');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetDefault = () => {
    if (!confirm('ต้องการคืนค่าข้อความและรายชื่อผู้ลงนามกลับเป็นค่าต้นฉบับของระบบใช่หรือไม่?')) {
      return;
    }
    setConfig(DEFAULT_AC_MEMO_CONFIG);
    setSaveMessage('คืนค่าต้นฉบับในตัวอย่างแล้ว (กดบันทึกหากต้องการบันทึกทับบนระบบ)');
  };

  const handleDownloadDocx = async () => {
    setExportingDocx(true);
    try {
      await downloadAcMemoDocx({ config, periodText, docDateText });
    } catch (err) {
      console.error('Failed to generate memo docx:', err);
      alert('ไม่สามารถสร้างไฟล์ Word (.docx) ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setExportingDocx(false);
    }
  };

  const handlePrintMemo = () => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('กรุณาอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์เอกสาร');
      return;
    }
    const sealUrl = `${window.location.origin}/images/ku-seal.png`;
    const html = buildAcMemoPrintHtml({ config, periodText, docDateText }, sealUrl);
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const handlePrintAttachments = async () => {
    setPrintingAttachments(true);
    try {
      const payloads: MonthlyAcApiPayload[] = await Promise.all(
        monthsList.map(async ({ month, year }) => {
          const res = await fetch(`/api/ac-logs?month=${month}&year=${year}`);
          if (!res.ok) {
            throw new Error(`Failed to fetch month ${month}/${year}`);
          }
          return res.json();
        })
      );

      const win = window.open('', '_blank');
      if (!win) {
        alert('กรุณาอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์เอกสาร');
        return;
      }
      const html = buildMultiMonthAcAttachmentPrintHtml(payloads, selectedRoomIds, periodText);
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (err) {
      console.error('Failed to print multi-month attachments:', err);
      alert('ไม่สามารถดึงข้อมูลตารางแนบทุกเดือนได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setPrintingAttachments(false);
    }
  };

  if (!isOpen) return null;

  const yearChoices = Array.from({ length: 6 }, (_, idx) => currentYear - 2 + idx);
  const d = (val: string) => formatDigits(val, config.useThaiDigits);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="w-full max-w-7xl max-h-[95vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fadeIn">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>บันทึกข้อความรายงานการเปิด-ปิดเครื่องปรับอากาศ</span>
                {loadingConfig && <Loader2 className="w-4 h-4 animate-spin text-teal-100" />}
              </h2>
              <p className="text-[11px] text-teal-100">
                แบบฟอร์มคณะพยาบาลศาสตร์ ม.เกษตรศาสตร์ (A4 มาตรฐาน + Word .docx + ตารางแนบรายเดือน)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main 2-Column Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Side: Editor Controls */}
          <div className="lg:col-span-5 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 overflow-hidden">
            {/* Sub-tabs */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'period' as const, label: '๑. ช่วงเวลา & หัวเอกสาร', icon: Calendar },
                { id: 'content' as const, label: '๒. เนื้อความบันทึก', icon: Settings2 },
                { id: 'signers' as const, label: '๓. ผู้ลงนาม ๔ ขั้นตอน', icon: Users },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      active
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Form Fields */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'period' && (
                <>
                  {/* Period Mode Selector */}
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 dark:text-slate-100">
                        ช่วงเวลารายงานผลการเปิด-ปิดแอร์
                      </label>
                      <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                        รวม {monthsList.length} เดือน
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      {[
                        { id: 'quarter' as const, label: 'รายไตรมาส' },
                        { id: 'single' as const, label: 'เดือนเดียว' },
                        { id: 'custom' as const, label: 'กำหนดเอง' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPeriodMode(m.id)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            periodMode === m.id
                              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {periodMode === 'quarter' && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            ปี พ.ศ.
                          </span>
                          <select
                            value={quarterYear}
                            onChange={(e) => handleSelectQuarter(quarterNum, Number(e.target.value))}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500"
                          >
                            {yearChoices.map((y) => (
                              <option key={y} value={y}>
                                {y + 543} (ค.ศ. {y})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {QUARTERS.map((q) => (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => handleSelectQuarter(q.id)}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                quarterNum === q.id
                                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="text-[11px] font-black">รอบ {q.id}</div>
                              <div className="text-xs font-semibold">{q.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {periodMode === 'single' && (
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={singleMonth}
                          onChange={(e) => setSingleMonth(Number(e.target.value))}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {THAI_MONTHS.map((m, idx) => (
                            <option key={m} value={idx + 1}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <select
                          value={singleYear}
                          onChange={(e) => setSingleYear(Number(e.target.value))}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {yearChoices.map((y) => (
                            <option key={y} value={y}>
                              พ.ศ. {y + 543}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {periodMode === 'custom' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              ตั้งแต่เดือน
                            </label>
                            <select
                              value={customStartMonth}
                              onChange={(e) => setCustomStartMonth(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                            >
                              {THAI_MONTHS.map((m, idx) => (
                                <option key={m} value={idx + 1}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              ปี พ.ศ. เริ่มต้น
                            </label>
                            <select
                              value={customStartYear}
                              onChange={(e) => setCustomStartYear(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                            >
                              {yearChoices.map((y) => (
                                <option key={y} value={y}>
                                  {y + 543}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              ถึงเดือน
                            </label>
                            <select
                              value={customEndMonth}
                              onChange={(e) => setCustomEndMonth(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                            >
                              {THAI_MONTHS.map((m, idx) => (
                                <option key={m} value={idx + 1}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              ปี พ.ศ. สิ้นสุด
                            </label>
                            <select
                              value={customEndYear}
                              onChange={(e) => setCustomEndYear(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                            >
                              {yearChoices.map((y) => (
                                <option key={y} value={y}>
                                  {y + 543}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="px-3 py-2 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-xs font-bold text-teal-800 dark:text-teal-200">
                      ข้อความช่วงรายงาน: ประจำเดือน {periodText}
                    </div>
                  </div>

                  {/* Document Number, Date & Display Options */}
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          คำนำหน้าเลขหนังสือ (ที่)
                        </label>
                        <input
                          type="text"
                          value={config.docNumberPrefix}
                          onChange={(e) => updateField('docNumberPrefix', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          เลขต่อท้าย / (เว้นว่างได้)
                        </label>
                        <input
                          type="text"
                          value={config.docNumberSuffix}
                          onChange={(e) => updateField('docNumberSuffix', e.target.value)}
                          placeholder="เช่น ๑๒๓๔ หรือปล่อยว่าง"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          วันที่ในบันทึกข้อความ
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={blankDay}
                            onChange={(e) => setBlankDay(e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>เว้นช่องวันที่ไว้เขียนเอง</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min={1}
                          max={31}
                          disabled={blankDay}
                          value={docDay}
                          onChange={(e) => setDocDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-40"
                        />
                        <select
                          value={docMonth}
                          onChange={(e) => setDocMonth(Number(e.target.value))}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {THAI_MONTHS.map((m, idx) => (
                            <option key={m} value={idx + 1}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <select
                          value={docYear}
                          onChange={(e) => setDocYear(Number(e.target.value))}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {yearChoices.map((y) => (
                            <option key={y} value={y}>
                              พ.ศ. {y + 543}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          ชั้นความเร็ว
                        </label>
                        <select
                          value={config.urgencyLevel}
                          onChange={(e) => updateField('urgencyLevel', e.target.value as MemoUrgencyLevel)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          <option value="">ปกติ (ไม่แสดงตราเร่งด่วน)</option>
                          <option value="ด่วน">ด่วน</option>
                          <option value="ด่วนมาก">ด่วนมาก</option>
                          <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end gap-1.5">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.useThaiDigits}
                            onChange={(e) => updateField('useThaiDigits', e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>ใช้ตัวเลขไทย (๐–๙)</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.showSignatureBorders}
                            onChange={(e) => updateField('showSignatureBorders', e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>แสดงเส้นกรอบตารางลงนาม (ข้อ ๒–๔)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'content' && (
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ส่วนงาน
                    </label>
                    <input
                      type="text"
                      value={config.departmentLine}
                      onChange={(e) => updateField('departmentLine', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      เรื่อง (บรรทัดแรก)
                    </label>
                    <input
                      type="text"
                      value={config.subjectLine1}
                      onChange={(e) => updateField('subjectLine1', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ๑. เรียน
                    </label>
                    <input
                      type="text"
                      value={config.recipient1}
                      onChange={(e) => updateField('recipient1', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ย่อหน้าที่ ๑ (เหตุผลความจำเป็น)
                    </label>
                    <textarea
                      rows={4}
                      value={config.paragraph1}
                      onChange={(e) => updateField('paragraph1', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ย่อหน้าที่ ๒ (ช่วงก่อนระบุเดือน)
                    </label>
                    <textarea
                      rows={2}
                      value={config.paragraph2Prefix}
                      onChange={(e) => updateField('paragraph2Prefix', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ย่อหน้าที่ ๒ (ช่วงหลังระบุเดือน)
                    </label>
                    <input
                      type="text"
                      value={config.paragraph2Suffix}
                      onChange={(e) => updateField('paragraph2Suffix', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      คำลงท้าย
                    </label>
                    <input
                      type="text"
                      value={config.closingText}
                      onChange={(e) => updateField('closingText', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'signers' && (
                <div className="space-y-3">
                  {/* Signer 1 */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-black text-teal-700 dark:text-teal-400">
                      ขั้นที่ ๑ — ผู้รายงาน
                    </div>
                    <input
                      type="text"
                      value={config.signer1Name}
                      onChange={(e) => updateField('signer1Name', e.target.value)}
                      placeholder="ชื่อ-สกุล (ในวงเล็บ)"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={config.signer1Title}
                      onChange={(e) => updateField('signer1Title', e.target.value)}
                      placeholder="ตำแหน่ง"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Signer 2 */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-black text-teal-700 dark:text-teal-400">
                      ขั้นที่ ๒ — ประธานคณะกรรมการ ฯ
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={config.signer2Recipient}
                        onChange={(e) => updateField('signer2Recipient', e.target.value)}
                        placeholder="เรียน..."
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={config.signer2Through}
                        onChange={(e) => updateField('signer2Through', e.target.value)}
                        placeholder="ผ่าน..."
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <input
                      type="text"
                      value={config.signer2Note}
                      onChange={(e) => updateField('signer2Note', e.target.value)}
                      placeholder="ข้อความเสนอ"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={config.signer2Name}
                      onChange={(e) => updateField('signer2Name', e.target.value)}
                      placeholder="ชื่อ-สกุล (ในวงเล็บ)"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={config.signer2Title}
                      onChange={(e) => updateField('signer2Title', e.target.value)}
                      placeholder="ตำแหน่ง"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Signer 3 */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-black text-teal-700 dark:text-teal-400">
                      ขั้นที่ ๓ — หัวหน้าสำนักงานเลขานุการ ฯ
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={config.signer3Recipient}
                        onChange={(e) => updateField('signer3Recipient', e.target.value)}
                        placeholder="เรียน..."
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={config.signer3Note}
                        onChange={(e) => updateField('signer3Note', e.target.value)}
                        placeholder="ข้อความเสนอ"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <input
                      type="text"
                      value={config.signer3Name}
                      onChange={(e) => updateField('signer3Name', e.target.value)}
                      placeholder="ชื่อ-สกุล (ในวงเล็บ)"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={config.signer3Title}
                      onChange={(e) => updateField('signer3Title', e.target.value)}
                      placeholder="ตำแหน่ง"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Signer 4 */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-black text-teal-700 dark:text-teal-400">
                      ขั้นที่ ๔ — คณบดีคณะพยาบาลศาสตร์
                    </div>
                    <input
                      type="text"
                      value={config.signer4Action}
                      onChange={(e) => updateField('signer4Action', e.target.value)}
                      placeholder="คำสั่ง (เช่น ทราบ)"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={config.signer4Name}
                      onChange={(e) => updateField('signer4Name', e.target.value)}
                      placeholder="ชื่อ-สกุล (ในวงเล็บ)"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={config.signer4Title}
                      onChange={(e) => updateField('signer4Title', e.target.value)}
                      placeholder="ตำแหน่ง"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Persistence Bar */}
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>คืนค่าต้นฉบับ</span>
                </button>

                <button
                  type="button"
                  disabled={savingConfig}
                  onClick={handleSaveDefaultConfig}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>บันทึกเป็นค่าเริ่มต้นของคณะ</span>
                </button>
              </div>

              {saveMessage && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{saveMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Live A4 Paper Preview */}
          <div className="lg:col-span-7 bg-slate-200/80 dark:bg-slate-950 p-3 sm:p-5 overflow-y-auto flex justify-center items-start">
            <div
              className="w-full max-w-[660px] bg-white text-black shadow-xl border border-slate-300 rounded-sm px-8 py-7 sm:px-11 sm:py-9 select-text"
              style={{
                fontFamily: "'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif",
                fontSize: '13.5px',
                lineHeight: 1.48,
              }}
            >
              {/* Top Header Row */}
              <div className="grid grid-cols-[56px_1fr_56px] items-end mb-2">
                <div>
                  <img
                    src="/images/ku-seal.png"
                    alt="ตราประจำมหาวิทยาลัยเกษตรศาสตร์"
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <div className="text-center font-bold text-[24px] leading-none pb-1">
                  บันทึกข้อความ
                </div>
                <div className="text-right text-[13px] font-bold text-red-600 self-start">
                  {config.urgencyLevel ? d(config.urgencyLevel) : ''}
                </div>
              </div>

              {/* Metadata Fields */}
              <div className="space-y-0.5">
                <div>
                  <span className="font-bold">ส่วนงาน</span>&nbsp;&nbsp;{d(config.departmentLine)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="font-bold">ที่</span>&nbsp;&nbsp;
                    {d(`${config.docNumberPrefix}${config.docNumberSuffix || ''}`)}
                  </div>
                  <div>
                    <span className="font-bold">วันที่</span>&nbsp;&nbsp;
                    <span className="whitespace-pre">{d(docDateText)}</span>
                  </div>
                </div>
                <div>
                  <span className="font-bold">เรื่อง</span>&nbsp;&nbsp;{d(config.subjectLine1)}
                </div>
                <div className="pl-9 pb-1.5 mb-2.5 border-b border-black">
                  ประจำเดือน {d(periodText)}
                </div>
              </div>

              {/* Body */}
              <div className="mb-1.5">
                <span className="font-bold">{d('๑. เรียน')}</span>&nbsp;&nbsp;{d(config.recipient1)}
              </div>
              <p className="text-justify indent-8 mb-1.5">{d(config.paragraph1)}</p>
              <p className="text-justify indent-8 mb-1.5">
                {d(config.paragraph2Prefix.trimEnd())} {d(periodText)}{' '}
                {d(config.paragraph2Suffix.trimStart())}
              </p>
              <p className="indent-8 mb-4">{d(config.closingText)}</p>

              {/* 4-Step Signatory Table */}
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: '47%' }} />
                  <col style={{ width: '53%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td></td>
                    <td className="pt-5 pb-3 text-center align-top">
                      <div>{d(config.signer1Name)}</div>
                      <div>{d(config.signer1Title)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      className={`p-2 align-top ${
                        config.showSignatureBorders ? 'border border-slate-600' : ''
                      }`}
                    >
                      <div>
                        <span className="font-bold">{d('๒. เรียน')}</span>&nbsp;&nbsp;
                        {d(config.signer2Recipient)}
                      </div>
                      <div className="pl-6">{d(config.signer2Through)}</div>
                      <div className="pl-6">{d(config.signer2Note)}</div>
                      <div className="mt-7 text-center">
                        <div>{d(config.signer2Name)}</div>
                        <div>{d(config.signer2Title)}</div>
                      </div>
                    </td>
                    <td
                      className={`p-2 align-top ${
                        config.showSignatureBorders ? 'border border-slate-600' : ''
                      }`}
                    >
                      <div>
                        <span className="font-bold">{d('๓. เรียน')}</span>&nbsp;&nbsp;
                        {d(config.signer3Recipient)}
                      </div>
                      <div className="pl-6">{d(config.signer3Note)}</div>
                      <div className="mt-12 text-center">
                        <div>{d(config.signer3Name)}</div>
                        <div>{d(config.signer3Title)}</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={2}
                      className={`p-2 align-top ${
                        config.showSignatureBorders ? 'border border-slate-600' : ''
                      }`}
                    >
                      <div className="font-bold">
                        {d('๔.')} {d(config.signer4Action)}
                      </div>
                      <div className="mt-6 text-center">
                        <div>{d(config.signer4Name)}</div>
                        <div>{d(config.signer4Title)}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Export Action Bar */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            ช่วงรายงานที่เลือก: <b className="text-slate-800 dark:text-slate-200">{periodText}</b>{' '}
            ({monthsList.length} เดือน)
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={printingAttachments}
              onClick={handlePrintAttachments}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              title="ดึงตารางเปิด-ปิดแอร์ของทุกเดือนในช่วงที่เลือกมาพิมพ์เป็นเอกสารแนบ"
            >
              {printingAttachments ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>พิมพ์ตารางแนบ ({monthsList.length} เดือน)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintMemo}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / PDF (A4)</span>
            </button>

            <button
              type="button"
              disabled={exportingDocx}
              onClick={handleDownloadDocx}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {exportingDocx ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>ดาวน์โหลด Word (.docx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
