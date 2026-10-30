'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  BookOpen,
  MapPin,
  ExternalLink,
} from 'lucide-react';
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

export default function LabCopilotWidget() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReplyOption[]>([]);
  const [sessionState, setSessionState] = useState<ChatSessionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // เลื่อนจอลงล่างสุดอัตโนมัติเมื่อมีข้อความใหม่
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // รับ Event จากภายนอกเพื่อเปิดหน้าต่างแชท (เช่น จากปุ่มบน Navbar)
  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener('open-lab-copilot', handleOpenEvent);
    return () => window.removeEventListener('open-lab-copilot', handleOpenEvent);
  }, []);

  // โหลดข้อความทักทายเริ่มต้นเมื่อเปิดครั้งแรก
  useEffect(() => {
    if (currentUser && messages.length === 0) {
      fetchInitialGreeting();
    }
  }, [currentUser]);

  // ตั้งค่า Speech Recognition (รองรับภาษาไทย th-TH)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('เบราว์เซอร์ของท่านไม่รองรับการสั่งงานด้วยเสียง');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const fetchInitialGreeting = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/chatbot?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages([
          {
            id: 'welcome',
            sender: 'bot',
            text: data.greeting,
            timestamp: new Date(),
          },
        ]);
        if (data.quickReplies) {
          setQuickReplies(data.quickReplies);
        }
      }
    } catch (err) {
      console.error('Failed to load greeting:', err);
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
            text: `⚠️ เกิดข้อผิดพลาด: ${errData.error || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}`,
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
          text: '⚠️ ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตครับ',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = () => {
    handleSendMessage('เริ่มใหม่');
  };

  if (!currentUser) return null;

  return (
    <>
      {/* 1. ปุ่มลอยมุมขวาล่าง (Floating Action Button) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow-xl shadow-teal-700/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group border border-white/20"
          title="เปิดผู้ช่วยอัจฉริยะ KUNurse+ Lab AI Copilot"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full"></span>
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold leading-tight flex items-center gap-1">
              AI ผู้ช่วยแล็บ <Sparkles className="w-3 h-3 text-amber-300" />
            </span>
            <span className="text-[10px] text-teal-100 font-medium">พิมพ์คุยหรือสั่งงานได้</span>
          </div>
        </button>
      )}

      {/* 2. หน้าต่างแชท (Chat Window) */}
      {isOpen && (
        <div className="fixed bottom-16 md:bottom-6 right-2 sm:right-6 z-50 w-[95vw] sm:w-[420px] max-w-[440px] h-[82vh] max-h-[640px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  KUNurse+ Lab AI Copilot
                  <span className="text-[10px] bg-teal-500/40 text-teal-100 px-1.5 py-0.5 rounded-full font-medium">
                    {currentUser.role === 'ADMIN' ? 'แอดมิน' : currentUser.role === 'OFFICER' ? 'เจ้าหน้าที่' : currentUser.role === 'APPROVER' || currentUser.role === 'TEACHER' ? 'อาจารย์' : 'นิสิต'}
                  </span>
                </h3>
                <p className="text-[11px] text-teal-100/90">ผู้ช่วยอัจฉริยะประจำห้องปฏิบัติการพยาบาล</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetSession}
                title="เริ่มการสนทนาใหม่"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="ย่อหน้าต่าง"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-950/40 text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm whitespace-pre-line leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>

                {/* การ์ดสรุปรอยืนยัน (Confirmation Summary Card) */}
                {msg.confirmationSummary && (
                  <div className="mt-2.5 w-full max-w-[92%] bg-gradient-to-br from-teal-50 to-indigo-50/50 dark:from-teal-950/40 dark:to-indigo-950/30 border border-teal-200 dark:border-teal-800 rounded-xl p-3 shadow-md space-y-2">
                    <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-bold text-xs pb-1 border-b border-teal-200/60 dark:border-teal-800/60">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      {msg.confirmationSummary.title}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {msg.confirmationSummary.details.map((d, i) => (
                        <div key={i} className="flex justify-between items-start gap-2">
                          <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">{d.label}:</span>
                          <span className={`text-right font-medium ${d.highlight ? 'text-teal-700 dark:text-teal-300 font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                            {d.value} {d.badge && <span className="text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 px-1.5 py-0.2 rounded-full font-bold ml-1">{d.badge}</span>}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendMessage('ยืนยัน')}
                        className="flex-1 py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-sm transition active:scale-95"
                      >
                        {msg.confirmationSummary.confirmText || '✅ ยืนยันทำรายการ'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage('ยกเลิก')}
                        className="py-1.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs transition"
                      >
                        {msg.confirmationSummary.cancelText || 'ยกเลิก'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ผลลัพธ์หลังทำรายการสำเร็จ */}
                {msg.executionResult?.viewUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={msg.executionResult.viewUrl}
                      className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                    >
                      ดูรายการในระบบ <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 p-2">
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]"></div>
                <span className="ml-1 text-[11px]">กำลังตรวจสอบข้อมูลกับระบบ...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips */}
          {quickReplies.length > 0 && !isLoading && (
            <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {quickReplies.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(q.textToSend)}
                  className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/60 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer font-medium"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl transition ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isListening ? 'กำลังฟังเสียงภาษาไทย... (คลิกเพื่อหยุด)' : 'พูดสั่งงานด้วยเสียงภาษาไทย 🎙️'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
              placeholder={isListening ? 'กำลังฟังเสียง...' : 'พิมพ์คุยหรือสั่งงานได้เลยครับ...'}
              disabled={isLoading}
              className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-transparent focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white shadow-md shadow-teal-600/20 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
