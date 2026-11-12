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
  pages: EBookPage[];
  isCustomUploaded?: boolean;
  uploadedAt?: string;
  lastReadPage?: number;
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

  const [eBooks, setEBooks] = useState<EBookItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kunurse_sandbox_ebooks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_EBOOKS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Active Reading State
  const [activeBook, setActiveBook] = useState<EBookItem | null>(null);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0); // 0 = page 1 (+2 on dual view)
  const [paperTheme, setPaperTheme] = useState<'WHITE' | 'SEPIA' | 'DARK'>('WHITE');
  const [fontSize, setFontSize] = useState<'NORMAL' | 'LARGE' | 'XLARGE'>('NORMAL');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showQrModal, setShowQrModal] = useState<EBookItem | null>(null);

  // New E-Book Creator Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'PDF' | 'IMAGE' | 'TEXT'>('PDF');
  const [newBookForm, setNewBookForm] = useState({
    title: '',
    subtitle: '',
    category: 'STUDENT_MANUAL' as EBookItem['category'],
    author: 'งานห้องปฏิบัติการพยาบาล มก.',
    edition: 'ฉบับปีการศึกษา 2569',
    coverIcon: '📘',
    coverGradient: 'from-teal-600 to-blue-700',
    pdfUrl: '',
    pageContentText: '',
  });

  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kunurse_sandbox_ebooks', JSON.stringify(eBooks));
      } catch (e) {}
    }
  }, [eBooks]);

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
  }, [activeBook, currentSpreadIndex, isFullscreen]);

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

  // Open Book Handler
  const handleOpenBook = (book: EBookItem) => {
    setActiveBook(book);
    const startPage = book.lastReadPage && book.lastReadPage > 0 ? book.lastReadPage - 1 : 0;
    setCurrentSpreadIndex(Math.floor(startPage / 2) * 2);
    setShowToc(false);
  };

  const handleNextPage = () => {
    if (!activeBook) return;
    const nextIdx = currentSpreadIndex + 2;
    if (nextIdx < activeBook.pages.length) {
      setCurrentSpreadIndex(nextIdx);
      updateLastRead(activeBook.id, nextIdx + 1);
    }
  };

  const handlePrevPage = () => {
    if (!activeBook) return;
    const prevIdx = currentSpreadIndex - 2;
    if (prevIdx >= 0) {
      setCurrentSpreadIndex(prevIdx);
      updateLastRead(activeBook.id, prevIdx + 1);
    }
  };

  const updateLastRead = (bookId: string, pageNum: number) => {
    setEBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, lastReadPage: pageNum } : b))
    );
  };

  const handleCreateNewBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookForm.title.trim()) {
      alert('กรุณากรอกชื่อคู่มือ');
      return;
    }

    // Generate basic pages from text or defaults
    let generatedPages: EBookPage[] = [];

    if (uploadMode === 'PDF') {
      const targetPdf = newBookForm.pdfUrl || '/manuals/student_user_manual.pdf';
      generatedPages = [
        {
          pageNumber: 1,
          chapterTitle: 'เอกสารคู่มือฉบับเต็ม (PDF Document)',
          title: newBookForm.title,
          content:
            newBookForm.subtitle ||
            'เอกสารคู่มือการปฏิบัติงานฉบับดิจิทัล เปิดอ่านและดาวน์โหลดไฟล์ฉบับเต็มได้ทันที',
          bulletPoints: [
            'สามารถเลื่อนอ่านแบบหน้าเดี่ยวหรือซูมดูรายละเอียดภาพและตารางได้',
            'คลิกปุ่มดาวน์โหลดด้านล่างเพื่อบันทึกไฟล์เก็บไว้อ่านแบบออฟไลน์',
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
      pdfUrl: uploadMode === 'PDF' ? newBookForm.pdfUrl || '/manuals/student_user_manual.pdf' : undefined,
      pages: generatedPages,
      isCustomUploaded: true,
      uploadedAt: new Date().toLocaleDateString('th-TH'),
    };

    setEBooks((prev) => [newBook, ...prev]);
    setShowUploadModal(false);
    setNewBookForm({
      title: '',
      subtitle: '',
      category: 'STUDENT_MANUAL',
      author: 'งานห้องปฏิบัติการพยาบาล มก.',
      edition: 'ฉบับปีการศึกษา 2569',
      coverIcon: '📘',
      coverGradient: 'from-teal-600 to-blue-700',
      pdfUrl: '',
      pageContentText: '',
    });
    handleOpenBook(newBook);
  };

  const handleDeleteBook = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('คุณต้องการลบหนังสือคู่มือเล่มนี้ออกจากชั้นหนังสือใช่หรือไม่?')) {
      setEBooks((prev) => prev.filter((b) => b.id !== bookId));
      if (activeBook?.id === bookId) setActiveBook(null);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('ต้องการรีเซ็ตชั้นหนังสือกลับสู่คู่มือมาตรฐานเริ่มต้นใช่หรือไม่?')) {
      setEBooks(DEFAULT_EBOOKS);
      localStorage.removeItem('kunurse_sandbox_ebooks');
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

  // Get current 2 pages in spread
  const leftPage = activeBook ? activeBook.pages[currentSpreadIndex] : null;
  const rightPage = activeBook ? activeBook.pages[currentSpreadIndex + 1] : null;

  const paperThemeClasses = {
    WHITE: 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800',
    SEPIA: 'bg-[#fcf8ed] text-[#433422] border-[#ecdcc3]',
    DARK: 'bg-[#181a1b] text-[#e8e6e3] border-[#2c3032]',
  };

  const fontSizeClasses = {
    NORMAL: 'text-xs sm:text-sm leading-relaxed',
    LARGE: 'text-sm sm:text-base leading-relaxed',
    XLARGE: 'text-base sm:text-lg leading-loose',
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
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveBook(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="ปิดหน้าต่างอ่าน"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="truncate">
                  <div className="text-xs sm:text-sm font-black truncate">{activeBook.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    หน้า {currentSpreadIndex + 1} - {Math.min(currentSpreadIndex + 2, activeBook.pages.length)} จาก {activeBook.pages.length} หน้า
                  </div>
                </div>
              </div>

              {/* Reader Controls: Theme, Font, TOC, Fullscreen */}
              <div className="flex items-center gap-1.5 shrink-0">
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

                {/* Font Size Toggle */}
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

                {/* TOC Drawer Button */}
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

                {/* PDF Original File Download/Open */}
                {activeBook.pdfUrl && (
                  <a
                    href={activeBook.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-800 text-teal-400 hover:text-teal-300 transition cursor-pointer hidden md:inline-flex"
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

            {/* Main Dual-Page Book Display Area */}
            <div className="relative flex-1 overflow-hidden flex items-center justify-center p-3 sm:p-6 bg-slate-950">
              {/* Table of Contents Drawer Overlay */}
              {showToc && (
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
                    {activeBook.pages.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentSpreadIndex(Math.floor(idx / 2) * 2);
                          setShowToc(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-between ${
                          idx === currentSpreadIndex || idx === currentSpreadIndex + 1
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
                    ))}
                  </div>
                </div>
              )}

              {/* Book Spine Shadow and Realistic Gutter Effect */}
              <div className="w-full max-w-5xl h-full flex items-stretch justify-center relative perspective-[1200px]">
                {/* Prev Navigation Arrow Button */}
                <button
                  type="button"
                  disabled={currentSpreadIndex <= 0}
                  onClick={handlePrevPage}
                  className="absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl transition disabled:opacity-20 disabled:pointer-events-none cursor-pointer border border-white/10"
                  title="หน้าก่อนหน้า (หรือกดลูกศรซ้ายบนคีย์บอร์ด)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Dual-Page Spread Container */}
                <div className="w-full h-full flex flex-col md:flex-row items-stretch rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80">
                  {/* Left Page */}
                  <div
                    className={`flex-1 p-5 sm:p-7 md:p-8 flex flex-col justify-between overflow-y-auto relative border-b md:border-b-0 md:border-r border-slate-300/40 dark:border-slate-800 ${paperThemeClasses[paperTheme]}`}
                  >
                    {leftPage ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 pb-2 border-b border-current/10">
                          <span>{leftPage.chapterTitle || activeBook.title}</span>
                          <span className="font-mono">{leftPage.pageNumber}</span>
                        </div>
                        <h2 className="text-base sm:text-xl font-black leading-snug">
                          {leftPage.title}
                        </h2>
                        <p className={`${fontSizeClasses[fontSize]} whitespace-pre-line leading-relaxed`}>
                          {leftPage.content}
                        </p>
                        {leftPage.bulletPoints && leftPage.bulletPoints.length > 0 && (
                          <ul className="space-y-2 pt-2">
                            {leftPage.bulletPoints.map((bp, bIdx) => (
                              <li key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <span>{bp}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {leftPage.callout && (
                          <div
                            className={`p-3.5 rounded-2xl border text-xs sm:text-sm space-y-1 ${
                              leftPage.callout.type === 'warning'
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                                : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900 text-teal-900 dark:text-teal-200'
                            }`}
                          >
                            <div className="font-bold flex items-center gap-1.5">
                              {leftPage.callout.type === 'warning' ? (
                                <ShieldAlert className="w-4 h-4 text-rose-600" />
                              ) : (
                                <Info className="w-4 h-4 text-teal-600" />
                              )}
                              <span>ข้อควรระวัง / คำแนะนำ</span>
                            </div>
                            <p>{leftPage.callout.text}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                        ปกหน้าด้านใน
                      </div>
                    )}
                    <div className="text-[10px] text-center opacity-60 font-mono pt-3">
                      - {leftPage?.pageNumber || 1} -
                    </div>
                  </div>

                  {/* Central Spine Shadow (สันหนังสือตรงกลาง) */}
                  <div className="hidden md:block w-3 bg-gradient-to-r from-black/25 via-black/10 to-transparent shrink-0 pointer-events-none" />

                  {/* Right Page */}
                  <div
                    className={`flex-1 p-5 sm:p-7 md:p-8 flex flex-col justify-between overflow-y-auto relative ${paperThemeClasses[paperTheme]}`}
                  >
                    {rightPage ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 pb-2 border-b border-current/10">
                          <span>{rightPage.chapterTitle || activeBook.title}</span>
                          <span className="font-mono">{rightPage.pageNumber}</span>
                        </div>
                        <h2 className="text-base sm:text-xl font-black leading-snug">
                          {rightPage.title}
                        </h2>
                        <p className={`${fontSizeClasses[fontSize]} whitespace-pre-line leading-relaxed`}>
                          {rightPage.content}
                        </p>
                        {rightPage.bulletPoints && rightPage.bulletPoints.length > 0 && (
                          <ul className="space-y-2 pt-2">
                            {rightPage.bulletPoints.map((bp, bIdx) => (
                              <li key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <span>{bp}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {rightPage.callout && (
                          <div
                            className={`p-3.5 rounded-2xl border text-xs sm:text-sm space-y-1 ${
                              rightPage.callout.type === 'warning'
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                                : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900 text-teal-900 dark:text-teal-200'
                            }`}
                          >
                            <div className="font-bold flex items-center gap-1.5">
                              {rightPage.callout.type === 'warning' ? (
                                <ShieldAlert className="w-4 h-4 text-rose-600" />
                              ) : (
                                <Info className="w-4 h-4 text-teal-600" />
                              )}
                              <span>ข้อควรระวัง / คำแนะนำ</span>
                            </div>
                            <p>{rightPage.callout.text}</p>
                          </div>
                        )}
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
                    <div className="text-[10px] text-center opacity-60 font-mono pt-3">
                      {rightPage ? `- ${rightPage.pageNumber} -` : ''}
                    </div>
                  </div>
                </div>

                {/* Next Navigation Arrow Button */}
                <button
                  type="button"
                  disabled={currentSpreadIndex + 2 >= activeBook.pages.length}
                  onClick={handleNextPage}
                  className="absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl transition disabled:opacity-20 disabled:pointer-events-none cursor-pointer border border-white/10"
                  title="หน้าถัดไป (หรือกดลูกศรขวาบนคีย์บอร์ด)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Bottom Scrubber & Progress Bar */}
            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4 text-white">
              <div className="text-xs text-slate-400 font-mono shrink-0">
                หน้า {currentSpreadIndex + 1} / {activeBook.pages.length}
              </div>

              {/* Progress Slider */}
              <input
                type="range"
                min={0}
                max={Math.max(0, activeBook.pages.length - 2)}
                step={2}
                value={currentSpreadIndex}
                onChange={(e) => setCurrentSpreadIndex(Number(e.target.value))}
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

            {/* Mode Segmented Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setUploadMode('PDF')}
                className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  uploadMode === 'PDF'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileUp className="w-4 h-4" />
                <span>ไฟล์ PDF คู่มือ</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('TEXT')}
                className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  uploadMode === 'TEXT'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>พิมพ์บทเรียนรายหน้า</span>
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

              {uploadMode === 'PDF' ? (
                <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                  <FileUp className="w-8 h-8 text-indigo-500 mx-auto" />
                  <div className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                    ลิงก์ไฟล์ PDF หรือเลือกเอกสารตัวอย่าง
                  </div>
                  <input
                    type="text"
                    placeholder="วาง URL ไฟล์ PDF (เช่น /manuals/nursing_lab_complete_manual.pdf)"
                    value={newBookForm.pdfUrl}
                    onChange={(e) => setNewBookForm({ ...newBookForm, pdfUrl: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <div className="flex flex-wrap gap-1 justify-center pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setNewBookForm({
                          ...newBookForm,
                          pdfUrl: '/manuals/nursing_lab_complete_manual.pdf',
                        })
                      }
                      className="px-2 py-1 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                    >
                      + ใช้ไฟล์คู่มือฉบับสมบูรณ์ (PDF ในระบบ)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewBookForm({
                          ...newBookForm,
                          pdfUrl: '/manuals/student_user_manual.pdf',
                        })
                      }
                      className="px-2 py-1 rounded text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 cursor-pointer"
                    >
                      + ใช้ไฟล์คู่มือนิสิต (PDF ในระบบ)
                    </button>
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
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  สร้างหนังสือและเปิดอ่านทันที
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
