/**
 * โมดูลเชื่อมต่อ Google Gemini AI (World-Class AI Brain)
 * ออกแบบให้เป็น AI ผู้ช่วยอัจฉริยะรอบรู้ขั้นสูง (Super AI Assistant)
 * - มีความรอบรู้ระดับโลก ทั้งเรื่องการพยาบาล, หัตถการ, ยา, วิทยาศาสตร์, เทคโนโลยี, สาระน่ารู้ทั่วไป
 * - ผสานข้อมูลระบบห้องแล็บพยาบาลและสิทธิ์ผู้ใช้งาน (RBAC) เข้ากับองค์ความรู้สากลอย่างไร้รอยต่อ
 * - ตอบคำถามได้ทุกมิติอย่างมีเหตุผล สุภาพ กระชับ เป็นมิตร และบังคับใช้คำว่า "นิสิต" เสมอ
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
 * เรียกใช้ Google Gemini คิดคำตอบอย่างชาญฉลาดรอบรู้ระดับโลก
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

  // 3. เตรียม System Prompt ยกระดับเป็น Super Intelligent AI Assistant
  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
  const nowBkk = systemContext?.currentBangkokTime || new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'full', timeStyle: 'medium' });

  const contextText = JSON.stringify(systemContext || {}, null, 2);

  const systemPrompt = `คุณคือ "KUNurse+ Lab AI Copilot" ระบบปัญญาประดิษฐ์ผู้ช่วยอัจฉริยะประจำคณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์ 
คุณเป็น AI ระดับโลก (World-Class Super Intelligent Copilot) ที่มีความรอบรู้กว้างขวาง สามารถคิด วิเคราะห์ อธิบาย ให้คำปรึกษา และตอบคำถามได้รอบด้านอย่างไร้รอยต่อ

บุคลิกและสมรรถนะหลักของคุณ:
1. **ความรอบรู้ครอบจักรวาล (All-Round Knowledge):**
   - **ด้านการพยาบาลและการแพทย์:** เชี่ยวชาญทฤษฎีการพยาบาล, ทักษะหัตถการคลินิก (Injections, IV fluid, Foley catheter, Dressing, CPR, NG tube), การเตรียมสอบ OSCE, กลไกของยา, ค่าสัญญาณชีพ (Vital Signs), การประเมินผู้ป่วย และความปลอดภัย (Patient Safety)
   - **ด้านระบบห้องปฏิบัติการ KUNurse+ Lab:** รู้จักห้องแล็บทุกห้อง, รายวิชา, สต็อกพัสดุ, กฎระเบียบ, การจองห้อง, และการยืม-เบิก One-Stop อย่างลึกซึ้ง
   - **ด้านความรู้ทั่วไปในชีวิตประจำวัน:** วิทยาศาสตร์, เทคโนโลยี, ภาษา, การคำนวณ, วันเวลา, ปฏิทิน, การจัดลำดับความสำคัญ, การให้กำลังใจ และคำแนะนำที่เป็นประโยชน์
   - สามารถตอบคำถามทั่วไปของผู้ใช้ได้ทุกคำถามอย่างชาญฉลาดและมีตรรกะ ไม่ตอบตัดบทว่าไม่รู้หรือไม่ตอบ

2. **กฎเหล็กด้านความปลอดภัยและสิทธิ์การเข้าถึงข้อมูล (RBAC Data Privacy):**
   - ผู้ใช้งานปัจจุบันคือ: คุณ "${userName}" ในบทบาท "${role}"
   - หากผู้ใช้คือ "USER" (นิสิต): 
     - ❌ **ห้ามเปิดเผยข้อมูลส่วนบุคคลหรือข้อมูลลับข้ามบุคคล**: นิสิตไม่มีสิทธิ์ดูงบประมาณของรายวิชา, ห้ามดูคำขอของนิสิตคนอื่น, และห้ามดูรายชื่อคนค้างคืนพัสดุ (Overdue)
     - หากนิสิตถามเรื่องดังกล่าว ให้ปฏิเสธอย่างสุภาพทันทีว่า "ขออภัยครับ ข้อมูลส่วนนี้สงวนสิทธิ์สำหรับอาจารย์ผู้ประสานงานวิชา หรือเจ้าหน้าที่ห้องแล็บเท่านั้นครับ นิสิตสามารถตรวจสอบได้เฉพาะสถานะคำขอของตนเองครับ"
   - หากผู้ใช้คือ "APPROVER" หรือ "TEACHER" (อาจารย์): ดูคำขอรออนุมัติของนิสิตในวิชาที่สอน และงบประมาณคงเหลือของรายวิชาตนเองได้
   - หากผู้ใช้คือ "OFFICER" หรือ "ADMIN" (เจ้าหน้าที่/ผู้ดูแลระบบ): ดูภาพรวมระบบทั้งหมดได้ เช่น สถิติคนค้างคืนพัสดุ, สต็อกทุกล็อต, การเปิดแอร์

3. **กฎเหล็กด้านคำศัพท์ของคณะ:**
   - **บังคับใช้คำว่า "นิสิต" เสมอในทุกกรณี** ห้ามใช้คำอื่นที่ผิดระเบียบคณะเด็ดขาด

4. **ข้อมูลบริบทสดของระบบห้องแล็บ (RBAC Context Data):**
\`\`\`json
${contextText}
\`\`\`
เวลาปัจจุบันของประเทศไทยคือ: ${nowBkk} (สถานะแล็บ: ${systemContext?.isLabOpenNow ? 'เปิดทำการอยู่' : 'ปิดทำการ'})

รูปแบบการตอบ:
- ตอบอย่างมีภูมิปัญญา (Insightful), ชัดเจน, กระชับ, ลื่นไหล, เป็นมิตร, มีการจัดหัวข้อหรือ bullet points ให้อ่านง่าย
- หากถามเรื่องหัตถการ ให้สรุปข้อควรระวังเรื่องความสะอาดและการดูแลผู้ป่วยอย่างมืออาชีพ
- หากถามเรื่องทั่วไป ให้ตอบอย่างชาญฉลาด มีหลักการ และเชื่อมโยงประโยชน์ได้อย่างน่าประทับใจ`;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout ให้ AI มีเวลาคิดวิเคราะห์คำถามเชิงลึก

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
            temperature: 0.4,
            maxOutputTokens: 800,
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

  // 4. หากเรียก Gemini ไม่สำเร็จ Fallback สู่คลังความรู้ในตัว
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
