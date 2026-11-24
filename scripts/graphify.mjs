#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const isWin = process.platform === 'win32';
const venvBin = isWin
  ? join(rootDir, '.venv', 'Scripts', 'graphify.exe')
  : join(rootDir, '.venv', 'bin', 'graphify');

const cmd = existsSync(venvBin) ? venvBin : 'graphify';
const args = process.argv.slice(2);

const result = spawnSync(cmd, args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(
    `[graphify] ไม่พบคำสั่ง "${cmd}" กรุณาติดตั้งด้วย: python -m venv .venv && .venv/Scripts/pip install "graphifyy[mcp,leiden,watch,pdf,office]"`
  );
  process.exit(1);
}

process.exit(result.status ?? 0);
