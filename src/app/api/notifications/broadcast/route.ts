import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dispatchBroadcastMessage, processScheduledBroadcasts } from '@/lib/notifications';

export async function GET(req: Request) {
  try {
    // ตรวจสอบและประมวลผลประกาศที่ถึงกำหนดเวลาส่ง
    await processScheduledBroadcasts();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // e.g. "SCHEDULED", "SENT", "ALL"
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const broadcasts = await prisma.broadcastMessage.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // SCHEDULED comes first
        { scheduledAt: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // คำนวณจำนวนคนที่อ่านแล้วสำหรับแต่ละรายการที่ส่งออกไปแล้ว
    const enriched = await Promise.all(
      broadcasts.map(async (b) => {
        let readCount = 0;
        if (b.status === 'SENT') {
          readCount = await prisma.notification.count({
            where: {
              entityType: 'BROADCAST',
              entityId: b.id,
              isRead: true,
            },
          });
        }
        return {
          ...b,
          readCount,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('Error fetching broadcast messages:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch broadcasts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      message,
      targetType = 'ALL_STUDENTS',
      targetUserIds = [],
      priority = 'NORMAL',
      linkUrl,
      scheduledAt,
      isScheduled = false,
      authorId,
      authorName,
    } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกหัวข้อและข้อความประกาศ' }, { status: 400 });
    }

    const now = new Date();
    const targetSchedule = isScheduled && scheduledAt ? new Date(scheduledAt) : null;
    const shouldSchedule = Boolean(targetSchedule && targetSchedule > now);

    const record = await prisma.broadcastMessage.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        targetType,
        targetUserIds: Array.isArray(targetUserIds) && targetUserIds.length > 0 ? JSON.stringify(targetUserIds) : null,
        priority: priority || 'NORMAL',
        linkUrl: linkUrl?.trim() || null,
        scheduledAt: targetSchedule,
        status: shouldSchedule ? 'SCHEDULED' : 'PENDING',
        authorId: authorId || null,
        authorName: authorName || 'เจ้าหน้าที่ / แอดมิน',
      },
    });

    // หากส่งทันที ให้เรียก dispatchBroadcastMessage ทันที
    if (!shouldSchedule) {
      const res = await dispatchBroadcastMessage(record.id);
      return NextResponse.json({
        success: true,
        broadcast: record,
        dispatchedCount: res?.count ?? 0,
        mode: 'SENT_IMMEDIATELY',
      });
    }

    return NextResponse.json({
      success: true,
      broadcast: record,
      mode: 'SCHEDULED',
      scheduledAt: targetSchedule,
    });
  } catch (error: any) {
    console.error('Error creating broadcast message:', error);
    return NextResponse.json({ error: error.message || 'Failed to create broadcast' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, action, title, message, targetType, targetUserIds, priority, linkUrl, scheduledAt } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing broadcast id' }, { status: 400 });
    }

    const broadcast = await prisma.broadcastMessage.findUnique({
      where: { id },
    });

    if (!broadcast) {
      return NextResponse.json({ error: 'ไม่พบรายการประกาศที่ต้องการ' }, { status: 404 });
    }

    if (action === 'CANCEL') {
      const updated = await prisma.broadcastMessage.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ success: true, broadcast: updated });
    }

    if (action === 'SEND_NOW') {
      const res = await dispatchBroadcastMessage(id);
      return NextResponse.json({
        success: true,
        dispatchedCount: res?.count ?? 0,
      });
    }

    if (action === 'EDIT') {
      const now = new Date();
      const targetSchedule = scheduledAt ? new Date(scheduledAt) : null;
      const shouldSchedule = Boolean(targetSchedule && targetSchedule > now);

      const updated = await prisma.broadcastMessage.update({
        where: { id },
        data: {
          title: title !== undefined ? title.trim() : broadcast.title,
          message: message !== undefined ? message.trim() : broadcast.message,
          targetType: targetType || broadcast.targetType,
          targetUserIds: Array.isArray(targetUserIds) ? JSON.stringify(targetUserIds) : broadcast.targetUserIds,
          priority: priority || broadcast.priority,
          linkUrl: linkUrl !== undefined ? (linkUrl?.trim() || null) : broadcast.linkUrl,
          scheduledAt: targetSchedule,
          status: shouldSchedule ? 'SCHEDULED' : broadcast.status,
        },
      });

      return NextResponse.json({ success: true, broadcast: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating broadcast message:', error);
    return NextResponse.json({ error: error.message || 'Failed to update broadcast' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing broadcast id' }, { status: 400 });
    }

    await prisma.broadcastMessage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting broadcast message:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete broadcast' }, { status: 500 });
  }
}
