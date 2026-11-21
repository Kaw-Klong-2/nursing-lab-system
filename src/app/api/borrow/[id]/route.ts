import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { formatUserName, formatAcknowledgeDisplay } from '@/lib/user-utils';
import { createNotification, notifyRoles } from '@/lib/notifications';
import { canUserApprove } from '@/lib/approval-scope';
import { logActivity } from '@/lib/activity-log';
import { getSessionFromRequest } from '@/lib/session';

class BorrowActionError extends Error {
  status: number;
  code?: string;
  extra?: Record<string, unknown>;
  constructor(message: string, status = 400, code?: string, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(req);
    const effectiveUserId = session?.uid;
    const { id } = await params;
    const body = await req.json();
    const {
      action,
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
      include: { items: true, user: true, course: true },
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

    const requireActorWithRoles = async (
      allowedRoles: string[],
      unauthorizedMsg: string,
      forbiddenMsg: string
    ) => {
      if (!effectiveUserId) {
        return { errorRes: NextResponse.json({ error: unauthorizedMsg }, { status: 401 }) };
      }
      const actor = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { id: true, role: true, status: true },
      });
      if (!actor || (actor.status && actor.status !== 'ACTIVE') || !allowedRoles.includes(actor.role)) {
        return { errorRes: NextResponse.json({ error: forbiddenMsg }, { status: 403 }) };
      }
      return { actor };
    };

    if (action === 'ACKNOWLEDGE') {
      const authCheck = await requireActorWithRoles(
        ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER'],
        'กรุณาเข้าสู่ระบบก่อนดำเนินการรับทราบรายการ',
        'ท่านไม่มีสิทธิ์กดรับทราบคำขอยืมครุภัณฑ์'
      );
      if (authCheck.errorRes) return authCheck.errorRes;
      // Preserve genuine teacher/instructor name if present; do not overwrite with staff/admin username
      const existingTeacher =
        borrow.course?.instructorName ||
        (borrow.advisorName && !borrow.advisorName.includes('แอดมิน') && !borrow.advisorName.includes('เจ้าหน้าที่')
          ? borrow.advisorName
          : null);
      const finalAdvisorName = existingTeacher || body.advisorName || borrow.advisorName;

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          instructorAcknowledged: true,
          acknowledgedAt: new Date(),
          advisorName: finalAdvisorName,
        },
      });

      // Synchronize with linked requisition request if unified
      if (borrow.requisitionRequestId) {
        await prisma.requisitionRequest
          .update({
            where: { id: borrow.requisitionRequestId },
            data: {
              instructorAcknowledged: true,
              acknowledgedAt: new Date(),
              advisorName: finalAdvisorName,
            },
          })
          .catch((e) => console.error('Failed to sync linked requisition acknowledge:', e));
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
      if (!effectiveUserId) {
        return NextResponse.json(
          { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการอนุมัติรายการ' },
          { status: 401 }
        );
      }
      const approverUser = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { role: true, status: true, approvalScopes: true },
      });
      if (
        !approverUser ||
        (approverUser.status && approverUser.status !== 'ACTIVE') ||
        !canUserApprove(approverUser, 'BORROW')
      ) {
        return NextResponse.json(
          { error: 'ท่านไม่มีสิทธิ์อนุมัติรายการยืมครุภัณฑ์ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
          { status: 403 }
        );
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
          approverId: effectiveUserId,
          approvedAt: new Date(),
        },
      });

      // Synchronize with linked requisition request if unified
      if (borrow.requisitionRequestId) {
        await prisma.requisitionRequest.update({
          where: { id: borrow.requisitionRequestId },
          data: {
            status: 'APPROVED',
            approverId: effectiveUserId,
            approvedAt: new Date(),
          },
        }).catch((e) => console.error('Failed to sync linked requisition approve:', e));
      }

      logActivity({
        userId: effectiveUserId,
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
      if (!effectiveUserId) {
        return NextResponse.json(
          { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการปฏิเสธรายการ' },
          { status: 401 }
        );
      }
      const approverUser = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { role: true, status: true, approvalScopes: true },
      });
      if (
        !approverUser ||
        (approverUser.status && approverUser.status !== 'ACTIVE') ||
        !canUserApprove(approverUser, 'BORROW')
      ) {
        return NextResponse.json(
          { error: 'ท่านไม่มีสิทธิ์ปฏิเสธรายการยืมครุภัณฑ์ (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
          { status: 403 }
        );
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
          approverId: effectiveUserId,
          rejectionReason: reason || 'ไม่อนุมัติ',
        },
      });

      // Synchronize with linked requisition request if unified
      if (borrow.requisitionRequestId) {
        await prisma.requisitionRequest.update({
          where: { id: borrow.requisitionRequestId },
          data: {
            status: 'REJECTED',
            approverId: effectiveUserId,
            rejectionReason: reason || 'ไม่อนุมัติ',
          },
        }).catch((e) => console.error('Failed to sync linked requisition reject:', e));
      }

      logActivity({
        userId: effectiveUserId,
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
      const authCheck = await requireActorWithRoles(
        ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER'],
        'กรุณาเข้าสู่ระบบก่อนแก้ไขกำหนดการ',
        'ท่านไม่มีสิทธิ์แก้ไขกำหนดการยืม-คืนครุภัณฑ์'
      );
      if (authCheck.errorRes) return authCheck.errorRes;

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
      const authCheck = await requireActorWithRoles(
        ['ADMIN', 'OFFICER', 'APPROVER'],
        'กรุณาเข้าสู่ระบบก่อนดำเนินการส่งมอบครุภัณฑ์',
        'สงวนสิทธิ์เฉพาะเจ้าหน้าที่ห้องปฏิบัติการและผู้ดูแลระบบในการส่งมอบครุภัณฑ์'
      );
      if (authCheck.errorRes) return authCheck.errorRes;
      const actorUserId = effectiveUserId!;
      const { updated, freshBorrow } = await prisma.$transaction(
        async (tx) => {
          const currentBorrow = await tx.borrowRequest.findUnique({
            where: { id },
            include: { items: true, user: true, course: true },
          });

          if (!currentBorrow) {
            throw new BorrowActionError('ไม่พบคำขอยืม', 404);
          }

          if (
            currentBorrow.status === 'BORROWED' ||
            currentBorrow.status === 'RETURNED_COMPLETE' ||
            currentBorrow.status === 'RETURNED_WITH_ISSUE'
          ) {
            throw new BorrowActionError(
              '⚠️ คำขอยืมนี้ได้รับการส่งมอบครุภัณฑ์ไปแล้ว',
              409,
              'CONCURRENCY_CONFLICT',
              { currentStatus: currentBorrow.status }
            );
          }

          if (currentBorrow.status !== 'APPROVED') {
            throw new BorrowActionError(
              'สามารถส่งมอบครุภัณฑ์ได้เฉพาะคำขอที่ได้รับการอนุมัติแล้วเท่านั้น',
              400
            );
          }

          // 1. Process equipment items with officer adjustments
          for (const bItem of currentBorrow.items) {
            const adj = Array.isArray(borrowItemAdjustments)
              ? borrowItemAdjustments.find((a: any) => a.id === bItem.id)
              : null;

            const isAllowed = adj ? adj.allowed !== false : true;
            const newQty = adj && Number(adj.quantity) > 0 ? Number(adj.quantity) : bItem.quantity;

            if (!isAllowed) {
              // Officer disallowed this equipment item
              await tx.borrowItem.update({
                where: { id: bItem.id },
                data: {
                  quantity: 0,
                  returnCondition: 'DISALLOWED',
                  isReturned: true,
                },
              });
              continue;
            }

            // Check if item has individual EquipmentAsset tracking in inventory
            const availableAssetsForItem = await tx.equipmentAsset.findMany({
              where: { itemId: bItem.itemId, status: 'AVAILABLE' },
              orderBy: { sequenceNumber: 'asc' },
            });

            const explicitAssign =
              assignedAssets?.find((a: any) => a.borrowItemId === bItem.id) ||
              (adj?.assetId ? { assetId: adj.assetId } : null);

            const explicitAssetIds: string[] = Array.isArray(explicitAssign?.assetIds)
              ? explicitAssign.assetIds.filter(Boolean)
              : (explicitAssign?.assetId ? [explicitAssign.assetId] : []);

            if (availableAssetsForItem.length > 0 || explicitAssetIds.length > 0 || bItem.assetId) {
              // Individual Asset Tracking Mode:
              // Ensure each physical asset has its own BorrowItem with quantity = 1, and status = BORROWED
              const primaryAssetId = explicitAssetIds[0] || bItem.assetId || availableAssetsForItem[0]?.id;

              // 1. Set the first BorrowItem to quantity 1 and assign primary asset
              await tx.borrowItem.update({
                where: { id: bItem.id },
                data: {
                  quantity: 1,
                  assetId: primaryAssetId || null,
                },
              });
              if (primaryAssetId) {
                await tx.equipmentAsset.update({
                  where: { id: primaryAssetId },
                  data: { status: 'BORROWED' },
                });
              }

              // 2. If newQty > 1, create individual BorrowItem records for additional units
              if (newQty > 1) {
                const remainingAvailable = availableAssetsForItem.filter((a) => a.id !== primaryAssetId);

                for (let sIdx = 1; sIdx < newQty; sIdx++) {
                  const assignedId = explicitAssetIds[sIdx];
                  let assignedAsset = assignedId
                    ? await tx.equipmentAsset.findUnique({ where: { id: assignedId } })
                    : null;

                  if (!assignedAsset) {
                    assignedAsset = remainingAvailable.shift() || null;
                  }

                  if (assignedAsset) {
                    await tx.borrowItem.create({
                      data: {
                        borrowRequestId: currentBorrow.id,
                        itemId: bItem.itemId,
                        assetId: assignedAsset.id,
                        quantity: 1,
                        previousLocation: assignedAsset.location,
                      },
                    });
                    await tx.equipmentAsset.update({
                      where: { id: assignedAsset.id },
                      data: { status: 'BORROWED' },
                    });
                  } else {
                    // If requested more than available physical assets, record as unassigned
                    await tx.borrowItem.create({
                      data: {
                        borrowRequestId: currentBorrow.id,
                        itemId: bItem.itemId,
                        assetId: null,
                        quantity: 1,
                      },
                    });
                  }
                }
              }
            } else {
              // Bulk equipment without individual asset barcodes
              await tx.borrowItem.update({
                where: { id: bItem.id },
                data: { quantity: newQty },
              });
            }
          }

          // 2. Process linked requisition items (FIFO dispense with officer adjustments atomically)
          if (currentBorrow.requisitionRequestId) {
            const linkedReq = await tx.requisitionRequest.findUnique({
              where: { id: currentBorrow.requisitionRequestId },
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
                  await tx.requisitionItem.update({
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

                let availableLots = await tx.stockLot.findMany({
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

                    const lotUpd = await tx.stockLot.updateMany({
                      where: { id: lot.id, quantityRemaining: { gte: deduct } },
                      data: {
                        quantityRemaining: newQty,
                        piecesRemaining: newPieces,
                      },
                    });
                    if (lotUpd.count === 0) {
                      throw new BorrowActionError(
                        'สต็อกวัสดุมีการเปลี่ยนแปลงพร้อมกัน กรุณาตรวจสอบและลองใหม่อีกครั้ง',
                        409,
                        'CONCURRENCY_CONFLICT'
                      );
                    }

                    // Update individual StockLotBoxes in sequential order (1..N)
                    const availableBoxes = await tx.stockLotBox.findMany({
                      where: {
                        lotId: lot.id,
                        status: { in: ['IN_STOCK', 'IN_USE'] },
                      },
                      orderBy: { boxNumberInLot: 'asc' },
                      take: deduct,
                    });

                    if (availableBoxes.length > 0) {
                      await tx.stockLotBox.updateMany({
                        where: { id: { in: availableBoxes.map((b) => b.id) } },
                        data: { status: 'DISPENSED' },
                      });
                    }

                    await tx.stockTransaction.create({
                      data: {
                        itemId: reqItem.itemId,
                        lotId: lot.id,
                        type: 'OUT_REQUISITION',
                        quantity: -deduct,
                        unitCost: lot.unitCost,
                        totalCost: cost,
                        courseId: linkedReq.courseId,
                        referenceNumber: linkedReq.requestNumber,
                        createdById: actorUserId,
                        note: checkoutNote
                          ? `จ่ายตามคำขอเบิก-ยืม ${currentBorrow.requestNumber} (วิชา ${linkedReq.course?.code || ''}) | หมายเหตุ: ${String(checkoutNote).trim()}`
                          : `จ่ายตามคำขอเบิก-ยืม ${currentBorrow.requestNumber} (วิชา ${linkedReq.course?.code || ''})`,
                      },
                    });

                    // Update individual RepackPackItems
                    const availablePacks = await tx.repackPackItem.findMany({
                      where: {
                        repackRecord: { subLotNumber: lot.lotNumber },
                        status: 'AVAILABLE',
                      },
                      orderBy: { packNumber: 'asc' },
                      take: deduct,
                    });

                    if (availablePacks.length > 0) {
                      await tx.repackPackItem.updateMany({
                        where: { id: { in: availablePacks.map((p) => p.id) } },
                        data: {
                          status: 'DISPENSED',
                          dispensedTo: currentBorrow.user
                            ? `${formatUserName(currentBorrow.user)} (${currentBorrow.requestNumber})`
                            : currentBorrow.requestNumber,
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

                      const lotUpd = await tx.stockLot.updateMany({
                        where: { id: lot.id, quantityRemaining: { gte: deductPacks } },
                        data: {
                          quantityRemaining: newQty,
                          piecesRemaining: newPieces,
                        },
                      });
                      if (lotUpd.count === 0) {
                        throw new BorrowActionError(
                          'สต็อกวัสดุมีการเปลี่ยนแปลงพร้อมกัน กรุณาตรวจสอบและลองใหม่อีกครั้ง',
                          409,
                          'CONCURRENCY_CONFLICT'
                        );
                      }

                      lot.quantityRemaining = newQty;

                      // Update StockLotBox
                      const availableBoxes = await tx.stockLotBox.findMany({
                        where: { lotId: lot.id, status: { in: ['IN_STOCK', 'IN_USE'] } },
                        orderBy: { boxNumberInLot: 'asc' },
                        take: deductPacks,
                      });
                      if (availableBoxes.length > 0) {
                        await tx.stockLotBox.updateMany({
                          where: { id: { in: availableBoxes.map((b) => b.id) } },
                          data: { status: 'DISPENSED' },
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
                            dispensedTo: currentBorrow.user
                              ? `${formatUserName(currentBorrow.user)} (${currentBorrow.requestNumber})`
                              : currentBorrow.requestNumber,
                            dispensedAt: new Date(),
                          },
                        });
                      }

                      await tx.stockTransaction.create({
                        data: {
                          itemId: reqItem.itemId,
                          lotId: lot.id,
                          type: 'OUT_REQUISITION',
                          quantity: -deductPacks,
                          unitCost: lot.unitCost,
                          totalCost: costForPacks,
                          courseId: linkedReq.courseId,
                          referenceNumber: linkedReq.requestNumber,
                          createdById: actorUserId,
                          note: checkoutNote
                            ? `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * lotPackSize} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอเบิก-ยืม ${currentBorrow.requestNumber} | ${String(checkoutNote).trim()}`
                            : `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * lotPackSize} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอเบิก-ยืม ${currentBorrow.requestNumber}`,
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

                      const lotUpd = await tx.stockLot.updateMany({
                        where: { id: lot.id, openPackRemainder: { gte: takeFromOpen } },
                        data: {
                          openPackRemainder: newOpen,
                          piecesRemaining: newPieces,
                        },
                      });
                      if (lotUpd.count === 0) {
                        throw new BorrowActionError(
                          'สต็อกวัสดุมีการเปลี่ยนแปลงพร้อมกัน กรุณาตรวจสอบและลองใหม่อีกครั้ง',
                          409,
                          'CONCURRENCY_CONFLICT'
                        );
                      }

                      lot.openPackRemainder = newOpen;

                      await tx.stockTransaction.create({
                        data: {
                          itemId: reqItem.itemId,
                          lotId: lot.id,
                          type: 'OUT_REQUISITION',
                          quantity: -(takeFromOpen / lotPackSize),
                          unitCost: lot.unitCost,
                          totalCost: costForLoose,
                          courseId: linkedReq.courseId,
                          referenceNumber: linkedReq.requestNumber,
                          createdById: actorUserId,
                          note: checkoutNote
                            ? `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอเบิก-ยืม ${currentBorrow.requestNumber} | ${String(checkoutNote).trim()}`
                            : `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอเบิก-ยืม ${currentBorrow.requestNumber}`,
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

                        const lotUpd = await tx.stockLot.updateMany({
                          where: { id: lot.id, quantityRemaining: { gte: packsToOpen } },
                          data: {
                            quantityRemaining: newQty,
                            openPackRemainder: newOpen,
                            piecesRemaining: newPieces,
                          },
                        });
                        if (lotUpd.count === 0) {
                          throw new BorrowActionError(
                            'สต็อกวัสดุมีการเปลี่ยนแปลงพร้อมกัน กรุณาตรวจสอบและลองใหม่อีกครั้ง',
                            409,
                            'CONCURRENCY_CONFLICT'
                          );
                        }

                        lot.quantityRemaining = newQty;
                        lot.openPackRemainder = newOpen;

                        // Update StockLotBox for opened pack
                        const availableBoxes = await tx.stockLotBox.findMany({
                          where: { lotId: lot.id, status: { in: ['IN_STOCK'] } },
                          orderBy: { boxNumberInLot: 'asc' },
                          take: packsToOpen,
                        });
                        if (availableBoxes.length > 0) {
                          await tx.stockLotBox.updateMany({
                            where: { id: { in: availableBoxes.map((b) => b.id) } },
                            data: { status: leftoverPieces > 0 ? 'IN_USE' : 'DISPENSED' },
                          });
                        }

                        const pieceCost = lot.unitCost / lotPackSize;
                        const costForDispensedPieces = piecesToDeduct * pieceCost;

                        await tx.stockTransaction.create({
                          data: {
                            itemId: reqItem.itemId,
                            lotId: lot.id,
                            type: 'OUT_REQUISITION',
                            quantity: -(piecesToDeduct / lotPackSize),
                            unitCost: lot.unitCost,
                            totalCost: costForDispensedPieces,
                            courseId: linkedReq.courseId,
                            referenceNumber: linkedReq.requestNumber,
                            createdById: actorUserId,
                            note: checkoutNote
                              ? `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอเบิก-ยืม ${currentBorrow.requestNumber} | ${String(checkoutNote).trim()}`
                              : `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอเบิก-ยืม ${currentBorrow.requestNumber}`,
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
                await tx.requisitionItem.update({
                  where: { id: reqItem.id },
                  data: {
                    quantityDispensed: actualDispensed,
                    unitCost: actualDispensed > 0 ? itemCost / actualDispensed : 0,
                    totalCost: itemCost,
                  },
                });

                reqActualTotalCost += itemCost;
              }

              await tx.requisitionRequest.update({
                where: { id: linkedReq.id },
                data: {
                  status: 'DISPENSED',
                  officerId: actorUserId,
                  dispensedAt: new Date(),
                  dispenseNote: checkoutNote ? String(checkoutNote).trim() : null,
                  totalCost: reqActualTotalCost,
                },
              });
            }
          }

          const updatedBorrow = await tx.borrowRequest.update({
            where: { id },
            data: {
              status: 'BORROWED',
              officerId: actorUserId,
              checkedOutAt: new Date(),
              checkoutNote: checkoutNote ? String(checkoutNote).trim() : null,
            },
          });

          return { updated: updatedBorrow, freshBorrow: currentBorrow };
        },
        { timeout: 25000 }
      );

      // Notify student
      createNotification({
        userId: freshBorrow.userId,
        title: 'จ่ายครุภัณฑ์เรียบร้อยแล้ว 📦',
        message: `เจ้าหน้าที่ได้จ่ายครุภัณฑ์ตามคำขอ ${freshBorrow.requestNumber} แล้ว กำหนดคืนวันที่ ${new Date(freshBorrow.expectedReturnDate).toLocaleDateString('th-TH')}`,
        type: 'DUE_REMINDER',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: freshBorrow.id,
      }).catch(() => {});

      logActivity({
        userId: actorUserId,
        action: 'CHECKOUT',
        entityType: 'BORROW',
        entityId: freshBorrow.id,
        entityTitle: freshBorrow.requestNumber,
        details: `เจ้าหน้าที่ส่งมอบครุภัณฑ์คำขอเลขที่ ${freshBorrow.requestNumber} ให้นิสิต (${freshBorrow.user?.name || 'ไม่ระบุชื่อ'})`,
      });

      return respondUpdated(updated);
    }

    if (action === 'RETURN') {
      const authCheck = await requireActorWithRoles(
        ['ADMIN', 'OFFICER', 'APPROVER'],
        'กรุณาเข้าสู่ระบบก่อนดำเนินการตรวจรับคืนครุภัณฑ์',
        'สงวนสิทธิ์เฉพาะเจ้าหน้าที่ห้องปฏิบัติการและผู้ดูแลระบบในการตรวจรับคืนครุภัณฑ์'
      );
      if (authCheck.errorRes) return authCheck.errorRes;
      const actorUserId = effectiveUserId!;

      const { itemReturns, requisitionReturns } = body;

      const { updated, hasAnyDamaged, freshBorrow } = await prisma.$transaction(
        async (tx) => {
          const currentBorrow = await tx.borrowRequest.findUnique({
            where: { id },
            include: { items: true, user: true, course: true },
          });

          if (!currentBorrow) {
            throw new BorrowActionError('ไม่พบคำขอยืม', 404);
          }

          if (currentBorrow.status === 'RETURNED_COMPLETE' || currentBorrow.status === 'RETURNED_WITH_ISSUE') {
            throw new BorrowActionError(
              '⚠️ คำขอยืมนี้ได้รับการตรวจรับคืนครุภัณฑ์ไปแล้ว',
              409,
              'CONCURRENCY_CONFLICT',
              { currentStatus: currentBorrow.status }
            );
          }

          // Officer checks in equipment with individual item condition evaluation
          // body.itemReturns can be an array: [{ id: borrowItemId, condition: 'GOOD'|'DAMAGED', note?: string }]
          let damagedFound = false;
          const validBorrowItemIds = new Set(currentBorrow.items.map((i) => i.id));

          if (itemReturns && Array.isArray(itemReturns) && itemReturns.length > 0) {
            for (const itemRet of itemReturns) {
              if (!itemRet?.id || !validBorrowItemIds.has(itemRet.id)) continue;

              const itemCond = itemRet.condition === 'DAMAGED' ? 'DAMAGED' : 'GOOD';
              if (itemCond === 'DAMAGED') {
                damagedFound = true;
              }

              const updatedBItem = await tx.borrowItem.update({
                where: { id: itemRet.id },
                data: {
                  isReturned: true,
                  returnCondition: itemCond,
                },
              });

              if (updatedBItem.assetId) {
                await tx.equipmentAsset.update({
                  where: { id: updatedBItem.assetId },
                  data: {
                    status: itemCond === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE',
                    condition: itemCond,
                    note: itemRet.note ? `ส่งคืนเมื่อ ${new Date().toLocaleDateString('th-TH')}: ${itemRet.note}` : undefined,
                  },
                });

                // Automatically create MaintenanceLog if damaged
                if (itemCond === 'DAMAGED') {
                  await tx.maintenanceLog.create({
                    data: {
                      assetId: updatedBItem.assetId,
                      issue: itemRet.note || `ชำรุดจากการยืมใช้งานตามคำขอ ${currentBorrow.requestNumber}`,
                      sentDate: new Date(),
                      status: 'UNDER_REPAIR',
                      handledById: actorUserId,
                      technicianNote: `ตรวจพบชำรุดขณะตรวจรับคืนครุภัณฑ์ (ผู้ยืม: ${formatUserName(currentBorrow.user) || 'ไม่ระบุ'})`,
                    },
                  });
                }
              }
            }
          } else {
            // Fallback: evaluate all items with global returnCondition
            const isDamaged = returnCondition === 'DAMAGED';
            if (isDamaged) damagedFound = true;

            for (const bItem of currentBorrow.items) {
              await tx.borrowItem.update({
                where: { id: bItem.id },
                data: {
                  isReturned: true,
                  returnCondition: returnCondition || 'GOOD',
                },
              });

              if (bItem.assetId) {
                await tx.equipmentAsset.update({
                  where: { id: bItem.assetId },
                  data: {
                    status: isDamaged ? 'MAINTENANCE' : 'AVAILABLE',
                    condition: returnCondition || 'GOOD',
                    note: returnNote ? `ส่งคืนเมื่อ ${new Date().toLocaleDateString('th-TH')}: ${returnNote}` : undefined,
                  },
                });

                // Automatically create MaintenanceLog if damaged
                if (isDamaged) {
                  await tx.maintenanceLog.create({
                    data: {
                      assetId: bItem.assetId,
                      issue: returnNote || `ชำรุดจากการยืมใช้งานตามคำขอ ${currentBorrow.requestNumber}`,
                      sentDate: new Date(),
                      status: 'UNDER_REPAIR',
                      handledById: actorUserId,
                      technicianNote: `ตรวจพบชำรุดขณะตรวจรับคืนครุภัณฑ์ (ผู้ยืม: ${formatUserName(currentBorrow.user) || 'ไม่ระบุ'})`,
                    },
                  });
                }
              }
            }
          }

          // Process linked requisition surplus returns atomically inside the same transaction
          if (
            requisitionReturns &&
            Array.isArray(requisitionReturns) &&
            requisitionReturns.length > 0 &&
            currentBorrow.requisitionRequestId
          ) {
            const linkedReq = await tx.requisitionRequest.findUnique({
              where: { id: currentBorrow.requisitionRequestId },
              include: {
                items: {
                  include: {
                    item: true,
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

                // reqItem.unitCost is already stored per dispensed unit (whole pack if !isSub, sub-unit piece if isSub)
                const unitPrice = Number(reqItem.unitCost) || 0;
                const lineDeduct = actualRet * unitPrice;

                const newQtyReturned = (reqItem.quantityReturned || 0) + actualRet;
                const remainingDisp = Math.max(0, reqItem.quantityDispensed - newQtyReturned);
                const newLineTotal = Math.max(0, remainingDisp * unitPrice);
                const updatedReturnNote = rNote
                  ? (reqItem.returnNote ? `${reqItem.returnNote} | ${rNote}` : rNote)
                  : reqItem.returnNote;

                await tx.requisitionItem.update({
                  where: { id: reqItem.id },
                  data: {
                    quantityReturned: newQtyReturned,
                    returnCondition: condition,
                    returnedAt: new Date(),
                    returnNote: updatedReturnNote,
                    totalCost: newLineTotal,
                  },
                });

                // Keep in-memory state synced in case duplicate entries appear in requisitionReturns
                reqItem.quantityReturned = newQtyReturned;
                reqItem.returnNote = updatedReturnNote;

                if (condition === 'SEALED_INTACT' || condition === 'UNSEALED_USABLE_SIM') {
                  const targetLot = await tx.stockLot.findFirst({
                    where: { itemId: reqItem.itemId, quantityRemaining: { gte: 0 } },
                    orderBy: [{ expiryDate: 'desc' }, { receivedDate: 'desc' }],
                  });

                  if (targetLot) {
                    const pSize = Number(targetLot.packSize) > 0 ? Number(targetLot.packSize) : itemRatio;
                    const basePieces =
                      typeof targetLot.piecesRemaining === 'number'
                        ? targetLot.piecesRemaining
                        : (targetLot.quantityRemaining * pSize) + (targetLot.openPackRemainder || 0);

                    if (isSub && pSize > 1) {
                      const currentOpen = targetLot.openPackRemainder || 0;
                      const newOpen = currentOpen + actualRet;
                      const addedPacks = Math.floor(newOpen / pSize);
                      const remainder = newOpen % pSize;

                      await tx.stockLot.update({
                        where: { id: targetLot.id },
                        data: {
                          quantityRemaining: targetLot.quantityRemaining + addedPacks,
                          piecesRemaining: Math.max(0, basePieces + actualRet),
                          openPackRemainder: remainder,
                        },
                      });
                    } else {
                      await tx.stockLot.update({
                        where: { id: targetLot.id },
                        data: {
                          quantityRemaining: targetLot.quantityRemaining + actualRet,
                          piecesRemaining: Math.max(0, basePieces + (actualRet * pSize)),
                        },
                      });
                    }

                    await tx.stockTransaction.create({
                      data: {
                        itemId: reqItem.itemId,
                        lotId: targetLot.id,
                        type: 'RETURN_RESTOCK',
                        quantity: actualRet,
                        unitCost: unitPrice,
                        totalCost: lineDeduct,
                        courseId: linkedReq.courseId,
                        referenceNumber: linkedReq.requestNumber,
                        createdById: actorUserId,
                        note: `รับคืนวัสดุเหลือใช้พร้อมอุปกรณ์ตามคำขอยืม ${currentBorrow.requestNumber} [${reqItem.item.name} x ${actualRet}]${rNote ? ` - ${rNote}` : ''}`,
                      },
                    });
                  }
                }
              }

              const allReqItems = await tx.requisitionItem.findMany({
                where: { requisitionRequestId: linkedReq.id },
              });
              const newReqCost = allReqItems.reduce((acc, it) => acc + (it.totalCost || 0), 0);
              await tx.requisitionRequest.update({
                where: { id: linkedReq.id },
                data: { totalCost: newReqCost },
              });
            }
          }

          const updatedBorrow = await tx.borrowRequest.update({
            where: { id },
            data: {
              status: damagedFound ? 'RETURNED_WITH_ISSUE' : 'RETURNED_COMPLETE',
              actualReturnDate: new Date(),
              officerId: actorUserId,
              checkedInAt: new Date(),
              returnNote: returnNote || null,
            },
          });

          return { updated: updatedBorrow, hasAnyDamaged: damagedFound, freshBorrow: currentBorrow };
        },
        { timeout: 25000 }
      );

      // Notify student
      createNotification({
        userId: freshBorrow.userId,
        title: hasAnyDamaged ? 'ตรวจรับคืนครุภัณฑ์ (พบรายการชำรุด)' : 'คืนครุภัณฑ์เรียบร้อยแล้ว ✅',
        message: hasAnyDamaged
          ? `เจ้าหน้าที่ตรวจรับคืนคำขอ ${freshBorrow.requestNumber} แล้ว โดยพบอุปกรณ์ชำรุด กรุณาติดต่อเจ้าหน้าที่ห้องแล็บ`
          : `เจ้าหน้าที่ได้ตรวจรับคืนครุภัณฑ์ตามคำขอ ${freshBorrow.requestNumber} เรียบร้อยแล้ว ขอบคุณที่ดูแลอุปกรณ์`,
        type: hasAnyDamaged ? 'REJECTION' : 'APPROVAL',
        priority: hasAnyDamaged ? 'HIGH' : 'NORMAL',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: freshBorrow.id,
      }).catch(() => {});

      logActivity({
        userId: actorUserId,
        action: 'RETURN',
        entityType: 'BORROW',
        entityId: freshBorrow.id,
        entityTitle: freshBorrow.requestNumber,
        details: `ตรวจรับคืนครุภัณฑ์คำขอเลขที่ ${freshBorrow.requestNumber} (${hasAnyDamaged ? 'พบรายการชำรุด' : 'สภาพปกติครบถ้วน'})`,
        metadata: {
          hasAnyDamaged,
          returnNote: returnNote || null,
        },
      });

      return respondUpdated(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof BorrowActionError) {
      if (error.code === 'CONCURRENCY_CONFLICT') {
        return NextResponse.json(
          {
            error: error.code,
            message: error.message,
            ...(error.extra || {}),
          },
          { status: error.status }
        );
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Borrow update error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตคำขอยืม' }, { status: 500 });
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
