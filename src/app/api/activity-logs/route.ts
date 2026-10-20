import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBangkokStartOfDay, getBangkokEndOfDay } from '@/lib/date-time-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = req.headers.get('x-user-id') || searchParams.get('userId');

    // 1. Strict Security Guard: Only ADMIN and OFFICER can access activity logs
    if (!userId) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!requester || (requester.role !== 'ADMIN' && requester.role !== 'OFFICER')) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์เข้าถึงประวัติการทำรายการ (เฉพาะผู้ดูแลระบบและเจ้าหน้าที่ห้องแล็บเท่านั้น)' },
        { status: 403 }
      );
    }

    // 2. Query Filters & Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

    const action = searchParams.get('action'); // e.g. "APPROVE", "CHECKOUT", "RETURN"
    const entityType = searchParams.get('entityType'); // e.g. "BORROW", "REQUISITION"
    const search = searchParams.get('search')?.trim();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }

    if (search) {
      where.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { entityTitle: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = getBangkokStartOfDay(startDate);
      }
      if (endDate) {
        where.createdAt.lte = getBangkokEndOfDay(endDate);
      }
    }

    // 3. Fetch Data & Today's Summary
    const todayStart = getBangkokStartOfDay(new Date());

    const [logs, totalCount, todayCount, todayApprovals, todayCheckouts, todayReturns] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              prefix: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.activityLog.count({ where: { action: 'APPROVE', createdAt: { gte: todayStart } } }),
      prisma.activityLog.count({ where: { action: 'CHECKOUT', createdAt: { gte: todayStart } } }),
      prisma.activityLog.count({ where: { action: 'RETURN', createdAt: { gte: todayStart } } }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        todayCount,
        todayApprovals,
        todayCheckouts,
        todayReturns,
      },
    });
  } catch (error: any) {
    console.error('Failed to get activity logs:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการดึงประวัติการทำรายการ' },
      { status: 500 }
    );
  }
}
