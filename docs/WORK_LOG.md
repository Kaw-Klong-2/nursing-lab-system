# 📝 สมุดบันทึกประวัติการพัฒนาและการตัดสินใจ (LAB-system Work & Decision Log)

> **ดูแลโดย**: AI Sub-agent บรรณารักษ์ (`librarian`)  
> **วัตถุประสงค์**: บันทึกประวัติการแก้ไข การเพิ่มฟีเจอร์ และการตัดสินใจเชิงสถาปัตยกรรมทุกครั้งหลังจบงาน เพื่อให้การแก้ไขครั้งถัดไปสามารถอ้างอิงบริบทเดิมได้ทันทีโดยไม่หลงลืมหรือทำงานซ้ำซ้อน

---

## 📌 กติกาการลงบันทึกสำหรับ AI Agent (Post-Work Logging Rule)
ทุกครั้งที่แก้ไขโค้ด ฐานข้อมูล หรือเอกสารเสร็จสิ้น ให้เพิ่มรายการบันทึกใหม่ไว้ **บนสุด** ของหมวดบันทึกด้านล่าง ตามรูปแบบ:
- **วันที่และหัวข้องาน**: `### [YYYY-MM-DD] ชื่องาน`
- **หมวดหมู่**: โมดูลที่เกี่ยวข้อง
- **สิ่งที่ดำเนินการ**: สรุปการเปลี่ยนแปลงและเหตุผลสำคัญ
- **ไฟล์สำคัญที่แก้ไข**: พิกัดไฟล์หลัก
- **ผลตรวจมาตรฐานบรรณารักษ์**: ผลรัน `npm run librarian:audit`

---

## 🕒 ประวัติการดำเนินงาน (Chronological Work Log)

### [2026-10-20] ระบบแจ้งเตือนตารางจ่ายพัสดุและตารางการใช้ห้องปฏิบัติการอัตโนมัติสำหรับเจ้าหน้าที่และแอดมิน (Automated Dispense & Room Schedule Notifications)
- **หมวดหมู่**: Notifications / Workflow Automation / Admin Multi-Role Operations (`src/app/api/requisitions/[id]/route.ts`, `src/app/api/borrow/[id]/route.ts`, `src/app/api/cron/reminders/route.ts`, `src/app/requisitions/page.tsx`, `src/app/borrow/page.tsx`)
- **สิ่งที่ดำเนินการ**:
  1. **แจ้งเตือนแบบทันทีเมื่อคำขอได้รับอนุมัติ (Real-time Approval Notification to Officers & Admins)**:
     - ใน `/api/requisitions/[id]` เมื่อมีการกดอนุมัติคำขอเบิก (`action === 'APPROVE'`) ระบบจะส่งการแจ้งเตือนระดับ HIGH ไปยังผู้ใช้ทุกคนที่มีบทบาท `OFFICER` และ `ADMIN` ทันที พร้อมระบุกำหนดวันที่ต้องใช้พัสดุ เพื่อให้เตรียมจัดของไว้ล่วงหน้า
     - ใน `/api/borrow/[id]` เมื่อมีการกดอนุมัติคำขอยืม (`action === 'APPROVE'`) ระบบจะส่งการแจ้งเตือนระดับ HIGH ไปยัง `OFFICER` และ `ADMIN` ทันที พร้อมระบุเวลานัดรับอุปกรณ์ เพื่อเตรียมตรวจเช็คและจัดวางของที่เคาน์เตอร์
  2. **สรุปตารางจ่ายพัสดุและตารางห้องรอบเช้าอัตโนมัติ (Morning Daily Digest at 09:00 AM)**:
     - ปรับปรุง `/api/cron/reminders` (รอบเช้า) ให้กวาดตรวจรายการที่อนุมัติแล้วและมีกำหนดจ่ายออกในวันนี้หรือค้างจ่าย (`dateNeeded <= endOfToday` สำหรับใบเบิก และ `borrowDate <= endOfToday` สำหรับขอยืม) สรุปยอดรวมส่ง Web Push & กระดิ่งแจ้งเตือนให้เจ้าหน้าที่และแอดมินเข้ามาเช็ค
     - เพิ่มการตรวจเช็คตารางการใช้ห้องปฏิบัติการประจำวัน (`RoomBooking` ที่ `status === 'APPROVED'` ในช่วงวันนี้) และส่งแจ้งเตือนสรุปรายชื่อห้องแล็บและจำนวนรอบการใช้ห้องให้เจ้าหน้าที่/แอดมินเตรียมเปิดห้องและดูแลความพร้อม
     - มีระบบตัดยอดแจ้งเตือนซ้ำ (De-duplication 18 ชม.) เพื่อไม่ให้รบกวนผู้ใช้บ่อยเกินจำเป็น
  3. **เพิ่มปุ่มตรวจตารางจ่ายของรอบวันแบบ On-Demand บนหน้า UI**:
     - เพิ่มปุ่ม `"ตรวจตารางจ่ายของรอบวัน (09:00)"` ในหน้า `/requisitions` (สำหรับเจ้าหน้าที่และแอดมิน) ถัดจากปุ่มส่งออก Excel
     - ปรับปรุงข้อความแจ้งผลลัพธ์ของปุ่มตรวจรอบวันในหน้า `/borrow` ให้แสดงจำนวนรายการรอจ่ายและตารางห้องควบคู่ไปด้วย
  4. **เคารพคำสั่งไม่แตะต้อง Schema ฐานข้อมูล**:
     - ทำงานผ่านโมเดล `Notification`, `PushSubscription` และ `notifyRoles(['OFFICER', 'ADMIN'])` ที่มีอยู่เดิม 100% โดยไม่มีการแก้ไข `prisma/schema.prisma` หรือกระทบสิทธิ์ผู้ใช้เดิม
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/app/api/requisitions/[id]/route.ts`
  - `src/app/api/borrow/[id]/route.ts`
  - `src/app/api/cron/reminders/route.ts`
  - `src/app/requisitions/page.tsx`
  - `src/app/borrow/page.tsx`
- **ผลตรวจมาตรฐานบรรณารักษ์**:
  - ตรวจสอบคำว่า "นิสิต" ผ่าน 100% (`npm run librarian:audit`)
  - ตรวจสอบ TypeScript ผ่าน 100% (`cmd /c npx tsc --noEmit`)
  - Build ระบบสำเร็จ 100% (`cmd /c npm run build`)


### [2026-10-20] ตรวจสอบและแก้ไขระบบวัน เวลา และ Timezone ทั้งหมดในระบบ (Comprehensive Time & Timezone Audit & Fix)
- **หมวดหมู่**: Core Infrastructure / Timezone Standardization (`src/lib/date-time-utils.ts`, Practice Bookings, POS, Cron, Borrow, Room Bookings, Requisitions)
- **สิ่งที่ดำเนินการ**:
  1. **สืบสวนสาเหตุเชิงลึกกรณี BRW-20261017-002 แสดงเวลานัดรับและกำหนดคืน 19:00 น.**:
     - ตรวจสอบ Record ในฐานข้อมูลพบ `borrowDate: 2026-10-19T12:00:00.000Z` และ `expectedReturnDate: 2026-10-28T12:00:00.000Z`
     - **สาเหตุแท้จริง**: นิสิตเลือกเวลา `12:00 น.` (เที่ยงวัน) บนเบราว์เซอร์ ซึ่งส่งค่า `"2026-10-19T12:00"` มาที่ API จากนั้นโค้ดเดิมใช้ `new Date(borrowDate)` บนสภาพแวดล้อม Node.js ที่ไม่มี Offset ทำให้ Node ตีความ 12:00 เป็น UTC (`12:00Z`) เมื่อระบบดึงข้อมูลกลับมาแสดงผลบนเครื่องไคลเอนต์ในประเทศไทย (UTC+7) เวลาจึงถูกบวกไป 7 ชั่วโมง กลายเป็น `19:00 น.`
     - **การแก้ไขในฐานข้อมูล**: ปรับแก้ Record `BRW-20261017-002` และ `REQ-20261017-012` ให้เก็บค่า UTC ที่แท้จริงคือ `05:00:00.000Z` ทำให้หน้า UI แสดงผลตรงกับความเป็นจริงที่ `12:00 น.`
  2. **สร้างไลบรารีสถาปัตยกรรมเวลาสากล [`src/lib/date-time-utils.ts`](file:///d:/LAB-system/src/lib/date-time-utils.ts)**:
     - รวมฟังก์ชันปลอดภัยต่อทุกสภาพแวดล้อม: `getBangkokParts`, `getBangkokStartOfDay`, `getBangkokEndOfDay`, `parseBangkokDateTime`, `combineSlotDateAndBangkokTime`, และ `formatBangkokDateTime`
  3. **กวาดล้างและแก้ไขจุดเปราะบาง Timezone ครบทุกจุดในทุกซับซิสเต็มของระบบ**:
     - **ระบบคำขอยืม-คืนครุภัณฑ์ (`/api/borrow`, `/api/requests/unified`, `/api/requests/edit`)**: ใช้ `parseBangkokDateTime` แปลงค่าจาก `<input type="datetime-local">` ให้เป็น UTC+7 เสมอ ป้องกันการเลื่อน 7 ชั่วโมง
     - **ระบบเบิกวัสดุสิ้นเปลือง (`/api/requisitions`, `/api/requisitions/[id]`, `/requisitions/page.tsx`)**: ใช้ `parseBangkokDateTime` สำหรับ `dateNeeded` และแปลงตัวกรองภาคเรียนให้เป็นช่วงเวลาสากล
     - **ระบบจองห้องปฏิบัติการ (`/api/room-bookings`, `/api/room-bookings/batch`, `/api/room-bookings/[id]`, `/api/room-bookings/batch-approval`)**: ใช้ `getBangkokParts` และ `getBangkokStartOfDay` ในการนับ Sequence เลขที่จองประจำวัน และใช้ขอบเขตวัน UTC Midnight 24 ชม. ตรวจสอบการทับซ้อนกับรอบฝึกปฏิบัติการข้ามระบบ
     - **ระบบดึงข้อมูลตารางห้องสำหรับเครื่องปรับอากาศและระบบภายนอก (`/api/external/room-schedules`)**: รองรับการกรองตามวัน เดือน ปี โดยใช้ UTC Midnight ตรงตาม `bookingDate` เสมอ
     - **ระบบประวัติการทำรายการ (`/api/activity-logs`)**: ใช้ `getBangkokStartOfDay` และ `getBangkokEndOfDay` กรองช่วงเวลาและสรุปยอดวันนี้ให้ตรงกับวันปฏิทินไทย
     - **ระบบ Dashboard ภาพรวม (`/api/dashboard`)**: ใช้ `getBangkokStartOfDay` และ `getBangkokEndOfDay` ในโหมดกรองตามช่วงวันที่
     - **ระบบแจ้งปัญหาและซ่อมบำรุง (`/api/maintenance/issues`)**: ใช้ `getBangkokParts` และ `getBangkokStartOfDay` สร้างรหัสเรื่องแจ้งปัญหา `REP-YYYYMMDD-XXX`
     - **ระบบจัดสรรและยืมต่อเนื่อง (`/api/borrow/allocation`)**: ใช้ `parseBangkokDateTime` คุม `startDate` และ `endDate`
     - **ระบบรอบฝึกและเช็คอินปฏิบัติการ (`/api/practice/slots`, `/api/practice/bookings`, `/api/practice/bookings/[id]`, `/api/practice/stats`, `PracticeHoursSummary.tsx`)**: กำจัด `.setHours()` ข้าม Timezone ทั้งหมด คำนวณช่วงเวลาเปิดรอบและการเช็คอินด้วยเวลาไทยอย่างเที่ยงตรง
     - **ระบบ POS หน้าร้าน (`/api/pos/checkout`)**: ปรับเวลาคืน 17:30 น. เป็นเวลาไทย (10:30 UTC) อย่างแม่นยำ
     - **ระบบแจ้งเตือนอัตโนมัติ (`/api/cron/reminders`)**: คำนวณช่วงเวลา D-Day, D-1 และ Overdue ด้วยเวลาไทย
     - **ระบบภาคการศึกษา (`src/lib/academicTerm.ts`)**: คำนวณขอบเขตวันสิ้นสุดภาคเรียนด้วย `getTime() + 86399999` ปลอดภัยต่อทุก Timezone
  4. **การตรวจสอบคุณภาพตามมาตรฐานบรรณารักษ์**:
     - ตรวจสอบคำว่า "นิสิต" ผ่าน 100% (`npm run librarian:audit`)
     - ตรวจสอบ TypeScript ผ่าน 100% (`npx tsc --noEmit`)
     - Build ระบบผ่านสมบูรณ์ 100% (`npm run build`)
- **ไฟล์สำคัญที่แก้ไข/สร้างขึ้น**:
  - `src/lib/date-time-utils.ts` (ใหม่)
  - `src/lib/academicTerm.ts`
  - `src/app/api/borrow/route.ts`
  - `src/app/api/requests/unified/route.ts`
  - `src/app/api/requests/edit/route.ts`
  - `src/app/api/requisitions/route.ts`
  - `src/app/api/requisitions/[id]/route.ts`
  - `src/app/api/room-bookings/route.ts`
  - `src/app/api/room-bookings/batch/route.ts`
  - `src/app/api/room-bookings/[id]/route.ts`
  - `src/app/api/room-bookings/batch-approval/route.ts`
  - `src/app/api/external/room-schedules/route.ts`
  - `src/app/api/activity-logs/route.ts`
  - `src/app/api/dashboard/route.ts`
  - `src/app/api/maintenance/issues/route.ts`
  - `src/app/api/borrow/allocation/route.ts`
  - `src/app/api/practice/bookings/[id]/route.ts`
  - `src/app/api/practice/bookings/route.ts`
  - `src/app/api/practice/slots/route.ts`
  - `src/app/api/practice/stats/route.ts`
  - `src/app/api/approvals/quick-action/route.ts`
  - `src/app/api/pos/checkout/route.ts`
  - `src/app/api/cron/reminders/route.ts`
  - `src/app/requisitions/page.tsx`
  - `src/components/practice/PracticeHoursSummary.tsx`
  - `LIBRARY_CATALOG.md`
  - `docs/WORK_LOG.md`

### [2026-10-20] พัฒนาระบบเตือนคืนครุภัณฑ์ล่วงหน้าอัตโนมัติ (Automated Equipment Return Reminder)
- **หมวดหมู่**: API / Scheduled Jobs / Background Workers & UI (`/api/cron/reminders`, `vercel.json`, `/borrow`)
- **สิ่งที่ดำเนินการ**:
  1. **สถาปัตยกรรมเตือนล่วงหน้า 3 ระดับ (Multi-Tier Cadence)**:
     - **Tier 1 (D-1 ล่วงหน้า 1 วัน 18:00 น. จ-พฤ)**: แจ้งเตือนนิสิตผู้ยืมล่วงหน้าช่วงเย็นเพื่อเตรียมจัดเก็บอุปกรณ์ส่งคืน
     - **Tier 2 (D-Day เช้าวันครบกำหนด 09:00 น. จ-ศ)**: แจ้งเตือนนิสิตให้ส่งคืนห้องปฏิบัติการพยาบาลก่อน 16:30 น.
     - **Tier 3 (Overdue ค้างส่งเกินกำหนด 09:00 น. จ-ศ)**: แจ้งเตือนด่วน (`URGENT`) ตรงถึงนิสิตผู้ยืม พร้อมจัดทำ **"📋 Daily Overdue Digest" (สรุปรายงานประจำวัน 1 ฉบับ)** ส่งตรงถึงเจ้าหน้าที่ห้องแล็บ (`OFFICER`, `ADMIN`) สรุปจำนวนนิสิตและจำนวนรายการค้างส่งทั้งหมด
  2. **กลไกการรันแบบ 2 ระบบคู่ขนาน (Dual Execution Mechanism)**:
     - **Vercel Cron (`vercel.json`)**: ตั้งเวลาอัตโนมัติบน Cloud รอบเช้า 09:00 น. จันทร์-ศุกร์ (`0 2 * * 1-5` UTC) และรอบเย็น 18:00 น. จันทร์-พฤหัสบดี (`0 11 * * 1-4` UTC) ป้องกันด้วย `CRON_SECRET`
     - **Client Heartbeat (Fallback สำหรับ Localhost)**: ใน `PushNotificationManager.tsx` เพิ่มระบบตรวจจับเบื้องหลังอัตโนมัติเมื่อเจ้าหน้าที่ล็อกอินในวันทำการหลัง 09:00 น. ควบคุมความถี่วันละ 1 ครั้ง
  3. **ส่วนควบคุมสำหรับเจ้าหน้าที่บนหน้า `/borrow`**:
     - เพิ่มปุ่ม **"ตรวจเตือนรอบวัน (09:00)"** บนหน้า `/borrow` สำหรับเจ้าหน้าที่และผู้ดูแลระบบ สั่งรันกวาดตรวจและส่งแจ้งเตือนได้ทันที พร้อมรับรายงานผลลัพธ์
  4. **ระบบ Anti-Spam Throttling**:
     - คุมระยะห่างการแจ้งเตือน Cooldown 18 ชั่วโมง และอัปเดต `lastRemindedAt` ใน `BorrowRequest` ทุกครั้งที่แจ้งเตือน
  5. **ผลการตรวจสอบคุณภาพตามระเบียบบรรณารักษ์**:
     - ตรวจสอบคำว่า "นิสิต" ผ่าน 100% (`npm run librarian:audit`)
     - ตรวจสอบ TypeScript ผ่าน (`npx tsc --noEmit`)
     - Build ระบบผ่านสมบูรณ์ 100% (`npm run build`)
- **ไฟล์สำคัญที่แก้ไข/สร้างขึ้น**:
  - `vercel.json` (ใหม่)
  - `src/app/api/cron/reminders/route.ts` (ใหม่)
  - `src/app/api/notifications/check-system/route.ts`
  - `src/components/notifications/PushNotificationManager.tsx`
  - `src/app/borrow/page.tsx`
  - `LIBRARY_CATALOG.md`
  - `docs/WORK_LOG.md`

### [2026-10-18] สลับรหัสห้อง (Room Code) ระหว่าง LAB-04 และ LAB-05 เพื่อรักษาประวัติการจองและการเปิดแอร์ให้ตรงกับห้องจริง
- **หมวดหมู่**: Database / Data Integrity (PostgreSQL `PracticeRoom`)
- **สิ่งที่ดำเนินการ**:
  1. **สลับรหัสห้อง (Code Swap) แทนการสลับชื่อ**: ผู้ใช้ชี้แจงว่าชื่อห้องในระเบียนเดิมถูกต้องแล้วตั้งแต่แรก ("ห้องปฏิบัติการทางการพยาบาลเด็กและวัยรุ่น" ที่มีการใช้งานจริง) แต่เดิมพิมพ์รหัสห้องสลับเป็น `LAB-04` ซึ่งที่ถูกต้องคือรหัส `LAB-05`
  2. **รักษาความถูกต้องของประวัติการใช้งาน**:
     - ระเบียนห้อง `cmuff5crw0002jr04erplesft` (ชื่อ "ห้องปฏิบัติการทางการพยาบาลเด็กและวัยรุ่น" ซึ่งมีประวัติเปิดแอร์ 11 รายการ และการจองห้อง 2 รายการ) ได้รับการปรับรหัสเป็น **`LAB-05`** ตรงตามการใช้งานจริง
     - ระเบียนห้อง `cmuff6rs50000i404p7nqw8xa` (ชื่อ "ห้องปฏิบัติการทางการพยาบาลมารดา ทารก และผดุงครรภ์") ได้รับการปรับรหัสเป็น **`LAB-04`**
  3. **ผลลัพธ์**: รายการจองห้อง การเปิดแอร์ และประวัติการฝึกปฏิบัติการจะผูกติดกับห้อง "เด็กและวัยรุ่น" รหัส `LAB-05` อย่างถูกต้องแม่นยำ ไม่ผิดห้อง
- **ไฟล์สำคัญที่แก้ไข**:
  - ฐานข้อมูล PostgreSQL (`PracticeRoom.code`)

### [2026-10-18] แก้ไขตารางงานให้แสดงรอบฝึกปฏิบัติการ (Practice Slots) แม้ยังไม่มีนิสิตลงทะเบียน และแก้ไขคำสะกดชื่อห้องในฐานข้อมูล
- **หมวดหมู่**: UI / API & Data Aggregation (`src/app/schedule/page.tsx`, `src/app/api/practice/slots/route.ts`, Database)
- **สิ่งที่ดำเนินการ**:
  1. **แก้ไขให้หน้าตารางงาน (/schedule) ดึง Practice Slots ทั้งหมด**: เดิมหน้า `/schedule` ดึงเฉพาะ `/api/practice/bookings` เมื่อยังไม่มีนิสิตลงทะเบียน (`PracticeBooking.count() === 0`) จะทำให้รอบฝึกหายไปทั้งหมดจากแท็บ "🏥 คิวแล็บ" และในมุมมองปฏิทิน จึงได้เพิ่มการ fetch `/api/practice/slots?all=true` แล้วนำมา initialize ใน `practiceSlotGroups` เพื่อให้รอบแล็บปรากฏครบถ้วนทุกรอบ
  2. **รองรับพารามิเตอร์ `all=true` ใน `/api/practice/slots`**: เพื่อให้ API คืนรอบฝึกทั้งหมดโดยไม่จำกัดแค่ช่วงเวลา 15 วัน เพื่อให้ปฏิทินตารางงานแสดงผลได้ครบทุกเดือน
  3. **เพิ่มป้ายสถานะและ Empty State สำหรับรอบที่ยังไม่มีนิสิต**:
     - แสดงป้ายกำกับสถานะ `🔒 ปิดรับจอง` หรือ `🟢 เปิดรับจอง` ชัดเจน
     - ในการ์ดแสดงข้อความ "ยังไม่มีนิสิตลงทะเบียนจองรอบนี้ (ความจุรอบ X คน)" แทนที่จะเป็นช่องว่าง
  4. **แก้ไขคำสะกดชื่อห้องแล็บในฐานข้อมูล**:
     - แก้ไขคำผิด "ห้องฏิบัติการ" (ตก ป.) เป็น "ห้องปฏิบัติการ" ในห้อง LAB-01-1, LAB-01-2, LAB-01-3
     - แก้ไขคำผิด "จิเวชศาสตร์" / "อนามัชุมชน" เป็น "จิตเวชศาสตร์" / "อนามัยชุมชน" ในห้อง LAB-03
  5. **ตรวจสอบมาตรฐานคำศัพท์และระบบ Build**: ตรวจสอบคำว่า "นิสิต" ผ่าน 100% (`npm run librarian:audit`), TypeScript ผ่าน (`npx tsc --noEmit`), และ Build ผ่านสมบูรณ์ (`npm run build`)
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/app/api/practice/slots/route.ts`
  - `src/app/schedule/page.tsx`
  - ฐานข้อมูล PostgreSQL (ผ่าน Prisma client)

### [2026-10-18] ติดตั้งระบบ SWR Client Cache, สลับชื่อห้อง LAB-04/05 และกรองรอบฝึกที่ยังไม่เปิดออกจากปฏิทิน
- **หมวดหมู่**: UI / Performance & Calendar Data Processing (`src/components/calendar/MasterRoomCalendar.tsx`, Database)
- **สิ่งที่ดำเนินการ**:
  1. **ติดตั้งระบบ SWR Client-side Cache**: เพิ่ม `cacheRef` และ `roomsCacheRef` ใน `MasterRoomCalendar.tsx` เมื่อผู้ใช้สลับเดือนไป-มา ระบบจะดึงข้อมูลจากหน่วยความจำมาแสดงผลทันทีใน 0 วินาที โดยไม่ต้องขึ้นหน้าจอหมุนรอ (`LoadingSpinner`) พร้อมแอบซิงก์ข้อมูลสดใหม่จากเซิร์ฟเวอร์อยู่เบื้องหลังอย่างเงียบๆ
  2. **สลับชื่อห้อง LAB-04 และ LAB-05 ในฐานข้อมูล**:
     - `LAB-04`: ปรับเป็น **ห้องปฏิบัติการทางการพยาบาลมารดา ทารก และผดุงครรภ์**
     - `LAB-05`: ปรับเป็น **ห้องปฏิบัติการทางการพยาบาลเด็กและวัยรุ่น**
  3. **กรองรอบฝึกปฏิบัติการที่ยังไม่เปิดออกจากปฏิทินรวม**: เพิ่มเงื่อนไขคัดกรองรอบฝึกทักษะ `if (!s.isOpen) return;` ทำให้รอบฝึกที่ปิดรับจองหรือยังไม่เปิดใช้งาน (เช่น `[ปิดรอบ]`) จะไม่ถูกนำมาแสดงทับตารางเวลาห้อง
  4. **ปรับปรุงการแสดงจำนวนผู้เข้าร่วมใน Modal**: แก้ไขเงื่อนไขจาก `|| 1` เป็น `?? 0` ทำให้รอบที่มีผู้เข้าร่วม 0 คน แสดงผลเป็น `0 คน` อย่างถูกต้อง ไม่แสดงเป็น `1 คน` ปลอม
  5. **ตรวจสอบมาตรฐานคำศัพท์และระบบ Build**: ตรวจสอบคำว่า "นิสิต" ผ่าน 100% และ Build ผ่านสมบูรณ์ (`npm run build`)
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/components/calendar/MasterRoomCalendar.tsx`
  - ฐานข้อมูลจริง `PracticeRoom` (LAB-04, LAB-05)
  - `docs/WORK_LOG.md`
- **ผลตรวจมาตรฐานบรรณารักษ์**: `npm run librarian:audit` ผ่าน 100% (คำศัพท์ "นิสิต" ครบถ้วน ไม่มี Mojibake)

### [2026-10-18] แก้ไขปัญหาการเลื่อนหน้าจอ (Touch Scroll) บนมือถือ และจัดลำดับความสำคัญของระบบโดยเน้น Vercel เป็นหลัก
- **หมวดหมู่**: UI / Mobile Touch Optimization & Calendar (`src/components/calendar/MasterRoomCalendar.tsx`)
- **สิ่งที่ดำเนินการ**:
  1. **ปลดบล็อกการเลื่อนแนวตั้ง (Vertical Scroll)**: นำคลาส `touch-pan-x` ออก และแทนที่ด้วย `overscroll-x-contain select-none` ทำให้การปัดนิ้วเพื่อเลื่อนดูห้องต่างๆ ในแนวตั้งไม่ถูกบล็อก และการเลื่อนแนวนอนเพื่อดูเวลาทำได้อย่างอิสระ
  2. **แยกพฤติกรรมเลเยอร์คลิกพื้นที่ว่างบนมือถือ (Disable Mobile Invisible Click Overlay)**: ซ่อนเลเยอร์คลิกพื้นที่ว่างเพื่อจองห้องบนหน้าจอสัมผัส (`hidden md:flex pointer-events-none md:pointer-events-auto`) เพื่อป้องกันการทัชเลื่อนหน้าจอแล้วระบบเข้าใจผิดว่าเป็นการแตะเลือกห้อง
  3. **เพิ่มปุ่ม `+ จอง` ชัดเจนบนการ์ดห้องสำหรับมือถือ**: วางปุ่ม `+ จอง` ขนาดกะทัดรัดไว้ในคอลัมน์ชื่อห้องด้านซ้าย เพื่อให้ผู้ใช้มือถือสามารถกดจองห้องได้โดยตรงและแม่นยำ ไม่ต้องเสี่ยงกับการแตะพื้นที่ว่าง
  4. **ป้องกันการเปิดกิจกรรมโดยไม่ตั้งใจ (Touch Drag Threshold)**: เพิ่ม `touchDragRef` เพื่อตรวจจับระยะขยับของนิ้ว หากนิ้วมีการเลื่อนเกิน 8px ขณะแตะการ์ดกิจกรรม ให้ถือว่าเป็นการ "ปัดเลื่อนจอ (Scroll)" และระงับการเปิดป๊อปอัปรายละเอียดกิจกรรม
  5. **ใส่ `select-none` ทั่วทั้งตาราง**: ป้องกันไม่ให้เบราว์เซอร์มือถือไฮไลต์หรือคลุมดำข้อความขณะปัดเลื่อนหน้าจอ
  6. **ยืนยันการใช้ Vercel เป็นแพลตฟอร์มหลัก**: ตรวจสอบคำสั่ง `npm run build` ผ่าน 100% พร้อมใช้งานบน Vercel ทันที
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/components/calendar/MasterRoomCalendar.tsx`
  - `docs/WORK_LOG.md`
- **ผลตรวจมาตรฐานบรรณารักษ์**: `npm run librarian:audit` ผ่าน 100% (คำศัพท์ "นิสิต" ครบถ้วน ไม่มี Mojibake)

### [2026-10-18] คืนค่าหน้าไทม์ไลน์การใช้ห้องประจำวัน (Master Gantt Timeline) เป็นค่าเริ่มต้นบนหน้าภาพรวม
- **หมวดหมู่**: UI / Calendar & Dashboard Overview (`src/components/calendar/MasterRoomCalendar.tsx`)
- **สิ่งที่ดำเนินการ**:
  1. **คืนค่ามุมมองไทม์ไลน์ตารางเวลา (TIMELINE View)**: ยกเลิก `useEffect` ที่เคยบังคับสลับเป็น `MONTH` อัตโนมัติเมื่อหน้าจอแคบกว่า 768px ทำให้ผู้ใช้ทั้งบนเดสก์ท็อปและมือถือเห็นตารางเวลาการใช้ห้องประจำวัน (ห้องปฏิบัติการ vs ช่วงเวลา 08:00 – 18:00 น.) เป็นค่าเริ่มต้นทันทีที่เข้าหน้าภาพรวม
  2. **นำบล็อกการ์ดแนวตั้งบนมือถือออก และใช้ตาราง Gantt แบบ Responsive**: ให้แสดงตารางเวลาแบบเดียวกับเดสก์ท็อป พร้อมเปิดใช้งาน `overflow-x-auto touch-pan-x` เลื่อนซ้าย-ขวาได้อย่างลื่นไหล
  3. **ตรึงคอลัมน์ชื่อห้องด้านซ้าย (Sticky Room Header)**: กำหนดให้คอลัมน์ชื่อห้องและรหัสห้อง `sticky left-0` พร้อมเงาและขอบแบ่งชัดเจน ทำให้เมื่อเลื่อนดูช่วงเวลาบนมือถือ ชื่อห้องจะไม่เลื่อนหลุดหายไป
  4. **เพิ่มข้อความแนะนำการเลื่อนบนจอมือถือ**: แสดง `↔ เลื่อนดูเวลา 08:00–18:00 น.` ในแถบหัวตาราง
  5. **ตรวจสอบมาตรฐานคำศัพท์และระบบ Build**: ตรวจสอบคำว่า "นิสิต" ผ่าน 100% และ Build ผ่านสมบูรณ์ทั้ง `npm run build` และ `npm run build:cf`
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/components/calendar/MasterRoomCalendar.tsx`
  - `docs/WORK_LOG.md`
- **ผลตรวจมาตรฐานบรรณารักษ์**: `npm run librarian:audit` ผ่าน 100% (คำศัพท์ "นิสิต" ครบถ้วน ไม่มี Mojibake)

### [2026-10-18] แก้ไขปัญหา Prisma Client บน Cloudflare Workers ([unenv] fs.readdir is not implemented yet!)
- **หมวดหมู่**: Cloudflare Workers Runtime & Prisma Driver Adapter (`prisma/schema.prisma`, `next.config.mjs`, `src/lib/prisma.ts`)
- **สิ่งที่ดำเนินการ**:
  1. **เพิ่ม `previewFeatures = ["driverAdapters"]` ใน `prisma/schema.prisma`**: ป้องกันไม่ให้ Prisma Client พยายามค้นหา Binary Query Engine ผ่าน Filesystem (`fs.readdir`)
  2. **กำหนด `serverExternalPackages` ใน `next.config.mjs`**: ระบุ `@prisma/client`, `.prisma/client`, `@prisma/adapter-pg`, `pg` ให้ Next.js ไม่นำไป bundle ปนกับ Node runtime เพื่อให้ OpenNext สามารถแพตช์สำหรับ Cloudflare Workers (`workerd`) ได้อย่างสมบูรณ์
  3. **เพิ่ม `initOpenNextCloudflareForDev()` ใน `next.config.mjs`**: เชื่อมโยง Cloudflare bindings และ environment variables เข้ากับ runtime
  4. **ปรับปรุง `src/lib/prisma.ts` เป็น Lazy Proxy Pattern**: ดึง connection string จาก `process.env.DATABASE_URL` หรือ `getCloudflareContext().env` เมื่อเริ่มมีการเรียกใช้งาน query จริง พร้อมเชื่อมต่อผ่าน `PrismaPg` adapter เสมอ
  5. **ทดสอบ Build สำเร็จ 100% ทั้ง 2 ฝั่ง**: ผ่านทั้ง `npm run build` (Vercel) และ `npm run build:cf` (Cloudflare Workers)
- **ไฟล์สำคัญที่แก้ไข**:
  - `prisma/schema.prisma`
  - `next.config.mjs`
  - `src/lib/prisma.ts`
  - `docs/WORK_LOG.md`
- **ผลตรวจมาตรฐานบรรณารักษ์**: `node scripts/librarian-audit.mjs` ผ่าน 100% (คำศัพท์ "นิสิต" ครบถ้วน ไม่มี Mojibake)

### [2026-10-18] ติดตั้งระบบ Dual-Deployment รองรับการใช้งานควบคู่ทั้ง Vercel และ Cloudflare Pages
- **หมวดหมู่**: Cloud Infrastructure & Dual CI/CD Pipeline (`package.json`, `src/lib/prisma.ts`, `wrangler.jsonc`, `open-next.config.ts`)
- **สิ่งที่ดำเนินการ**:
  1. **ปรับปรุงการเชื่อมต่อฐานข้อมูล Prisma ให้รองรับ Driver Adapter (`PrismaPg`)**:
     - อัปเกรด `src/lib/prisma.ts` โดยเชื่อมต่อผ่าน `pg` Pool และ `@prisma/adapter-pg`
     - รองรับการทำงานแบบ Hybrid 100%: ทั้งบน Node.js ปกติ (Vercel, Local dev) และบน Edge Worker Runtime (Cloudflare Pages)
  2. **ติดตั้งและกำหนดค่า Cloudflare Pages OpenNext Adapter**:
     - ติดตั้ง `@opennextjs/cloudflare`, `wrangler`, `@prisma/adapter-pg`, `pg`, `@types/pg`
     - สร้างไฟล์ `wrangler.jsonc` กำหนดค่า `nodejs_compat` และโฟลเดอร์ build output
     - สร้างไฟล์ `open-next.config.ts` สำหรับคอมไพล์ Next.js 15 App Router
     - เพิ่ม build script `build:cf` และ `preview:cf` ใน `package.json`
  3. **ทดสอบความเข้ากันได้แบบคู่ขนาน (Dual-Build Verification)**:
     - ทดสอบ `npm run build` (คำสั่งของ Vercel) ผ่านฉลุย 100% ครบทั้ง 82 routes
     - ทดสอบ `tsc --noEmit` ผ่าน 0 errors
- **ไฟล์สำคัญที่แก้ไข/สร้างใหม่**:
  - `package.json`
  - `src/lib/prisma.ts`
  - `wrangler.jsonc` (NEW)
  - `open-next.config.ts` (NEW)
  - `.gitignore`
  - `docs/WORK_LOG.md`
- **ผลตรวจมาตรฐานบรรณารักษ์**: ✅ ผ่าน 100% (คำว่า "นิสิต" ถูกต้องทั้งหมด, UTF-8 สมบูรณ์)

### [2026-10-18] อัปเกรดระบบสัมผัสปฏิทินบนมือถือแบบ Clean Tap และย้ายคลังโค้ดขึ้น GitHub สู่ Kaw-Klong-2
- **หมวดหมู่**: Mobile Calendar UX & CI/CD Deployment Pipeline (`MasterRoomCalendar`, `CalendarHoverCard`, `Schedule`, `Rooms`)
- **สิ่งที่ดำเนินการ**:
  1. **ปรับปรุงระบบสัมผัสปฏิทินบนหน้าจอมือถือให้เสถียร 100%**:
     - ยกเลิกการแสดง Popup ลอยแบบ Hover บนอุปกรณ์สัมผัส (Touch Device) โดยสิ้นเชิง เพื่อป้องกันปัญหา Popup แวบแล้วหาย
     - เปลี่ยนเป็นการแตะช่องวันที่ (Single Tap) เพื่อเลือกวันและทำการ Smooth Scroll ลงไปยังแผงสรุปรายละเอียดประจำวันด้านล่างโดยตรง (`#calendar-selected-day-panel`, `#schedule-selected-day-panel`, `#rooms-selected-day-panel`) ใช้งานง่าย สะอาดตา และไม่บังช่องตาราง
     - บนหน้าจอคอมพิวเตอร์ทั่วไป (Desktop) ยังคงใช้งาน Hover Popover ได้ตามปกติสมบูรณ์
  2. **ย้ายคลังโค้ดขึ้น GitHub บัญชีใหม่ (`Kaw-Klong-2/nursing-lab-system`)**:
     - อัปเดต Git Remote มายัง `https://github.com/Kaw-Klong-2/nursing-lab-system.git` เพื่อแก้ปัญหา Third-party integration flag
     - ปรับสถานะเป็น Public Repository เพื่อปลดล็อกข้อจำกัด Hobby Plan ของ Vercel ให้ Deploy สำเร็จ 100%
     - ทริกเกอร์การ Deploy อัตโนมัติบน Vercel Production สำเร็จเรียบร้อย
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/components/calendar/MasterRoomCalendar.tsx`
  - `src/components/calendar/CalendarHoverCard.tsx`
  - `src/app/schedule/page.tsx`
  - `src/app/rooms/page.tsx`
  - `docs/WORK_LOG.md`
- **ผลตรวจมาตรฐานบรรณารักษ์**: ✅ ผ่าน 100% (คำว่า "นิสิต" ถูกต้องทั้งหมด, UTF-8 สมบูรณ์)

### [2026-10-18] ปรับปรุงหน้าตาปฏิทินภาพรวมบนมือถือ (Mobile Calendar UI Polish) และแก้ไขปัญหา Popup ปฏิทินเด้งหายเมื่อแตะบนจอมือถือ
- **หมวดหมู่**: Mobile Calendar UX (`MasterRoomCalendar`, `CalendarHoverCard`, `DashboardPage`, `Schedule`, `Rooms`)
- **สิ่งที่ดำเนินการ**:
  1. **แก้ไขปัญหาแตะวันในมือถือแล้ว Popup เด้งหายทันที (`CalendarHoverCard` & Calendar Cells)**:
     - ป้องกันเหตุการณ์ `mouseenter` + `click` / `scroll` สั่งปิดตัวเองเมื่อแตะบนหน้าจอมือถือ ด้วยการปักหมุดค้างไว้ (`isPinned: true`)
     - เพิ่มตัวกรองกัน Ghost Touch/Click (`Date.now() - openedAt < 250ms`) และ `data-calendar-cell="true"` ครบทุกหน้าปฏิทิน (`MasterRoomCalendar.tsx`, `src/app/schedule/page.tsx`, `src/app/rooms/page.tsx`) เพื่อไม่ให้เหตุการณ์สัมผัสจังหวะเดียวกับการเปิดสั่งปิด Popup เอง
  2. **ปรับโฉมหน้าตาปฏิทินภาพรวม (`MasterRoomCalendar.tsx` & `src/app/page.tsx`) ให้เรียบร้อยสวยงามบนมือถือ**:
     - **หน้าภาพรวม (`src/app/page.tsx`)**: ปรับปุ่มลัดด้านบนเป็น Grid 2 คอลัมน์ขนาดพอดีจอ และปรับแท็บสลับหน้าหลัก (`ปฏิทินการใช้ห้อง` | `สถิติคลัง & งบประมาณ` / `รายการยืมของฉัน`) เป็น 2 คอลัมน์ข้อความกระชับบนมือถือ
     - **แถบควบคุมและปุ่มสลับมุมมอง (`MasterRoomCalendar.tsx`)**: จัดเรียงแถบเลื่อนวันที่/เดือนให้เต็มความกว้างอย่างสมดุล และปรับปุ่มสลับมุมมอง 3 โหมด (`ไทม์ไลน์` | `รายเดือน` | `รายการ`) เป็น Grid 3 คอลัมน์ขนาดเท่ากัน ไม่เบียดตกบรรทัด
     - **ตารางปฏิทินรายเดือนบนมือถือ**: ปรับขนาดช่องวันที่ (`min-h-[64px] p-1`), เปลี่ยนป้าย `"X กิจกรรม"` ที่เคยเบียดเลขวันที่ให้เป็น Badge ตัวเลขกลมกะทัดรัด (`{dayActivities.length}`) และแสดงป้ายรหัสห้องสี (`LAB-01`, `SIM` ฯลฯ) แทนข้อความยาวที่ถูกตัดแหว่ง พร้อมรองรับการแตะเพื่อเปิด Popup รายละเอียดครบถ้วน
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/app/page.tsx`
  - `src/components/calendar/MasterRoomCalendar.tsx`
  - `src/components/calendar/CalendarHoverCard.tsx`
  - `src/app/schedule/page.tsx`
  - `src/app/rooms/page.tsx`
- **ผลตรวจมาตรฐานบรรณารักษ์**: ✅ ผ่าน 100% (Terminology Violations: 0, UTF-8 Mojibake: 0, TypeScript: 0 errors)

### [2026-10-17] ปรับปรุง Mobile Responsive UX และจัดระเบียบไฟล์เอกสารหน้า Root & Git Working Tree
- **หมวดหมู่**: Mobile Responsive UX (`Navbar`, `Sidebar`, `Approvals`, `Schedule`, `Borrow`) / Project File Organization (`manual/`, `system_flow/`, `LIBRARY_CATALOG.md`)
- **สิ่งที่ดำเนินการ**:
  1. **ปรับปรุงประสบการณ์ใช้งานบนสมาร์ทโฟน (Mobile Responsive UX)**:
     - **`src/components/layout/Navbar.tsx` & `src/components/layout/Sidebar.tsx`**: เปิดให้แสดงปุ่มด่วน `สแกน QR` และ `แก้ไขบัญชี` แบบไอคอนกะทัดรัดบนจอมือถือ (เดิมถูกซ่อนด้วย `hidden md:inline-flex` / `hidden sm:inline-flex`) และเพิ่มการตัดคำ (`truncate` / `break-words`) พร้อม `title` สำหรับชื่ออาจารย์ที่มีคำนำหน้ายาว (เช่น `รศ. พลตรีหญิง ดร. สายสมร เฉลยกิตติ`)
     - **`src/app/approvals/page.tsx`**: ตั้งค่าเริ่มต้นมุมมองรายการเป็น `'CARDS'` (การ์ดเต็ม) อัตโนมัติเมื่อเปิดบนจอมือถือ (`window.innerWidth < 768`), ปรับแถบแท็บหมวดหมู่คำขอ 5 ปุ่มและแถบสถานะให้เลื่อนซ้าย-ขวาได้ลื่นไหลไม่ล้นขอบจอ (`overflow-x-auto no-scrollbar`), และปรับขนาดแถบลอยอนุมัติหลายรายการ (`Floating Sticky Batch Action Bar`) ให้พอดีกับหน้าจอมือถือ
     - **`src/app/schedule/page.tsx`**: ปรับกริดการ์ดสรุปด้านบนเป็น 2 คอลัมน์บนมือถือ (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`), ปรับหัวตารางวันในปฏิทินรายเดือนให้แสดงชื่อวันแบบย่อ (`อา. - ส.`) บนจอมือถือเพื่อไม่ให้คำว่า `"พฤหัสบดี"` ล้นช่อง, และปรับป้ายงานในช่องวันที่ให้กระชับบนจอแคบ
     - **`src/app/borrow/page.tsx`**: ปรับแถบสลับโหมดหลัก (`รายการยืม-เบิกทั่วไป` | `จัดสรรประจำรายวิชาตลอดภาคการศึกษา`) ให้รองรับการเลื่อนแนวนอนบนจอมือถือโดยไม่ตัดบรรทัดซ้อนทับกัน
  2. **จัดระเบียบไฟล์เอกสารใน Root Directory (10 ไฟล์) และอัปเดตทะเบียนคลังความรู้**:
     - ย้ายไฟล์คู่มือการใช้งาน 7 ไฟล์ (`USER_MANUAL.md`, `Nursing_Lab_System_User_Manual*.docx`, `คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาล*.docx`) เข้าโฟลเดอร์ `manual/`
     - ย้ายไฟล์สถาปัตยกรรมและพรีวิว 3 ไฟล์ (`NSS_Lab_System_Flow_Architecture.docx`, `preview_executive_dashboard.html`, `preview_new_features.html`) เข้าโฟลเดอร์ `system_flow/`
     - อัปเดต `LIBRARY_CATALOG.md` หมวดที่ 5 ให้สะท้อนโครงสร้างไฟล์ที่สะอาดเรียบร้อย 100%
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/components/layout/Navbar.tsx`, `src/components/layout/Sidebar.tsx`
  - `src/app/approvals/page.tsx`, `src/app/schedule/page.tsx`, `src/app/borrow/page.tsx`
  - `LIBRARY_CATALOG.md`, `docs/WORK_LOG.md`, `manual/*`, `system_flow/*`
- **ผลตรวจมาตรฐานบรรณารักษ์**: ✅ ผ่าน 100% (Terminology Violations: 0, UTF-8 Mojibake: 0, Loose Root Docs: 0, TypeScript: 0 errors)

### [2026-10-17] ตรวจสอบความถูกต้องของฐานข้อมูลและซ่อมแซมตรรกะการตัดสต็อก/กระทบยอด (Database Integrity & Stock Reconciliation Audit)
- **หมวดหมู่**: Database Integrity / StockLot & StockLotBox / Requisition Dispense / POS Checkout / Cycle Count Reconcile / Reports & Valuation
- **สิ่งที่ดำเนินการ**:
  1. **ซ่อมแซมข้อมูลจริงในฐานข้อมูล (Live PostgreSQL Repair)**:
     - เติมค่า `requestedUnit` ให้ `RequisitionItem` ย้อนหลังทั้งหมด 18 รายการ (จาก 5 ใบเบิกเก่า) ที่เดิมเป็น `null` ให้ตรงตามหน่วยเบิกจริง 100%
     - ซ่อมแซมสถานะกล่อง `StockLotBox` (`CON-GU-001-2569-B002`) ของ `CON-GU-001` (`Lot 111`) จาก `IN_STOCK` เป็น `IN_USE` เพื่อให้จำนวนกล่องที่ยังไม่เปิด (`8 กล่อง`) และกล่องที่กำลังเปิดใช้ (`1 กล่อง`, เหลือเศษ 10 แผ่น) ตรงกับ `quantityRemaining` และ `openPackRemainder` 100%
     - ปรับชื่ออาจารย์ในตาราง `Course` (`01980221` -> `"อาจารย์ นิภาดา ธารีเพียร"`) และ `RoomBooking` (`ROOM-25691013-001` -> `"อาจารย์ จิฬาวัจน์ เลิกนอก"`) ให้ตรงกับตาราง `User`
  2. **แก้ไขตรรกะการตัดสต็อกและเปลี่ยนสถานะกล่อง (`src/app/api/requisitions/[id]/route.ts`)**:
     - เมื่อเบิกแบบแพ็คเต็ม (Whole Pack) ให้ดึงกล่องจากสถานะ `'IN_STOCK'` เท่านั้น ป้องกันการดึงกล่องที่เปิดใช้ค้างอยู่ (`'IN_USE'`) ไปตัดเป็นแพ็คเต็ม
     - คำนวณจำนวนแพ็คเต็มในโหมดเบิกหน่วยย่อยตาม `lot.packSize` ของแต่ละล็อตจริง (รองรับกรณีล็อตนำเข้ามี `packSize` ต่างจาก `item.conversionRatio` เช่น `CS-EBD-2IN`, `CS-EBD-4IN`, `CS-EBD-6IN`, `CS-FEED-BAG`)
     - เมื่อหยิบเศษจากแพ็คที่เปิดค้างอยู่ (`openPackRemainder`) จนหมดพอดี (`newOpen === 0`) ให้อัปเดตกล่อง `'IN_USE'` เป็น `'DISPENSED'` อัตโนมัติ และหากเปิดแพ็คใหม่หลายแพ็คพร้อมกัน ให้ตั้งค่าแพ็คสุดท้ายที่มีเศษเหลือเป็น `'IN_USE'` และแพ็คที่ใช้หมดเต็มจำนวนเป็น `'DISPENSED'`
  3. **ซ่อมแซมระบบตรวจนับสต็อกรายล็อต (`src/app/api/inventory/reconcile/route.ts`) และจุดบริการด่วน POS (`src/app/api/pos/checkout/route.ts`)**:
     - เพิ่มการรองรับ `adjustments` (การตรวจนับสต็อกรายล็อตจากหน้าต่าง Cycle Count ใน `/inventory`) พร้อมปรับสถานะ `StockLotBox` และคำนวณ `piecesRemaining` รวม `openPackRemainder` อัตโนมัติ
     - แก้ไข `/api/pos/checkout` ให้คงค่า `openPackRemainder` เมื่อตัดแพ็คเต็ม, บันทึก `StockTransaction.quantity` เป็นค่าติดลบ (`-deduct`) ตามมาตรฐานเดียวกับใบเบิกปกติ, และระบุ `requestedUnit` ลง `RequisitionItem` ทุกครั้ง
  4. **ปรับปรุงการคำนวณมูลค่าคงคลังและล็อตที่เปิดใช้แล้ว (`src/app/api/reports/route.ts`, `src/app/api/dashboard/route.ts`, `src/components/inventory/ConsumableDetailModal.tsx`, `src/app/api/kits/route.ts`)**:
     - รวมมูลค่าตามสัดส่วนของเศษในแพ็คที่เปิดใช้ (`(openPackRemainder / packSize) * unitCost`) และแสดงล็อตที่ `quantityRemaining === 0` แต่ยังมี `openPackRemainder > 0` (เช่น `CS-FEED-BAG` Lot 9999 ที่เหลือ 90 ใบ) ในรายงานและระบบแจ้งเตือนวันหมดอายุ
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/app/api/requisitions/[id]/route.ts`, `src/app/api/inventory/reconcile/route.ts`, `src/app/api/pos/checkout/route.ts`
  - `src/app/api/reports/route.ts`, `src/app/api/dashboard/route.ts`, `src/app/api/kits/route.ts`, `src/components/inventory/ConsumableDetailModal.tsx`
- **ผลตรวจมาตรฐานบรรณารักษ์**: ✅ ผ่าน 100% (Terminology Violations: 0, UTF-8 Mojibake: 0, TypeScript: 0 errors, DB Anomalies: 0)

### [2026-10-17] ตรวจสอบและจัดระเบียบมาตรฐานคำนำหน้าชื่อ (Prefix & Academic Title Standardization) ทั้งระบบ
- **หมวดหมู่**: Database (`User`, `RequisitionRequest`) / User Utils / Schedule / Approvals / Borrow & Requisition / POS / Notifications & API
- **สิ่งที่ดำเนินการ**:
  1. **อัปเดตข้อมูลคำนำหน้าและตำแหน่งทางวิชาการในฐานข้อมูลจริง (100% ตรงตามทำเนียบคณะพยาบาลศาสตร์ ม.เกษตรศาสตร์)**:
     - ปรับปรุงคณบดี (`saisamorn.c@ku.th`) เป็น `prefix: "รศ. พลตรีหญิง ดร."`, `name: "สายสมร เฉลยกิตติ"`
     - ปรับปรุงคณาจารย์ที่มีตำแหน่งทางวิชาการและวุฒิปริญญาเอก (`รศ.ดร. จินพิชญ์ชา มะมม`, `ผศ.ดร. เพ็ญนภา แดงด้อมยุทธ์`, `ผศ.ดร. ทิพวัลย์ พาลี`, `ผศ. มนปภา กิตติโชติพาณิชย์`, `ดร. มยุรี วงค์ประเทศ`)
     - ปรับปรุงคณาจารย์ (`TEACHER`) 7 ท่านที่เดิมเป็นคำนำหน้าสามัญ (`นาง`/`นางสาว`) ให้เป็น `"อาจารย์"` อย่างเป็นทางการ
     - ปรับปรุง `REQ-20260913-001` จาก `"ณัฐกุล บำรุงราษฎร์"` เป็น `"นายณัฐกุล บำรุงราษฎร์ (แอดมิน)"` และคงสถานะรายการที่แอดมินกดรับทราบแทนอาจารย์ทุกรายการไว้ตามจริง
  2. **ยกระดับไลบรารีกลาง (`src/lib/user-utils.ts`)**:
     - เปลี่ยนคำนำหน้า `'นศ.พย.'` ใน `COMMON_USER_PREFIXES` เป็น `'นส.พย.'` (นิสิตพยาบาล) และเพิ่มรองรับยศทหาร/ตำแหน่งวิชาการผสม (`'รศ. พลตรีหญิง ดร.'`, `'อ.ดร.'`, `'อาจารย์ ดร.'`)
     - ปรับปรุง `formatBaseUserName` และ `formatTeacherName` ให้จัดช่องว่างคำนำหน้าและป้องกันคำนำหน้าซ้อน (`อาจารย์ ผศ.ดร.`) อัตโนมัติ
     - เพิ่มฟังก์ชัน `formatRequesterWithRole(user)` เพื่อระบุบทบาทผู้ยื่นคำขออย่างถูกต้อง (`นิสิต ...`, `อาจารย์ ...`, `เจ้าหน้าที่ ...`)
  3. **การแสดงผลป้ายผู้รับทราบและชื่อบุคคลในทุกหน้า UI**:
     - หน้าตารางงาน (`/schedule`): เปลี่ยนการแสดงป้าย `task.advisorName` มาใช้ `formatAcknowledgeDisplay` เพื่อแยกแสดงป้ายสีฟ้า (`แอดมินรับทราบ: นายณัฐกุล บำรุงราษฎร์`) เมื่อเจ้าหน้าที่รับทราบแทนอาจารย์ และป้ายสีม่วง (`🎓 ผศ.ดร. ...`) เมื่ออาจารย์รับทราบเอง
     - อัปเดตการแสดงชื่อผู้อนุมัติ ผู้จ่ายของ ผู้ตรวจเช็ค และผู้ทำรายการใน `/approvals`, `/rooms`, `/borrow`, `/requisitions`, `/`, `/stock-in`, `/maintenance`, `/pos`, `PosReceiptModal`, และ `PracticeHoursSummary` ให้ผ่าน `formatUserName` / `formatTeacherName` ครบทุกจุด
  4. **ระบบนำเข้าข้อมูลและข้อความแจ้งเตือน API**:
     - ปรับปรุง `/api/users/bulk` ให้ตั้งค่าคำนำหน้าเริ่มต้นของ `TEACHER` เป็น `'อาจารย์'` อัตโนมัติเมื่อไฟล์ Excel ระบุเป็น `นาย`/`นาง`/`นางสาว` หรือเว้นว่าง และแปลง `นศ.พย.` เป็น `นส.พย.`
     - ปรับปรุงข้อความแจ้งเตือนใน `/api/borrow`, `/api/requisitions`, `/api/requests/unified`, `/api/practice/bookings`, `/api/room-bookings`, `/api/room-bookings/batch`, และ `/api/notifications/push/test` ให้แสดงคำนำหน้าครบถ้วนและไม่เรียกอาจารย์หรือเจ้าหน้าที่ว่า `"นิสิต"`
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/lib/user-utils.ts`, `src/app/schedule/page.tsx`, `src/app/approvals/page.tsx`, `src/app/rooms/page.tsx`, `src/app/borrow/page.tsx`, `src/app/requisitions/page.tsx`
  - `src/app/page.tsx`, `src/app/stock-in/page.tsx`, `src/app/maintenance/page.tsx`, `src/app/pos/page.tsx`
  - `src/components/pos/PosReceiptModal.tsx`, `src/components/practice/PracticeHoursSummary.tsx`
  - `src/app/api/users/bulk/route.ts`, `src/app/api/notifications/push/test/route.ts`, `src/app/api/borrow/route.ts`, `src/app/api/requisitions/route.ts`, `src/app/api/requests/unified/route.ts`, `src/app/api/practice/bookings/route.ts`, `src/app/api/room-bookings/route.ts`, `src/app/api/room-bookings/batch/route.ts`
- **ผลตรวจมาตรฐานบรรณารักษ์**: ✅ ผ่าน 100% (Terminology Violations: 0, UTF-8 Mojibake: 0, TypeScript: 0 errors)

### [2026-10-17] ตรวจสอบและแก้ไขการแสดงผลหน่วยนับหลัก/หน่วยย่อย (Unit & Sub-Unit Audit) ทั้งระบบ
- **หมวดหมู่**: Schedule / Approvals / Borrow & Requisition / Dashboard / Courses / Inventory / Reports / Practice Kits
- **สิ่งที่ดำเนินการ**:
  1. **หน้าตารางงาน (`/schedule`) และศูนย์อนุมัติ (`/approvals`)**: แก้ไขการแสดงหน่วยของรายการเบิกวัสดุสิ้นเปลือง (`RequisitionItem`) ทั้งแบบการ์ดใบงานเดี่ยวและแบบรวมคำขอ (`UNIFIED`) จากเดิมที่ดึง `it.item?.unit` (หน่วยแพ็คใหญ่ เช่น `กล่อง`) โดยตรง เปลี่ยนเป็น `it.requestedUnit || (it.isSubUnit ? it.item?.usageUnit : it.item?.unit) || it.item?.unit` ทำให้ใบเบิกหน่วยย่อย (เช่น `REQ-20261017-012` สอบ OSCE) แสดงหน่วยที่เบิกจริง (`คู่`, `อัน`, `ม้วน`) อย่างถูกต้องครบทุกจุด
  2. **หน้ายืม-คืนและเบิกของ (`/borrow`, `/requisitions`)**: ปรับปรุง Fallback การแสดงหน่วยนับกรณี `requestedUnit` ว่าง ให้ตรวจสอบสถานะ `isSubUnit` เพื่อเลือกแสดง `usageUnit` ก่อน `unit`
  3. **หน้าแดชบอร์ด (`/`) และ API รายวิชา (`/api/courses`)**: แก้ไขการแสดงผล `การเคลื่อนไหวสต็อกล่าสุด` และการคำนวณ `itemsUsed` รายวิชา สำหรับรายการเบิกจ่ายหน่วยย่อยที่ `StockTransaction.quantity` (Int) มีค่าเป็น `0` (เนื่องจากตัดจากเศษแพ็คเปิดหรือหักไม่ถึง 1 แพ็คใหญ่) โดยดึงจำนวนและหน่วยจ่ายจริงจาก `tx.note` (เช่น `48 อัน`, `10 ใบ`) แทนการแสดง `0 กล่อง` หรือ `0 แพ๊ค`
  4. **ระบบแจ้งเตือนของใกล้หมด (`Low Stock Threshold & Unit Label`)**: ปรับมาตรฐานการเทียบเกณฑ์ `minStockAlert` และป้ายหน่วยนับใน `/api/items`, `/inventory`, `ConsumableDetailModal`, `/api/dashboard`, `/api/reports`, และ `/reports` ให้ใช้เงื่อนไข `conversionRatio > 1 && minStockAlert >= conversionRatio` เหมือนกันทั้งหมด แก้ปัญหาวัสดุที่ตั้งเกณฑ์แจ้งเตือนเป็นหน่วยย่อย (เช่น `100 แพ๊ค`, `100 เส้น`, `100 ใบ`) ถูกเข้าใจผิดว่าเป็นหน่วยลัง/แพ็คใหญ่จนแจ้งเตือนของใกล้หมดผิดพลาด
  5. **ชุดฝึกปฏิบัติ (`/kits`, `/api/kits`, `/api/reports`)**: แก้ไขการแสดงหน่วยของอุปกรณ์ย่อยภายในชุดฝึกปฏิบัติ การคำนวณความเพียงพอของสต็อก (`availableInSetupUnit`) และการคำนวณต้นทุนต่อชุด ให้ใช้ `usageUnit` และคูณ `conversionRatio` เมื่อวัสดุมีการตั้งค่าการแตกหน่วยย่อย (`conversionRatio > 1`)
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/app/schedule/page.tsx`, `src/app/approvals/page.tsx`, `src/app/borrow/page.tsx`, `src/app/requisitions/page.tsx`
  - `src/app/page.tsx`, `src/app/api/courses/route.ts`
  - `src/app/api/items/route.ts`, `src/app/inventory/page.tsx`, `src/components/inventory/ConsumableDetailModal.tsx`
  - `src/app/api/dashboard/route.ts`, `src/app/api/reports/route.ts`, `src/app/reports/page.tsx`
  - `src/app/api/kits/route.ts`, `src/app/kits/page.tsx`
- **ผลตรวจมาตรฐานบรรณารักษ์**: ✅ ผ่าน 100% (Terminology Violations: 0, UTF-8 Mojibake: 0, TypeScript: 0 errors)

### [2026-10-17] แก้ไขหน้าตารางงานและกำหนดการรับ-คืน (`/schedule`) แสดงข้อมูลตรงตามความเป็นจริง
- **หมวดหมู่**: Schedule / Duty Queue / Borrow & Requisition / Room Booking / Timezone
- **สิ่งที่ดำเนินการ**:
  1. แยกประเภทงาน `ROOM_BOOKING` ออกจากตัวกรองและป้าย `📦 จ่ายของ` (`PICKUP`) บนปฏิทินรายเดือนและตัวกรองย่อยประจำวัน พร้อมเพิ่มปุ่มตัวกรองย่อย `🏢 ใช้ห้อง` (`ROOM`) และสัญลักษณ์ในแถบ Legend
  2. แยกสถานะและวันที่ของรายการยืม (`BORROW`) ระหว่าง `APPROVED` (รอจ่ายของ ใช้วัน `borrowDate`) กับ `BORROWED` (จ่ายของไปแล้ว รอรับคืน ใช้วัน `expectedReturnDate`) ไม่ให้รายการที่จ่ายของออกไปแล้วถูกนับซ้ำเป็นงานจ่ายของหรือแสดงวันที่ยืมในอดีตแทนกำหนดวันคืน
  3. ปรับปรุง `activeQueueTasks` และ `isTaskPastPending` โดยกรองตารางใช้ห้องในอดีต, รอบฝึกแล็บในอดีต, และแผนตรวจสภาพที่เสร็จแล้ว (`COMPLETED`) ออกจากคิวงานค้างจ่าย และให้การ์ด KPI `"รอจ่ายของ"` ตรงกับแท็บตัวกรอง `📦 รอจ่ายของ` 100%
  4. สร้างฟังก์ชัน `toLocalDateKey` แทนที่ `.toISOString().slice(0, 10)` ทั้งหมดเพื่อแก้ปัญหาวันที่เหลื่อม 1 วันจาก Timezone (UTC vs UTC+7) และปรับป้ายเวลาในตารางกระชับ (`Compact Table`) ให้ตรงตามประเภทงานจริง
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/app/schedule/page.tsx`
- **ผลตรวจมาตรฐานบรรณารักษ์**: ✅ ผ่าน 100% (Terminology Violations: 0, UTF-8 Mojibake: 0, TypeScript: 0 errors)

### [2026-10-17] จัดตั้งระบบ AI Sub-agent บรรณารักษ์ (`librarian`) และคลังความรู้กลาง
- **หมวดหมู่**: Architecture / AI Sub-agent / Knowledge Management / Terminology Audit
- **สิ่งที่ดำเนินการ**:
  1. สร้าง Sub-agent `librarian` (`.agents/agents/librarian.md`) และทักษะคู่ใจ (`.agents/skills/librarian/SKILL.md`) สำหรับชี้เป้าพิกัดไฟล์ก่อนเริ่มแก้ไขงาน (Pre-Work Consultation) และตรวจรับหลังจบงาน (Post-Work Archiving) โดยเน้นการประหยัดโทเคนสูงสุด
  2. สร้างสคริปต์ `scripts/librarian-audit.mjs` (`npm run librarian:audit`) สำหรับค้นหาพิกัด UI/API/Prisma/Manuals แบบ Zero-Token และสแกนตรวจจับคำศัพท์ต้องห้ามอัตโนมัติ
  3. จัดทำสารบัญคลังความรู้กลาง `LIBRARY_CATALOG.md` รวบรวมแผนที่ 26 หน้าจอ, 87 API Routes, 34 Prisma Models, 26 ไฟล์คู่มือ และ 35 ไฟล์ผังระบบ
  4. แก้ไขจุดที่ยังมีคำต้องห้ามหลงเหลืออยู่ 4 จุดใน `src/lib/user-utils.ts`, `system_flow/standard_vertical_flowchart.html`, `system_flow/system_flow.md`, และ `system_flow/SYSTEM_OPERATIONAL_FLOWCHART.md` ให้ใช้คำว่า **"นิสิต"** ครบถ้วน 100%
  5. เพิ่มกฎข้อที่ 6 (Mandatory Project Librarian Protocol) ลงใน `AGENTS.md`
- **ไฟล์สำคัญที่แก้ไข/สร้างใหม่**:
  - `.agents/agents/librarian.md`
  - `.agents/skills/librarian/SKILL.md`
  - `scripts/librarian-audit.mjs`
  - `LIBRARY_CATALOG.md`
  - `docs/WORK_LOG.md`
  - `AGENTS.md`, `package.json`
  - `src/lib/user-utils.ts`, `system_flow/standard_vertical_flowchart.html`, `system_flow/system_flow.md`, `system_flow/SYSTEM_OPERATIONAL_FLOWCHART.md`
- **ผลตรวจมาตรฐานบรรณารักษ์**: ✅ ผ่าน 100% (Terminology Violations: 0, UTF-8 Mojibake: 0)
