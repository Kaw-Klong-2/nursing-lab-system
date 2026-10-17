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
