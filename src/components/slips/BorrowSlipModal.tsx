'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  FileText,
  Receipt,
  Stethoscope,
  Calendar,
  User,
  BookOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Boxes,
} from 'lucide-react';
import { formatUserName, formatTeacherName } from '@/lib/user-utils';

interface BorrowSlipModalProps {
  borrow: any;
  onClose: () => void;
}

export default function BorrowSlipModal({ borrow, onClose }: BorrowSlipModalProps) {
  const [activeTab, setActiveTab] = useState<'A4' | '80MM'>('A4');
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    async function generateQr() {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const verifyUrl = `${origin}/verify/borrow/${encodeURIComponent(borrow.requestNumber)}`;
        const url = await QRCode.toDataURL(verifyUrl, {
          width: 180,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrUrl(url);
      } catch (err) {
        console.error('Failed to generate Borrow Slip QR Code:', err);
      }
    }
    if (borrow?.requestNumber) {
      generateQr();
    }
  }, [borrow?.requestNumber]);

  if (!borrow) return null;

  const borrowDateStr = borrow.borrowDate
    ? new Date(borrow.borrowDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const expectedReturnStr = borrow.expectedReturnDate
    ? new Date(borrow.expectedReturnDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const checkoutDateStr = borrow.checkedOutAt
    ? new Date(borrow.checkedOutAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : borrowDateStr;

  const instructorDisplay = borrow.course?.instructorName
    ? formatTeacherName(borrow.course.instructorName)
    : (borrow.advisorName && !borrow.advisorName.includes('แอดมิน') && !borrow.advisorName.includes('เจ้าหน้าที่')
        ? formatTeacherName(borrow.advisorName)
        : 'อาจารย์ประจำรายวิชา');

  // Print A4 Form
  const handlePrintA4 = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const itemsRows = (borrow.items || [])
      .map(
        (it: any, idx: number) => `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #0f766e;">
            ${it.asset?.assetCode || it.assetCode || '-'}
          </td>
          <td style="padding: 6px 8px; font-weight: 600;">
            ${it.item?.name || it.name || 'ครุภัณฑ์'}
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            ${it.quantity || 1} ${it.item?.unit || it.unit || 'ชิ้น'}
          </td>
          <td style="padding: 6px 8px; text-align: center; color: #047857; font-size: 11px;">
            ${it.asset?.condition === 'DAMAGED' ? '⚠️ ชำรุด' : 'สมบูรณ์พร้อมใช้'}
          </td>
          <td style="padding: 6px 8px; text-align: center; font-size: 10px; color: #475569;">
            [ &nbsp; ] สมบูรณ์ &nbsp;&nbsp; [ &nbsp; ] ชำรุด &nbsp;&nbsp; [ &nbsp; ] สูญหาย
          </td>
        </tr>
      `
      )
      .join('');

    const reqItemsRows = (borrow.requisitionRequest?.items || [])
      .map(
        (it: any, idx: number) => `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 5px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 5px 8px;">${it.item?.name || it.name}</td>
          <td style="padding: 5px 8px; text-align: center; font-weight: bold;">
            ${it.quantityDispensed > 0 ? it.quantityDispensed : it.quantityRequested} ${it.requestedUnit || it.item?.unit || 'หน่วย'}
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
          <title>ใบรายการยืม-คืนอุปกรณ์ - ${borrow.requestNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            body {
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #0f172a;
              margin: 0;
              padding: 0;
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
              font-size: 16px;
              font-weight: 800;
              color: #0f766e;
              margin: 0 0 2px 0;
            }
            .title-section h2 {
              font-size: 12px;
              font-weight: 600;
              color: #334155;
              margin: 0;
            }
            .qr-box {
              text-align: center;
            }
            .qr-box img {
              width: 75px;
              height: 75px;
              display: block;
              margin: 0 auto;
            }
            .qr-box span {
              font-size: 9px;
              color: #64748b;
              display: block;
              margin-top: 2px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 6px 16px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 14px;
              font-size: 11.5px;
            }
            .meta-item {
              display: flex;
              gap: 4px;
            }
            .meta-label {
              color: #64748b;
              font-weight: 600;
              min-width: 90px;
            }
            .meta-value {
              font-weight: 700;
              color: #1e293b;
            }
            .due-highlight {
              grid-column: span 2;
              background-color: #fff1f2;
              border: 1px solid #fecdd3;
              color: #be123c;
              padding: 6px 10px;
              border-radius: 6px;
              font-weight: bold;
              display: flex;
              justify-content: space-between;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
              font-size: 11.5px;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 700;
              padding: 6px 8px;
              border-bottom: 1.5px solid #cbd5e1;
            }
            .section-title {
              font-size: 12.5px;
              font-weight: 800;
              color: #0f766e;
              margin: 10px 0 6px 0;
              display: flex;
              align-items: center;
              gap: 6px;
              page-break-after: avoid;
              break-after: avoid;
            }
            .terms-box {
              background-color: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 6px;
              padding: 8px 12px;
              font-size: 10.5px;
              color: #166534;
              margin-bottom: 18px;
              line-height: 1.45;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .signatures-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-top: 15px;
              text-align: center;
              font-size: 11px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .signature-block {
              border: 1px dashed #cbd5e1;
              border-radius: 8px;
              padding: 12px 8px 8px 8px;
            }
            .sign-line {
              margin-top: 30px;
              border-top: 1px dotted #94a3b8;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="title-section">
              <h1>ห้องปฏิบัติการพยาบาลศาสตร์ คณะพยาบาลศาสตร์</h1>
              <h2>ใบรายการยืม-คืนอุปกรณ์การเรียนการสอนและเบิกพัสดุ (Equipment Loan Docket)</h2>
              <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                เลขที่เอกสาร: <b style="font-family: monospace; color: #0f172a;">${borrow.requestNumber}</b>
                ${borrow.requisitionRequest ? ` &bull; ใบเบิกพัสดุควบ: <b style="font-family: monospace; color: #0f172a;">${borrow.requisitionRequest.requestNumber}</b>` : ''}
              </div>
            </div>
            <div class="qr-box">
              ${qrUrl ? `<img src="${qrUrl}" alt="QR" />` : ''}
              <span>สแกนตรวจรับคืนด่วน</span>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">ผู้ยืม-เบิก:</span>
              <span class="meta-value">${formatUserName(borrow.user)} ${borrow.user?.studentId ? `(${borrow.user.studentId})` : ''}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">รายวิชา:</span>
              <span class="meta-value">${borrow.course ? `[${borrow.course.code}] ${borrow.course.name}` : 'ใช้ทั่วไปในห้องแล็บ'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">อาจารย์ผู้สอน:</span>
              <span class="meta-value">${instructorDisplay}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">วันที่จ่ายของ:</span>
              <span class="meta-value">${checkoutDateStr} น.</span>
            </div>
            <div class="meta-item" style="grid-column: span 2;">
              <span class="meta-label">วัตถุประสงค์:</span>
              <span class="meta-value">${borrow.purpose || '-'} (${borrow.useTarget === 'HUMAN' ? 'ใช้กับคนจริง' : 'ฝึกกับหุ่นจำลอง'})</span>
            </div>
            <div class="due-highlight">
              <span>⏰ กำหนดส่งคืนห้องปฏิบัติการ:</span>
              <span style="font-size: 12.5px;">${expectedReturnStr} น.</span>
            </div>
          </div>

          <div class="section-title">🩺 รายการครุภัณฑ์คงทนที่ยืม (ต้องนำส่งคืนห้องปฏิบัติการ)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">ลำดับ</th>
                <th style="width: 130px; text-align: left;">รหัสประจำชิ้น (Asset ID)</th>
                <th style="text-align: left;">รายการอุปกรณ์</th>
                <th style="width: 80px; text-align: center;">จำนวน</th>
                <th style="width: 100px; text-align: center;">สภาพตอนส่งมอบ</th>
                <th style="width: 190px; text-align: center;">ผลการตรวจรับคืน</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          ${
            reqItemsRows
              ? `
            <div class="section-title">📦 รายการวัสดุสิ้นเปลืองที่จ่ายร่วม (ตัดสต็อกแล้ว)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">ลำดับ</th>
                  <th style="text-align: left;">รายการพัสดุ</th>
                  <th style="width: 120px; text-align: center;">จำนวนที่จ่าย</th>
                </tr>
              </thead>
              <tbody>
                ${reqItemsRows}
              </tbody>
            </table>
          `
              : ''
          }

          <div class="terms-box">
            <b>📌 ข้อกำหนดและแนวปฏิบัติการส่งคืนอุปกรณ์:</b><br />
            1. <b>กรุณานำใบรายการนี้มาแสดงพร้อมอุปกรณ์ในวันส่งคืนทุกครั้ง</b> เพื่อให้เจ้าหน้าที่ตรวจสอบรหัสชิ้นและสภาพได้อย่างรวดเร็ว<br />
            2. ผู้ยืมต้องดูแลรักษาครุภัณฑ์ให้อยู่ในสภาพสมบูรณ์ หากชำรุด สูญหาย หรือส่งคืนเกินกำหนด ต้องรับผิดชอบตามระเบียบคณะพยาบาลศาสตร์
          </div>

          <div class="signatures-grid">
            <div class="signature-block">
              <div>ลงชื่อ ....................................................</div>
              <div class="sign-line">( ${formatUserName(borrow.user)} )</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">ผู้ยืม-เบิกอุปกรณ์ (นิสิต/ผู้ใช้)</div>
              <div style="font-size: 9.5px; color: #94a3b8; margin-top: 4px;">วันที่ ......./......./...........</div>
            </div>

            <div class="signature-block">
              <div>ลงชื่อ ....................................................</div>
              <div class="sign-line">( .................................................... )</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">เจ้าหน้าที่ผู้ส่งมอบอุปกรณ์</div>
              <div style="font-size: 9.5px; color: #94a3b8; margin-top: 4px;">วันที่ ......./......./...........</div>
            </div>

            <div class="signature-block" style="background-color: #f8fafc;">
              <div>ลงชื่อ ....................................................</div>
              <div class="sign-line">( .................................................... )</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">เจ้าหน้าที่ผู้ตรวจรับคืนอุปกรณ์</div>
              <div style="font-size: 9.5px; color: #94a3b8; margin-top: 4px;">วันที่ ......./......./...........</div>
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

  // Print 80mm Slip Form
  const handlePrint80mm = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return;

    const itemsHtml = (borrow.items || [])
      .map(
        (it: any) => `
        <tr>
          <td style="padding: 2px 0;">
            <div style="font-weight: bold;">${it.item?.name || it.name}</div>
            <div style="font-size: 10px; font-family: monospace; color: #0e7490;">${it.asset?.assetCode || it.assetCode || '-'}</div>
          </td>
          <td style="text-align: right; vertical-align: top; white-space: nowrap; font-weight: bold;">
            ${it.quantity || 1} ${it.item?.unit || it.unit || 'ชิ้น'}
          </td>
        </tr>
      `
      )
      .join('');

    const reqHtml =
      borrow.requisitionRequest?.items && borrow.requisitionRequest.items.length > 0
        ? `
        <div style="margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
          <div style="font-size: 10.5px; font-weight: bold; color: #475569;">📦 รายการวัสดุสิ้นเปลืองที่จ่ายร่วม:</div>
          <table style="width: 100%; font-size: 10px; margin-top: 2px;">
            ${borrow.requisitionRequest.items
              .map(
                (r: any) => `
              <tr>
                <td>${r.item?.name || r.name}</td>
                <td style="text-align: right; font-weight: bold;">
                  ${r.quantityDispensed > 0 ? r.quantityDispensed : r.quantityRequested} ${r.requestedUnit || r.item?.unit || 'หน่วย'}
                </td>
              </tr>
            `
              )
              .join('')}
          </table>
        </div>
      `
        : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>สลิปยืม-คืนอุปกรณ์ - ${borrow.requestNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              color: #0f172a;
              width: 72mm;
              margin: 4mm auto;
              padding: 0;
              background: #fff;
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
            <div style="font-size: 12px; font-weight: bold; margin-top: 3px; color: #0f766e;">ใบรายการยืม-คืนอุปกรณ์ (Docket)</div>
          </div>

          <div class="divider"></div>

          <div style="font-size: 10.5px;">
            <div>เลขที่: <b>${borrow.requestNumber}</b></div>
            <div>วันจ่าย: ${checkoutDateStr} น.</div>
            <div>ผู้ยืม: <b>${formatUserName(borrow.user)}</b> ${borrow.user?.studentId ? `(${borrow.user.studentId})` : ''}</div>
            ${borrow.course ? `<div>วิชา: <b>[${borrow.course.code}] ${borrow.course.name}</b></div>` : ''}
            <div>วัตถุประสงค์: ${borrow.purpose || '-'}</div>
            <div style="margin-top: 4px; padding: 4px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 4px; color: #be123c; font-weight: bold;">
              ⏰ กำหนดคืน: ${expectedReturnStr} น.
            </div>
          </div>

          <div class="divider"></div>

          <div style="font-size: 11px; font-weight: bold; color: #0e7490; margin-bottom: 3px;">🩺 ครุภัณฑ์ที่ต้องส่งคืน:</div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10px;">
                <th style="text-align: left;">รายการ / รหัส Asset</th>
                <th style="text-align: right;">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          ${reqHtml}

          <div class="divider"></div>

          <div class="center" style="margin-top: 6px;">
            ${qrUrl ? `<img src="${qrUrl}" style="width: 80px; height: 80px; display: inline-block;" />` : ''}
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">สแกนเพื่อตรวจรับคืนด่วน</div>
            <div style="font-size: 10px; font-weight: bold; color: #be123c; margin-top: 4px;">
              * กรุณานำสลิปนี้มาแสดงพร้อมอุปกรณ์ตอนส่งคืน *
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] sm:max-h-[94vh] flex flex-col pb-8 sm:pb-6">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                ใบรายการยืม-คืนอุปกรณ์ (Loan Slip)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {borrow.requestNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
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

        {/* Content Body Preview */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* Due Date Alert Banner */}
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-rose-900 dark:text-rose-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-xs">กำหนดส่งคืนห้องปฏิบัติการ:</span>
                <span className="ml-1.5 font-bold text-sm text-rose-700 dark:text-rose-300">
                  {expectedReturnStr} น.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
              นำใบนี้มาแสดงตอนส่งคืน
            </span>
          </div>

          {/* Metadata Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ผู้ยืม-เบิก:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {formatUserName(borrow.user)} {borrow.user?.studentId ? `(${borrow.user.studentId})` : ''}
              </span>
            </div>
            {borrow.course && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">รายวิชา:</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">
                  [{borrow.course.code}] {borrow.course.name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">อาจารย์ผู้สอน:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {instructorDisplay}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">วัตถุประสงค์:</span>
              <span className="text-slate-700 dark:text-slate-300">{borrow.purpose || '-'}</span>
            </div>
          </div>

          {/* Equipment Table */}
          <div className="space-y-1.5">
            <div className="font-bold text-cyan-950 dark:text-cyan-200 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>ครุภัณฑ์คงทนที่ยืม ({borrow.items?.length || 0} รายการ - ต้องส่งคืน):</span>
              </span>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-2.5">รายการอุปกรณ์</th>
                    <th className="p-2.5 text-center">รหัส Asset ID</th>
                    <th className="p-2.5 text-center">จำนวน</th>
                    <th className="p-2.5 text-right">สภาพ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(borrow.items || []).map((it: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                        {it.item?.name || it.name}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-teal-700 dark:text-teal-400">
                        {it.asset?.assetCode || it.assetCode || '-'}
                      </td>
                      <td className="p-2.5 text-center font-medium text-slate-700 dark:text-slate-300">
                        {it.quantity || 1} {it.item?.unit || it.unit || 'ชิ้น'}
                      </td>
                      <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        {it.asset?.condition === 'DAMAGED' ? '⚠️ ชำรุด' : '✓ สมบูรณ์'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consumables (if linked requisition) */}
          {borrow.requisitionRequest?.items && borrow.requisitionRequest.items.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>วัสดุสิ้นเปลืองที่จ่ายร่วม ({borrow.requisitionRequest.items.length} รายการ):</span>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2">รายการพัสดุ</th>
                      <th className="p-2 text-right">จำนวนที่จ่าย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {borrow.requisitionRequest.items.map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 text-slate-800 dark:text-slate-200 font-medium">
                          {r.item?.name || r.name}
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900 dark:text-slate-100">
                          {r.quantityDispensed > 0 ? r.quantityDispensed : r.quantityRequested} {r.requestedUnit || r.item?.unit || 'หน่วย'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QR Verification Bar */}
          <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-teal-950 dark:text-teal-200 text-xs flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>คิวอาร์โค้ดประจำใบยืม (Smart Return QR)</span>
              </div>
              <p className="text-[11px] text-teal-700 dark:text-teal-300">
                เมื่อนำมาคืน เจ้าหน้าที่สามารถสแกน QR Code นี้เพื่อเปิดหน้าตรวจรับคืนและเช็คสภาพได้ทันทีในคลิกเดียว
              </p>
            </div>
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Borrow QR"
                className="w-14 h-14 rounded-xl border border-teal-200 bg-white p-0.5 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                QR...
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
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
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/60 transition cursor-pointer shadow-xs"
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
              <span>พิมพ์ใบรายการทางการ (A4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
