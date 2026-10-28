'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  FileText,
  Receipt,
  Boxes,
  Calendar,
  User,
  BookOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { formatUserName, formatTeacherName } from '@/lib/user-utils';

interface RequisitionSlipModalProps {
  requisition: any;
  onClose: () => void;
}

export default function RequisitionSlipModal({ requisition, onClose }: RequisitionSlipModalProps) {
  const [activeTab, setActiveTab] = useState<'A4' | '80MM'>('A4');
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    async function generateQr() {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const verifyUrl = `${origin}/verify/${encodeURIComponent(requisition.requestNumber)}`;
        const url = await QRCode.toDataURL(verifyUrl, {
          width: 180,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrUrl(url);
      } catch (err) {
        console.error('Failed to generate Requisition Slip QR:', err);
      }
    }
    if (requisition?.requestNumber) {
      generateQr();
    }
  }, [requisition?.requestNumber]);

  if (!requisition) return null;

  const dateNeededStr = requisition.dateNeeded
    ? new Date(requisition.dateNeeded).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const dispensedAtStr = requisition.dispensedAt
    ? new Date(requisition.dispensedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';

  const instructorDisplay = requisition.course?.instructorName
    ? formatTeacherName(requisition.course.instructorName)
    : (requisition.advisorName && !requisition.advisorName.includes('แอดมิน') && !requisition.advisorName.includes('เจ้าหน้าที่')
        ? formatTeacherName(requisition.advisorName)
        : 'อาจารย์ผู้รับผิดชอบ');

  // Print A4
  const handlePrintA4 = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const itemsRows = (requisition.items || [])
      .map(
        (it: any, idx: number) => `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 600;">
            ${it.item?.name || it.name}
            ${it.isSubUnit ? '<span style="font-size: 10px; color: #0f766e; background: #ccfbf1; padding: 1px 4px; border-radius: 4px; margin-left: 4px;">เบิกย่อย</span>' : ''}
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            ${it.quantityRequested} ${it.requestedUnit || it.item?.unit || 'หน่วย'}
          </td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: #047857;">
            ${it.quantityDispensed > 0 ? it.quantityDispensed : it.quantityRequested} ${it.requestedUnit || it.item?.unit || 'หน่วย'}
          </td>
          <td style="padding: 6px 8px; text-align: right; color: #64748b;">
            ฿${it.unitCost?.toFixed(2) || '0.00'}
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold;">
            ฿${it.totalCost?.toFixed(2) || '0.00'}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>ใบเบิกจ่ายพัสดุและวัสดุสิ้นเปลือง - ${requisition.requestNumber}</title>
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 10mm; /* Safe print margin >= 0.8cm, strictly >= 0.5cm */
            }
            html, body {
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 11.5px;
              line-height: 1.4;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-page-wrapper {
              box-sizing: border-box;
              width: 100%;
              max-width: 100%;
              padding: 2mm 3mm;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f766e;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .title-section h1 {
              font-size: 15px;
              font-weight: 800;
              color: #0f766e;
              margin: 0 0 2px 0;
            }
            .title-section h2 {
              font-size: 11.5px;
              font-weight: 600;
              color: #334155;
              margin: 0;
            }
            .qr-box {
              text-align: center;
              flex-shrink: 0;
            }
            .qr-box img {
              width: 72px;
              height: 72px;
              display: block;
              margin: 0 auto;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 5px 14px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px 12px;
              margin-bottom: 12px;
              font-size: 11px;
            }
            table {
              width: 100%;
              table-layout: fixed;
              border-collapse: collapse;
              word-break: break-word;
              overflow-wrap: break-word;
              margin-bottom: 14px;
              font-size: 11px;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 700;
              padding: 5px 6px;
              border-bottom: 1.5px solid #cbd5e1;
            }
            .signatures-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 24px;
              margin-top: 20px;
              text-align: center;
              font-size: 10.5px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .signature-block {
              border: 1px dashed #cbd5e1;
              border-radius: 8px;
              padding: 10px 8px;
            }
            .sign-line {
              margin-top: 26px;
              border-top: 1px dotted #94a3b8;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="print-page-wrapper">
          <div class="header-container">
            <div class="title-section">
              <h1>ห้องปฏิบัติการพยาบาลศาสตร์ คณะพยาบาลศาสตร์</h1>
              <h2>ใบเบิกจ่ายพัสดุและวัสดุสิ้นเปลืองทางการ (Material Requisition Docket)</h2>
              <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                เลขที่เอกสาร: <b style="font-family: monospace; color: #0f172a;">${requisition.requestNumber}</b>
              </div>
            </div>
            <div class="qr-box">
              ${qrUrl ? `<img src="${qrUrl}" alt="QR" />` : ''}
              <span style="font-size: 8.5px; color: #64748b;">สแกนตรวจสอบ</span>
            </div>
          </div>

          <div class="meta-grid">
            <div><b>ผู้ขอเบิก:</b> ${formatUserName(requisition.user)} ${requisition.user?.studentId ? `(${requisition.user.studentId})` : ''}</div>
            <div><b>รายวิชา:</b> ${requisition.course ? `[${requisition.course.code}] ${requisition.course.name}` : 'ทั่วไป'}</div>
            <div><b>อาจารย์ผู้รับผิดชอบ:</b> ${instructorDisplay}</div>
            <div><b>วันที่จ่ายของ:</b> ${dispensedAtStr} น.</div>
            <div style="grid-column: span 2;"><b>วัตถุประสงค์:</b> ${requisition.purpose || '-'}</div>
          </div>

          <div style="font-size: 12px; font-weight: bold; color: #0f766e; margin-bottom: 6px;">📦 รายการวัสดุสิ้นเปลืองที่ตัดจ่าย:</div>
          <table style="width: 100%; table-layout: fixed;">
            <colgroup>
              <col style="width: 32px;" />
              <col style="width: auto;" />
              <col style="width: 80px;" />
              <col style="width: 85px;" />
              <col style="width: 85px;" />
              <col style="width: 95px;" />
            </colgroup>
            <thead>
              <tr>
                <th style="text-align: center;">ลำดับ</th>
                <th style="text-align: left;">รายการพัสดุ</th>
                <th style="text-align: center;">ขอเบิก</th>
                <th style="text-align: center;">จ่ายจริง</th>
                <th style="text-align: right;">ราคา/หน่วย</th>
                <th style="text-align: right;">รวมต้นทุน</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid #0f766e; font-weight: bold;">
                <td colspan="5" style="text-align: right; padding: 6px 8px;">มูลค่าต้นทุนรวมสุทธิ:</td>
                <td style="text-align: right; padding: 6px 8px; color: #047857; font-size: 12px;">
                  ฿${requisition.totalCost?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'} บาท
                </td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures-grid">
            <div class="signature-block">
              <div>ลงชื่อ ....................................................</div>
              <div class="sign-line">( ${formatUserName(requisition.user)} )</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">ผู้รับพัสดุ (นิสิต/ผู้เบิก)</div>
              <div style="font-size: 9.5px; color: #94a3b8; margin-top: 4px;">วันที่ ......./......./...........</div>
            </div>

            <div class="signature-block">
              <div>ลงชื่อ ....................................................</div>
              <div class="sign-line">( .................................................... )</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">เจ้าหน้าที่ผู้จ่ายพัสดุ</div>
              <div style="font-size: 9.5px; color: #94a3b8; margin-top: 4px;">วันที่ ......./......./...........</div>
            </div>
          </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 600);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print 80mm
  const handlePrint80mm = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return;

    const itemsHtml = (requisition.items || [])
      .map(
        (it: any) => `
        <tr>
          <td style="padding: 2px 0;">
            <div style="font-weight: bold;">${it.item?.name || it.name}</div>
          </td>
          <td style="text-align: right; vertical-align: top; white-space: nowrap; font-weight: bold;">
            ${it.quantityDispensed > 0 ? it.quantityDispensed : it.quantityRequested} ${it.requestedUnit || it.item?.unit || 'หน่วย'}
          </td>
          <td style="text-align: right; vertical-align: top; white-space: nowrap; font-family: monospace;">
            ฿${it.totalCost?.toFixed(1) || '0.0'}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>สลิปเบิกพัสดุ - ${requisition.requestNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 11px; line-height: 1.35; color: #0f172a; width: 72mm; margin: 4mm auto; padding: 0;
            }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>
          <div class="center">
            <div style="font-size: 13px; font-weight: bold;">ห้องปฏิบัติการพยาบาลศาสตร์</div>
            <div style="font-size: 11px;">คณะพยาบาลศาสตร์</div>
            <div style="font-size: 12px; font-weight: bold; margin-top: 3px; color: #0f766e;">ใบเบิกพัสดุ (Requisition Slip)</div>
          </div>

          <div class="divider"></div>

          <div style="font-size: 10.5px;">
            <div>เลขที่: <b>${requisition.requestNumber}</b></div>
            <div>วันจ่าย: ${dispensedAtStr} น.</div>
            <div>ผู้เบิก: <b>${formatUserName(requisition.user)}</b> ${requisition.user?.studentId ? `(${requisition.user.studentId})` : ''}</div>
            ${requisition.course ? `<div>วิชา: <b>[${requisition.course.code}] ${requisition.course.name}</b></div>` : ''}
            <div>วัตถุประสงค์: ${requisition.purpose || '-'}</div>
          </div>

          <div class="divider"></div>

          <div style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">📦 รายการวัสดุสิ้นเปลือง:</div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10px;">
                <th style="text-align: left;">รายการ</th>
                <th style="text-align: right;">จำนวน</th>
                <th style="text-align: right;">ต้นทุน</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <table style="font-size: 11px; font-weight: bold;">
            <tr>
              <td>มูลค่ารวม:</td>
              <td style="text-align: right; color: #047857;">฿${requisition.totalCost?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}</td>
            </tr>
          </table>

          <div class="divider"></div>

          <div class="center" style="margin-top: 6px;">
            ${qrUrl ? `<img src="${qrUrl}" style="width: 75px; height: 75px; display: inline-block;" />` : ''}
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">สแกนตรวจสอบข้อมูล</div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 600);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] flex flex-col pb-8 sm:pb-6">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                ใบเบิกพัสดุ (Requisition Slip)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {requisition.requestNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('A4')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'A4'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>แบบ A4</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('80MM')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === '80MM'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>สลิป 80mm</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* Metadata */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ผู้ขอเบิก:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {formatUserName(requisition.user)} {requisition.user?.studentId ? `(${requisition.user.studentId})` : ''}
              </span>
            </div>
            {requisition.course && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">รายวิชา:</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">
                  [{requisition.course.code}] {requisition.course.name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">วันที่จ่ายพัสดุ:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{dispensedAtStr} น.</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">วัตถุประสงค์:</span>
              <span className="text-slate-700 dark:text-slate-300">{requisition.purpose || '-'}</span>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                <tr>
                  <th className="p-2.5">รายการพัสดุ</th>
                  <th className="p-2.5 text-center">ขอเบิก</th>
                  <th className="p-2.5 text-center">จ่ายจริง</th>
                  <th className="p-2.5 text-right">รวมต้นทุน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(requisition.items || []).map((it: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {it.item?.name || it.name}
                      {it.isSubUnit && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-teal-100 text-teal-800 font-bold">
                          เบิกย่อย
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center text-slate-500">
                      {it.quantityRequested} {it.requestedUnit || it.item?.unit || 'หน่วย'}
                    </td>
                    <td className="p-2.5 text-center font-bold text-emerald-700 dark:text-emerald-400">
                      {it.quantityDispensed > 0 ? it.quantityDispensed : it.quantityRequested} {it.requestedUnit || it.item?.unit || 'หน่วย'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ฿{it.totalCost?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-t border-slate-200 dark:border-slate-800">
                  <td colSpan={3} className="p-2.5 text-right text-slate-600 dark:text-slate-400">
                    มูลค่าต้นทุนรวมสุทธิ:
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-700 dark:text-emerald-400 font-black text-sm">
                    ฿{requisition.totalCost?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
          >
            ปิด
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint80mm}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 text-xs font-bold hover:bg-teal-100 transition cursor-pointer shadow-xs"
            >
              <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>พิมพ์สลิป 80mm</span>
            </button>

            <button
              type="button"
              onClick={handlePrintA4}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบเบิกทางการ (A4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
