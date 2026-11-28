import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { createNotification, notifyRoles, notifyAdvisorByName } from '@/lib/notifications';
import { canUserApprove } from '@/lib/approval-scope';
import { logActivity } from '@/lib/activity-log';
import { formatAcknowledgeDisplay, formatUserName } from '@/lib/user-utils';
import { parseBangkokDateTime } from '@/lib/date-time-utils';
import { getSessionFromRequest } from '@/lib/session';
import {
  DispenseActionError,
  allocateAndCheckoutEquipmentItem,
  dispenseConsumableItemFifo,
  generateUniqueRequestNumber,
} from '@/lib/dispense-helpers';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromRequest(req);
    const effectiveUserId = session?.uid;
    const { id } = await params;
    const body = await req.json();
    const {
      action,
      userId,
      reason,
      itemAdjustments,
      dispenseNote,
      addedRequisitionItems,
      addedBorrowItems,
      addedBorrowReturnDate,
    } = body;

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
      if (!effectiveUserId) {
        return NextResponse.json(
          { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการรับทราบรายการ' },
          { status: 401 }
        );
      }
      const actor = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { id: true, role: true, status: true },
      });
      if (
        !actor ||
        (actor.status && actor.status !== 'ACTIVE') ||
        !['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER'].includes(actor.role)
      ) {
        return NextResponse.json(
          { error: 'ท่านไม่มีสิทธิ์กดรับทราบคำขอเบิกวัสดุสิ้นเปลือง' },
          { status: 403 }
        );
      }

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

      // Notify student and scope approvers (awaited)
      const ackDisplay = formatAcknowledgeDisplay(body.advisorName || requisition.advisorName);
      const notifTitle = ackDisplay.isStaff ? 'แอดมิน/เจ้าหน้าที่รับทราบคำขอเบิกแล้ว' : 'อาจารย์รับทราบคำขอเบิกแล้ว';
      const notifMessage = `${ackDisplay.name} ได้กดรับทราบคำขอเบิกเลขที่ ${requisition.requestNumber} แล้ว`;

      await Promise.allSettled([
        createNotification({
          userId: requisition.userId,
          title: notifTitle,
          message: notifMessage,
          type: 'INSTRUCTOR_ACK',
          linkUrl: '/requisitions',
          entityType: 'REQUISITION',
          entityId: requisition.id,
        }),
        requisition.status === 'PENDING'
          ? notifyRoles(
              ['OFFICER', 'ADMIN', 'APPROVER'],
              {
                title: 'อาจารย์รับทราบคำขอเบิกแล้ว พร้อมรออนุมัติ ✅',
                message: `${ackDisplay.name} รับทราบคำขอเบิกเลขที่ ${requisition.requestNumber} (${requisition.purpose || 'เบิกวัสดุ'}) แล้ว พร้อมให้ผู้อนุมัติพิจารณา`,
                type: 'APPROVAL',
                priority: 'HIGH',
                linkUrl: `/approvals?id=${requisition.id}&type=REQUISITION`,
                entityType: 'REQUISITION',
                entityId: requisition.id,
              },
              'REQUISITION',
              { excludeUserId: effectiveUserId }
            )
          : Promise.resolve(null),
      ]);

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
        !canUserApprove(approverUser, 'REQUISITION')
      ) {
        return NextResponse.json(
          { error: 'ท่านไม่มีสิทธิ์อนุมัติรายการเบิกวัสดุสิ้นเปลือง (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
          { status: 403 }
        );
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
          approverId: effectiveUserId,
          approvedAt: new Date(),
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            status: 'APPROVED',
            approverId: effectiveUserId,
            approvedAt: new Date(),
          },
        }).catch((e) => console.error('Failed to sync linked borrow approve:', e));
      }

      // Notify student and OFFICER & ADMIN (awaited so Serverless doesn't abort Web Push)
      const dateNeededText = requisition.dateNeeded
        ? new Date(requisition.dateNeeded).toLocaleDateString('th-TH')
        : 'ตามกำหนดการ';

      await Promise.allSettled([
        createNotification({
          userId: requisition.userId,
          title: 'คำขอเบิกพัสดุได้รับการอนุมัติแล้ว 🎉',
          message: `คำขอเบิกเลขที่ ${requisition.requestNumber} ได้รับการอนุมัติแล้ว กรุณาติดต่อรับพัสดุที่ห้องแล็บ`,
          type: 'APPROVAL',
          priority: 'HIGH',
          linkUrl: '/requisitions',
          entityType: 'REQUISITION',
          entityId: requisition.id,
        }),
        notifyRoles(['OFFICER', 'ADMIN'], {
          title: '📦 มีรายการเบิกอนุมัติแล้ว รอจัดเตรียม/จ่ายของ',
          message: `คำขอเบิกเลขที่ ${requisition.requestNumber} (${requisition.course?.code ? `วิชา ${requisition.course.code}` : requisition.purpose || 'เบิกวัสดุ'}) ได้รับอนุมัติแล้ว มีกำหนดใช้: ${dateNeededText}`,
          type: 'STATUS_UPDATE',
          priority: 'HIGH',
          linkUrl: '/requisitions',
          entityType: 'REQUISITION',
          entityId: requisition.id,
        }),
      ]);

      logActivity({
        userId: effectiveUserId,
        action: 'APPROVE',
        entityType: 'REQUISITION',
        entityId: requisition.id,
        details: { requestNumber: requisition.requestNumber, totalItems: requisition.items.length },
      });

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
        !canUserApprove(approverUser, 'REQUISITION')
      ) {
        return NextResponse.json(
          { error: 'ท่านไม่มีสิทธิ์ปฏิเสธรายการเบิกวัสดุสิ้นเปลือง (อยู่นอกเหนือขอบเขตความรับผิดชอบ)' },
          { status: 403 }
        );
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
          approverId: effectiveUserId,
          rejectionReason: reason || 'ไม่อนุมัติ',
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            status: 'REJECTED',
            approverId: effectiveUserId,
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
      if (!effectiveUserId) {
        return NextResponse.json(
          { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการจ่ายพัสดุ' },
          { status: 401 }
        );
      }
      const actor = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { id: true, role: true, status: true },
      });
      if (
        !actor ||
        (actor.status && actor.status !== 'ACTIVE') ||
        !['ADMIN', 'OFFICER', 'APPROVER'].includes(actor.role)
      ) {
        return NextResponse.json(
          { error: 'สงวนสิทธิ์เฉพาะเจ้าหน้าที่ห้องปฏิบัติการและผู้ดูแลระบบในการจ่ายพัสดุ' },
          { status: 403 }
        );
      }
      const actorUserId = actor.id;
      const effectiveNote = dispenseNote ? String(dispenseNote).trim() : null;
      const validAddedReq = Array.isArray(addedRequisitionItems)
        ? addedRequisitionItems.filter((it: any) => it?.itemId && Number(it.quantity) > 0)
        : [];
      const validAddedBorrow = Array.isArray(addedBorrowItems)
        ? addedBorrowItems.filter((it: any) => it?.itemId && Number(it.quantity) > 0)
        : [];

      const { updated, freshRequisition, onSiteAddedSummaries } = await prisma.$transaction(
        async (tx) => {
          const currentReq = await tx.requisitionRequest.findUnique({
            where: { id },
            include: {
              items: { include: { item: true } },
              course: true,
              borrowRequest: true,
              user: true,
            },
          });

          if (!currentReq) {
            throw new DispenseActionError('ไม่พบรายการคำขอเบิก', 404);
          }

          if (currentReq.status === 'DISPENSED') {
            throw new DispenseActionError(
              '⚠️ คำขอเบิกนี้ได้รับการจ่ายพัสดุไปแล้ว',
              409,
              'CONCURRENCY_CONFLICT'
            );
          }
          if (currentReq.status !== 'APPROVED') {
            throw new DispenseActionError(
              'สามารถจ่ายพัสดุได้เฉพาะคำขอที่ได้รับการอนุมัติแล้วเท่านั้น',
              400
            );
          }

          let actualTotalCost = 0;
          const addedSummaries: string[] = [];
          const recipientName = currentReq.user ? formatUserName(currentReq.user) : null;

          // 1. จ่ายรายการวัสดุที่ขอมาเดิม (ปรับจำนวนเพิ่ม/ลดได้ หรือไม่อนุญาต)
          for (const reqItem of currentReq.items) {
            const adj = Array.isArray(itemAdjustments)
              ? itemAdjustments.find((a: any) => a.id === reqItem.id)
              : null;

            const isAllowed = adj ? adj.allowed !== false : true;
            if (!isAllowed) {
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

            const qtyTarget =
              adj && adj.quantity !== undefined
                ? Math.max(0, Number(adj.quantity))
                : reqItem.quantityRequested;

            const dispensed = await dispenseConsumableItemFifo(tx, {
              itemId: reqItem.itemId,
              quantityTarget: qtyTarget,
              isSubUnit: reqItem.isSubUnit === true,
              requestedUnit: reqItem.requestedUnit || null,
              preferredLotId: (adj as any)?.lotId || null,
              useTarget: currentReq.useTarget,
              courseId: currentReq.courseId,
              referenceNumber: currentReq.requestNumber,
              actorUserId,
              recipientLabel: recipientName,
              noteLabel: `ตามคำขอ ${currentReq.requestNumber} (วิชา ${currentReq.course?.code || ''})`,
              noteSuffix: effectiveNote ? `หมายเหตุ: ${effectiveNote}` : null,
            });

            await tx.requisitionItem.update({
              where: { id: reqItem.id },
              data: {
                quantityDispensed: dispensed.actualDispensed,
                unitCost: dispensed.unitCost,
                totalCost: dispensed.itemCost,
              },
            });

            actualTotalCost += dispensed.itemCost;
          }

          // 2. เพิ่มวัสดุสิ้นเปลืองหน้างาน (ถ้ามี)
          for (const addReq of validAddedReq) {
            const qty = Math.max(1, Math.round(Number(addReq.quantity) || 1));
            const dispensed = await dispenseConsumableItemFifo(tx, {
              itemId: addReq.itemId,
              quantityTarget: qty,
              isSubUnit: Boolean(addReq.isSubUnit),
              requestedUnit: addReq.requestedUnit || null,
              preferredLotId: addReq.lotId || null,
              useTarget: currentReq.useTarget,
              courseId: currentReq.courseId,
              referenceNumber: currentReq.requestNumber,
              actorUserId,
              recipientLabel: recipientName,
              noteLabel: `เพิ่มหน้างานตามคำขอ ${currentReq.requestNumber}`,
              noteSuffix: effectiveNote ? `หมายเหตุ: ${effectiveNote}` : null,
            });

            await tx.requisitionItem.create({
              data: {
                requisitionRequestId: currentReq.id,
                itemId: addReq.itemId,
                quantityRequested: qty,
                quantityDispensed: dispensed.actualDispensed,
                requestedUnit: dispensed.unitLabel,
                isSubUnit: dispensed.isSubUnit,
                unitCost: dispensed.unitCost,
                totalCost: dispensed.itemCost,
              },
            });

            actualTotalCost += dispensed.itemCost;
            addedSummaries.push(`${dispensed.itemName} ${dispensed.actualDispensed} ${dispensed.unitLabel}`);
          }

          // 3. เพิ่มครุภัณฑ์หน้างาน (ถ้ามี) -> สร้าง BorrowRequest ผูกให้อัตโนมัติหรือเพิ่มเข้าใบยืมคู่เดิม
          if (validAddedBorrow.length > 0) {
            const returnDateVal = addedBorrowReturnDate
              ? parseBangkokDateTime(addedBorrowReturnDate)
              : new Date(Date.now() + 4 * 60 * 60 * 1000);

            let targetBorrowId = currentReq.borrowRequest?.id || null;
            if (!targetBorrowId) {
              const newBorrowNum = await generateUniqueRequestNumber(tx, 'BRW');
              const createdBorrow = await tx.borrowRequest.create({
                data: {
                  requestNumber: newBorrowNum,
                  userId: currentReq.userId,
                  courseId: currentReq.courseId,
                  advisorName: currentReq.advisorName,
                  purpose: currentReq.purpose,
                  useTarget: currentReq.useTarget,
                  borrowDate: new Date(),
                  expectedReturnDate: returnDateVal,
                  status: 'BORROWED',
                  approverId: currentReq.approverId || actorUserId,
                  approvedAt: currentReq.approvedAt || new Date(),
                  officerId: actorUserId,
                  checkedOutAt: new Date(),
                  checkoutNote: effectiveNote || `เพิ่มครุภัณฑ์หน้างานขณะจ่ายวัสดุ ${currentReq.requestNumber}`,
                  instructorAcknowledged: currentReq.instructorAcknowledged,
                  acknowledgedAt: currentReq.acknowledgedAt,
                  requisitionRequestId: currentReq.id,
                },
                select: { id: true },
              });
              targetBorrowId = createdBorrow.id;
            } else {
              await tx.borrowRequest.update({
                where: { id: targetBorrowId },
                data: {
                  status: 'BORROWED',
                  officerId: actorUserId,
                  checkedOutAt: new Date(),
                },
              });
            }

            for (const addEq of validAddedBorrow) {
              const alloc = await allocateAndCheckoutEquipmentItem(tx, {
                borrowRequestId: targetBorrowId,
                itemId: addEq.itemId,
                quantity: Number(addEq.quantity) || 1,
                explicitAssetIds: Array.isArray(addEq.selectedAssetIds)
                  ? addEq.selectedAssetIds
                  : Array.isArray(addEq.assetIds)
                  ? addEq.assetIds
                  : [],
              });
              const codesTag =
                alloc.assignedAssetCodes.length > 0 ? ` [${alloc.assignedAssetCodes.join(', ')}]` : '';
              addedSummaries.push(`${alloc.itemName} ${alloc.allocatedCount} ${alloc.unit}${codesTag}`);
            }
          }

          const finalDispenseNote =
            addedSummaries.length > 0
              ? [effectiveNote, `เพิ่มหน้างาน: ${addedSummaries.join(', ')}`].filter(Boolean).join(' | ')
              : effectiveNote;

          const updatedReq = await tx.requisitionRequest.update({
            where: { id },
            data: {
              status: 'DISPENSED',
              officerId: actorUserId,
              dispensedAt: new Date(),
              dispenseNote: finalDispenseNote,
              totalCost: actualTotalCost,
            },
            include: {
              items: { include: { item: true } },
              course: true,
              borrowRequest: true,
            },
          });

          if (currentReq.borrowRequest) {
            await tx.borrowRequest
              .update({
                where: { id: currentReq.borrowRequest.id },
                data: {
                  checkoutNote: finalDispenseNote ?? undefined,
                },
              })
              .catch((e) => console.error('Failed to sync linked borrow checkout note:', e));
          }

          return {
            updated: updatedReq,
            freshRequisition: currentReq,
            onSiteAddedSummaries: addedSummaries,
          };
        },
        { timeout: 25000 }
      );

      // Notify student & advisor (awaited)
      const addedSuffix =
        onSiteAddedSummaries.length > 0 ? ` (เพิ่มหน้างาน: ${onSiteAddedSummaries.join(', ')})` : '';
      const notifyPromises: Promise<any>[] = [
        createNotification({
          userId: freshRequisition.userId,
          title: 'จ่ายพัสดุเรียบร้อยแล้ว 📦',
          message: `เจ้าหน้าที่ได้จ่ายพัสดุตามคำขอเบิกเลขที่ ${freshRequisition.requestNumber} เรียบร้อยแล้ว${addedSuffix}`,
          type: 'APPROVAL',
          linkUrl: '/requisitions',
          entityType: 'REQUISITION',
          entityId: freshRequisition.id,
        }),
      ];

      const advisorTarget = freshRequisition.advisorName || freshRequisition.course?.instructorName;
      if (onSiteAddedSummaries.length > 0 && advisorTarget) {
        notifyPromises.push(
          notifyAdvisorByName(advisorTarget, {
            title: 'แจ้งเตือน: เจ้าหน้าที่เพิ่มรายการหน้างานตอนจ่ายของ 📋',
            message: `คำขอเบิก ${freshRequisition.requestNumber} ของ ${formatUserName(freshRequisition.user) || 'นิสิต'} มีการเพิ่มรายการหน้างาน: ${onSiteAddedSummaries.join(', ')}`,
            type: 'STATUS_UPDATE',
            priority: 'NORMAL',
            linkUrl: '/requisitions',
            entityType: 'REQUISITION',
            entityId: freshRequisition.id,
          })
        );
      }

      await Promise.allSettled(notifyPromises);

      logActivity({
        userId: actorUserId,
        action: 'DISPENSE',
        entityType: 'REQUISITION',
        entityId: freshRequisition.id,
        details: {
          requestNumber: freshRequisition.requestNumber,
          totalCost: updated.totalCost,
          itemCount: updated.items.length,
          note: updated.dispenseNote,
          ...(onSiteAddedSummaries.length > 0 ? { onSiteAdded: onSiteAddedSummaries } : {}),
        },
      });

      return respondUpdated(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof DispenseActionError) {
      if (error.code === 'CONCURRENCY_CONFLICT') {
        return NextResponse.json(
          { error: error.code, message: error.message },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Requisition dispense error:', error);
    return NextResponse.json({ error: 'Dispense failed' }, { status: 500 });
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
