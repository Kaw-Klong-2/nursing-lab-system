import fs from 'fs';

const artifactDir = 'C:/Users/Nurse2/.gemini/antigravity/brain/d6e319fc-9087-45cf-b5f5-fcd102558f90';
const diecutBase64 = fs.readFileSync(`${artifactDir}/nurse_mascot_diecut.png`).toString('base64');
const shadowBase64 = fs.readFileSync(`${artifactDir}/nurse_mascot_with_shadow.png`).toString('base64');
const origBase64 = fs.readFileSync(`${artifactDir}/.user_uploaded/media_1792668542296_66a4f1a2.png`).toString('base64');

const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ตัวอย่างการไดคัทและจัดวางตัวการ์ตูนพยาบาล (Nurse Mascot Preview) - KUNurse+Lab</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800;900&family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Prompt', 'Sarabun', sans-serif; }
    .checkerboard {
      background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
                        linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
                        linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    .mascot-float {
      animation: gentleFloat 3.5s ease-in-out infinite;
    }
    @keyframes gentleFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-800 antialiased p-4 md:p-8">

  <!-- Control Header -->
  <div class="max-w-6xl mx-auto mb-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200 mb-2">
          <span>✨ ระบบตรวจสอบงานออกแบบก่อนนำไปใช้จริง</span>
        </div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">
          ตัวอย่างผลงานการไดคัทและใส่เงาตัวการ์ตูนพยาบาล (Nurse Mascot Showcase)
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          เปรียบเทียบภาพก่อน-หลังการไดคัท และตัวอย่างการแสดงผลบนหน้าจอเข้าสู่ระบบ (Login Page) ทั้งธีมสว่างและธีมมืด
        </p>
      </div>

      <!-- Controls -->
      <div class="flex flex-wrap items-center gap-2">
        <button onclick="switchView('comparison')" id="btn-comp" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-md shadow-teal-600/20 transition cursor-pointer">
          🔍 ตรวจสอบภาพไดคัท & เงา
        </button>
        <button onclick="switchView('desktop')" id="btn-desk" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer">
          💻 หน้าล็อกอินบนคอม (Desktop)
        </button>
        <button onclick="switchView('mobile')" id="btn-mobi" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer">
          📱 หน้าล็อกอินบนมือถือ (Mobile)
        </button>
      </div>
    </div>
  </div>

  <!-- SECTION 1: Comparison Gallery (ภาพต้นฉบับ vs ไดคัท vs ไดคัทพร้อมเงา) -->
  <div id="view-comparison" class="max-w-6xl mx-auto space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- Card 1: Original -->
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
        <div class="w-full text-center pb-4 border-b border-slate-100 mb-4">
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">1. ภาพต้นฉบับ (Original)</span>
          <p class="text-xs text-slate-400 mt-1">มีพื้นหลังสีขาวรอบตัว ไม่โปร่งแสง</p>
        </div>
        <div class="w-full h-80 bg-slate-200/50 rounded-2xl flex items-center justify-center p-4 overflow-hidden border border-slate-200">
          <img src="data:image/png;base64,${origBase64}" class="max-h-full object-contain" alt="Original">
        </div>
        <div class="w-full mt-4 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl">
          ⚠️ มีกล่องสีขาวติดมาด้วย เมื่อวางบนพื้นหลังสีอื่นจะเห็นขอบสี่เหลี่ยมบดบัง
        </div>
      </div>

      <!-- Card 2: Die-Cut Transparent -->
      <div class="bg-white rounded-3xl p-6 border border-teal-200 shadow-sm flex flex-col items-center relative ring-2 ring-teal-500/10">
        <div class="w-full text-center pb-4 border-b border-teal-50 mb-4">
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">2. ไดคัทโปร่งใส (Clean Die-cut)</span>
          <p class="text-xs text-teal-600 mt-1">ลบพื้นหลังขาวเนียนกริบ 100%</p>
        </div>
        <div class="w-full h-80 checkerboard rounded-2xl flex items-center justify-center p-4 overflow-hidden border border-slate-200">
          <img src="data:image/png;base64,${diecutBase64}" class="max-h-full object-contain" alt="Die-cut">
        </div>
        <div class="w-full mt-4 text-[11px] text-teal-700 bg-teal-50/70 p-3 rounded-xl">
          ✅ ลบพื้นหลังรอบนอกออกจนใสสนิท (ตารางหมากรุกแสดงความโปร่งใส) แต่รักษาชุดและหมวกสีขาวไว้ครบถ้วน
        </div>
      </div>

      <!-- Card 3: Die-Cut with 3D Shadow -->
      <div class="bg-white rounded-3xl p-6 border border-emerald-300 shadow-lg shadow-emerald-500/5 flex flex-col items-center relative ring-2 ring-emerald-500/20">
        <div class="absolute -top-3 right-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full shadow-sm">
          🌟 แนะนำสำหรับใช้งาน
        </div>
        <div class="w-full text-center pb-4 border-b border-emerald-50 mb-4">
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">3. ไดคัท + เงา 3D (With Pedestal Shadow)</span>
          <p class="text-xs text-emerald-600 mt-1">เพิ่มเงามือและเงาสัมผัสพื้นอย่างมีมิติ</p>
        </div>
        <div class="w-full h-80 bg-gradient-to-br from-teal-50/60 to-emerald-50/60 rounded-2xl flex items-center justify-center p-4 overflow-hidden border border-teal-100">
          <img src="data:image/png;base64,${shadowBase64}" class="max-h-full object-contain drop-shadow-md" alt="With Shadow">
        </div>
        <div class="w-full mt-4 text-[11px] text-emerald-800 bg-emerald-50/80 p-3 rounded-xl">
          ✨ มีเงานุ่มทอดยาวใต้ฝ่าเท้า (Contact Ground Shadow) ทำให้ตัวการ์ตูนดูมีมิติ เสมือนยืนอยู่บนพื้นจริง ไม่ดูลอย
        </div>
      </div>

    </div>

    <!-- Background test preview bar -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
        <span>🎨 ทดสอบวางตัวการ์ตูนบนพื้นหลังสีต่างๆ:</span>
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Light Teal -->
        <div class="h-48 rounded-2xl bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center border border-teal-200 shadow-inner">
          <img src="data:image/png;base64,${shadowBase64}" class="h-40 object-contain drop-shadow" alt="On light teal">
        </div>
        <!-- Mint Sky -->
        <div class="h-48 rounded-2xl bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-100/50 flex items-center justify-center border border-sky-200 shadow-inner">
          <img src="data:image/png;base64,${shadowBase64}" class="h-40 object-contain drop-shadow" alt="On mint sky">
        </div>
        <!-- Warm Peach/Cream -->
        <div class="h-48 rounded-2xl bg-gradient-to-br from-amber-50/70 via-rose-50/40 to-slate-50 flex items-center justify-center border border-amber-200 shadow-inner">
          <img src="data:image/png;base64,${shadowBase64}" class="h-40 object-contain drop-shadow" alt="On warm cream">
        </div>
        <!-- Original Dark (For contrast check) -->
        <div class="h-48 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
          <img src="data:image/png;base64,${shadowBase64}" class="h-40 object-contain drop-shadow-[0_10px_15px_rgba(255,255,255,0.1)]" alt="On dark">
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 2: Desktop Login Mockup (จำลองหน้าจอเข้าสู่ระบบแบบเต็มจอ) -->
  <div id="view-desktop" class="max-w-5xl mx-auto hidden space-y-4">
    <!-- Theme Switcher for Desktop -->
    <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <span class="text-xs font-bold text-slate-700">สลับโทนสีหน้าล็อกอินเพื่อดูความต่าง:</span>
      <div class="flex gap-2">
        <button onclick="setTheme('light')" id="thm-light" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white shadow-sm cursor-pointer">
          ☀️ ธีมสว่างใหม่ (Medical Clean - แนะนำ)
        </button>
        <button onclick="setTheme('dark')" id="thm-dark" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer">
          🌙 ธีมมืดเดิม (Dark Slate)
        </button>
      </div>
    </div>

    <!-- Login Container -->
    <div id="desktop-bg" class="rounded-3xl p-8 md:p-12 min-h-[620px] flex items-center justify-center relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-teal-50/80 via-slate-50 to-emerald-50/70 border border-teal-100 shadow-2xl shadow-teal-900/10">
      
      <!-- Ambient Glow Orbs -->
      <div id="glow-1" class="w-96 h-96 rounded-full bg-teal-200/40 blur-3xl absolute -top-20 -left-20 pointer-events-none"></div>
      <div id="glow-2" class="w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl absolute -bottom-20 -right-20 pointer-events-none"></div>

      <!-- Split Layout Grid -->
      <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
        
        <!-- Left Side: Nurse Mascot & Welcome Speech -->
        <div class="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left space-y-4">
          
          <!-- Speech Bubble -->
          <div id="speech-box" class="relative bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-teal-100 text-slate-800 text-xs font-medium space-y-1 max-w-xs animate-bounce-slight">
            <div class="flex items-center gap-1.5 text-teal-700 font-bold text-sm">
              <span>สวัสดีค่ะ! ยินดีต้อนรับค่ะ</span>
              <span class="text-base">👩‍⚕️✨</span>
            </div>
            <p id="speech-text" class="text-slate-600 leading-relaxed text-[12px]">
              ยินดีต้อนรับอาจารย์ เจ้าหน้าที่ และ<strong>นิสิต</strong> สู่ระบบบริหารจัดการห้องปฏิบัติการพยาบาลค่ะ
            </p>
            <!-- Bubble tail -->
            <div class="absolute -bottom-2 left-8 md:left-12 w-4 h-4 bg-white border-r border-b border-teal-100 transform rotate-45"></div>
          </div>

          <!-- Nurse Mascot Image with Shadow -->
          <div class="relative pt-2 pl-4">
            <img src="data:image/png;base64,${shadowBase64}" class="w-56 md:w-64 object-contain mascot-float filter drop-shadow-md" alt="Mascot">
          </div>

          <!-- Quick badges -->
          <div class="hidden md:flex flex-col gap-2 pt-2">
            <div class="flex items-center gap-2 text-xs font-semibold text-teal-800 bg-white/80 px-3 py-1.5 rounded-xl border border-teal-100 shadow-sm">
              <span>🏥</span> จองห้องฝึกปฏิบัติการ & ห้องแล็บ
            </div>
            <div class="flex items-center gap-2 text-xs font-semibold text-teal-800 bg-white/80 px-3 py-1.5 rounded-xl border border-teal-100 shadow-sm">
              <span>📦</span> ระบบเบิก-ยืมพัสดุและเวชภัณฑ์
            </div>
          </div>
        </div>

        <!-- Right Side: Login Card -->
        <div class="md:col-span-7">
          <div id="login-card" class="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-teal-100/80 space-y-5">
            
            <!-- Card Header -->
            <div class="border-b border-slate-100 pb-4">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-teal-600/30">
                  +
                </div>
                <div>
                  <h2 id="card-title" class="text-lg font-black text-slate-800 tracking-tight">KUNurse+Lab Sign In</h2>
                  <p id="card-sub" class="text-xs text-slate-500">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</p>
                </div>
              </div>
            </div>

            <!-- Form -->
            <div class="space-y-4">
              <div>
                <label id="lbl-user" class="block text-xs font-bold text-slate-700 mb-1">รหัสประจำตัว (ID) หรือ อีเมล</label>
                <input type="text" readonly value="นิสิต เช่น 6610210099 หรืออาจารย์/เจ้าหน้าที่" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-400 font-medium">
              </div>

              <div>
                <div class="flex justify-between items-center mb-1">
                  <label id="lbl-pass" class="block text-xs font-bold text-slate-700">รหัสผ่าน</label>
                  <span class="text-[11px] text-teal-600 font-semibold cursor-pointer">ลืมรหัสผ่าน?</span>
                </div>
                <input type="password" readonly value="••••••••" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-400 font-medium">
              </div>

              <div class="flex items-center justify-between text-xs text-slate-600">
                <label class="flex items-center gap-2">
                  <input type="checkbox" checked readonly class="rounded text-teal-600">
                  <span id="lbl-remember">จดจำฉันไว้ในระบบ</span>
                </label>
                <span class="text-[10px] text-slate-400">ค้างไว้ 30 วัน</span>
              </div>

              <button class="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer">
                <span>เข้าสู่ระบบด้วยรหัสผ่าน</span>
                <span>→</span>
              </button>

              <div class="relative my-3 text-center">
                <span class="bg-white px-3 text-[11px] text-slate-400 font-medium">หรือเข้าสู่ระบบด้วย</span>
              </div>

              <!-- Google Button Simulation -->
              <div class="w-full py-2.5 border border-slate-300 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm cursor-pointer">
                <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
                <span>เข้าสู่ระบบด้วย Google (@ku.th)</span>
              </div>
            </div>

            <!-- Footer in Card -->
            <div class="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
              ความปลอดภัยมาตรฐาน Bcrypt • คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- SECTION 3: Mobile View Mockup -->
  <div id="view-mobile" class="max-w-md mx-auto hidden space-y-4">
    <div class="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-medium">
      📱 ตัวอย่างการแสดงผลบนสมาร์ตโฟน (ตัวการ์ตูนยืนต้อนรับเหนือบอร์ดล็อกอิน)
    </div>

    <!-- Mobile Screen Frame -->
    <div class="w-full rounded-[40px] border-8 border-slate-800 bg-gradient-to-br from-teal-50 via-slate-50 to-emerald-50 shadow-2xl p-6 min-h-[700px] flex flex-col justify-center relative overflow-hidden">
      
      <!-- Top Mascot Center Header -->
      <div class="text-center flex flex-col items-center space-y-1 mb-3">
        <!-- Floating Speech Badge -->
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-teal-800 text-[11px] font-bold shadow-md border border-teal-100 mb-1 animate-bounce-slight">
          <span>สวัสดีค่ะ ยินดีต้อนรับอาจารย์และนิสิตค่ะ ✨</span>
        </div>

        <!-- Mascot Image -->
        <div class="relative w-32 h-44 flex items-center justify-center">
          <img src="data:image/png;base64,${shadowBase64}" class="max-h-full object-contain mascot-float drop-shadow-sm" alt="Mobile Mascot">
        </div>

        <h2 class="text-xl font-black text-slate-800 tracking-tight">KUNurse<span class="text-teal-600">+</span>Lab</h2>
        <p class="text-[11px] text-teal-700 font-medium">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</p>
      </div>

      <!-- Compact Mobile Login Card -->
      <div class="bg-white/95 rounded-3xl p-5 shadow-xl border border-teal-100 space-y-3.5">
        <div>
          <label class="block text-[11px] font-bold text-slate-700 mb-1">รหัสประจำตัว หรือ อีเมล</label>
          <input type="text" readonly placeholder="เช่น 6610210099 หรืออีเมล" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
        </div>

        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="block text-[11px] font-bold text-slate-700">รหัสผ่าน</label>
            <span class="text-[10px] text-teal-600 font-semibold">ลืมรหัสผ่าน?</span>
          </div>
          <input type="password" readonly placeholder="กรอกรหัสผ่าน" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs">
        </div>

        <button class="w-full py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-md shadow-teal-600/30">
          เข้าสู่ระบบ
        </button>

        <div class="w-full py-2 border border-slate-300 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 bg-white">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
          <span>Google Sign-In (@ku.th)</span>
        </div>
      </div>

    </div>
  </div>

  <script>
    function switchView(view) {
      document.getElementById('view-comparison').classList.add('hidden');
      document.getElementById('view-desktop').classList.add('hidden');
      document.getElementById('view-mobile').classList.add('hidden');

      document.getElementById('btn-comp').className = 'px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer';
      document.getElementById('btn-desk').className = 'px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer';
      document.getElementById('btn-mobi').className = 'px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer';

      if (view === 'comparison') {
        document.getElementById('view-comparison').classList.remove('hidden');
        document.getElementById('btn-comp').className = 'px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-md shadow-teal-600/20 transition cursor-pointer';
      } else if (view === 'desktop') {
        document.getElementById('view-desktop').classList.remove('hidden');
        document.getElementById('btn-desk').className = 'px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-md shadow-teal-600/20 transition cursor-pointer';
      } else if (view === 'mobile') {
        document.getElementById('view-mobile').classList.remove('hidden');
        document.getElementById('btn-mobi').className = 'px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-md shadow-teal-600/20 transition cursor-pointer';
      }
    }

    function setTheme(theme) {
      const bg = document.getElementById('desktop-bg');
      const card = document.getElementById('login-card');
      const speech = document.getElementById('speech-box');
      const speechText = document.getElementById('speech-text');
      const title = document.getElementById('card-title');
      const sub = document.getElementById('card-sub');
      const lblUser = document.getElementById('lbl-user');
      const lblPass = document.getElementById('lbl-pass');
      const lblRem = document.getElementById('lbl-remember');
      const glow1 = document.getElementById('glow-1');
      const glow2 = document.getElementById('glow-2');

      const btnLight = document.getElementById('thm-light');
      const btnDark = document.getElementById('thm-dark');

      if (theme === 'dark') {
        bg.className = 'rounded-3xl p-8 md:p-12 min-h-[620px] flex items-center justify-center relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 border border-slate-800 shadow-2xl';
        card.className = 'bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-slate-800 space-y-5';
        speech.className = 'relative bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-800 text-slate-100 text-xs font-medium space-y-1 max-w-xs';
        speechText.className = 'text-slate-300 leading-relaxed text-[12px]';
        title.className = 'text-lg font-black text-white tracking-tight';
        sub.className = 'text-xs text-teal-400';
        lblUser.className = 'block text-xs font-bold text-slate-300 mb-1';
        lblPass.className = 'block text-xs font-bold text-slate-300';
        lblRem.className = 'text-slate-300';
        glow1.className = 'w-96 h-96 rounded-full bg-teal-600/10 blur-3xl absolute -top-20 -left-20 pointer-events-none';
        glow2.className = 'w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl absolute -bottom-20 -right-20 pointer-events-none';

        btnDark.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white shadow-sm cursor-pointer';
        btnLight.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer';
      } else {
        bg.className = 'rounded-3xl p-8 md:p-12 min-h-[620px] flex items-center justify-center relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-teal-50/80 via-slate-50 to-emerald-50/70 border border-teal-100 shadow-2xl shadow-teal-900/10';
        card.className = 'bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-teal-100/80 space-y-5';
        speech.className = 'relative bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-teal-100 text-slate-800 text-xs font-medium space-y-1 max-w-xs';
        speechText.className = 'text-slate-600 leading-relaxed text-[12px]';
        title.className = 'text-lg font-black text-slate-800 tracking-tight';
        sub.className = 'text-xs text-slate-500';
        lblUser.className = 'block text-xs font-bold text-slate-700 mb-1';
        lblPass.className = 'block text-xs font-bold text-slate-700';
        lblRem.className = 'text-slate-700';
        glow1.className = 'w-96 h-96 rounded-full bg-teal-200/40 blur-3xl absolute -top-20 -left-20 pointer-events-none';
        glow2.className = 'w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl absolute -bottom-20 -right-20 pointer-events-none';

        btnLight.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white shadow-sm cursor-pointer';
        btnDark.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer';
      }
    }
  </script>
</body>
</html>
`;

fs.writeFileSync(`${artifactDir}/mascot_and_login_preview.html`, htmlContent, 'utf8');
console.log('Generated preview HTML at:', `${artifactDir}/mascot_and_login_preview.html`);
