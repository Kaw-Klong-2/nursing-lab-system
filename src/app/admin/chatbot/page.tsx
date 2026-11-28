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
  Database,
  ExternalLink,
  CheckCircle2,
  Zap,
  Brain,
  SlidersHorizontal,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ChatMarkdown from '@/components/chatbot/ChatMarkdown';
import DailyBriefingCard from '@/components/chatbot/DailyBriefingCard';
import PendingActionCard from '@/components/chatbot/PendingActionCard';
import { streamChatbotTurn } from '@/lib/chatbot-stream-client';
import {
  AiCopilotConfigData,
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

export default function AdminChatbotCommandCenterPage() {
  const router = useRouter();
  const { currentUser, isOfficer, isAdmin, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [quickReplies, setQuickReplies] = useState<QuickReplyOption[]>([]);
  const [sessionState, setSessionState] = useState<ChatSessionState | null>(null);
  const [modelMode, setModelMode] = useState<AiModelMode>('fast');
  const [briefing, setBriefing] = useState<DailyBriefingData | null>(null);
  const [isRefreshingBriefing, setIsRefreshingBriefing] = useState(false);

  const [config, setConfig] = useState<AiCopilotConfigData | null>(null);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSavedNotice, setConfigSavedNotice] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState('');
  const [streamingText, setStreamingText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isOfficer && !isAdmin) {
      router.replace('/');
    }
  }, [authLoading, isOfficer, isAdmin, router]);

  useEffect(() => {
    if (currentUser && (isOfficer || isAdmin)) {
      fetchInitialData();
    }
  }, [currentUser?.id, isOfficer, isAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingText, streamingStatus]);

  const fetchInitialData = async (refreshBriefingOnly = false) => {
    if (!currentUser) return;
    if (refreshBriefingOnly) setIsRefreshingBriefing(true);
    try {
      const res = await fetch('/api/chatbot');
      if (res.ok) {
        const data = await res.json();
        if (data.briefing) setBriefing(data.briefing);
        if (typeof data.aiStatus?.hasGeminiKey === 'boolean') {
          setHasGeminiKey(data.aiStatus.hasGeminiKey);
        }
        if (data.config) {
          setConfig(data.config);
          if (!refreshBriefingOnly && data.config.defaultModelMode) {
            setModelMode(data.config.defaultModelMode);
          }
        }
        if (!refreshBriefingOnly) {
          setMessages([
            {
              id: 'welcome',
              sender: 'bot',
              text: `🛠️ **[AI Copilot Command Center]**\n${data.greeting}`,
              timestamp: new Date(),
            },
          ]);
          if (data.quickReplies) setQuickReplies(data.quickReplies);
        }
      }
    } catch (err) {
      console.error('Failed to load chatbot command center:', err);
    } finally {
      setIsRefreshingBriefing(false);
    }
  };

  const handleSaveConfig = async (nextConfig: Partial<AiCopilotConfigData>) => {
    if (!isAdmin || !config) return;
    setIsSavingConfig(true);
    setConfigSavedNotice('');
    try {
      const payload = { ...config, ...nextConfig };
      const res = await fetch('/api/chatbot/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setConfigSavedNotice('บันทึกการตั้งค่าสิทธิ์แล้ว');
        setTimeout(() => setConfigSavedNotice(''), 2500);
      }
    } catch (err) {
      console.error('Failed to update AI config:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSendMessage = async (
    textToSend?: string,
    confirmAction?: 'CONFIRM' | 'CANCEL'
  ) => {
    const text = (textToSend ?? inputText).trim();
    if ((!text && !confirmAction) || isLoading || !currentUser) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: text || (confirmAction === 'CONFIRM' ? '✅ ยืนยันดำเนินการจริง' : '❌ ยกเลิกรายการ'),
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
      if (data.executionResult?.success) {
        fetchInitialData(true);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: `⚠️ ${err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingStatus('');
      setStreamingText('');
    }
  };

  if (authLoading || !currentUser || (!isOfficer && !isAdmin)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ..." />
      </div>
    );
  }

  const activePendingActionId = sessionState?.pendingAdminAction?.actionId;

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-teal-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-850 dark:to-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/sandbox"
              className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับสู่ Sandbox Hub</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="w-3 h-3" />
              <span>Dual-Mode AI Command Center</span>
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>ผู้ช่วยอัจฉริยะ AI Copilot</span>
            <Bot className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            ตอบคำถามการใช้งานระบบและดึงข้อมูลสดจากฐานข้อมูล พร้อมสั่งงานแอดมินจริงแบบมี Preview & Impact Card ยืนยันทุกครั้ง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && config && (
            <button
              type="button"
              onClick={() => setShowConfigPanel((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
              <span>ตั้งค่าสิทธิ์เปิดใช้</span>
            </button>
          )}

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

      {/* 1.5 Warning if GEMINI_API_KEY is not configured in environment */}
      {!hasGeminiKey && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong>⚠️ ยังไม่ได้ตั้งค่า <code>GEMINI_API_KEY</code> บนสภาพแวดล้อมนี้:</strong> ขณะนี้ระบบกำลังใช้โหมดค้นหาฐานข้อมูลตรงอัตโนมัติ (Live-DB Fallback) สำหรับคำถามข้อมูลในระบบ หากต้องการเปิดความสามารถ AI วิเคราะห์และสั่งงานแอดมินเต็มรูปแบบ กรุณาตั้งค่า <code>GEMINI_API_KEY</code> ใน Environment Variables ของระบบ Hosting
          </div>
        </div>
      )}

      {/* 1.6 AI Feature Flag Panel (Admin Only) */}
      {isAdmin && showConfigPanel && config && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                ตั้งค่าสิทธิ์การเข้าถึงปุ่ม AI ผู้ช่วยแล็บ (Feature Flag)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                แอดมินและเจ้าหน้าที่ใช้งานได้เสมอ (โหมดปฏิบัติการจริง) ส่วนบทบาทอื่นใช้งานในโหมดถาม-ตอบและเช็กข้อมูลตามสิทธิ์ RBAC
              </p>
            </div>
            {configSavedNotice && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{configSavedNotice}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <label className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">👩‍🏫 อาจารย์ / ผู้อนุมัติ</span>
              <input
                type="checkbox"
                checked={config.enableForTeachers}
                disabled={isSavingConfig}
                onChange={(e) => handleSaveConfig({ enableForTeachers: e.target.checked })}
                className="w-4 h-4 accent-teal-600"
              />
            </label>

            <label className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">🎓 นิสิต</span>
              <input
                type="checkbox"
                checked={config.enableForStudents}
                disabled={isSavingConfig}
                onChange={(e) => handleSaveConfig({ enableForStudents: e.target.checked })}
                className="w-4 h-4 accent-teal-600"
              />
            </label>

            <label className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">📈 ผู้บริหาร</span>
              <input
                type="checkbox"
                checked={config.enableForExecutives}
                disabled={isSavingConfig}
                onChange={(e) => handleSaveConfig({ enableForExecutives: e.target.checked })}
                className="w-4 h-4 accent-teal-600"
              />
            </label>

            <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">โหมดเริ่มต้น</span>
              <select
                value={config.defaultModelMode}
                disabled={isSavingConfig}
                onChange={(e) => handleSaveConfig({ defaultModelMode: e.target.value as AiModelMode })}
                className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1"
              >
                <option value="fast">⚡ เร็ว</option>
                <option value="deep">🧠 คิดลึก</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 2. Daily Briefing Card */}
      {briefing && (
        <DailyBriefingCard
          briefing={briefing}
          onAskPrompt={(prompt) => handleSendMessage(prompt)}
          onRefresh={() => fetchInitialData(true)}
          isRefreshing={isRefreshingBriefing}
        />
      )}

      {/* 3. Chat Playground Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col h-[640px] overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                KUNurse+ Lab AI Brain (Dual-Mode Tool-Calling + Preview Guardrails)
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Streaming Live • 10 Read Tools + 10 Admin Action Tools</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-700/70 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setModelMode('fast')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  modelMode === 'fast'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>เร็ว</span>
              </button>
              <button
                type="button"
                onClick={() => setModelMode('deep')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  modelMode === 'deep'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>คิดลึก</span>
              </button>
            </div>
            <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 font-medium">
              <strong>{currentUser.name}</strong> ({currentUser.role})
            </span>
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
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white rounded-br-xs whitespace-pre-line'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700 rounded-bl-xs'
                }`}
              >
                {msg.sender === 'bot' ? <ChatMarkdown text={msg.text} /> : msg.text}

                {msg.sender === 'bot' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/70 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                      <Database className="w-3 h-3" />
                      เครื่องมือที่ใช้:
                    </span>
                    {msg.toolsUsed.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/70 font-semibold"
                      >
                        {CHATBOT_TOOL_LABELS[t] || t}
                      </span>
                    ))}
                  </div>
                )}

                {msg.sender === 'bot' && msg.suggestedLinks && msg.suggestedLinks.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {msg.suggestedLinks.map((lnk) => (
                      <Link
                        key={lnk.href}
                        href={lnk.href}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700 font-semibold transition"
                      >
                        <span>{lnk.label}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ))}
                  </div>
                )}

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

                {msg.executionResult && msg.executionResult.success && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>ดำเนินการบันทึกลงระบบจริงแล้ว {msg.executionResult.referenceCode ? `(${msg.executionResult.referenceCode})` : ''}</span>
                    </span>
                    {msg.executionResult.viewUrl && (
                      <Link
                        href={msg.executionResult.viewUrl}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 underline"
                      >
                        <span>เปิดดู</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {msg.pendingAdminAction && (
                <div className="w-full max-w-[90%] sm:max-w-[75%]">
                  <PendingActionCard
                    action={msg.pendingAdminAction}
                    isInteractive={activePendingActionId === msg.pendingAdminAction.actionId}
                    isSubmitting={isLoading}
                    onConfirm={() => handleSendMessage('', 'CONFIRM')}
                    onCancel={() => handleSendMessage('', 'CANCEL')}
                  />
                </div>
              )}

              <span className="text-[10px] text-slate-400 px-1">
                {new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                {msg.modelUsed ? ` • ${msg.modelUsed}` : ''}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start gap-2">
              {streamingText && (
                <div className="max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700 rounded-bl-xs">
                  <ChatMarkdown text={streamingText} />
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]"></span>
                <span>{streamingStatus || 'AI กำลังคิดวิเคราะห์ข้อมูล...'}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        {quickReplies.length > 0 && !isLoading && (
          <div className="p-2 sm:px-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">คำสั่งแนะนำ:</span>
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
            placeholder="พิมพ์ถามวิธีใช้ระบบ หรือสั่งผู้ช่วยแอดมิน (เช่น บันทึกแอร์ อนุมัติคำขอ ส่งประกาศ)..."
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
