/**
 * โมดูลเชื่อมต่อ Google Gemini 2.0 Flash (AI Front-End Brain)
 * รองรับการตอบคำถามทั่วไป ทำความเข้าใจภาษาไทยทุกสำนวน และมีระบบ Zero-Downtime Fallback อัตโนมัติ
 */

import { searchKnowledgeBase } from './chatbot-knowledge';

export interface GeminiChatResponse {
  success: boolean;
  replyText: string;
  source: 'GEMINI_LLM' | 'LOCAL_KNOWLEDGE_BASE';
  suggestedAction?: string;
}

/**
 * เรียกใช้ Google Gemini 2.0 Flash ผ่าน Native REST API (รวดเร็ว เบา ไม่ต้องลง SDK หนัก)
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
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const role = (currentUser?.role || 'USER').toUpperCase();
  const userName = currentUser?.name || 'ผู้ใช้งาน';

  // 1. หากไม่มี API Key ให้ใช้ Local Knowledge Base ทันทีแบบไร้รอยต่อ
  if (!apiKey) {
    const kbResult = searchKnowledgeBase(userMessage, role);
    if (kbResult) {
      return {
        success: true,
        replyText: kbResult.answer(role, contextData),
        source: 'LOCAL_KNOWLEDGE_BASE',
      };
    }

    // กรณีคำทักทายทั่วไป
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

  // 2. มี GEMINI_API_KEY -> ส่งให้ Gemini 2.0 Flash คิดคำตอบ
  try {
    const systemPrompt = `คุณคือ "KUNurse+ Lab AI Copilot" ผู้ช่วยอัจฉริยะประจำห้องปฏิบัติการทักษะและสถานการณ์จำลองทางการพยาบาล คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์
หน้าที่ของคุณ:
1. ตอบคำถาม ให้ข้อมูล แนะนำการใช้งานระบบ และช่วยเหลือผู้ใช้ด้วยความสุภาพ อบอุ่น เป็นมิตร และมีความเป็นมืออาชีพทางการพยาบาล
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
   - ตอบเป็นภาษาไทยที่กระชับ อ่านง่าย ใช้สัญลักษณ์ Bullet point / ตัวหนา ให้ดูเป็นระเบียบ
   - ถ้าผู้ใช้ถามว่า "ทำอะไรได้บ้าง" หรือ "ช่วยอะไรได้" ให้อธิบายความสามารถหลักตามบทบาทของผู้ใช้ (นิสิต/อาจารย์/เจ้าหน้าที่) พร้อมตัวอย่างประโยคที่พิมพ์สั่งได้
   - ตอบคำถามทั่วไป คำถามเกี่ยวกับระบบ การเตรียมตัวสอบ OSCE และหัตถการพยาบาลได้อย่างถูกต้อง`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    if (!res.ok) {
      console.warn('Gemini API returned error status:', res.status);
      throw new Error(`Gemini API error ${res.status}`);
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (candidateText && candidateText.trim()) {
      return {
        success: true,
        replyText: candidateText.trim(),
        source: 'GEMINI_LLM',
      };
    }

    throw new Error('Empty Gemini response');
  } catch (err: any) {
    console.warn('Fallback to Local Knowledge Base due to Gemini error:', err.message);

    // เมื่อ Gemini ล้มเหลว ถอยกลับมาใช้ Local Knowledge Base
    const kbResult = searchKnowledgeBase(userMessage, role);
    if (kbResult) {
      return {
        success: true,
        replyText: kbResult.answer(role, contextData),
        source: 'LOCAL_KNOWLEDGE_BASE',
      };
    }

    return {
      success: false,
      replyText: '',
      source: 'LOCAL_KNOWLEDGE_BASE',
    };
  }
}
