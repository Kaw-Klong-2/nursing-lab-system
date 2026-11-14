'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  BookOpen,
  ArrowLeft,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Bookmark,
  Share2,
  Download,
  Plus,
  X,
  FileText,
  Upload,
  CheckCircle2,
  Sliders,
  Palette,
  Eye,
  Trash2,
  QrCode,
  ShieldAlert,
  Layers,
  FileUp,
  Image as ImageIcon,
  Check,
  RotateCcw,
  BookMarked,
  Info,
  Volume2,
  VolumeX,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export interface EBookPage {
  pageNumber: number;
  chapterTitle?: string;
  title: string;
  content: string; // Markdown or rich text
  imageUrl?: string;
  bulletPoints?: string[];
  callout?: {
    type: 'info' | 'warning' | 'tip';
    text: string;
  };
}

export interface EBookItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'STUDENT_MANUAL' | 'LAB_SAFETY' | 'EQUIPMENT_SOP' | 'STAFF_TEACHER';
  author: string;
  edition: string;
  coverGradient: string;
  coverIcon: string;
  coverPattern?: string;
  totalPages: number;
  pdfUrl?: string;
  embedUrl?: string;
  pages: EBookPage[];
  isCustomUploaded?: boolean;
  uploadedAt?: string;
  lastReadPage?: number;
}

const IDB_NAME = 'kunurse_ebooks_db';
const IDB_STORE = 'ebooks';
const IDB_KEY = 'custom_ebooks';

function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) return fileDMatch[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  const openMatch = trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  return null;
}

function openEBookDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbLoadEBooks(): Promise<EBookItem[]> {
  try {
    const db = await openEBookDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function idbSaveEBooks(books: EBookItem[]): Promise<void> {
  try {
    const db = await openEBookDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(books, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save skipped:', err);
  }
}

async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only run in browser');
  }
  const win = window as any;
  if (win.pdfjsLib) {
    win.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return win.pdfjsLib;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-pdfjs="3.11.174"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('โหลดตัวประมวลผล PDF ล้มเหลว')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.dataset.pdfjs = '3.11.174';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('ไม่สามารถโหลดตัวอ่าน PDF ได้ กรุณาตรวจสอบอินเทอร์เน็ต'));
    document.head.appendChild(script);
  });

  if (!win.pdfjsLib) {
    throw new Error('ไม่สามารถเริ่มต้นตัวประมวลผล PDF ได้');
  }
  win.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return win.pdfjsLib;
}

async function renderPdfFileToPages(
  file: File,
  onProgress: (message: string) => void
): Promise<EBookPage[]> {
  onProgress('กำลังเตรียมตัวแปลงไฟล์ PDF เป็นหน้า E-Book...');
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPages = Math.min(pdf.numPages, 50);
  const pages: EBookPage[] = [];

  for (let i = 1; i <= maxPages; i++) {
    onProgress(`กำลังแปลงหน้าเอกสารเป็น E-Book (หน้า ${i} / ${maxPages})...`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: context, viewport }).promise;
    const imageUrl = canvas.toDataURL('image/jpeg', 0.82);

    // Extract text for TOC title & searchability
    let extractedText = '';
    let extractedTitle = `หน้า ${i}`;
    try {
      const textContent = await page.getTextContent();
      const strings = (textContent?.items || [])
        .map((item: any) => (typeof item?.str === 'string' ? item.str.trim() : ''))
        .filter(Boolean);
      extractedText = strings.join(' ').slice(0, 1500);
      const firstLine = strings.find((s: string) => s.length >= 3);
      if (firstLine) {
        extractedTitle = firstLine.slice(0, 80);
      }
    } catch {
      // Text extraction is best-effort
    }

    pages.push({
      pageNumber: i,
      chapterTitle: file.name.replace(/\.pdf$/i, ''),
      title: extractedTitle,
      content: extractedText || `เอกสารหน้าที่ ${i} จาก ${maxPages}`,
      imageUrl,
    });
  }

  return pages;
}

/**
 * Synthesize 3-stage organic paper-flip sound using Web Audio API (Paul Kellet 1/f Pink Noise + fiber crinkle + body settle thump)
 */
function playPaperFlipSound(type: 'next' | 'prev' | 'open' = 'next'): void {
  if (typeof window === 'undefined') return;
  try {
    const win = window as any;
    const AudioCtx = window.AudioContext || win.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx: AudioContext = win.__kunurseAudioCtx || new AudioCtx();
    win.__kunurseAudioCtx = ctx;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const duration = type === 'open' ? 0.45 : 0.38;
    const sampleRate = ctx.sampleRate;
    const sampleCount = Math.floor(sampleRate * duration);

    // Helper: generate Paul Kellet 1/f Pink Noise so paper texture sounds warm & fibrous rather than hissy white noise
    const generatePinkBuffer = (count: number, modulator: (progress: number, idx: number) => number) => {
      const buf = ctx.createBuffer(1, count, sampleRate);
      const data = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < count; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
        data[i] = pink * modulator(i / count, i);
      }
      return buf;
    };

    // Layer 1: Organic Paper Fiber Slide (arching page turn friction over ~380ms)
    const slideBuf = generatePinkBuffer(sampleCount, (progress, idx) => {
      const envelope = Math.pow(Math.sin(Math.PI * progress), 1.35) * (1 - progress * 0.35);
      const microCrinkle = 0.82 + 0.18 * Math.sin(idx * 0.037) * Math.cos(idx * 0.013);
      return envelope * microCrinkle;
    });

    const slideSource = ctx.createBufferSource();
    slideSource.buffer = slideBuf;

    const slideBandpass = ctx.createBiquadFilter();
    slideBandpass.type = 'bandpass';
    slideBandpass.Q.value = 0.55;

    const slideLowpass = ctx.createBiquadFilter();
    slideLowpass.type = 'lowpass';
    slideLowpass.frequency.setValueAtTime(2600, now);

    if (type === 'next') {
      slideBandpass.frequency.setValueAtTime(520, now);
      slideBandpass.frequency.exponentialRampToValueAtTime(1350, now + duration * 0.44);
      slideBandpass.frequency.exponentialRampToValueAtTime(440, now + duration);
    } else if (type === 'prev') {
      slideBandpass.frequency.setValueAtTime(480, now);
      slideBandpass.frequency.exponentialRampToValueAtTime(1200, now + duration * 0.42);
      slideBandpass.frequency.exponentialRampToValueAtTime(420, now + duration);
    } else {
      slideBandpass.frequency.setValueAtTime(380, now);
      slideBandpass.frequency.exponentialRampToValueAtTime(1150, now + duration * 0.48);
      slideBandpass.frequency.exponentialRampToValueAtTime(360, now + duration);
    }

    const slideGain = ctx.createGain();
    slideGain.gain.setValueAtTime(0.008, now);
    slideGain.gain.linearRampToValueAtTime(0.24, now + duration * 0.32);
    slideGain.gain.exponentialRampToValueAtTime(0.004, now + duration);

    slideSource.connect(slideBandpass);
    slideBandpass.connect(slideLowpass);
    slideLowpass.connect(slideGain);
    slideGain.connect(ctx.destination);
    slideSource.start(now);

    // Layer 2: Paper Body Lift & Soft Landing Cushion (low-mid air displacement resonance)
    const bodyBuf = generatePinkBuffer(sampleCount, (progress) => {
      const liftPulse = Math.exp(-Math.pow((progress - 0.08) / 0.055, 2)) * 0.7;
      const settlePulse = Math.exp(-Math.pow((progress - 0.78) / 0.08, 2)) * 0.95;
      return liftPulse + settlePulse;
    });

    const bodySource = ctx.createBufferSource();
    bodySource.buffer = bodyBuf;

    const bodyLowpass = ctx.createBiquadFilter();
    bodyLowpass.type = 'lowpass';
    bodyLowpass.frequency.setValueAtTime(240, now);
    bodyLowpass.frequency.exponentialRampToValueAtTime(115, now + duration);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.14, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.006, now + duration);

    bodySource.connect(bodyLowpass);
    bodyLowpass.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodySource.start(now);

    // Layer 3: Crisp Corner Peel Micro-Rustle (initial thumb-lift paper edge texture)
    const peelCount = Math.floor(sampleRate * 0.065);
    const peelBuf = generatePinkBuffer(peelCount, (p, idx) => {
      const env = Math.sin(Math.PI * p) * (1 - p * 0.4);
      const fiberGrain = 0.75 + 0.25 * Math.cos(idx * 0.061);
      return env * fiberGrain;
    });

    const peelSource = ctx.createBufferSource();
    peelSource.buffer = peelBuf;

    const peelBandpass = ctx.createBiquadFilter();
    peelBandpass.type = 'bandpass';
    peelBandpass.frequency.setValueAtTime(1850, now);
    peelBandpass.Q.value = 0.7;

    const peelGain = ctx.createGain();
    peelGain.gain.setValueAtTime(0.055, now);
    peelGain.gain.exponentialRampToValueAtTime(0.002, now + 0.065);

    peelSource.connect(peelBandpass);
    peelBandpass.connect(peelGain);
    peelGain.connect(ctx.destination);
    peelSource.start(now);
  } catch {
    // Audio playback may be blocked until first user interaction; fail silently
  }
}

const DEFAULT_EBOOKS: EBookItem[] = [
  {
    id: 'ebook-student-manual',
    title: 'คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาลสำหรับนิสิต',
    subtitle: 'ฉบับสมบูรณ์: จองห้องแล็บ ฝึกปฏิบัติด้วยตนเอง ยืมครุภัณฑ์ และเบิกวัสดุ',
    category: 'STUDENT_MANUAL',
    author: 'งานบริหารห้องปฏิบัติการพยาบาล มก.',
    edition: 'ปีการศึกษา 2569 (v2.6)',
    coverGradient: 'from-teal-600 via-emerald-600 to-cyan-700',
    coverIcon: '🏥',
    totalPages: 10,
    pdfUrl: '/manuals/student_user_manual.pdf',
    pages: [
      {
        pageNumber: 1,
        chapterTitle: 'บทนำและการเข้าสู่ระบบ',
        title: 'ยินดีต้อนรับสู่ระบบห้องปฏิบัติการพยาบาล',
        content:
          'ระบบบริหารจัดการห้องปฏิบัติการพยาบาล คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์ ออกแบบขึ้นเพื่ออำนวยความสะดวกให้นิสิตพยาบาลสามารถเข้าถึงทรัพยากรการเรียนรู้ ห้องฝึกทักษะเสมือนจริง และอุปกรณ์การแพทย์ได้อย่างรวดเร็ว ถูกต้อง และปลอดภัย',
        bulletPoints: [
          'เข้าสู่ระบบด้วยบัญชี KU All-Login ของนิสิต',
          'ตรวจสอบสิทธิ์การจองห้องแล็บตามตารางเรียนและช่วงเวลาเปิดทำการ',
          'ดูรายการครุภัณฑ์และเวชภัณฑ์พร้อมรูปภาพจริงและสถานะว่างเรียลไทม์',
        ],
        callout: {
          type: 'info',
          text: 'นิสิตสามารถเปิดระบบผ่านสมาร์ตโฟนหรือแท็บเล็ตได้ทุกที่ทุกเวลาโดยไม่ต้องลงแอปพลิเคชันเพิ่มเติม',
        },
      },
      {
        pageNumber: 2,
        chapterTitle: 'บทนำและการเข้าสู่ระบบ',
        title: 'ขั้นตอนการใช้งานหลัก 4 ขั้นตอน',
        content:
          'วงจรการใช้งานระบบของนิสิตประกอบด้วยขั้นตอนที่เข้าใจง่าย เพื่อให้การเตรียมตัวก่อนฝึกปฏิบัติการเป็นไปอย่างราบรื่นและมีประสิทธิภาพสูงสุด',
        bulletPoints: [
          '1. จองห้องปฏิบัติการหรือขอเข้าฝึกทักษะด้วยตนเอง (Self-Directed Practice)',
          '2. เลือกยืมครุภัณฑ์หรือเบิกวัสดุสิ้นเปลืองผ่านแคตตาล็อกภาพ 1-Click',
          '3. รับการอนุมัติคำขอจากอาจารย์ผู้สอนหรือเจ้าหน้าที่ประจำห้องแล็บ',
          '4. แสดง QR Ticket หน้าเคาน์เตอร์เพื่อรับอุปกรณ์และคืนตามกำหนดเวลา',
        ],
        callout: {
          type: 'tip',
          text: 'แนะนำให้นิสิตส่งคำขอยืมล่วงหน้าอย่างน้อย 24 ชั่วโมงก่อนชั่วโมงฝึกปฏิบัติการจริง',
        },
      },
      {
        pageNumber: 3,
        chapterTitle: 'การจองห้องแล็บ & ฝึกทักษะ',
        title: 'การขอเข้าฝึกปฏิบัติทักษะด้วยตนเอง',
        content:
          'การฝึกทักษะทางการพยาบาลจำเป็นต้องมีการทบทวนอย่างสม่ำเสมอ นิสิตสามารถขอเข้าฝึกปฏิบัติการในห้องว่างนอกเวลาเรียน เพื่อเตรียมตัวสอบ OSCE หรือพัฒนาความเชี่ยวชาญส่วนบุคคล',
        bulletPoints: [
          'เลือกหัวข้อหัตถการที่ต้องการฝึกซ้อม เช่น การให้สารน้ำ, การทำแผลปลอดเชื้อ, การทำ CPR',
          'เลือกห้องปฏิบัติการและช่วงเวลาที่เปิดให้เข้าฝึกซ้อม',
          'ระบุจำนวนเพื่อนร่วมกลุ่ม (สูงสุดไม่เกินที่ห้องกำหนด)',
          'ระบบจะจัดเตรียมชุดอุปกรณ์มาตรฐาน (Practice Kit) ให้พร้อม ณ จุดฝึกซ้อม',
        ],
      },
      {
        pageNumber: 4,
        chapterTitle: 'การจองห้องแล็บ & ฝึกทักษะ',
        title: 'กฎระเบียบการใช้ห้องฝึกปฏิบัติการ',
        content:
          'เพื่อความปลอดภัยและรักษาสภาพแวดล้อมที่เหมาะสม นิสิตทุกคนต้องปฏิบัติตามระเบียบห้องปฏิบัติการอย่างเคร่งครัดตลอดเวลาที่อยู่ในพื้นที่',
        bulletPoints: [
          'แต่งกายด้วยชุดฝึกปฏิบัติการหรือเสื้อกาวน์พยาบาลถูกระเบียบ',
          'สวมรองเท้าหุ้มส้นสำหรับห้องแล็บ ห้ามสวมรองเท้าแตะเด็ดขาด',
          'ห้ามนำอาหารและเครื่องดื่มทุกชนิดเข้ามาในห้องปฏิบัติการ',
          'เช็กชื่อเข้า-ออกห้องปฏิบัติการผ่านระบบทุกครั้ง',
        ],
        callout: {
          type: 'warning',
          text: 'หากพบอุปกรณ์ชำรุดหรือเกิดอุบัติเหตุ ต้องแจ้งเจ้าหน้าที่ประจำห้องแล็บทันที',
        },
      },
      {
        pageNumber: 5,
        chapterTitle: 'การยืม-คืน & เบิกพัสดุ',
        title: 'การใช้แคตตาล็อกภาพเพื่อขอยืมครุภัณฑ์',
        content:
          'หน้าแคตตาล็อกเบิก-ยืมพัสดุออกแบบให้ค้นหาง่ายเหมือนร้านค้าออนไลน์ นิสิตสามารถพิมพ์ชื่ออุปกรณ์ ดูภาพตัวอย่าง สเปก และเลือกเจาะจงหมายเลขเครื่องได้',
        bulletPoints: [
          'ค้นหาอุปกรณ์ด้วยรหัสหรือชื่อ เช่น "หุ่นฝึกกู้ชีพ", "เครื่องวัดความดัน"',
          'คลิกที่รหัสเครื่องเพื่อเลือกเจาะจงชิ้นครุภัณฑ์ที่ต้องการ',
          'สังเกตป้ายกำกับพิเศษ เช่น "🎯 ใช้สอบ OSCE" เพื่อความแม่นยำในการเลือก',
          'กดไอคอน ❤️ เพื่อบันทึกพัสดุที่ใช้บ่อยไว้ในรายการโปรด',
        ],
      },
      {
        pageNumber: 6,
        chapterTitle: 'การยืม-คืน & เบิกพัสดุ',
        title: 'การเบิกวัสดุสิ้นเปลืองและการแบ่งใช้',
        content:
          'เวชภัณฑ์และวัสดุสิ้นเปลืองสามารถเบิกเป็นหน่วยย่อย (เช่น เข็ม 5 เล่ม, ถุงมือ 2 คู่) ได้โดยตรง เพื่อความประหยัดงบประมาณและลดขยะทางการแพทย์',
        bulletPoints: [
          'สลับหน่วยเบิกเป็น "ชิ้น/กล่อง" ได้ที่ตัวสลับหน่วยบนการ์ดพัสดุ',
          'ใช้วัสดุที่ระบุว่า "สำหรับฝึกหุ่นจำลอง" เพื่อความคุ้มค่าสูงสุด',
          'เมื่อใช้เสร็จแล้วให้คัดแยกขยะติดเชื้อและขยะทั่วไปตามถังขยะสีที่กำหนด',
        ],
        callout: {
          type: 'tip',
          text: 'ชุดฝึกหัตถการสำเร็จรูป (Practice Kits) รวมทั้งครุภัณฑ์และวัสดุที่ต้องใช้ไว้ให้ครบในคลิกเดียว',
        },
      },
      {
        pageNumber: 7,
        chapterTitle: 'การส่งคืนและการดูแลรักษา',
        title: 'ขั้นตอนการส่งคืนครุภัณฑ์พยาบาล',
        content:
          'เมื่อสิ้นสุดการฝึกปฏิบัติการ นิสิตต้องทำความสะอาดและตรวจสอบความเรียบร้อยของอุปกรณ์ก่อนนำมาส่งคืน ณ เคาน์เตอร์จ่ายพัสดุกลาง',
        bulletPoints: [
          'ทำความสะอาดพื้นผิวอุปกรณ์ด้วยน้ำยาฆ่าเชื้อตามคำแนะนำของเครื่องมือนั้นๆ',
          'ตรวจสอบอุปกรณ์ส่วนควบ เช่น สายไฟ สายวัด แบตเตอรี่ ให้ครบชุด',
          'นำอุปกรณ์มาส่งคืนและให้เจ้าหน้าที่สแกนรับคืนในระบบ',
          'หากชำรุดหรือมีส่วนประกอบสูญหาย ให้แจ้งความจริงเพื่อบันทึกประวัติการบำรุงรักษา',
        ],
      },
      {
        pageNumber: 8,
        chapterTitle: 'การส่งคืนและการดูแลรักษา',
        title: 'ระบบคะแนนความรับผิดชอบและการคืนตรงเวลา',
        content:
          'การส่งคืนครุภัณฑ์ตรงเวลาเป็นวินัยสำคัญของวิชาชีพพยาบาล ระบบมีระบบแจ้งเตือนก่อนถึงกำหนดส่งคืนเพื่อป้องกันการลืม',
        bulletPoints: [
          'ระบบจะส่งการแจ้งเตือนล่วงหน้า 1 วัน และ 2 ชั่วโมงก่อนครบกำหนด',
          'กรณีต้องการยืมต่อ ให้กดยื่นคำขอต่ออายุการยืมผ่านระบบก่อนหมดเวลา',
          'การคืนล่าช้าโดยไม่มีเหตุจำเป็นอาจส่งผลต่อการจำกัดสิทธิ์การยืมในรอบถัดไป',
        ],
        callout: {
          type: 'info',
          text: 'สามารถตรวจสอบประวัติการยืม-คืนย้อนหลังได้ตลอดเวลาในแท็บ "ประวัติของฉัน"',
        },
      },
      {
        pageNumber: 9,
        chapterTitle: 'คำถามที่พบบ่อย (FAQ)',
        title: 'คำถามที่พบบ่อยเกี่ยวกับการยืมและจองห้อง',
        content:
          'รวบรวมข้อสงสัยที่พบบ่อยจากนิสิตทุกชั้นปี พร้อมแนวทางแก้ไขอย่างรวดเร็ว',
        bulletPoints: [
          'Q: ถ้าต้องการยืมของเสาร์-อาทิตย์ ทำได้หรือไม่? -> A: ต้องได้รับความเห็นชอบจากอาจารย์ที่ปรึกษาก่อน',
          'Q: หากลืมรหัสผ่านหรือเข้าสู่ระบบไม่ได้ ทำอย่างไร? -> A: แจ้งเจ้าหน้าที่ประจำห้องแล็บเพื่อรีเซ็ตสิทธิ์',
          'Q: สามารถขอยืมเครื่องที่ติดป้ายว่า "ประจำวิชา" ได้หรือไม่? -> A: ไม่ได้ ครุภัณฑ์ดังกล่าวสงวนไว้สำหรับชั่วโมงแล็บ',
        ],
      },
      {
        pageNumber: 10,
        chapterTitle: 'ช่องทางการติดต่อ',
        title: 'ช่องทางติดต่อและศูนย์ช่วยเหลือนิสิต',
        content:
          'หากพบปัญหาในการใช้งานระบบหรือมีข้อเสนอแนะในการปรับปรุง สามารถติดต่อทีมงานได้ตลอดเวลาทำการ',
        bulletPoints: [
          'ห้องปฏิบัติการพยาบาล ชั้น 3 อาคารคณะพยาบาลศาสตร์ มก.',
          'โทรศัพท์ภายใน: 02-xxx-xxxx ต่อ 1234',
          'Line Official: @KUNurseLab',
          'เวลาทำการ: วันจันทร์ - ศุกร์ 08:30 - 16:30 น. (ยกเว้นวันหยุดราชการ)',
        ],
        callout: {
          type: 'tip',
          text: 'ขอขอบคุณนิสิตทุกคนที่ร่วมกันดูแลรักษาทรัพยากรห้องปฏิบัติการเพื่อการเรียนรู้อย่างยั่งยืน',
        },
      },
    ],
  },
  {
    id: 'ebook-lab-safety',
    title: 'คู่มือความปลอดภัยและมาตรฐานอาชีวอนามัยในห้องแล็บพยาบาล',
    subtitle: 'Safety Protocols, Waste Management & Emergency Action Plans',
    category: 'LAB_SAFETY',
    author: 'คณะกรรมการความปลอดภัยทางชีวภาพ คณะพยาบาลศาสตร์',
    edition: 'ฉบับปรับปรุง 2569',
    coverGradient: 'from-amber-600 via-rose-600 to-red-700',
    coverIcon: '🛡️',
    totalPages: 6,
    pages: [
      {
        pageNumber: 1,
        chapterTitle: 'หลักความปลอดภัยสากล',
        title: 'มาตรการป้องกันการติดเชื้อสากล (Universal Precautions)',
        content:
          'การฝึกปฏิบัติการพยาบาลแม้จะใช้หุ่นจำลอง แต่ต้องยึดหลักสุขอนามัยและเทคนิคปลอดเชื้อ (Aseptic Technique) เสมือนการดูแลผู้ป่วยจริงในโรงพยาบาล',
        bulletPoints: [
          'ล้างมือ 7 ขั้นตอนด้วยสบู่หรือแอลกอฮอล์เจลก่อนและหลังทำหัตถการทุกครั้ง',
          'สวมถุงมือสะอาดหรือถุงมือปลอดเชื้อให้ถูกต้องตามประเภทของหัตถการ',
          'สวมอุปกรณ์ป้องกันส่วนบุคคล (PPE) เช่น แมสก์ แว่นตา เมื่อมีความเสี่ยงต่อการกระเด็นของสารคัดหลั่งจำลอง',
        ],
        callout: {
          type: 'warning',
          text: 'ห้ามสวมถุงมือที่ใช้แล้วเดินออกนอกพื้นที่ห้องปฏิบัติการหรือจับลูกบิดประตูเด็ดขาด',
        },
      },
      {
        pageNumber: 2,
        chapterTitle: 'การจัดการของมีคมและขยะ',
        title: 'การทิ้งเข็มฉีดยาและของมีคมทางการแพทย์',
        content:
          'อุบัติเหตุจากเข็มทิ่มตำ (Needle Stick Injury) เป็นความเสี่ยงสำคัญ การทิ้งของมีคมต้องปฏิบัติตามมาตรฐานอย่างเคร่งครัด 100%',
        bulletPoints: [
          'ห้ามสวมปลอกเข็มกลับด้วยสองมือ (No Two-Handed Recapping) ให้ใช้เทคนิคตักปลอกมือเดียว (One-Hand Scoop Technique)',
          'ทิ้งเข็มและกระบอกฉีดยาลงในถังขยะของมีคม (Sharp Box) สีแดงที่มีฝาปิดมิดชิดทันที',
          'เมื่อปริมาณของมีคมถึง 3/4 ของความจุถัง ให้ปิดล็อคฝาถังและแจ้งเจ้าหน้าที่เพื่อนำไปเผาทำลาย',
        ],
        callout: {
          type: 'warning',
          text: 'กรณีถูกเข็มทิ่มตำ ให้บีบเลือดออก ล้างน้ำไหลผ่านอย่างน้อย 5 นาที และแจ้งอาจารย์ผู้คุมแล็บทันที',
        },
      },
      {
        pageNumber: 3,
        chapterTitle: 'การจัดการขยะ',
        title: 'การคัดแยกขยะมูลฝอยในห้องปฏิบัติการ',
        content:
          'การคัดแยกขยะที่ถูกต้องช่วยลดการแพร่กระจายเชื้อและเป็นมิตรต่อสิ่งแวดล้อม ห้องแล็บจัดเตรียมถังขยะ 4 ประเภท',
        bulletPoints: [
          'ถังสีแดง: ขยะติดเชื้อ ผ้าก๊อซเปื้อนเลือด สำลีเปื้อนสารคัดหลั่ง ถุงมือเปื้อนสาร',
          'ถังสีเขียว: ขยะทั่วไปที่ไม่เปื้อนสารคัดหลั่ง เช่น ซองพลาสติก กระดาษห่อเข็ม',
          'ถังสีเหลือง: ขยะอันตราย เช่น สารเคมีล้างเครื่องมือ แบตเตอรี่เสื่อมสภาพ',
          'ถังสีน้ำเงิน: ขยะรีไซเคิล เช่น ขวดน้ำเกลือพลาสติกที่ยังไม่เปิดใช้',
        ],
      },
      {
        pageNumber: 4,
        chapterTitle: 'แผนฉุกเฉิน',
        title: 'แผนเผชิญเหตุกรณีเพลิงไหม้และไฟฟ้ารั่ว',
        content:
          'ห้องปฏิบัติการพยาบาลมีอุปกรณ์ไฟฟ้ากำลังสูง เช่น หุ่นจำลองคลอด เตียงไฟฟ้า เครื่อง AED นิสิตและเจ้าหน้าที่ต้องทราบตำแหน่งอุปกรณ์ดับเพลิงและทางหนีไฟ',
        bulletPoints: [
          'ถังดับเพลิงเคมีแห้งติดตั้งอยู่บริเวณข้างประตูทางเข้าห้องแล็บ 1 และ 2',
          'ปุ่มตัดกระแสไฟฟ้าฉุกเฉิน (Emergency Power Off) อยู่ข้างโต๊ะเจ้าหน้าที่',
          'เมื่อได้ยินเสียงสัญญาณเตือนภัย ให้หยุดทำหัตถการ ปิดสวิตช์เครื่องมือ และเดินไปยังบันไดหนีไฟทันที',
          'ห้ามใช้ลิฟต์โดยสารในกรณีเกิดเพลิงไหม้โดยเด็ดขาด',
        ],
      },
      {
        pageNumber: 5,
        chapterTitle: 'สารเคมี',
        title: 'ความปลอดภัยในการใช้น้ำยาทำความสะอาดและสารเคมี',
        content:
          'น้ำยาฆ่าเชื้อ เช่น แอลกอฮอล์ 70%, คลอรีน, และน้ำยาทำความสะอาดหุ่น ต้องใช้อย่างถูกวิธีเพื่อป้องกันการระคายเคืองและไม่ทำให้หุ่นจำลองเสื่อมสภาพ',
        bulletPoints: [
          'ห้ามใช้ปากกาหมึกซึมหรือปากกาลูกลื่นเขียนบนผิวหนังหุ่นจำลอง เพราะหมึกจะซึมและลบไม่ออก',
          'เช็ดทำความสะอาดหุ่นด้วยน้ำสบู่อ่อนหรือน้ำยาเฉพาะที่คณะจัดเตรียมไว้ให้เท่านั้น',
          'โรยแป้งฝุ่นบางๆ บนผิวหุ่นหลังเช็ดแห้งเพื่อป้องกันยางเหนียวติดกัน',
        ],
      },
      {
        pageNumber: 6,
        chapterTitle: 'สรุปข้อปฏิบัติ',
        title: 'Checklist ความปลอดภัยประจำวัน',
        content:
          'รายการตรวจสอบตนเองก่อนออกจากห้องปฏิบัติการพยาบาลทุกครั้ง',
        bulletPoints: [
          '[ ] ถอดปลั๊กอุปกรณ์ไฟฟ้าและดับเครื่องหุ่นจำลอง',
          '[ ] นำของมีคมทั้งหมดลงถัง Sharp Box',
          '[ ] เช็ดทำความสะอาดเตียงและโต๊ะวางเครื่องมือ',
          '[ ] ล้างมือให้สะอาดก่อนออกจากห้องแล็บ',
        ],
      },
    ],
  },
  {
    id: 'ebook-aed-trainer-sop',
    title: 'คู่มือขั้นตอนการใช้งานเครื่อง AED Trainer และหุ่นกู้ชีพขั้นพื้นฐาน (BLS SOP)',
    subtitle: 'Standard Operating Procedure for CPR Manikin & AED Trainer',
    category: 'EQUIPMENT_SOP',
    author: 'กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ',
    edition: 'ฉบับปีการศึกษา 2569',
    coverGradient: 'from-blue-700 via-indigo-700 to-slate-900',
    coverIcon: '⚡',
    totalPages: 4,
    pages: [
      {
        pageNumber: 1,
        chapterTitle: 'การเตรียมอุปกรณ์',
        title: 'การตรวจสอบเครื่องกระตุกหัวใจไฟฟ้าจำลอง (AED Trainer)',
        content:
          'เครื่อง AED Trainer ใช้สำหรับฝึกทักษะการช่วยฟื้นคืนชีพขั้นพื้นฐาน (CPR & AED) โดยจำลองเสียงและขั้นตอนการปล่อยกระแสไฟฟ้าเสมือนเครื่องจริงในสถานพยาบาล',
        bulletPoints: [
          'ตรวจสอบระดับแบตเตอรี่ของตัวเครื่องและรีโมตควบคุมของอาจารย์',
          'ตรวจสอบสภาพแผ่นแปะขั้วหัวใจ (Defibrillation Pads) ต้องไม่มีรอยฉีกขาดและแถบกาวไม่เสื่อมสภาพ',
          'ตรวจสอบสายเชื่อมต่อระหว่างแผ่นแปะและช่องเสียบสีเหลืองของตัวเครื่อง',
        ],
        callout: {
          type: 'info',
          text: 'เครื่อง Trainer จะไม่มีการปล่อยกระแสไฟฟ้าจริง ปลอดภัยสำหรับการฝึกซ้อมทุกระดับ',
        },
      },
      {
        pageNumber: 2,
        chapterTitle: 'ขั้นตอนการติดแผ่นแปะ',
        title: 'ตำแหน่งการติดแผ่นแปะ AED บนตัวหุ่น',
        content:
          'การติดแผ่นแปะในตำแหน่งที่ถูกต้องมีความสำคัญอย่างยิ่งต่อความแม่นยำในการวิเคราะห์คลื่นไฟฟ้าหัวใจ',
        bulletPoints: [
          'แผ่นที่ 1 (Upper Right): ติดบริเวณใต้กระดูกไหปลาร้าด้านขวา',
          'แผ่นที่ 2 (Lower Left): ติดบริเวณใต้ราวนมซ้าย ชายโครงด้านข้างลำตัว',
          'กดแผ่นแปะให้แนบสนิทกับผิวหุ่นโดยไม่มีช่องว่างอากาศ',
          'เสียบขั้วต่อเข้ากับตัวเครื่องเพื่อเริ่มการวิเคราะห์จังหวะหัวใจ',
        ],
      },
      {
        pageNumber: 3,
        chapterTitle: 'ขั้นตอนการช็อกไฟฟ้า',
        title: 'ความปลอดภัยขณะเครื่องสั่งกระตุกหัวใจ (Shock Protocol)',
        content:
          'ขั้นตอนสำคัญที่สุดคือการประกาศความปลอดภัยเพื่อไม่ให้ผู้ช่วยเหลือสัมผัสตัวผู้ป่วยหรือหุ่นขณะช็อก',
        bulletPoints: [
          'เมื่อเครื่องแจ้ง "กำลังชาร์จ / ห้ามสัมผัสผู้ป่วย" ให้ผู้กดช็อกกางแขนและตะโกนเสียงดังฟังชัด:',
          '"ฉันถอย คุณถอย ทุกคนถอย!"',
          'กวาดสายตามองตั้งแต่หัวจรดเท้าของผู้ป่วยเพื่อให้แน่ใจว่าไม่มีใครสัมผัสตัว',
          'กดปุ่มรูปสายฟ้าสีส้มเพื่อปล่อยกระแสไฟฟ้า และเริ่มกดหน้าอก CPR ต่อทันที',
        ],
        callout: {
          type: 'warning',
          text: 'เน้นย้ำให้นิสิตฝึกตะโกนให้ชัดเจนและมองรอบข้างจริง ไม่เพียงแต่ท่องจำคำพูด',
        },
      },
      {
        pageNumber: 4,
        chapterTitle: 'การเก็บรักษา',
        title: 'การบำรุงรักษาและเก็บเข้าตู้ครุภัณฑ์',
        content:
          'ขั้นตอนหลังสิ้นสุดการฝึกซ้อมเพื่อยืดอายุการใช้งานของแผ่นแปะและวงจรไฟฟ้า',
        bulletPoints: [
          'ปิดสวิตช์เครื่อง AED ทันทีเมื่อฝึกเสร็จ',
          'ลอกแผ่นแปะออกจากผิวหุ่นอย่างนุ่มนวล และแปะกลับลงบนแผ่นพลาสติกใสรองรับ',
          'ม้วนสายไฟให้เรียบร้อย ไม่พับหักงอสายเคเบิล',
          'นำอุปกรณ์ใส่กระเป๋าพกพาและวางคืนในตู้ครุภัณฑ์รหัสที่กำหนด',
        ],
      },
    ],
  },
];

export default function AdminEBooksSandboxPage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin, isLoading } = useAuth();

  const [eBooks, setEBooks] = useState<EBookItem[]>(DEFAULT_EBOOKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Active Reading State
  const [activeBook, setActiveBook] = useState<EBookItem | null>(null);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'DUAL' | 'SINGLE'>('DUAL');
  const [zoomLevel, setZoomLevel] = useState<1 | 1.25 | 1.5>(1);
  const [paperTheme, setPaperTheme] = useState<'WHITE' | 'SEPIA' | 'DARK'>('WHITE');
  const [fontSize, setFontSize] = useState<'NORMAL' | 'LARGE' | 'XLARGE'>('NORMAL');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showQrModal, setShowQrModal] = useState<EBookItem | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [flipTransition, setFlipTransition] = useState<{
    direction: 'next' | 'prev';
    fromIndex: number;
    toIndex: number;
  } | null>(null);

  // New E-Book Creator Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'AUTO_UPLOAD' | 'DRIVE_LINK' | 'TEXT'>('AUTO_UPLOAD');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [newBookForm, setNewBookForm] = useState({
    title: '',
    subtitle: '',
    category: 'STUDENT_MANUAL' as EBookItem['category'],
    author: 'งานห้องปฏิบัติการพยาบาล มก.',
    edition: 'ฉบับปีการศึกษา 2569',
    coverIcon: '📘',
    coverGradient: 'from-teal-600 to-blue-700',
    pdfUrl: '',
    driveUrl: '',
    pageContentText: '',
  });

  const readerContainerRef = useRef<HTMLDivElement>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) {
        clearTimeout(flipTimerRef.current);
      }
    };
  }, []);

  // Set default mobile-friendly single-page mode & load sound preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        setViewMode('SINGLE');
      }
      try {
        const savedSound = localStorage.getItem('kunurse_ebook_sound');
        if (savedSound === 'false') {
          setIsSoundEnabled(false);
        }
      } catch {}
    }
  }, []);

  // Load persisted custom E-Books from IndexedDB + PostgreSQL and handle ?id= query param
  useEffect(() => {
    let cancelled = false;
    async function hydrateBooks() {
      const idbBooks = await idbLoadEBooks();

      let lsCustomBooks: EBookItem[] = [];
      try {
        const saved = localStorage.getItem('kunurse_sandbox_ebooks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            lsCustomBooks = parsed.filter((b: EBookItem) => b && b.isCustomUploaded);
          }
        }
      } catch {}

      let dbBooks: EBookItem[] = [];
      try {
        const res = await fetch('/api/manuals/upload');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.ebooks)) {
            dbBooks = data.ebooks;
          }
        }
      } catch {}

      if (cancelled) return;

      const customMap = new Map<string, EBookItem>();
      // Prioritize IndexedDB copy (contains full rendered page images), then localStorage, then DB
      for (const b of [...dbBooks, ...lsCustomBooks]) {
        if (b && b.id && !DEFAULT_EBOOKS.some((d) => d.id === b.id)) {
          customMap.set(b.id, b);
        }
      }
      for (const b of idbBooks) {
        if (b && b.id && !DEFAULT_EBOOKS.some((d) => d.id === b.id)) {
          customMap.set(b.id, b);
        }
      }

      const mergedList = [...Array.from(customMap.values()), ...DEFAULT_EBOOKS];
      setEBooks(mergedList);

      // Auto-open book if ?id= is provided (e.g. from QR Code scan)
      if (typeof window !== 'undefined') {
        const targetId = new URLSearchParams(window.location.search).get('id');
        if (targetId) {
          const match = mergedList.find((b) => b.id === targetId);
          if (match) {
            setActiveBook(match);
            setCurrentSpreadIndex(0);
          }
        }
      }
    }

    hydrateBooks();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keyboard navigation for turning pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeBook) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setActiveBook(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBook, currentSpreadIndex, isFullscreen, viewMode, isSoundEnabled]);

  const filteredBooks = useMemo(() => {
    return eBooks.filter((b) => {
      const matchCat = selectedCategory === 'ALL' || b.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [eBooks, selectedCategory, searchQuery]);

  const pageStep = viewMode === 'SINGLE' ? 1 : 2;

  const turnToSpread = (targetIdx: number, direction?: 'next' | 'prev') => {
    if (!activeBook) return;
    if (targetIdx === currentSpreadIndex) return;
    const resolvedDir: 'next' | 'prev' =
      direction ?? (targetIdx > currentSpreadIndex ? 'next' : 'prev');

    if (isSoundEnabled) {
      playPaperFlipSound(resolvedDir);
    }

    setFlipTransition({
      direction: resolvedDir,
      fromIndex: currentSpreadIndex,
      toIndex: targetIdx,
    });
    setCurrentSpreadIndex(targetIdx);
    updateLastRead(activeBook.id, targetIdx + 1);

    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
    }
    flipTimerRef.current = setTimeout(() => {
      setFlipTransition(null);
    }, 560);
  };

  const toggleSound = () => {
    const nextState = !isSoundEnabled;
    setIsSoundEnabled(nextState);
    try {
      localStorage.setItem('kunurse_ebook_sound', String(nextState));
    } catch {}
    if (nextState) {
      playPaperFlipSound('next');
    }
  };

  // Open Book Handler
  const handleOpenBook = (book: EBookItem) => {
    setActiveBook(book);
    setZoomLevel(1);
    setFlipTransition(null);
    const startPage = book.lastReadPage && book.lastReadPage > 0 ? book.lastReadPage - 1 : 0;
    const step = viewMode === 'SINGLE' ? 1 : 2;
    setCurrentSpreadIndex(Math.floor(startPage / step) * step);
    setShowToc(false);
    if (isSoundEnabled) {
      playPaperFlipSound('open');
    }
  };

  const handleNextPage = () => {
    if (!activeBook) return;
    const nextIdx = currentSpreadIndex + pageStep;
    if (nextIdx < activeBook.pages.length) {
      turnToSpread(nextIdx, 'next');
    }
  };

  const handlePrevPage = () => {
    if (!activeBook) return;
    const prevIdx = Math.max(0, currentSpreadIndex - pageStep);
    if (prevIdx !== currentSpreadIndex) {
      turnToSpread(prevIdx, 'prev');
    }
  };

  const handleBookTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (zoomLevel > 1 || e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleBookTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || zoomLevel > 1 || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      if (dx < 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
  };

  const updateLastRead = (bookId: string, pageNum: number) => {
    setEBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, lastReadPage: pageNum } : b))
    );
  };

  const handleCreateNewBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookForm.title.trim()) {
      alert('กรุณากรอกชื่อคู่มือ');
      return;
    }

    let finalPdfUrl = newBookForm.pdfUrl;
    let finalEmbedUrl: string | undefined;
    let generatedPages: EBookPage[] = [];

    if (uploadMode === 'AUTO_UPLOAD') {
      if (!selectedFile) {
        alert('กรุณาเลือกไฟล์ PDF ที่ต้องการอัปโหลด');
        return;
      }

      setIsUploadingFile(true);
      setUploadProgress('กำลังประมวลผลไฟล์ PDF เป็น E-Book...');

      try {
        // 1. Render real PDF pages in browser via PDF.js
        generatedPages = await renderPdfFileToPages(selectedFile, setUploadProgress);
        if (generatedPages.length === 0) {
          throw new Error('ไม่พบหน้าเอกสารภายในไฟล์ PDF นี้');
        }

        // 2. Non-blocking server upload (works on local dev, safely processed on Vercel)
        setUploadProgress('กำลังบันทึกข้อมูลคู่มือลงระบบ...');
        try {
          if (selectedFile.size <= 4 * 1024 * 1024) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const res = await fetch('/api/manuals/upload', {
              method: 'POST',
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.url) finalPdfUrl = data.url;
            }
          }
        } catch (uploadErr) {
          console.warn('Optional server file sync skipped:', uploadErr);
        }
      } catch (err: any) {
        alert(err?.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ PDF');
        setIsUploadingFile(false);
        setUploadProgress('');
        return;
      }
    } else if (uploadMode === 'DRIVE_LINK') {
      if (!newBookForm.driveUrl.trim()) {
        alert('กรุณาวางลิงก์ Google Drive ของเอกสารคู่มือ');
        return;
      }
      const trimmedUrl = newBookForm.driveUrl.trim();
      finalPdfUrl = trimmedUrl;
      const driveId = extractGoogleDriveFileId(trimmedUrl);
      finalEmbedUrl = driveId
        ? `https://drive.google.com/file/d/${driveId}/preview`
        : trimmedUrl;

      generatedPages = [
        {
          pageNumber: 1,
          chapterTitle: 'Google Drive เอกสารคู่มือ',
          title: newBookForm.title.trim(),
          content:
            newBookForm.subtitle.trim() ||
            'เอกสารคู่มือการปฏิบัติงานฉบับดิจิทัลจาก Google Drive',
          bulletPoints: [
            'เชื่อมต่อเอกสารจาก Google Drive กลางของคณะพยาบาลศาสตร์',
            'เปิดอ่านไฟล์ PDF ต้นฉบับได้โดยตรงภายในหน้าต่างนี้',
          ],
        },
      ];
    } else {
      const paragraphs = newBookForm.pageContentText
        ? newBookForm.pageContentText.split('\n\n').filter((p) => p.trim())
        : [
            'เนื้อหาหน้าเริ่มต้นของคู่มือฉบับนี้ สามารถแก้ไขและเพิ่มเนื้อหาบทเรียนได้ตามต้องการ',
          ];

      generatedPages = paragraphs.map((text, idx) => ({
        pageNumber: idx + 1,
        chapterTitle: `บทที่ ${idx + 1}`,
        title: `หัวข้อการเรียนรู้ที่ ${idx + 1}`,
        content: text.trim(),
        bulletPoints: [
          'ทบทวนขั้นตอนและแนวปฏิบัติให้ครบถ้วนก่อนลงมือปฏิบัติ',
          'สอบถามข้อสงสัยกับอาจารย์ผู้รับผิดชอบรายวิชา',
        ],
      }));
    }

    const newBook: EBookItem = {
      id: `ebook-custom-${Date.now()}`,
      title: newBookForm.title.trim(),
      subtitle: newBookForm.subtitle.trim() || 'คู่มือห้องปฏิบัติการพยาบาลดิจิทัล',
      category: newBookForm.category,
      author: newBookForm.author.trim() || 'งานห้องปฏิบัติการพยาบาล มก.',
      edition: newBookForm.edition.trim() || 'ฉบับปีการศึกษา 2569',
      coverGradient: newBookForm.coverGradient,
      coverIcon: newBookForm.coverIcon || '📖',
      totalPages: generatedPages.length,
      pdfUrl: finalPdfUrl || undefined,
      embedUrl: finalEmbedUrl,
      pages: generatedPages,
      isCustomUploaded: true,
      uploadedAt: new Date().toLocaleDateString('th-TH'),
    };

    const updatedBooks = [newBook, ...eBooks];
    const customOnly = updatedBooks.filter((b) => b.isCustomUploaded);

    // Persist full rendered book in IndexedDB (avoids 5MB localStorage limit on mobile)
    await idbSaveEBooks(customOnly);

    // Persist metadata (and images if within serverless body limit) to PostgreSQL
    try {
      const serialized = JSON.stringify(newBook);
      const dbBook: EBookItem =
        serialized.length > 3_500_000
          ? {
              ...newBook,
              pages: newBook.pages.map(({ imageUrl: _img, ...rest }) => rest),
            }
          : newBook;
      await fetch('/api/manuals/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE_EBOOK', ebook: dbBook }),
      });
    } catch (dbErr) {
      console.warn('Database sync skipped:', dbErr);
    }

    setEBooks(updatedBooks);
    setIsUploadingFile(false);
    setUploadProgress('');
    setShowUploadModal(false);
    setSelectedFile(null);
    setNewBookForm({
      title: '',
      subtitle: '',
      category: 'STUDENT_MANUAL',
      author: 'งานห้องปฏิบัติการพยาบาล มก.',
      edition: 'ฉบับปีการศึกษา 2569',
      coverIcon: '📘',
      coverGradient: 'from-teal-600 to-blue-700',
      pdfUrl: '',
      driveUrl: '',
      pageContentText: '',
    });
    handleOpenBook(newBook);
  };

  const handleDeleteBook = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('คุณต้องการลบหนังสือคู่มือเล่มนี้ออกจากชั้นหนังสือใช่หรือไม่?')) {
      const updated = eBooks.filter((b) => b.id !== bookId);
      setEBooks(updated);
      await idbSaveEBooks(updated.filter((b) => b.isCustomUploaded));
      try {
        await fetch('/api/manuals/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'DELETE_EBOOK', id: bookId }),
        });
      } catch {}
      if (activeBook?.id === bookId) setActiveBook(null);
    }
  };

  const handleResetDefaults = async () => {
    if (confirm('ต้องการรีเซ็ตชั้นหนังสือกลับสู่คู่มือมาตรฐานเริ่มต้นใช่หรือไม่?')) {
      setEBooks(DEFAULT_EBOOKS);
      await idbSaveEBooks([]);
      try {
        localStorage.removeItem('kunurse_sandbox_ebooks');
      } catch {}
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดชั้นหนังสือคู่มือ..."
        submessage="ห้องทดลอง Sandbox นวัตกรรม E-Book"
      />
    );
  }

  // Get current page(s) in reader
  const leftPage = activeBook ? activeBook.pages[currentSpreadIndex] : null;
  const rightPage =
    activeBook && viewMode === 'DUAL' ? activeBook.pages[currentSpreadIndex + 1] : null;

  const paperThemeClasses = {
    WHITE: 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800',
    SEPIA: 'bg-[#fcf8ed] text-[#433422] border-[#ecdcc3]',
    DARK: 'bg-[#181a1b] text-[#e8e6e3] border-[#2c3032]',
  };

  const imageThemeClasses = {
    WHITE: '',
    SEPIA: 'sepia-[.28] contrast-[.97]',
    DARK: 'brightness-90 contrast-105',
  };

  const fontSizeClasses = {
    NORMAL: 'text-xs sm:text-sm leading-relaxed',
    LARGE: 'text-sm sm:text-base leading-relaxed',
    XLARGE: 'text-base sm:text-lg leading-loose',
  };

  const renderPageSheetContent = (
    pageItem: EBookPage | null | undefined,
    slotRole: 'left' | 'right' | 'single',
    isAnimatedLeaf = false
  ) => {
    if (!activeBook) return null;

    const spineEdgeShadow =
      viewMode === 'DUAL' && slotRole === 'left'
        ? 'linear-gradient(to left, rgba(15,23,42,0.16) 0%, rgba(15,23,42,0.05) 14px, transparent 42px)'
        : viewMode === 'DUAL' && slotRole === 'right'
        ? 'linear-gradient(to right, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.06) 16px, transparent 46px)'
        : 'linear-gradient(to right, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.03) 12px, transparent 34px)';

    return (
      <div
        className={`w-full h-full flex flex-col justify-between relative ${
          isAnimatedLeaf ? 'overflow-hidden pointer-events-none select-none' : 'overflow-y-auto'
        } ${pageItem?.imageUrl ? 'p-2 sm:p-4' : 'p-5 sm:p-7 md:p-8'} ${
          paperThemeClasses[paperTheme]
        }`}
      >
        {/* Subtle physical book gutter & paper curvature lighting */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ background: spineEdgeShadow }}
        />

        <div className="relative z-0 flex-1 flex flex-col justify-between min-h-full">
          {pageItem ? (
            pageItem.imageUrl ? (
              <div className="flex flex-col items-center justify-start min-h-full gap-2">
                <div
                  style={{
                    width: !isAnimatedLeaf && zoomLevel > 1 ? `${zoomLevel * 100}%` : '100%',
                  }}
                  className="transition-all duration-200 mx-auto"
                >
                  <img
                    src={pageItem.imageUrl}
                    alt={pageItem.title || `หน้า ${pageItem.pageNumber}`}
                    draggable={false}
                    className={`w-full h-auto rounded-lg shadow-md object-contain mx-auto select-none ${imageThemeClasses[paperTheme]}`}
                  />
                </div>
                <div className="text-[10px] text-center opacity-60 font-mono py-1">
                  - หน้า {pageItem.pageNumber} / {activeBook.pages.length} -
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 pb-2 border-b border-current/10">
                    <span>{pageItem.chapterTitle || activeBook.title}</span>
                    <span className="font-mono">{pageItem.pageNumber}</span>
                  </div>
                  <h2 className="text-base sm:text-xl font-black leading-snug">
                    {pageItem.title}
                  </h2>
                  <p className={`${fontSizeClasses[fontSize]} whitespace-pre-line leading-relaxed`}>
                    {pageItem.content}
                  </p>
                  {pageItem.bulletPoints && pageItem.bulletPoints.length > 0 && (
                    <ul className="space-y-2 pt-2">
                      {pageItem.bulletPoints.map((bp, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{bp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pageItem.callout && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs sm:text-sm space-y-1 ${
                        pageItem.callout.type === 'warning'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                          : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900 text-teal-900 dark:text-teal-200'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {pageItem.callout.type === 'warning' ? (
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                        ) : (
                          <Info className="w-4 h-4 text-teal-600" />
                        )}
                        <span>ข้อควรระวัง / คำแนะนำ</span>
                      </div>
                      <p>{pageItem.callout.text}</p>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-center opacity-60 font-mono pt-3">
                  - {pageItem.pageNumber} -
                </div>
              </>
            )
          ) : slotRole === 'left' ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              ปกหน้าด้านใน
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 p-6">
              <div className="text-3xl">🎉</div>
              <div className="font-bold text-sm text-slate-500">จบคู่มือฉบับนี้แล้ว</div>
              <p className="text-xs text-slate-400">
                สามารถกดปุ่มย้อนกลับหรือเปิดดูสารบัญเพื่อทบทวนบทเรียนก่อนหน้า
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/admin/sandbox"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-white/10 px-2.5 py-1 rounded-xl border border-white/15 transition cursor-pointer backdrop-blur-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับศูนย์ทดลอง Sandbox</span>
              </Link>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/25 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Lab E-Book & Flipbook Sandbox</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap">
              <span>📚 ชั้นหนังสือคู่มือดิจิทัล & E-Book Reader</span>
            </h1>

            <p className="text-xs sm:text-sm text-indigo-200/90 max-w-3xl leading-relaxed">
              พื้นที่ทดลองจัดเก็บและเปิดอ่านคู่มือการใช้ห้องปฏิบัติการพยาบาล ระเบียบความปลอดภัย และ SOP เครื่องมือแพทย์
              ในรูปแบบ **Flipbook พลิกหน้ากาง 2 หน้าคู่** เสมือนจับหนังสือจริง พร้อมระบบอัปโหลดไฟล์ PDF และพิมพ์ QR Code ประจำเล่ม
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-lg shadow-teal-500/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ อัปโหลดคู่มือ / สร้างเล่มใหม่</span>
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              title="รีเซ็ตกลับสู่เล่มเริ่มต้น"
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bookshelf Controls: Search & Category Pills */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อคู่มือ, SOP, ระเบียบแล็บ หรือหัวข้อการฝึก..."
              className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none border-none p-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 self-center">
            ทั้งหมด {filteredBooks.length} เล่ม
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'ALL', label: '📖 ทั้งหมด', count: eBooks.length },
            {
              id: 'STUDENT_MANUAL',
              label: '📘 คู่มือนิสิต & การใช้ห้อง',
              count: eBooks.filter((b) => b.category === 'STUDENT_MANUAL').length,
            },
            {
              id: 'LAB_SAFETY',
              label: '🛡️ ระเบียบความปลอดภัย',
              count: eBooks.filter((b) => b.category === 'LAB_SAFETY').length,
            },
            {
              id: 'EQUIPMENT_SOP',
              label: '⚡ คู่มือครุภัณฑ์ & SOP',
              count: eBooks.filter((b) => b.category === 'EQUIPMENT_SOP').length,
            },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80'
              }`}
            >
              <span>{cat.label}</span>
              <span className="opacity-70 text-[10px]">({cat.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. 3D Digital Bookshelf Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            return (
              <div
                key={book.id}
                onClick={() => handleOpenBook(book)}
                className="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
              >
                {/* Book Cover Banner with 3D Spine effect */}
                <div
                  className={`relative p-6 bg-gradient-to-br ${book.coverGradient} text-white min-h-[190px] flex flex-col justify-between overflow-hidden shadow-inner`}
                >
                  {/* Left Spine Shadow (เงาสันหนังสือ 3D) */}
                  <div className="absolute top-0 bottom-0 left-0 w-3 bg-black/25 shadow-r pointer-events-none" />
                  <div className="absolute top-0 bottom-0 left-3 w-1 bg-white/20 pointer-events-none" />

                  {/* Top row: Badge and QR Code button */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white backdrop-blur-xs border border-white/20">
                      {book.totalPages} หน้า
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQrModal(book);
                        }}
                        title="ดู QR Code ประจำเล่มสำหรับติดหน้าห้องแล็บ"
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition backdrop-blur-xs cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      {book.isCustomUploaded && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteBook(book.id, e)}
                          title="ลบคู่มือเล่มนี้"
                          className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white transition backdrop-blur-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Book Title & Icon */}
                  <div className="relative z-10 space-y-1.5 my-2">
                    <div className="text-3xl drop-shadow-md">{book.coverIcon}</div>
                    <h3 className="text-base font-black leading-snug drop-shadow-sm line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-[11px] text-white/85 line-clamp-1">{book.subtitle}</p>
                  </div>

                  {/* Bottom details */}
                  <div className="relative z-10 flex items-center justify-between text-[10px] text-white/80 pt-2 border-t border-white/20">
                    <span className="truncate">{book.edition}</span>
                    <span className="font-semibold shrink-0">คลิกเพื่อเปิดอ่าน →</span>
                  </div>
                </div>

                {/* Book Meta Details */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate">โดย {book.author}</span>
                  {book.pdfUrl && (
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 shrink-0">
                      📄 มีไฟล์ PDF
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Fullscreen Interactive E-Book Flipbook Reader Modal */}
      {activeBook && (
        <div
          ref={readerContainerRef}
          className={`fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 ${
            isFullscreen ? 'p-0' : 'p-2 sm:p-5 md:p-6'
          }`}
        >
          <div
            className={`flex-1 flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 transition-all ${
              isFullscreen ? 'rounded-none border-none' : ''
            }`}
          >
            {/* Top Reader Toolbar */}
            <div className="px-3 sm:px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 text-white flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setActiveBook(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0"
                  title="ปิดหน้าต่างอ่าน"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="truncate">
                  <div className="text-xs sm:text-sm font-black truncate">{activeBook.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {activeBook.embedUrl
                      ? 'Google Drive Document Preview'
                      : viewMode === 'SINGLE'
                      ? `หน้า ${currentSpreadIndex + 1} จาก ${activeBook.pages.length} หน้า`
                      : `หน้า ${currentSpreadIndex + 1} - ${Math.min(
                          currentSpreadIndex + 2,
                          activeBook.pages.length
                        )} จาก ${activeBook.pages.length} หน้า`}
                  </div>
                </div>
              </div>

              {/* Reader Controls: View Mode, Zoom, Theme, Font, TOC, Fullscreen */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {!activeBook.embedUrl && (
                  <>
                    {/* Single / Dual Page View Toggle */}
                    <div className="flex items-center bg-slate-800 p-1 rounded-xl gap-0.5">
                      <button
                        type="button"
                        onClick={() => setViewMode('SINGLE')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          viewMode === 'SINGLE'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="โหมดอ่านทีละ 1 หน้า (ขยายเต็มตา เหมาะกับมือถือ)"
                      >
                        1 หน้า
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('DUAL');
                          setCurrentSpreadIndex((idx) => Math.floor(idx / 2) * 2);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          viewMode === 'DUAL'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="โหมดกางหนังสือ 2 หน้าคู่"
                      >
                        2 หน้าคู่
                      </button>
                    </div>

                    {/* Zoom Cycle Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setZoomLevel((z) => (z === 1 ? 1.25 : z === 1.25 ? 1.5 : 1))
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1"
                      title="ซูมเข้า / รีเซ็ตขนาดหน้ากระดาษ"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>{Math.round(zoomLevel * 100)}%</span>
                    </button>

                    {/* Paper Flip Sound Toggle */}
                    <button
                      type="button"
                      onClick={toggleSound}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        isSoundEnabled
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={isSoundEnabled ? 'ปิดเสียงพลิกกระดาษ' : 'เปิดเสียงพลิกกระดาษ'}
                    >
                      {isSoundEnabled ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <VolumeX className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}

                {/* Paper Theme Switcher */}
                <div className="flex items-center bg-slate-800 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setPaperTheme('WHITE')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      paperTheme === 'WHITE'
                        ? 'bg-white text-slate-950 shadow-2xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ขาว
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperTheme('SEPIA')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      paperTheme === 'SEPIA'
                        ? 'bg-[#fcf8ed] text-[#433422] shadow-2xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ถนอมสายตา
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperTheme('DARK')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      paperTheme === 'DARK'
                        ? 'bg-[#2c3032] text-white shadow-2xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    มืด
                  </button>
                </div>

                {/* Font Size Toggle (for text-based pages) */}
                {!activeBook.embedUrl && !leftPage?.imageUrl && (
                  <div className="hidden sm:flex items-center bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() =>
                        setFontSize(
                          fontSize === 'NORMAL'
                            ? 'LARGE'
                            : fontSize === 'LARGE'
                            ? 'XLARGE'
                            : 'NORMAL'
                        )
                      }
                      className="px-2 py-1 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
                      title="ปรับขนาดตัวอักษร"
                    >
                      A{fontSize === 'LARGE' ? '+' : fontSize === 'XLARGE' ? '++' : ''}
                    </button>
                  </div>
                )}

                {/* TOC Drawer Button */}
                {!activeBook.embedUrl && (
                  <button
                    type="button"
                    onClick={() => setShowToc(!showToc)}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      showToc ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title="สารบัญเนื้อหา"
                  >
                    <BookMarked className="w-4 h-4" />
                  </button>
                )}

                {/* PDF Original File Download/Open */}
                {activeBook.pdfUrl && (
                  <a
                    href={activeBook.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-800 text-teal-400 hover:text-teal-300 transition cursor-pointer inline-flex"
                    title="เปิดไฟล์ PDF ต้นฉบับ"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                  title={isFullscreen ? 'ย่อหน้าจอ' : 'ขยายเต็มจอ'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Main Book Display Area */}
            <div className="relative flex-1 overflow-hidden flex items-center justify-center p-2 sm:p-5 bg-slate-950">
              {/* Table of Contents Drawer Overlay */}
              {showToc && !activeBook.embedUrl && (
                <div className="absolute top-0 bottom-0 left-0 w-72 sm:w-80 bg-slate-900 border-r border-slate-800 z-30 p-4 space-y-3 overflow-y-auto animate-in slide-in-from-left duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <BookMarked className="w-4 h-4 text-indigo-400" />
                      <span>สารบัญคู่มือ</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowToc(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {activeBook.pages.map((p, idx) => {
                      const isActive =
                        viewMode === 'SINGLE'
                          ? idx === currentSpreadIndex
                          : idx === currentSpreadIndex || idx === currentSpreadIndex + 1;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const targetIdx =
                              viewMode === 'SINGLE' ? idx : Math.floor(idx / 2) * 2;
                            if (targetIdx !== currentSpreadIndex) {
                              turnToSpread(targetIdx);
                            }
                            setShowToc(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-between ${
                            isActive
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="text-[10px] opacity-70">หน้า {p.pageNumber}</div>
                            <div className="truncate">{p.title}</div>
                          </div>
                          <span className="text-[10px] opacity-60">→</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeBook.embedUrl ? (
                <div className="w-full max-w-5xl h-full flex flex-col">
                  <iframe
                    src={activeBook.embedUrl}
                    className="w-full flex-1 min-h-[70vh] rounded-2xl border border-slate-800 bg-white shadow-2xl"
                    allow="autoplay"
                    title={activeBook.title}
                  />
                </div>
              ) : (
                /* 3D Flipbook Stage with Page-Curl Leaf Physics, Spine Gutter & Touch Swipe */
                (() => {
                  const isFlipNext = flipTransition?.direction === 'next';
                  const isFlipPrev = flipTransition?.direction === 'prev';
                  const canGoPrev = currentSpreadIndex > 0;
                  const canGoNext = currentSpreadIndex + pageStep < activeBook.pages.length;

                  const baseLeftPage =
                    viewMode === 'DUAL'
                      ? isFlipNext && flipTransition
                        ? activeBook.pages[flipTransition.fromIndex]
                        : leftPage
                      : isFlipNext && flipTransition
                      ? activeBook.pages[flipTransition.toIndex]
                      : isFlipPrev && flipTransition
                      ? activeBook.pages[flipTransition.fromIndex]
                      : leftPage;

                  const baseRightPage =
                    isFlipPrev && flipTransition
                      ? activeBook.pages[flipTransition.fromIndex + 1]
                      : rightPage;

                  const dualFrontPage = flipTransition
                    ? isFlipNext
                      ? activeBook.pages[flipTransition.fromIndex + 1]
                      : activeBook.pages[flipTransition.fromIndex]
                    : null;

                  const dualBackPage = flipTransition
                    ? isFlipNext
                      ? activeBook.pages[flipTransition.toIndex]
                      : activeBook.pages[flipTransition.toIndex + 1]
                    : null;

                  const singlePeelPage = flipTransition
                    ? isFlipNext
                      ? activeBook.pages[flipTransition.fromIndex]
                      : activeBook.pages[flipTransition.toIndex]
                    : null;

                  return (
                    <div
                      onTouchStart={handleBookTouchStart}
                      onTouchEnd={handleBookTouchEnd}
                      className={`w-full h-full flex items-stretch justify-center relative select-none touch-pan-y ${
                        viewMode === 'SINGLE' ? 'max-w-3xl' : 'max-w-6xl'
                      }`}
                      style={{ perspective: '2400px' }}
                    >
                      <style>{`
                        @keyframes ebookFlipNextDual {
                          0% { transform: rotateY(0deg) skewY(0deg) translateZ(1px); }
                          25% { transform: rotateY(-42deg) skewY(-2.4deg) translateZ(3px); }
                          50% { transform: rotateY(-90deg) skewY(-2.8deg) translateZ(5px); }
                          75% { transform: rotateY(-138deg) skewY(-1.8deg) translateZ(3px); }
                          100% { transform: rotateY(-180deg) skewY(0deg) translateZ(1px); }
                        }
                        @keyframes ebookFlipPrevDual {
                          0% { transform: rotateY(0deg) skewY(0deg) translateZ(1px); }
                          25% { transform: rotateY(42deg) skewY(2.4deg) translateZ(3px); }
                          50% { transform: rotateY(90deg) skewY(2.8deg) translateZ(5px); }
                          75% { transform: rotateY(138deg) skewY(1.8deg) translateZ(3px); }
                          100% { transform: rotateY(180deg) skewY(0deg) translateZ(1px); }
                        }
                        @keyframes ebookFlipNextSingle {
                          0% { transform: rotateY(0deg) skewY(0deg) translateZ(2px); opacity: 1; }
                          35% { transform: rotateY(-56deg) skewY(-2.6deg) translateZ(5px); opacity: 1; }
                          72% { transform: rotateY(-118deg) skewY(-2deg) translateZ(3px); opacity: 0.92; }
                          100% { transform: rotateY(-165deg) skewY(0deg) translateZ(1px); opacity: 0; }
                        }
                        @keyframes ebookFlipPrevSingle {
                          0% { transform: rotateY(-165deg) skewY(-2deg) translateZ(2px); opacity: 0.15; }
                          22% { transform: rotateY(-116deg) skewY(-2.4deg) translateZ(4px); opacity: 1; }
                          60% { transform: rotateY(-48deg) skewY(-2deg) translateZ(5px); opacity: 1; }
                          100% { transform: rotateY(0deg) skewY(0deg) translateZ(1px); opacity: 1; }
                        }
                        @keyframes ebookUnderShadow {
                          0% { opacity: 0.55; }
                          50% { opacity: 0.28; }
                          100% { opacity: 0; }
                        }
                        @keyframes ebookCurlHighlightNext {
                          0% { opacity: 0.1; transform: translateX(45%); }
                          45% { opacity: 0.8; transform: translateX(0%); }
                          100% { opacity: 0.2; transform: translateX(-40%); }
                        }
                        @keyframes ebookCurlHighlightPrev {
                          0% { opacity: 0.1; transform: translateX(-45%); }
                          45% { opacity: 0.8; transform: translateX(0%); }
                          100% { opacity: 0.2; transform: translateX(40%); }
                        }
                      `}</style>

                      {/* Prev Navigation Arrow Button */}
                      <button
                        type="button"
                        disabled={!canGoPrev}
                        onClick={handlePrevPage}
                        className="absolute -left-1 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl transition disabled:opacity-20 disabled:pointer-events-none cursor-pointer border border-white/10"
                        title="หน้าก่อนหน้า (หรือกดลูกศรซ้ายบนคีย์บอร์ด)"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      {/* Physical Book Cover & Page Stack Stage (transform-style preserve-3d, no overflow-hidden here!) */}
                      <div
                        className="w-full h-full relative flex items-stretch rounded-2xl shadow-[0_25px_65px_-15px_rgba(0,0,0,0.75)] border border-slate-700/80"
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        {/* Stacked Paper Edges (ความหนากระดาษขอบเล่ม) */}
                        <div className="pointer-events-none hidden sm:block absolute -left-1.5 top-2 bottom-2 w-1.5 rounded-l-lg bg-gradient-to-r from-slate-400/50 via-slate-200/70 to-slate-300/60 dark:from-slate-700/60 dark:via-slate-600/50 dark:to-slate-700/70" />
                        <div className="pointer-events-none hidden sm:block absolute -right-1.5 top-2 bottom-2 w-1.5 rounded-r-lg bg-gradient-to-l from-slate-400/50 via-slate-200/70 to-slate-300/60 dark:from-slate-700/60 dark:via-slate-600/50 dark:to-slate-700/70" />

                        {viewMode === 'DUAL' ? (
                          <>
                            {/* Base Left Half */}
                            <div className="w-1/2 h-full relative rounded-l-2xl overflow-hidden border-r border-slate-300/40 dark:border-slate-800">
                              {renderPageSheetContent(baseLeftPage, 'left')}

                              {/* Cast shadow when Prev leaf lifts from left */}
                              {isFlipPrev && flipTransition && (
                                <div
                                  key={`under-left-${flipTransition.fromIndex}-${flipTransition.toIndex}`}
                                  className="absolute inset-0 pointer-events-none z-20"
                                  style={{
                                    background:
                                      'linear-gradient(to left, rgba(15,23,42,0.48), rgba(15,23,42,0.14) 45%, transparent)',
                                    animation: 'ebookUnderShadow 560ms ease-out forwards',
                                  }}
                                />
                              )}
                            </div>

                            {/* Base Right Half */}
                            <div className="w-1/2 h-full relative rounded-r-2xl overflow-hidden">
                              {renderPageSheetContent(baseRightPage, 'right')}

                              {/* Cast shadow when Next leaf lifts from right */}
                              {isFlipNext && flipTransition && (
                                <div
                                  key={`under-right-${flipTransition.fromIndex}-${flipTransition.toIndex}`}
                                  className="absolute inset-0 pointer-events-none z-20"
                                  style={{
                                    background:
                                      'linear-gradient(to right, rgba(15,23,42,0.5), rgba(15,23,42,0.15) 45%, transparent)',
                                    animation: 'ebookUnderShadow 560ms ease-out forwards',
                                  }}
                                />
                              )}
                            </div>

                            {/* Center Book Spine Crease (ร่องสันหนังสือตรงกลาง) */}
                            <div
                              className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-6 z-20"
                              style={{
                                background:
                                  'linear-gradient(to right, transparent, rgba(15,23,42,0.14) 38%, rgba(15,23,42,0.34) 50%, rgba(15,23,42,0.12) 62%, transparent)',
                              }}
                            />

                            {/* True 3D Flipping Paper Leaf (Dual Spread) */}
                            {flipTransition && (
                              <div
                                key={`dual-leaf-${flipTransition.direction}-${flipTransition.fromIndex}-${flipTransition.toIndex}`}
                                className="pointer-events-none absolute top-0 bottom-0 z-[25]"
                                style={{
                                  left: isFlipNext ? '50%' : '0%',
                                  width: '50%',
                                  transformOrigin: isFlipNext ? 'left center' : 'right center',
                                  transformStyle: 'preserve-3d',
                                  animation: `${
                                    isFlipNext ? 'ebookFlipNextDual' : 'ebookFlipPrevDual'
                                  } 560ms cubic-bezier(0.32, 0.08, 0.24, 1) forwards`,
                                }}
                              >
                                {/* Leaf Front Face (0deg..90deg) */}
                                <div
                                  className={`absolute inset-0 overflow-hidden shadow-2xl ${
                                    isFlipNext ? 'rounded-r-2xl' : 'rounded-l-2xl'
                                  }`}
                                  style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(0deg) translateZ(1px)',
                                  }}
                                >
                                  {renderPageSheetContent(
                                    dualFrontPage,
                                    isFlipNext ? 'right' : 'left',
                                    true
                                  )}
                                  {/* Cylindrical curl specular highlight & fold shadow */}
                                  <div
                                    className="absolute inset-0 pointer-events-none z-20"
                                    style={{
                                      background:
                                        'linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(255,255,255,0.36) 46%, rgba(0,0,0,0.22) 72%, transparent 100%)',
                                      animation: `${
                                        isFlipNext
                                          ? 'ebookCurlHighlightNext'
                                          : 'ebookCurlHighlightPrev'
                                      } 560ms ease-in-out forwards`,
                                    }}
                                  />
                                </div>

                                {/* Leaf Back Face (90deg..180deg) */}
                                <div
                                  className={`absolute inset-0 overflow-hidden shadow-2xl ${
                                    isFlipNext ? 'rounded-l-2xl' : 'rounded-r-2xl'
                                  }`}
                                  style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg) translateZ(1px)',
                                  }}
                                >
                                  {renderPageSheetContent(
                                    dualBackPage,
                                    isFlipNext ? 'left' : 'right',
                                    true
                                  )}
                                  <div
                                    className="absolute inset-0 pointer-events-none z-20"
                                    style={{
                                      background:
                                        'linear-gradient(90deg, rgba(0,0,0,0.18) 0%, rgba(255,255,255,0.28) 52%, transparent 100%)',
                                      animation: `${
                                        isFlipNext
                                          ? 'ebookCurlHighlightPrev'
                                          : 'ebookCurlHighlightNext'
                                      } 560ms ease-in-out forwards`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Base Single Sheet */}
                            <div className="w-full h-full relative rounded-2xl overflow-hidden">
                              {renderPageSheetContent(baseLeftPage, 'single')}

                              {flipTransition && (
                                <div
                                  key={`under-single-${flipTransition.fromIndex}-${flipTransition.toIndex}`}
                                  className="absolute inset-0 pointer-events-none z-20"
                                  style={{
                                    background:
                                      'linear-gradient(to right, rgba(15,23,42,0.52), rgba(15,23,42,0.16) 50%, transparent)',
                                    animation: 'ebookUnderShadow 560ms ease-out forwards',
                                  }}
                                />
                              )}
                            </div>

                            {/* True 3D Peeling Paper Sheet (Single / Mobile View) */}
                            {flipTransition && (
                              <div
                                key={`single-leaf-${flipTransition.direction}-${flipTransition.fromIndex}-${flipTransition.toIndex}`}
                                className="pointer-events-none absolute inset-0 z-[25]"
                                style={{
                                  transformOrigin: 'left center',
                                  transformStyle: 'preserve-3d',
                                  animation: `${
                                    isFlipNext ? 'ebookFlipNextSingle' : 'ebookFlipPrevSingle'
                                  } 560ms cubic-bezier(0.32, 0.08, 0.24, 1) forwards`,
                                }}
                              >
                                {/* Front Content Face */}
                                <div
                                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
                                  style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(0deg) translateZ(2px)',
                                  }}
                                >
                                  {renderPageSheetContent(singlePeelPage, 'single', true)}
                                  <div
                                    className="absolute inset-0 pointer-events-none z-20"
                                    style={{
                                      background:
                                        'linear-gradient(90deg, rgba(0,0,0,0.08) 0%, rgba(255,255,255,0.34) 48%, rgba(0,0,0,0.22) 76%, transparent 100%)',
                                      animation: `${
                                        isFlipNext
                                          ? 'ebookCurlHighlightNext'
                                          : 'ebookCurlHighlightPrev'
                                      } 560ms ease-in-out forwards`,
                                    }}
                                  />
                                </div>

                                {/* Textured Paper Reverse Side when page curls past 90deg */}
                                <div
                                  className={`absolute inset-0 rounded-2xl overflow-hidden shadow-2xl ${paperThemeClasses[paperTheme]}`}
                                  style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg) translateZ(2px)',
                                  }}
                                >
                                  <div
                                    className="w-full h-full opacity-80"
                                    style={{
                                      background:
                                        'linear-gradient(to left, rgba(15,23,42,0.18), transparent 28%, rgba(255,255,255,0.22) 65%, rgba(15,23,42,0.12))',
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Interactive Clickable Page-Edge & Dog-Ear Corner Curl Zones (when zoomed 100%) */}
                        {zoomLevel === 1 && !flipTransition && (
                          <>
                            {canGoPrev && (
                              <button
                                type="button"
                                onClick={handlePrevPage}
                                title="คลิกขอบกระดาษเพื่อเปิดหน้าก่อนหน้า"
                                className="group absolute left-0 top-0 bottom-0 w-10 sm:w-16 z-20 cursor-pointer focus:outline-none"
                              >
                                <span
                                  className="pointer-events-none absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 group-hover:w-11 group-hover:h-11 transition-all duration-200 rounded-tr-xl opacity-45 group-hover:opacity-95 shadow-lg"
                                  style={{
                                    background:
                                      'linear-gradient(45deg, rgba(148,163,184,0.35) 0%, rgba(226,232,240,0.85) 48%, rgba(15,23,42,0.22) 50%, transparent 52%)',
                                  }}
                                />
                              </button>
                            )}
                            {canGoNext && (
                              <button
                                type="button"
                                onClick={handleNextPage}
                                title="คลิกมุมหรือขอบกระดาษเพื่อเปิดหน้าถัดไป"
                                className="group absolute right-0 top-0 bottom-0 w-10 sm:w-16 z-20 cursor-pointer focus:outline-none"
                              >
                                <span
                                  className="pointer-events-none absolute bottom-0 right-0 w-7 h-7 sm:w-9 sm:h-9 group-hover:w-12 group-hover:h-12 transition-all duration-200 rounded-tl-xl opacity-60 group-hover:opacity-100 shadow-lg"
                                  style={{
                                    background:
                                      'linear-gradient(-45deg, rgba(148,163,184,0.35) 0%, rgba(241,245,249,0.92) 48%, rgba(15,23,42,0.25) 50%, transparent 52%)',
                                  }}
                                />
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Next Navigation Arrow Button */}
                      <button
                        type="button"
                        disabled={!canGoNext}
                        onClick={handleNextPage}
                        className="absolute -right-1 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl transition disabled:opacity-20 disabled:pointer-events-none cursor-pointer border border-white/10"
                        title="หน้าถัดไป (หรือกดลูกศรขวาบนคีย์บอร์ด)"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Bottom Scrubber & Progress Bar */}
            {!activeBook.embedUrl && (
              <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4 text-white">
                <div className="text-xs text-slate-400 font-mono shrink-0">
                  หน้า {currentSpreadIndex + 1} / {activeBook.pages.length}
                </div>

                {/* Progress Slider */}
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, activeBook.pages.length - pageStep)}
                  step={pageStep}
                  value={currentSpreadIndex}
                  onChange={(e) => {
                    const nextVal = Number(e.target.value);
                    if (nextVal !== currentSpreadIndex) {
                      turnToSpread(nextVal);
                    }
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />

                <div className="flex items-center gap-1 shrink-0 text-xs text-slate-400">
                  <span className="hidden sm:inline">กด</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono border border-slate-700">
                    ←
                  </kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono border border-slate-700">
                    →
                  </kbd>
                  <span className="hidden sm:inline">เพื่อพลิกหน้า</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Upload & E-Book Creator Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  +
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  อัปโหลดคู่มือห้องแล็บ / สร้าง E-Book ใหม่
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Segmented Switcher (3 Import Methods: Direct Auto Upload, Google Drive Link, Rich Text) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setUploadMode('AUTO_UPLOAD')}
                className={`py-2 px-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  uploadMode === 'AUTO_UPLOAD'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-teal-600" />
                <span>อัปโหลด PDF ตรง</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('DRIVE_LINK')}
                className={`py-2 px-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  uploadMode === 'DRIVE_LINK'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileUp className="w-3.5 h-3.5 text-indigo-600" />
                <span>ลิงก์ Google Drive</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('TEXT')}
                className={`py-2 px-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  uploadMode === 'TEXT'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>พิมพ์บทเรียนเอง</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewBook} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อคู่มือ / SOP *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คู่มือการใช้หุ่นจำลองการคลอดฉบับปฏิบัติการ"
                  value={newBookForm.title}
                  onChange={(e) => setNewBookForm({ ...newBookForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  คำอธิบายสั้นหรือบทนำ
                </label>
                <input
                  type="text"
                  placeholder="เช่น ขั้นตอนการเตรียมเครื่องและการเก็บรักษาหลังใช้"
                  value={newBookForm.subtitle}
                  onChange={(e) => setNewBookForm({ ...newBookForm, subtitle: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดหมู่คู่มือ
                  </label>
                  <select
                    value={newBookForm.category}
                    onChange={(e) =>
                      setNewBookForm({
                        ...newBookForm,
                        category: e.target.value as EBookItem['category'],
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="STUDENT_MANUAL">📘 คู่มือนิสิต & การใช้ห้อง</option>
                    <option value="LAB_SAFETY">🛡️ ระเบียบความปลอดภัย</option>
                    <option value="EQUIPMENT_SOP">⚡ คู่มือครุภัณฑ์ & SOP</option>
                    <option value="STAFF_TEACHER">👩‍🏫 คู่มืออาจารย์ & จนท.</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ไอคอนหน้าปก
                  </label>
                  <div className="flex items-center gap-1.5">
                    {['📘', '🏥', '🛡️', '⚡', '🩺', '📦', '📑'].map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setNewBookForm({ ...newBookForm, coverIcon: ic })}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-base border transition cursor-pointer ${
                          newBookForm.coverIcon === ic
                            ? 'bg-indigo-600 text-white border-indigo-600 scale-105'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Content Input according to Import Mode */}
              {uploadMode === 'AUTO_UPLOAD' ? (
                <div className="space-y-3 p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/50 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-300 flex items-center justify-center mx-auto shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 dark:text-white text-xs">
                      ลากไฟล์ PDF มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      ระบบจะจัดเก็บไฟล์ลงคลังคู่มือและเปิดอ่านเป็น E-Book กาง 2 หน้าคู่อัตโนมัติ (สูงสุด 50MB)
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setSelectedFile(f);
                      if (f && !newBookForm.title) {
                        const nameWithoutExt = f.name.replace(/\.pdf$/i, '');
                        setNewBookForm((prev) => ({ ...prev, title: nameWithoutExt }));
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
                  />

                  {selectedFile && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300 flex items-center justify-between">
                      <span className="font-bold truncate">📄 {selectedFile.name}</span>
                      <span className="font-mono text-[10px]">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}

                  {isUploadingFile && (
                    <div className="text-xs font-bold text-teal-600 animate-pulse">
                      {uploadProgress || 'กำลังอัปโหลด...'}
                    </div>
                  )}
                </div>
              ) : uploadMode === 'DRIVE_LINK' ? (
                <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                      <FileUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 dark:text-white text-xs">
                        วางลิงก์ Google Drive ของเอกสารคู่มือ
                      </div>
                      <p className="text-[10px] text-slate-500">
                        เช่น https://drive.google.com/file/d/... หรือลิงก์ที่แชร์จากไดรฟ์ของคณะ
                      </p>
                    </div>
                  </div>

                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={newBookForm.driveUrl}
                    onChange={(e) =>
                      setNewBookForm({ ...newBookForm, driveUrl: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />

                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-indigo-100 dark:border-indigo-950 text-[10px] text-indigo-900 dark:text-indigo-300 space-y-1">
                    <div className="font-bold">💡 คำแนะนำการตั้งค่าใน Google Drive:</div>
                    <p>
                      ให้ตั้งค่าแชร์ไฟล์เป็น <strong>"ทุกคนที่มีลิงก์ (Anyone with the link) มีสิทธิ์ดู"</strong> เพื่อให้นิสิตและอาจารย์สามารถเปิดอ่านได้ทันที
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    พิมพ์เนื้อหารายหน้า (เว้น 2 บรรทัดเพื่อขึ้นหน้าใหม่)
                  </label>
                  <textarea
                    rows={5}
                    placeholder="พิมพ์เนื้อหาของหน้าแรก...&#10;&#10;พิมพ์เนื้อหาของหน้าที่สอง..."
                    value={newBookForm.pageContentText}
                    onChange={(e) =>
                      setNewBookForm({ ...newBookForm, pageContentText: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUploadingFile}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer transition flex items-center gap-1.5"
                >
                  <span>{isUploadingFile ? 'กำลังบันทึก...' : 'สร้างหนังสือและเปิดอ่านทันที'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. QR Code Viewer Modal for Printing */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                📱 QR Code ประจำคู่มือ
              </span>
              <button
                type="button"
                onClick={() => setShowQrModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/admin/sandbox/ebooks?id=${showQrModal.id}`
                    : ''
                )}`}
                alt="QR Code"
                className="w-44 h-44 object-contain"
              />
              <span className="text-[10px] text-slate-400 mt-2 font-mono">
                {showQrModal.id}
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                {showQrModal.title}
              </h4>
              <p className="text-[10px] text-slate-500">
                พิมพ์เพื่อนำไปติดที่หน้าห้องปฏิบัติการหรือข้างเครื่องมือ ให้นิสิตสแกนเปิดอ่านทันที
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold transition hover:bg-indigo-600 cursor-pointer"
            >
              พิมพ์ป้าย QR Code นี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
