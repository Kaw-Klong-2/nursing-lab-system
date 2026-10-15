import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Inspecting existing bookings ---');
  const bookings = await prisma.roomBooking.findMany({
    select: {
      id: true,
      bookingNumber: true,
      title: true,
      purpose: true,
      note: true,
      isTimetable: true,
      courseId: true,
      course: {
        select: {
          code: true,
          name: true,
          targetYear: true,
        },
      },
    },
  });

  console.log(`Total bookings found: ${bookings.length}`);

  let timetableCount = 0;
  let generalCount = 0;

  for (const b of bookings) {
    const isExplicitTestBooking =
      b.title.includes('ทดสอบ') ||
      b.title.includes('เชื่อมข้อมูล') ||
      b.purpose.includes('ประชุม') ||
      b.purpose.includes('กิจกรรม');

    const hasTimetableTag =
      b.note?.includes('[ตารางเรียน') ||
      b.title.includes('01980222') ||
      (b.courseId !== null && !isExplicitTestBooking);

    const shouldBeTimetable = hasTimetableTag && !isExplicitTestBooking;

    await prisma.roomBooking.update({
      where: { id: b.id },
      data: {
        isTimetable: shouldBeTimetable,
      },
    });

    if (shouldBeTimetable) {
      timetableCount++;
      console.log(`[TIMETABLE] ${b.bookingNumber}: "${b.title}" -> isTimetable = true (Course Year: ${b.course?.targetYear || 'None'})`);
    } else {
      generalCount++;
      console.log(`[GENERAL]   ${b.bookingNumber}: "${b.title}" -> isTimetable = false`);
    }
  }

  console.log('--- Migration completed ---');
  console.log(`Updated: ${timetableCount} timetables, ${generalCount} general bookings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
