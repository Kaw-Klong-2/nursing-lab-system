import { prisma } from '@/lib/prisma';

export async function verifyFeedbackAdmin(actorUserId?: string | null) {
  if (!actorUserId) {
    return { ok: false as const, actor: null };
  }
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, role: true, prefix: true, name: true },
  });
  if (!actor || actor.role !== 'ADMIN') {
    return { ok: false as const, actor: null };
  }
  return { ok: true as const, actor };
}

export function clampStarRating(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Math.round(Number(val));
  if (isNaN(num) || num < 1 || num > 5) return null;
  return num;
}
