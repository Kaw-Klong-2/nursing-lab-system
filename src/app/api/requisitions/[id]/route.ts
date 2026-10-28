import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { createNotification, notifyRoles } from '@/lib/notifications';
import { canUserApprove } from '@/lib/approval-scope';
import { logActivity } from '@/lib/activity-log';
import { formatAcknowledgeDisplay } from '@/lib/user-utils';
import { parseBangkokDateTime } from '@/lib/date-time-utils';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason, itemAdjustments, dispenseNote } = body;

    const requisition = await prisma.requisitionRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        course: true,
        borrowRequest: true,
        user: true,
      },
    });

    if (!requisition) {
      return NextResponse.json({ error: 'ไม่พบรายการคำขอเบิก' }, { status: 404 });
    }

    // Optimistic Concurrency Control (OCC) Check
    if (body.lastKnownUpdatedAt) {
      const dbTime = new Date(requisition.updatedAt).getTime();
      const clientTime = new Date(body.lastKnownUpdatedAt).getTime();
      if (Math.abs(dbTime - clientTime) > 1000) {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentUpdatedAt: requisition.updatedAt,
          },
          { status: 409 }
        );
      }
    }

    const respondUpdated = (data: any) => {
      invalidateCache('requisitions:');
      invalidateCache('borrow:');
      invalidateCache('items:');
      invalidateCache('dashboard:');
      return NextResponse.json(data);
    };

    if (action === 'ACKNOWLEDGE') {
      // Preserve genuine teacher/instructor name if present; do not overwrite with staff/admin username
      const existingTeacher =
        requisition.course?.instructorName ||
        (requisition.advisorName &&
        !requisition.advisorName.includes('แอดมิน') &&
        !requisition.advisorName.includes('เจ้าหน้าที่')
          ? requisition.advisorName
          : null);
      const finalAdvisorName = existingTeacher || body.advisorName || requisition.advisorName;

      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          instructorAcknowledged: true,
          acknowledgedAt: new Date(),
          advisorName: finalAdvisorName,
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest
          .update({
            where: { id: requisition.borrowRequest.id },
            data: {
              instructorAcknowledged: true,
              acknowledgedAt: new Date(),
              advisorName: finalAdvisorName,
            },
          })
          .catch((e) => console.error('Failed to sync linked borrow acknowledge:', e));
      }

      // Notify student with proper role transparency (Teacher vs Admin/Staff)
      const ackDisplay = formatAcknowledgeDisplay(body.advisorName || requisition.advisorName);
      const notifTitle = ackDisplay.isStaff ? 'แอดมิน/เจ้าหน้าที่รับทราบคำขอเบิกแล้ว' : 'อาจารย์รับทราบคำขอเบิกแล้ว';
      const notifMessage = `${ackDisplay.name} ได้กดรับทราบคำขอเบิกเลขที่ ${requisition.requestNumber} แล้ว`;

      createNotification({
        userId: requisition.userId,
        title: notifTitle,
        message: notifMessage,
        type: 'INSTRUCTOR_ACK',
        linkUrl: '/requisitions',
        entityType: 'REQUISITION',
        entityId: requisition.id,
      }).catch(() => {});

      return respondUpdated(updated);
    }

    if (action === 'APPROVE') {
      if (userId) {
        const approverUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, approvalScopes: true },
        });
        if (approverUser && !canUserApprove(approverUser, 'REQUISITION')) {
          return NextResponse.json(
            { error: 'ท่านไม่มีสิทธิ์อนุมัติรายการเบิกวัสดุสิ้นเปลือง (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
            { status: 403 }
          );
        }
      }

      if (requisition.status !== 'PENDING') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentStatus: requisition.status,
          },
          { status: 409 }
        );
      }

      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: userId,
          approvedAt: new Date(),
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            status: 'APPROVED',
            approverId: userId,
            approvedAt: new Date(),
          },
        }).catch((e) => console.error('Failed to sync linked borrow approve:', e));
      }

      // Notify student
      createNotification({
        userId: requisition.userId,
        title: 'คำขอเบิกพัสดุได้รับการอนุมัติแล้ว 🎉',
        message: `คำขอเบิกเลขที่ ${requisition.requestNumber} ได้รับการอนุมัติแล้ว กรุณาติดต่อรับพัสดุที่ห้องแล็บ`,
        type: 'APPROVAL',
        priority: 'HIGH',
        linkUrl: '/requisitions',
        entityType: 'REQUISITION',
        entityId: requisition.id,
      }).catch(() => {});

      // Notify OFFICER & ADMIN about approved requisition waiting to be dispensed
      const dateNeededText = requisition.dateNeeded
        ? new Date(requisition.dateNeeded).toLocaleDateString('th-TH')
        : 'ตามกำหนดการ';
      notifyRoles(['OFFICER', 'ADMIN'], {
        title: '📦 มีรายการเบิกอนุมัติแล้ว รอจัดเตรียม/จ่ายของ',
        message: `คำขอเบิกเลขที่ ${requisition.requestNumber} (${requisition.course?.code ? `วิชา ${requisition.course.code}` : requisition.purpose || 'เบิกวัสดุ'}) ได้รับอนุมัติแล้ว มีกำหนดใช้: ${dateNeededText}`,
        type: 'STATUS_UPDATE',
        priority: 'HIGH',
        linkUrl: '/requisitions',
        entityType: 'REQUISITION',
        entityId: requisition.id,
      }).catch(() => {});

      logActivity({
        userId,
        action: 'APPROVE',
        entityType: 'REQUISITION',
        entityId: requisition.id,
        details: { requestNumber: requisition.requestNumber, totalItems: requisition.items.length },
      });

      return respondUpdated(updated);
    }

    if (action === 'REJECT') {
      if (userId) {
        const approverUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, approvalScopes: true },
        });
        if (approverUser && !canUserApprove(approverUser, 'REQUISITION')) {
          return NextResponse.json(
            { error: 'ท่านไม่มีสิทธิ์ปฏิเสธรายการเบิกวัสดุสิ้นเปลือง (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
            { status: 403 }
          );
        }
      }

      if (requisition.status !== 'PENDING') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentStatus: requisition.status,
          },
          { status: 409 }
        );
      }

      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: userId,
          rejectionReason: reason || 'ไม่อนุมัติ',
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            status: 'REJECTED',
            approverId: userId,
            rejectionReason: reason || 'ไม่อนุมัติ',
          },
        }).catch((e) => console.error('Failed to sync linked borrow reject:', e));
      }

      // Notify student
      createNotification({
        userId: requisition.userId,
        title: 'คำขอเบิกพัสดุไม่ได้รับการอนุมัติ',
        message: `คำขอเบิกเลขที่ ${requisition.requestNumber} ไม่ได้รับการอนุมัติ: ${reason || 'ไม่อนุมัติ'}`,
        type: 'REJECTION',
        priority: 'HIGH',
        linkUrl: '/requisitions',
        entityType: 'REQUISITION',
        entityId: requisition.id,
      }).catch(() => {});

      logActivity({
        userId,
        action: 'REJECT',
        entityType: 'REQUISITION',
        entityId: requisition.id,
        details: { requestNumber: requisition.requestNumber, reason: reason || 'ไม่อนุมัติ' },
      });

      return respondUpdated(updated);
    }
    if (action === 'UPDATE_DATES') {
      const { dateNeeded } = body;
      const dataToUpdate: any = {};
      if (dateNeeded) dataToUpdate.dateNeeded = parseBangkokDateTime(dateNeeded);

      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: dataToUpdate,
      });
      return respondUpdated(updated);
    }

    if (action === 'REVERT_DISPENSE') {
      if (!userId) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' }, { status: 401 });
      }
      const adminUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (adminUser?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถถอยสถานะการจ่ายพัสดุได้' },
          { status: 403 }
        );
      }

      if (requisition.status !== 'DISPENSED') {
        return NextResponse.json(
          { error: 'สามารถถอยสถานะได้เฉพาะคำขอที่อยู่ในสถานะ "จ่ายของแล้ว (DISPENSED)" เท่านั้น' },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Return stock for all dispensed items
        for (const reqItem of requisition.items) {
          const qtyDispensed = reqItem.quantityDispensed || 0;
          if (qtyDispensed <= 0) continue;

          let targetLot: any = await tx.stockLot.findFirst({
            where: { itemId: reqItem.itemId },
            orderBy: [{ expiryDate: 'desc' }, { receivedDate: 'desc' }],
          });

          if (targetLot) {
            const itemRatio = Number(reqItem.item?.conversionRatio) > 0 ? Number(reqItem.item?.conversionRatio) : 1;
            const pSize = Number(targetLot.packSize) > 0 ? Number(targetLot.packSize) : itemRatio;
            const isSub = reqItem.isSubUnit === true;

            if (isSub && pSize > 1) {
              const currentOpen = targetLot.openPackRemainder || 0;
              const newOpen = currentOpen + qtyDispensed;
              const consolidated = Math.floor(newOpen / pSize);
              const remainder = newOpen % pSize;
              const newQty = targetLot.quantityRemaining + consolidated;
              const newPieces = (targetLot.piecesRemaining || 0) + qtyDispensed;

              await tx.stockLot.update({
                where: { id: targetLot.id },
                data: {
                  quantityRemaining: newQty,
                  piecesRemaining: newPieces,
                  openPackRemainder: remainder,
                },
              });
            } else {
              const newQty = targetLot.quantityRemaining + qtyDispensed;
              const newPieces = (targetLot.piecesRemaining || 0) + (qtyDispensed * pSize);

              await tx.stockLot.update({
                where: { id: targetLot.id },
                data: {
                  quantityRemaining: newQty,
                  piecesRemaining: newPieces,
                },
              });
            }

            await tx.stockTransaction.create({
              data: {
                itemId: reqItem.itemId,
                lotId: targetLot.id,
                type: 'RETURN_RESTOCK',
                quantity: qtyDispensed,
                unitCost: reqItem.unitCost,
                totalCost: reqItem.totalCost,
                courseId: requisition.courseId,
                referenceNumber: requisition.requestNumber,
                createdById: userId,
                note: `แอดมินถอยสถานะการจ่ายพัสดุ (Revert Dispense) คืนคำขอ ${requisition.requestNumber} กลับเป็นรอจ่าย`,
              },
            });
          }

          await tx.requisitionItem.update({
            where: { id: reqItem.id },
            data: {
              quantityDispensed: 0,
            },
          });
        }

        await tx.requisitionRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            dispensedAt: null,
            officerId: null,
            dispenseNote: null,
          },
        });
      });

      logActivity({
        userId,
        action: 'UPDATE',
        entityType: 'REQUISITION',
        entityId: requisition.id,
        details: `แอดมินถอยสถานะการจ่ายพัสดุ (Revert Dispense) คำขอเลขที่ ${requisition.requestNumber}`,
      });

      return respondUpdated({ success: true, message: 'ถอยสถานะการจ่ายพัสดุกลับเป็นอนุมัติแล้วเรียบร้อย' });
    }

    if (action === 'DISPENSE') {
      if (requisition.status === 'DISPENSED') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ คำขอเบิกนี้ได้รับการจ่ายพัสดุไปแล้ว',
            currentStatus: requisition.status,
          },
          { status: 409 }
        );
      }
      if (requisition.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'สามารถจ่ายพัสดุได้เฉพาะคำขอที่ได้รับการอนุมัติแล้วเท่านั้น' },
          { status: 400 }
        );
      }

      // Officer dispenses items and deducts stock FIFO with adjustments
      let actualTotalCost = 0;

      for (const reqItem of requisition.items) {
        const adj = Array.isArray(itemAdjustments)
          ? itemAdjustments.find((a: any) => a.id === reqItem.id)
          : null;

        const isAllowed = adj ? adj.allowed !== false : true;
        if (!isAllowed) {
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
        let itemTotalCost = 0;

        const isSub = reqItem.isSubUnit === true;
        const ratio = Number(reqItem.item?.conversionRatio) > 0 ? Number(reqItem.item?.conversionRatio) : 1;

        // Fetch lots FIFO: sorted by expiryDate ascending
        const whereLots: any = {
          itemId: reqItem.itemId,
          OR: [
            { quantityRemaining: { gt: 0 } },
            { openPackRemainder: { gt: 0 } },
          ],
        };
        // Strict safety lock: if requested for human use, NEVER deduct expired lots
        if (requisition.useTarget === 'HUMAN') {
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
          // ==========================================
          // Case 1: Whole Pack Requisition
          // ==========================================
          // Deduct whole packs from lot.quantityRemaining, keeping openPackRemainder intact for sub-unit users
          for (const lot of availableLots) {
            if (remainingToDeduct <= 0) break;
            if (lot.quantityRemaining <= 0) continue;

            const deductFromThisLot = Math.min(lot.quantityRemaining, remainingToDeduct);
            const costForThisDeduction = deductFromThisLot * lot.unitCost;
            const newQty = Math.max(0, lot.quantityRemaining - deductFromThisLot);
            const openRem = lot.openPackRemainder || 0;
            const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
            const newPieces = Math.max(0, (newQty * lotPackSize) + openRem);

            // Update lot
            await prisma.stockLot.update({
              where: { id: lot.id },
              data: {
                quantityRemaining: newQty,
                piecesRemaining: newPieces,
              },
            });

            // Update individual StockLotBoxes in sequential order (1..N) — sealed boxes only
            const availableBoxes = await prisma.stockLotBox.findMany({
              where: {
                lotId: lot.id,
                status: 'IN_STOCK',
              },
              orderBy: { boxNumberInLot: 'asc' },
              take: deductFromThisLot,
            });

            if (availableBoxes.length > 0) {
              await prisma.stockLotBox.updateMany({
                where: { id: { in: availableBoxes.map((b) => b.id) } },
                data: { status: 'DISPENSED', depletedAt: new Date() },
              });
            }

            // Create stock transaction
            await prisma.stockTransaction.create({
              data: {
                itemId: reqItem.itemId,
                lotId: lot.id,
                type: 'OUT_REQUISITION',
                quantity: -deductFromThisLot,
                unitCost: lot.unitCost,
                totalCost: costForThisDeduction,
                courseId: requisition.courseId,
                referenceNumber: requisition.requestNumber,
                createdById: userId,
                note: dispenseNote
                  ? `จ่ายตามคำขอ ${requisition.requestNumber} (วิชา ${requisition.course?.code || ''}) | หมายเหตุ: ${String(dispenseNote).trim()}`
                  : `จ่ายตามคำขอ ${requisition.requestNumber} (วิชา ${requisition.course?.code || ''})`,
              },
            });

            // Update individual RepackPackItems in sequential order (1..N) if this lot belongs to a repack sub-lot
            const availablePacks = await prisma.repackPackItem.findMany({
              where: {
                repackRecord: { subLotNumber: lot.lotNumber },
                status: 'AVAILABLE',
              },
              orderBy: { packNumber: 'asc' },
              take: deductFromThisLot,
            });

            if (availablePacks.length > 0) {
              await prisma.repackPackItem.updateMany({
                where: { id: { in: availablePacks.map((p) => p.id) } },
                data: {
                  status: 'DISPENSED',
                  dispensedTo: requisition.user ? `${requisition.user.name} (${requisition.requestNumber})` : requisition.requestNumber,
                  dispensedAt: new Date(),
                },
              });
            }

            itemTotalCost += costForThisDeduction;
            remainingToDeduct -= deductFromThisLot;
          }
        } else {
          // ==========================================
          // Case 2: Sub-Unit Requisition (Option A)
          // ==========================================
          // remainingToDeduct is in sub-units (e.g. 10 or 100 or 110 pieces)
          let piecesNeeded = remainingToDeduct;

          // Step 1 (Option A Priority): If piecesNeeded >= lotPackSize, prioritize dispensing whole sealed packs first!
          for (const lot of availableLots) {
            if (piecesNeeded <= 0) break;
            if (lot.quantityRemaining <= 0) continue;

            const lotPackSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
            if (lotPackSize <= 1 || piecesNeeded < lotPackSize) continue;

            const maxWholePacksForNeeded = Math.floor(piecesNeeded / lotPackSize);
            const deductPacks = Math.min(lot.quantityRemaining, maxWholePacksForNeeded);
            if (deductPacks <= 0) continue;

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

            // Update StockLotBox (sealed boxes only)
            const availableBoxes = await prisma.stockLotBox.findMany({
              where: { lotId: lot.id, status: 'IN_STOCK' },
              orderBy: { boxNumberInLot: 'asc' },
              take: deductPacks,
            });
            if (availableBoxes.length > 0) {
              await prisma.stockLotBox.updateMany({
                where: { id: { in: availableBoxes.map((b) => b.id) } },
                data: { status: 'DISPENSED', depletedAt: new Date() },
              });
            }

            // Repack items
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
                  dispensedTo: requisition.user ? `${requisition.user.name} (${requisition.requestNumber})` : requisition.requestNumber,
                  dispensedAt: new Date(),
                },
              });
            }

            // Stock transaction
            await prisma.stockTransaction.create({
              data: {
                itemId: reqItem.itemId,
                lotId: lot.id,
                type: 'OUT_REQUISITION',
                quantity: -deductPacks,
                unitCost: lot.unitCost,
                totalCost: costForPacks,
                courseId: requisition.courseId,
                referenceNumber: requisition.requestNumber,
                createdById: userId,
                note: dispenseNote
                  ? `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * lotPackSize} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอ ${requisition.requestNumber} | ${String(dispenseNote).trim()}`
                  : `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * lotPackSize} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอ ${requisition.requestNumber}`,
              },
            });

            itemTotalCost += costForPacks;
            piecesNeeded -= deductPacks * lotPackSize;
          }

          // Step 2: Fulfill remaining fractional pieces (or any remaining pieces if whole packs ran out)
          if (piecesNeeded > 0) {
            // Step 2A: Check loose pieces in open pack (openPackRemainder > 0)
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

              // If the opened pack is now completely empty, mark the IN_USE box as DISPENSED
              if (newOpen === 0) {
                const inUseBox = await prisma.stockLotBox.findFirst({
                  where: { lotId: lot.id, status: 'IN_USE' },
                  orderBy: { boxNumberInLot: 'asc' },
                });
                if (inUseBox) {
                  await prisma.stockLotBox.update({
                    where: { id: inUseBox.id },
                    data: { status: 'DISPENSED', depletedAt: new Date() },
                  });
                }
              }

              await prisma.stockTransaction.create({
                data: {
                  itemId: reqItem.itemId,
                  lotId: lot.id,
                  type: 'OUT_REQUISITION',
                  quantity: 0,
                  unitCost: lot.unitCost,
                  totalCost: costForLoose,
                  courseId: requisition.courseId,
                  referenceNumber: requisition.requestNumber,
                  createdById: userId,
                  note: dispenseNote
                    ? `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอ ${requisition.requestNumber} | ${String(dispenseNote).trim()}`
                    : `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอ ${requisition.requestNumber}`,
                },
              });

              itemTotalCost += costForLoose;
              piecesNeeded -= takeFromOpen;
            }

            // Step 2B: If still need pieces, open new whole pack(s) and keep leftover in openPackRemainder
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

                // Update StockLotBox for opened pack(s)
                const availableBoxes = await prisma.stockLotBox.findMany({
                  where: { lotId: lot.id, status: 'IN_STOCK' },
                  orderBy: { boxNumberInLot: 'asc' },
                  take: packsToOpen,
                });
                if (availableBoxes.length > 0) {
                  if (packsToOpen > 1) {
                    const fullyUsedBoxes = availableBoxes.slice(0, -1);
                    await prisma.stockLotBox.updateMany({
                      where: { id: { in: fullyUsedBoxes.map((b) => b.id) } },
                      data: { status: 'DISPENSED', openedAt: new Date(), depletedAt: new Date() },
                    });
                  }
                  const lastBox = availableBoxes[availableBoxes.length - 1];
                  await prisma.stockLotBox.update({
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

                await prisma.stockTransaction.create({
                  data: {
                    itemId: reqItem.itemId,
                    lotId: lot.id,
                    type: 'OUT_REQUISITION',
                    quantity: Math.round(-(piecesToDeduct / lotPackSize)),
                    unitCost: lot.unitCost,
                    totalCost: costForDispensedPieces,
                    courseId: requisition.courseId,
                    referenceNumber: requisition.requestNumber,
                    createdById: userId,
                    note: dispenseNote
                      ? `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอ ${requisition.requestNumber} | ${String(dispenseNote).trim()}`
                      : `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอ ${requisition.requestNumber}`,
                  },
                });

                itemTotalCost += costForDispensedPieces;
                piecesNeeded -= piecesToDeduct;
              }
            }
          }

          remainingToDeduct = piecesNeeded;
        }

        const actualDispensed = requestedTarget - remainingToDeduct;

        // Update requisition item with dispensed quantity and actual cost
        await prisma.requisitionItem.update({
          where: { id: reqItem.id },
          data: {
            quantityDispensed: actualDispensed,
            unitCost: actualDispensed > 0 ? itemTotalCost / actualDispensed : 0,
            totalCost: itemTotalCost,
          },
        });

        actualTotalCost += itemTotalCost;
      }

      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          status: 'DISPENSED',
          officerId: userId,
          dispensedAt: new Date(),
          dispenseNote: dispenseNote ? String(dispenseNote).trim() : null,
          totalCost: actualTotalCost,
        },
        include: {
          items: { include: { item: true } },
          course: true,
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            checkoutNote: dispenseNote ? String(dispenseNote).trim() : undefined,
          },
        }).catch((e) => console.error('Failed to sync linked borrow checkout note:', e));
      }

      // Notify student
      createNotification({
        userId: requisition.userId,
        title: 'จ่ายพัสดุเรียบร้อยแล้ว 📦',
        message: `เจ้าหน้าที่ได้จ่ายพัสดุตามคำขอเบิกเลขที่ ${requisition.requestNumber} เรียบร้อยแล้ว`,
        type: 'APPROVAL',
        linkUrl: '/requisitions',
        entityType: 'REQUISITION',
        entityId: requisition.id,
      }).catch(() => {});

      logActivity({
        userId,
        action: 'DISPENSE',
        entityType: 'REQUISITION',
        entityId: requisition.id,
        details: {
          requestNumber: requisition.requestNumber,
          totalCost: actualTotalCost,
          itemCount: requisition.items.length,
          note: dispenseNote ? String(dispenseNote).trim() : null,
        },
      });

      invalidateCache('items:');
      invalidateCache('dashboard:');
      return respondUpdated(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Requisition dispense error:', error);
    return NextResponse.json({ error: error.message || 'Dispense failed' }, { status: 500 });
  }
}


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decoded = decodeURIComponent(id).trim();

    const requisition = await prisma.requisitionRequest.findFirst({
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
                unit: true,
                usageUnit: true,
                conversionRatio: true,
                category: true,
              },
            },
          },
        },
        borrowRequest: {
          include: {
            items: {
              include: {
                item: true,
                asset: true,
              },
            },
          },
        },
      },
    });

    if (!requisition) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคำขอเบิกพัสดุ' }, { status: 404 });
    }

    return NextResponse.json(requisition);
  } catch (error: any) {
    console.error('Fetch requisition request error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเบิก' }, { status: 500 });
  }
}
