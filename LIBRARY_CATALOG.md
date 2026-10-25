# 📚 สารบัญคลังความรู้กลาง (LAB-system Master Library Catalog)

> **ดูแลโดย**: AI Sub-agent บรรณารักษ์ (`librarian`)  
> **คำสั่งค้นหาด่วน (ประหยัดโทเคน)**: `node scripts/librarian-audit.mjs --search <คำค้น>`  
> **คำสั่งตรวจสุขภาพคลังความรู้**: `npm run librarian:audit`

เอกสารนี้คือ **แผนที่นำทางกลาง (Single Source of Truth)** ของโปรเจกต์ระบบห้องปฏิบัติการพยาบาล (`d:\LAB-system`) สำหรับให้ทั้งผู้พัฒนา, AI Main Agent, และ Sub-agent `librarian` ใช้ค้นหาพิกัดไฟล์ คู่มือ หน้าจอ API และตารางฐานข้อมูลได้อย่างแม่นยำโดยไม่ต้องสุ่มเปิดอ่านไฟล์

---

## 📖 หมวดที่ 1: คู่มือการใช้งานระบบฉบับหลัก (Canonical User Manuals)

| กลุ่มผู้ใช้งาน | ไฟล์ต้นฉบับล่าสุด (Canonical File) | รูปแบบ | รายละเอียดสำคัญ |
| :--- | :--- | :--- | :--- |
| **ทุกบทบาท (ฉบับสมบูรณ์)** | [`manual/คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาล_ฉบับสมบูรณ์.docx`](file:///d:/LAB-system/manual/%E0%B8%84%E0%B8%B9%E0%B9%88%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B8%AB%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B8%9B%E0%B8%8F%E0%B8%B4%E0%B8%9A%E0%B8%B1%E0%B8%95%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%9E%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B2%E0%B8%A5_%E0%B8%89%E0%B8%9A%E0%B8%B1%E0%B8%9A%E0%B8%AA%E0%B8%A1%E0%B8%9A%E0%B8%B9%E0%B8%A3%E0%B8%93%E0%B9%8C.docx) | `.docx` / `.pdf` | คู่มือหลักฉบับสมบูรณ์ ฟอนต์ TH Sarabun New 16pt พร้อมภาพและ Flowchart |
| **ทุกบทบาท (Markdown)** | [`manual/USER_MANUAL.md`](file:///d:/LAB-system/manual/USER_MANUAL.md) | `.md` | เนื้อหาคู่มือฉบับข้อความสำหรับค้นหาและแก้ไข |
| **นิสิตพยาบาล (ฉบับสมบูรณ์)** | [`manual/คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล_ฉบับสมบูรณ์_ข้อมูลระบบจริง.pdf`](file:///d:/LAB-system/manual/%E0%B8%84%E0%B8%B9%E0%B9%88%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B8%AA%E0%B8%B3%E0%B8%AB%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%99%E0%B8%B4%E0%B8%AA%E0%B8%B4%E0%B8%95%E0%B8%9E%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B2%E0%B8%A5_%E0%B8%89%E0%B8%9A%E0%B8%B1%E0%B8%9A%E0%B8%AA%E0%B8%A1%E0%B8%9A%E0%B8%B9%E0%B8%A3%E0%B8%93%E0%B9%8C_%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B8%88%E0%B8%A3%E0%B8%B4%E0%B8%87.pdf) | `.pdf` | คู่มือเฉพาะสำหรับนิสิต (การจองห้องฝึกปฏิบัติการ, การเบิก-ยืม-คืน) |
| **นิสิตพยาบาล (Source)** | [`manual/STUDENT_USER_MANUAL.md`](file:///d:/LAB-system/manual/STUDENT_USER_MANUAL.md) / [`STUDENT_USER_MANUAL.html`](file:///d:/LAB-system/manual/STUDENT_USER_MANUAL.html) | `.md` / `.html` | ต้นฉบับคู่มือนิสิตสำหรับแก้ไขและส่งออกเป็น PDF/Word |
| **การเชื่อมต่อตารางห้องภายนอก** | [`manual/EXTERNAL_ROOM_SYNC_API_SPEC.md`](file:///d:/LAB-system/manual/EXTERNAL_ROOM_SYNC_API_SPEC.md) | `.md` | เอกสารสเปก API สำหรับซิงก์ตารางการใช้ห้องปฏิบัติการกับระบบภายนอก |

---

## 🏛️ หมวดที่ 2: แผนภาพสถาปัตยกรรมและผังงาน (System Flowcharts & Architecture)

| ประเภทแผนภาพ | ไฟล์ต้นฉบับ (Source) | ไฟล์พร้อมใช้งาน (HTML / PDF / Word) |
| :--- | :--- | :--- |
| **ผังขั้นตอนการปฏิบัติงานแนวตั้ง (Operational Vertical Flowchart)** | [`system_flow/SYSTEM_OPERATIONAL_FLOWCHART.md`](file:///d:/LAB-system/system_flow/SYSTEM_OPERATIONAL_FLOWCHART.md) | [`system_flow/system_operational_flowchart.html`](file:///d:/LAB-system/system_flow/system_operational_flowchart.html), [`system_operational_flowchart.docx`](file:///d:/LAB-system/system_flow/system_operational_flowchart.docx) |
| **ผังงานมาตรฐานแนวตั้ง (Standard Vertical Flowchart)** | [`system_flow/standard_vertical_flowchart.html`](file:///d:/LAB-system/system_flow/standard_vertical_flowchart.html) | [`system_flow/standard_vertical_flowchart.docx`](file:///d:/LAB-system/system_flow/standard_vertical_flowchart.docx), [`standard_vertical_flowchart_doc.pdf`](file:///d:/LAB-system/system_flow/standard_vertical_flowchart_doc.pdf) |
| **สถาปัตยกรรมความเชื่อมโยง 6 มิติ (System Architecture Overview)** | [`system_flow/SYSTEM_ARCHITECTURE_OVERVIEW.md`](file:///d:/LAB-system/system_flow/SYSTEM_ARCHITECTURE_OVERVIEW.md) | [`system_flow/SYSTEM_ARCHITECTURE_OVERVIEW.html`](file:///d:/LAB-system/system_flow/SYSTEM_ARCHITECTURE_OVERVIEW.html), [`SYSTEM_ARCHITECTURE_OVERVIEW.pdf`](file:///d:/LAB-system/system_flow/SYSTEM_ARCHITECTURE_OVERVIEW.pdf) |
| **ผังความสัมพันธ์ระบบ (Relationship Architecture)** | [`system_flow/SYSTEM_RELATIONSHIP_ARCHITECTURE.md`](file:///d:/LAB-system/system_flow/SYSTEM_RELATIONSHIP_ARCHITECTURE.md) | [`system_flow/SYSTEM_RELATIONSHIP_ARCHITECTURE.html`](file:///d:/LAB-system/system_flow/SYSTEM_RELATIONSHIP_ARCHITECTURE.html) |
| **ผังระบบจุดจ่ายพัสดุด่วน (POS Flowchart)** | [`system_flow/lab_store_pos_flowchart.html`](file:///d:/LAB-system/system_flow/lab_store_pos_flowchart.html) | เปิดดูแบบ Interactive ในเบราว์เซอร์ |
| **สไลด์นำเสนอโครงการ (Presentation)** | [`presentation/PRESENTATION_SPEAKER_SCRIPT.md`](file:///d:/LAB-system/presentation/PRESENTATION_SPEAKER_SCRIPT.md) | [`presentation/index.html`](file:///d:/LAB-system/presentation/index.html), [`Nursing_Lab_System_Presentation.pptx`](file:///d:/LAB-system/presentation/Nursing_Lab_System_Presentation.pptx) |

---

## 🧩 หมวดที่ 3: สารบัญโมดูล หน้าจอ API และฐานข้อมูล (System Modules Map)

| โมดูล (Module) | หน้าจอ UI (`src/app/`) | จุดเชื่อมต่อ API (`src/app/api/`) | คอมโพเนนต์และไลบรารีหลัก (`src/components/`, `src/lib/`) | ตารางฐานข้อมูล (`prisma/schema.prisma`) |
| :--- | :--- | :--- | :--- | :--- |
| **1. แดชบอร์ดและภาพรวมผู้บริหาร (Dashboard & Executive)** | `/` (`page.tsx`), `/executive` | `/api/dashboard`, `/api/executive/stats` | `DashboardCharts.tsx`, `StudentDashboard.tsx`, `CourseBudgetDonut.tsx`, `module-theme.ts` | `ActivityLog`, `AcademicTerm`, `Course` |
| **2. คลังพัสดุ ครุภัณฑ์ และล็อตเวชภัณฑ์ (Inventory & Stock-In)** | `/inventory`, `/stock-in`, `/asset/[code]`, `/consumable/[...code]` | `/api/items/*`, `/api/categories/*`, `/api/stock/in`, `/api/inventory/reconcile`, `/api/consumables/public/[...code]` | `ConsumableDetailModal.tsx`, `AssetQrModal.tsx`, `ConsumableQrModal.tsx`, `BatchAssetStickerModal.tsx` | `Category`, `Item`, `EquipmentAsset`, `StockLot`, `StockTransaction`, `StockLotBox` |
| **3. ตู้เก็บพัสดุและสถานที่จัดเก็บ (Storage & Cabinets)** | `/storage/[code]`, `/storage/room/[code]` | `/api/storage/locations/*`, `/api/storage/public/[code]`, `/api/storage/rooms/[code]` | `StorageManagementTab.tsx`, `CabinetFormModal.tsx`, `MobileCabinetAuditModal.tsx`, `AssignItemsModal.tsx` | `StorageLocation` |
| **4. การแบ่งบรรจุและชุดสเตอร์ไรด์ (Repack & Sterile Packs)** | `/repack` | `/api/repack` | `BatchRepackStickerModal.tsx`, `BoxStickerModal.tsx` | `RepackRecord`, `RepackPackItem` |
| **5. ชุดอุปกรณ์ฝึกปฏิบัติตามรายวิชา (Procedure Kits & Courses)** | `/kits`, `/courses` | `/api/kits/*`, `/api/courses/*` | `CourseBudgetDonut.tsx` | `Course`, `PracticeKit`, `PracticeKitItem` |
| **6. การยืม-คืน การเบิก และศูนย์จ่ายพัสดุ (Borrow, Requisitions & Dispense Center)** | `/borrow`, `/requisitions`, `/approvals`, `/dispense`, `/verify/[code]`, `/verify/borrow/[code]` | `/api/borrow/*`, `/api/requisitions/*` (incl. `/return`), `/api/dispense/*`, `/api/requests/unified`, `/api/requests/edit`, `/api/cron/reminders` | `BorrowSlipModal.tsx`, `RequisitionSlipModal.tsx`, `ConsumableReturnModal.tsx`, `UnifiedRequestModal.tsx`, `EditRequestModal.tsx`, `NewAllocationModal.tsx`, `BulkAllocationReturnModal.tsx`, `approval-scope.ts` | `BorrowRequest`, `BorrowItem`, `RequisitionRequest`, `RequisitionItem` |
| **7. จุดจ่าย-รับคืนด่วนด้วยสแกนเนอร์ (Lab Store POS)** | `/pos` | `/api/pos/scan`, `/api/pos/checkout`, `/api/pos/return` | `PosReceiptModal.tsx`, `QrScannerModal.tsx`, `scanner-utils.ts` | `BorrowRequest`, `RequisitionRequest`, `EquipmentAsset`, `StockTransaction` |
| **8. จองห้องฝึกปฏิบัติการของนิสิตและตารางการใช้ห้อง (Practice & Room Schedule)** | `/practice`, `/rooms`, `/schedule` | `/api/practice/*`, `/api/rooms/*`, `/api/room-bookings/*`, `/api/external/room-schedules`, `/api/holidays` | `MasterRoomCalendar.tsx`, `CalendarHoverCard.tsx`, `PracticeHoursSummary.tsx`, `date-time-utils.ts` | `PracticeRoom`, `PracticeSlot`, `PracticeBooking`, `PracticeConfig`, `RoomBooking`, `AcOperationLog`, `CustomHoliday` |
| **9. ซ่อมบำรุงและตรวจเช็กสภาพครุภัณฑ์ (Maintenance & Inspection)** | `/maintenance` | `/api/maintenance/*` (`assets`, `inspections`, `issues`, `plans`) | - | `MaintenanceLog`, `InspectionLog`, `EquipmentIssueReport`, `InspectionPlan`, `InspectionPlanItem` |
| **10. ผู้ใช้งาน สิทธิ์การเข้าถึง และความปลอดภัย (Users, Auth & Audit)** | `/login`, `/admin` (incl. `admin/error.tsx`), `/users`, `/audit-logs`, `/settings/terms`, `error.tsx` (Global) | `/api/auth/*` (`heartbeat`), `/api/users/*` (`active-sessions`, `analytics`, `/force-logout`), `/api/backup` | `auth-context.tsx`, `auth-security.ts`, `google-auth.ts`, `user-presence.ts`, `DailyUsageCharts.tsx`, `user-utils.ts`, `SessionActivityWatcher.tsx`, `ProfileModal.tsx` | `User`, `ActivityLog`, `AcademicTerm` |
| **11. ระบบแจ้งเตือนและ Web Push (Notifications & Auto Return Reminder)** | `/settings/notifications` | `/api/notifications/*`, `/api/cron/reminders`, `/api/settings/notifications/*` | `NotificationBell.tsx`, `PushNotificationManager.tsx`, `notifications.ts`, `notification-templates.ts`, `email.ts`, `webpush.ts` | `Notification`, `PushSubscription`, `NotificationTemplate` |
| **12. รายงานและส่งออกข้อมูล (Reports & Exports)** | `/reports` | `/api/reports` | `exportStickerDocx.ts`, `exportStickerPdf.ts` | ทุกตารางหลัก |

---

## 🤖 หมวดที่ 4: ทะเบียน AI Sub-agents และ Skills ประจำโปรเจกต์ (`.agents/`)

### Sub-agents (`.agents/agents/`)
- **[`librarian`](file:///d:/LAB-system/.agents/agents/librarian.md)**: AI Sub-agent บรรณารักษ์ประจำโปรเจกต์ ดูแลดัชนีคลังความรู้ ชี้เป้าพิกัดไฟล์ก่อนแก้ไขงาน (Pre-Work Briefing) และตรวจสอบคำศัพท์ ("นิสิต") พร้อมบันทึกงานหลังแก้ไขเสร็จ (Post-Work Archiving)

### Workspace Skills (`.agents/skills/`)
1. **[`librarian`](file:///d:/LAB-system/.agents/skills/librarian/SKILL.md)**: คู่มือปฏิบัติการของบรรณารักษ์และขั้นตอน Pre-Work / Post-Work
2. **[`prevent-encoding-and-duplicate-declarations`](file:///d:/LAB-system/.agents/skills/prevent-encoding-and-duplicate-declarations/SKILL.md)**: ป้องกันปัญหาภาษาไทยเพี้ยน (UTF-8 Mojibake) และการประกาศตัวแปรซ้ำ
3. **[`frontend-ui-engineering`](file:///d:/LAB-system/.agents/skills/frontend-ui-engineering/SKILL.md)**: แนวทางการออกแบบและพัฒนา UI ระดับ Production
4. **[`dark-mode-design-expert`](file:///d:/LAB-system/.agents/skills/dark-mode-design-expert/SKILL.md)**: มาตรฐานสีและคอนทราสต์สำหรับ Dark Mode
5. **[`data-visualization-expert`](file:///d:/LAB-system/.agents/skills/data-visualization-expert/SKILL.md)**: แนวทางสร้างกราฟ Recharts และ KPI Cards
6. **[`executive-intelligence-and-analytics`](file:///d:/LAB-system/.agents/skills/executive-intelligence-and-analytics/SKILL.md)**: การออกแบบแดชบอร์ดผู้บริหาร 3 ระดับ
7. **[`diagram-design`](file:///d:/LAB-system/.agents/skills/diagram-design/SKILL.md)**: การสร้างแผนภาพสถาปัตยกรรมและ Flowchart คุณภาพสูง
8. **[`code-review-and-quality`](file:///d:/LAB-system/.agents/skills/code-review-and-quality/SKILL.md)**: การตรวจสอบคุณภาพโค้ดหลายมิติก่อนรวมโค้ด
9. **[`scrutinize`](file:///d:/LAB-system/.agents/skills/scrutinize/SKILL.md)**: การทบทวนแผนงานและการเปลี่ยนแปลงโค้ดตั้งแต่ต้นจนจบ
10. **[`debug-mantra`](file:///d:/LAB-system/.agents/skills/debug-mantra/SKILL.md)** & **[`debugging-and-error-recovery`](file:///d:/LAB-system/.agents/skills/debugging-and-error-recovery/SKILL.md)**: กระบวนการวิเคราะห์และแก้ไขบั๊กจากต้นตอ
11. **[`security-and-hardening`](file:///d:/LAB-system/.agents/skills/security-and-hardening/SKILL.md)**: มาตรฐานความปลอดภัยของการรับข้อมูลและสิทธิ์ผู้ใช้
12. **[`post-mortem`](file:///d:/LAB-system/.agents/skills/post-mortem/SKILL.md)** & **[`management-talk`](file:///d:/LAB-system/.agents/skills/management-talk/SKILL.md)**: การเขียนบันทึกสรุปสาเหตุบั๊กและรายงานสำหรับผู้บริหาร
13. **[`qwen-agent`](file:///d:/LAB-system/.agents/skills/qwen-agent/SKILL.md)** & **[`qwenchance`](file:///d:/LAB-system/.agents/skills/qwenchance/SKILL.md)**: การกระจายงานย่อยและการจัดการ Context

---

## 🗂️ หมวดที่ 5: สถานะการจัดระเบียบไฟล์เอกสาร (Organized Documentation Status)

> **สถานะล่าสุดจากบรรณารักษ์**: ไฟล์เอกสาร คู่มือ และไฟล์พรีวิว HTML ที่เคยวางกระจัดกระจายอยู่หน้า Root (`d:\LAB-system\`) ได้ถูกย้ายจัดเก็บเข้าโฟลเดอร์มาตรฐานเรียบร้อยแล้ว 100% (หน้า Root คงเหลือเฉพาะไฟล์โครงสร้างโปรเจกต์ `AGENTS.md`, `LIBRARY_CATALOG.md`, `package.json`, `tsconfig.json` เท่านั้น)

- **โฟลเดอร์ [`manual/`](file:///d:/LAB-system/manual)**:
  - `manual/USER_MANUAL.md`
  - `manual/คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาล_ฉบับสมบูรณ์.docx`
  - `manual/คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาล_ฉบับสมบูรณ์_ชื่อจำลอง.docx`
  - `manual/คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาล_ฉบับสมบูรณ์_ฟอนต์16_มีFlow.docx`
  - `manual/คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาล_ฉบับสมบูรณ์_มีFlow.docx`
  - `manual/Nursing_Lab_System_User_Manual.docx` / `manual/Nursing_Lab_System_User_Manual_Deluxe.docx`
- **โฟลเดอร์ [`system_flow/`](file:///d:/LAB-system/system_flow)**:
  - `system_flow/NSS_Lab_System_Flow_Architecture.docx`
  - `system_flow/preview_executive_dashboard.html` / `system_flow/preview_new_features.html`

