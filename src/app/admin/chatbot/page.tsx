'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Bot,
  Send,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Cpu,
  Database,
  Lock,
  ExternalLink,
  Calendar,
  Clock,
  User,
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  ChatSessionState,
  ConfirmationSummaryCard,
  QuickReplyOption,
} from '@/types/chatbot';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  confirmationSummary?: ConfirmationSummaryCard;
  executionResult?: {
    success: boolean;
    referenceCode?: string;
    viewUrl?: string;
  };
}

export default function AdminChatbotSandboxPage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [quickReplies, setQuickReplies] = useState<QuickReplyOption[]>([]);
  const [sessionState, setSessionState] = useState<ChatSessionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isOfficer && !isAdmin) {
      router.replace('/');
    }
  }, [authLoading, isOfficer, isAdmin, router]);

  useEffect(() => {
    if (currentUser && (isOfficer || isAdmin)) {
      fetchGreeting();
    }
  }, [currentUser, isOfficer, isAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchGreeting = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/chatbot?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages([
          {
            id: 'welcome',
            sender: 'bot',
            text: `🛠️ **[Admin & Officer Sandbox Mode]**\n${data.greeting}\n\n*(หน้านี้คือพื้นที่ทดสอบการสนทนาเฉพาะผู้ดูแลระบบและเจ้าหน้าที่เท่านั้น ไม่มีการแสดงผลให้ผู้ใช้อื่นเห็นครับ)*`,
            timestamp: new Date(),
          },
        ]);
        if (data.quickReplies) {
          setQuickReplies(data.quickReplies);
        }
      }
    } catch (err) {
      console.error('Failed to load initial sandbox greeting:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading || !currentUser) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionState,
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: currentUser.name,
          userRole: currentUser.role,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: data.replyText,
          timestamp: new Date(),
          confirmationSummary: data.confirmationSummary,
          executionResult: data.executionResult,
        };

        setMessages((prev) => [...prev, botMsg]);
        setSessionState(data.sessionState);
        if (data.quickReplies) {
          setQuickReplies(data.quickReplies);
        }
      } else {
        const errData = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'bot',
            text: `⚠️ เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${errData.error || 'ไม่สามารถประมวลผลได้'}`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งครับ',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !currentUser || (!isOfficer && !isAdmin)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-teal-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-850 dark:to-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับสู่ Admin Hub</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Lock className="w-3 h-3" />
              <span>โหมดทดสอบเฉพาะผู้ดูแลระบบ (Sandbox)</span>
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>ห้องทดสอบระบบ AI Copilot</span>
            <Sparkles className="w-5 h-5 text-teal-500" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            พื้นที่ทดสอบการคิดวิเคราะห์ ถาม-ตอบ และทำธุรกรรมของ Gemini AI ก่อนพิจารณาเปิดใช้งานแก่ผู้ใช้ภายนอก
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSendMessage('เริ่มใหม่')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>เริ่มบทสนทนาใหม่</span>
          </button>
        </div>
      </div>

      {/* 2. Chat Playground Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col h-[650px] overflow-hidden">
        {/* Chat Header Status */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                KUNurse+ Lab AI Brain (Gemini 3.5 Flash)
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Sandbox • RBAC Guardrails Enabled</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="hidden sm:inline">ผู้ทดสอบ: <strong>{currentUser.name}</strong> ({currentUser.role})</span>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white rounded-br-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700 rounded-bl-xs'
                }`}
              >
                {msg.text}

                {/* การ์ดสรุปสำหรับให้ยืนยัน (Confirmation Card) */}
                {msg.confirmationSummary && (
                  <div className="mt-3 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-slate-800 dark:text-slate-200 space-y-2">
                    <div className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>{msg.confirmationSummary.title}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      {msg.confirmationSummary.details.map((d, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-slate-500 dark:text-slate-400">{d.label}:</span>
                          <span>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ผลการทำรายการจริง (Execution Result) */}
                {msg.executionResult && msg.executionResult.success && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>บันทึกลงระบบจริงแล้ว: {msg.executionResult.referenceCode}</span>
                    </span>
                    {msg.executionResult.viewUrl && (
                      <Link
                        href={msg.executionResult.viewUrl}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 underline"
                      >
                        <span>เปิดดู</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 px-1">
                {new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]"></span>
              <span>AI กำลังคิดวิเคราะห์ข้อมูล...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        {quickReplies.length > 0 && (
          <div className="p-2 sm:px-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">คำถามแนะนำ:</span>
            {quickReplies.map((qr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qr.textToSend)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shrink-0 cursor-pointer"
              >
                {qr.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="พิมพ์คำถาม หรือสั่งงานทดสอบระบบ..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-none focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 sm:px-5 sm:py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white font-bold text-xs sm:text-sm disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>ส่ง</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
