---
name: librarian
description: >-
  คู่มือปฏิบัติการของ AI บรรณารักษ์ (Project Librarian & Knowledge Curator) ประจำโปรเจกต์ LAB-system.
  ใช้สำหรับค้นหาพิกัดไฟล์/API/ฐานข้อมูล/เอกสารคู่มือแบบประหยัดโทเคนก่อนเริ่มแก้ไขงาน (Pre-Work Check),
  การจัดระเบียบสารบัญคลังความรู้กลาง (LIBRARY_CATALOG.md), การบันทึกประวัติการพัฒนา (docs/WORK_LOG.md),
  และการตรวจสอบมาตรฐานคำศัพท์ ("นิสิต") และความเรียบร้อยของไฟล์หลังทำงานเสร็จ (Post-Work Audit).
---

# 📚 ทักษะบรรณารักษ์ประจำโปรเจกต์ (LAB-system Librarian Skill)

ทักษะนี้กำหนดขั้นตอนมาตรฐานสำหรับ **AI Sub-agent `librarian`** และ **Main Agent** ในการดูแลคลังความรู้และตรวจสอบงานทุกครั้งที่มีการแก้ไขใน `d:\LAB-system`

---

## 1. ขั้นตอนก่อนเริ่มแก้ไขงาน (Pre-Work Consultation)

เลือกวิธีที่ประหยัดโทเคนที่สุดตามขนาดของงาน:

### กรณีที่ A: งานแก้ไขทั่วไป / ทราบชื่อโมดูลชัดเจน (ใช้โทเคนต่ำสุด ~200 โทเคน)
ไม่ต้องเปิด Sub-agent ใหม่ ให้รันคำสั่งค้นหาด่วนของบรรณารักษ์โดยตรง:
```powershell
node scripts/librarian-audit.mjs --search <keyword>
```
หรือเปิดอ่านเฉพาะหมวดที่เกี่ยวข้องใน [LIBRARY_CATALOG.md](file:///d:/LAB-system/LIBRARY_CATALOG.md) และดูบันทึกงานล่าสุดใน [docs/WORK_LOG.md](file:///d:/LAB-system/docs/WORK_LOG.md)

### กรณีที่ B: งานซับซ้อน / กระทบหลายโมดูล / ต้องสำรวจไฟล์จำนวนมาก
ให้เรียกใช้ Sub-agent `librarian` ด้วยโมเดลความเร็วสูง (`Model: "flash"`):
```json
{
  "Subagents": [
    {
      "TypeName": "librarian",
      "Role": "Project Librarian",
      "Model": "flash",
      "Prompt": "ทำ Pre-Work Briefing สำหรับงาน: [อธิบายงานที่จะทำ] โดยรัน scripts/librarian-audit.mjs และสรุปพิกัด UI, API, Prisma Model, และเอกสารคู่มือที่เกี่ยวข้องกลับมาไม่เกิน 15 บรรทัด"
    }
  ]
}
```

---

## 2. ขั้นตอนหลังแก้ไขงานเสร็จ (Post-Work Audit & Archiving)

ทุกครั้งหลังจากแก้ไขโค้ดหรือเอกสารเสร็จสิ้น:

1. **รันตรวจสอบมาตรฐานคลังความรู้และคำศัพท์**:
   ```powershell
   npm run librarian:audit
   ```
   - ตรวจสอบว่าผลลัพธ์รายงาน `✅ ผ่าน 100%: ไม่พบการใช้คำต้องห้ามในซอร์สโค้ดและเอกสาร` (ใช้คำว่า **"นิสิต"** เท่านั้น)
   - ตรวจสอบว่าไม่มีปัญหา UTF-8 Mojibake (`\uFFFD`)

2. **บันทึกประวัติลงสมุดงาน ([docs/WORK_LOG.md](file:///d:/LAB-system/docs/WORK_LOG.md))**:
   เพิ่มรายการบันทึกใหม่ไว้บนสุดของหมวดบันทึกประจำวัน โดยมีโครงสร้างกระชับดังนี้:
   ```markdown
   ### [YYYY-MM-DD] ชื่องานที่แก้ไข/พัฒนา
   - **หมวดหมู่**: (เช่น Inventory / Borrow / Practice / Manual / Architecture)
   - **สิ่งที่ดำเนินการ**: สรุปสั้นๆ 1–2 บรรทัดว่าแก้ไขอะไรและเพราะอะไร
   - **ไฟล์สำคัญที่เกี่ยวข้อง**: ระบุ path ไฟล์หลักที่แก้ไข
   ```

3. **อัปเดตสารบัญคลังความรู้ ([LIBRARY_CATALOG.md](file:///d:/LAB-system/LIBRARY_CATALOG.md)) (เฉพาะเมื่อมีไฟล์ใหม่/ลบไฟล์)**:
   หากมีการเพิ่มหน้าจอใหม่, API Route ใหม่, Prisma Model ใหม่, AI Skill ใหม่ หรือไฟล์คู่มือใหม่ ให้อัปเดตตารางใน `LIBRARY_CATALOG.md` ทันที
