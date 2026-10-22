import fs from 'fs';
import { execSync } from 'child_process';

const artifactDir = 'C:/Users/Nurse2/.gemini/antigravity/brain/d6e319fc-9087-45cf-b5f5-fcd102558f90';

const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style> body { font-family: 'Prompt', sans-serif; } </style>
</head>
<body class="bg-gradient-to-br from-teal-50/80 via-slate-50 to-emerald-50/70 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
  
  <!-- Ambient Orbs -->
  <div class="w-72 h-72 rounded-full bg-teal-200/40 blur-3xl absolute -top-10 -left-10 pointer-events-none"></div>
  <div class="w-72 h-72 rounded-full bg-emerald-200/30 blur-3xl absolute -bottom-10 -right-10 pointer-events-none"></div>

  <div class="max-w-sm w-full space-y-4 relative z-10 py-2">
    <!-- Brand Header -->
    <div class="text-center space-y-1.5">
      <div class="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-600/20 mb-0.5">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
      </div>
      <h1 class="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-0.5">
        <span>KUNurse</span><span class="text-teal-600 font-black select-none">+</span><span>Lab</span>
      </h1>
      <p class="text-xs text-teal-800 font-semibold flex items-center justify-center gap-1.5">
        <span>🏛️</span> ระบบบริหารจัดการห้องปฏิบัติการพยาบาล
      </p>
      <p class="text-[11px] text-slate-500">
        คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์
      </p>
    </div>

    <!-- Login Card -->
    <div class="bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-teal-950/5 border border-teal-100/80 space-y-4">
      <div class="border-b border-slate-100 pb-2.5">
        <h2 class="text-sm font-bold text-slate-800">เข้าสู่ระบบ (Sign In)</h2>
        <p class="text-[11px] text-slate-500 mt-0.5">กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบงานจริง</p>
      </div>

      <div class="space-y-3.5">
        <div>
          <label class="block text-[11px] font-bold text-slate-700 mb-1">รหัสประจำตัว (ID) หรือ อีเมล</label>
          <input type="text" readonly placeholder="เช่น admin, 6610210099 หรืออีเมล" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-400">
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-[11px] font-bold text-slate-700">รหัสผ่าน</label>
            <span class="text-[11px] text-teal-600 font-semibold">ลืมรหัสผ่าน?</span>
          </div>
          <input type="password" readonly placeholder="กรอกรหัสผ่าน" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-400">
        </div>

        <div class="flex items-center justify-between px-0.5">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked class="w-3.5 h-3.5 rounded text-teal-600">
            <span class="text-[11px] font-medium text-slate-700">จดจำฉันไว้ในระบบ</span>
          </label>
          <span class="text-[10px] text-slate-400">ค้างไว้ 30 วัน</span>
        </div>

        <button class="w-full py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2">
          <span>เข้าสู่ระบบด้วยรหัสผ่าน</span>
          <span>→</span>
        </button>

        <div class="relative my-2 text-center">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
          <span class="bg-white px-2 text-[10px] uppercase font-semibold text-slate-400 relative">หรือเข้าสู่ระบบด้วย</span>
        </div>

        <!-- Google Button -->
        <div class="w-full py-2.5 border border-slate-300 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 bg-white shadow-sm">
          <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
          <span>เข้าสู่ระบบด้วย Google (@ku.th)</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center text-[10px] text-slate-400">
      KUNurse+Lab &bull; คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์
    </div>
  </div>

</body>
</html>
`;

const htmlPath = `${artifactDir}/mobile_zero_scroll.html`;
const screenshotPath = `${artifactDir}/mobile_zero_scroll_verified.png`;
fs.writeFileSync(htmlPath, html, 'utf8');

const browserPath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const cmd = `"${browserPath}" --headless --disable-gpu --screenshot="${screenshotPath}" --window-size=412,892 "file:///${htmlPath.replace(/\\\\/g, '/')}"`;
execSync(cmd);
console.log('Zero scroll mobile screenshot saved successfully!');
