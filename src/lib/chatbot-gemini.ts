/**
 * โมดูลเชื่อมต่อ Google Gemini AI (AI First Front-End Brain)
 * ประมวลผลและตอบคำถามโดยอิงจาก Grounding Data Context ที่ผ่านการคัดกรองตามสิทธิ์ (RBAC)
 * รองรับโมเดล gemini-3.5-flash-lite, gemini-3.5-flash พร้อมระบบ Timeout และ Fallback อัตโนมัติ 100%
 */

import { searchKnowledgeBase, answerDateTimeAndGeneralQuery } from './chatbot-knowledge';
import { UserScopedSystemContext } from './chatbot-context-aggregator';

export interface GeminiChatResponse {
  success: boolean;
  replyText: string;
  source: 'GEMINI_LLM' | 'LOCAL_KNOWLEDGE_BASE' | 'DATETIME_ENGINE';
  suggestedAction?: string;
  quickReplies?: Array<{ label: string; textToSend: string }>;
}

/**
 * เรียกใช้ Google Gemini คิดคำตอบอย่างชาญฉลาดโดยอิงจากข้อมูลระบบในสิทธิ์ของผู้ถาม
 */
export async function askGeminiLabBrain(
  userMessage: string,
  currentUser: any,
  systemContext?: UserScopedSystemContext
): Promise<GeminiChatResponse> {
  const role = (currentUser?.role || 'USER').toUpperCase();
  const userName = currentUser?.name || 'ผู้ใช้งาน';

  // 1. ดึง API Key จาก Environment Variables
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // 2. หากไม่มี API Key ให้ใช้ Local Knowledge Base
  if (!apiKey) {
    // เช็กเรื่องวันเวลา
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

  // 3. เตรียม System Prompt และข้อมูลบริบทในสิทธิ์ (RBAC Grounding Context)
  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
  const nowBkk = systemContext?.currentBangkokTime || new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'full', timeStyle: 'medium' });

  // แปลง System Context เป็นข้อความสรุปบริบท
  const contextText = JSON.stringify(systemContext || {}, null, 2);

  const systemPrompt = `คุณคือ "KUNurse+ Lab AI Copilot" ผู้ช่วยอัจฉริยะประจำระบบห้องปฏิบัติการพยาบาล คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์

กฎเหล็กด้านความปลอดภัยและการรักษาความลับข้อมูล (RBAC Data Security):
1. ผู้ถามมีบทบาทเป็น: "${role}" (ชื่อ: "${userName}")
   - หากผู้ถามคือ "USER" (นิสิต): นิสิตมีสิทธิ์ทราบเฉพาะข้อมูลสาธารณะ (ห้องแล็บ, ชุด Kits, สต็อกคงเหลือทั่วไป, ตู้เก็บ), ข้อมูลคำขอของตนเอง, และวันเวลาทำการ
   - ❌ **ห้ามเปิดเผยข้อมูลข้ามบุคคลเด็ดขาด**: นิสิตไม่มีสิทธิ์ดูงบประมาณของรายวิชา, ไม่มีสิทธิ์ดูคำขอของนิสิตคนอื่น, และไม่มีสิทธิ์ดูรายชื่อคนค้างคืนพัสดุ (Overdue)
   - หากนิสิตถามเรื่องที่ไม่มีสิทธิ์เข้าถึง (เช่น ถามงบวิชา, ถามว่าใครยังไม่คืนของ): ให้ปฏิเสธอย่างสุภาพทันทีว่า "ขออภัยครับ ข้อมูลส่วนนี้สงวนสิทธิ์สำหรับอาจารย์ผู้ประสานงานวิชา หรือเจ้าหน้าที่ห้องแล็บเท่านั้นครับ นิสิตสามารถตรวจสอบได้เฉพาะสถานะคำขอของตนเองครับ"
2. หากผู้ถามคือ "APPROVER" หรือ "TEACHER" (อาจารย์):
   - สามารถดูคำขอรออนุมัติของนิสิตในวิชาที่อาจารย์รับผิดชอบได้
   - สามารถดูงบประมาณคงเหลือและยอดเบิกจ่ายสะสมของรายวิชาได้
3. หากผู้ถามคือ "OFFICER" หรือ "ADMIN" (เจ้าหน้าที่/ผู้ดูแลระบบ):
   - สามารถดูข้อมูลระบบทั้งหมดได้ เช่น รายชื่อผู้ค้างส่งพัสดุ (Overdue), คำขอรออนุมัติทั้งหมด, ประวัติการเปิดแอร์
4. กฎเหล็กด้านคำศัพท์: บังคับใช้คำว่า "นิสิต" เสมอในทุกกรณี และห้ามใช้คำอื่นที่ผิดระเบียบคณะโดยเด็ดขาด
5. เวลาปัจจุบันของระบบในประเทศไทยคือ: ${nowBkk} (สถานะแล็บขณะนี้: ${systemContext?.isLabOpenNow ? 'เปิดทำการอยู่' : 'ปิดทำการ'})

ข้อมูลฐานข้อมูลในระบบที่กรองสิทธิ์แล้ว (RBAC Context Data):
\`\`\`json
${contextText}
\`\`\`

หลักการคิดและตอบคำถาม:
- วิเคราะห์คำถามของผู้ใช้ และค้นหาข้อมูลจาก RBAC Context Data ข้างต้นมาตอบอย่างถูกต้อง แม่นยำ
- ถ้าผู้ใช้ถามคำถามผสมผสาน เช่น "ถ้าจะซ้อมฉีดยาพรุ่งนี้ ต้องทำยังไง" ให้คิดวิเคราะห์เป็นขั้นตอน (จองห้องแล็บ -> เบิกชุดฉีดยา -> เตรียมตัว)
- ตอบสั้น กระชับ มีโครงสร้างอ่านง่าย สุภาพ เป็นมิตร`;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500); // 6.5s timeout

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: userMessage }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 700,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim()) {
          return {
            success: true,
            replyText: candidateText.trim(),
            source: 'GEMINI_LLM',
          };
        }
      }
    } catch (err: any) {
      console.warn(`Gemini model ${model} failed or timed out:`, err.message);
    }
  }

  // 4. หากเรียก Gemini ทุกตัวไม่สำเร็จ ให้ Fallback ไปยัง Local Knowledge Base
  // เช็กเรื่องวันเวลาก่อน
  const dt = answerDateTimeAndGeneralQuery(userMessage, role);
  if (dt) {
    return {
      success: true,
      replyText: dt.text,
      source: 'DATETIME_ENGINE',
      quickReplies: dt.quickReplies,
    };
  }

  const kbResult = searchKnowledgeBase(userMessage, role);
  if (kbResult) {
    return {
      success: true,
      replyText: kbResult.answer(role, systemContext),
      source: 'LOCAL_KNOWLEDGE_BASE',
      quickReplies: kbResult.quickReplies,
    };
  }

  return {
    success: false,
    replyText: '',
    source: 'LOCAL_KNOWLEDGE_BASE',
  };
}
