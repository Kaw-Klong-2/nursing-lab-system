import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBangkokParts } from '@/lib/date-time-utils';

export const dynamic = 'force-dynamic';

// API Key สำหรับระบบภายนอกดึงข้อมูลตารางห้อง
const SYNC_API_KEY =
  process.env.EXTERNAL_SYNC_API_KEY || 'lab_nursing_sync_key_2026_sec';

// CORS Headers เพื่อให้ฝั่งโน้นเรียกใช้งานได้ทั้งจาก Server และ Client
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. ตรวจสอบความถูกต้องของ API Key
    const apiKeyHeader =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const apiKeyQuery = searchParams.get('api_key');
    const providedKey = apiKeyHeader || apiKeyQuery;

    if (!providedKey || providedKey !== SYNC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Invalid or missing API key in x-api-key header',
        },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // 2. Query Parameters Filters
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const startDateParam = searchParams.get('start_date'); // YYYY-MM-DD
    const endDateParam = searchParams.get('end_date'); // YYYY-MM-DD
    const monthParam = searchParams.get('month'); // 1 - 12
    const yearParam = searchParams.get('year'); // 2026
    const roomCodeParam = searchParams.get('room_code'); // LAB-SIM-01 etc.
    const rawStatusParam = searchParams.get('status')?.trim();
    let statusParam = rawStatusParam?.toUpperCase();
    const typeParam = searchParams.get('type')?.trim().toLowerCase(); // timetable, general, booking, all

    // Map common Thai / alternate status aliases
    if (statusParam === 'รออนุมัติ' || statusParam === 'WAITING') {
      statusParam = 'PENDING';
    } else if (statusParam === 'อนุมัติแล้ว' || statusParam === 'อนุมัติ') {
      statusParam = 'APPROVED';
    }

    const where: any = {};

    // กรองประเภท: ตารางเรียน (timetable) vs การจองห้องปกติ (general/booking)
    if (typeParam === 'timetable') {
      where.isTimetable = true;
    } else if (typeParam === 'general' || typeParam === 'booking') {
      where.isTimetable = false;
    }

    // กรองสถานะ (Default: ทั้ง APPROVED และ PENDING เพื่อให้ฝั่งโน้นเห็นทั้งที่อนุมัติแล้วและกำลังรอพิจารณา)
    if (!statusParam || statusParam === 'ALL') {
      where.status = { in: ['APPROVED', 'PENDING'] };
    } else if (statusParam.includes(',')) {
      const statuses = statusParam.split(',').map((s) => s.trim().toUpperCase());
      where.status = { in: statuses };
    } else {
      where.status = statusParam;
    }

    // กรองเฉพาะห้องที่เปิดใช้งาน (isActive: true)
    if (roomCodeParam) {
      where.room = {
        isActive: true,
        OR: [
          { code: { equals: roomCodeParam, mode: 'insensitive' } },
          { code: { startsWith: roomCodeParam, mode: 'insensitive' } },
        ],
      };
    } else {
      where.room = {
        isActive: true,
      };
    }

    // กรองตามวันที่
    if (dateParam) {
      const [y, m, d] = dateParam.slice(0, 10).split('-').map(Number);
      const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const nextDate = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));

      where.bookingDate = {
        gte: targetDate,
        lt: nextDate,
      };
    } else if (startDateParam && endDateParam) {
      const [sy, sm, sd] = startDateParam.slice(0, 10).split('-').map(Number);
      const sDate = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
      const [ey, em, ed] = endDateParam.slice(0, 10).split('-').map(Number);
      const eDate = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

      where.bookingDate = {
        gte: sDate,
        lte: eDate,
      };
    } else if (monthParam && yearParam) {
      const y = parseInt(yearParam, 10);
      const m = parseInt(monthParam, 10) - 1;
      const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

      where.bookingDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else {
      // หากไม่ระบุวันที่ ให้ดึงตั้งแต่วันนี้เป็นต้นไป (ล่วงหน้า 60 วัน) ตามปฏิทินไทย
      const bkkNow = getBangkokParts(new Date());
      const today = new Date(Date.UTC(bkkNow.year, bkkNow.month - 1, bkkNow.day, 0, 0, 0, 0));
      const next60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000 + 86399999);

      where.bookingDate = {
        gte: today,
        lte: next60Days,
      };
    }

    // 3. ดึงข้อมูลจากฐานข้อมูลแล็บ
    const bookings = await prisma.roomBooking.findMany({
      where,
      include: {
        room: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            phone: true,
            role: true,
            department: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            targetYear: true,
            semester: true,
            academicYear: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
    });

    // 4. แปลงข้อมูล (Field Mapping) ให้ตรงกับโครงสร้างของระบบปลายทาง 100%
    const formattedData = bookings.map((b) => {
      // แปลง booking_type
      let bookingType = 'academic';
      const p = (b.purpose || '').toLowerCase();
      if (p.includes('ประชุม') || p.includes('meeting')) {
        bookingType = 'meeting';
      } else if (p.includes('กิจกรรม') || p.includes('event')) {
        bookingType = 'event';
      }

      // แปลง requester_type (บุคลากร / นิสิต)
      const userRole = b.user?.role || 'USER';
      const isPersonnel = ['TEACHER', 'OFFICER', 'ADMIN', 'EXECUTIVE', 'APPROVER'].includes(userRole);
      const requesterType = isPersonnel ? 'personnel' : 'guest';

      // แปลงวันที่ YYYY-MM-DD
      const bDate = new Date(b.bookingDate);
      const dateString = bDate.toISOString().split('T')[0];

      // แปลงเวลาให้มีวินาที HH:mm:ss
      const formatTime = (t: string) => {
        if (!t) return '00:00:00';
        const parts = t.split(':');
        if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
        return t;
      };

      // แปลงอุปกรณ์ที่ขอใช้เป็น Array
      const equipmentArray = b.equipmentNeeded
        ? b.equipmentNeeded.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean)
        : [];

      // สร้าง Deep Link สำหรับกดเด้งกลับมาระบบแล็บ
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'https://nursing-lab-system.vercel.app';
      const deepLinkUrl = `${baseUrl}/rooms?bookingNumber=${encodeURIComponent(b.bookingNumber)}`;

      return {
        // ข้อมูลหลักสำหรับตาราง room_bookings
        id: b.id,
        booking_code: b.bookingNumber,
        is_timetable: b.isTimetable,
        schedule_type: b.isTimetable ? 'timetable' : 'general_booking',
        schedule_type_th: b.isTimetable ? 'ตารางเรียน' : 'การจองทั่วไป',
        category: b.isTimetable ? 'TIMETABLE' : 'BOOKING',
        requester_type: requesterType,
        booking_type: b.isTimetable ? 'academic' : bookingType,
        course_code: b.course?.code || null,
        course_name: b.course
          ? (b.course.targetYear ? `${b.course.name} (ชั้นปีที่ ${b.course.targetYear})` : b.course.name)
          : null,
        course_name_raw: b.course?.name || null,
        student_year: b.isTimetable ? (b.course?.targetYear || null) : (b.course?.targetYear || null), // ตรงกับคอลัมน์ student_year (integer) ในตาราง room_bookings
        term_semester: b.course ? `${b.course.semester}/${b.course.academicYear}` : null, // ตรงกับคอลัมน์ term_semester (text) ในตาราง room_bookings เช่น "1/2569"
        course_target_year: b.course?.targetYear || null,
        course_year_level: b.course?.targetYear ? `ชั้นปีที่ ${b.course.targetYear}` : null,
        instructor_name: b.advisorName || null,
        overall_objective: b.isTimetable ? `[ตารางเรียน] ${b.title}` : b.title,
        status: b.status.toLowerCase(), // approved, pending, rejected, cancelled
        status_raw: b.status.toUpperCase(), // APPROVED, PENDING, REJECTED
        booking_status: b.status.toUpperCase(), // APPROVED, PENDING
        status_th:
          b.status === 'APPROVED'
            ? 'อนุมัติแล้ว'
            : b.status === 'PENDING'
            ? 'รออนุมัติ'
            : b.status === 'REJECTED'
            ? 'ไม่อนุมัติ'
            : b.status,
        is_approved: b.status === 'APPROVED',
        is_pending: b.status === 'PENDING',

        // ข้อมูลผู้จอง
        requester_name: b.user?.name || 'ผู้ใช้งาน',
        requester_email: b.user?.email || null,
        requester_phone: b.contactPhone || b.user?.phone || null,
        requester_student_id: b.user?.studentId || null,

        // ข้อมูลห้อง (สำหรับจับคู่กับ room_details)
        room_id: b.roomId,
        room_code: b.room.code, // เช่น LAB-01-1
        base_room_code: b.room.code.replace(/-\d+$/, ''), // เช่น LAB-01
        parent_room_code: b.room.code.replace(/-\d+$/, ''), // เช่น LAB-01
        room_code_aliases: [b.room.code, b.room.code.replace(/-\d+$/, '')],
        room_name: b.room.name, // เช่น ห้องปฏิบัติการพยาบาล 1
        building_location: b.room.location || 'อาคาร 2 คณะพยาบาลศาสตร์',

        // ข้อมูลสล็อตเวลาสำหรับตาราง room_booking_slots
        booking_date: dateString, // 2026-10-15
        start_time: formatTime(b.startTime), // 08:30:00
        end_time: formatTime(b.endTime), // 12:00:00
        slot_objective: b.isTimetable ? `[ตารางเรียน] ${b.title}` : b.title,
        participants: b.attendeesCount || 1,
        equipment_req: equipmentArray,

        // ลิงก์คลิกกลับมาระบบห้องแล็บพยาบาล
        deep_link_url: deepLinkUrl,

        // วันเวลาที่สร้าง
        created_at: b.createdAt.toISOString(),
        updated_at: b.updatedAt.toISOString(),
      };
    });

    // หากระบบปลายทางต้องการ raw array โดยตรง (เช่น ?format=array)
    if (searchParams.get('format') === 'array') {
      return NextResponse.json(formattedData, {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    return NextResponse.json(
      {
        success: true,
        source: 'Nursing Lab System',
        count: formattedData.length,
        filter: {
          type: typeParam || 'ALL',
          status: statusParam || 'ALL',
          room_code: roomCodeParam || 'ALL',
          date: dateParam || 'UPCOMING_60_DAYS',
        },
        data: formattedData,
      },
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  } catch (error: any) {
    console.error('Error exporting external room schedules:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
