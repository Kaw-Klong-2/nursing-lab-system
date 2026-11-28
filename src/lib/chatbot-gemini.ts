/**
 * โมดูลเชื่อมต่อ Google Gemini AI (Tool-Calling & Multi-Turn Brain)
 * - รองรับ Native Function Calling 10 เครื่องมือ (RBAC Read-Only) สำหรับดึงข้อมูลสดจากฐานข้อมูล
 * - รองรับ Multi-Turn Conversation History เพื่อความต่อเนื่องของบทสนทนา
 * - มี Fallback สู่ Deterministic DateTime Engine และ Local Knowledge Base อัตโนมัติ
 */

import { searchKnowledgeBase, answerDateTimeAndGeneralQuery } from './chatbot-knowledge';
import { UserScopedSystemContext } from './chatbot-context-aggregator';
import {
  CHATBOT_TOOL_DECLARATIONS,
  executeChatbotTool,
  deriveSuggestedLinks,
} from './chatbot-tools';
import { ChatHistoryItem, ChatbotResponseSource, SuggestedLink } from '@/types/chatbot';

export interface GeminiChatResponse {
  success: boolean;
  replyText: string;
  source: ChatbotResponseSource;
  toolsUsed?: string[];
  suggestedLinks?: SuggestedLink[];
  quickReplies?: Array<{ label: string; textToSend: string }>;
}

const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];
const MAX_TOOL_ROUNDS = 4;

function buildSystemPrompt(
  userName: string,
  role: string,
  systemContext?: UserScopedSystemContext
): string {
  const nowBkk =
    systemContext?.currentBangkokTime ||
    new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

  const contextText = JSON.stringify(systemContext || {}, null, 2);

  return `คุณคือ "KUNurse+ Lab AI Copilot" ผู้ช่วยอัจฉริยะประจำระบบห้องปฏิบัติการพยาบาล (คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์)

ข้อมูลผู้ใช้งานปัจจุบัน:
- ชื่อ: "${userName}"
- บทบาท (Role): "${role}"
- เวลาปัจจุบันในประเทศไทย: ${nowBkk}
- สถานะห้องแล็บตอนนี้: ${systemContext?.isLabOpenNow ? 'เปิดทำการอยู่ (08:30 - 16:30 น.)' : 'ปิดทำการ (เปิด จันทร์-ศุกร์ 08:30 - 16:30 น.)'}

กฎการปฏิบัติงานอย่างเคร่งครัด:
1. **ใช้เครื่องมือ (Tools) เสมอเมื่อถามเกี่ยวกับข้อมูลจริงในระบบหรือวิธีใช้งานระบบ:**
   - ห้ามเดาจำนวนสต็อก ตารางห้อง ชื่อห้อง คำขอค้าง งบประมาณ ชั่วโมงแอร์ รายการแจ้งซ่อม หรือขั้นตอนเมนูจากความจำ
   - เมื่อผู้ใช้ถามเรื่องสต็อก/ของใกล้หมด/วันหมดอายุ -> เรียก \`search_inventory_stock\`
   - เมื่อถามเรื่องห้องว่าง/ห้องถูกจอง/รอบฝึก/วันหยุด -> เรียก \`get_room_schedule\`
   - เมื่อถามเรื่องคำขอของตนเอง -> เรียก \`get_my_requests\`
   - เมื่อถามเรื่องรายวิชา/การลงทะเบียนเรียน/งบประมาณ -> เรียก \`get_courses_and_budgets\`
   - เมื่อถามเรื่องคำขอรออนุมัติ -> เรียก \`get_pending_approvals\`
   - เมื่อถามเรื่องคนค้างคืน/กำลังยืม -> เรียก \`get_overdue_and_active_borrows\`
   - เมื่อถามเรื่องบันทึกเปิด-ปิดแอร์ -> เรียก \`get_ac_operation_logs\`
   - เมื่อถามเรื่องแจ้งซ่อม/อุปกรณ์ชำรุด -> เรียก \`get_maintenance_and_issues\`
   - เมื่อถามเรื่องชุดฝึกปฏิบัติการ (Kits) -> เรียก \`get_practice_kits\`
   - เมื่อถามวิธีใช้งานระบบ เมนู ขั้นตอน กฎระเบียบ หรือปัญหาการใช้งาน -> เรียก \`search_system_guide\`
2. **สิทธิพิเศษและความเป็นส่วนตัว (RBAC):**
   - หากผู้ใช้เป็น \`USER\` (นิสิต) หรือ \`VIEWER\`: ห้ามเปิดเผยงบประมาณรายวิชา คำขอของผู้อื่น เบอร์โทรผู้แจ้งซ่อม หรือรายชื่อผู้ค้างคืนพัสดุ หากเครื่องมือแจ้งปฏิเสธสิทธิ์ให้ชี้แจงอย่างสุภาพ
3. **กฎเหล็กด้านคำศัพท์:**
   - บังคับใช้คำว่า **"นิสิต"** เสมอในทุกกรณี ห้ามใช้คำอื่นที่ผิดระเบียบคณะเด็ดขาด
4. **รูปแบบการตอบและเส้นทางเมนูจริงในระบบ (ห้ามแต่ง URL เอง):**
   - ตอบเป็นภาษาไทยที่สุภาพ ชัดเจน กระชับ มีหัวข้อและ bullet points อ่านง่าย
   - หากอ้างอิงหน้าเว็บในระบบ **ต้องใช้เส้นทางจริงต่อไปนี้เท่านั้น**:
     - ยืม-คืน/เบิกพัสดุ: \`/borrow\`, \`/borrow/request\`, \`/requisitions\`
     - จองห้อง/ปฏิทิน/ฝึกทักษะ: \`/rooms\`, \`/schedule\`, \`/practice\`, \`/practice/book\`, \`/kits\`
     - อนุมัติคำขอ: \`/approvals\` (ไม่ใช่ /admin/approvals)
     - รายวิชาและรายชื่อนิสิต: \`/courses\`
     - คลังพัสดุ/รับเข้า/POS/แบ่งบรรจุ: \`/inventory\`, \`/stock-in\`, \`/pos\`, \`/repack\`
     - ซ่อมบำรุง/แจ้งชำรุด: \`/maintenance\`, \`/maintenance/report\`
     - เปิด-ปิดแอร์: \`/air-conditioning\`
     - รายงาน/ผู้บริหาร/ผู้ใช้/ตั้งค่า: \`/reports\`, \`/executive\`, \`/users\`, \`/audit-logs\`, \`/settings/notifications\`, \`/settings/terms\`, \`/admin/feedback\`
   - หากผลลัพธ์จากเครื่องมือว่างเปล่า ให้บอกตรงๆ ตามข้อมูลจริง (เช่น "วันนี้ยังไม่มีรายการจองห้องในระบบครับ") ห้ามแต่งข้อมูลเพิ่ม

บริบทสรุปของระบบตามสิทธิ์ผู้ใช้:
\`\`\`json
${contextText}
\`\`\``;
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

  const lower = userMessage.toLowerCase().trim();
  if (['สวัสดี', 'หวัดดี', 'hello', 'hi', 'ดีครับ', 'ดีค่ะ'].includes(lower)) {
    return {
      success: true,
      replyText: `สวัสดีครับคุณ **${userName}**! 👋 ผมคือ **KUNurse+ Lab AI Copilot** ผู้ช่วยประจำห้องปฏิบัติการพยาบาลครับ มีอะไรให้ผมช่วยเหลือวันนี้ พิมพ์ถามหรือสั่งงานได้เลยครับ 😊`,
      source: 'LOCAL_KNOWLEDGE_BASE',
    };
  }

  return {
    success: false,
    replyText: '',
    source: 'LOCAL_KNOWLEDGE_BASE',
  };
}

/**
 * เรียกใช้ Google Gemini พร้อม Function Calling (Multi-Turn Tool Loop)
 */
export async function askGeminiLabBrain(
  userMessage: string,
  currentUser: any,
  systemContext?: UserScopedSystemContext,
  conversationHistory?: ChatHistoryItem[]
): Promise<GeminiChatResponse> {
  const role = (currentUser?.role || 'USER').toUpperCase();
  const userName = currentUser?.name || 'ผู้ใช้งาน';
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return runFallbackKnowledge(userMessage, role, userName, systemContext);
  }

  const systemPrompt = buildSystemPrompt(userName, role, systemContext);
  const actor = {
    id: currentUser?.id || 'guest-user',
    name: userName,
    role,
    email: currentUser?.email,
  };

  for (const model of CANDIDATE_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const contents: any[] = buildInitialContents(userMessage, conversationHistory);
      const toolsUsed: string[] = [];
      const guideLinks: SuggestedLink[] = [];

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            tools: [{ functionDeclarations: CHATBOT_TOOL_DECLARATIONS }],
            toolConfig: {
              functionCallingConfig: { mode: 'AUTO' },
            },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          }),
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          console.warn(`Gemini model ${model} HTTP ${res.status}:`, errBody.slice(0, 200));
          break;
        }

        const data = await res.json();
        const candidateParts: any[] = data?.candidates?.[0]?.content?.parts || [];
        if (candidateParts.length === 0) {
          break;
        }

        const functionCalls = candidateParts.filter((p) => p.functionCall && p.functionCall.name);
        if (functionCalls.length > 0) {
          contents.push({
            role: 'model',
            parts: candidateParts,
          });

          const functionResponses = await Promise.all(
            functionCalls.map(async (part) => {
              const fc = part.functionCall;
              if (!toolsUsed.includes(fc.name)) {
                toolsUsed.push(fc.name);
              }
              let result: any;
              try {
                result = await executeChatbotTool(fc.name, fc.args, actor);
                if (fc.name === 'search_system_guide' && Array.isArray(result?.guides)) {
                  for (const g of result.guides) {
                    if (g?.route && g?.title && !guideLinks.some((l) => l.href === g.route)) {
                      guideLinks.push({ label: g.title, href: g.route });
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

          contents.push({
            role: 'user',
            parts: functionResponses,
          });
          continue;
        }

        const textParts = candidateParts
          .map((p) => (typeof p.text === 'string' ? p.text : ''))
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
            toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
            suggestedLinks: mergedLinks.length > 0 ? mergedLinks.slice(0, 3) : undefined,
          };
        }
        break;
      }
    } catch (err: any) {
      console.warn(`Gemini model ${model} failed or timed out:`, err?.message || err);
    }
  }

  return runFallbackKnowledge(userMessage, role, userName, systemContext);
}
