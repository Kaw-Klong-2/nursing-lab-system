#!/usr/bin/env node
/**
 * 🏷️ LAB-system Version Bump & Sync Utility
 * -----------------------------------------
 * อัปเดตเลขเวอร์ชันและวันที่ Build ให้ตรงกันทั้งใน package.json และ src/lib/version.ts
 *
 * การใช้งาน:
 *   npm run version:patch   # เช่น 2.6.0 -> 2.6.1 (แก้บั๊กย่อย / ปรับ UI)
 *   npm run version:minor   # เช่น 2.6.0 -> 2.7.0 (เพิ่มฟีเจอร์ใหม่)
 *   npm run version:major   # เช่น 2.6.0 -> 3.0.0 (ยกเครื่องระบบหลัก)
 *   node scripts/version-bump.mjs 2.8.0  # กำหนดเลขเวอร์ชันเองโดยตรง
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const pkgPath = path.join(ROOT_DIR, 'package.json');
const versionTsPath = path.join(ROOT_DIR, 'src', 'lib', 'version.ts');

const arg = (process.argv[2] || 'patch').toLowerCase();
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '2.6.0';
const parts = currentVersion.split('.').map((n) => parseInt(n, 10) || 0);

let nextVersion = currentVersion;
if (/^\d+\.\d+\.\d+$/.test(arg)) {
  nextVersion = arg;
} else if (arg === 'major') {
  nextVersion = `${parts[0] + 1}.0.0`;
} else if (arg === 'minor') {
  nextVersion = `${parts[0]}.${parts[1] + 1}.0`;
} else {
  nextVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

const today = new Date().toISOString().slice(0, 10);

// 1. Update package.json
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// 2. Update src/lib/version.ts
const versionTsContent = `/**
 * ศูนย์กลางข้อมูลเลขเวอร์ชันของระบบ (Single Source of Truth)
 * ซิงก์ตรงกับ package.json เสมอผ่านคำสั่ง npm run version:patch | version:minor | version:major
 */
export const APP_VERSION = '${nextVersion}';
export const APP_BUILD_DATE = '${today}';
export const APP_SUITE_NAME = 'KUNurse Lab Suite';
`;
fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');

console.log(`✅ อัปเดตเวอร์ชันระบบสำเร็จ: v${currentVersion} -> v${nextVersion} (Build Date: ${today})`);
