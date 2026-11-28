import { prisma } from '@/lib/prisma';
import { processChatbotTurn } from '@/lib/chatbot-engine';
import { requireActiveActor } from '@/lib/viewer-guard';
import { getAiCopilotConfigForActor } from '@/lib/chatbot-briefing';

export const dynamic = 'force-dynamic';

function encodeSseEvent(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

export async function POST(req: Request) {
  const auth = await requireActiveActor(req);
  if (auth.errorResponse) return auth.errorResponse;

  const currentUser = await prisma.user.findUnique({
    where: { id: auth.actor.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      isExecutive: true,
    },
  });

  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'ไม่พบข้อมูลผู้ใช้งาน' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const config = await getAiCopilotConfigForActor(currentUser.role);
  if (!config.canUseCopilot) {
    return new Response(
      JSON.stringify({ error: 'ผู้ดูแลระบบยังไม่เปิดใช้งานผู้ช่วย AI Copilot สำหรับบทบาทของท่าน' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message, sessionState, modelMode, confirmAction } = body;
  if ((!message || typeof message !== 'string') && !confirmAction) {
    return new Response(JSON.stringify({ error: 'กรุณาระบุข้อความ' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encodeSseEvent('status', {
            message: confirmAction
              ? 'กำลังประมวลผลคำยืนยัน...'
              : modelMode === 'deep'
              ? '🧠 กำลังเปิดโหมดคิดวิเคราะห์เชิงลึก...'
              : '⚡ กำลังเตรียมคำตอบ...',
          })
        );

        const response = await processChatbotTurn(message || '', sessionState || null, currentUser, {
          modelMode: modelMode === 'deep' || modelMode === 'fast' ? modelMode : config.defaultModelMode,
          confirmAction: confirmAction === 'CONFIRM' || confirmAction === 'CANCEL' ? confirmAction : undefined,
          onProgress: (evt) => {
            if (evt.type === 'status' && evt.message) {
              controller.enqueue(
                encodeSseEvent('status', { message: evt.message, tool: evt.tool })
              );
            }
          },
        });

        // ส่งข้อความไหลแบบเรียลไทม์ (Progressive Streaming Delta)
        const fullText = response.replyText || '';
        const chunkSize = 28;
        for (let i = 0; i < fullText.length; i += chunkSize) {
          controller.enqueue(
            encodeSseEvent('delta', { text: fullText.slice(i, i + chunkSize) })
          );
          if (fullText.length > chunkSize && i + chunkSize < fullText.length) {
            await new Promise((resolve) => setTimeout(resolve, 12));
          }
        }

        controller.enqueue(encodeSseEvent('done', response));
      } catch (err: any) {
        console.error('Error in POST /api/chatbot/stream:', err);
        controller.enqueue(
          encodeSseEvent('error', {
            error: err?.message || 'เกิดข้อผิดพลาดในการประมวลผล',
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
