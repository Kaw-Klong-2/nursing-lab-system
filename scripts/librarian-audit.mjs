#!/usr/bin/env node
/**
 * 📚 LAB-system Librarian Audit & Fast Knowledge Indexer (Zero-Token CLI Helper)
 * ------------------------------------------------------------------------------
 * เครื่องมือคู่ใจของ AI Sub-agent บรรณารักษ์ (librarian) และ Main Agent
 *
 * การใช้งาน:
 *   node scripts/librarian-audit.mjs                  # รันตรวจสุขภาพคลังความรู้และคำศัพท์ ("นิสิต")
 *   node scripts/librarian-audit.mjs --audit          # ตรวจสอบกฎคำศัพท์ ("นิสิต"), UTF-8 Mojibake และไฟล์หน้า Root
 *   node scripts/librarian-audit.mjs --stats          # สรุปจำนวน Pages, APIs, Prisma Models, Manuals และ Skills
 *   node scripts/librarian-audit.mjs --search <คำค้น>  # ค้นหาพิกัดไฟล์ หน้าจอ API ตารางฐานข้อมูล และเอกสารอย่างรวดเร็ว
 *   node scripts/librarian-audit.mjs --json           # แสดงผลลัพธ์ทั้งหมดในรูปแบบ JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// คำที่ห้ามใช้ตามกฎข้อ 5 ใน AGENTS.md (เข้ารหัส Unicode เพื่อไม่ให้มีคำต้องห้ามปรากฏในซอร์สโค้ด)
// ต้องใช้คำว่า "นิสิต" เท่านั้น
const FORBIDDEN_TERM = '\u0e19\u0e31\u0e01\u0e28\u0e36\u0e01\u0e29\u0e32';
const REQUIRED_TERM = 'นิสิต';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
]);

function walkFiles(dir, filterFn = () => true, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, filterFn, results);
    } else if (filterFn(fullPath, entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function toRel(absPath) {
  return path.relative(ROOT_DIR, absPath).replace(/\\/g, '/');
}

function getPrismaModels() {
  const schemaPath = path.join(ROOT_DIR, 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) return [];
  const content = fs.readFileSync(schemaPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const models = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^model\s+(\w+)\s*\{/);
    if (match) {
      models.push({
        name: match[1],
        line: i + 1,
        file: 'prisma/schema.prisma',
      });
    }
  }
  return models;
}

function getPagesAndApis() {
  const appDir = path.join(ROOT_DIR, 'src', 'app');
  const allFiles = walkFiles(appDir);
  const pages = [];
  const apis = [];

  for (const f of allFiles) {
    const rel = toRel(f);
    if (rel.endsWith('/page.tsx') || rel === 'src/app/page.tsx') {
      const route =
        '/' +
        rel
          .replace(/^src\/app\/?/, '')
          .replace(/\/?page\.tsx$/, '');
      pages.push({ route: route === '/' ? '/' : route, file: rel });
    } else if (rel.endsWith('/route.ts')) {
      const endpoint =
        '/' +
        rel
          .replace(/^src\/app\/?/, '')
          .replace(/\/?route\.ts$/, '');
      apis.push({ endpoint, file: rel });
    }
  }
  return { pages, apis };
}

function getComponentsAndLibs() {
  const compDir = path.join(ROOT_DIR, 'src', 'components');
  const libDir = path.join(ROOT_DIR, 'src', 'lib');
  const components = walkFiles(compDir, (f) => /\.(tsx|ts)$/.test(f)).map(toRel);
  const libs = walkFiles(libDir, (f) => /\.(tsx|ts)$/.test(f)).map(toRel);
  return { components, libs };
}

function getAgentsAndSkills() {
  const agentsDir = path.join(ROOT_DIR, '.agents', 'agents');
  const skillsDir = path.join(ROOT_DIR, '.agents', 'skills');
  const agents = walkFiles(agentsDir, (f) => f.endsWith('.md')).map(toRel);
  const skills = walkFiles(skillsDir, (_, name) => name === 'SKILL.md').map((f) => {
    const rel = toRel(f);
    const skillName = path.basename(path.dirname(f));
    return { name: skillName, file: rel };
  });
  return { agents, skills };
}

function getDocumentationFiles() {
  const docDirs = ['manual', 'system_flow', 'presentation', 'docs'];
  const docs = {};
  for (const d of docDirs) {
    const abs = path.join(ROOT_DIR, d);
    docs[d] = fs.existsSync(abs)
      ? walkFiles(abs, (f) => /\.(md|docx|pdf|html|pptx)$/i.test(f)).map(toRel)
      : [];
  }

  // Check loose docs in root
  const rootEntries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
  const rootDocs = rootEntries
    .filter(
      (e) =>
        e.isFile() &&
        /\.(md|docx|pdf|html|pptx)$/i.test(e.name) &&
        !['AGENTS.md', 'LIBRARY_CATALOG.md', 'README.md'].includes(e.name)
    )
    .map((e) => e.name);

  return { docs, rootDocs };
}

function runTerminologyAndMojibakeAudit() {
  const targetDirs = ['src', 'manual', 'system_flow', 'presentation', 'docs', '.agents'];
  const textFiles = [
    path.join(ROOT_DIR, 'AGENTS.md'),
    path.join(ROOT_DIR, 'LIBRARY_CATALOG.md'),
    path.join(ROOT_DIR, 'USER_MANUAL.md'),
  ].filter((f) => fs.existsSync(f));

  for (const d of targetDirs) {
    walkFiles(
      path.join(ROOT_DIR, d),
      (f) => /\.(ts|tsx|js|mjs|md|html)$/i.test(f) && !f.endsWith('.min.js'),
      textFiles
    );
  }

  const terminologyViolations = [];
  const mojibakeWarnings = [];

  for (const file of textFiles) {
    const rel = toRel(file);
    // ข้ามไฟล์ที่อธิบายกฎห้ามคำศัพท์ เช่น AGENTS.md หรือ SKILL.md ของบรรณารักษ์
    const isRuleDefinitionFile =
      rel === 'AGENTS.md' ||
      rel === 'LIBRARY_CATALOG.md' ||
      rel.startsWith('.agents/');

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!isRuleDefinitionFile && line.includes(FORBIDDEN_TERM)) {
        terminologyViolations.push({
          file: rel,
          line: i + 1,
          snippet: line.trim().slice(0, 120),
        });
      }
      if (!isRuleDefinitionFile && line.includes('\uFFFD')) {
        mojibakeWarnings.push({
          file: rel,
          line: i + 1,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }

  return { terminologyViolations, mojibakeWarnings };
}

function searchKnowledgeBase(keyword) {
  const q = keyword.toLowerCase();
  const { pages, apis } = getPagesAndApis();
  const { components, libs } = getComponentsAndLibs();
  const models = getPrismaModels();
  const { agents, skills } = getAgentsAndSkills();
  const { docs, rootDocs } = getDocumentationFiles();

  const matchedPages = pages.filter(
    (p) => p.route.toLowerCase().includes(q) || p.file.toLowerCase().includes(q)
  );
  const matchedApis = apis.filter(
    (a) => a.endpoint.toLowerCase().includes(q) || a.file.toLowerCase().includes(q)
  );
  const matchedModels = models.filter((m) => m.name.toLowerCase().includes(q));
  const matchedComponents = components.filter((c) => c.toLowerCase().includes(q));
  const matchedLibs = libs.filter((l) => l.toLowerCase().includes(q));
  const matchedSkills = skills.filter((s) => s.name.toLowerCase().includes(q));

  const allDocs = [
    ...Object.values(docs).flat(),
    ...rootDocs,
  ];
  const matchedDocs = allDocs.filter((d) => d.toLowerCase().includes(q));

  return {
    keyword,
    matchedPages,
    matchedApis,
    matchedModels,
    matchedComponents,
    matchedLibs,
    matchedSkills,
    matchedDocs,
    agents,
  };
}

function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const searchIdx = args.indexOf('--search');

  if (searchIdx !== -1 && args[searchIdx + 1]) {
    const keyword = args[searchIdx + 1];
    const res = searchKnowledgeBase(keyword);
    if (isJson) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    console.log(`📚 [Librarian Fast Search] คำค้น: "${keyword}"`);
    console.log(`------------------------------------------------------------`);
    console.log(`🖥️  UI Pages (${res.matchedPages.length}):`);
    res.matchedPages.forEach((p) => console.log(`   - ${p.route} -> ${p.file}`));
    console.log(`🔌 API Routes (${res.matchedApis.length}):`);
    res.matchedApis.forEach((a) => console.log(`   - ${a.endpoint} -> ${a.file}`));
    console.log(`🗄️  Prisma Models (${res.matchedModels.length}):`);
    res.matchedModels.forEach((m) => console.log(`   - ${m.name} (${m.file}#L${m.line})`));
    console.log(`🧩 Components & Libs (${res.matchedComponents.length + res.matchedLibs.length}):`);
    [...res.matchedComponents, ...res.matchedLibs].forEach((c) => console.log(`   - ${c}`));
    console.log(`📖 Manuals & Docs (${res.matchedDocs.length}):`);
    res.matchedDocs.forEach((d) => console.log(`   - ${d}`));
    console.log(`🤖 AI Skills (${res.matchedSkills.length}):`);
    res.matchedSkills.forEach((s) => console.log(`   - ${s.name} -> ${s.file}`));
    return;
  }

  const { pages, apis } = getPagesAndApis();
  const { components, libs } = getComponentsAndLibs();
  const models = getPrismaModels();
  const { agents, skills } = getAgentsAndSkills();
  const { docs, rootDocs } = getDocumentationFiles();
  const audit = runTerminologyAndMojibakeAudit();

  const summary = {
    timestamp: new Date().toISOString(),
    counts: {
      pages: pages.length,
      apis: apis.length,
      prismaModels: models.length,
      components: components.length,
      libs: libs.length,
      subagents: agents.length,
      skills: skills.length,
      manualFiles: docs.manual.length,
      systemFlowFiles: docs.system_flow.length,
      presentationFiles: docs.presentation.length,
      docsFiles: docs.docs.length,
      looseRootDocs: rootDocs.length,
    },
    audit: {
      requiredStudentTerm: REQUIRED_TERM,
      terminologyViolationsCount: audit.terminologyViolations.length,
      terminologyViolations: audit.terminologyViolations.slice(0, 20),
      mojibakeWarningsCount: audit.mojibakeWarnings.length,
      mojibakeWarnings: audit.mojibakeWarnings.slice(0, 20),
      looseRootDocs: rootDocs,
    },
  };

  if (isJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`============================================================`);
  console.log(`📚 รายงานการตรวจสอบคลังความรู้โดย AI บรรณารักษ์ (LAB-system)`);
  console.log(`============================================================`);
  console.log(`📊 สถิติโครงสร้างระบบปัจจุบัน:`);
  console.log(`   • หน้าจอ UI (Pages)         : ${summary.counts.pages} หน้า`);
  console.log(`   • จุดเชื่อมต่อ API (Routes)  : ${summary.counts.apis} รายการ`);
  console.log(`   • ตารางฐานข้อมูล (Prisma)   : ${summary.counts.prismaModels} โมเดล`);
  console.log(`   • คอมโพเนนต์ & ไลบรารี      : ${summary.counts.components} components / ${summary.counts.libs} libs`);
  console.log(`   • AI Sub-agents & Skills   : ${summary.counts.subagents} sub-agents / ${summary.counts.skills} skills`);
  console.log(`   • คู่มือการใช้งาน (manual/)    : ${summary.counts.manualFiles} ไฟล์`);
  console.log(`   • ผังระบบ (system_flow/)    : ${summary.counts.systemFlowFiles} ไฟล์`);
  console.log(`   • สไลด์นำเสนอ (presentation/): ${summary.counts.presentationFiles} ไฟล์`);
  console.log(`   • บันทึกเอกสาร (docs/)       : ${summary.counts.docsFiles} ไฟล์`);
  console.log(`------------------------------------------------------------`);
  console.log(`🛡️ ผลการตรวจสอบมาตรฐานคำศัพท์ (บังคับใช้คำว่า "${REQUIRED_TERM}"):`);
  if (audit.terminologyViolations.length === 0) {
    console.log(`   ✅ ผ่าน 100%: ไม่พบการใช้คำต้องห้ามในซอร์สโค้ดและเอกสาร`);
  } else {
    console.log(`   ⚠️ พบจุดที่ต้องแก้ไข ${audit.terminologyViolations.length} จุด:`);
    audit.terminologyViolations.forEach((v) => {
      console.log(`      - ${v.file}:${v.line} -> ${v.snippet}`);
    });
  }

  console.log(`🔤 ผลการตรวจสอบรหัสอักขระภาษาไทย (UTF-8 Check):`);
  if (audit.mojibakeWarnings.length === 0) {
    console.log(`   ✅ ผ่าน 100%: ไม่พบอักขระภาษาไทยเพี้ยน (Mojibake)`);
  } else {
    console.log(`   ⚠️ พบอักขระผิดปกติ ${audit.mojibakeWarnings.length} จุด:`);
    audit.mojibakeWarnings.forEach((m) => {
      console.log(`      - ${m.file}:${m.line}`);
    });
  }

  console.log(`🗂️ ไฟล์เอกสารที่วางอยู่หน้า Root (${rootDocs.length} ไฟล์):`);
  rootDocs.forEach((r) => console.log(`   • ${r}`));
  console.log(`============================================================`);
}

main();
