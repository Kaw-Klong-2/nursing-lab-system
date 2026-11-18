export const FEEDBACK_ROLE_LABELS: Record<string, string> = {
  USER: 'นิสิต',
  TEACHER: 'อาจารย์',
  APPROVER: 'ผู้อนุมัติ / อาจารย์',
  OFFICER: 'เจ้าหน้าที่ห้องแล็บ',
  EXECUTIVE: 'ผู้บริหาร',
  ADMIN: 'ผู้ดูแลระบบ (Admin)',
  VIEWER: 'ผู้เข้าชม (ดูอย่างเดียว)',
};

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  BORROW: 'ยืม-คืนครุภัณฑ์ & แคตตาล็อก',
  REQUISITION: 'เบิกวัสดุสิ้นเปลือง',
  PRACTICE: 'ฝึกทักษะด้วยตนเอง',
  ROOM_BOOKING: 'จองห้องปฏิบัติการ',
  MAINTENANCE: 'แจ้งซ่อม & ตรวจเช็กครุภัณฑ์',
  OVERALL: 'การใช้งานระบบโดยรวม',
};

export const FEEDBACK_QUICK_TAGS = [
  'ใช้งานง่าย',
  'รวดเร็วทันใจ',
  'ค้นหาพัสดุสะดวก',
  'หน้าตาสวยงาม',
  'ขั้นตอนชัดเจน',
  'อยากให้ปรับปรุงความเร็ว',
  'อยากให้เพิ่มคำอธิบาย',
];

export const RATING_LABELS: Record<number, { text: string; emoji: string; badgeClass: string }> = {
  1: { text: 'ควรปรับปรุงอย่างมาก', emoji: '😞', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' },
  2: { text: 'พอใช้ (มีจุดติดขัด)', emoji: '😐', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800' },
  3: { text: 'ปานกลาง (ใช้งานได้)', emoji: '🙂', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' },
  4: { text: 'ดีมาก (ใช้งานสะดวก)', emoji: '😊', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800' },
  5: { text: 'ดีเยี่ยม ประทับใจมาก!', emoji: '🤩', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
};
