# เอกสารการเชื่อมต่อ API ตารางการใช้ห้องปฏิบัติการพยาบาล
## (Nursing Lab Room Schedule Integration API Specification)

เอกสารนี้จัดทำขึ้นสำหรับทีมนักพัฒนาระบบภายนอก / ระบบจองห้องกลางของคณะ เพื่อใช้ในการดึงข้อมูลตารางการใช้งานห้องปฏิบัติการพยาบาลศาสตร์ (Nursing Lab) ไปแสดงผลบนตารางปฏิทินรวม หรือซิงค์ข้อมูลลงฐานข้อมูล Supabase ปลายทาง

---

## 1. ข้อมูลพื้นฐานการเชื่อมต่อ (Endpoint Overview)

* **Protocol**: HTTPS RESTful API (JSON Response)
* **Production Base URL**: `https://nursing-lab-system.vercel.app`
* **Endpoint URL**: `GET /api/external/room-schedules`
* **Authentication Method**: API Key ผ่าน HTTP Header หรือ Query Parameter
* **HTTP Header ที่จำเป็น**:
  ```http
  x-api-key: lab_nursing_sync_key_2026_sec
  ```
  *(หรือใช้ Authorization: Bearer `lab_nursing_sync_key_2026_sec`)*

---

## 2. พารามิเตอร์การค้นหา (Query Parameters)

| พารามิเตอร์ (Param) | ชนิดข้อมูล | บังคับ | ตัวอย่างค่า | คำอธิบาย |
| :--- | :---: | :---: | :--- | :--- |
| `date` | String | ไม่บังคับ | `2026-10-15` | กรองเฉพาะข้อมูลของวันที่ระบุ (YYYY-MM-DD) |
| `start_date` | String | ไม่บังคับ | `2026-10-01` | วันเริ่มต้นของช่วงวันที่ต้องการดึง |
| `end_date` | String | ไม่บังคับ | `2026-10-31` | วันสิ้นสุดของช่วงวันที่ต้องการดึง |
| `month` | Integer | ไม่บังคับ | `10` | เดือนที่ต้องการดึง (1 - 12) *ต้องใช้คู่กับ year* |
| `year` | Integer | ไม่บังคับ | `2026` | ปี ค.ศ. ที่ต้องการดึง (เช่น 2026) |
| `room_code` | String | ไม่บังคับ | `LAB-SIM-01` | กรองเฉพาะรหัสห้องที่ต้องการ |
| `status` | String | ไม่บังคับ | `ALL` | ค่าเริ่มต้นคือ `ALL` ส่งทั้ง `APPROVED` (อนุมัติแล้ว) และ `PENDING` (รออนุมัติ) หรือระบุ `APPROVED`, `PENDING`, หรือคอมม่าคั่น `APPROVED,PENDING` ได้ |
| `type` | String | ไม่บังคับ | `timetable` | **กรองประเภทข้อมูล:** <br>• `timetable`: ดึงเฉพาะตารางเรียนประจำภาคเรียน (สำหรับหน้า **"ตารางสอน & ตารางเรียนประจำภาคเรียน (Academic Timetables)"**)<br>• `general` หรือ `booking`: ดึงเฉพาะการจองห้องปกติทั่วไป (สำหรับหน้า **"ตาราง & รายการห้องและพื้นที่"**)<br>• `all` (ค่าเริ่มต้น): ส่งทั้งหมด พร้อมฟิลด์ `is_timetable` ให้ฝั่งโน้นคัดกรองเอง |

> **หมายเหตุ:** 
> 1. หากไม่ระบุพารามิเตอร์วันที่ใดๆ ระบบจะส่งข้อมูลรายการที่อนุมัติแล้วและกำลังรอพิจารณา **ตั้งแต่วันนี้ล่วงหน้า 60 วัน** ให้อัตโนมัติ
> 2. ทุกรายการจะมีฟิลด์จำแนกประเภทส่งให้อย่างชัดเจน: `is_timetable` (`true`/`false`), `schedule_type` (`"timetable"` / `"general_booking"`), และ `category` (`"TIMETABLE"` / `"BOOKING"`) เพื่อให้ระบบกลางนำไปแสดงผลตรงตามหน้าจอเป๊ะๆ 100%
> 3. รายการที่เป็น **ตารางเรียน (`is_timetable: true`)** จะมีค่า `student_year` ระบุชั้นปีของนิสิต (เช่น `1`, `2`, `3`, `4`) เพื่อให้นำไปแสดงในแท็บ `นิสิต 1` - `นิสิต 4` ได้อย่างถูกต้อง

---

## 3. ตัวอย่างการเรียกใช้งาน (Request Example)

### cURL
```bash
curl -X GET "https://nursing-lab-system.vercel.app/api/external/room-schedules?date=2026-10-15" \
  -H "x-api-key: lab_nursing_sync_key_2026_sec"
```

### JavaScript / TypeScript (Fetch API)
```typescript
const response = await fetch('https://nursing-lab-system.vercel.app/api/external/room-schedules?date=2026-10-15', {
  method: 'GET',
  headers: {
    'x-api-key': 'lab_nursing_sync_key_2026_sec',
  },
});

const result = await response.json();
console.log('พบรายการจองห้องแล็บ:', result.count);
```

---

## 4. โครงสร้างข้อมูลที่ส่งกลับ (JSON Response Schema)

```json
{
  "success": true,
  "source": "Nursing Lab System",
  "count": 1,
  "filter": {
    "status": "APPROVED",
    "room_code": "ALL",
    "date": "2026-10-15"
  },
  "data": [
    {
      "id": "cmts1234567890abcdef",
      "booking_code": "ROOM-25691015-001",
      "is_timetable": true,
      "schedule_type": "timetable",
      "schedule_type_th": "ตารางเรียน",
      "category": "TIMETABLE",
      "requester_type": "personnel",
      "booking_type": "academic",
      "course_code": "01418112",
      "course_name": "การพยาบาลผู้ใหญ่และผู้สูงอายุ 1 (ชั้นปีที่ 2)",
      "course_name_raw": "การพยาบาลผู้ใหญ่และผู้สูงอายุ 1",
      "student_year": 2,
      "term_semester": "1/2569",
      "course_target_year": 2,
      "course_year_level": "ชั้นปีที่ 2",
      "instructor_name": "ผศ.ดร.สมชาย ใจดี",
      "overall_objective": "[ตารางเรียน] การเรียนการสอนภาคปฏิบัติการสวนปัสสาวะ",
      "status": "pending",
      "status_raw": "PENDING",
      "booking_status": "PENDING",
      "status_th": "รออนุมัติ",
      "is_approved": false,
      "is_pending": true,
      "requester_name": "ผศ.ดร.สมชาย ใจดี",
      "requester_email": "somchai.j@ku.th",
      "requester_phone": "081-234-5678",
      "requester_student_id": null,
      "room_id": "cuid_lab_01",
      "room_code": "LAB-01-1",
      "room_name": "ห้องปฏิบัติการทางการพยาบาลพื้นฐาน 1/3",
      "building_location": "อาคารวิทยบริการ ชั้น 3",
      "booking_date": "2026-10-15",
      "start_time": "08:30:00",
      "end_time": "12:00:00",
      "slot_objective": "การเรียนการสอนภาคปฏิบัติการสวนปัสสาวะ",
      "participants": 32,
      "equipment_req": [
        "หุ่นจำลองสวนปัสสาวะ",
        "เตียงผู้ป่วยสาธิต 8 เตียง",
        "ชุดให้สารน้ำ"
      ],
      "deep_link_url": "https://nursing-lab-system.vercel.app/rooms?bookingNumber=ROOM-25691015-001",
      "created_at": "2026-10-09T08:30:00.000Z",
      "updated_at": "2026-10-09T09:15:00.000Z"
    }
  ]
}
```

---

## 5. ตารางการจับคู่ข้อมูลลงฐานข้อมูล Supabase ปลายทาง (Target Field Mapping)

เมื่อระบบปลายทางดึงข้อมูลไป สามารถนำค่าไป `insert` หรือ `upsert` ลงตารางทั้ง 2 ของท่านได้ทันที:

### ตาราง `room_bookings` (หัวใบจอง)
| ข้อมูลจาก API แล็บ | คอลัมน์เป้าหมายใน `room_bookings` | ตัวอย่างค่า | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `booking_code` | `booking_code` | `ROOM-25691015-001` | รหัสอ้างอิงใบจอง |
| `requester_type` | `requester_type` | `personnel` หรือ `guest` | ประเภทผู้ขอจอง |
| `booking_type` | `booking_type` | `academic`, `meeting`, หรือ `event` | ประเภทวัตถุประสงค์ |
| `course_code` | `course_code` | `01418112` | รหัสวิชา |
| `course_name` | `course_name` | `การพยาบาลผู้ใหญ่และผู้สูงอายุ 1 (ชั้นปีที่ 2)` | ชื่อวิชา (มีชั้นปีกำกับเพื่อแสดงผลบนตารางปฏิทินทันที) |
| `student_year` | `student_year` | `2` (Integer) | ชั้นปีของนิสิต (ตรงกับคอลัมน์ลำดับที่ 8 ใน room_bookings) |
| `term_semester` | `term_semester` | `1/2569` (Text) | ภาคการศึกษา (ตรงกับคอลัมน์ลำดับที่ 9 ใน room_bookings) |
| `course_target_year` | `student_year` | `2` (Integer) | ฟิลด์สำรองสำหรับชั้นปี |
| `instructor_name` | `instructor_name` | `ผศ.ดร.สมชาย ใจดี` | อาจารย์ผู้รับผิดชอบ |
| `overall_objective` | `overall_objective` | `การเรียนการสอนภาคปฏิบัติ...` | วัตถุประสงค์ |
| `requester_name` | `guest_name` | `ผศ.ดร.สมชาย ใจดี` | ผู้ติดต่อ |
| `requester_email` | `guest_email` | `somchai.j@ku.th` | อีเมล |
| `requester_phone` | `guest_phone` | `081-234-5678` | เบอร์โทรศัพท์ |
| `equipment_req` | `equipment_req` | Array ของอุปกรณ์ | รายการอุปกรณ์ที่ขอใช้ |
| `status` | `status` | `approved` | สถานะใบจอง |
| `deep_link_url` | `admin_notes` | บันทึก URL ลิงก์ตรงกลับมาระบบแล็บ | ลิงก์ตรงสำหรับเปิดดูในระบบแล็บ |

### ตาราง `room_booking_slots` (สล็อตเวลาบนปฏิทิน)
| ข้อมูลจาก API แล็บ | คอลัมน์เป้าหมายใน `room_booking_slots` | ตัวอย่างค่า |
| :--- | :--- | :--- |
| (UUID จากหัวใบจอง) | `booking_id` | Foreign Key จากตาราง `room_bookings` |
| (UUID ของห้องที่แมปได้) | `room_id` | Match จาก `room_details.id` โดยใช้ `room_code` |
| `booking_date` | `booking_date` | `2026-10-15` (YYYY-MM-DD) |
| `start_time` | `start_time` | `08:30:00` (HH:mm:ss) |
| `end_time` | `end_time` | `12:00:00` (HH:mm:ss) |
| `slot_objective` | `slot_objective` | ชื่องานหรือวัตถุประสงค์ช่วงเวลานี้ |
| `participants` | `participants` | จำนวนคน (ตัวเลข) |

---

## 6. การคลิกข้ามระบบ (Single Sign-On & Deep Linking)

* ทุกรายการใน JSON จะมีฟิลด์ **`deep_link_url`**
* เมื่อผู้ใช้คลิกจากปฏิทินของท่าน ลิงก์จะเปิดมายังหน้าห้องแล็บของระบบพยาบาลศาสตร์ทันที:
  `https://nursing-lab-system.vercel.app/rooms?bookingNumber=ROOM-25691015-001`
* **การยืนยันตัวตน:** หากผู้ใช้เคยล็อกอินด้วย Google (`@ku.th`) ในเบราว์เซอร์นั้นอยู่แล้ว ระบบจะเปิดหน้ารายละเอียดการจองของห้องนั้นให้ทันทีโดยไม่ต้องกรอกรหัสผ่านซ้ำ

---

## 7. รายชื่อรหัสห้องแล็บที่เปิดใช้งานจริง (`room_code` Mapping List)

| รหัสห้อง (`room_code`) | ชื่อห้องปฏิบัติการ | อาคาร / สถานที่ |
| :--- | :--- | :--- |
| `LAB-01-1` | ห้องปฏิบัติการทางการพยาบาลพื้นฐาน 1/3 | อาคารวิทยบริการ ชั้น 3 |
| `LAB-01-2` | ห้องปฏิบัติการทางการพยาบาลพื้นฐาน 2/3 | อาคารวิทยบริการ ชั้น 3 |
| `LAB-01-3` | ห้องปฏิบัติการทางการพยาบาลพื้นฐาน 3/3 | อาคารวิทยบริการ ชั้น 3 |
| `LAB-03` | ห้องปฏิบัติการสุขภาพจิตฯ และการพยาบาลอนามัยชุมชน | อาคารวิทยบริการ ชั้น 3 |
| `LAB-04` | ห้องปฏิบัติการทางการพยาบาลเด็กและวัยรุ่น | อาคารวิทยบริการ ชั้น 3 |
| `LAB-05` | ห้องปฏิบัติการทางการพยาบาลมารดา ทารก และผดุงครรภ์ | อาคารวิทยบริการ ชั้น 3 |
| `LAB-06` | ห้องปฏิบัติการทางการพยาบาลผู้ใหญ่และผู้สูงอายุ | อาคารวิทยบริการ ชั้น 3 |
| `LAB-07` | ห้องสังเกตการณ์ และ debrief | อาคารวิทยบริการ ชั้น 3 |
| `LAB-SIM-MAN` | SIM MAN (หุ่นจำลองเสมือนจริงขั้นสูง) | อาคารวิทยบริการ ชั้น 3 |
| `LAB-SIM-MOM` | SIM MOM (หุ่นจำลองคลอดเสมือนจริงขั้นสูง) | อาคารวิทยบริการ ชั้น 3 |

