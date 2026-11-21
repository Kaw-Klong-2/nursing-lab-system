import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { logActivity } from '@/lib/activity-log';

// GET: Fetch all repack records and consumable items with active lots
export async function GET(req: Request) {
  try {
    const [records, consumableItems] = await Promise.all([
      prisma.repackRecord.findMany({
        include: {
          sourceItem: true,
          sourceLot: true,
          targetItem: true,
          operator: true,
          packItems: {
            orderBy: { packNumber: 'asc' },
          },
        },
        orderBy: { packedDate: 'desc' },
      }),
      prisma.item.findMany({
        where: {
          type: 'CONSUMABLE',
          status: 'ACTIVE',
          // ไม่แสดงเวชภัณฑ์ที่เกิดจากการแบ่งบรรจุแล้ว (เช่น รหัส RP- หรือหน่วย ซอง) มาเป็นต้นทางแบ่งซ้ำ
          NOT: [
            { code: { startsWith: 'RP-' } },
            { unit: 'ซอง' },
          ],
        },
        include: {
          category: true,
          stockLots: {
            where: {
              quantityRemaining: { gt: 0 },
              // ไม่แสดงล็อตย่อย (SL-) หรือล็อตที่เกิดจากการแบ่งบรรจุมาเป็นล็อตต้นทาง
              NOT: [
                { lotNumber: { startsWith: 'SL-' } },
                { lotNumber: { startsWith: 'RP-' } },
              ],
            },
            orderBy: { expiryDate: 'asc' },
            include: {
              boxes: {
                orderBy: { boxNumberInLot: 'asc' },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ records, consumableItems });
  } catch (error: any) {
    console.error('Fetch Repack Data Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงานแบ่งบรรจุ' },
      { status: 500 }
    );
  }
}

class RepackError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// POST: Create a new Repack operation
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sourceItemId,
      sourceLotId,
      sourceQtyUsed,
      customUsageUnit,
      customRatio,
      subLotNumber,
      unitsPerPack,
      totalPacksProduced,
      packedDate,
      sterileExpiryDate,
      sterilizeMethod,
      operatorId,
      note,
      // Target item options
      targetItemId: rawTargetItemId,
      autoCreateTargetItem,
      targetItemName: rawTargetItemName,
      targetItemCode: rawTargetItemCode,
    } = body;

    const qtyUsed = Number(sourceQtyUsed);
    const packsProduced = Number(totalPacksProduced);

    if (!sourceItemId || !sourceLotId || !Number.isFinite(qtyUsed) || qtyUsed <= 0) {
      return NextResponse.json(
        { error: 'กรุณาเลือกรายการเวชภัณฑ์ เลือกล็อตเดิม และระบุจำนวนที่เบิกมาแพ็ค' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(packsProduced) || packsProduced <= 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุจำนวนซองย่อยที่ได้ (มากกว่า 0)' },
        { status: 400 }
      );
    }

    const { record, sourceLot, targetItem, recordNumber, autoSubLot } = await prisma.$transaction(
      async (tx) => {
        // Check source lot remaining quantity inside transaction
        const foundSourceLot = await tx.stockLot.findUnique({
          where: { id: sourceLotId },
          include: { item: true },
        });

        if (!foundSourceLot) {
          throw new RepackError('ไม่พบล็อตเวชภัณฑ์ที่เลือก', 404);
        }

        if (foundSourceLot.quantityRemaining < qtyUsed) {
          throw new RepackError(
            'ยอดคงเหลือในล็อตนี้ไม่เพียงพอ (คงเหลือ ' + foundSourceLot.quantityRemaining + ' ' + foundSourceLot.item.unit + ')',
            400
          );
        }

        // Determine or create Target Item (เวชภัณฑ์สำเร็จรูปแบ่งบรรจุสเตอร์ไรด์ หน่วยเป็น 'ซอง')
        let finalTargetItemId = rawTargetItemId || null;
        const effectiveUsageUnit = customUsageUnit || foundSourceLot.item.usageUnit || 'ชิ้น';
        const effectiveUnitsPerPack = Number(unitsPerPack) > 0 ? Number(unitsPerPack) : 1;

        if (!finalTargetItemId) {
          // Auto-generate code & name for target item
          const defaultTargetCode = rawTargetItemCode?.trim() || `RP-${foundSourceLot.item.code}-${effectiveUnitsPerPack}`;
          const defaultTargetName = rawTargetItemName?.trim() || `${foundSourceLot.item.name} (ซอง ${effectiveUnitsPerPack} ${effectiveUsageUnit} ปลอดเชื้อ)`;

          // Check if target item already exists with this code
          let existingTarget = await tx.item.findUnique({
            where: { code: defaultTargetCode },
          });

          if (!existingTarget) {
            // Find if any item has exact same name
            existingTarget = await tx.item.findFirst({
              where: { name: defaultTargetName },
            });
          }

          if (existingTarget) {
            finalTargetItemId = existingTarget.id;
          } else {
            // Create new Target Item with unit: "ซอง"
            const createdItem = await tx.item.create({
              data: {
                code: defaultTargetCode,
                name: defaultTargetName,
                type: 'CONSUMABLE',
                categoryId: foundSourceLot.item.categoryId,
                unit: 'ซอง',
                usageUnit: effectiveUsageUnit,
                conversionRatio: effectiveUnitsPerPack,
                location: foundSourceLot.item.location
                  ? `${foundSourceLot.item.location} (ตู้เก็บของสเตอร์ไรด์)`
                  : 'ห้องปฏิบัติการพยาบาล (ตู้ปลอดเชื้อ)',
                description: `เวชภัณฑ์แบ่งบรรจุและสเตอร์ไรด์จาก ${foundSourceLot.item.name} (ซองละ ${effectiveUnitsPerPack} ${effectiveUsageUnit})`,
                minStockAlert: 10,
              },
            });
            finalTargetItemId = createdItem.id;
          }
        }

        // Fetch final target item detail for logging/naming
        const foundTargetItem = await tx.item.findUnique({
          where: { id: finalTargetItemId },
        });

        // Generate collision-resistant record number
        const prefix = `RP-${new Date().getFullYear()}-`;
        const [count, latestRecord] = await Promise.all([
          tx.repackRecord.count({ where: { recordNumber: { startsWith: prefix } } }),
          tx.repackRecord.findFirst({
            where: { recordNumber: { startsWith: prefix } },
            orderBy: { recordNumber: 'desc' },
            select: { recordNumber: true },
          }),
        ]);
        const latestSeq = latestRecord?.recordNumber
          ? parseInt(latestRecord.recordNumber.slice(prefix.length), 10) || 0
          : 0;
        const nextSeq = Math.max(count, latestSeq) + 1;
        const genRecordNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

        let genSubLot = subLotNumber ? subLotNumber.trim().toUpperCase() : '';
        if (!genSubLot) {
          const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
          genSubLot = 'SL-' + (foundSourceLot.item.code || 'MED') + '-' + todayStr + '-01';
        }

        // Ensure genSubLot and its packCodes do not collide with any existing record or packCode
        let candidateSubLot = genSubLot;
        let suffix = 1;
        while (true) {
          const existingRecord = await tx.repackRecord.findFirst({
            where: { subLotNumber: candidateSubLot },
          });
          const existingPack = await tx.repackPackItem.findFirst({
            where: { packCode: { startsWith: `${candidateSubLot}-P` } },
          });
          const existingLot = await tx.stockLot.findFirst({
            where: { lotNumber: candidateSubLot },
          });

          if (!existingRecord && !existingPack && !existingLot) {
            break;
          }

          suffix++;
          const baseClean = genSubLot.replace(/-\d+$/, '');
          candidateSubLot = `${baseClean}-${String(suffix).padStart(2, '0')}`;
        }
        genSubLot = candidateSubLot;

        const parsedPackedDate = packedDate ? new Date(packedDate) : new Date();
        const parsedSterileExpiry = sterileExpiryDate ? new Date(sterileExpiryDate) : null;

        // Calculate cost per pack
        const totalSourceCost = qtyUsed * foundSourceLot.unitCost;
        const unitCostPerPack = packsProduced > 0 ? totalSourceCost / packsProduced : 0;

        // 1. Atomic non-negative decrement on source lot
        const packSize = Number(foundSourceLot.packSize) > 0 ? Number(foundSourceLot.packSize) : 1;
        const newQtyRemaining = foundSourceLot.quantityRemaining - qtyUsed;
        const openRem = foundSourceLot.openPackRemainder || 0;
        const newPiecesRemaining = Math.max(0, (newQtyRemaining * packSize) + openRem);

        const deductRes = await tx.stockLot.updateMany({
          where: {
            id: sourceLotId,
            quantityRemaining: { gte: qtyUsed },
          },
          data: {
            quantityRemaining: { decrement: qtyUsed },
            piecesRemaining: newPiecesRemaining,
          },
        });

        if (deductRes.count === 0) {
          throw new RepackError(
            'ยอดคงเหลือในล็อตนี้ไม่เพียงพอหรือถูกใช้งานพร้อมกัน กรุณาตรวจสอบสต็อกใหม่อีกครั้ง',
            409
          );
        }

        // 2. Record Transaction OUT_REQUISITION for source item
        await tx.stockTransaction.create({
          data: {
            itemId: sourceItemId,
            lotId: sourceLotId,
            type: 'OUT_REQUISITION',
            quantity: qtyUsed,
            unitCost: foundSourceLot.unitCost,
            totalCost: totalSourceCost,
            referenceNumber: genRecordNumber,
            createdById: operatorId,
            note: `เบิกแบ่งบรรจุย่อยเข้าสู่: ${foundTargetItem?.name || 'เวชภัณฑ์สเตอร์ไรด์'} [Sub-lot: ${genSubLot}] (${packsProduced} ซอง)`,
          },
        });

        // 3. Create new Sub-lot in stockLots belonging to TARGET ITEM (หน่วย: ซอง)
        const newSubLot = await tx.stockLot.create({
          data: {
            itemId: finalTargetItemId,
            lotNumber: genSubLot,
            brand: foundSourceLot.brand || null,
            packSize: effectiveUnitsPerPack,
            packageUnit: 'ซอง',
            totalPieces: packsProduced * effectiveUnitsPerPack,
            piecesRemaining: packsProduced * effectiveUnitsPerPack,
            quantityInitial: packsProduced,
            quantityRemaining: packsProduced,
            unitCost: unitCostPerPack,
            expiryDate: parsedSterileExpiry || foundSourceLot.expiryDate,
            receivedDate: parsedPackedDate,
            supplier: `แล็บพยาบาลแบ่งบรรจุสเตอร์ไรด์ (จาก Lot ${foundSourceLot.lotNumber}${foundSourceLot.brand ? ` / ${foundSourceLot.brand}` : ''})`,
          },
        });

        // 4. Record Transaction IN for Target Item
        await tx.stockTransaction.create({
          data: {
            itemId: finalTargetItemId,
            lotId: newSubLot.id,
            type: 'IN',
            quantity: packsProduced,
            unitCost: unitCostPerPack,
            totalCost: totalSourceCost,
            referenceNumber: genRecordNumber,
            createdById: operatorId,
            note: `รับเข้าเวชภัณฑ์แบ่งบรรจุสำเร็จรูป ${genSubLot} (ขนาด ${effectiveUnitsPerPack} ${effectiveUsageUnit}/ซอง) รวม ${packsProduced} ซอง`,
          },
        });

        // 5. Create RepackRecord with individual RepackPackItems
        const packItemsData = [];
        for (let i = 1; i <= packsProduced; i++) {
          packItemsData.push({
            packNumber: i,
            packCode: `${genSubLot}-P${String(i).padStart(2, '0')}`,
            unitsCount: effectiveUnitsPerPack,
            status: 'AVAILABLE',
          });
        }

        const createdRecord = await tx.repackRecord.create({
          data: {
            recordNumber: genRecordNumber,
            sourceItemId,
            sourceLotId,
            sourceQtyUsed: qtyUsed,
            targetItemId: finalTargetItemId,
            subLotNumber: genSubLot,
            unitsPerPack: effectiveUnitsPerPack,
            totalPacksProduced: packsProduced,
            packedDate: parsedPackedDate,
            sterileExpiryDate: parsedSterileExpiry,
            sterilizeMethod: sterilizeMethod || 'Autoclave (ไอน้ำ)',
            operatorId,
            note: note || null,
            packItems: {
              create: packItemsData,
            },
          },
          include: {
            sourceItem: true,
            sourceLot: true,
            targetItem: true,
            operator: true,
            packItems: {
              orderBy: { packNumber: 'asc' },
            },
          },
        });

        return {
          record: createdRecord,
          sourceLot: foundSourceLot,
          targetItem: foundTargetItem,
          recordNumber: genRecordNumber,
          autoSubLot: genSubLot,
        };
      },
      { timeout: 25000 }
    );

    invalidateCache('items:');
    invalidateCache('dashboard:');

    await logActivity({
      userId: operatorId || null,
      action: 'STOCK_IN',
      entityType: 'STOCK',
      entityId: record.id,
      entityTitle: `${recordNumber} (${autoSubLot})`,
      details: `แบ่งบรรจุเวชภัณฑ์จาก ${sourceLot.item.name} เข้าสู่ ${targetItem?.name || ''} จำนวน ${packsProduced} ซอง`,
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกการแบ่งบรรจุสำเร็จ! รับเข้าสต็อกพัสดุ: ${targetItem?.name} จำนวน ${packsProduced} ซอง (Sub-lot: ${autoSubLot})`,
      record,
    });
  } catch (error: any) {
    if (error instanceof RepackError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'รหัสซองหรือเลขที่ล็อตย่อยซ้ำกับข้อมูลในระบบ กรุณาลองใหม่อีกครั้ง' },
        { status: 409 }
      );
    }
    console.error('Repack API Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกการแบ่งบรรจุ' },
      { status: 500 }
    );
  }
}
