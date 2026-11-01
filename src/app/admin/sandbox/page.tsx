'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Sparkles,
  Bot,
  ShoppingCart,
  ShieldCheck,
  ArrowRight,
  Boxes,
  Zap,
  FlaskConical,
  HelpCircle,
  Eye,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AdminSandboxHubPage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isOfficer && !isAdmin) {
      router.replace('/');
    }
  }, [isLoading, isOfficer, isAdmin, router]);

  if (isLoading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดศูนย์ทดลองนวัตกรรม..."
        submessage="ตรวจสอบสิทธิ์ผู้ดูแลระบบและเจ้าหน้าที่"
      />
    );
  }

  if (!currentUser || (!isOfficer && !isAdmin)) {
    return null;
  }

  const experiments = [
    {
      id: 'visual-catalog',
      title: 'แคตตาล็อกเบิก-ยืมพัสดุแบบภาพ & ชุดเซ็ต 1-Click',
      titleEn: 'Visual Borrow Catalog & 1-Click Practice Bundles',
      description:
        'ปรับโฉมการเบิกวัสดุและยืมครุภัณฑ์จากตารางตัวหนังสือธรรมดา ให้กลายเป็นแกลเลอรีรูปภาพพร้อมสต็อกเรียลไทม์ เลือกระบุหน่วยย่อย/กล่อง และเพิ่มชุดฝึกปฏิบัติ (Practice Kit) ลงตะกร้าได้ใน 1 วินาที',
      href: '/admin/sandbox/catalog',
      icon: ShoppingCart,
      color: 'teal',
      badge: 'พร้อมทดสอบ (Beta)',
      badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      gradient: 'from-teal-500/10 via-emerald-500/5 to-transparent',
      borderColor: 'hover:border-teal-500/50',
      features: [
        'การ์ดพัสดุพร้อมรูปถ่ายจริง และตำแหน่งตู้จัดเก็บ',
        'แสดงสต็อกแยกกล่องเต็ม และเศษชิ้นที่เปิดใช้แล้ว (Open Pack)',
        'สลับหน่วยเบิกเป็น "ชิ้น/กล่อง" ได้อย่างอิสระ',
        'เพิ่มชุดฝึกทักษะหัตถการลงตะกร้าพร้อมกันทุกชิ้นใน 1 วินาที',
        'จำลองตะกร้าแบบนิสิต หรืออาจารย์ผู้สอนได้ทันที',
      ],
      readyForReview: true,
    },
    {
      id: 'ai-copilot',
      title: 'ระบบแชทบอทอัจฉริยะ AI Copilot',
      titleEn: 'KUNurse+ Lab Brain Sandbox',
      description:
        'พื้นที่ทดลองสนทนากับปัญญาประดิษฐ์ผู้ช่วยห้องแล็บพยาบาล ทดสอบการคิดวิเคราะห์ คำนวณวันส่งคืน แนะนำระเบียบแล็บ และจำลองการประมวลผลก่อนเปิดให้บุคคลทั่วไปใช้งาน',
      href: '/admin/chatbot',
      icon: Bot,
      color: 'cyan',
      badge: 'ทดสอบภายใน (Alpha)',
      badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      gradient: 'from-cyan-500/10 via-blue-500/5 to-transparent',
      borderColor: 'hover:border-cyan-500/50',
      features: [
        'ตอบคำถามระเบียบและโควตาการยืม-คืนพัสดุ',
        'คำนวณวันกำหนดส่งคืนตรงตามปฏิทินภาคการศึกษา',
        'แนะนำครุภัณฑ์ทดแทนเมื่อสต็อกไม่เพียงพอ',
        'คัดแยกสิทธิ์คำตอบอัตโนมัติตามบทบาท (Role-Aware Context)',
      ],
      readyForReview: true,
    },
  ];

  const upcomingPrototypes = [
    {
      title: 'ระบบสแกนบาร์โค้ดความเร็วสูง V2 (High-Speed QR Scanner)',
      description: 'โหมดตรวจรับพัสดุและคืนของต่อเนื่องแบบออฟไลน์ผ่านกล้องสมาร์ตโฟน',
      tag: 'กำลังออกแบบ',
    },
    {
      title: 'ตู้ล็อกเกอร์คืนพัสดุอัตโนมัติ (Smart Return Lockers)',
      description: 'ระบบยืนยันการคืนของนอกเวลาทำการด้วยรหัส OTP และเซนเซอร์ชั่งน้ำหนัก',
      tag: 'แนวคิดวิจัย',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 dark:from-slate-900 dark:via-teal-950/40 dark:to-slate-900 p-6 sm:p-8 border border-teal-200/80 dark:border-teal-900/60 shadow-lg shadow-teal-900/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับศูนย์ปฏิบัติการ</span>
              </Link>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-100/90 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                Innovation Sandbox Hub
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>ศูนย์ทดลองนวัตกรรม & พื้นที่ทดสอบ</span>
              <span className="text-sm font-semibold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Admin Sandbox
              </span>
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              พื้นที่ทดสอบฟีเจอร์ใหม่และนวัตกรรมการใช้งานเฉพาะเจ้าหน้าที่และผู้ดูแลระบบ เพื่อให้ท่านได้ทดลองใช้งาน
              ปรับแต่งประสบการณ์ และตรวจสอบความถูกต้องก่อนที่จะนำขึ้นสู่ระบบจริงสำหรับนิสิตและอาจารย์
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>โหมดปลอดภัย: ข้อมูลจำลองไม่กระทบคลังจริง</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Notice Box */}
      <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
          <FlaskConical className="w-4 h-4" />
        </div>
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold text-sm">วัตถุประสงค์ของพื้นที่ Sandbox</p>
          <p className="leading-relaxed text-amber-800 dark:text-amber-300/90">
            ระบบในส่วนนี้ถูกแยกออกมาเพื่อให้เจ้าหน้าที่สามารถทดสอบฟีเจอร์ที่อยู่ในช่วงพัฒนา (เช่น แคตตาล็อกภาพและการ์ดเบิกพัสดุ หรือระบบ AI Chatbot) 
            ผู้ใช้งานทั่วไปจะไม่เห็นเมนูเหล่านี้จนกว่าจะผ่านการทดสอบและอนุมัติให้เปิดใช้งานในระบบจริง
          </p>
        </div>
      </div>

      {/* 3. Main Experiments Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>🚀 ฟีเจอร์ที่เปิดให้ทดลองใช้งานขณะนี้</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              {experiments.length} โครงการ
            </span>
          </h2>
          <span className="text-xs text-slate-400">คลิกเข้าสู่หน้าทดลองเพื่อทดสอบระบบ</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {experiments.map((exp) => {
            const Icon = exp.icon;
            return (
              <div
                key={exp.id}
                className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${exp.borderColor} shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between`}
              >
                {/* Ambient background glow */}
                <div className={`absolute top-0 right-0 w-72 h-72 bg-gradient-to-br ${exp.gradient} rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500`} />

                <div className="p-6 sm:p-7 relative z-10 space-y-4">
                  {/* Top bar: Icon & Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs border border-teal-200/60 dark:border-teal-800/60">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${exp.badgeColor}`}>
                      {exp.badge}
                    </span>
                  </div>

                  {/* Titles */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                      {exp.title}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
                      {exp.titleEn}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {exp.description}
                  </p>

                  {/* Highlights */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      จุดเด่นและสิ่งที่ทดสอบได้:
                    </p>
                    <ul className="space-y-1.5">
                      {exp.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 sm:p-7 pt-0 relative z-10">
                  <Link
                    href={exp.href}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-teal-600 text-white font-bold text-sm shadow-md hover:shadow-teal-500/25 transition-all group-hover:gap-3"
                  >
                    <span>เปิดห้องทดลอง (Launch Playground)</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Upcoming Prototypes & Roadmap */}
      <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              แผนงานนวัตกรรมขั้นถัดไป (Upcoming Prototypes)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">เตรียมพัฒนาเข้าสู่ Sandbox</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {upcomingPrototypes.map((proto, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {proto.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {proto.description}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                {proto.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
