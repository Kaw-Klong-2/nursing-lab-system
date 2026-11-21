import crypto from 'crypto';

function readEnvVar(key: string): string | undefined {
  const processVal = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  if (processVal && processVal.trim()) {
    return processVal.trim();
  }
  try {
    const cfGlobal = (globalThis as unknown as Record<symbol, unknown>)[
      Symbol.for('__cloudflare-context__')
    ] as { env?: Record<string, unknown> } | undefined;
    const cfVal = cfGlobal?.env?.[key];
    if (typeof cfVal === 'string' && cfVal.trim()) {
      return cfVal.trim();
    }
  } catch {
    // ignore missing Cloudflare runtime global context
  }
  return undefined;
}

function getApprovalSecret(): Buffer {
  const candidates: Array<[string, string]> = [
    ['approval', 'APPROVAL_SECRET'],
    ['session', 'SESSION_SECRET'],
    ['sync', 'EXTERNAL_SYNC_API_KEY'],
    ['db', 'DATABASE_URL'],
    ['direct', 'DIRECT_URL'],
  ];

  let material: string | null = null;
  for (const [prefix, envKey] of candidates) {
    const val = readEnvVar(envKey);
    if (val) {
      material = `${prefix}:${val}`;
      break;
    }
  }

  if (!material) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      material = 'dev-only-approval-secret-not-for-prod';
    } else {
      throw new Error('APPROVAL_SECRET (or SESSION_SECRET) must be configured in production');
    }
  }

  return crypto
    .createHash('sha256')
    .update(`kunurse-approval-hmac-v1:${material}`)
    .digest();
}

export function generateSignedApprovalToken(
  id: string,
  type: string,
  action: string,
  expiresInHours: number = 72
): string {
  const secret = getApprovalSecret();
  const expiresAt = Date.now() + expiresInHours * 3600 * 1000;
  const payload = [id, type, action, expiresAt].join(':');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const fullData = [payload, signature].join(':');
  return Buffer.from(fullData).toString('base64url');
}

export function verifySignedApprovalToken(token: string): {
  valid: boolean;
  id?: string;
  type?: string;
  action?: string;
  error?: string;
} {
  try {
    const secret = getApprovalSecret();
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 5) {
      return { valid: false, error: 'รูปแบบ Token ไม่ถูกต้อง' };
    }

    const [id, type, action, expStr, providedSignature] = parts;
    const expiresAt = parseInt(expStr, 10);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { valid: false, error: 'ลิงก์การอนุมัตินี้หมดอายุแล้ว (เกินกำหนด 72 ชั่วโมง)' };
    }

    const expectedPayload = [id, type, action, expiresAt].join(':');
    const expectedSignature = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex');

    const providedBuf = Buffer.from(providedSignature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const isSigMatch =
      providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);

    if (!isSigMatch) {
      return { valid: false, error: 'ลายเซ็นดิจิทัลไม่ถูกต้อง ลิงก์อาจถูกดัดแปลง' };
    }

    return {
      valid: true,
      id,
      type,
      action,
    };
  } catch {
    return { valid: false, error: 'ไม่สามารถตรวจสอบความถูกต้องของ Token ได้' };
  }
}
