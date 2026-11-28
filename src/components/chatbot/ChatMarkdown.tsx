'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';

interface ChatMarkdownProps {
  text: string;
}

/**
 * ตัวแปลงข้อความ Markdown อย่างปลอดภัยสำหรับคำตอบแชทบอท (Pure React)
 * รองรับตาราง Markdown, โค้ดบล็อกพร้อมปุ่มคัดลอก, ตัวหนา, ตัวเอียง, โค้ดอินไลน์, ลิงก์, หัวข้อ และรายการ
 */
function renderInlineTokens(line: string, keyPrefix: string): React.ReactNode[] {
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = line.split(tokenRegex);

  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (!part) return null;

    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      const label = linkMatch[1];
      const href = linkMatch[2].trim();
      if (href.startsWith('/')) {
        return (
          <Link
            key={key}
            href={href}
            className="underline decoration-teal-500/60 font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200"
          >
            {label}
          </Link>
        );
      }
      if (/^https?:\/\//i.test(href)) {
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-teal-500/60 font-semibold text-teal-700 dark:text-teal-300"
          >
            {label}
          </a>
        );
      }
      return <span key={key}>{label}</span>;
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={key} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900/80 text-teal-700 dark:text-teal-300 font-mono text-[11px] border border-slate-200/70 dark:border-slate-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={key} className="italic text-slate-700 dark:text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function CopyableCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-100">
      <div className="px-3 py-1.5 bg-slate-800/80 flex items-center justify-between text-[10px] text-slate-300">
        <span className="font-mono">ข้อความ / ร่างเอกสาร</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white transition cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
        </button>
      </div>
      <pre className="p-3 text-[11px] sm:text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return /^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?$/.test(trimmed);
}

export default function ChatMarkdown({ text }: ChatMarkdownProps) {
  const lines = (text || '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Fenced Code Block (```)
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing ```
      blocks.push(<CopyableCodeBlock key={`code-${i}`} code={codeLines.join('\n')} />);
      continue;
    }

    // 2. Markdown Table (| ... | followed by | --- | --- |)
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headers = parseTableRow(trimmed);
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }

      blocks.push(
        <div
          key={`tbl-${i}`}
          className="my-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"
        >
          <table className="min-w-full text-[11px] sm:text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200">
              <tr>
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="px-2.5 py-1.5 font-bold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"
                  >
                    {renderInlineTokens(h, `th-${i}-${hIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800/50">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 text-slate-700 dark:text-slate-200 align-top">
                      {renderInlineTokens(row[cIdx] || '', `td-${i}-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (!trimmed) {
      blocks.push(<div key={`sp-${i}`} className="h-1" />);
      i += 1;
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      blocks.push(
        <div key={`h-${i}`} className="font-bold text-slate-900 dark:text-white pt-1 text-xs sm:text-sm">
          {renderInlineTokens(headingMatch[2], `h-${i}`)}
        </div>
      );
      i += 1;
      continue;
    }

    const bulletMatch = /^(?:[-•]|\*)\s+(.+)$/.exec(trimmed);
    if (bulletMatch) {
      const indent = rawLine.search(/\S/) >= 2 ? 'pl-3' : '';
      blocks.push(
        <div key={`b-${i}`} className={`flex items-start gap-1.5 ${indent}`}>
          <span className="text-teal-600 dark:text-teal-400 font-bold select-none">•</span>
          <span className="flex-1">{renderInlineTokens(bulletMatch[1], `b-${i}`)}</span>
        </div>
      );
      i += 1;
      continue;
    }

    const numMatch = /^(\d+\.)\s+(.+)$/.exec(trimmed);
    if (numMatch) {
      blocks.push(
        <div key={`n-${i}`} className="flex items-start gap-1.5">
          <span className="text-teal-700 dark:text-teal-300 font-bold shrink-0">{numMatch[1]}</span>
          <span className="flex-1">{renderInlineTokens(numMatch[2], `n-${i}`)}</span>
        </div>
      );
      i += 1;
      continue;
    }

    blocks.push(<div key={`p-${i}`}>{renderInlineTokens(rawLine, `p-${i}`)}</div>);
    i += 1;
  }

  return <div className="space-y-1.5 leading-relaxed break-words">{blocks}</div>;
}
