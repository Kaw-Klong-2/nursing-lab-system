const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Read environment variables
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
} catch (e) {
  console.log('Error reading .env:', e.message);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const formatThaiDate = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
};

const formatISODate = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toISOString().split('T')[0];
  } catch {
    return '-';
  }
};

const setWorksheetColumnWidths = (ws, data) => {
  if (!data || data.length === 0) return;
  const colKeys = Object.keys(data[0]);
  const colWidths = colKeys.map((key) => {
    let maxLen = key.length * 2.2;
    data.forEach((row) => {
      const valStr = String(row[key] ?? '');
      // If it contains Thai characters, approximate wider width
      const isThai = /[\u0E00-\u0E7F]/.test(valStr);
      const len = isThai ? valStr.length * 1.8 : valStr.length * 1.1;
      if (len > maxLen) maxLen = len;
    });
    return { wch: Math.min(Math.max(Math.ceil(maxLen) + 2, 12), 48) };
  });
  ws['!cols'] = colWidths;
};

async function generateExcel() {
  console.log('Fetching consumable items and stock lots (lot != 9999)...');

  // Fetch all consumable stock lots not lot 9999
  const lots = await prisma.stockLot.findMany({
    where: {
      lotNumber: { not: '9999' },
      item: { type: 'CONSUMABLE' },
    },
    include: {
      item: {
        include: {
          category: true,
          storageLocation: true,
        },
      },
    },
    orderBy: [
      { item: { name: 'asc' } },
      { receivedDate: 'asc' },
    ],
  });

  console.log(`Found ${lots.length} consumable lots not lot 9999.`);

  // 1. Detailed Lot Rows (Sheet 1)
  const lotRows = lots.map((lot, idx) => {
    const item = lot.item;
    const packSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : (Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1);
    const unitCost = Number(lot.unitCost) || 0;
    const qtyInit = Number(lot.quantityInitial) || 0;
    const qtyRem = Number(lot.quantityRemaining) || 0;
    const totalPiecesInit = lot.totalPieces != null ? Number(lot.totalPieces) : qtyInit * packSize;
    const totalPiecesRem = lot.piecesRemaining != null ? Number(lot.piecesRemaining) : qtyRem * packSize;
    const totalCostInit = qtyInit * unitCost;
    const totalCostRem = qtyRem * unitCost;

    const loc = item.storageLocation?.name
      ? `${item.storageLocation.name} (${item.storageLocation.roomName || item.storageLocation.code || ''})`
      : item.location || '-';

    return {
      'ลำดับ': idx + 1,
      'รหัสพัสดุ': item.code,
      'ชื่อรายการวัสดุสิ้นเปลือง': item.name,
      'หมวดหมู่': item.category?.name || '-',
      'หมายเลขล็อต': lot.lotNumber,
      'วันที่รับเข้า (พ.ศ.)': formatThaiDate(lot.receivedDate),
      'วันที่รับเข้า (ค.ศ.)': formatISODate(lot.receivedDate),
      'ราคาต่อหน่วยใหญ่ (บาท)': unitCost,
      'จำนวนรับเข้า (หน่วยใหญ่)': qtyInit,
      'จำนวนคงเหลือ (หน่วยใหญ่)': qtyRem,
      'หน่วยใหญ่ (หน่วยบรรจุ)': lot.packageUnit || item.unit || '-',
      'หน่วยย่อย (หน่วยเบิกใช้)': item.usageUnit || item.unit || '-',
      'อัตราแปลง (หน่วยย่อย/หน่วยใหญ่)': packSize,
      'จำนวนรับเข้ารวม (หน่วยย่อย)': totalPiecesInit,
      'จำนวนคงเหลือรวม (หน่วยย่อย)': totalPiecesRem,
      'มูลค่ารับเข้ารวม (บาท)': totalCostInit,
      'มูลค่าคงเหลือรวม (บาท)': totalCostRem,
      'วันหมดอายุ': formatThaiDate(lot.expiryDate),
      'ยี่ห้อ (Brand)': lot.brand || item.brand || '-',
      'ผู้จัดจำหน่าย (Supplier)': lot.supplier || '-',
      'สถานที่จัดเก็บ': loc,
    };
  });

  // 2. Summary by Item Rows (Sheet 2)
  const itemMap = new Map();
  lots.forEach((lot) => {
    const item = lot.item;
    if (!itemMap.has(item.id)) {
      itemMap.set(item.id, {
        item,
        lots: [],
      });
    }
    itemMap.get(item.id).lots.push(lot);
  });

  let itemSeq = 1;
  const itemSummaryRows = [];

  for (const entry of itemMap.values()) {
    const item = entry.item;
    const itemLots = entry.lots;

    // Sort lots by received date descending to find latest
    itemLots.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
    const latestLot = itemLots[0];

    const uniqueLotNumbers = [...new Set(itemLots.map((l) => l.lotNumber))].join(', ');

    let sumQtyInit = 0;
    let sumQtyRem = 0;
    let sumPiecesInit = 0;
    let sumPiecesRem = 0;
    let sumCostInit = 0;
    let sumCostRem = 0;

    itemLots.forEach((l) => {
      const packSize = Number(l.packSize) > 0 ? Number(l.packSize) : (Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1);
      const unitCost = Number(l.unitCost) || 0;
      const qInit = Number(l.quantityInitial) || 0;
      const qRem = Number(l.quantityRemaining) || 0;
      const pInit = l.totalPieces != null ? Number(l.totalPieces) : qInit * packSize;
      const pRem = l.piecesRemaining != null ? Number(l.piecesRemaining) : qRem * packSize;

      sumQtyInit += qInit;
      sumQtyRem += qRem;
      sumPiecesInit += pInit;
      sumPiecesRem += pRem;
      sumCostInit += qInit * unitCost;
      sumCostRem += qRem * unitCost;
    });

    const loc = item.storageLocation?.name
      ? `${item.storageLocation.name} (${item.storageLocation.roomName || item.storageLocation.code || ''})`
      : item.location || '-';

    itemSummaryRows.push({
      'ลำดับ': itemSeq++,
      'รหัสพัสดุ': item.code,
      'ชื่อรายการวัสดุสิ้นเปลือง': item.name,
      'หมวดหมู่': item.category?.name || '-',
      'จำนวนล็อตที่ไม่ใช่ 9999': itemLots.length,
      'หมายเลขล็อตทั้งหมด': uniqueLotNumbers,
      'วันที่รับเข้าล่าสุด (พ.ศ.)': formatThaiDate(latestLot.receivedDate),
      'ราคารับเข้าล่าสุด (บาท/หน่วยใหญ่)': Number(latestLot.unitCost) || 0,
      'ยอดรับเข้ารวม (หน่วยใหญ่)': sumQtyInit,
      'ยอดคงเหลือรวม (หน่วยใหญ่)': sumQtyRem,
      'หน่วยใหญ่ (หน่วยบรรจุ)': item.unit,
      'ยอดรับเข้ารวม (หน่วยย่อย)': sumPiecesInit,
      'ยอดคงเหลือรวม (หน่วยย่อย)': sumPiecesRem,
      'หน่วยย่อย (หน่วยเบิกใช้)': item.usageUnit || item.unit,
      'มูลค่ารับเข้ารวม (บาท)': sumCostInit,
      'มูลค่าคงเหลือรวม (บาท)': sumCostRem,
      'สถานที่จัดเก็บ': loc,
    });
  }

  // Create Workbook
  const wb = XLSX.utils.book_new();

  // Create Sheet 1: รายการแยกล็อต
  const wsLots = XLSX.utils.json_to_sheet(lotRows);
  setWorksheetColumnWidths(wsLots, lotRows);
  XLSX.utils.book_append_sheet(wb, wsLots, 'รายการวัสดุแยกล็อต');

  // Create Sheet 2: สรุปรายชนิดวัสดุ
  const wsSummary = XLSX.utils.json_to_sheet(itemSummaryRows);
  setWorksheetColumnWidths(wsSummary, itemSummaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปรวมรายชนิดวัสดุ');

  // Ensure export directory exists
  const exportDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportPathEn = path.join(exportDir, 'consumables_stock_lots_not_9999.xlsx');
  const exportPathTh = path.join(exportDir, 'ข้อมูลวัสดุสิ้นเปลือง_ไม่รวม_lot9999.xlsx');

  XLSX.writeFile(wb, exportPathEn);
  XLSX.writeFile(wb, exportPathTh);

  console.log(`Successfully generated Excel files:`);
  console.log(`- ${exportPathEn}`);
  console.log(`- ${exportPathTh}`);

  await prisma.$disconnect();
}

generateExcel().catch((err) => {
  console.error('Error generating Excel:', err);
  process.exit(1);
});
