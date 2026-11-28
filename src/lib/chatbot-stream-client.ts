import { AiModelMode, ChatSessionState, ChatbotTurnResponse } from '@/types/chatbot';

export interface StreamChatbotParams {
  message: string;
  sessionState: ChatSessionState | null;
  modelMode: AiModelMode;
  confirmAction?: 'CONFIRM' | 'CANCEL';
  onStatus?: (statusMessage: string) => void;
  onDelta?: (deltaText: string) => void;
}

/**
 * เรียก API Streaming SSE (/api/chatbot/stream) และแยก Event แบบเรียลไทม์
 */
export async function streamChatbotTurn(params: StreamChatbotParams): Promise<ChatbotTurnResponse> {
  const res = await fetch('/api/chatbot/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      sessionState: params.sessionState,
      modelMode: params.modelMode,
      confirmAction: params.confirmAction,
    }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ (${res.status})`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream') || !res.body) {
    return (await res.json()) as ChatbotTurnResponse;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalResponse: ChatbotTurnResponse | null = null;

  const processBlock = (block: string) => {
    const lines = block.split(/\r?\n/);
    let eventName = 'message';
    let dataStr = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataStr += line.slice(5).trim();
      }
    }

    if (!dataStr) return;
    let parsed: any;
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      return;
    }

    if (eventName === 'status' && parsed?.message) {
      params.onStatus?.(parsed.message);
    } else if (eventName === 'delta' && typeof parsed?.text === 'string') {
      params.onDelta?.(parsed.text);
    } else if (eventName === 'done') {
      finalResponse = parsed as ChatbotTurnResponse;
    } else if (eventName === 'error') {
      throw new Error(parsed?.error || 'เกิดข้อผิดพลาดระหว่างประมวลผล');
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';
      for (const blk of blocks) {
        if (blk.trim()) processBlock(blk);
      }
    }
    if (done) break;
  }

  if (buffer.trim()) {
    processBlock(buffer);
  }

  if (!finalResponse) {
    throw new Error('ไม่ได้รับผลลัพธ์สุดท้ายจากเซิร์ฟเวอร์');
  }

  return finalResponse;
}
