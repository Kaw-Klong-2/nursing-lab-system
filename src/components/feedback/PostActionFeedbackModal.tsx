'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Star, X, CheckCircle2, Sparkles, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_QUICK_TAGS,
  RATING_LABELS,
} from '@/lib/feedback-constants';

interface FeedbackConfigState {
  isEnabled: boolean;
  randomChancePercent: number;
  cooldownHoursAfterSubmit: number;
  promptTitle: string;
  promptSubtitle: string;
}

interface PendingPromptContext {
  category: string;
  actionLabel: string;
  pagePath: string;
  forcePreview?: boolean;
}

const DEFAULT_CFG: FeedbackConfigState = {
  isEnabled: true,
  randomChancePercent: 50,
  cooldownHoursAfterSubmit: 0,
  promptTitle: 'ทำรายการสำเร็จ! ให้คะแนนความพึงพอใจการใช้ระบบ',
  promptSubtitle: 'ความคิดเห็นของท่านช่วยให้เราพัฒนาห้องปฏิบัติการพยาบาลให้ดียิ่งขึ้น',
};

function detectCompletedAction(
  input: RequestInfo | URL,
  init?: RequestInit
): { category: string; actionLabel: string } | null {
  try {
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method !== 'POST' && method !== 'PUT') return null;

    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : input.url;

    const urlObj = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const path = urlObj.pathname;

    // Ignore feedback endpoints and auth/heartbeat noise
    if (path.startsWith('/api/feedback') || path.startsWith('/api/auth')) {
      return null;
    }

    if (method === 'POST') {
      if (path === '/api/requests/unified') {
        return { category: 'BORROW', actionLabel: 'ยื่นคำขอยืม-เบิกพัสดุ' };
      }
      if (path === '/api/borrow') {
        return { category: 'BORROW', actionLabel: 'ยื่นคำขอยืมครุภัณฑ์' };
      }
      if (path === '/api/requisitions') {
        return { category: 'REQUISITION', actionLabel: 'ยื่นคำขอเบิกวัสดุสิ้นเปลือง' };
      }
      if (path === '/api/kits/request') {
        return { category: 'BORROW', actionLabel: 'ขอเบิกชุดฝึกหัตถการ (Practice Kit)' };
      }
      if (path === '/api/practice/bookings' || path === '/api/practice/bookings/walk-in') {
        return { category: 'PRACTICE', actionLabel: 'ลงทะเบียนเข้าฝึกทักษะปฏิบัติการ' };
      }
      if (path === '/api/room-bookings' || path === '/api/room-bookings/batch') {
        return { category: 'ROOM_BOOKING', actionLabel: 'จองห้องปฏิบัติการพยาบาล' };
      }
      if (path === '/api/maintenance/issues') {
        return { category: 'MAINTENANCE', actionLabel: 'แจ้งซ่อม/รายงานปัญหาครุภัณฑ์' };
      }
    }

    if (method === 'PUT' && path.startsWith('/api/practice/bookings/')) {
      const bodyStr = typeof init?.body === 'string' ? init.body : '';
      if (bodyStr.includes('CHECK_OUT')) {
        return { category: 'PRACTICE', actionLabel: 'เช็คเอาท์เสร็จสิ้นการฝึกปฏิบัติการ' };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default function PostActionFeedbackModal() {
  const { currentUser } = useAuth();
  const pathname = usePathname();

  const [config, setConfig] = useState<FeedbackConfigState>(DEFAULT_CFG);
  const configRef = useRef<FeedbackConfigState>(DEFAULT_CFG);
  const currentUserRef = useRef(currentUser);
  const pathnameRef = useRef(pathname);

  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  const [promptCtx, setPromptCtx] = useState<PendingPromptContext>({
    category: 'OVERALL',
    actionLabel: 'ทำรายการสำเร็จ',
    pagePath: '/',
  });

  // Form states
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [easeOfUseRating, setEaseOfUseRating] = useState<number>(0);
  const [speedRating, setSpeedRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedDone, setSubmittedDone] = useState(false);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/feedback/config');
      if (res.ok) {
        const data = await res.json();
        const nextCfg: FeedbackConfigState = {
          isEnabled: data.isEnabled !== false,
          randomChancePercent:
            typeof data.randomChancePercent === 'number' ? data.randomChancePercent : 50,
          cooldownHoursAfterSubmit:
            typeof data.cooldownHoursAfterSubmit === 'number'
              ? data.cooldownHoursAfterSubmit
              : 0,
          promptTitle: data.promptTitle || DEFAULT_CFG.promptTitle,
          promptSubtitle: data.promptSubtitle || DEFAULT_CFG.promptSubtitle,
        };
        setConfig(nextCfg);
        configRef.current = nextCfg;
      }
    } catch {
      // silent fallback to default
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadConfig();

    const onConfigUpdated = (e: Event) => {
      const custom = e as CustomEvent<Partial<FeedbackConfigState>>;
      if (custom.detail) {
        const merged = { ...configRef.current, ...custom.detail };
        setConfig(merged);
        configRef.current = merged;
      } else {
        loadConfig();
      }
    };

    window.addEventListener('lab-feedback-config-updated', onConfigUpdated);
    return () => {
      window.removeEventListener('lab-feedback-config-updated', onConfigUpdated);
    };
  }, [currentUser?.id]);

  const openModalWithContext = (ctx: PendingPromptContext) => {
    setPromptCtx(ctx);
    setRating(0);
    setHoverRating(0);
    setEaseOfUseRating(0);
    setSpeedRating(0);
    setSelectedTags([]);
    setComment('');
    setIsAnonymous(false);
    setSubmittedDone(false);
    setIsOpen(true);
  };

  const tryRollAndShowPrompt = (ctx: PendingPromptContext) => {
    const user = currentUserRef.current;
    if (!user?.id) return;
    if (isOpenRef.current) return;

    if (ctx.forcePreview) {
      openModalWithContext(ctx);
      return;
    }

    const cfg = configRef.current;
    if (!cfg.isEnabled || cfg.randomChancePercent <= 0) return;

    // Check submit cooldown only if Admin configured cooldownHoursAfterSubmit > 0 (Default = 0 -> no block)
    if (cfg.cooldownHoursAfterSubmit > 0 && typeof window !== 'undefined') {
      try {
        const rawTs = window.localStorage.getItem(`lab_feedback_last_submit_${user.id}`);
        if (rawTs) {
          const elapsedMs = Date.now() - Number(rawTs);
          if (elapsedMs >= 0 && elapsedMs < cfg.cooldownHoursAfterSubmit * 3600 * 1000) {
            return;
          }
        }
      } catch {
        // ignore storage errors
      }
    }

    // Roll random chance (0 - 100%)
    const roll = Math.random() * 100;
    if (roll >= cfg.randomChancePercent) {
      return;
    }

    setTimeout(() => {
      if (!isOpenRef.current) {
        openModalWithContext(ctx);
      }
    }, 600);
  };

  // Mount global post-action interceptor & custom event listener
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return;

    const onCustomTrigger = (e: Event) => {
      const custom = e as CustomEvent<Partial<PendingPromptContext>>;
      const detail = custom.detail || {};
      tryRollAndShowPrompt({
        category: detail.category || 'OVERALL',
        actionLabel: detail.actionLabel || 'ทำรายการสำเร็จ',
        pagePath: detail.pagePath || pathnameRef.current || '/',
        forcePreview: detail.forcePreview,
      });
    };

    window.addEventListener('lab-post-action-feedback', onCustomTrigger);

    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await origFetch(input, init);
      try {
        if (response.ok && pathnameRef.current !== '/login') {
          const actionMeta = detectCompletedAction(input, init);
          if (actionMeta) {
            tryRollAndShowPrompt({
              category: actionMeta.category,
              actionLabel: actionMeta.actionLabel,
              pagePath: pathnameRef.current || '/',
            });
          }
        }
      } catch {
        // never break app fetch pipeline
      }
      return response;
    };

    return () => {
      window.removeEventListener('lab-post-action-feedback', onCustomTrigger);
      window.fetch = origFetch;
    };
  }, [currentUser?.id]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || rating < 1 || rating > 5) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          rating,
          easeOfUseRating: easeOfUseRating > 0 ? easeOfUseRating : null,
          speedRating: speedRating > 0 ? speedRating : null,
          category: promptCtx.category || 'OVERALL',
          actionLabel: promptCtx.actionLabel,
          pagePath: promptCtx.pagePath,
          quickTags: selectedTags.length > 0 ? selectedTags.join(', ') : null,
          comment: comment.trim() || null,
          isAnonymous,
        }),
      });

      if (res.ok) {
        try {
          window.localStorage.setItem(
            `lab_feedback_last_submit_${currentUser.id}`,
            String(Date.now())
          );
        } catch {
          // ignore
        }
        setSubmittedDone(true);
        setTimeout(() => {
          setIsOpen(false);
          setSubmittedDone(false);
        }, 1400);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'ไม่สามารถส่งคะแนนประเมินได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !currentUser) return null;

  const activeStar = hoverRating || rating;
  const starMeta = activeStar > 0 ? RATING_LABELS[activeStar] : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {submittedDone ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              ขอบคุณสำหรับคะแนนประเมิน!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ข้อมูลของท่านถูกบันทึกเรียบร้อยแล้ว ({rating} ดาว)
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback}>
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 p-5 text-white relative">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="ปิดหน้าต่างประเมิน"
                className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-bold mb-2">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{promptCtx.actionLabel}</span>
              </div>
              <h3 className="text-base font-black leading-snug pr-6">
                {config.promptTitle}
              </h3>
              <p className="text-[11px] text-white/85 mt-1 leading-relaxed">
                {config.promptSubtitle}
              </p>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Primary 1-5 Star Selector */}
              <div className="text-center space-y-2 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  แตะเลือกจำนวนดาวที่พึงพอใจ *
                </div>
                <div
                  className="flex items-center justify-center gap-2"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((num) => {
                    const filled = num <= activeStar;
                    return (
                      <button
                        key={num}
                        type="button"
                        onMouseEnter={() => setHoverRating(num)}
                        onClick={() => setRating(num)}
                        className="p-1 transition-transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                        aria-label={`ให้ ${num} ดาว`}
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${
                            filled
                              ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="min-h-[24px] flex items-center justify-center">
                  {starMeta ? (
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-0.5 rounded-full border ${starMeta.badgeClass}`}
                    >
                      <span>{starMeta.emoji}</span>
                      <span>
                        {activeStar} ดาว: {starMeta.text}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      ยังไม่ได้เลือกคะแนนดาว
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Tags */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  จุดที่ประทับใจ / ข้อสังเกต (เลือกได้หลายข้อ)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FEEDBACK_QUICK_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                        }`}
                      >
                        {active ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Sub-ratings */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    ความง่ายในการใช้งาน
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setEaseOfUseRating(n === easeOfUseRating ? 0 : n)}
                        className="cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            n <= easeOfUseRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    ความรวดเร็วของระบบ
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSpeedRating(n === speedRating ? 0 : n)}
                        className="cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            n <= speedRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comment */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    ข้อเสนอแนะเพิ่มเติม (ไม่บังคับ)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    หมวด: {FEEDBACK_CATEGORY_LABELS[promptCtx.category] || promptCtx.category}
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="พิมพ์ข้อเสนอแนะเพื่อช่วยปรับปรุงระบบ..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>

              {/* Anonymous Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>ส่งแบบไม่ระบุชื่อผู้ประเมิน</span>
              </label>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ไว้คราวหลัง
                </button>
                <button
                  type="submit"
                  disabled={submitting || rating < 1}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'กำลังส่ง...' : 'ส่งคะแนนประเมิน'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
