import { Prisma } from '@prisma/client';
import { getBangkokParts } from '@/lib/date-time-utils';

export class DispenseActionError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * สร้างเลขที่คำขอ (BRW-YYYYMMDD-NNN หรือ REQ-YYYYMMDD-NNN) ตามเวลาประเทศไทยและตรวจไม่ให้ซ้ำ
 */
export async function generateUniqueRequestNumber(
  tx: Prisma.TransactionClient,
  prefix: 'BRW' | 'REQ'
): Promise<string> {
  const bkk = getBangkokParts(new Date());
  const dateStr = `${bkk.year}${String(bkk.month + 1).padStart(2, '0')}${String(bkk.day).padStart(2, '0')}`;

  const currentCount =
    prefix === 'BRW'
      ? await tx.borrowRequest.count()
      : await tx.requisitionRequest.count();

  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `${prefix}-${dateStr}-${String(currentCount + 1 + attempt).padStart(3, '0')}`;
    const existing =
      prefix === 'BRW'
        ? await tx.borrowRequest.findUnique({ where: { requestNumber: candidate }, select: { id: true } })
        : await tx.requisitionRequest.findUnique({ where: { requestNumber: candidate }, select: { id: true } });

    if (!existing) {
      return candidate;
    }
  }

  const randSuffix = `${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`;
  return `${prefix}-${dateStr}-${randSuffix}`;
}

/**
 * จัดสรรและส่งมอบครุภัณฑ์หน้างาน (รองรับทั้งแบบคุมรายชิ้น Asset ID และแบบนับจำนวนรวม)
 */
export async function allocateAndCheckoutEquipmentItem(
  tx: Prisma.TransactionClient,
  params: {
    borrowRequestId: string;
    itemId: string;
    quantity: number;
    explicitAssetIds?: string[];
  }
): Promise<{
  itemName: string;
  unit: string;
  allocatedCount: number;
  assignedAssetCodes: string[];
}> {
  const qty = Math.max(1, Math.round(Number(params.quantity) || 1));
  const explicitIds = Array.isArray(params.explicitAssetIds)
    ? Array.from(new Set(params.explicitAssetIds.filter(Boolean)))
    : [];

  const [itemMeta, totalAssetsCount, availableAssets] = await Promise.all([
    tx.item.findUnique({
      where: { id: params.itemId },
      select: { id: true, name: true, unit: true },
    }),
    tx.equipmentAsset.count({ where: { itemId: params.itemId } }),
    tx.equipmentAsset.findMany({
      where: { itemId: params.itemId, status: 'AVAILABLE' },
      orderBy: { sequenceNumber: 'asc' },
    }),
  ]);

  if (!itemMeta) {
    throw new DispenseActionError('ไม่พบข้อมูลครุภัณฑ์ที่ต้องการเพิ่มหน้างาน', 404);
  }

  const assignedAssetCodes: string[] = [];

  if (totalAssetsCount > 0 || explicitIds.length > 0) {
    const usedIds = new Set<string>();
    const remainingPool = [...availableAssets];

    for (let i = 0; i < qty; i++) {
      let chosenAsset: (typeof availableAssets)[number] | null = null;
      const requestedAssetId = explicitIds[i];

      if (requestedAssetId && !usedIds.has(requestedAssetId)) {
        const claimed = await tx.equipmentAsset.updateMany({
          where: { id: requestedAssetId, itemId: params.itemId, status: 'AVAILABLE' },
          data: { status: 'BORROWED' },
        });
        if (claimed.count > 0) {
          chosenAsset =
            availableAssets.find((a) => a.id === requestedAssetId) ||
            (await tx.equipmentAsset.findUnique({ where: { id: requestedAssetId } }));
        }
      }

      if (!chosenAsset) {
        while (remainingPool.length > 0) {
          const candidate = remainingPool.shift()!;
          if (usedIds.has(candidate.id)) continue;
          const claimed = await tx.equipmentAsset.updateMany({
            where: { id: candidate.id, status: 'AVAILABLE' },
            data: { status: 'BORROWED' },
          });
          if (claimed.count > 0) {
            chosenAsset = candidate;
            break;
          }
        }
      }

      if (chosenAsset) {
        usedIds.add(chosenAsset.id);
        assignedAssetCodes.push(chosenAsset.assetCode);
      }

      await tx.borrowItem.create({
        data: {
          borrowRequestId: params.borrowRequestId,
          itemId: params.itemId,
          assetId: chosenAsset ? chosenAsset.id : null,
          quantity: 1,
          previousLocation: chosenAsset?.location || null,
        },
      });
    }
  } else {
    await tx.borrowItem.create({
      data: {
        borrowRequestId: params.borrowRequestId,
        itemId: params.itemId,
        assetId: null,
        quantity: qty,
      },
    });
  }

  return {
    itemName: itemMeta.name,
    unit: itemMeta.unit,
    allocatedCount: qty,
    assignedAssetCodes,
  };
}

/**
 * ตัดสต็อกวัสดุสิ้นเปลืองแบบ FIFO/FEFO (รองรับทั้งแพ็คเต็มและเบิกย่อย Option A) พร้อมบันทึก StockTransaction
 */
export async function dispenseConsumableItemFifo(
  tx: Prisma.TransactionClient,
  params: {
    itemId: string;
    quantityTarget: number;
    isSubUnit?: boolean;
    requestedUnit?: string | null;
    preferredLotId?: string | null;
    useTarget?: string | null;
    courseId?: string | null;
    referenceNumber: string;
    actorUserId: string;
    noteSuffix?: string | null;
    recipientLabel?: string | null;
    noteLabel?: string | null;
  }
): Promise<{
  itemName: string;
  unitLabel: string;
  isSubUnit: boolean;
  actualDispensed: number;
  itemCost: number;
  unitCost: number;
}> {
  const itemRecord = await tx.item.findUnique({
    where: { id: params.itemId },
    select: {
      id: true,
      name: true,
      unit: true,
      usageUnit: true,
      conversionRatio: true,
    },
  });

  if (!itemRecord) {
    throw new DispenseActionError('ไม่พบข้อมูลวัสดุสิ้นเปลืองที่ต้องการจ่าย', 404);
  }

  const requestedTarget = Math.max(0, Math.round(Number(params.quantityTarget) || 0));
  let remainingToDeduct = requestedTarget;
  let itemCost = 0;

  const isSub = params.isSubUnit === true;
  const ratio = Number(itemRecord.conversionRatio) > 0 ? Number(itemRecord.conversionRatio) : 1;
  const resolvedUnitLabel =
    params.requestedUnit ||
    (isSub ? itemRecord.usageUnit || 'ชิ้น' : itemRecord.unit) ||
    itemRecord.unit ||
    'หน่วย';
  const refTag = params.noteLabel || `ตามคำขอ ${params.referenceNumber}`;
  const noteEnd = params.noteSuffix ? ` | ${params.noteSuffix.trim()}` : '';
  const recipientDisplay = params.recipientLabel
    ? `${params.recipientLabel} (${params.referenceNumber})`
    : params.referenceNumber;

  const whereLots: Prisma.StockLotWhereInput = {
    itemId: params.itemId,
    OR: [{ quantityRemaining: { gt: 0 } }, { openPackRemainder: { gt: 0 } }],
  };

  if (params.useTarget === 'HUMAN') {
    whereLots.AND = [
      {
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
      },
    ];
  }

  let availableLots = await tx.stockLot.findMany({
    where: whereLots,
    orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }, { createdAt: 'asc' }],
  });

  if (params.preferredLotId) {
    const preferred = availableLots.find((l) => l.id === params.preferredLotId);
    if (preferred) {
      availableLots = [preferred, ...availableLots.filter((l) => l.id !== params.preferredLotId)];
    }
  }

  if (!isSub) {
    for (const lot of availableLots) {
      if (remainingToDeduct <= 0) break;
      if (lot.quantityRemaining <= 0) continue;

      const deduct = Math.min(lot.quantityRemaining, remainingToDeduct);
      const cost = deduct * lot.unitCost;
      const newQty = lot.quantityRemaining - deduct;
      const openRem = lot.openPackRemainder || 0;
      const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
      const newPieces = Math.max(0, newQty * lotPackSize + openRem);

      const lotUpd = await tx.stockLot.updateMany({
        where: { id: lot.id, quantityRemaining: { gte: deduct } },
        data: {
          quantityRemaining: newQty,
          piecesRemaining: newPieces,
        },
      });
      if (lotUpd.count === 0) {
        throw new DispenseActionError(
          'สต็อกวัสดุมีการเปลี่ยนแปลงพร้อมกัน กรุณาตรวจสอบและลองใหม่อีกครั้ง',
          409,
          'CONCURRENCY_CONFLICT'
        );
      }

      const availableBoxes = await tx.stockLotBox.findMany({
        where: { lotId: lot.id, status: 'IN_STOCK' },
        orderBy: { boxNumberInLot: 'asc' },
        take: deduct,
      });
      if (availableBoxes.length > 0) {
        await tx.stockLotBox.updateMany({
          where: { id: { in: availableBoxes.map((b) => b.id) } },
          data: { status: 'DISPENSED', depletedAt: new Date() },
        });
      }

      const availablePacks = await tx.repackPackItem.findMany({
        where: { repackRecord: { subLotNumber: lot.lotNumber }, status: 'AVAILABLE' },
        orderBy: { packNumber: 'asc' },
        take: deduct,
      });
      if (availablePacks.length > 0) {
        await tx.repackPackItem.updateMany({
          where: { id: { in: availablePacks.map((p) => p.id) } },
          data: {
            status: 'DISPENSED',
            dispensedTo: recipientDisplay,
            dispensedAt: new Date(),
          },
        });
      }

      await tx.stockTransaction.create({
        data: {
          itemId: params.itemId,
          lotId: lot.id,
          type: 'OUT_REQUISITION',
          quantity: -deduct,
          unitCost: lot.unitCost,
          totalCost: cost,
          courseId: params.courseId || null,
          referenceNumber: params.referenceNumber,
          createdById: params.actorUserId,
          note: `จ่าย ${deduct} ${resolvedUnitLabel} ${refTag}${noteEnd}`,
        },
      });

      itemCost += cost;
      remainingToDeduct -= deduct;
    }
  } else {
    let piecesNeeded = remainingToDeduct;

    // Step 1: จ่ายแพ็คเต็มก่อนหากจำนวนชิ้นย่อยมากกว่าหรือเท่ากับขนาดแพ็ค
    for (const lot of availableLots) {
      if (piecesNeeded <= 0) break;
      if (lot.quantityRemaining <= 0) continue;

      const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
      if (lotPackSize <= 1 || piecesNeeded < lotPackSize) continue;

      const maxWholePacks = Math.floor(piecesNeeded / lotPackSize);
      const deductPacks = Math.min(lot.quantityRemaining, maxWholePacks);
      if (deductPacks <= 0) continue;

      const costForPacks = deductPacks * lot.unitCost;
      const newQty = lot.quantityRemaining - deductPacks;
      const openRem = lot.openPackRemainder || 0;
      const newPieces = Math.max(0, newQty * lotPackSize + openRem);

      const lotUpd = await tx.stockLot.updateMany({
        where: { id: lot.id, quantityRemaining: { gte: deductPacks } },
        data: {
          quantityRemaining: newQty,
          piecesRemaining: newPieces,
        },
      });
      if (lotUpd.count === 0) {
        throw new DispenseActionError(
          'สต็อกวัสดุมีการเปลี่ยนแปลงพร้อมกัน กรุณาตรวจสอบและลองใหม่อีกครั้ง',
          409,
          'CONCURRENCY_CONFLICT'
        );
      }
      lot.quantityRemaining = newQty;

      const availableBoxes = await tx.stockLotBox.findMany({
        where: { lotId: lot.id, status: 'IN_STOCK' },
        orderBy: { boxNumberInLot: 'asc' },
        take: deductPacks,
      });
      if (availableBoxes.length > 0) {
        await tx.stockLotBox.updateMany({
          where: { id: { in: availableBoxes.map((b) => b.id) } },
          data: { status: 'DISPENSED', depletedAt: new Date() },
        });
      }

      const availablePacks = await tx.repackPackItem.findMany({
        where: { repackRecord: { subLotNumber: lot.lotNumber }, status: 'AVAILABLE' },
        orderBy: { packNumber: 'asc' },
        take: deductPacks,
      });
      if (availablePacks.length > 0) {
        await tx.repackPackItem.updateMany({
          where: { id: { in: availablePacks.map((p) => p.id) } },
          data: {
            status: 'DISPENSED',
            dispensedTo: recipientDisplay,
            dispensedAt: new Date(),
          },
        });
      }

      await tx.stockTransaction.create({
        data: {
          itemId: params.itemId,
          lotId: lot.id,
          type: 'OUT_REQUISITION',
          quantity: -deductPacks,
          unitCost: lot.unitCost,
          totalCost: costForPacks,
          courseId: params.courseId || null,
          referenceNumber: params.referenceNumber,
          createdById: params.actorUserId,
          note: `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * lotPackSize} ${resolvedUnitLabel}) ${refTag}${noteEnd}`,
        },
      });

      itemCost += costForPacks;
      piecesNeeded -= deductPacks * lotPackSize;
    }

    // Step 2A: หักจากเศษแพ็คเปิดเดิม
    if (piecesNeeded > 0) {
      for (const lot of availableLots) {
        if (piecesNeeded <= 0) break;
        const currentOpen = lot.openPackRemainder || 0;
        if (currentOpen <= 0) continue;

        const takeFromOpen = Math.min(currentOpen, piecesNeeded);
        const newOpen = currentOpen - takeFromOpen;
        const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
        const pieceCost = lot.unitCost / lotPackSize;
        const costForLoose = takeFromOpen * pieceCost;
        const newPieces = Math.max(0, lot.quantityRemaining * lotPackSize + newOpen);

        const lotUpd = await tx.stockLot.updateMany({
          where: { id: lot.id, openPackRemainder: { gte: takeFromOpen } },
          data: {
            openPackRemainder: newOpen,
            piecesRemaining: newPieces,
          },
        });
        if (lotUpd.count === 0) {
          throw new DispenseActionError(
            'สต็อกวัสดุมีการเปลี่ยนแปลงพร้อมกัน กรุณาตรวจสอบและลองใหม่อีกครั้ง',
            409,
            'CONCURRENCY_CONFLICT'
          );
        }
        lot.openPackRemainder = newOpen;

        if (newOpen === 0) {
          const inUseBox = await tx.stockLotBox.findFirst({
            where: { lotId: lot.id, status: 'IN_USE' },
            orderBy: { boxNumberInLot: 'asc' },
          });
          if (inUseBox) {
            await tx.stockLotBox.update({
              where: { id: inUseBox.id },
              data: { status: 'DISPENSED', depletedAt: new Date() },
            });
          }
        }

        await tx.stockTransaction.create({
          data: {
            itemId: params.itemId,
            lotId: lot.id,
            type: 'OUT_REQUISITION',
            quantity: 0,
            unitCost: lot.unitCost,
            totalCost: costForLoose,
            courseId: params.courseId || null,
            referenceNumber: params.referenceNumber,
            createdById: params.actorUserId,
            note: `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${resolvedUnitLabel} ${refTag}${noteEnd}`,
          },
        });

        itemCost += costForLoose;
        piecesNeeded -= takeFromOpen;
      }
    }

    // Step 2B: เปิดแพ็คใหม่ 1 แพ็ค (หรือเท่าที่จำเป็น) แล้วเก็บเศษกลับคลัง
    if (piecesNeeded > 0) {
      for (const lot of availableLots) {
        if (piecesNeeded <= 0) break;
        if (lot.quantityRemaining <= 0) continue;

        const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
        const packsToOpen = Math.min(lot.quantityRemaining, Math.ceil(piecesNeeded / lotPackSize));
        const piecesProvided = packsToOpen * lotPackSize;
        const piecesToDeduct = Math.min(piecesProvided, piecesNeeded);
        const leftoverPieces = piecesProvided - piecesToDeduct;

        const newQty = lot.quantityRemaining - packsToOpen;
        const currentOpen = lot.openPackRemainder || 0;
        const newOpen = currentOpen + leftoverPieces;
        const newPieces = Math.max(0, newQty * lotPackSize + newOpen);

        const lotUpd = await tx.stockLot.updateMany({
          where: { id: lot.id, quantityRemaining: { gte: packsToOpen } },
          data: {
            quantityRemaining: newQty,
            openPackRemainder: newOpen,
            piecesRemaining: newPieces,
          },
        });
        if (lotUpd.count === 0) {
          throw new DispenseActionError(
            'สต็อกวัสดุมีการเปลี่ยนแปลงพร้อมกัน กรุณาตรวจสอบและลองใหม่อีกครั้ง',
            409,
            'CONCURRENCY_CONFLICT'
          );
        }
        lot.quantityRemaining = newQty;
        lot.openPackRemainder = newOpen;

        const availableBoxes = await tx.stockLotBox.findMany({
          where: { lotId: lot.id, status: 'IN_STOCK' },
          orderBy: { boxNumberInLot: 'asc' },
          take: packsToOpen,
        });
        if (availableBoxes.length > 0) {
          if (packsToOpen > 1) {
            const fullyUsed = availableBoxes.slice(0, -1);
            await tx.stockLotBox.updateMany({
              where: { id: { in: fullyUsed.map((b) => b.id) } },
              data: { status: 'DISPENSED', openedAt: new Date(), depletedAt: new Date() },
            });
          }
          const lastBox = availableBoxes[availableBoxes.length - 1];
          await tx.stockLotBox.update({
            where: { id: lastBox.id },
            data: {
              status: leftoverPieces > 0 ? 'IN_USE' : 'DISPENSED',
              openedAt: new Date(),
              ...(leftoverPieces === 0 ? { depletedAt: new Date() } : {}),
            },
          });
        }

        const pieceCost = lot.unitCost / lotPackSize;
        const costForDispensedPieces = piecesToDeduct * pieceCost;

        await tx.stockTransaction.create({
          data: {
            itemId: params.itemId,
            lotId: lot.id,
            type: 'OUT_REQUISITION',
            quantity: -packsToOpen,
            unitCost: lot.unitCost,
            totalCost: costForDispensedPieces,
            courseId: params.courseId || null,
            referenceNumber: params.referenceNumber,
            createdById: params.actorUserId,
            note: `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${resolvedUnitLabel} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ${refTag}${noteEnd}`,
          },
        });

        itemCost += costForDispensedPieces;
        piecesNeeded -= piecesToDeduct;
      }
    }

    remainingToDeduct = piecesNeeded;
  }

  const actualDispensed = requestedTarget - remainingToDeduct;
  return {
    itemName: itemRecord.name,
    unitLabel: resolvedUnitLabel,
    isSubUnit: isSub,
    actualDispensed,
    itemCost,
    unitCost: actualDispensed > 0 ? itemCost / actualDispensed : 0,
  };
}
