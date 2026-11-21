import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  TabStopType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { escapeHtml } from '@/lib/html-escape';

export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

export const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

const THAI_DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export type MemoUrgencyLevel = '' | 'ด่วน' | 'ด่วนมาก' | 'ด่วนที่สุด';

export interface AcMemoConfig {
  departmentLine: string;
  docNumberPrefix: string;
  docNumberSuffix: string;
  urgencyLevel: MemoUrgencyLevel;
  subjectLine1: string;
  recipient1: string;
  paragraph1: string;
  paragraph2Prefix: string;
  paragraph2Suffix: string;
  closingText: string;
  signer1Name: string;
  signer1Title: string;
  signer2Recipient: string;
  signer2Through: string;
  signer2Note: string;
  signer2Name: string;
  signer2Title: string;
  signer3Recipient: string;
  signer3Note: string;
  signer3Name: string;
  signer3Title: string;
  signer4Action: string;
  signer4Name: string;
  signer4Title: string;
  showSignatureBorders: boolean;
  useThaiDigits: boolean;
}

export const DEFAULT_AC_MEMO_CONFIG: AcMemoConfig = {
  departmentLine: 'คณะพยาบาลศาสตร์ สำนักงานเลขานุการ โทร. ๐๒-๙๔๒-๘๒๐๐-๔๕ ต่อ ๖๑๒๐๖๕',
  docNumberPrefix: 'อว ๖๕๐๑.๓๘/',
  docNumberSuffix: '',
  urgencyLevel: '',
  subjectLine1: 'รายงานการเปิดปิดเครื่องปรับอากาศห้องปฏิบัติการทางการพยาบาล',
  recipient1: 'ประธานคณะกรรมการศูนย์การเรียนรู้ปฏิบัติการทางการพยาบาลเสมือนจริง',
  paragraph1:
    'ด้วยศูนย์การเรียนรู้ปฏิบัติการทางการพยาบาลเสมือนจริง ได้ดำเนินการให้บริการการเรียนการสอน การฝึกปฏิบัติด้วยตนเองของนิสิตพยาบาลศาสตร์ และการเก็บรักษาดูแลครุภัณฑ์ประจำห้องปฏิบัติการทางการพยาบาล ซึ่งจำเป็นต้องเปิดเครื่องปรับอากาศเพื่อยืดอายุการใช้งานของหุ่นฝึกทางการพยาบาล',
  paragraph2Prefix:
    'ในการนี้ศูนย์การเรียนรู้ปฏิบัติการทางการพยาบาลเสมือนจริง จึงได้จัดทำตารางการเปิด-ปิดเครื่องปรับอากาศประจำห้องปฏิบัติการทางการพยาบาล ประจำเดือน ',
  paragraph2Suffix: ' ดังนั้นจึงขอรายงานการดำเนินการเอกสารแนบ',
  closingText: 'จึงเรียนมาเพื่อโปรดทราบ',
  signer1Name: '(นายณัฐกุล บำรุงราษฎร์)',
  signer1Title: 'นักวิทยาศาสตร์ ประจำห้องปฏิบัติการ ฯ',
  signer2Recipient: 'คณบดีคณะพยาบาลศาสตร์',
  signer2Through: 'ผ่านหัวหน้าสำนักงานเลขานุการ ฯ',
  signer2Note: 'เพื่อโปรดทราบตาม ๑.',
  signer2Name: '(ผู้ช่วยศาสตราจารย์ รรฤณ แสงแก้ว)',
  signer2Title: 'ประธานคณะกรรมการ ฯ',
  signer3Recipient: 'คณบดีคณะพยาบาลศาสตร์',
  signer3Note: 'เพื่อโปรดทราบตาม ๑.',
  signer3Name: '(นายปรเมศวร์ หยวกอิ่ม)',
  signer3Title: 'หัวหน้าสำนักงานเลขานุการคณะพยาบาลศาสตร์',
  signer4Action: 'ทราบ',
  signer4Name: '(รองศาสตราจารย์ พลตรีหญิง ดร.สายสมร เฉลยกิตติ)',
  signer4Title: 'คณบดีคณะพยาบาลศาสตร์',
  showSignatureBorders: false,
  useThaiDigits: true,
};

export interface AcMemoRenderParams {
  config: AcMemoConfig;
  periodText: string;
  docDateText: string;
}

const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
const ARABIC_DIGITS: Record<string, string> = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
};

export function toThaiDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => THAI_DIGITS[Number(d)]);
}

export function toArabicDigits(input: string | number): string {
  return String(input).replace(/[๐-๙]/g, (d) => ARABIC_DIGITS[d] ?? d);
}

export function formatDigits(input: string | number, useThaiDigits: boolean): string {
  return useThaiDigits ? toThaiDigits(input) : toArabicDigits(input);
}

export function formatThaiPeriodText(
  startMonth: number,
  startYearCE: number,
  endMonth: number,
  endYearCE: number,
  useThaiDigits = true
): string {
  const sIdx = Math.min(Math.max(0, startMonth - 1), 11);
  const eIdx = Math.min(Math.max(0, endMonth - 1), 11);
  const sYearBE = formatDigits(startYearCE + 543, useThaiDigits);
  const eYearBE = formatDigits(endYearCE + 543, useThaiDigits);
  if (startMonth === endMonth && startYearCE === endYearCE) {
    return `${THAI_MONTHS[sIdx]} ${sYearBE}`;
  }
  return `${THAI_MONTHS[sIdx]} ${sYearBE} ถึง ${THAI_MONTHS[eIdx]} ${eYearBE}`;
}

export function formatMemoDateText(opts: {
  blankDay: boolean;
  day?: number;
  month: number;
  yearCE: number;
  useThaiDigits: boolean;
}): string {
  const mIdx = Math.min(Math.max(0, opts.month - 1), 11);
  const monthName = THAI_MONTHS[mIdx];
  const yearBE = formatDigits(opts.yearCE + 543, opts.useThaiDigits);
  if (opts.blankDay) {
    return `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${monthName}\u00A0\u00A0${yearBE}`;
  }
  const dayStr = formatDigits(Math.min(Math.max(1, opts.day || 1), 31), opts.useThaiDigits);
  return `${dayStr} ${monthName} ${yearBE}`;
}

export function enumerateMonthRange(
  startMonth: number,
  startYearCE: number,
  endMonth: number,
  endYearCE: number,
  maxMonths = 12
): Array<{ month: number; year: number }> {
  const result: Array<{ month: number; year: number }> = [];
  let y = startYearCE;
  let m = startMonth;
  while (y < endYearCE || (y === endYearCE && m <= endMonth)) {
    result.push({ month: m, year: y });
    if (result.length >= maxMonths) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return result;
}

const TH_SARABUN_FONT = {
  ascii: 'TH SarabunPSK',
  hAnsi: 'TH SarabunPSK',
  cs: 'TH SarabunPSK',
};

function makeRun(
  text: string,
  options?: { bold?: boolean; size?: number; color?: string }
): TextRun {
  return new TextRun({
    text,
    bold: options?.bold ?? false,
    size: options?.size ?? 32, // 16pt default for Thai official memo
    color: options?.color,
    font: TH_SARABUN_FONT,
  });
}

function getBorderConfig(showBorder: boolean) {
  if (!showBorder) {
    return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  }
  return { style: BorderStyle.SINGLE, size: 4, color: '475569' };
}

export async function generateAcMemoDocxBlob(
  params: AcMemoRenderParams,
  sealBytes?: Uint8Array | null
): Promise<Blob> {
  const { config, periodText, docDateText } = params;
  const applyDigits = (val: string) => formatDigits(val, config.useThaiDigits);

  const deptText = applyDigits(config.departmentLine);
  const docNumText = applyDigits(`${config.docNumberPrefix}${config.docNumberSuffix || ''}`);
  const formattedDate = applyDigits(docDateText.replace(/\u00A0/g, ' '));
  const periodFormatted = applyDigits(periodText);
  const subject1 = applyDigits(config.subjectLine1);
  const recipient1 = applyDigits(config.recipient1);
  const p1 = applyDigits(config.paragraph1);
  const p2 = `${applyDigits(config.paragraph2Prefix.trimEnd())} ${periodFormatted} ${applyDigits(config.paragraph2Suffix.trimStart())}`;
  const closing = applyDigits(config.closingText);

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const sigCellBorder = getBorderConfig(config.showSignatureBorders);

  const leftHeaderChildren: Paragraph[] =
    sealBytes && sealBytes.byteLength > 0
      ? [
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new ImageRun({
                data: sealBytes,
                transformation: { width: 61, height: 61 },
                type: 'png',
              }),
            ],
          }),
        ]
      : [new Paragraph({ text: '' })];

  const rightHeaderChildren: Paragraph[] = config.urgencyLevel
    ? [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 0 },
          children: [
            makeRun(config.urgencyLevel, {
              bold: true,
              size: 36,
              color: 'DC2626',
            }),
          ],
        }),
      ]
    : [new Paragraph({ text: '' })];

  const headerTable = new Table({
    width: { size: 9345, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [1450, 6445, 1450],
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1450, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: leftHeaderChildren,
          }),
          new TableCell({
            width: { size: 6445, type: WidthType.DXA },
            verticalAlign: VerticalAlign.BOTTOM,
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40 },
                children: [
                  makeRun('บันทึกข้อความ', {
                    bold: true,
                    size: 58, // 29pt official standard
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1450, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: rightHeaderChildren,
          }),
        ],
      }),
    ],
  });

  const step2Label = applyDigits('๒. เรียน');
  const step3Label = applyDigits('๓. เรียน');
  const step4Label = applyDigits('๔.');

  const signatureTable = new Table({
    width: { size: 9345, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [4390, 4955],
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows: [
      // Row 0: Signer 1 floating right (always borderless)
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4390, type: WidthType.DXA },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [new Paragraph({ text: '', spacing: { before: 0, after: 0 } })],
          }),
          new TableCell({
            width: { size: 4955, type: WidthType.DXA },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 320, after: 0, line: 240 },
                children: [makeRun(applyDigits(config.signer1Name))],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 120, line: 240 },
                children: [makeRun(applyDigits(config.signer1Title))],
              }),
            ],
          }),
        ],
      }),
      // Row 1: Step 2 (left) and Step 3 (right)
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4390, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            borders: {
              top: sigCellBorder,
              bottom: sigCellBorder,
              left: sigCellBorder,
              right: sigCellBorder,
            },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0, line: 240 },
                children: [
                  makeRun(`${step2Label}  `, { bold: true }),
                  makeRun(applyDigits(config.signer2Recipient)),
                ],
              }),
              new Paragraph({
                indent: { left: 560 },
                spacing: { before: 0, after: 0, line: 240 },
                children: [makeRun(applyDigits(config.signer2Through))],
              }),
              new Paragraph({
                indent: { left: 560 },
                spacing: { before: 0, after: 280, line: 240 },
                children: [makeRun(applyDigits(config.signer2Note))],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 0, line: 240 },
                children: [makeRun(applyDigits(config.signer2Name))],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [makeRun(applyDigits(config.signer2Title))],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4955, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            borders: {
              top: sigCellBorder,
              bottom: sigCellBorder,
              left: sigCellBorder,
              right: sigCellBorder,
            },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0, line: 240 },
                children: [
                  makeRun(`${step3Label}  `, { bold: true }),
                  makeRun(applyDigits(config.signer3Recipient)),
                ],
              }),
              new Paragraph({
                indent: { left: 560 },
                spacing: { before: 0, after: 520, line: 240 },
                children: [makeRun(applyDigits(config.signer3Note))],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 0, line: 240 },
                children: [makeRun(applyDigits(config.signer3Name))],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [makeRun(applyDigits(config.signer3Title))],
              }),
            ],
          }),
        ],
      }),
      // Row 2: Step 4 spanning 2 columns
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            width: { size: 9345, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            borders: {
              top: sigCellBorder,
              bottom: sigCellBorder,
              left: sigCellBorder,
              right: sigCellBorder,
            },
            children: [
              new Paragraph({
                spacing: { before: 20, after: 320, line: 240 },
                children: [
                  makeRun(`${step4Label} ${applyDigits(config.signer4Action)}`, { bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 0, line: 240 },
                children: [makeRun(applyDigits(config.signer4Name))],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20, line: 240 },
                children: [makeRun(applyDigits(config.signer4Title))],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: 568,
              right: 1134,
              bottom: 340,
              left: 1418,
              header: 400,
              footer: 0,
            },
          },
        },
        children: [
          headerTable,
          new Paragraph({
            spacing: { before: 80, after: 20, line: 240 },
            children: [
              makeRun('ส่วนงาน  ', { bold: true }),
              makeRun(deptText),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 20, line: 240 },
            tabStops: [
              {
                type: TabStopType.LEFT,
                position: 4700,
              },
            ],
            children: [
              makeRun('ที่  ', { bold: true }),
              makeRun(docNumText),
              new TextRun({ text: '\t', font: TH_SARABUN_FONT, size: 32 }),
              makeRun('วันที่  ', { bold: true }),
              makeRun(formattedDate),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 0, line: 240 },
            children: [
              makeRun('เรื่อง  ', { bold: true }),
              makeRun(subject1),
            ],
          }),
          new Paragraph({
            indent: { left: 660 },
            spacing: { before: 0, after: 100, line: 240 },
            border: {
              bottom: {
                color: '000000',
                space: 4,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
            children: [makeRun(`ประจำเดือน ${periodFormatted}`)],
          }),
          new Paragraph({
            spacing: { before: 80, after: 80, line: 240 },
            children: [
              makeRun(applyDigits('๑. เรียน  '), { bold: true }),
              makeRun(recipient1),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.THAI_DISTRIBUTE,
            indent: { firstLine: 720 },
            spacing: { before: 0, after: 80, line: 250 },
            children: [makeRun(p1)],
          }),
          new Paragraph({
            alignment: AlignmentType.THAI_DISTRIBUTE,
            indent: { firstLine: 720 },
            spacing: { before: 0, after: 80, line: 250 },
            children: [makeRun(p2)],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            spacing: { before: 40, after: 140, line: 240 },
            children: [makeRun(closing)],
          }),
          signatureTable,
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadAcMemoDocx(params: AcMemoRenderParams): Promise<void> {
  let sealBytes: Uint8Array | null = null;
  try {
    const imgRes = await fetch('/images/ku-seal.png');
    if (imgRes.ok) {
      sealBytes = new Uint8Array(await imgRes.arrayBuffer());
    }
  } catch {
    sealBytes = null;
  }

  const blob = await generateAcMemoDocxBlob(params, sealBytes);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safePeriod = params.periodText.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  a.download = `บันทึกข้อความ_รายงานเปิดปิดแอร์_${safePeriod}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildAcMemoPrintHtml(
  params: AcMemoRenderParams,
  sealSrc = '/images/ku-seal.png'
): string {
  const { config, periodText, docDateText } = params;
  const d = (val: string) => escapeHtml(formatDigits(val, config.useThaiDigits));

  const docNum = d(`${config.docNumberPrefix}${config.docNumberSuffix || ''}`);
  const formattedDate = d(docDateText);
  const periodFormatted = d(periodText);
  const step1Label = d('๑. เรียน');
  const step2Label = d('๒. เรียน');
  const step3Label = d('๓. เรียน');
  const step4Label = d('๔.');
  const borderCss = config.showSignatureBorders ? '1px solid #475569' : 'none';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>บันทึกข้อความ - ${periodFormatted}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 20mm 10mm 25mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif;
      font-size: 13.5pt;
      line-height: 1.42;
    }
    .memo-sheet {
      width: 100%;
    }
    .memo-top {
      display: grid;
      grid-template-columns: 72px 1fr 72px;
      align-items: end;
      margin-bottom: 6px;
    }
    .memo-seal {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .memo-title {
      text-align: center;
      font-size: 24pt;
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: 0.3px;
    }
    .memo-urgency {
      text-align: right;
      font-size: 14pt;
      font-weight: 700;
      color: #dc2626;
      align-self: start;
    }
    .meta-row {
      margin-bottom: 2px;
    }
    .meta-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 2px;
    }
    .meta-label {
      font-weight: 700;
    }
    .subject-line2 {
      padding-left: 36px;
      padding-bottom: 5px;
      margin-bottom: 8px;
      border-bottom: 1px solid #000;
    }
    .memo-recipient {
      margin-bottom: 6px;
    }
    .memo-paragraph {
      text-align: justify;
      text-indent: 38px;
      margin: 0 0 6px 0;
    }
    .memo-closing {
      text-indent: 38px;
      margin: 4px 0 8px 0;
    }
    .sig-grid {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .sig-grid td {
      vertical-align: top;
      padding: 6px 8px;
    }
    .sig-step1-cell {
      border: none;
      padding-top: 26px !important;
      padding-bottom: 12px !important;
    }
    .sig-box-cell {
      border: ${borderCss};
    }
    .sig-name-block {
      text-align: center;
      margin-top: 34px;
      line-height: 1.32;
    }
    .sig-indent {
      padding-left: 26px;
    }
  </style>
</head>
<body>
  <div class="memo-sheet">
    <div class="memo-top">
      <div><img class="memo-seal" src="${escapeHtml(sealSrc)}" alt="ตรา มก." /></div>
      <div class="memo-title">บันทึกข้อความ</div>
      <div class="memo-urgency">${config.urgencyLevel ? d(config.urgencyLevel) : ''}</div>
    </div>

    <div class="meta-row">
      <span class="meta-label">ส่วนงาน</span>&nbsp;&nbsp;${d(config.departmentLine)}
    </div>
    <div class="meta-split">
      <div><span class="meta-label">ที่</span>&nbsp;&nbsp;${docNum}</div>
      <div><span class="meta-label">วันที่</span>&nbsp;&nbsp;<span style="white-space: pre;">${formattedDate}</span></div>
    </div>
    <div class="meta-row">
      <span class="meta-label">เรื่อง</span>&nbsp;&nbsp;${d(config.subjectLine1)}
    </div>
    <div class="subject-line2">ประจำเดือน ${periodFormatted}</div>

    <div class="memo-recipient">
      <span class="meta-label">${step1Label}</span>&nbsp;&nbsp;${d(config.recipient1)}
    </div>
    <p class="memo-paragraph">${d(config.paragraph1)}</p>
    <p class="memo-paragraph">${d(config.paragraph2Prefix.trimEnd())} ${periodFormatted} ${d(config.paragraph2Suffix.trimStart())}</p>
    <p class="memo-closing">${d(config.closingText)}</p>

    <table class="sig-grid">
      <colgroup>
        <col style="width: 47%;" />
        <col style="width: 53%;" />
      </colgroup>
      <tbody>
        <tr>
          <td style="border: none;"></td>
          <td class="sig-step1-cell">
            <div style="text-align: center; line-height: 1.32;">
              <div>${d(config.signer1Name)}</div>
              <div>${d(config.signer1Title)}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td class="sig-box-cell">
            <div><span class="meta-label">${step2Label}</span>&nbsp;&nbsp;${d(config.signer2Recipient)}</div>
            <div class="sig-indent">${d(config.signer2Through)}</div>
            <div class="sig-indent">${d(config.signer2Note)}</div>
            <div class="sig-name-block">
              <div>${d(config.signer2Name)}</div>
              <div>${d(config.signer2Title)}</div>
            </div>
          </td>
          <td class="sig-box-cell">
            <div><span class="meta-label">${step3Label}</span>&nbsp;&nbsp;${d(config.signer3Recipient)}</div>
            <div class="sig-indent">${d(config.signer3Note)}</div>
            <div class="sig-name-block" style="margin-top: 52px;">
              <div>${d(config.signer3Name)}</div>
              <div>${d(config.signer3Title)}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="sig-box-cell">
            <div><span class="meta-label">${step4Label} ${d(config.signer4Action)}</span></div>
            <div class="sig-name-block" style="margin-top: 30px;">
              <div>${d(config.signer4Name)}</div>
              <div>${d(config.signer4Title)}</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <script>
    window.onload = () => { window.print(); };
  </script>
</body>
</html>`;
}

export interface MonthlyAcApiPayload {
  month: number;
  year: number;
  yearBE: number;
  daysInMonth: number;
  rooms: Array<{ id: string; code: string; name: string; location?: string | null }>;
  logsMap: Record<string, Record<string, any>>;
  holidaysMap: Record<string, string>;
}

const formatPurposeWithNote = (purpose?: string | null, note?: string | null) => {
  const p = (purpose || '').trim() || 'เปิดเพื่อรักษาอุปกรณ์';
  const n = (note || '').trim();
  if (!n || n.includes('Preset 10:00')) return p;
  if (p === 'อื่นๆ') return `อื่นๆ (${n})`;
  return `${p} (${n})`;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function buildMultiMonthAcAttachmentPrintHtml(
  monthPayloads: MonthlyAcApiPayload[],
  selectedRoomIds: string[],
  periodTitle: string
): string {
  const pagesHtml = monthPayloads
    .map((payload) => {
      const monthName = THAI_MONTHS[payload.month - 1] || '';
      const yearShortBE = String(payload.yearBE).slice(-2);
      const activeRooms =
        selectedRoomIds.length > 0
          ? payload.rooms.filter((r) => selectedRoomIds.includes(r.id))
          : payload.rooms.slice(0, 3);
      const roomsToRender = activeRooms.length > 0 ? activeRooms : payload.rooms;

      const daysArray = Array.from({ length: payload.daysInMonth }, (_, i) => {
        const day = i + 1;
        const dObj = new Date(payload.year, payload.month - 1, day);
        const dayOfWeek = THAI_DAY_NAMES[dObj.getDay()];
        const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
        const dateStr = `${payload.year}-${String(payload.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const holidayName = payload.holidaysMap?.[dateStr] || '';
        return {
          day,
          dayOfWeek,
          isRowHoliday: isWeekend || Boolean(holidayName),
          dateStr,
          shortMonth: THAI_SHORT_MONTHS[payload.month - 1] || '',
        };
      });

      const roomSummaries: Record<string, { totalHours: number; activeDays: number; avgTemp: number }> = {};
      roomsToRender.forEach((r) => {
        let totalHours = 0;
        let activeDays = 0;
        let tempSum = 0;
        daysArray.forEach((d) => {
          const log = payload.logsMap?.[d.dateStr]?.[r.id];
          if (log && Number(log.usageHours) > 0) {
            totalHours += Number(log.usageHours);
            activeDays += 1;
            tempSum += Number(log.temperature) || 22.0;
          }
        });
        roomSummaries[r.id] = {
          totalHours: Math.round(totalHours * 10) / 10,
          activeDays,
          avgTemp: activeDays > 0 ? Math.round((tempSum / activeDays) * 10) / 10 : 22.0,
        };
      });
      const grandTotalHours = Math.round(
        Object.values(roomSummaries).reduce((acc, s) => acc + s.totalHours, 0) * 10
      ) / 10;

      const chunks = chunkArray(roomsToRender, 3);
      const totalPages = 1 + chunks.length;

      const summaryHtml = `
        <div class="page-container">
          <div class="header-box">
            <div class="header-title">ตารางสรุปชั่วโมงการเปิด-ปิดเครื่องปรับอากาศ</div>
            <div class="header-subtitle">
              คณะพยาบาลศาสตร์ • ประจำเดือน${escapeHtml(monthName)} ปี พ.ศ. ${payload.yearBE} (ค.ศ. ${payload.year}) — (หน้าที่ 1 จาก ${totalPages} หน้า: สรุปภาพรวม)
            </div>
          </div>
          <table>
            <colgroup>
              <col style="width: 65px;" />
              <col style="width: 32px;" />
              ${roomsToRender.map(() => `<col style="width: auto;" />`).join('')}
              <col style="width: 58px;" />
            </colgroup>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>วัน</th>
                ${roomsToRender.map((r) => `<th>${escapeHtml(r.code || r.name)}</th>`).join('')}
                <th style="background-color: #cbd5e1;">รวม (ชม.)</th>
              </tr>
            </thead>
            <tbody>
              ${daysArray
                .map((d) => {
                  let dayTotal = 0;
                  const bgStyle = d.isRowHoliday
                    ? 'background-color: #cbd5e1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;'
                    : '';
                  const cols = roomsToRender
                    .map((r) => {
                      const log = payload.logsMap?.[d.dateStr]?.[r.id];
                      if (log && Number(log.usageHours) > 0) {
                        const hrs = Number(log.usageHours);
                        dayTotal += hrs;
                        return `<td class="font-bold" style="${bgStyle}">${hrs}</td>`;
                      }
                      return `<td style="color: #94a3b8; ${bgStyle}">-</td>`;
                    })
                    .join('');
                  return `
                    <tr class="${d.isRowHoliday ? 'weekend-row' : ''}" style="${bgStyle}">
                      <td style="white-space: nowrap; ${bgStyle}">${d.day} ${escapeHtml(d.shortMonth)} ${yearShortBE}</td>
                      <td style="${d.isRowHoliday ? 'color: #b91c1c; font-weight: bold;' : ''} ${bgStyle}">${d.dayOfWeek}</td>
                      ${cols}
                      <td class="font-bold" style="${d.isRowHoliday ? 'background-color: #94a3b8 !important;' : 'background-color: #f1f5f9;'}">${dayTotal > 0 ? Math.round(dayTotal * 10) / 10 : '-'}</td>
                    </tr>
                  `;
                })
                .join('')}
              <tr class="bg-summary" style="border-top: 2px solid #0f172a;">
                <td colspan="2" class="text-left font-bold" style="padding-left: 4px; font-size: 6.2pt;">รวมชั่วโมงทั้งเดือน</td>
                ${roomsToRender.map((r) => `<td>${roomSummaries[r.id]?.totalHours || 0}</td>`).join('')}
                <td style="background-color: #e2e8f0; font-size: 8.5pt;">${grandTotalHours}</td>
              </tr>
              <tr class="bg-summary">
                <td colspan="2" class="text-left font-bold" style="padding-left: 4px; font-size: 6.2pt;">จำนวนวันที่เปิดใช้งาน</td>
                ${roomsToRender.map((r) => `<td>${roomSummaries[r.id]?.activeDays || 0} วัน</td>`).join('')}
                <td style="background-color: #e2e8f0;">-</td>
              </tr>
            </tbody>
          </table>
          <div class="signature-wrap">
            <div class="signature-block">
              <div>(ลงชื่อ) ................................................................ ผู้รายงาน</div>
              <div style="margin-top: 3px;">( ................................................................ )</div>
              <div style="margin-top: 1px;">ตำแหน่ง เจ้าหน้าที่ประจำห้องปฏิบัติการ</div>
            </div>
          </div>
        </div>
      `;

      const chunksHtml = chunks
        .map((chunkRooms, idx) => {
          const pageNum = idx + 2;
          return `
            <div class="page-container">
              <div class="header-box">
                <div class="header-title">ตารางบันทึกการเปิด-ปิดเครื่องปรับอากาศ</div>
                <div class="header-subtitle">
                  คณะพยาบาลศาสตร์ • ประจำเดือน${escapeHtml(monthName)} ปี พ.ศ. ${payload.yearBE} (ค.ศ. ${payload.year}) — (หน้าที่ ${pageNum} จาก ${totalPages} หน้า)
                </div>
              </div>
              <table>
                <colgroup>
                  <col style="width: 54px;" />
                  <col style="width: 22px;" />
                  ${chunkRooms
                    .map(
                      () => `
                      <col style="width: 32px;" />
                      <col style="width: 32px;" />
                      <col style="width: 24px;" />
                      <col style="width: 36px;" />
                      <col style="width: auto;" />`
                    )
                    .join('')}
                </colgroup>
                <thead>
                  <tr>
                    <th rowspan="2">วันที่</th>
                    <th rowspan="2">วัน</th>
                    ${chunkRooms
                      .map(
                        (r) => `
                        <th colspan="5" style="font-size: 7.2pt; line-height: 1.15; padding: 2px 2px; white-space: normal; height: 26px;">
                          <b>${escapeHtml(r.name)}</b> ${r.code ? `<span style="font-size: 6.5pt; color: #475569;">(${escapeHtml(r.code)})</span>` : ''}
                        </th>`
                      )
                      .join('')}
                  </tr>
                  <tr>
                    ${chunkRooms
                      .map(
                        () => `
                        <th style="font-size: 6.8pt;">เปิด</th>
                        <th style="font-size: 6.8pt;">ปิด</th>
                        <th style="font-size: 6.8pt;">ชม.</th>
                        <th style="font-size: 6.2pt;">อุณหภูมิ</th>
                        <th style="font-size: 6.8pt;">หมายเหตุ</th>`
                      )
                      .join('')}
                  </tr>
                </thead>
                <tbody>
                  ${daysArray
                    .map((d) => {
                      const bgStyle = d.isRowHoliday
                        ? 'background-color: #cbd5e1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;'
                        : '';
                      const cells = chunkRooms
                        .map((r) => {
                          const log = payload.logsMap?.[d.dateStr]?.[r.id];
                          if (log && Number(log.usageHours) > 0) {
                            const safePurposeNote = escapeHtml(formatPurposeWithNote(log.purpose, log.note));
                            return `
                              <td style="${bgStyle}">${escapeHtml(log.openTime || '-')}</td>
                              <td style="${bgStyle}">${escapeHtml(log.closeTime || '-')}</td>
                              <td class="font-bold" style="${bgStyle}">${Number(log.usageHours)}</td>
                              <td style="${bgStyle}">${log.temperature ? `${escapeHtml(log.temperature)}°C` : '22°C'}</td>
                              <td class="text-left" style="font-size: 6.2pt; padding: 0.5px 3px; ${bgStyle}">${safePurposeNote}</td>
                            `;
                          }
                          return `<td style="${bgStyle}">-</td><td style="${bgStyle}">-</td><td style="${bgStyle}">-</td><td style="${bgStyle}">-</td><td style="${bgStyle}">-</td>`;
                        })
                        .join('');
                      return `
                        <tr class="${d.isRowHoliday ? 'weekend-row' : ''}" style="${bgStyle}">
                          <td style="white-space: nowrap; font-size: 6.8pt; ${bgStyle}">${d.day} ${escapeHtml(d.shortMonth)} ${yearShortBE}</td>
                          <td style="${d.isRowHoliday ? 'color: #b91c1c; font-weight: bold;' : ''} ${bgStyle}">${d.dayOfWeek}</td>
                          ${cells}
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
              <div class="signature-wrap">
                <div class="signature-block">
                  <div>(ลงชื่อ) ................................................................ ผู้รายงาน</div>
                  <div style="margin-top: 3px;">( ................................................................ )</div>
                  <div style="margin-top: 1px;">ตำแหน่ง เจ้าหน้าที่ประจำห้องปฏิบัติการ</div>
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      return summaryHtml + chunksHtml;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>เอกสารแนบตารางเปิด-ปิดแอร์ - ${escapeHtml(periodTitle)}</title>
  <style>
    @page { size: A4 landscape; margin: 3mm 5mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body {
      margin: 0; padding: 0; background: #fff;
      font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 7pt; color: #0f172a;
    }
    .page-container { width: 100%; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; }
    .page-container:last-child { page-break-after: auto; break-after: auto; }
    .header-box { text-align: center; margin-bottom: 2px; }
    .header-title { font-size: 11pt; font-weight: bold; color: #0f172a; line-height: 1.15; }
    .header-subtitle { font-size: 7.2pt; color: #475569; margin-top: 1px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    tr { height: 14.5px; }
    th, td {
      border: 1px solid #475569; padding: 0.5px 2px; text-align: center;
      vertical-align: middle; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    th { background-color: #f1f5f9; font-weight: bold; font-size: 7pt; padding: 1px; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .bg-summary { background-color: #f8fafc; font-weight: bold; }
    .weekend-row, tr.weekend-row, tr.weekend-row td { background-color: #cbd5e1 !important; }
    .signature-wrap { display: flex; justify-content: flex-end; margin-top: 3px; font-size: 7.2pt; }
    .signature-block { text-align: center; width: 235px; line-height: 1.2; }
  </style>
</head>
<body>
  ${pagesHtml}
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
}
