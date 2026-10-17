import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { logActivity } from '@/lib/activity-log';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { records, assetAudits, adjustments, countedBy, userId, note } = body;

    const hasRecords = Array.isArray(records) && records.length > 0;
    const hasAssetAudits = Array.isArray(assetAudits) && assetAudits.length > 0;
    const hasAdjustments = Array.isArray(adjustments) && adjustments.length > 0;

    if (!hasRecords && !hasAssetAudits && !hasAdjustments) {
      return NextResponse.json({ error: 'กรุณาระบุรายการวัสดุหรือครุภัณฑ์ที่ต้องการตรวจนับ' }, { status: 400 });
    }

    // Default system user for reconciliation audit
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'OFFICER'] } },
      select: { id: true, name: true },
    });

    const creatorId = userId || adminUser?.id || null;
    const updatedItems: any[] = [];
    const updatedAssets: any[] = [];
    const adjustedLots: any[] = [];

    // Process reconciliation in transaction
    await prisma.$transaction(async (tx) => {
      // 0. Process Per-Lot Cycle Count Adjustments (from /inventory Cycle Count Modal)
      if (hasAdjustments) {
        for (const adj of adjustments) {
          const { lotId, physicalCount, reason } = adj;
          if (!lotId || typeof physicalCount !== 'number') continue;

          const lot = await tx.stockLot.findUnique({
            where: { id: lotId },
            include: { item: true, boxes: { orderBy: { boxNumberInLot: 'asc' } } },
          });
          if (!lot) continue;

          const newQty = Math.max(0, Math.floor(physicalCount));
          const variance = newQty - lot.quantityRemaining;
          if (variance === 0) continue;

          const itemRatio = Number(lot.item?.conversionRatio) > 0 ? Number(lot.item?.conversionRatio) : 1;
          const pSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : itemRatio;
          const newPieces = Math.max(0, newQty * pSize + (lot.openPackRemainder || 0));

          await tx.stockLot.update({
            where: { id: lot.id },
            data: {
              quantityRemaining: newQty,
              piecesRemaining: newPieces,
            },
          });

          // Synchronize StockLotBox if boxes exist and variance < 0
          if (variance < 0 && lot.boxes && lot.boxes.length > 0) {
            const boxesToDeplete = lot.boxes
              .filter((b) => b.status === 'IN_STOCK')
              .slice(0, Math.abs(variance));
            if (boxesToDeplete.length > 0) {
              await tx.stockLotBox.updateMany({
                where: { id: { in: boxesToDeplete.map((b) => b.id) } },
                data: { status: 'DISPENSED', depletedAt: new Date() },
              });
            }
          }

          await tx.stockTransaction.create({
            data: {
              itemId: lot.itemId,
              lotId: lot.id,
              type: 'ADJUSTMENT',
              quantity: variance,
              unitCost: lot.unitCost || 0,
              totalCost: Math.abs(variance) * (lot.unitCost || 0),
              createdById: creatorId,
              note: `[ตรวจนับสต็อก Lot ${lot.lotNumber}] นับได้ ${newQty} (เดิม ${lot.quantityRemaining}, ผลต่าง ${variance > 0 ? '+' : ''}${variance}) | สาเหตุ: ${reason || 'ตรวจนับสต็อกประจำงวด'}`,
            },
          });

          adjustedLots.push({
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            itemName: lot.item?.name,
            previousCount: lot.quantityRemaining,
            physicalCount: newQty,
            variance,
          });
        }
      }

      // 1. Process Equipment Asset Audits
      if (hasAssetAudits) {
        for (const a of assetAudits) {
          if (!a.assetId) continue;
          const updated = await tx.equipmentAsset.update({
            where: { id: a.assetId },
            data: {
              ...(a.condition ? { condition: a.condition } : {}),
              ...(a.status ? { status: a.status } : {}),
            },
            select: { id: true, assetCode: true, condition: true, status: true },
          });
          updatedAssets.push(updated);
        }
      }

      // 2. Process Consumable Lot Reconciliations
      if (hasRecords) {
      for (const rec of records) {
        const { itemId, physicalCount, systemCount, variance, reason } = rec;
        if (typeof variance !== 'number' || variance === 0) continue;

        const item = await tx.item.findUnique({
          where: { id: itemId },
          include: {
            stockLots: {
              where: { quantityRemaining: { gt: 0 } },
              orderBy: { expiryDate: 'asc' },
            },
            assets: true,
          },
        });

        if (!item) continue;

        if (item.type === 'CONSUMABLE') {
          const itemRatio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
          if (variance < 0) {
            // Shortage: reduce from earliest lots
            let neededDeduction = Math.abs(variance);
            for (const lot of item.stockLots) {
              if (neededDeduction <= 0) break;
              const deduct = Math.min(lot.quantityRemaining, neededDeduction);
              const newQty = lot.quantityRemaining - deduct;
              const pSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : itemRatio;
              const newPieces = Math.max(0, newQty * pSize + (lot.openPackRemainder || 0));
              await tx.stockLot.update({
                where: { id: lot.id },
                data: {
                  quantityRemaining: newQty,
                  piecesRemaining: newPieces,
                },
              });
              neededDeduction -= deduct;
            }
          } else {
            // Surplus: add to latest active lot or create an adjustment lot
            if (item.stockLots.length > 0) {
              const latestLot = item.stockLots[item.stockLots.length - 1];
              const newQty = latestLot.quantityRemaining + variance;
              const pSize = Number(latestLot.packSize) > 0 ? Number(latestLot.packSize) : itemRatio;
              const newPieces = Math.max(0, newQty * pSize + (latestLot.openPackRemainder || 0));
              await tx.stockLot.update({
                where: { id: latestLot.id },
                data: {
                  quantityRemaining: newQty,
                  piecesRemaining: newPieces,
                },
              });
            } else {
              await tx.stockLot.create({
                data: {
                  itemId: item.id,
                  lotNumber: `ADJ-${Date.now().toString().slice(-6)}`,
                  packSize: itemRatio,
                  totalPieces: variance * itemRatio,
                  piecesRemaining: variance * itemRatio,
                  quantityInitial: variance,
                  quantityRemaining: variance,
                  unitCost: 0,
                  supplier: 'Cycle Count Adjustment',
                },
              });
            }
          }

          // Record Stock Transaction
          await tx.stockTransaction.create({
            data: {
              itemId: item.id,
              type: 'ADJUSTMENT',
              quantity: variance,
              unitCost: 0,
              totalCost: 0,
              createdById: creatorId,
              note: `[ตรวจนับสต็อก] นับได้ ${physicalCount} (เดิม ${systemCount}, ผลต่าง ${variance > 0 ? '+' : ''}${variance}) | สาเหตุ: ${reason || 'กระทบยอดประจำงวด'}`,
            },
          });
        }

        updatedItems.push({
          itemId: item.id,
          itemName: item.name,
          variance,
          physicalCount,
        });
      }
      }
    });

    invalidateCache('items:');
    invalidateCache('dashboard:');

    await logActivity({
      userId: creatorId,
      userName: countedBy || adminUser?.name || undefined,
      action: 'STOCK_ADJUST',
      entityType: 'STOCK',
      entityTitle: `ตรวจนับสต็อก (${updatedItems.length + adjustedLots.length} วัสดุ / ${updatedAssets.length} ครุภัณฑ์)`,
      details: `ปรับยอดจากการตรวจนับสต็อก: วัสดุ ${updatedItems.length + adjustedLots.length} รายการ, ครุภัณฑ์ ${updatedAssets.length} รายการ${note ? ` | หมายเหตุ: ${note}` : ''}`,
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกผลการตรวจนับสำเร็จ (กระทบยอดวัสดุ ${updatedItems.length + adjustedLots.length} รายการ, ตรวจสอบครุภัณฑ์ ${updatedAssets.length} รายการ)`,
      reconciledAt: new Date().toISOString(),
      updatedItems,
      updatedAssets,
      adjustedLots,
    });
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการกระทบยอดสต็อก' },
      { status: 500 }
    );
  }
}