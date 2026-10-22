import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Atomic Update for REQ-20260915-002 ---');

  const req = await prisma.requisitionRequest.findUnique({
    where: { requestNumber: 'REQ-20260915-002' },
    include: { items: true }
  });

  if (!req) {
    throw new Error('Requisition REQ-20260915-002 not found');
  }

  // 1. Fetch Items
  const nssItem = await prisma.item.findUnique({
    where: { code: 'CS-NSS-1000' }
  });
  const d5sItem = await prisma.item.findUnique({
    where: { code: 'CS-D5S-1000' }
  });

  if (!nssItem || !d5sItem) {
    throw new Error('Items CS-NSS-1000 or CS-D5S-1000 not found');
  }

  // 2. Fetch Stock Lots
  const nssLot = await prisma.stockLot.findFirst({
    where: {
      itemId: nssItem.id,
      lotNumber: 'อว 6501.38/1106'
    }
  });

  const d5sLot = await prisma.stockLot.findFirst({
    where: {
      itemId: d5sItem.id,
      lotNumber: 'อว 6501.38/1106'
    }
  });

  if (!nssLot || !d5sLot) {
    throw new Error('Stock Lots not found for Lot อว 6501.38/1106');
  }

  console.log(`Current NSS Lot Remaining: ${nssLot.quantityRemaining}`);
  console.log(`Current D5S Lot Remaining: ${d5sLot.quantityRemaining}`);

  const nssQty = 5;
  const nssCost = 40;
  const nssTotal = nssQty * nssCost; // 200

  const d5sQty = 3;
  const d5sCost = 45;
  const d5sTotal = d5sQty * d5sCost; // 135

  const additionalCost = nssTotal + d5sTotal; // 335
  const newTotalCost = req.totalCost + additionalCost; // 2225 + 335 = 2560

  const historicalDate = new Date('2026-09-15T13:05:30.000Z');

  // Execute in Prisma Transaction
  await prisma.$transaction(async (tx) => {
    // A. Create RequisitionItems
    await tx.requisitionItem.create({
      data: {
        requisitionRequestId: req.id,
        itemId: nssItem.id,
        quantityRequested: nssQty,
        quantityDispensed: nssQty,
        requestedUnit: 'ขวด',
        isSubUnit: false,
        unitCost: nssCost,
        totalCost: nssTotal
      }
    });

    await tx.requisitionItem.create({
      data: {
        requisitionRequestId: req.id,
        itemId: d5sItem.id,
        quantityRequested: d5sQty,
        quantityDispensed: d5sQty,
        requestedUnit: 'ขวด',
        isSubUnit: false,
        unitCost: d5sCost,
        totalCost: d5sTotal
      }
    });

    // B. Deduct Stock Lots
    await tx.stockLot.update({
      where: { id: nssLot.id },
      data: {
        quantityRemaining: { decrement: nssQty },
        piecesRemaining: { decrement: nssQty }
      }
    });

    await tx.stockLot.update({
      where: { id: d5sLot.id },
      data: {
        quantityRemaining: { decrement: d5sQty },
        piecesRemaining: { decrement: d5sQty }
      }
    });

    // C. Create Stock Transactions
    await tx.stockTransaction.create({
      data: {
        itemId: nssItem.id,
        lotId: nssLot.id,
        type: 'OUT_REQUISITION',
        quantity: -nssQty,
        unitCost: nssCost,
        totalCost: nssTotal,
        courseId: req.courseId,
        referenceNumber: req.requestNumber,
        createdById: req.userId,
        note: `จ่ายตามคำขอ ${req.requestNumber} (วิชา 01980221)`,
        createdAt: historicalDate
      }
    });

    await tx.stockTransaction.create({
      data: {
        itemId: d5sItem.id,
        lotId: d5sLot.id,
        type: 'OUT_REQUISITION',
        quantity: -d5sQty,
        unitCost: d5sCost,
        totalCost: d5sTotal,
        courseId: req.courseId,
        referenceNumber: req.requestNumber,
        createdById: req.userId,
        note: `จ่ายตามคำขอ ${req.requestNumber} (วิชา 01980221)`,
        createdAt: historicalDate
      }
    });

    // D. Update RequisitionRequest Total Cost
    await tx.requisitionRequest.update({
      where: { id: req.id },
      data: {
        totalCost: newTotalCost
      }
    });

    // E. Create ActivityLog
    await tx.activityLog.create({
      data: {
        userId: req.userId,
        userName: 'ณัฐกุล บำรุงราษฎร์',
        userRole: 'ADMIN',
        action: 'STOCK_ADJUST',
        entityType: 'REQUISITION',
        entityId: req.id,
        entityTitle: req.requestNumber,
        details: `เพิ่มรายการสารน้ำในใบเบิก ${req.requestNumber}: NSS ขวดใหญ่ 5 ขวด (200 บ.) และ D-5-S ขวดใหญ่ 3 ขวด (135 บ.) จาก Lot อว 6501.38/1106`,
        metadata: {
          requestNumber: req.requestNumber,
          addedItems: [
            { code: 'CS-NSS-1000', name: 'NSS สำหรับให้ IV ขวดใหญ่', qty: nssQty, cost: nssTotal, lot: 'อว 6501.38/1106' },
            { code: 'CS-D5S-1000', name: 'D-5-S ขวดใหญ่', qty: d5sQty, cost: d5sTotal, lot: 'อว 6501.38/1106' }
          ],
          previousTotalCost: req.totalCost,
          newTotalCost: newTotalCost
        }
      }
    });
  });

  console.log('--- Successfully Updated REQ-20260915-002 ---');
  console.log(`New Requisition Total Cost: ${newTotalCost} THB`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error during update:', e);
    process.exit(1);
  });
