'use client';

import React from 'react';
import Link from 'next/link';

interface ChatMarkdownProps {
  text: string;
}

/**
 * ตัวแปลงข้อความ Markdown อย่างปลอดภัยสำหรับคำตอบแชทบอท (Pure React)
 * รองรับตัวหนา, ตัวเอียง, โค้ดอินไลน์, ลิงก์ภายใน/ภายนอก, หัวข้อ และรายการ
 */
function renderInlineTokens(line: string, keyPrefix: string): React.ReactNode[] {
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = line.split(tokenRegex);

  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (!part) return null;

    // [label](href)
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

    // **bold**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={key} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // `code`
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

    // *italic*
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

export default function ChatMarkdown({ text }: ChatMarkdownProps) {
  const lines = (text || '').split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed break-words">
      {lines.map((rawLine, lineIdx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Heading ### / ## / #
        const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
        if (headingMatch) {
          return (
            <div
              key={lineIdx}
              className="font-bold text-slate-900 dark:text-white pt-1 text-xs sm:text-sm"
            >
              {renderInlineTokens(headingMatch[2], `h-${lineIdx}`)}
            </div>
          );
        }

        // Bullet list (- or • or *)
        const bulletMatch = /^(?:[-•]|\*)\s+(.+)$/.exec(trimmed);
        if (bulletMatch) {
          const indent = rawLine.search(/\S/) >= 2 ? 'pl-3' : '';
          return (
            <div key={lineIdx} className={`flex items-start gap-1.5 ${indent}`}>
              <span className="text-teal-600 dark:text-teal-400 font-bold select-none">•</span>
              <span className="flex-1">{renderInlineTokens(bulletMatch[1], `b-${lineIdx}`)}</span>
            </div>
          );
        }

        // Numbered list (1. ...)
        const numMatch = /^(\d+\.)\s+(.+)$/.exec(trimmed);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5">
              <span className="text-teal-700 dark:text-teal-300 font-bold shrink-0">{numMatch[1]}</span>
              <span className="flex-1">{renderInlineTokens(numMatch[2], `n-${lineIdx}`)}</span>
            </div>
          );
        }

        return <div key={lineIdx}>{renderInlineTokens(rawLine, `p-${lineIdx}`)}</div>;
      })}
    </div>
  );
}
