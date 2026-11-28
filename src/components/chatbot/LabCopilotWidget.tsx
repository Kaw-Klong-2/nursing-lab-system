'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Bot,
  Send,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  Database,
  Zap,
  Brain,
} from 'lucide-react';
import ChatMarkdown from '@/components/chatbot/ChatMarkdown';
import DailyBriefingCard from '@/components/chatbot/DailyBriefingCard';
import PendingActionCard from '@/components/chatbot/PendingActionCard';
import { streamChatbotTurn } from '@/lib/chatbot-stream-client';
import {
  AiModelMode,
  CHATBOT_TOOL_LABELS,
  ChatSessionState,
  ConfirmationSummaryCard,
  DailyBriefingData,
  PendingAdminAction,
  QuickReplyOption,
  SuggestedLink,
} from '@/types/chatbot';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  confirmationSummary?: ConfirmationSummaryCard;
  pendingAdminAction?: PendingAdminAction | null;
  toolsUsed?: string[];
  suggestedLinks?: SuggestedLink[];
  modelUsed?: string;
  executionResult?: {
    success: boolean;
    referenceCode?: string;
    viewUrl?: string;
  };
}

export default function LabCopilotWidget() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [canUseCopilot, setCanUseCopilot] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReplyOption[]>([]);
  const [sessionState, setSessionState] = useState<ChatSessionState | null>(null);
  const [modelMode, setModelMode] = useState<AiModelMode>('fast');
  const [briefing, setBriefing] = useState<DailyBriefingData | null>(null);
  const [isRefreshingBriefing, setIsRefreshingBriefing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, streamingText, streamingStatus]);

  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener('open-lab-copilot', handleOpenEvent);
    return () => window.removeEventListener('open-lab-copilot', handleOpenEvent);
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'VIEWER') {
      fetchInitialGreeting();
    } else {
      setCanUseCopilot(false);
    }
  }, [currentUser?.id, currentUser?.role]);

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

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
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
      } catch {
        setIsListening(false);
      }
    }
  };

  const fetchInitialGreeting = async (refreshBriefingOnly = false) => {
    if (!currentUser) return;
    if (refreshBriefingOnly) setIsRefreshingBriefing(true);
    try {
      const res = await fetch('/api/chatbot');
      if (res.status === 403 || res.status === 401) {
        setCanUseCopilot(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCanUseCopilot(true);
        if (data.briefing) setBriefing(data.briefing);
        if (!refreshBriefingOnly) {
          if (data.config?.defaultModelMode) setModelMode(data.config.defaultModelMode);
          setMessages([
            {
              id: 'welcome',
              sender: 'bot',
              text: data.greeting,
              timestamp: new Date(),
            },
          ]);
          if (data.quickReplies) setQuickReplies(data.quickReplies);
        }
      }
    } catch (err) {
      console.error('Failed to load greeting:', err);
    } finally {
      setIsRefreshingBriefing(false);
    }
  };

  const handleSendMessage = async (
    textToSend?: string,
    confirmAction?: 'CONFIRM' | 'CANCEL'
  ) => {
    const text = (textToSend ?? inputText).trim();
    if ((!text && !confirmAction) || isLoading || !currentUser) return;

    const userDisplayText =
      text || (confirmAction === 'CONFIRM' ? '✅ ยืนยันดำเนินการจริง' : '❌ ยกเลิกรายการ');

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userDisplayText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!confirmAction && !textToSend) setInputText('');
    setIsLoading(true);
    setStreamingStatus(modelMode === 'deep' ? '🧠 กำลังวิเคราะห์เชิงลึก...' : '⚡ กำลังประมวลผล...');
    setStreamingText('');

    try {
      const data = await streamChatbotTurn({
        message: text,
        sessionState,
        modelMode,
        confirmAction,
        onStatus: (msg) => setStreamingStatus(msg),
        onDelta: (delta) => setStreamingText((prev) => prev + delta),
      });

      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: data.replyText,
        timestamp: new Date(),
        confirmationSummary: data.confirmationSummary,
        pendingAdminAction: data.pendingAdminAction,
        toolsUsed: data.toolsUsed,
        suggestedLinks: data.suggestedLinks,
        modelUsed: data.modelUsed,
        executionResult: data.executionResult,
      };

      setMessages((prev) => [...prev, botMsg]);
      setSessionState(data.sessionState);
      if (data.quickReplies) setQuickReplies(data.quickReplies);
      if (data.executionResult?.success && briefing) {
        fetchInitialGreeting(true);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: `⚠️ ${err?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingStatus('');
      setStreamingText('');
    }
  };

  if (!currentUser || !canUseCopilot) return null;

  const activePendingActionId = sessionState?.pendingAdminAction?.actionId;
  const roleLabel =
    currentUser.role === 'ADMIN'
      ? 'แอดมิน'
      : currentUser.role === 'OFFICER'
      ? 'เจ้าหน้าที่'
      : currentUser.role === 'APPROVER' || currentUser.role === 'TEACHER'
      ? 'อาจารย์'
      : currentUser.role === 'EXECUTIVE'
      ? 'ผู้บริหาร'
      : 'นิสิต';

  return (
    <>
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
            <span className="text-[10px] text-teal-100 font-medium">ถาม-ตอบและสั่งงานได้</span>
          </div>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-16 md:bottom-6 right-2 sm:right-6 z-50 w-[95vw] sm:w-[440px] max-w-[460px] h-[84vh] max-h-[680px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  KUNurse+ AI Copilot
                  <span className="text-[10px] bg-teal-500/40 text-teal-100 px-1.5 py-0.5 rounded-full font-medium">
                    {roleLabel}
                  </span>
                </h3>
                <p className="text-[10px] text-teal-100/90">ผู้ช่วยตอบคำถาม & ปฏิบัติการระบบ</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* สวิตช์โหมดเร็ว / คิดลึก */}
              <div className="flex items-center bg-black/20 rounded-lg p-0.5 mr-1">
                <button
                  type="button"
                  onClick={() => setModelMode('fast')}
                  title="โหมดเร็ว (ตอบไว)"
                  className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer ${
                    modelMode === 'fast' ? 'bg-white text-teal-700 shadow-xs' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>เร็ว</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModelMode('deep')}
                  title="โหมดคิดลึก (วิเคราะห์ซับซ้อน)"
                  className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer ${
                    modelMode === 'deep' ? 'bg-white text-indigo-700 shadow-xs' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Brain className="w-3 h-3" />
                  <span>ลึก</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSendMessage('เริ่มใหม่')}
                title="เริ่มการสนทนาใหม่"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="ย่อหน้าต่าง"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Daily Briefing (สำหรับ Admin/Officer) */}
          {briefing && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/70 dark:border-slate-800">
              <DailyBriefingCard
                briefing={briefing}
                onAskPrompt={(prompt) => handleSendMessage(prompt)}
                onRefresh={() => fetchInitialGreeting(true)}
                isRefreshing={isRefreshingBriefing}
                compact
              />
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-950/40 text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white rounded-br-xs whitespace-pre-line'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs'
                  }`}
                >
                  {msg.sender === 'bot' ? <ChatMarkdown text={msg.text} /> : msg.text}

                  {msg.sender === 'bot' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/70 flex flex-wrap items-center gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mr-0.5">
                        <Database className="w-3 h-3" />
                        ข้อมูลจริง:
                      </span>
                      {msg.toolsUsed.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/70 font-medium"
                        >
                          {CHATBOT_TOOL_LABELS[t] || t}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.sender === 'bot' && msg.suggestedLinks && msg.suggestedLinks.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {msg.suggestedLinks.map((lnk) => (
                        <Link
                          key={lnk.href}
                          href={lnk.href}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700 font-semibold transition"
                        >
                          <span>{lnk.label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview & Impact Card สำหรับคำสั่งแอดมิน */}
                {msg.pendingAdminAction && (
                  <div className="w-full max-w-[95%]">
                    <PendingActionCard
                      action={msg.pendingAdminAction}
                      isInteractive={activePendingActionId === msg.pendingAdminAction.actionId}
                      isSubmitting={isLoading}
                      onConfirm={() => handleSendMessage('', 'CONFIRM')}
                      onCancel={() => handleSendMessage('', 'CANCEL')}
                    />
                  </div>
                )}

                {/* Legacy Confirmation Summary Card */}
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
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendMessage('ยืนยัน')}
                        className="flex-1 py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        {msg.confirmationSummary.confirmText || '✅ ยืนยันทำรายการ'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage('ยกเลิก')}
                        className="py-1.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs transition cursor-pointer"
                      >
                        {msg.confirmationSummary.cancelText || 'ยกเลิก'}
                      </button>
                    </div>
                  </div>
                )}

                {msg.executionResult?.viewUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <Link
                      href={msg.executionResult.viewUrl}
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                    >
                      เปิดดูรายการในระบบ <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  {msg.modelUsed ? ` • ${msg.modelUsed}` : ''}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-start gap-2">
                {streamingText && (
                  <div className="max-w-[92%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs">
                    <ChatMarkdown text={streamingText} />
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 p-2">
                  <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="ml-1 text-[11px]">{streamingStatus || 'กำลังประมวลผล...'}</span>
                </div>
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
              className={`p-2 rounded-xl transition cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isListening ? 'กำลังฟังเสียงภาษาไทย... (คลิกเพื่อหยุด)' : 'พูดสั่งงานด้วยเสียงภาษาไทย'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={isListening ? 'กำลังฟังเสียง...' : 'พิมพ์ถามหรือสั่งผู้ช่วยแอดมิน...'}
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
