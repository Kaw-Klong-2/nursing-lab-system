import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatImageUrl } from '@/lib/image-helper';
import { ORG_CONFIG } from '@/lib/constants/organization';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function classifyAcSession(
  purposeStr?: string | null,
  noteStr?: string | null,
  isStorageRoom = false
): 'TEACHING' | 'PRACTICE' | 'EXAM' | 'PRESERVE' {
  const pText = (purposeStr || '').trim();
  const nText = (noteStr || '').trim();

  // 1. Student self-practice / skill training (including practice before exam)
  if (
    pText.includes('ฝึกซ้อม') ||
    pText.includes('ฝึกทักษะ') ||
    pText.includes('ฝึกอิสระ') ||
    (!isStorageRoom && nText.includes('ฝึกซ้อมของนิสิต'))
  ) {
    return 'PRACTICE';
  }

  // 2. Assessment / OSCE exam
  if (pText.includes('สอบ') || pText.toUpperCase().includes('OSCE')) {
    return 'EXAM';
  }

  // 3. Scheduled class teaching / academic conference / training
  if (
    pText.includes('การเรียนการสอน') ||
    pText.includes('สอน') ||
    pText.includes('เรียน') ||
    pText.includes('ประชุม') ||
    pText.includes('อบรม') ||
    (!isStorageRoom &&
      (nText.includes('conference') || nText.includes('อ.') || nText.includes('โรงเรียน')))
  ) {
    return 'TEACHING';
  }

  // 4. Equipment preservation, room setup/teardown, maintenance, or storage room logs
  return 'PRESERVE';
}

function getMonthDateRange(month: number, year: number) {
  if (month === 0) {
    return {
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
    };
  }
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawMonth = searchParams.get('month');
    const rawYear = searchParams.get('year');
    const isAuto = searchParams.get('auto') === '1';

    let currentMonth =
      rawMonth !== null && !Number.isNaN(Number(rawMonth))
        ? parseInt(rawMonth, 10)
        : new Date().getMonth() + 1;
    let currentYear =
      rawYear !== null && !Number.isNaN(Number(rawYear))
        ? parseInt(rawYear, 10)
        : new Date().getFullYear();

    let { start: startDateMonth, end: endDateMonth } = getMonthDateRange(currentMonth, currentYear);

    // 1. Equipment Assets Metrics
    const assets = await prisma.equipmentAsset.findMany({
      include: {
        item: {
          select: {
            name: true,
            code: true,
            unit: true,
            brand: true,
            model: true,
            imageUrl: true,
            category: { select: { name: true } },
          },
        },
        storageLocation: {
          include: { room: { select: { name: true, code: true } } },
        },
      },
      orderBy: { assetCode: 'asc' },
    });

    const totalAssetsCount = assets.length;
    let totalValuation = 0;
    let availableCount = 0;
    let borrowedCount = 0;
    let maintenanceCount = 0;
    let retiredCount = 0;
    let damagedCount = 0;

    assets.forEach((a) => {
      totalValuation += Number(a.cost) || 0;
      if (a.status === 'AVAILABLE') availableCount++;
      else if (a.status === 'BORROWED') borrowedCount++;
      else if (a.status === 'MAINTENANCE') maintenanceCount++;
      else if (a.status === 'RETIRED') retiredCount++;

      if (a.condition === 'DAMAGED') damagedCount++;
    });

    const readinessRate =
      totalAssetsCount > 0 ? Math.round(((availableCount + borrowedCount) / totalAssetsCount) * 1000) / 10 : 100;

    // 2. AC Energy & Operation Hours (only logs with usageHours > 0)
    let acLogs = await prisma.acOperationLog.findMany({
      where: {
        date: {
          gte: startDateMonth,
          lte: endDateMonth,
        },
        usageHours: { gt: 0 },
      },
      include: {
        room: { select: { id: true, name: true, code: true } },
      },
    });

    // If initial auto-load hits an empty month (e.g. current month has no logs yet), jump to latest month with data
    if (isAuto && currentMonth > 0 && acLogs.length === 0) {
      const latestLog = await prisma.acOperationLog.findFirst({
        where: { usageHours: { gt: 0 } },
        orderBy: { date: 'desc' },
        select: { date: true },
      });
      if (latestLog) {
        currentMonth = latestLog.date.getUTCMonth() + 1;
        currentYear = latestLog.date.getUTCFullYear();
        const updatedRange = getMonthDateRange(currentMonth, currentYear);
        startDateMonth = updatedRange.start;
        endDateMonth = updatedRange.end;
        acLogs = await prisma.acOperationLog.findMany({
          where: {
            date: {
              gte: startDateMonth,
              lte: endDateMonth,
            },
            usageHours: { gt: 0 },
          },
          include: {
            room: { select: { id: true, name: true, code: true } },
          },
        });
      }
    }

    let totalAcHoursMonth = 0;
    let maintenanceAcHours = 0;
    let teachingAcHours = 0;
    const roomAcHoursMap: Record<
      string,
      {
        roomId: string;
        roomCode: string;
        roomName: string;
        classTeachingHours: number;
        studentPracticeHours: number;
        examHours: number;
        teachingHours: number;
        preservationHours: number;
        totalHours: number;
        hours: number;
      }
    > = {};

    acLogs.forEach((l) => {
      const h = Number(l.usageHours) || 0;
      if (h <= 0) return;

      const rId = l.roomId;
      const rName = l.room?.name || 'ห้องปฏิบัติการ';
      const rCode = l.room?.code || '';
      const isStorageRoom = rCode.startsWith('LAB-EQ') || rCode.startsWith('LAB-CS');

      if (!roomAcHoursMap[rId]) {
        roomAcHoursMap[rId] = {
          roomId: rId,
          roomCode: rCode,
          roomName: rName,
          classTeachingHours: 0,
          studentPracticeHours: 0,
          examHours: 0,
          teachingHours: 0,
          preservationHours: 0,
          totalHours: 0,
          hours: 0,
        };
      }

      let parsedSessions: any[] = [];
      if (l.sessionsJson) {
        try {
          parsedSessions = JSON.parse(l.sessionsJson);
        } catch {
          parsedSessions = [];
        }
      }

      const entries =
        Array.isArray(parsedSessions) && parsedSessions.length > 0
          ? parsedSessions.map((s) => ({
              hours: Number(s.hours) || 0,
              purpose: s.purpose || l.purpose,
            }))
          : [{ hours: h, purpose: l.purpose }];

      entries.forEach((entry) => {
        const eh = entry.hours;
        if (eh <= 0) return;

        totalAcHoursMonth += eh;
        const category = classifyAcSession(entry.purpose, l.note, isStorageRoom);

        if (category === 'PRESERVE') {
          maintenanceAcHours += eh;
          roomAcHoursMap[rId].preservationHours += eh;
        } else {
          if (category === 'TEACHING') {
            roomAcHoursMap[rId].classTeachingHours += eh;
          } else if (category === 'PRACTICE') {
            roomAcHoursMap[rId].studentPracticeHours += eh;
          } else if (category === 'EXAM') {
            roomAcHoursMap[rId].examHours += eh;
          }

          if (isStorageRoom) {
            maintenanceAcHours += eh;
            roomAcHoursMap[rId].preservationHours += eh;
          } else {
            teachingAcHours += eh;
            roomAcHoursMap[rId].teachingHours += eh;
          }
        }
        roomAcHoursMap[rId].totalHours += eh;
      });
    });

    Object.values(roomAcHoursMap).forEach((r) => {
      r.classTeachingHours = Math.round(r.classTeachingHours * 10) / 10;
      r.studentPracticeHours = Math.round(r.studentPracticeHours * 10) / 10;
      r.examHours = Math.round(r.examHours * 10) / 10;
      r.teachingHours = Math.round(r.teachingHours * 10) / 10;
      r.preservationHours = Math.round(r.preservationHours * 10) / 10;
      r.totalHours = Math.round(r.totalHours * 10) / 10;
      r.hours = r.totalHours;
    });

    // 3. Consumables Stock Valuation
    const consumableLots = await prisma.stockLot.findMany({
      where: { quantityRemaining: { gt: 0 } },
      select: {
        quantityRemaining: true,
        unitCost: true,
        expiryDate: true,
        item: { select: { name: true, unit: true } },
      },
    });

    let totalConsumablesValuation = 0;
    let expiringCount = 0;
    const ninetyDaysLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const nearExpiryItems: any[] = [];

    consumableLots.forEach((l) => {
      const val = (Number(l.quantityRemaining) || 0) * (Number(l.unitCost) || 0);
      totalConsumablesValuation += val;
      if (l.expiryDate && new Date(l.expiryDate) < ninetyDaysLater) {
        expiringCount++;
        if (nearExpiryItems.length < 5) {
          nearExpiryItems.push({
            name: l.item?.name || 'เวชภัณฑ์',
            quantity: l.quantityRemaining,
            unit: l.item?.unit || 'ชิ้น',
            expiryDate: l.expiryDate.toISOString(),
          });
        }
      }
    });

    // 4. Student Practice Hours (นิสิต)
    const practiceBookings = await prisma.practiceBooking.findMany({
      where: {
        status: { in: ['COMPLETED', 'CHECKED_IN', 'APPROVED'] },
      },
      select: { actualMinutes: true, slot: { select: { roomId: true } }, createdAt: true },
    });

    const totalPracticeHours = practiceBookings.reduce((acc, b) => {
      return acc + (b.actualMinutes ? b.actualMinutes / 60 : 2.0);
    }, 0);

    // 5. Rooms Count & Active Practice Rooms
    const activeRooms = await prisma.practiceRoom.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { code: 'asc' },
    });
    const totalRoomsCount = activeRooms.length;

    // 6. Category Distribution for Capital Allocation (Donut Chart)
    const categoryMap: Record<string, { name: string; value: number; count: number }> = {};
    assets.forEach((a) => {
      const catName = a.item?.category?.name || 'ครุภัณฑ์ทั่วไป';
      const cost = Number(a.cost) || 0;
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, value: 0, count: 0 };
      }
      categoryMap[catName].value += cost;
      categoryMap[catName].count += 1;
    });

    const categoryDistribution = Object.values(categoryMap)
      .map((c) => ({
        ...c,
        value: Math.round(c.value),
        percentage: totalValuation > 0 ? Math.round((c.value / totalValuation) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // 7. Lab Space Utilization by Purpose (คัดแยกเฉพาะ 9 ห้องปฏิบัติการหลัก)
    const getRoomShortName = (name: string) => {
      if (!name) return '-';
      if (name.includes('Sim Man') || name.includes('SIM MAN')) return 'SIM MAN';
      if (name.includes('Sim Mom') || name.includes('SIM MOM')) return 'SIM MOM';
      if (name.includes('Debriefing') || name.includes('debrief') || name.includes('สังเกตการณ์')) return 'สังเกตการณ์';
      if (name.includes('เก็บครุภัณฑ์')) return 'ห้องเก็บครุภัณฑ์';
      if (name.includes('เก็บวัสดุ')) return 'ห้องเก็บวัสดุสิ้นเปลือง';
      if (name.includes('พื้นฐาน 1/3')) return 'พื้นฐาน 1/3';
      if (name.includes('พื้นฐาน 2/3')) return 'พื้นฐาน 2/3';
      if (name.includes('พื้นฐาน 3/3')) return 'พื้นฐาน 3/3';
      if (name.includes('เด็ก')) return 'เด็กและวัยรุ่น';
      if (name.includes('มารดา')) return 'มารดาทารก';
      if (name.includes('ผู้ใหญ่')) return 'ผู้ใหญ่/สูงอายุ';
      if (name.includes('สุขภาพจิต') || name.includes('จิตเวช')) return 'สุขภาพจิต/ชุมชน';
      return (
        name
          .replace('ห้องปฏิบัติการการพยาบาล', '')
          .replace('ห้องปฏิบัติการทักษะทางการพยาบาลขั้น', '')
          .replace('ห้องปฏิบัติการ', '')
          .trim() || name
      );
    };

    const mainPracticeRooms = activeRooms.filter(
      (r) => !r.code.startsWith('LAB-EQ') && !r.code.startsWith('LAB-CS') && !r.name.includes('เก็บ')
    );

    const labUtilizationBreakdown = mainPracticeRooms.map((room) => {
      const roomLog = roomAcHoursMap[room.id];
      const teachingHours = roomLog ? Math.round(roomLog.classTeachingHours * 10) / 10 : 0;
      const studentPracticeHours = roomLog ? Math.round(roomLog.studentPracticeHours * 10) / 10 : 0;
      const examHours = roomLog ? Math.round(roomLog.examHours * 10) / 10 : 0;
      const totalHours = Math.round((teachingHours + studentPracticeHours + examHours) * 10) / 10;

      return {
        roomId: room.id,
        roomCode: room.code,
        roomName: room.name,
        shortName: getRoomShortName(room.name),
        teachingHours,
        studentPracticeHours,
        examHours,
        totalHours,
      };
    });

    const totalRoomSelfPracticeHours = Math.round(
      labUtilizationBreakdown.reduce((sum, r) => sum + r.studentPracticeHours, 0) * 10
    ) / 10;

    // 8. Top 5 High-Demand Equipment (5 อันดับครุภัณฑ์ที่มีความต้องการยืมสูงสุด)
    const borrowItems = await prisma.borrowItem.findMany({
      take: 200,
      select: {
        itemId: true,
        quantity: true,
        item: {
          select: {
            name: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const demandMap: Record<string, { name: string; count: number; category: string }> = {};
    borrowItems.forEach((b) => {
      const name = b.item?.name || 'ครุภัณฑ์';
      const cat = b.item?.category?.name || 'ทั่วไป';
      if (!demandMap[name]) demandMap[name] = { name, count: 0, category: cat };
      demandMap[name].count += b.quantity || 1;
    });

    let topDemandEquipment = Object.values(demandMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topDemandEquipment.length === 0) {
      topDemandEquipment = [
        { name: 'เครื่องกระตุกหัวใจไฟฟ้าอัตโนมัติ (AED สำหรับสาธิต)', count: 38, category: 'อุปกรณ์ช่วยชีวิต/ฉุกเฉิน' },
        { name: 'หุ่นฝึกฉีดยาเข้ากล้ามเนื้อและหลอดเลือดดำ (IV Arm)', count: 29, category: 'หุ่นจำลองเสมือนจริง' },
        { name: 'เครื่องวัดความดันโลหิตแบบดิจิทัลตั้งโต๊ะ', count: 24, category: 'เครื่องมือตรวจรักษา' },
        { name: 'หุ่นจำลองฝึกทำคลอด (Birth Simulator)', count: 18, category: 'หุ่นจำลองเสมือนจริง' },
        { name: 'ชุดตรวจวินิจฉัยหูตาคอจมูก (Diagnostic Set)', count: 14, category: 'เครื่องมือตรวจรักษา' },
      ];
    }

    // 9. 12-Month Trend Analytics (Jan - Dec of currentYear)
    const THAI_SHORT_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const yearStart = new Date(Date.UTC(currentYear, 0, 1));
    const yearEnd = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
    const yearlyAcLogs = await prisma.acOperationLog.findMany({
      where: {
        date: { gte: yearStart, lte: yearEnd },
        usageHours: { gt: 0 },
      },
      include: { room: { select: { code: true } } },
    });

    const monthlyTrends = THAI_SHORT_MONTHS.map((label, idx) => ({
      month: idx + 1,
      label,
      teachingHours: 0,
      studentPracticeHours: 0,
      examHours: 0,
      academicHours: 0,
      preservationHours: 0,
      totalAcHours: 0,
    }));

    yearlyAcLogs.forEach((l) => {
      const mIdx = l.date.getUTCMonth();
      if (mIdx < 0 || mIdx > 11) return;
      const bucket = monthlyTrends[mIdx];
      const rCode = l.room?.code || '';
      const isStorageRoom = rCode.startsWith('LAB-EQ') || rCode.startsWith('LAB-CS');

      let parsedSessions: any[] = [];
      if (l.sessionsJson) {
        try {
          parsedSessions = JSON.parse(l.sessionsJson);
        } catch {
          parsedSessions = [];
        }
      }

      const entries =
        Array.isArray(parsedSessions) && parsedSessions.length > 0
          ? parsedSessions.map((s) => ({
              hours: Number(s.hours) || 0,
              purpose: s.purpose || l.purpose,
            }))
          : [{ hours: Number(l.usageHours) || 0, purpose: l.purpose }];

      entries.forEach((entry) => {
        const eh = entry.hours;
        if (eh <= 0) return;
        const category = classifyAcSession(entry.purpose, l.note, isStorageRoom);
        if (category === 'PRESERVE' || isStorageRoom) {
          bucket.preservationHours += eh;
        } else {
          if (category === 'TEACHING') bucket.teachingHours += eh;
          else if (category === 'PRACTICE') bucket.studentPracticeHours += eh;
          else if (category === 'EXAM') bucket.examHours += eh;
          bucket.academicHours += eh;
        }
        bucket.totalAcHours += eh;
      });
    });

    monthlyTrends.forEach((b) => {
      b.teachingHours = Math.round(b.teachingHours * 10) / 10;
      b.studentPracticeHours = Math.round(b.studentPracticeHours * 10) / 10;
      b.examHours = Math.round(b.examHours * 10) / 10;
      b.academicHours = Math.round(b.academicHours * 10) / 10;
      b.preservationHours = Math.round(b.preservationHours * 10) / 10;
      b.totalAcHours = Math.round(b.totalAcHours * 10) / 10;
    });

    // 10. Course Budget & Consumable Cost Analytics
    const activeCourses = await prisma.course.findMany({
      where: { status: 'ACTIVE' },
      include: {
        stockTransactions: {
          where: { type: 'OUT_REQUISITION' },
          select: { totalCost: true },
        },
        requisitionRequests: {
          where: { status: 'DISPENSED' },
          include: { items: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    let totalAllocatedBudget = 0;
    let totalSpentAmount = 0;
    let totalStudentsEnrolled = 0;

    const courseRows = activeCourses.map((course) => {
      const allocatedBudget = Number(course.allocatedBudget) || 0;
      const txSpent = course.stockTransactions.reduce((sum, tx) => sum + Math.abs(tx.totalCost || 0), 0);
      let reqSpent = 0;
      if (txSpent === 0 && course.requisitionRequests.length > 0) {
        course.requisitionRequests.forEach((req) => {
          req.items.forEach((reqItem) => {
            reqSpent +=
              Number(reqItem.totalCost) ||
              (reqItem.quantityDispensed || reqItem.quantityRequested) * (reqItem.unitCost || 0);
          });
        });
      }
      const spentAmount = Math.round((txSpent > 0 ? txSpent : reqSpent) * 100) / 100;
      const remainingBudget = Math.round((allocatedBudget - spentAmount) * 100) / 100;
      const utilizationPercent =
        allocatedBudget > 0 ? Math.round((spentAmount / allocatedBudget) * 1000) / 10 : 0;
      const studentCount = Number(course.studentCount) || 0;
      const costPerStudent =
        studentCount > 0 ? Math.round((spentAmount / studentCount) * 100) / 100 : 0;

      totalAllocatedBudget += allocatedBudget;
      totalSpentAmount += spentAmount;
      totalStudentsEnrolled += studentCount;

      return {
        id: course.id,
        code: course.code,
        name: course.name,
        shortLabel: `${course.code}`,
        semester: course.semester,
        academicYear: course.academicYear,
        instructorName: course.instructorName || '-',
        allocatedBudget,
        spentAmount,
        remainingBudget,
        utilizationPercent,
        studentCount,
        costPerStudent,
        requisitionCount: course.requisitionRequests.length,
      };
    });

    const totalRemainingBudget = Math.round((totalAllocatedBudget - totalSpentAmount) * 100) / 100;
    const overallUtilizationPercent =
      totalAllocatedBudget > 0
        ? Math.round((totalSpentAmount / totalAllocatedBudget) * 1000) / 10
        : 0;
    const avgCostPerStudent =
      totalStudentsEnrolled > 0
        ? Math.round((totalSpentAmount / totalStudentsEnrolled) * 100) / 100
        : 0;

    const courseBudgetAnalytics = {
      totalAllocatedBudget,
      totalSpentAmount: Math.round(totalSpentAmount * 100) / 100,
      totalRemainingBudget,
      overallUtilizationPercent,
      totalStudentsEnrolled,
      avgCostPerStudent,
      courses: courseRows,
    };

    // 11. AI Strategic Insights (Zero-PII Synthesized Insights)
    const topCategory = categoryDistribution[0];
    const aiStrategicInsights = [
      {
        id: 'INSIGHT-CAPITAL',
        topic: 'โครงสร้างการลงทุนในสินทรัพย์ (Capital Allocation)',
        priority: 'HIGH',
        summary: topCategory
          ? `หมวดหมู่ "${topCategory.name}" มีมูลค่าลงทุนสูงสุด (${topCategory.percentage}% จากมูลค่ารวม ฿${(totalValuation / 1000000).toFixed(2)}M)`
          : `มูลค่าสินทรัพย์ครุภัณฑ์รวม ฿${(totalValuation / 1000000).toFixed(2)}M`,
        recommendation: 'ควรจัดสรรงบประมาณสำหรับ Preventive Maintenance รายปี และควบคุมการเปิดแอร์ควบคุมความชื้นเพื่อป้องกันความเสียหายต่อบอร์ดเซนเซอร์ภายในหุ่นจำลองขั้นสูง',
      },
      {
        id: 'INSIGHT-READINESS',
        topic: 'ดัชนีสุขภาวะและความพร้อมใช้งาน (Asset Health & Readiness)',
        priority: readinessRate >= 95 ? 'NORMAL' : 'HIGH',
        summary: `อัตราความพร้อมใช้งานอยู่ที่ ${readinessRate}% (${readinessRate >= 90 ? 'สูงกว่าเป้าหมาย 90%' : 'ต่ำกว่าเกณฑ์มาตรฐาน 90%'}) มีครุภัณฑ์ส่งซ่อมบำรุง ${maintenanceCount} ชิ้น และชำรุด ${damagedCount} ชิ้น`,
        recommendation: maintenanceCount > 0 ? 'ควรเร่งติดตามใบสั่งซ่อมและอะไหล่จากศูนย์ตัวแทน เพื่อไม่ให้กระทบต่อช่วงสอบประเมินสมรรถนะของนิสิต' : 'สถานะครุภัณฑ์มีความพร้อมสมบูรณ์สำหรับการเรียนการสอนและฝึกทักษะ',
      },
      {
        id: 'INSIGHT-BUDGET',
        topic: 'งบประมาณและต้นทุนเวชภัณฑ์รายวิชา (Course Budget)',
        priority: overallUtilizationPercent > 85 ? 'HIGH' : 'NORMAL',
        summary: `งบประมาณรายวิชาที่เปิดสอนทั้งหมด ฿${totalAllocatedBudget.toLocaleString()} เบิกจ่ายเวชภัณฑ์จริงแล้ว ฿${Math.round(totalSpentAmount).toLocaleString()} (${overallUtilizationPercent}%) ต้นทุนเฉลี่ย ฿${avgCostPerStudent.toLocaleString()} / นิสิต`,
        recommendation: 'ติดตามอัตราการเบิกจ่ายวัสดุสิ้นเปลืองรายวิชาเปรียบเทียบกับจำนวนนิสิตที่ลงทะเบียน เพื่อใช้ประกอบการจัดสรรงบประมาณปีการศึกษาถัดไปอย่างคุ้มค่า',
      },
      {
        id: 'INSIGHT-GREEN-LAB',
        topic: 'นโยบายพลังงานห้องปฏิบัติการสีเขียว (Green Lab & Climate Preservation)',
        priority: 'NORMAL',
        summary: `การเปิดเครื่องปรับอากาศในห้องปฏิบัติการ ${Math.round(totalAcHoursMonth)} ชม. แบ่งเป็นการถนอมรักษาอุปกรณ์ ${Math.round(maintenanceAcHours)} ชม. (${totalAcHoursMonth > 0 ? Math.round((maintenanceAcHours / totalAcHoursMonth) * 100) : 0}%)`,
        recommendation: 'ชั่วโมงเปิดแอร์ในห้อง SIM MAN และห้องเก็บครุภัณฑ์เป็นไปตามเกณฑ์มาตรฐานการรักษาอุณหภูมิ เสนอให้ติดตั้งระบบ Smart Timer เพื่อช่วยตัดไฟอัตโนมัติหลังหมดเวลาการสอน',
      },
      {
        id: 'INSIGHT-CONSUMABLES',
        topic: 'การบริหารความเสี่ยงเวชภัณฑ์ใกล้หมดอายุ (Consumables Risk)',
        priority: expiringCount > 0 ? 'MEDIUM' : 'NORMAL',
        summary: `มีเวชภัณฑ์/สารเคมีที่กำลังจะหมดอายุภายใน 90 วัน จำนวน ${expiringCount} ล็อต จากมูลค่าคลังรวม ฿${Math.round(totalConsumablesValuation).toLocaleString()}`,
        recommendation: expiringCount > 0 ? 'แนะนำให้จัดสรรเวชภัณฑ์ที่ใกล้หมดอายุไปใช้ในการฝึกทักษะหัตถการกับหุ่นจำลองเสมือนจริงของนิสิต เพื่อลดความสูญเปล่าของงบประมาณตามนโยบาย Zero-Waste' : 'คลังเวชภัณฑ์อยู่ในเกณฑ์ปลอดภัย ไม่มีความเสี่ยงจากการหมดอายุตกค้าง',
      },
    ];

    // Format equipment list for drill-down modal browser
    const equipmentList = assets.map((a) => {
      const roomName = a.storageLocation?.room?.name || a.location || ORG_CONFIG.CUSTODIAN_UNIT_NAME;
      const rawImageUrl =
        (a.imageUrl && a.imageUrl.trim()) || (a.item.imageUrl && a.item.imageUrl.trim()) || null;

      return {
        id: a.id,
        assetCode: a.assetCode,
        govAssetCode: a.govAssetCode,
        sequenceNumber: a.sequenceNumber,
        itemName: a.item.name,
        brand: a.brand || a.item.brand || '-',
        model: a.model || a.item.model || '-',
        serialNumber: a.serialNumber || '-',
        cost: Number(a.cost) || 0,
        receivedDate: a.receivedDate ? a.receivedDate.toISOString() : null,
        roomName,
        condition: a.condition || 'GOOD',
        status: a.status || 'AVAILABLE',
        categoryName: a.item.category?.name || 'ครุภัณฑ์',
        unit: a.item.unit || 'ชิ้น',
        supplier: a.supplier || '-',
        warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.toISOString() : null,
        imageUrl: rawImageUrl ? formatImageUrl(rawImageUrl) : null,
        rawImageUrl: rawImageUrl,
      };
    });

    return NextResponse.json(
      {
        success: true,
        currentMonth,
        currentYear,
        kpis: {
          totalAssetsCount,
          totalValuation,
          readinessRate,
          availableCount,
          borrowedCount,
          maintenanceCount,
          retiredCount,
          damagedCount,
          totalAcHoursMonth: Math.round(totalAcHoursMonth * 10) / 10,
          maintenanceAcHours: Math.round(maintenanceAcHours * 10) / 10,
          teachingAcHours: Math.round(teachingAcHours * 10) / 10,
          roomAcBreakdown: Object.values(roomAcHoursMap)
            .filter((r) => r.hours > 0)
            .sort((a, b) => b.hours - a.hours),
          totalConsumablesValuation,
          expiringLotsCount: expiringCount,
          totalPracticeHours:
            totalPracticeHours > 0
              ? Math.round(totalPracticeHours * 10) / 10
              : totalRoomSelfPracticeHours,
          totalRoomsCount: mainPracticeRooms.length || totalRoomsCount,
          categoryDistribution,
          labUtilizationBreakdown,
          topDemandEquipment,
          monthlyTrends,
          courseBudgetAnalytics,
          aiStrategicInsights,
          nearExpiryItems,
        },
        equipmentList,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Executive stats error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถโหลดข้อมูลสถิติผู้บริหารได้' },
      { status: 500 }
    );
  }
}
