import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { logActivity } from '@/lib/activity-log';

class KitDispenseError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// POST: Instant Kit Preparation & Stock Dispensing for a Class Session
// Supports: Open Pack Remainder & Bonus Remainder (เศษซองเปิด + แถมเศษเคลียร์ตู้)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      kitId,
      setsToPrepare, // จำนวนชุดที่ต้องการจัด เช่น 3 ชุด
      userId,
      courseId,
      instructorName,
      roomOrLocation,
      note,
      useOpenPackFirst = true,     // ดึงจากเศษซองเปิดก่อนถ้ามี
      giveRemainderAsBonus = false, // แถมเศษที่เหลือในซองให้นิสิตไปด้วย (เคลียร์ซองเปิด)
    } = body;

    if (!kitId || !setsToPrepare || Number(setsToPrepare) < 1) {
      return NextResponse.json(
        { error: 'กรุณาระบุชุดฝึกและจำนวนชุดที่ต้องการจัดเตรียม (อย่างน้อย 1 ชุด)' },
        { status: 400 }
      );
    }

    const numSets = Number(setsToPrepare);

    // Fetch course if provided
    const course = courseId
      ? await prisma.course.findUnique({ where: { id: courseId } })
      : null;

    const { kit, prepReference, dispensedSummary, totalValueDispensed } = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch PracticeKit with items and current stocks & lots inside transaction
        const kitRecord = await tx.practiceKit.findUnique({
          where: { id: kitId },
          include: {
            items: {
              include: {
                item: {
                  include: {
                    category: true,
                    stockLots: {
                      where: {
                        OR: [
                          { quantityRemaining: { gt: 0 } },
                          { openPackRemainder: { gt: 0 } },
                        ],
                      },
                      orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
                    },
                    assets: {
                      where: { status: 'AVAILABLE' },
                    },
                  },
                },
              },
            },
          },
        });

        if (!kitRecord) {
          throw new KitDispenseError('ไม่พบชุดฝึกปฏิบัติการที่ระบุ', 404);
        }

        // 2. Pre-check stock availability (including total pieces vs required pieces)
        const shortageItems: string[] = [];
        for (const kitItem of kitRecord.items) {
          const requiredQty = kitItem.quantity * numSets;
          if (kitItem.item.type === 'CONSUMABLE') {
            const ratio = Number(kitItem.item.conversionRatio) > 0 ? Number(kitItem.item.conversionRatio) : 1;
            const availableWholePacks = kitItem.item.stockLots.reduce(
              (sum, lot) => sum + (lot.quantityRemaining || 0),
              0
            );
            const availableOpenPieces = kitItem.item.stockLots.reduce(
              (sum, lot) => sum + (lot.openPackRemainder || 0),
              0
            );
            const effectivePiecesAvailable = useOpenPackFirst
              ? (availableWholePacks * ratio) + availableOpenPieces
              : availableWholePacks * ratio;

            if (effectivePiecesAvailable < requiredQty) {
              shortageItems.push(
                `${kitItem.item.name}: ต้องการ ${requiredQty} ${kitItem.item.usageUnit || kitItem.item.unit} แต่มีคงเหลือ ${effectivePiecesAvailable} ${kitItem.item.usageUnit || kitItem.item.unit}`
              );
            }
          }
        }

        if (shortageItems.length > 0) {
          throw new KitDispenseError(
            `สต็อกวัสดุไม่เพียงพอสำหรับจัด ${numSets} ชุด:\n` + shortageItems.join('\n'),
            400
          );
        }

        // 3. Generate Prep Reference Number
        const countTx = await tx.stockTransaction.count();
        const prepRef = `PREP-${new Date().getFullYear()}-${String(countTx + 1).padStart(5, '0')}`;

        const summaryList: any[] = [];
        let totalVal = 0;

        // 4. Execute Deduction with Open Pack & Bonus Support atomically
        for (const kitItem of kitRecord.items) {
          const requiredQty = kitItem.quantity * numSets;

          if (kitItem.item.type === 'CONSUMABLE') {
            const ratio = Number(kitItem.item.conversionRatio) > 0 ? Number(kitItem.item.conversionRatio) : 1;
            const isRepackWithPieces = ratio > 1;

            let piecesNeeded = requiredQty;
            let piecesTakenFromOpenPack = 0;
            let wholePacksOpened = 0;
            let remainderLeftInPack = 0;
            let bonusPiecesGiven = 0;
            let itemTotalCost = 0;
            const usedLotsInfo: any[] = [];

            for (const lot of kitItem.item.stockLots) {
              if (piecesNeeded <= 0) break;

              const initialWholePacks = lot.quantityRemaining || 0;
              const initialOpenRemainder = lot.openPackRemainder || 0;
              let currentOpenRemainder = initialOpenRemainder;
              let currentWholePacks = initialWholePacks;

              let lotWholePacksOpened = 0;
              let lotPiecesTakenFromOpen = 0;
              let lotBonusPieces = 0;
              let lotCost = 0;
              let lotRemainderLeft = 0;

              // Step A: Use loose pieces from already open pack if enabled
              if (useOpenPackFirst && currentOpenRemainder > 0) {
                const takeFromOpen = Math.min(currentOpenRemainder, piecesNeeded);
                piecesTakenFromOpenPack += takeFromOpen;
                lotPiecesTakenFromOpen += takeFromOpen;
                currentOpenRemainder -= takeFromOpen;
                piecesNeeded -= takeFromOpen;

                // If user checked "giveRemainderAsBonus" and some remainder still sits in this open pack
                if (giveRemainderAsBonus && currentOpenRemainder > 0 && piecesNeeded <= 0) {
                  bonusPiecesGiven += currentOpenRemainder;
                  lotBonusPieces += currentOpenRemainder;
                  currentOpenRemainder = 0;
                }
              }

              // Step B: If more pieces still needed, open whole packs
              if (piecesNeeded > 0 && currentWholePacks > 0) {
                if (isRepackWithPieces) {
                  // Calculate how many whole packs to open
                  const packsRequired = Math.ceil(piecesNeeded / ratio);
                  const packsToDeduct = Math.min(currentWholePacks, packsRequired);
                  const piecesProvided = packsToDeduct * ratio;

                  wholePacksOpened += packsToDeduct;
                  lotWholePacksOpened += packsToDeduct;
                  currentWholePacks -= packsToDeduct;

                  const costForPacks = packsToDeduct * lot.unitCost;
                  itemTotalCost += costForPacks;
                  lotCost += costForPacks;

                  if (piecesProvided >= piecesNeeded) {
                    const leftover = piecesProvided - piecesNeeded;
                    piecesNeeded = 0;

                    if (giveRemainderAsBonus && leftover > 0) {
                      // Give remainder to student as bonus
                      bonusPiecesGiven += leftover;
                      lotBonusPieces += leftover;
                    } else if (leftover > 0) {
                      // Keep remainder in open pack pool
                      currentOpenRemainder += leftover;
                      remainderLeftInPack = currentOpenRemainder;
                      lotRemainderLeft = currentOpenRemainder;
                    }
                  } else {
                    piecesNeeded -= piecesProvided;
                  }
                } else {
                  // Normal 1:1 unit item
                  const deductQty = Math.min(currentWholePacks, piecesNeeded);
                  wholePacksOpened += deductQty;
                  lotWholePacksOpened += deductQty;
                  currentWholePacks -= deductQty;
                  const costForQty = deductQty * lot.unitCost;
                  itemTotalCost += costForQty;
                  lotCost += costForQty;
                  piecesNeeded -= deductQty;
                }
              }

              // Skip untouched lots (e.g., open-pack-only lot when useOpenPackFirst is false)
              if (lotWholePacksOpened === 0 && lotPiecesTakenFromOpen === 0 && lotBonusPieces === 0) {
                continue;
              }

              if (currentWholePacks < 0 || currentOpenRemainder < 0) {
                throw new KitDispenseError('สต็อกคงเหลือไม่เพียงพอสำหรับการตัดสต็อก', 409);
              }

              // Update stock lot in DB with optimistic guard (keep piecesRemaining in sync)
              const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
              const newPiecesRemaining = Math.max(0, (currentWholePacks * lotPackSize) + currentOpenRemainder);
              const lotUpd = await tx.stockLot.updateMany({
                where: {
                  id: lot.id,
                  quantityRemaining: initialWholePacks,
                  openPackRemainder: initialOpenRemainder,
                },
                data: {
                  quantityRemaining: currentWholePacks,
                  openPackRemainder: currentOpenRemainder,
                  piecesRemaining: newPiecesRemaining,
                },
              });

              if (lotUpd.count === 0) {
                throw new KitDispenseError('สต็อกมีการเปลี่ยนแปลงพร้อมกันจากรายการอื่น กรุณาลองใหม่อีกครั้ง', 409);
              }

              // Build descriptive note for transaction using per-lot deltas
              const noteDetails: string[] = [];
              if (lotWholePacksOpened > 0) {
                noteDetails.push(`เปิดซองใหม่ ${lotWholePacksOpened} ${kitItem.item.unit}`);
              }
              if (lotPiecesTakenFromOpen > 0) {
                noteDetails.push(`ดึงจากเศษซองเปิด ${lotPiecesTakenFromOpen} ${kitItem.item.usageUnit || kitItem.item.unit}`);
              }
              if (lotBonusPieces > 0) {
                noteDetails.push(`🎁 แถมเศษ ${lotBonusPieces} ${kitItem.item.usageUnit || kitItem.item.unit} เคลียร์ซอง`);
              } else if (lotRemainderLeft > 0) {
                noteDetails.push(`เก็บเศษในซองเปิด ${lotRemainderLeft} ${kitItem.item.usageUnit || kitItem.item.unit}`);
              }

              const fullNote = `จัดเตรียมชุดฝึก ${kitRecord.name} (${numSets} ชุด) - ${noteDetails.join(' | ')}`;

              // Record transaction
              await tx.stockTransaction.create({
                data: {
                  itemId: kitItem.itemId,
                  lotId: lot.id,
                  type: 'OUT_REQUISITION',
                  quantity: -(lotWholePacksOpened || lotPiecesTakenFromOpen),
                  unitCost: lot.unitCost,
                  totalCost: lotCost,
                  courseId: courseId || null,
                  referenceNumber: prepRef,
                  createdById: userId || null,
                  note: fullNote,
                },
              });

              usedLotsInfo.push({
                lotNumber: lot.lotNumber,
                wholePacksOpened: lotWholePacksOpened,
                piecesTakenFromOpenPack: lotPiecesTakenFromOpen,
                bonusPiecesGiven: lotBonusPieces,
                remainderLeftInPack: currentOpenRemainder,
                unitCost: lot.unitCost,
              });
            }

            if (piecesNeeded > 0) {
              throw new KitDispenseError(
                `สต็อกของ "${kitItem.item.name}" ไม่เพียงพอระหว่างตัดสต็อก กรุณาลองใหม่อีกครั้ง`,
                409
              );
            }

            totalVal += itemTotalCost;

            summaryList.push({
              itemId: kitItem.itemId,
              name: kitItem.item.name,
              code: kitItem.item.code,
              type: 'CONSUMABLE',
              unit: kitItem.item.unit,
              usageUnit: kitItem.item.usageUnit || kitItem.item.unit,
              ratio,
              isRepackWithPieces,
              qtyPerSet: kitItem.quantity,
              totalQtyRequested: requiredQty,
              piecesTakenFromOpenPack,
              wholePacksOpened,
              bonusPiecesGiven,
              remainderLeftInPack,
              totalCost: itemTotalCost,
              usedLots: usedLotsInfo,
            });
          } else {
            // Equipment
            summaryList.push({
              itemId: kitItem.itemId,
              name: kitItem.item.name,
              code: kitItem.item.code,
              type: 'EQUIPMENT',
              unit: kitItem.item.unit,
              usageUnit: kitItem.item.unit,
              qtyPerSet: kitItem.quantity,
              totalQtyRequested: requiredQty,
              piecesTakenFromOpenPack: 0,
              wholePacksOpened: requiredQty,
              bonusPiecesGiven: 0,
              remainderLeftInPack: 0,
              totalCost: 0,
              usedLots: [],
            });
          }
        }

        return {
          kit: kitRecord,
          prepReference: prepRef,
          dispensedSummary: summaryList,
          totalValueDispensed: totalVal,
        };
      },
      { timeout: 20000 }
    );

    invalidateCache('items:');
    invalidateCache('dashboard:');

    await logActivity({
      userId: userId || null,
      action: 'DISPENSE',
      entityType: 'REQUISITION',
      entityId: kit.id,
      entityTitle: `${prepReference} (${kit.name})`,
      details: `จัดเตรียมชุดฝึกปฏิบัติการ "${kit.name}" จำนวน ${numSets} ชุด มูลค่ารวม ${totalValueDispensed.toFixed(2)} บาท`,
    });

    return NextResponse.json({
      success: true,
      message: `จัดเตรียมชุดฝึก ${kit.name} จำนวน ${numSets} ชุด เรียบร้อยแล้ว`,
      prepReference,
      preparedAt: new Date().toISOString(),
      kit: {
        id: kit.id,
        code: kit.code,
        name: kit.name,
        category: kit.category,
        targetCourse: kit.targetCourse,
      },
      numSets,
      course: course ? { code: course.code, name: course.name } : null,
      instructorName: instructorName || '-',
      roomOrLocation: roomOrLocation || 'ห้องปฏิบัติการพยาบาล',
      note: note || '',
      useOpenPackFirst,
      giveRemainderAsBonus,
      totalValueDispensed,
      items: dispensedSummary,
    });
  } catch (error: any) {
    if (error instanceof KitDispenseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Kit Dispense Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการตัดสต็อกจัดเตรียมชุดฝึก' },
      { status: 500 }
    );
  }
}
