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

### [2026-10-17] แก้ไขปัญหา Popup ปฏิทินเด้งแล้วหายไปเมื่อคลิกหรือแตะวันที่ในปฏิทินรายเดือน (Click-to-Pin Calendar Popover Fix)
- **หมวดหมู่**: UI & Calendar UX (`MasterRoomCalendar`, `CalendarHoverCard`, `Schedule`, `Rooms`)
- **สิ่งที่ดำเนินการ**:
  1. **วิเคราะห์สาเหตุหลัก (Root Causes)**:
     - เดิมช่องวันที่ในปฏิทินทั้ง 3 หน้า (`MasterRoomCalendar.tsx`, `src/app/schedule/page.tsx`, `src/app/rooms/page.tsx`) ผูก `onMouseEnter` เพื่อเปิด `hoverPopover` แต่ผูก `onClick` ให้สั่ง `setHoverPopover(null)` ทันที รวมถึงผูก `window.addEventListener('scroll', () => setHoverPopover(null))` ทำให้เมื่อคลิกหรือแตะบนหน้าจอสัมผัส เหตุการณ์ `mouseenter` จะแสดง Popup เพียงเสี้ยววินาทีแล้วถูก `click` หรือการขยับความสูงของหน้าจอ (`scroll`) สั่งปิดทันที
  2. **เพิ่มระบบปักหมุดค้างเมื่อคลิก (`isPinned` Click-to-Pin Mode)**:
     - **`src/components/calendar/CalendarHoverCard.tsx`**: รองรับพร็อพ `isPinned`, `onClose`, และ `onSelectItem` เมื่ออยู่ในสถานะปักหมุด (`isPinned: true`) การ์ดจะเปิดรับการคลิก (`pointer-events-auto`), แสดงปุ่มกากบาทปิด (`✕`), แสดงรายการทั้งหมดพร้อมแถบเลื่อน (`overflow-y-auto`), รองรับการคลิกที่รายการใน Popup เพื่อเปิดหน้าต่างรายละเอียดกิจกรรมทันที, และปิดอัตโนมัติเมื่อคลิกพื้นที่ว่างด้านนอกหรือกดปุ่ม `Escape`
     - **`src/components/calendar/MasterRoomCalendar.tsx`, `src/app/schedule/page.tsx`, `src/app/rooms/page.tsx`**: เปลี่ยนจาก `onMouseEnter`/`onMouseLeave` เป็น `onPointerEnter`/`onPointerLeave` ที่ทำงานเฉพาะเมาส์ (`e.pointerType === 'mouse'`) เมื่อยังไม่ได้ปักหมุด และเมื่อคลิก/แตะช่องวันที่ที่มีรายการ จะปักหมุด Popup ค้างไว้ (`isPinned: true`) โดยไม่ถูกสั่งปิดจากการเลื่อนหน้าจอหรือขยับเมาส์ออก
- **ไฟล์สำคัญที่แก้ไข**:
  - `src/components/calendar/CalendarHoverCard.tsx`
  - `src/components/calendar/MasterRoomCalendar.tsx`
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
