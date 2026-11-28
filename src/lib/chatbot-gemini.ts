/**
 * โมดูลเชื่อมต่อ Google Gemini AI (Dual-Mode: Fast / Deep + Admin Write-Action Proposals + Streaming Progress)
 */

import { searchKnowledgeBase, answerDateTimeAndGeneralQuery } from './chatbot-knowledge';
import { UserScopedSystemContext } from './chatbot-context-aggregator';
import {
  CHATBOT_TOOL_DECLARATIONS,
  executeChatbotTool,
  deriveSuggestedLinks,
} from './chatbot-tools';
import {
  ADMIN_ACTION_TOOL_DECLARATIONS,
  isAdminWriteTool,
  proposeAdminAction,
} from './chatbot-admin-actions';
import {
  AiModelMode,
  CHATBOT_TOOL_LABELS,
  ChatHistoryItem,
  ChatbotResponseSource,
  PendingAdminAction,
  SuggestedLink,
} from '@/types/chatbot';

export interface GeminiProgressEvent {
  type: 'status' | 'delta';
  message?: string;
  tool?: string;
  text?: string;
}

export interface GeminiChatResponse {
  success: boolean;
  replyText: string;
  source: ChatbotResponseSource;
  modelUsed?: string;
  toolsUsed?: string[];
  suggestedLinks?: SuggestedLink[];
  pendingAdminAction?: PendingAdminAction | null;
  quickReplies?: Array<{ label: string; textToSend: string }>;
}

interface ModelAttemptConfig {
  model: string;
  thinkingBudget?: number;
}

const FAST_MODELS: ModelAttemptConfig[] = [
  { model: 'gemini-3.5-flash-lite' },
  { model: 'gemini-3.1-flash-lite' },
  { model: 'gemini-3-flash-preview' },
];

const DEEP_MODELS: ModelAttemptConfig[] = [
  { model: 'gemini-3-flash-preview' },
  { model: 'gemini-3.5-flash-lite', thinkingBudget: 2048 },
  { model: 'gemini-3.6-flash' },
];

const MAX_TOOL_ROUNDS = 5;

function buildSystemPrompt(
  userName: string,
  role: string,
  systemContext?: UserScopedSystemContext,
  pendingAdminAction?: PendingAdminAction | null
): string {
  const isStaff = role === 'ADMIN' || role === 'OFFICER';
  const nowBkk =
    systemContext?.currentBangkokTime ||
    new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

  const contextText = JSON.stringify(systemContext || {}, null, 2);
  const pendingText = pendingAdminAction
    ? `\n\nคำสั่งแอดมินที่รอการยืนยันอยู่ปัจจุบัน (หากผู้ใช้พิมพ์แก้ไขให้เรียก propose_* ใหม่โดยอิงจากแผนเดิมนี้):\n${JSON.stringify(pendingAdminAction, null, 2)}`
    : '';

  return `คุณคือ "KUNurse+ Lab AI Copilot" ผู้ช่วยอัจฉริยะประจำระบบห้องปฏิบัติการพยาบาล (คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์)

ข้อมูลผู้ใช้งานปัจจุบัน:
- ชื่อ: "${userName}"
- บทบาท (Role): "${role}"
- เวลาปัจจุบันในประเทศไทย: ${nowBkk}
- สถานะห้องแล็บตอนนี้: ${systemContext?.isLabOpenNow ? 'เปิดทำการอยู่ (08:30 - 16:30 น.)' : 'ปิดทำการ (เปิด จันทร์-ศุกร์ 08:30 - 16:30 น.)'}

กฎการปฏิบัติงานอย่างเคร่งครัด:
1. **สืบค้นข้อมูลจริงด้วยเครื่องมือเสมอ (Read Tools):**
   - ห้ามเดาจำนวนสต็อก ตารางห้อง ชื่อห้อง คำขอค้าง งบประมาณ ชั่วโมงแอร์ รายการแจ้งซ่อม หรือขั้นตอนเมนูจากความจำ
   - ใช้เครื่องมืออ่านข้อมูลที่เหมาะสม (\`search_inventory_stock\`, \`get_room_schedule\`, \`get_my_requests\`, \`get_courses_and_budgets\`, \`get_pending_approvals\`, \`get_overdue_and_active_borrows\`, \`get_ac_operation_logs\`, \`get_maintenance_and_issues\`, \`get_practice_kits\`, \`search_system_guide\`)
2. **การสั่งปฏิบัติการจริงสำหรับแอดมิน/เจ้าหน้าที่ (${isStaff ? 'เปิดใช้งานอยู่' : 'ปิดสำหรับบทบาทนี้'}):**
   ${
     isStaff
       ? `- เมื่อผู้ดูแลระบบหรือเจ้าหน้าที่สั่งให้ทำงานจริงในระบบ (เช่น บันทึกแอร์หลายห้อง/หลายวัน, เพิ่ม-ลบวันหยุด, อนุมัติ/ปฏิเสธคำขอ, ทวงคืนพัสดุค้าง, จองห้อง, เปิด-ปิดรอบฝึก, ส่งประกาศ, อัปเดตงานแจ้งซ่อม, จัดการรายชื่อนิสิตในวิชา, ปรับยอดสต็อก) ให้เรียกเครื่องมือ \`propose_*\` ที่ตรงงานทันที
   - เครื่องมือ \`propose_*\` จะสร้างการ์ด **Preview & Impact Card** ให้ผู้ใช้กดยืนยันก่อนลงฐานข้อมูลจริง หากมีห้องไม่พบหรือเวลาชน ให้สรุปแจ้งให้ผู้ใช้ทราบร่วมกับการ์ดยืนยัน`
       : '- บทบาทนี้ใช้ได้เฉพาะโหมดถาม-ตอบและตรวจข้อมูลตามสิทธิ์เท่านั้น ห้ามอ้างว่าสามารถแก้ไขฐานข้อมูลแทนเจ้าหน้าที่ได้'
   }
3. **สิทธิ์และความเป็นส่วนตัว (RBAC):**
   - หากผู้ใช้เป็น \`USER\` (นิสิต) หรือ \`VIEWER\`: ห้ามเปิดเผยงบประมาณรายวิชา คำขอของผู้อื่น เบอร์โทรผู้แจ้งซ่อม หรือรายชื่อผู้ค้างคืนพัสดุ
4. **กฎเหล็กด้านคำศัพท์:**
   - บังคับใช้คำว่า **"นิสิต"** เสมอในทุกกรณี ห้ามใช้คำอื่นที่ผิดระเบียบคณะเด็ดขาด
5. **รูปแบบการตอบและเส้นทางเมนูจริงในระบบ (ห้ามแต่ง URL เอง):**
   - ตอบเป็นภาษาไทยที่สุภาพ ชัดเจน มีหัวข้อ ตาราง Markdown (\`| ... |\`) เมื่อเปรียบเทียบหลายรายการ และ bullet points อ่านง่าย
   - หากอ้างอิงหน้าเว็บในระบบ **ต้องใช้เส้นทางจริงต่อไปนี้เท่านั้น**:
     - ยืม-คืน/เบิกพัสดุ: \`/borrow\`, \`/borrow/request\`, \`/requisitions\`
     - จองห้อง/ปฏิทิน/ฝึกทักษะ: \`/rooms\`, \`/schedule\`, \`/practice\`, \`/practice/book\`, \`/kits\`
     - อนุมัติคำขอ: \`/approvals\`
     - รายวิชาและรายชื่อนิสิต: \`/courses\`
     - คลังพัสดุ/รับเข้า/POS/แบ่งบรรจุ: \`/inventory\`, \`/stock-in\`, \`/pos\`, \`/repack\`
     - ซ่อมบำรุง/แจ้งชำรุด: \`/maintenance\`, \`/maintenance/report\`
     - เปิด-ปิดแอร์: \`/air-conditioning\`
     - รายงาน/ผู้บริหาร/ผู้ใช้/ตั้งค่า: \`/reports\`, \`/executive\`, \`/users\`, \`/audit-logs\`, \`/settings/notifications\`, \`/settings/terms\`, \`/admin/feedback\`

บริบทสรุปของระบบตามสิทธิ์ผู้ใช้:
\`\`\`json
${contextText}
\`\`\`${pendingText}`;
}

function buildInitialContents(
  userMessage: string,
  history?: ChatHistoryItem[]
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  if (Array.isArray(history) && history.length > 0) {
    const trimmed = history.slice(-10);
    for (const item of trimmed) {
      if (item.text && item.text.trim()) {
        contents.push({
          role: item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.text }],
        });
      }
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });
  return contents;
}

function runFallbackKnowledge(
  userMessage: string,
  role: string,
  userName: string,
  systemContext?: UserScopedSystemContext
): GeminiChatResponse {
  const dtResult = answerDateTimeAndGeneralQuery(userMessage, role);
  if (dtResult) {
    return {
      success: true,
      replyText: dtResult.text,
      source: 'DATETIME_ENGINE',
      quickReplies: dtResult.quickReplies,
    };
  }

  const kbResult = searchKnowledgeBase(userMessage, role);
  if (kbResult) {
    return {
      success: true,
      replyText: kbResult.answer(role, systemContext),
      source: 'LOCAL_KNOWLEDGE_BASE',
      quickReplies: kbResult.quickReplies,
      suggestedLinks: kbResult.route ? [{ label: kbResult.title, href: kbResult.route }] : undefined,
    };
  }

  return {
    success: false,
    replyText: `ขออภัยครับคุณ **${userName}** ขณะนี้ระบบ AI ภายนอกไม่พร้อมใช้งานชั่วคราว กรุณาลองถามอีกครั้งหรือเลือกจากเมนูลัดครับ`,
    source: 'LOCAL_KNOWLEDGE_BASE',
  };
}

/**
 * อ่าน GEMINI_API_KEY (หรือ GOOGLE_API_KEY) รองรับทั้ง Node.js, Vercel และ Cloudflare Workers
 */
export function getGeminiApiKey(): string | null {
  const fromProcess =
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GOOGLE_API_KEY) ||
    '';
  if (fromProcess && fromProcess.trim()) {
    return fromProcess.trim().replace(/^["']|["']$/g, '');
  }

  try {
    const cfGlobal = (globalThis as unknown as Record<symbol, unknown>)[
      Symbol.for('__cloudflare-context__')
    ] as { env?: Record<string, unknown> } | undefined;
    const cfVal = cfGlobal?.env?.GEMINI_API_KEY ?? cfGlobal?.env?.GOOGLE_API_KEY;
    if (typeof cfVal === 'string' && cfVal.trim()) {
      return cfVal.trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // ignore missing Cloudflare runtime context
  }

  return null;
}

/**
 * เรียกใช้ Google Gemini พร้อม Function Calling, โหมดเร็ว/คิดลึก และรายงานสถานะสด
 */
export async function askGeminiLabBrain(
  userMessage: string,
  currentUser: any,
  systemContext?: UserScopedSystemContext,
  conversationHistory?: ChatHistoryItem[],
  options?: {
    modelMode?: AiModelMode;
    pendingAdminAction?: PendingAdminAction | null;
    onProgress?: (event: GeminiProgressEvent) => void;
  }
): Promise<GeminiChatResponse> {
  const role = (currentUser?.role || 'USER').toUpperCase();
  const userName = currentUser?.name || 'ผู้ใช้งาน';
  const apiKey = getGeminiApiKey();
  const modelMode: AiModelMode = options?.modelMode === 'deep' ? 'deep' : 'fast';
  const onProgress = options?.onProgress;

  if (!apiKey) {
    return runFallbackKnowledge(userMessage, role, userName, systemContext);
  }

  const isStaff = role === 'ADMIN' || role === 'OFFICER';
  const availableDeclarations = isStaff
    ? [...CHATBOT_TOOL_DECLARATIONS, ...ADMIN_ACTION_TOOL_DECLARATIONS]
    : CHATBOT_TOOL_DECLARATIONS;

  const systemPrompt = buildSystemPrompt(userName, role, systemContext, options?.pendingAdminAction);
  const actor = {
    id: currentUser?.id || 'guest-user',
    name: userName,
    role,
    email: currentUser?.email,
  };

  const candidateModels = modelMode === 'deep' ? DEEP_MODELS : FAST_MODELS;

  for (const cfg of candidateModels) {
    try {
      onProgress?.({
        type: 'status',
        message: modelMode === 'deep' ? '🧠 กำลังวิเคราะห์คำสั่งเชิงลึก...' : '⚡ กำลังวิเคราะห์คำถาม...',
      });

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${apiKey}`;
      const contents: any[] = buildInitialContents(userMessage, conversationHistory);
      const toolsUsed: string[] = [];
      const guideLinks: SuggestedLink[] = [];
      let pendingAdminAction: PendingAdminAction | null = null;

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const controller = new AbortController();
        const timeoutMs = modelMode === 'deep' ? 28000 : 18000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const generationConfig: Record<string, any> = {
          temperature: modelMode === 'deep' ? 0.25 : 0.3,
          maxOutputTokens: modelMode === 'deep' ? 3072 : 2048,
        };
        if (cfg.thinkingBudget) {
          generationConfig.thinkingConfig = { thinkingBudget: cfg.thinkingBudget };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [{ functionDeclarations: availableDeclarations }],
            toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
            generationConfig,
          }),
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          console.warn(`Gemini model ${cfg.model} HTTP ${res.status}:`, errBody.slice(0, 200));
          break;
        }

        const data = await res.json();
        const candidateParts: any[] = data?.candidates?.[0]?.content?.parts || [];
        if (candidateParts.length === 0) break;

        const functionCalls = candidateParts.filter((p) => p.functionCall && p.functionCall.name);
        if (functionCalls.length > 0) {
          contents.push({ role: 'model', parts: candidateParts });

          const functionResponses = await Promise.all(
            functionCalls.map(async (part) => {
              const fc = part.functionCall;
              if (!toolsUsed.includes(fc.name)) toolsUsed.push(fc.name);

              const label = CHATBOT_TOOL_LABELS[fc.name] || fc.name;
              onProgress?.({
                type: 'status',
                tool: fc.name,
                message: `กำลังตรวจสอบ: ${label}...`,
              });

              let result: any;
              try {
                if (isAdminWriteTool(fc.name)) {
                  const proposed = await proposeAdminAction(fc.name, fc.args, actor);
                  if (proposed.pendingAction) {
                    pendingAdminAction = proposed.pendingAction;
                  }
                  result = proposed;
                } else {
                  result = await executeChatbotTool(fc.name, fc.args, actor);
                  if (fc.name === 'search_system_guide' && Array.isArray(result?.guides)) {
                    for (const g of result.guides) {
                      if (g?.route && g?.title && !guideLinks.some((l) => l.href === g.route)) {
                        guideLinks.push({ label: g.title, href: g.route });
                      }
                    }
                  }
                }
              } catch (toolErr: any) {
                console.error(`Tool ${fc.name} error:`, toolErr);
                result = { error: `ไม่สามารถดึงข้อมูลจาก ${fc.name} ได้: ${toolErr?.message || 'unknown error'}` };
              }

              return {
                functionResponse: {
                  name: fc.name,
                  response: { result },
                },
              };
            })
          );

          contents.push({ role: 'user', parts: functionResponses });
          continue;
        }

        const textParts = candidateParts
          .filter((p) => !p.thought && typeof p.text === 'string')
          .map((p) => p.text)
          .filter(Boolean)
          .join('\n')
          .trim();

        if (textParts) {
          const mergedLinks = [...deriveSuggestedLinks(toolsUsed, role)];
          for (const gl of guideLinks) {
            if (!mergedLinks.some((l) => l.href === gl.href)) {
              mergedLinks.push(gl);
            }
          }

          return {
            success: true,
            replyText: textParts,
            source: toolsUsed.length > 0 ? 'GEMINI_TOOLS' : 'GEMINI_LLM',
            modelUsed: cfg.model,
            toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
            suggestedLinks: mergedLinks.length > 0 ? mergedLinks.slice(0, 3) : undefined,
            pendingAdminAction,
          };
        }
        break;
      }
    } catch (err: any) {
      console.warn(`Gemini model ${cfg.model} failed or timed out:`, err?.message || err);
    }
  }

  return runFallbackKnowledge(userMessage, role, userName, systemContext);
}
