import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { createNotification, notifyAdvisorByName, notifyRoles } from '@/lib/notifications';
import { logActivity } from '@/lib/activity-log';
import { parseBangkokDateTime } from '@/lib/date-time-utils';

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      requestId,
      requestType, // 'BORROW' | 'REQUISITION' | 'UNIFIED'
      lastKnownUpdatedAt,
      userId,
      purpose,
      useTarget = 'SIMULATION',
      courseId,
      advisorName,
      borrowDate,
      expectedReturnDate,
      dateNeeded,
      borrowItems = [],
      requisitionItems = [],
      keepApprovalStatus = true,
      resetToPending = false,
    } = body;

    if (!requestId || !userId) {
      return NextResponse.json({ error: 'ข้อมูลคำขอไม่ครบถ้วน' }, { status: 400 });
    }

    // Determine target record
    let borrowRecord: any = null;
    let requisitionRecord: any = null;

    if (requestType === 'BORROW' || requestType === 'UNIFIED') {
      borrowRecord = await prisma.borrowRequest.findUnique({
        where: { id: requestId },
        include: {
          items: { include: { item: true, asset: true } },
          requisitionRequest: {
            include: { items: { include: { item: true } } },
          },
        },
      });

      if (!borrowRecord && requestType === 'UNIFIED') {
        // Maybe requestId was the requisition ID
        requisitionRecord = await prisma.requisitionRequest.findUnique({
          where: { id: requestId },
          include: {
            items: { include: { item: true } },
            borrowRequest: {
              include: { items: { include: { item: true, asset: true } } },
            },
          },
        });
        if (requisitionRecord?.borrowRequest) {
          borrowRecord = requisitionRecord.borrowRequest;
        }
      } else if (borrowRecord?.requisitionRequest) {
        requisitionRecord = borrowRecord.requisitionRequest;
      }
    } else {
      requisitionRecord = await prisma.requisitionRequest.findUnique({
        where: { id: requestId },
        include: {
          items: { include: { item: true } },
          borrowRequest: {
            include: { items: { include: { item: true, asset: true } } },
          },
        },
      });
      if (requisitionRecord?.borrowRequest) {
        borrowRecord = requisitionRecord.borrowRequest;
      }
    }

    const primaryRecord = borrowRecord || requisitionRecord;
    if (!primaryRecord) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคำขอในระบบ' }, { status: 404 });
    }

    // 1. Check user permission (owner or officer/admin)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    const isAdmin = currentUser?.role === 'ADMIN';
    const isOfficer = currentUser?.role === 'OFFICER';

    const isAuthorized =
      primaryRecord.userId === userId ||
      isOfficer ||
      isAdmin;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'ท่านไม่มีสิทธิ์ในการแก้ไขคำขอนี้' }, { status: 403 });
    }

    // 2. Check if the status allows editing:
    // PENDING can be edited by owner, officer, admin.
    // Non-PENDING (APPROVED, DISPENSED, BORROWED) is STRICTLY ADMIN-ONLY!
    const isAllPending =
      primaryRecord.status === 'PENDING' &&
      (!borrowRecord || borrowRecord.status === 'PENDING') &&
      (!requisitionRecord || requisitionRecord.status === 'PENDING');

    if (!isAllPending && !isAdmin) {
      return NextResponse.json(
        { error: 'เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถแก้ไขคำขอที่ผ่านการอนุมัติหรือจ่ายพัสดุแล้วได้' },
        { status: 403 }
      );
    }

    // 3. Optimistic Concurrency Control (OCC)
    if (lastKnownUpdatedAt) {
      const dbTime = new Date(primaryRecord.updatedAt).getTime();
      const clientTime = new Date(lastKnownUpdatedAt).getTime();
      if (Math.abs(dbTime - clientTime) > 1000) {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentUpdatedAt: primaryRecord.updatedAt,
          },
          { status: 409 }
        );
      }
    }

    // 4. Resolve advisor name
    let finalAdvisorName = advisorName || primaryRecord.advisorName || null;
    if (courseId) {
      const courseInfo = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorName: true },
      });
      if (courseInfo?.instructorName && !advisorName) {
        finalAdvisorName = courseInfo.instructorName;
      }
    }

    // 5. Validate items
    const validBorrowItems = (borrowItems || []).filter((it: any) => it.itemId && Number(it.quantity) > 0);
    const validReqItems = (requisitionItems || []).filter((it: any) => it.itemId && Number(it.quantity) > 0);

    const hasBorrow = Boolean(borrowRecord || validBorrowItems.length > 0);
    const hasReq = Boolean(requisitionRecord || validReqItems.length > 0);

    if (hasBorrow && validBorrowItems.length === 0 && (!hasReq || validReqItems.length === 0)) {
      return NextResponse.json({ error: 'กรุณาระบุรายการครุภัณฑ์หรือวัสดุที่ต้องการขออย่างน้อย 1 รายการ' }, { status: 400 });
    }

    // Pre-calculate Requisition cost if NOT dispensed
    let estimatedReqTotalCost = 0;
    const reqItemsToCreate: any[] = [];

    if (requisitionRecord && requisitionRecord.status !== 'DISPENSED' && validReqItems.length > 0) {
      const reqItemIds = validReqItems.map((it: any) => it.itemId);
      const consumableRecords = await prisma.item.findMany({
        where: { id: { in: reqItemIds } },
        include: {
          stockLots: {
            where: { quantityRemaining: { gt: 0 } },
            orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
      const reqMap = new Map(consumableRecords.map((c) => [c.id, c]));

      for (const it of validReqItems) {
        const itemRecord = reqMap.get(it.itemId);
        if (!itemRecord) continue;
        const isSub = it.isSubUnit === true;
        const qty = Number(it.quantity) || 1;
        const ratio = Number(itemRecord.conversionRatio) > 0 ? Number(itemRecord.conversionRatio) : 1;
        const latestLot = itemRecord.stockLots[0];
        const wholeUnitCost = latestLot?.unitCost || 0;

        if (isSub) {
          const subUnitName = it.requestedUnit || itemRecord.usageUnit || 'ชิ้น';
          const subUnitCost = ratio > 0 ? wholeUnitCost / ratio : wholeUnitCost;
          const itemTotal = qty * subUnitCost;
          estimatedReqTotalCost += itemTotal;
          reqItemsToCreate.push({
            itemId: it.itemId,
            quantityRequested: qty,
            requestedUnit: subUnitName,
            isSubUnit: true,
            unitCost: subUnitCost,
            totalCost: itemTotal,
          });
        } else {
          const itemTotal = qty * wholeUnitCost;
          estimatedReqTotalCost += itemTotal;
          reqItemsToCreate.push({
            itemId: it.itemId,
            quantityRequested: qty,
            requestedUnit: it.requestedUnit || itemRecord.unit,
            isSubUnit: false,
            unitCost: wholeUnitCost,
            totalCost: itemTotal,
          });
        }
      }
    }

    // 6. Execute atomic transaction to update requests
    const result = await prisma.$transaction(
      async (tx) => {
        let updatedBorrow: any = null;
        let updatedRequisition: any = null;

        // =====================================================================
        // A. Handle Requisition Request
        // =====================================================================
        if (requisitionRecord) {
          if (requisitionRecord.status === 'DISPENSED') {
            // -----------------------------------------------------------------
            // Case A.1: DISPENSED (Two-Way Delta Stock Sync) - ADMIN ONLY
            // -----------------------------------------------------------------
            const currentItems = await tx.requisitionItem.findMany({
              where: { requisitionRequestId: requisitionRecord.id },
              include: { item: true },
            });

            // 1. Process items in validReqItems
            for (const nItem of validReqItems) {
              const itemRecord = await tx.item.findUnique({
                where: { id: nItem.itemId },
                include: {
                  stockLots: {
                    where: {
                      OR: [
                        { quantityRemaining: { gt: 0 } },
                        { openPackRemainder: { gt: 0 } },
                      ],
                    },
                    orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }, { createdAt: 'asc' }],
                  },
                },
              });
              if (!itemRecord) continue;

              const isSub = Boolean(nItem.isSubUnit);
              const ratio = Number(itemRecord.conversionRatio) > 0 ? Number(itemRecord.conversionRatio) : 1;
              const subUnitName = nItem.requestedUnit || itemRecord.usageUnit || itemRecord.unit || 'ชิ้น';
              const wholeUnitName = nItem.requestedUnit || itemRecord.unit || 'กล่อง';
              const unitName = isSub ? subUnitName : wholeUnitName;

              const existingReqItem = currentItems.find(
                (it) => it.itemId === nItem.itemId && Boolean(it.isSubUnit) === isSub
              );

              const newQty = Number(nItem.quantity) || 1;
              const oldQty = existingReqItem
                ? (existingReqItem.quantityDispensed || existingReqItem.quantityRequested || 0)
                : 0;
              const delta = newQty - oldQty;

              if (delta > 0) {
                // Deduct delta FIFO
                let piecesNeeded = isSub ? delta : delta * ratio;
                let addedCost = 0;

                // Step 1: if isSub, check open pack remainder first
                if (isSub) {
                  for (const lot of itemRecord.stockLots) {
                    if (piecesNeeded <= 0) break;
                    const currentOpen = lot.openPackRemainder || 0;
                    if (currentOpen <= 0) continue;

                    const takeFromOpen = Math.min(currentOpen, piecesNeeded);
                    const newOpen = currentOpen - takeFromOpen;
                    const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
                    const pieceCost = lot.unitCost / lotPackSize;
                    const costForLoose = takeFromOpen * pieceCost;
                    const newPieces = Math.max(0, (lot.quantityRemaining * lotPackSize) + newOpen);

                    lot.openPackRemainder = newOpen;
                    lot.piecesRemaining = newPieces;

                    await tx.stockLot.update({
                      where: { id: lot.id },
                      data: { openPackRemainder: newOpen, piecesRemaining: newPieces },
                    });

                    await tx.stockTransaction.create({
                      data: {
                        itemId: nItem.itemId,
                        lotId: lot.id,
                        type: 'OUT_REQUISITION',
                        quantity: 0,
                        unitCost: lot.unitCost,
                        totalCost: costForLoose,
                        courseId: courseId || requisitionRecord.courseId,
                        referenceNumber: requisitionRecord.requestNumber,
                        createdById: userId,
                        note: `แอดมินปรับเพิ่ม ${takeFromOpen} ${unitName} (เศษแพ็ค) ตามคำขอ ${requisitionRecord.requestNumber}`,
                      },
                    });

                    addedCost += costForLoose;
                    piecesNeeded -= takeFromOpen;
                  }
                }

                // Step 2: Whole packs
                if (piecesNeeded > 0) {
                  for (const lot of itemRecord.stockLots) {
                    if (piecesNeeded <= 0) break;
                    if (lot.quantityRemaining <= 0) continue;

                    const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
                    if (isSub) {
                      const packsToOpen = Math.min(lot.quantityRemaining, Math.ceil(piecesNeeded / lotPackSize));
                      const piecesProvided = packsToOpen * lotPackSize;
                      const piecesToDeduct = Math.min(piecesProvided, piecesNeeded);
                      const leftoverPieces = piecesProvided - piecesToDeduct;

                      const newQtyRem = lot.quantityRemaining - packsToOpen;
                      const currentOpen = lot.openPackRemainder || 0;
                      const newOpen = currentOpen + leftoverPieces;
                      const newPieces = Math.max(0, (newQtyRem * lotPackSize) + newOpen);
                      const costForDeducted = (piecesToDeduct / lotPackSize) * lot.unitCost;

                      await tx.stockLot.update({
                        where: { id: lot.id },
                        data: {
                          quantityRemaining: newQtyRem,
                          openPackRemainder: newOpen,
                          piecesRemaining: newPieces,
                        },
                      });

                      await tx.stockTransaction.create({
                        data: {
                          itemId: nItem.itemId,
                          lotId: lot.id,
                          type: 'OUT_REQUISITION',
                          quantity: -packsToOpen,
                          unitCost: lot.unitCost,
                          totalCost: costForDeducted,
                          courseId: courseId || requisitionRecord.courseId,
                          referenceNumber: requisitionRecord.requestNumber,
                          createdById: userId,
                          note: `แอดมินปรับเพิ่ม ${piecesToDeduct} ${unitName} ตามคำขอ ${requisitionRecord.requestNumber}`,
                        },
                      });

                      addedCost += costForDeducted;
                      piecesNeeded -= piecesToDeduct;
                    } else {
                      const packsNeeded = Math.ceil(piecesNeeded / lotPackSize);
                      const deductPacks = Math.min(lot.quantityRemaining, packsNeeded);
                      const costForPacks = deductPacks * lot.unitCost;
                      const newQtyRem = lot.quantityRemaining - deductPacks;
                      const openRem = lot.openPackRemainder || 0;
                      const newPieces = Math.max(0, (newQtyRem * lotPackSize) + openRem);

                      await tx.stockLot.update({
                        where: { id: lot.id },
                        data: {
                          quantityRemaining: newQtyRem,
                          piecesRemaining: newPieces,
                        },
                      });

                      await tx.stockTransaction.create({
                        data: {
                          itemId: nItem.itemId,
                          lotId: lot.id,
                          type: 'OUT_REQUISITION',
                          quantity: -deductPacks,
                          unitCost: lot.unitCost,
                          totalCost: costForPacks,
                          courseId: courseId || requisitionRecord.courseId,
                          referenceNumber: requisitionRecord.requestNumber,
                          createdById: userId,
                          note: `แอดมินปรับเพิ่ม ${deductPacks} ${unitName} ตามคำขอ ${requisitionRecord.requestNumber}`,
                        },
                      });

                      addedCost += costForPacks;
                      piecesNeeded -= deductPacks * lotPackSize;
                    }
                  }
                }

                if (existingReqItem) {
                  const newTotalCost = existingReqItem.totalCost + addedCost;
                  await tx.requisitionItem.update({
                    where: { id: existingReqItem.id },
                    data: {
                      quantityRequested: newQty,
                      quantityDispensed: newQty,
                      unitCost: newQty > 0 ? newTotalCost / newQty : existingReqItem.unitCost,
                      totalCost: newTotalCost,
                    },
                  });
                } else {
                  await tx.requisitionItem.create({
                    data: {
                      requisitionRequestId: requisitionRecord.id,
                      itemId: nItem.itemId,
                      quantityRequested: newQty,
                      quantityDispensed: newQty,
                      requestedUnit: unitName,
                      isSubUnit: isSub,
                      unitCost: newQty > 0 ? addedCost / newQty : 0,
                      totalCost: addedCost,
                    },
                  });
                }
              } else if (delta < 0) {
                // Reduced quantity: Return Math.abs(delta) to stock lot
                const returnQty = Math.abs(delta);
                const targetLot: any = await tx.stockLot.findFirst({
                  where: { itemId: nItem.itemId },
                  orderBy: [{ expiryDate: 'desc' }, { receivedDate: 'desc' }],
                });

                if (targetLot) {
                  const pSize = Number(targetLot.packSize) > 0 ? Number(targetLot.packSize) : ratio;
                  if (isSub && pSize > 1) {
                    const currentOpen = targetLot.openPackRemainder || 0;
                    const newOpen = currentOpen + returnQty;
                    const consolidated = Math.floor(newOpen / pSize);
                    const remainder = newOpen % pSize;
                    const newQtyRem = targetLot.quantityRemaining + consolidated;
                    const newPieces = (targetLot.piecesRemaining || 0) + returnQty;

                    await tx.stockLot.update({
                      where: { id: targetLot.id },
                      data: {
                        quantityRemaining: newQtyRem,
                        piecesRemaining: newPieces,
                        openPackRemainder: remainder,
                      },
                    });
                  } else {
                    const newQtyRem = targetLot.quantityRemaining + returnQty;
                    const newPieces = (targetLot.piecesRemaining || 0) + (returnQty * pSize);

                    await tx.stockLot.update({
                      where: { id: targetLot.id },
                      data: {
                        quantityRemaining: newQtyRem,
                        piecesRemaining: newPieces,
                      },
                    });
                  }

                  const costReduction = existingReqItem
                    ? (existingReqItem.unitCost * returnQty)
                    : (targetLot.unitCost * returnQty);

                  await tx.stockTransaction.create({
                    data: {
                      itemId: nItem.itemId,
                      lotId: targetLot.id,
                      type: 'RETURN_RESTOCK',
                      quantity: returnQty,
                      unitCost: existingReqItem?.unitCost || targetLot.unitCost,
                      totalCost: costReduction,
                      courseId: courseId || requisitionRecord.courseId,
                      referenceNumber: requisitionRecord.requestNumber,
                      createdById: userId,
                      note: `แอดมินปรับลด ${returnQty} ${unitName} ตามคำขอ ${requisitionRecord.requestNumber}`,
                    },
                  });

                  if (existingReqItem) {
                    const newTotalCost = Math.max(0, existingReqItem.totalCost - costReduction);
                    await tx.requisitionItem.update({
                      where: { id: existingReqItem.id },
                      data: {
                        quantityRequested: newQty,
                        quantityDispensed: newQty,
                        totalCost: newTotalCost,
                      },
                    });
                  }
                }
              }
            }

            // 2. Check for removed/deleted items
            for (const oldIt of currentItems) {
              const stillExists = validReqItems.some(
                (n: any) => n.itemId === oldIt.itemId && Boolean(n.isSubUnit) === Boolean(oldIt.isSubUnit)
              );
              if (!stillExists) {
                const returnQty = oldIt.quantityDispensed || oldIt.quantityRequested || 0;
                if (returnQty > 0) {
                  const targetLot: any = await tx.stockLot.findFirst({
                    where: { itemId: oldIt.itemId },
                    orderBy: [{ expiryDate: 'desc' }, { receivedDate: 'desc' }],
                  });
                  if (targetLot) {
                    const itemRatio = Number(oldIt.item?.conversionRatio) > 0 ? Number(oldIt.item?.conversionRatio) : 1;
                    const pSize = Number(targetLot.packSize) > 0 ? Number(targetLot.packSize) : itemRatio;
                    if (oldIt.isSubUnit && pSize > 1) {
                      const currentOpen = targetLot.openPackRemainder || 0;
                      const newOpen = currentOpen + returnQty;
                      const consolidated = Math.floor(newOpen / pSize);
                      const remainder = newOpen % pSize;
                      await tx.stockLot.update({
                        where: { id: targetLot.id },
                        data: {
                          quantityRemaining: targetLot.quantityRemaining + consolidated,
                          piecesRemaining: (targetLot.piecesRemaining || 0) + returnQty,
                          openPackRemainder: remainder,
                        },
                      });
                    } else {
                      await tx.stockLot.update({
                        where: { id: targetLot.id },
                        data: {
                          quantityRemaining: targetLot.quantityRemaining + returnQty,
                          piecesRemaining: (targetLot.piecesRemaining || 0) + (returnQty * pSize),
                        },
                      });
                    }

                    await tx.stockTransaction.create({
                      data: {
                        itemId: oldIt.itemId,
                        lotId: targetLot.id,
                        type: 'RETURN_RESTOCK',
                        quantity: returnQty,
                        unitCost: oldIt.unitCost,
                        totalCost: oldIt.totalCost,
                        courseId: courseId || requisitionRecord.courseId,
                        referenceNumber: requisitionRecord.requestNumber,
                        createdById: userId,
                        note: `แอดมินลบรายการ ${oldIt.item?.name || ''} (${returnQty} ${oldIt.requestedUnit}) ออกจากคำขอ ${requisitionRecord.requestNumber}`,
                      },
                    });
                  }
                }
                await tx.requisitionItem.delete({ where: { id: oldIt.id } });
              }
            }

            // 3. Recalculate total cost from remaining items
            const finalItems = await tx.requisitionItem.findMany({
              where: { requisitionRequestId: requisitionRecord.id },
            });
            const newTotalCost = finalItems.reduce((sum, it) => sum + (it.totalCost || 0), 0);

            // 4. Update RequisitionRequest
            updatedRequisition = await tx.requisitionRequest.update({
              where: { id: requisitionRecord.id },
              data: {
                courseId: courseId || null,
                advisorName: finalAdvisorName,
                purpose: purpose || requisitionRecord.purpose,
                useTarget,
                dateNeeded: dateNeeded ? parseBangkokDateTime(dateNeeded) : requisitionRecord.dateNeeded,
                totalCost: newTotalCost,
              },
              include: {
                items: { include: { item: true } },
                course: true,
                user: true,
              },
            });

            // 5. If course changed, update StockTransaction courseId
            if (courseId && courseId !== requisitionRecord.courseId) {
              await tx.stockTransaction.updateMany({
                where: { referenceNumber: requisitionRecord.requestNumber },
                data: { courseId: courseId },
              });
            }
          } else {
            // -----------------------------------------------------------------
            // Case A.2: PENDING or APPROVED Requisition
            // -----------------------------------------------------------------
            await tx.requisitionItem.deleteMany({
              where: { requisitionRequestId: requisitionRecord.id },
            });

            const shouldKeepApproved =
              isAdmin &&
              requisitionRecord.status === 'APPROVED' &&
              keepApprovalStatus &&
              !resetToPending;

            updatedRequisition = await tx.requisitionRequest.update({
              where: { id: requisitionRecord.id },
              data: {
                courseId: courseId || null,
                advisorName: finalAdvisorName,
                purpose: purpose || requisitionRecord.purpose,
                useTarget,
                dateNeeded: dateNeeded ? parseBangkokDateTime(dateNeeded) : requisitionRecord.dateNeeded,
                status: shouldKeepApproved ? 'APPROVED' : 'PENDING',
                approverId: shouldKeepApproved ? requisitionRecord.approverId : null,
                approvedAt: shouldKeepApproved ? requisitionRecord.approvedAt : null,
                instructorAcknowledged: shouldKeepApproved ? requisitionRecord.instructorAcknowledged : false,
                acknowledgedAt: shouldKeepApproved ? requisitionRecord.acknowledgedAt : null,
                totalCost: estimatedReqTotalCost,
                items: {
                  create: reqItemsToCreate,
                },
              },
              include: {
                items: { include: { item: true } },
                course: true,
                user: true,
              },
            });
          }
        }

        // =====================================================================
        // B. Handle Borrow Request
        // =====================================================================
        if (borrowRecord) {
          if (borrowRecord.status === 'BORROWED') {
            // -----------------------------------------------------------------
            // Case B.1: BORROWED (Active Loan) - ADMIN ONLY
            // -----------------------------------------------------------------
            // Update items: delete and re-create, releasing removed assets back to AVAILABLE
            const oldBorrowItems = await tx.borrowItem.findMany({
              where: { borrowRequestId: borrowRecord.id },
            });

            for (const oldB of oldBorrowItems) {
              const stillNeeded = validBorrowItems.find((n: any) => n.itemId === oldB.itemId);
              if (!stillNeeded || Number(stillNeeded.quantity) < oldB.quantity) {
                // If specific asset was allocated to this item, release it if needed
                if (oldB.assetId && !stillNeeded) {
                  await tx.equipmentAsset.update({
                    where: { id: oldB.assetId },
                    data: { status: 'AVAILABLE' },
                  }).catch(() => {});
                }
              }
            }

            await tx.borrowItem.deleteMany({
              where: { borrowRequestId: borrowRecord.id },
            });

            updatedBorrow = await tx.borrowRequest.update({
              where: { id: borrowRecord.id },
              data: {
                courseId: courseId || null,
                advisorName: finalAdvisorName,
                purpose: purpose || borrowRecord.purpose,
                useTarget,
                borrowDate: borrowDate ? parseBangkokDateTime(borrowDate) : borrowRecord.borrowDate,
                expectedReturnDate: expectedReturnDate ? parseBangkokDateTime(expectedReturnDate) : borrowRecord.expectedReturnDate,
                items: {
                  create: validBorrowItems.map((it: any) => ({
                    itemId: it.itemId,
                    quantity: Number(it.quantity) || 1,
                  })),
                },
              },
              include: {
                items: { include: { item: true, asset: true } },
                course: true,
                user: true,
              },
            });
          } else {
            // -----------------------------------------------------------------
            // Case B.2: PENDING or APPROVED Borrow Request
            // -----------------------------------------------------------------
            await tx.borrowItem.deleteMany({
              where: { borrowRequestId: borrowRecord.id },
            });

            const shouldKeepApproved =
              isAdmin &&
              borrowRecord.status === 'APPROVED' &&
              keepApprovalStatus &&
              !resetToPending;

            updatedBorrow = await tx.borrowRequest.update({
              where: { id: borrowRecord.id },
              data: {
                courseId: courseId || null,
                advisorName: finalAdvisorName,
                purpose: purpose || borrowRecord.purpose,
                useTarget,
                borrowDate: borrowDate ? parseBangkokDateTime(borrowDate) : borrowRecord.borrowDate,
                expectedReturnDate: expectedReturnDate ? parseBangkokDateTime(expectedReturnDate) : borrowRecord.expectedReturnDate,
                status: shouldKeepApproved ? 'APPROVED' : 'PENDING',
                approverId: shouldKeepApproved ? borrowRecord.approverId : null,
                approvedAt: shouldKeepApproved ? borrowRecord.approvedAt : null,
                instructorAcknowledged: shouldKeepApproved ? borrowRecord.instructorAcknowledged : false,
                acknowledgedAt: shouldKeepApproved ? borrowRecord.acknowledgedAt : null,
                items: {
                  create: validBorrowItems.map((it: any) => ({
                    itemId: it.itemId,
                    quantity: Number(it.quantity) || 1,
                  })),
                },
              },
              include: {
                items: { include: { item: true, asset: true } },
                course: true,
                user: true,
              },
            });
          }
        }

        return { updatedBorrow, updatedRequisition };
      },
      {
        maxWait: 20000,
        timeout: 45000,
      }
    );

    // 7. Invalidate caches
    invalidateCache('borrow:');
    invalidateCache('requisitions:');
    invalidateCache('items:');
    invalidateCache('dashboard:');

    // 8. Notifications
    const reqNum = borrowRecord?.requestNumber || requisitionRecord?.requestNumber || '';
    const studentUserId = primaryRecord.userId;
    const isReset = isAllPending || resetToPending;

    // Notify student
    createNotification({
      userId: studentUserId,
      title: isReset ? 'แก้ไขคำขอสำเร็จ' : 'ผู้ดูแลระบบปรับปรุงข้อมูลคำขอ 📋',
      message: isReset
        ? `คำขอเลขที่ ${reqNum} ได้รับการแก้ไขและปรับสถานะเป็น "รออนุมัติ" เรียบร้อยแล้ว`
        : `คำขอเลขที่ ${reqNum} ได้รับการปรับปรุงข้อมูลโดยผู้ดูแลระบบแล้ว`,
      type: 'STATUS_UPDATE',
      priority: 'NORMAL',
      linkUrl: borrowRecord ? '/borrow' : '/requisitions',
      entityType: borrowRecord ? 'BORROW' : 'REQUISITION',
      entityId: primaryRecord.id,
    }).catch(() => {});

    // Notify Approver / Officer / Admin roles if reset to pending
    if (isReset) {
      notifyRoles(
        ['OFFICER', 'ADMIN', 'APPROVER'],
        {
          title: 'คำขอพัสดุมีการแก้ไขข้อมูล 📋',
          message: `คำขอเลขที่ ${reqNum} ได้รับการแก้ไขข้อมูลและปรับสถานะเป็น "รออนุมัติ" เพื่อตรวจสอบ`,
          type: 'APPROVAL',
          linkUrl: '/approvals',
          entityType: borrowRecord ? 'BORROW' : 'REQUISITION',
          entityId: primaryRecord.id,
          priority: 'HIGH',
        },
        borrowRecord ? 'BORROW' : 'REQUISITION'
      ).catch(() => {});

      if (finalAdvisorName) {
        notifyAdvisorByName(finalAdvisorName, {
          title: 'คำขอพัสดุมีการแก้ไขข้อมูล 👩‍🏫',
          message: `คำขอเลขที่ ${reqNum} ของนิสิตได้รับการแก้ไขข้อมูล ระบบได้ปรับสถานะเป็น "รออนุมัติ" เพื่อให้อาจารย์ตรวจสอบข้อมูลล่าสุด`,
          type: 'REQUEST_SUBMITTED',
          priority: 'HIGH',
          linkUrl: '/approvals',
          entityType: borrowRecord ? 'BORROW' : 'REQUISITION',
          entityId: primaryRecord.id,
        }).catch(() => {});
      }
    }

    await logActivity({
      userId,
      action: 'UPDATE',
      entityType: borrowRecord ? 'BORROW' : 'REQUISITION',
      entityId: primaryRecord.id,
      entityTitle: reqNum,
      details: isReset
        ? `แก้ไขข้อมูลคำขอเลขที่ ${reqNum} และปรับสถานะเป็นรออนุมัติ`
        : `ผู้ดูแลระบบแก้ไขข้อมูลคำขอเลขที่ ${reqNum} (สถานะ: ${primaryRecord.status})`,
    });

    return NextResponse.json({
      success: true,
      message: isReset
        ? 'บันทึกการแก้ไขคำขอสำเร็จ สถานะถูกปรับเป็นรออนุมัติเพื่อให้อาจารย์ตรวจสอบอีกครั้ง'
        : 'บันทึกการแก้ไขคำขอโดยผู้ดูแลระบบสำเร็จ เรียบร้อยแล้ว',
      data: result,
    });
  } catch (error: any) {
    console.error('Error in request edit:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการแก้ไขคำขอ' }, { status: 500 });
  }
}
