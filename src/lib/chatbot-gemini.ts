/**
 * โมดูลเชื่อมต่อ Google Gemini AI (AI Front-End Brain)
 * รองรับโมเดล gemini-3.5-flash-lite, gemini-3.5-flash พร้อมระบบ Timeout และ Fallback อัตโนมัติ 100%
 */

import { searchKnowledgeBase, answerDateTimeAndGeneralQuery } from './chatbot-knowledge';

export interface GeminiChatResponse {
  success: boolean;
  replyText: string;
  source: 'GEMINI_LLM' | 'LOCAL_KNOWLEDGE_BASE' | 'DATETIME_ENGINE';
  suggestedAction?: string;
  quickReplies?: Array<{ label: string; textToSend: string }>;
}

/**
 * เรียกใช้ Google Gemini ผ่าน Native REST API พร้อมระบบ Failover
 */
export async function askGeminiLabBrain(
  userMessage: string,
  currentUser: any,
  contextData?: {
    activeRooms?: Array<{ code: string; name: string; capacity: number }>;
    activeCourses?: Array<{ code: string; name: string; instructorName: string }>;
    activeKits?: Array<{ name: string }>;
  }
): Promise<GeminiChatResponse> {
  const role = (currentUser?.role || 'USER').toUpperCase();
  const userName = currentUser?.name || 'ผู้ใช้งาน';

  // 1. ดักจับคำถามเรื่อง วัน เวลา ปฏิทิน และสถานะเปิดแล็บแบบ 0ms (Deterministic Engine)
  const dtResult = answerDateTimeAndGeneralQuery(userMessage, role);
  if (dtResult) {
    return {
      success: true,
      replyText: dtResult.text,
      source: 'DATETIME_ENGINE',
      quickReplies: dtResult.quickReplies,
    };
  }

  // 2. ดึง API Key จาก Environment Variables
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // 3. หากไม่มี API Key ให้ใช้ Local Knowledge Base
  if (!apiKey) {
    const kbResult = searchKnowledgeBase(userMessage, role);
    if (kbResult) {
      return {
        success: true,
        replyText: kbResult.answer(role, contextData),
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

    if (['ขอบคุณ', 'ขอบใจ', 'thank', 'thanks', 'แต๊งกิ้ว', 'เยี่ยม', 'สุดยอด'].includes(lower)) {
      return {
        success: true,
        replyText: `ยินดีให้บริการเสมอครับคุณ **${userName}**! หากมีข้อสงสัยเรื่องห้องแล็บ การยืม-คืน หรือต้องการความช่วยเหลือเรื่องใด พิมพ์บอกผมได้ตลอดเวลานะครับ ❤️🩺`,
        source: 'LOCAL_KNOWLEDGE_BASE',
      };
    }

    return {
      success: false,
      replyText: '',
      source: 'LOCAL_KNOWLEDGE_BASE',
    };
  }

  // 4. ส่งคำถามให้ Gemini AI คิดคำตอบ (ลอง gemini-3.5-flash-lite ก่อน หากไม่สำเร็จให้ลอง gemini-3.5-flash)
  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
  const nowBkk = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'full', timeStyle: 'medium' });

  const systemPrompt = `คุณคือ "KUNurse+ Lab AI Copilot" ผู้ช่วยประจำระบบห้องปฏิบัติการพยาบาล คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์

ขอบเขตและหน้าที่ของคุณ (สำคัญมาก - ตอบเฉพาะเรื่องที่กำหนดเท่านั้น):
1. ตอบเฉพาะเรื่อง:
   - ข้อมูลและวิธีใช้งานระบบ KUNurse+ Lab (การจองห้อง, การเบิก-ยืมของ, การซ้อมหัตถการ, การสแกน QR Code)
   - ข้อมูลห้องแล็บ, สถานที่ตั้ง, เวลาทำการ, และกฎระเบียบความปลอดภัยในห้องแล็บ
   - เรื่องทั่วไปพื้นฐานในชีวิตประจำวัน เช่น วันที่ปัจจุบัน, เวลา, วันในสัปดาห์ (ข้อมูลเวลาปัจจุบันของระบบคือ: ${nowBkk})
   - หากผู้ใช้ถามเรื่องอื่นที่อยู่นอกเหนือจากระบบห้องแล็บหรือเรื่องทั่วไปพื้นฐาน ให้ปฏิเสธอย่างสุภาพว่า "ขออภัยครับ ผมเป็นผู้ช่วยดูแลระบบห้องปฏิบัติการพยาบาล จึงสามารถให้ข้อมูลได้เฉพาะเรื่องระบบห้องแล็บ ระเบียบการใช้งาน และข้อมูลพื้นฐานเท่านั้นครับ"
2. กฎเหล็กด้านคำศัพท์: บังคับใช้คำว่า "นิสิต" เสมอในทุกกรณี และห้ามใช้คำอื่นที่ผิดระเบียบคณะโดยเด็ดขาด
3. ข้อมูลบริบทของระบบห้องแล็บ:
   - ผู้ใช้งานปัจจุบัน: ชื่อ "${userName}", บทบาทสิทธิ์ "${role}" (USER=นิสิต, TEACHER/APPROVER=อาจารย์, OFFICER=เจ้าหน้าที่, ADMIN=ผู้ดูแลระบบ)
   - สถานที่: ห้องเตรียมการ ชั้น 3 อาคารวิทยบริการ, ห้องปฏิบัติการทักษะ ชั้น 4 (LAB-01 ถึง LAB-06)
   - เวลาทำการ: จันทร์-ศุกร์ 08:30 - 16:30 น. (ปิดเสาร์-อาทิตย์ และวันหยุดราชการ) การคืนของต้องคืนก่อน 16:30 น.
   - ระเบียบสำคัญ: ห้ามใช้ปากกาเขียนผิวหุ่นจำลองเด็ดขาด (หมึกซึมลบไม่ออก), แต่งกายชุดฝึกถูกระเบียบ, ห้ามนำอาหารเข้าห้องแล็บ
   - ระบบสำคัญ: ยืม-เบิก One-Stop, Patient Safety Lock (คนจริงห้ามใช้ของหมดอายุ แต่หุ่น Sim ใช้ได้), จองห้องแล็บและรอบฝึกทักษะพร้อม QR Check-in
   - ห้องปฏิบัติการที่เปิดใช้: ${contextData?.activeRooms?.map((r) => `${r.code} (${r.name}, จุ ${r.capacity} คน)`).join(', ') || 'LAB-01 ถึง LAB-06'}
   - ชุดฝึกหัตถการมาตรฐาน (Kits): ${contextData?.activeKits?.map((k) => k.name).join(', ') || 'ชุดทำแผล, ชุดฉีดยา, ชุดสวนปัสสาวะ, ชุด CPR'}
4. รูปแบบการตอบ:
   - ตอบสั้น กระชับ สุภาพ เป็นมิตร ไม่เวิ่นเว้อ
   - ถ้าถาม "ทำอะไรได้บ้าง" ให้อธิบายฟังก์ชันของระบบตามบทบาทของผู้ใช้ (นิสิต/อาจารย์/เจ้าหน้าที่) สั้นๆ ชัดเจน
   - ถ้าถามวันที่หรือเวลา ให้ตอบอ้างอิงจากเวลาปัจจุบันที่ระบุข้างต้น`;

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
            maxOutputTokens: 600,
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

  // 5. หากเรียก Gemini ทุกตัวไม่สำเร็จ ให้ Fallback ไปยัง Local Knowledge Base
  const kbResult = searchKnowledgeBase(userMessage, role);
  if (kbResult) {
    return {
      success: true,
      replyText: kbResult.answer(role, contextData),
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
