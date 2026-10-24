import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { formatUserName, formatAcknowledgeDisplay } from '@/lib/user-utils';
import { createNotification, notifyRoles } from '@/lib/notifications';
import { canUserApprove } from '@/lib/approval-scope';
import { logActivity } from '@/lib/activity-log';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      action,
      userId,
      reason,
      assignedAssets,
      returnCondition,
      returnNote,
      checkoutNote,
      borrowItemAdjustments,
      requisitionItemAdjustments,
    } = body;

    const borrow = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { items: true, user: true },
    });

    if (!borrow) {
      return NextResponse.json({ error: 'ไม่พบคำขอยืม' }, { status: 404 });
    }

    // Optimistic Concurrency Control (OCC) Check
    if (body.lastKnownUpdatedAt) {
      const dbTime = new Date(borrow.updatedAt).getTime();
      const clientTime = new Date(body.lastKnownUpdatedAt).getTime();
      if (Math.abs(dbTime - clientTime) > 1000) {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentUpdatedAt: borrow.updatedAt,
          },
          { status: 409 }
        );
      }
    }

    const respondUpdated = (data: any) => {
      invalidateCache('borrow:');
      invalidateCache('requisitions:');
      invalidateCache('items:');
      invalidateCache('dashboard:');
      return NextResponse.json(data);
    };

    if (action === 'ACKNOWLEDGE') {
      // Process linked requisition surplus returns if provided
      const { requisitionReturns } = body;
      if (requisitionReturns && Array.isArray(requisitionReturns) && requisitionReturns.length > 0 && borrow.requisitionRequestId) {
        try {
          const linkedReq = await prisma.requisitionRequest.findUnique({
            where: { id: borrow.requisitionRequestId },
            include: {
              items: {
                include: {
                  item: {
                    include: {
                      stockLots: {
                        where: { quantityRemaining: { gte: 0 } },
                        orderBy: [{ expiryDate: 'desc' }, { receivedDate: 'desc' }],
                      },
                    },
                  },
                },
              },
            },
          });

          if (linkedReq && linkedReq.status === 'DISPENSED') {
            for (const rRet of requisitionReturns) {
              const reqItem = linkedReq.items.find((i) => i.id === rRet.requisitionItemId || i.id === rRet.id);
              if (!reqItem) continue;

              const retQty = Math.max(0, Number(rRet.quantity) || 0);
              if (retQty <= 0) continue;

              const maxCanReturn = Math.max(0, reqItem.quantityDispensed - (reqItem.quantityReturned || 0));
              const actualRet = Math.min(retQty, maxCanReturn);
              if (actualRet <= 0) continue;

              const condition = rRet.condition || 'SEALED_INTACT';
              const rNote = rRet.note ? String(rRet.note).trim() : '';
              const itemRatio = Number(reqItem.item.conversionRatio) > 0 ? Number(reqItem.item.conversionRatio) : 1;
              const isSub = reqItem.isSubUnit === true || rRet.isSubUnit === true;

              let lineDeduct = 0;
              if (isSub && itemRatio > 1) {
                lineDeduct = actualRet * (reqItem.unitCost / itemRatio);
              } else {
                lineDeduct = actualRet * reqItem.unitCost;
              }

              const newQtyReturned = (reqItem.quantityReturned || 0) + actualRet;
              const remainingDisp = Math.max(0, reqItem.quantityDispensed - newQtyReturned);
              const newLineTotal = isSub && itemRatio > 1 ? remainingDisp * (reqItem.unitCost / itemRatio) : remainingDisp * reqItem.unitCost;

              await prisma.requisitionItem.update({
                where: { id: reqItem.id },
                data: {
                  quantityReturned: newQtyReturned,
                  returnCondition: condition,
                  returnedAt: new Date(),
                  returnNote: rNote ? (reqItem.returnNote ? `${reqItem.returnNote} | ${rNote}` : rNote) : reqItem.returnNote,
                  totalCost: newLineTotal,
                },
              });

              if (condition === 'SEALED_INTACT' || condition === 'UNSEALED_USABLE_SIM') {
                const targetLot = reqItem.item.stockLots?.[0];
                if (targetLot) {
                  const pSize = Number(targetLot.packSize) > 0 ? Number(targetLot.packSize) : itemRatio;
                  let addedPacks = 0;

                  if (isSub && pSize > 1) {
                    const currentOpen = targetLot.openPackRemainder || 0;
                    const newOpen = currentOpen + actualRet;
                    addedPacks = Math.floor(newOpen / pSize);
                    const remainder = newOpen % pSize;

                    await prisma.stockLot.update({
                      where: { id: targetLot.id },
                      data: {
                        quantityRemaining: targetLot.quantityRemaining + addedPacks,
                        piecesRemaining: (targetLot.piecesRemaining || 0) + actualRet,
                        openPackRemainder: remainder,
                      },
                    });
                  } else {
                    addedPacks = actualRet;
                    await prisma.stockLot.update({
                      where: { id: targetLot.id },
                      data: {
                        quantityRemaining: targetLot.quantityRemaining + actualRet,
                        piecesRemaining: (targetLot.piecesRemaining || 0) + (actualRet * pSize),
                      },
                    });
                  }



                  await prisma.stockTransaction.create({
                    data: {
                      itemId: reqItem.itemId,
                      lotId: targetLot.id,
                      type: 'RETURN_RESTOCK',
                      quantity: actualRet,
                      unitCost: isSub && itemRatio > 1 ? reqItem.unitCost / itemRatio : reqItem.unitCost,
                      totalCost: lineDeduct,
                      courseId: linkedReq.courseId,
                      referenceNumber: linkedReq.requestNumber,
                      createdById: userId || borrow.userId,
                      note: `รับคืนวัสดุเหลือใช้พร้อมอุปกรณ์ตามคำขอยืม ${borrow.requestNumber} [${reqItem.item.name} x ${actualRet}]${rNote ? ` - ${rNote}` : ''}`,
                    },
                  });
                }
              }
            }

            const allReqItems = await prisma.requisitionItem.findMany({
              where: { requisitionRequestId: linkedReq.id },
            });
            const newReqCost = allReqItems.reduce((acc, it) => acc + (it.totalCost || 0), 0);
            await prisma.requisitionRequest.update({
              where: { id: linkedReq.id },
              data: { totalCost: newReqCost },
            });
          }
        } catch (e) {
          console.error('Failed to process requisition returns in borrow return:', e);
        }
      }

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          instructorAcknowledged: true,
          acknowledgedAt: new Date(),
          advisorName: body.advisorName || borrow.advisorName,
        },
      });

      // Synchronize with linked requisition request if unified
      if (borrow.requisitionRequestId) {
        await prisma.requisitionRequest.update({
          where: { id: borrow.requisitionRequestId },
          data: {
            instructorAcknowledged: true,
            acknowledgedAt: new Date(),
            advisorName: body.advisorName || borrow.advisorName,
          },
        }).catch((e) => console.error('Failed to sync linked requisition acknowledge:', e));
      }

      // Notify student with proper role transparency (Teacher vs Admin/Staff)
      const ackDisplay = formatAcknowledgeDisplay(body.advisorName || borrow.advisorName);
      const notifTitle = ackDisplay.isStaff ? 'แอดมิน/เจ้าหน้าที่รับทราบคำขอยืมแล้ว' : 'อาจารย์รับทราบคำขอยืมแล้ว';
      const notifMessage = `${ackDisplay.name} ได้กดรับทราบคำขอยืมเลขที่ ${borrow.requestNumber} แล้ว`;

      createNotification({
        userId: borrow.userId,
        title: notifTitle,
        message: notifMessage,
        type: 'INSTRUCTOR_ACK',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      return respondUpdated(updated);
    }

    if (action === 'APPROVE') {
      if (userId) {
        const approverUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, approvalScopes: true },
        });
        if (approverUser && !canUserApprove(approverUser, 'BORROW')) {
          return NextResponse.json(
            { error: 'ท่านไม่มีสิทธิ์อนุมัติรายการยืมครุภัณฑ์ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
            { status: 403 }
          );
        }
      }

      if (borrow.status !== 'PENDING') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentStatus: borrow.status,
          },
          { status: 409 }
        );
      }

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: userId,
          approvedAt: new Date(),
        },
      });

      // Synchronize with linked requisition request if unified
      if (borrow.requisitionRequestId) {
        await prisma.requisitionRequest.update({
          where: { id: borrow.requisitionRequestId },
          data: {
            status: 'APPROVED',
            approverId: userId,
            approvedAt: new Date(),
          },
        }).catch((e) => console.error('Failed to sync linked requisition approve:', e));
      }

      logActivity({
        userId,
        action: 'APPROVE',
        entityType: 'BORROW',
        entityId: borrow.id,
        entityTitle: borrow.requestNumber,
        details: `อนุมัติคำขอยืมครุภัณฑ์เลขที่ ${borrow.requestNumber}`,
      });

      // Notify student
      createNotification({
        userId: borrow.userId,
        title: 'คำขอยืมได้รับการอนุมัติแล้ว 🎉',
        message: `คำขอยืมเลขที่ ${borrow.requestNumber} ได้รับการอนุมัติแล้ว กรุณาติดต่อรับอุปกรณ์ที่ห้องแล็บ`,
        type: 'APPROVAL',
        priority: 'HIGH',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      // Notify OFFICER & ADMIN about approved borrow request ready for pickup
      const borrowDateText = borrow.borrowDate
        ? new Date(borrow.borrowDate).toLocaleDateString('th-TH')
        : 'ตามกำหนดการ';
      notifyRoles(['OFFICER', 'ADMIN'], {
        title: '📦 มีรายการยืมอนุมัติแล้ว รอนัดรับ/จ่ายของ',
        message: `คำขอยืมเลขที่ ${borrow.requestNumber} ได้รับการอนุมัติแล้ว มีกำหนดนัดรับ: ${borrowDateText}`,
        type: 'STATUS_UPDATE',
        priority: 'HIGH',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      return respondUpdated(updated);
    }

    if (action === 'REJECT') {
      if (userId) {
        const approverUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, approvalScopes: true },
        });
        if (approverUser && !canUserApprove(approverUser, 'BORROW')) {
          return NextResponse.json(
            { error: 'ท่านไม่มีสิทธิ์ปฏิเสธรายการยืมครุภัณฑ์ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
            { status: 403 }
          );
        }
      }

      if (borrow.status !== 'PENDING') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentStatus: borrow.status,
          },
          { status: 409 }
        );
      }

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: userId,
          rejectionReason: reason || 'ไม่อนุมัติ',
        },
      });

      // Synchronize with linked requisition request if unified
      if (borrow.requisitionRequestId) {
        await prisma.requisitionRequest.update({
          where: { id: borrow.requisitionRequestId },
          data: {
            status: 'REJECTED',
            approverId: userId,
            rejectionReason: reason || 'ไม่อนุมัติ',
          },
        }).catch((e) => console.error('Failed to sync linked requisition reject:', e));
      }

      logActivity({
        userId,
        action: 'REJECT',
        entityType: 'BORROW',
        entityId: borrow.id,
        entityTitle: borrow.requestNumber,
        details: `ปฏิเสธคำขอยืมครุภัณฑ์เลขที่ ${borrow.requestNumber} (เหตุผล: ${reason || 'ไม่อนุมัติ'})`,
      });

      // Notify student
      createNotification({
        userId: borrow.userId,
        title: 'คำขอยืมไม่ได้รับการอนุมัติ',
        message: `คำขอยืมเลขที่ ${borrow.requestNumber} ไม่ได้รับการอนุมัติ: ${reason || 'ไม่อนุมัติ'}`,
        type: 'REJECTION',
        priority: 'HIGH',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      return respondUpdated(updated);
    }
    if (action === 'UPDATE_DATES') {
      const { borrowDate, expectedReturnDate } = body;
      const dataToUpdate: any = {};
      if (borrowDate) dataToUpdate.borrowDate = new Date(borrowDate);
      if (expectedReturnDate) dataToUpdate.expectedReturnDate = new Date(expectedReturnDate);

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: dataToUpdate,
      });
      return respondUpdated(updated);
    }

    if (action === 'CHECKOUT') {
      if (borrow.status === 'BORROWED' || borrow.status === 'RETURNED_COMPLETE' || borrow.status === 'RETURNED_WITH_ISSUE') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ คำขอยืมนี้ได้รับการส่งมอบครุภัณฑ์ไปแล้ว',
            currentStatus: borrow.status,
          },
          { status: 409 }
        );
      }
      if (borrow.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'สามารถส่งมอบครุภัณฑ์ได้เฉพาะคำขอที่ได้รับการอนุมัติแล้วเท่านั้น' },
          { status: 400 }
        );
      }

      // 1. Process equipment items with officer adjustments
      for (const bItem of borrow.items) {
        const adj = Array.isArray(borrowItemAdjustments)
          ? borrowItemAdjustments.find((a: any) => a.id === bItem.id)
          : null;

        const isAllowed = adj ? adj.allowed !== false : true;
        const newQty = adj && Number(adj.quantity) > 0 ? Number(adj.quantity) : bItem.quantity;

        if (!isAllowed) {
          // Officer disallowed this equipment item
          await prisma.borrowItem.update({
            where: { id: bItem.id },
            data: {
              quantity: 0,
              returnCondition: 'DISALLOWED',
              isReturned: true,
            },
          });
          continue;
        }

        // Update quantity if adjusted
        if (newQty !== bItem.quantity) {
          await prisma.borrowItem.update({
            where: { id: bItem.id },
            data: { quantity: newQty },
          });
        }

        // Explicit asset assignment or auto-assign available asset
        const explicitAssign =
          assignedAssets?.find((a: any) => a.borrowItemId === bItem.id) ||
          (adj?.assetId ? { assetId: adj.assetId } : null);
        if (explicitAssign?.assetId) {
          await prisma.borrowItem.update({
            where: { id: bItem.id },
            data: { assetId: explicitAssign.assetId },
          });
          await prisma.equipmentAsset.update({
            where: { id: explicitAssign.assetId },
            data: { status: 'BORROWED' },
          });
        } else if (!bItem.assetId) {
          const availableAsset = await prisma.equipmentAsset.findFirst({
            where: { itemId: bItem.itemId, status: 'AVAILABLE' },
          });
          if (availableAsset) {
            await prisma.borrowItem.update({
              where: { id: bItem.id },
              data: { assetId: availableAsset.id },
            });
            await prisma.equipmentAsset.update({
              where: { id: availableAsset.id },
              data: { status: 'BORROWED' },
            });
          }
        }
      }

      // 2. Process linked requisition items (FIFO dispense with officer adjustments)
      if (borrow.requisitionRequestId) {
        try {
          const linkedReq = await prisma.requisitionRequest.findUnique({
            where: { id: borrow.requisitionRequestId },
            include: {
              items: {
                include: {
                  item: true,
                },
              },
              course: true,
            },
          });

          if (linkedReq && linkedReq.status !== 'DISPENSED') {
            let reqActualTotalCost = 0;

            for (const reqItem of linkedReq.items) {
              const adj = Array.isArray(requisitionItemAdjustments)
                ? requisitionItemAdjustments.find((a: any) => a.id === reqItem.id)
                : null;

              const isAllowed = adj ? adj.allowed !== false : true;
              if (!isAllowed) {
                // Officer disallowed this consumable item
                await prisma.requisitionItem.update({
                  where: { id: reqItem.id },
                  data: {
                    quantityDispensed: 0,
                    unitCost: 0,
                    totalCost: 0,
                  },
                });
                continue;
              }

              let remainingToDeduct =
                adj && adj.quantity !== undefined
                  ? Math.max(0, Number(adj.quantity))
                  : reqItem.quantityRequested;

              const requestedTarget = remainingToDeduct;
              let itemCost = 0;

              const isSub = reqItem.isSubUnit === true;
              const ratio = Number(reqItem.item?.conversionRatio) > 0 ? Number(reqItem.item?.conversionRatio) : 1;

              const whereLots: any = {
                itemId: reqItem.itemId,
                OR: [
                  { quantityRemaining: { gt: 0 } },
                  { openPackRemainder: { gt: 0 } },
                ],
              };

              // Strict safety lock: if requested for human use, NEVER deduct expired lots
              if (linkedReq.useTarget === 'HUMAN') {
                whereLots.AND = [
                  {
                    OR: [
                      { expiryDate: null },
                      { expiryDate: { gte: new Date() } },
                    ],
                  },
                ];
              }

              let availableLots = await prisma.stockLot.findMany({
                where: whereLots,
                orderBy: [
                  { expiryDate: 'asc' },
                  { receivedDate: 'asc' },
                  { createdAt: 'asc' },
                ],
              });

              if (adj && (adj as any).lotId) {
                const selectedLot = availableLots.find((l) => l.id === (adj as any).lotId);
                if (selectedLot) {
                  availableLots = [selectedLot, ...availableLots.filter((l) => l.id !== (adj as any).lotId)];
                }
              }

              if (!isSub) {
                // Case 1: Whole pack deduction (Option A)
                for (const lot of availableLots) {
                  if (remainingToDeduct <= 0) break;
                  if (lot.quantityRemaining <= 0) continue;

                  const deduct = Math.min(lot.quantityRemaining, remainingToDeduct);
                  const cost = deduct * lot.unitCost;
                  const newQty = lot.quantityRemaining - deduct;
                  const openRem = lot.openPackRemainder || 0;
                  const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
                  const newPieces = Math.max(0, (newQty * lotPackSize) + openRem);

                  await prisma.stockLot.update({
                    where: { id: lot.id },
                    data: {
                      quantityRemaining: newQty,
                      piecesRemaining: newPieces,
                    },
                  });

                  // Update individual StockLotBoxes in sequential order (1..N)
                  const availableBoxes = await prisma.stockLotBox.findMany({
                    where: {
                      lotId: lot.id,
                      status: { in: ['IN_STOCK', 'IN_USE'] },
                    },
                    orderBy: { boxNumberInLot: 'asc' },
                    take: deduct,
                  });

                  if (availableBoxes.length > 0) {
                    await prisma.stockLotBox.updateMany({
                      where: { id: { in: availableBoxes.map((b) => b.id) } },
                      data: { status: 'DISPENSED' },
                    });
                  }

                  await prisma.stockTransaction.create({
                    data: {
                      itemId: reqItem.itemId,
                      lotId: lot.id,
                      type: 'OUT_REQUISITION',
                      quantity: -deduct,
                      unitCost: lot.unitCost,
                      totalCost: cost,
                      courseId: linkedReq.courseId,
                      referenceNumber: linkedReq.requestNumber,
                      createdById: userId,
                      note: checkoutNote
                        ? `จ่ายตามคำขอเบิก-ยืม ${borrow.requestNumber} (วิชา ${linkedReq.course?.code || ''}) | หมายเหตุ: ${String(checkoutNote).trim()}`
                        : `จ่ายตามคำขอเบิก-ยืม ${borrow.requestNumber} (วิชา ${linkedReq.course?.code || ''})`,
                    },
                  });

                  // Update individual RepackPackItems
                  const availablePacks = await prisma.repackPackItem.findMany({
                    where: {
                      repackRecord: { subLotNumber: lot.lotNumber },
                      status: 'AVAILABLE',
                    },
                    orderBy: { packNumber: 'asc' },
                    take: deduct,
                  });

                  if (availablePacks.length > 0) {
                    await prisma.repackPackItem.updateMany({
                      where: { id: { in: availablePacks.map((p) => p.id) } },
                      data: {
                        status: 'DISPENSED',
                        dispensedTo: borrow.user ? `${formatUserName(borrow.user)} (${borrow.requestNumber})` : borrow.requestNumber,
                        dispensedAt: new Date(),
                      },
                    });
                  }

                  itemCost += cost;
                  remainingToDeduct -= deduct;
                }
              } else {
                // Case 2: Sub-unit deduction (Option A)
                let piecesNeeded = remainingToDeduct;
                const wholePacksNeeded = ratio > 1 ? Math.floor(piecesNeeded / ratio) : 0;
                let wholePacksRemainingToDeduct = wholePacksNeeded;

                // Step 1: Dispense whole packs first
                if (wholePacksRemainingToDeduct > 0) {
                  for (const lot of availableLots) {
                    if (wholePacksRemainingToDeduct <= 0) break;
                    if (lot.quantityRemaining <= 0) continue;

                    const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
                    const deductPacks = Math.min(lot.quantityRemaining, wholePacksRemainingToDeduct);
                    const costForPacks = deductPacks * lot.unitCost;
                    const newQty = lot.quantityRemaining - deductPacks;
                    const openRem = lot.openPackRemainder || 0;
                    const newPieces = Math.max(0, (newQty * lotPackSize) + openRem);

                    lot.quantityRemaining = newQty;

                    await prisma.stockLot.update({
                      where: { id: lot.id },
                      data: {
                        quantityRemaining: newQty,
                        piecesRemaining: newPieces,
                      },
                    });

                    // Update StockLotBox
                    const availableBoxes = await prisma.stockLotBox.findMany({
                      where: { lotId: lot.id, status: { in: ['IN_STOCK', 'IN_USE'] } },
                      orderBy: { boxNumberInLot: 'asc' },
                      take: deductPacks,
                    });
                    if (availableBoxes.length > 0) {
                      await prisma.stockLotBox.updateMany({
                        where: { id: { in: availableBoxes.map((b) => b.id) } },
                        data: { status: 'DISPENSED' },
                      });
                    }

                    const availablePacks = await prisma.repackPackItem.findMany({
                      where: { repackRecord: { subLotNumber: lot.lotNumber }, status: 'AVAILABLE' },
                      orderBy: { packNumber: 'asc' },
                      take: deductPacks,
                    });
                    if (availablePacks.length > 0) {
                      await prisma.repackPackItem.updateMany({
                        where: { id: { in: availablePacks.map((p) => p.id) } },
                        data: {
                          status: 'DISPENSED',
                          dispensedTo: borrow.user ? `${formatUserName(borrow.user)} (${borrow.requestNumber})` : borrow.requestNumber,
                          dispensedAt: new Date(),
                        },
                      });
                    }

                    await prisma.stockTransaction.create({
                      data: {
                        itemId: reqItem.itemId,
                        lotId: lot.id,
                        type: 'OUT_REQUISITION',
                        quantity: -deductPacks,
                        unitCost: lot.unitCost,
                        totalCost: costForPacks,
                        courseId: linkedReq.courseId,
                        referenceNumber: linkedReq.requestNumber,
                        createdById: userId,
                        note: checkoutNote
                          ? `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * lotPackSize} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอเบิก-ยืม ${borrow.requestNumber} | ${String(checkoutNote).trim()}`
                          : `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * lotPackSize} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอเบิก-ยืม ${borrow.requestNumber}`,
                      },
                    });

                    itemCost += costForPacks;
                    wholePacksRemainingToDeduct -= deductPacks;
                    piecesNeeded -= deductPacks * lotPackSize;
                  }
                }

                // Step 2: Fulfill remaining fractional pieces
                if (piecesNeeded > 0) {
                  // Step 2A: From openPackRemainder
                  for (const lot of availableLots) {
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

                    await prisma.stockLot.update({
                      where: { id: lot.id },
                      data: {
                        openPackRemainder: newOpen,
                        piecesRemaining: newPieces,
                      },
                    });

                    await prisma.stockTransaction.create({
                      data: {
                        itemId: reqItem.itemId,
                        lotId: lot.id,
                        type: 'OUT_REQUISITION',
                        quantity: -(takeFromOpen / lotPackSize),
                        unitCost: lot.unitCost,
                        totalCost: costForLoose,
                        courseId: linkedReq.courseId,
                        referenceNumber: linkedReq.requestNumber,
                        createdById: userId,
                        note: checkoutNote
                          ? `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอเบิก-ยืม ${borrow.requestNumber} | ${String(checkoutNote).trim()}`
                          : `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอเบิก-ยืม ${borrow.requestNumber}`,
                      },
                    });

                    itemCost += costForLoose;
                    piecesNeeded -= takeFromOpen;
                  }

                  // Step 2B: Open 1 new whole pack
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
                      const newPieces = Math.max(0, (newQty * lotPackSize) + newOpen);

                      lot.quantityRemaining = newQty;
                      lot.openPackRemainder = newOpen;

                      await prisma.stockLot.update({
                        where: { id: lot.id },
                        data: {
                          quantityRemaining: newQty,
                          openPackRemainder: newOpen,
                          piecesRemaining: newPieces,
                        },
                      });

                      // Update StockLotBox for opened pack
                      const availableBoxes = await prisma.stockLotBox.findMany({
                        where: { lotId: lot.id, status: { in: ['IN_STOCK'] } },
                        orderBy: { boxNumberInLot: 'asc' },
                        take: packsToOpen,
                      });
                      if (availableBoxes.length > 0) {
                        await prisma.stockLotBox.updateMany({
                          where: { id: { in: availableBoxes.map((b) => b.id) } },
                          data: { status: leftoverPieces > 0 ? 'IN_USE' : 'DISPENSED' },
                        });
                      }

                      const pieceCost = lot.unitCost / lotPackSize;
                      const costForDispensedPieces = piecesToDeduct * pieceCost;

                      await prisma.stockTransaction.create({
                        data: {
                          itemId: reqItem.itemId,
                          lotId: lot.id,
                          type: 'OUT_REQUISITION',
                          quantity: -(piecesToDeduct / lotPackSize),
                          unitCost: lot.unitCost,
                          totalCost: costForDispensedPieces,
                          courseId: linkedReq.courseId,
                          referenceNumber: linkedReq.requestNumber,
                          createdById: userId,
                          note: checkoutNote
                            ? `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอเบิก-ยืม ${borrow.requestNumber} | ${String(checkoutNote).trim()}`
                            : `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอเบิก-ยืม ${borrow.requestNumber}`,
                        },
                      });

                      itemCost += costForDispensedPieces;
                      piecesNeeded -= piecesToDeduct;
                    }
                  }
                }

                remainingToDeduct = piecesNeeded;
              }

              const actualDispensed = requestedTarget - remainingToDeduct;
              await prisma.requisitionItem.update({
                where: { id: reqItem.id },
                data: {
                  quantityDispensed: actualDispensed,
                  unitCost: actualDispensed > 0 ? itemCost / actualDispensed : 0,
                  totalCost: itemCost,
                },
              });

              reqActualTotalCost += itemCost;
            }

            await prisma.requisitionRequest.update({
              where: { id: linkedReq.id },
              data: {
                status: 'DISPENSED',
                officerId: userId,
                dispensedAt: new Date(),
                dispenseNote: checkoutNote ? String(checkoutNote).trim() : null,
                totalCost: reqActualTotalCost,
              },
            });
          }
        } catch (err) {
          console.error('Failed to auto-dispense linked requisition:', err);
        }
      }

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          status: 'BORROWED',
          officerId: userId,
          checkedOutAt: new Date(),
          checkoutNote: checkoutNote ? String(checkoutNote).trim() : null,
        },
      });

      // Notify student
      createNotification({
        userId: borrow.userId,
        title: 'จ่ายครุภัณฑ์เรียบร้อยแล้ว 📦',
        message: `เจ้าหน้าที่ได้จ่ายครุภัณฑ์ตามคำขอ ${borrow.requestNumber} แล้ว กำหนดคืนวันที่ ${new Date(borrow.expectedReturnDate).toLocaleDateString('th-TH')}`,
        type: 'DUE_REMINDER',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      logActivity({
        userId,
        action: 'CHECKOUT',
        entityType: 'BORROW',
        entityId: borrow.id,
        entityTitle: borrow.requestNumber,
        details: `เจ้าหน้าที่ส่งมอบครุภัณฑ์คำขอเลขที่ ${borrow.requestNumber} ให้นิสิต (${borrow.user?.name || 'ไม่ระบุชื่อ'})`,
      });

      return respondUpdated(updated);
    }

    if (action === 'RETURN') {
      if (borrow.status === 'RETURNED_COMPLETE' || borrow.status === 'RETURNED_WITH_ISSUE') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ คำขอยืมนี้ได้รับการตรวจรับคืนครุภัณฑ์ไปแล้ว',
            currentStatus: borrow.status,
          },
          { status: 409 }
        );
      }

      // Officer checks in equipment with individual item condition evaluation
      // body.itemReturns can be an array: [{ id: borrowItemId, condition: 'GOOD'|'DAMAGED', note?: string }]
      const { itemReturns } = body;
      let hasAnyDamaged = false;

      if (itemReturns && Array.isArray(itemReturns) && itemReturns.length > 0) {
        for (const itemRet of itemReturns) {
          const itemCond = itemRet.condition === 'DAMAGED' ? 'DAMAGED' : 'GOOD';
          if (itemCond === 'DAMAGED') {
            hasAnyDamaged = true;
          }

          const updatedBItem = await prisma.borrowItem.update({
            where: { id: itemRet.id },
            data: {
              isReturned: true,
              returnCondition: itemCond,
            },
          });

          if (updatedBItem.assetId) {
            await prisma.equipmentAsset.update({
              where: { id: updatedBItem.assetId },
              data: {
                status: itemCond === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE',
                condition: itemCond,
                note: itemRet.note ? `ส่งคืนเมื่อ ${new Date().toLocaleDateString('th-TH')}: ${itemRet.note}` : undefined,
              },
            });

            // Automatically create MaintenanceLog if damaged
            if (itemCond === 'DAMAGED') {
              await prisma.maintenanceLog.create({
                data: {
                  assetId: updatedBItem.assetId,
                  issue: itemRet.note || `ชำรุดจากการยืมใช้งานตามคำขอ ${borrow.requestNumber}`,
                  sentDate: new Date(),
                  status: 'UNDER_REPAIR',
                  handledById: userId || null,
                  technicianNote: `ตรวจพบชำรุดขณะตรวจรับคืนครุภัณฑ์ (ผู้ยืม: ${formatUserName(borrow.user) || 'ไม่ระบุ'})`,
                },
              });
            }
          }
        }
      } else {
        // Fallback: evaluate all items with global returnCondition
        const isDamaged = returnCondition === 'DAMAGED';
        if (isDamaged) hasAnyDamaged = true;

        for (const bItem of borrow.items) {
          await prisma.borrowItem.update({
            where: { id: bItem.id },
            data: {
              isReturned: true,
              returnCondition: returnCondition || 'GOOD',
            },
          });

          if (bItem.assetId) {
            await prisma.equipmentAsset.update({
              where: { id: bItem.assetId },
              data: {
                status: isDamaged ? 'MAINTENANCE' : 'AVAILABLE',
                condition: returnCondition || 'GOOD',
                note: returnNote ? `ส่งคืนเมื่อ ${new Date().toLocaleDateString('th-TH')}: ${returnNote}` : undefined,
              },
            });

            // Automatically create MaintenanceLog if damaged
            if (isDamaged) {
              await prisma.maintenanceLog.create({
                data: {
                  assetId: bItem.assetId,
                  issue: returnNote || `ชำรุดจากการยืมใช้งานตามคำขอ ${borrow.requestNumber}`,
                  sentDate: new Date(),
                  status: 'UNDER_REPAIR',
                  handledById: userId || null,
                  technicianNote: `ตรวจพบชำรุดขณะตรวจรับคืนครุภัณฑ์ (ผู้ยืม: ${formatUserName(borrow.user) || 'ไม่ระบุ'})`,
                },
              });
            }
          }
        }
      }

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          status: hasAnyDamaged ? 'RETURNED_WITH_ISSUE' : 'RETURNED_COMPLETE',
          actualReturnDate: new Date(),
          officerId: userId,
          checkedInAt: new Date(),
          returnNote: returnNote || null,
        },
      });

      // Notify student
      createNotification({
        userId: borrow.userId,
        title: hasAnyDamaged ? 'ตรวจรับคืนครุภัณฑ์ (พบรายการชำรุด)' : 'คืนครุภัณฑ์เรียบร้อยแล้ว ✅',
        message: hasAnyDamaged
          ? `เจ้าหน้าที่ตรวจรับคืนคำขอ ${borrow.requestNumber} แล้ว โดยพบอุปกรณ์ชำรุด กรุณาติดต่อเจ้าหน้าที่ห้องแล็บ`
          : `เจ้าหน้าที่ได้ตรวจรับคืนครุภัณฑ์ตามคำขอ ${borrow.requestNumber} เรียบร้อยแล้ว ขอบคุณที่ดูแลอุปกรณ์`,
        type: hasAnyDamaged ? 'REJECTION' : 'APPROVAL',
        priority: hasAnyDamaged ? 'HIGH' : 'NORMAL',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      logActivity({
        userId,
        action: 'RETURN',
        entityType: 'BORROW',
        entityId: borrow.id,
        entityTitle: borrow.requestNumber,
        details: `ตรวจรับคืนครุภัณฑ์คำขอเลขที่ ${borrow.requestNumber} (${hasAnyDamaged ? 'พบรายการชำรุด' : 'สภาพปกติครบถ้วน'})`,
        metadata: {
          hasAnyDamaged,
          returnNote: returnNote || null,
        },
      });

      return respondUpdated(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Borrow update error:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decoded = decodeURIComponent(id).trim();

    const borrow = await prisma.borrowRequest.findFirst({
      where: {
        OR: [
          { id: decoded },
          { requestNumber: decoded },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            prefix: true,
            studentId: true,
            role: true,
            department: true,
            email: true,
            phone: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            instructorName: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            prefix: true,
            role: true,
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                category: true,
                unit: true,
                imageUrl: true,
              },
            },
            asset: {
              select: {
                id: true,
                assetCode: true,
                govAssetCode: true,
                serialNumber: true,
                status: true,
                condition: true,
                location: true,
              },
            },
          },
        },
        requisitionRequest: {
          include: {
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    unit: true,
                    usageUnit: true,
                    conversionRatio: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!borrow) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคำขอยืมครุภัณฑ์' }, { status: 404 });
    }

    return NextResponse.json(borrow);
  } catch (error: any) {
    console.error('Fetch borrow request error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอยืม' }, { status: 500 });
  }
}
