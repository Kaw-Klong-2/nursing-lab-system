import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { logActivity } from '@/lib/activity-log';
import { formatUserName } from '@/lib/user-utils';
import { getSessionFromRequest } from '@/lib/session';

class ReturnValidationError extends Error {}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    const effectiveOperatorId = session?.uid;
    if (!effectiveOperatorId) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการรับคืนวัสดุสิ้นเปลือง' }, { status: 401 });
    }

    const operator = await prisma.user.findUnique({
      where: { id: effectiveOperatorId },
      select: { id: true, role: true, status: true, name: true },
    });
    if (
      !operator ||
      (operator.status && operator.status !== 'ACTIVE') ||
      !['ADMIN', 'OFFICER', 'APPROVER'].includes(operator.role)
    ) {
      return NextResponse.json(
        { error: 'สงวนสิทธิ์เฉพาะเจ้าหน้าที่ห้องปฏิบัติการและผู้ดูแลระบบเท่านั้น' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { requisitionId, returns, generalNote } = body;

    if (!requisitionId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสคำขอเบิกพัสดุ' }, { status: 400 });
    }

    if (!Array.isArray(returns) || returns.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุรายการวัสดุสิ้นเปลืองที่ต้องการส่งคืน' }, { status: 400 });
    }

    // ดึงข้อมูลคำขอเบิกพัสดุ
    const requisition = await prisma.requisitionRequest.findUnique({
      where: { id: requisitionId },
      include: {
        user: true,
        course: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!requisition) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคำขอเบิกพัสดุในระบบ' }, { status: 404 });
    }

    if (requisition.status !== 'DISPENSED') {
      return NextResponse.json(
        { error: `ไม่สามารถรับคืนวัสดุได้เนื่องจากคำขอนี้มีสถานะ "${requisition.status}" (ต้องเป็นสถานะจ่ายพัสดุแล้วเท่านั้น)` },
        { status: 400 }
      );
    }

    const now = new Date();
    let totalSavedCost = 0;
    let totalItemsReturnedCount = 0;

    const result = await prisma.$transaction(async (tx) => {
      for (const ret of returns) {
        const reqItem = requisition.items.find((i) => i.id === ret.requisitionItemId);
        if (!reqItem) continue;

        const returnQty = Math.max(0, Number(ret.quantity) || 0);
        if (returnQty <= 0) continue;

        const maxAvailableToReturn = Math.max(0, reqItem.quantityDispensed - (reqItem.quantityReturned || 0));
        if (returnQty > maxAvailableToReturn) {
          throw new ReturnValidationError(
            `จำนวนคืนของ "${reqItem.item.name}" (${returnQty}) เกินจำนวนที่เบิกไปคงเหลือ (${maxAvailableToReturn})`
          );
        }

        const condition = ret.condition || 'SEALED_INTACT'; // 'SEALED_INTACT', 'UNSEALED_USABLE_SIM', 'DAMAGED_DISCARD'
        const note = ret.note ? String(ret.note).trim() : '';
        const itemRatio = Number(reqItem.item.conversionRatio) > 0 ? Number(reqItem.item.conversionRatio) : 1;
        const isSub = reqItem.isSubUnit === true || ret.isSubUnit === true;

        // reqItem.unitCost ถูกบันทึกเป็นต้นทุนต่อหน่วยที่จ่ายจริงแล้ว (หากเบิกย่อยจะเป็นราคาต่อชิ้นย่อยแล้ว ไม่ต้องหาร itemRatio ซ้ำ)
        const unitPrice = Number(reqItem.unitCost) || 0;
        const lineDeductCost = returnQty * unitPrice;

        totalSavedCost += lineDeductCost;
        totalItemsReturnedCount += returnQty;

        // 1. อัปเดตรายการ RequisitionItem
        const newQtyReturned = (reqItem.quantityReturned || 0) + returnQty;
        const newRemainingDispensed = Math.max(0, reqItem.quantityDispensed - newQtyReturned);
        const newLineTotalCost = Math.max(0, newRemainingDispensed * unitPrice);
        const updatedReturnNote = note
          ? (reqItem.returnNote ? `${reqItem.returnNote} | ${note}` : note)
          : reqItem.returnNote;

        await tx.requisitionItem.update({
          where: { id: reqItem.id },
          data: {
            quantityReturned: newQtyReturned,
            returnCondition: condition,
            returnedAt: now,
            returnNote: updatedReturnNote,
            totalCost: newLineTotalCost,
          },
        });

        // ซิงก์สถานะในหน่วยความจำเผื่อมีรายการซ้ำใน payload
        reqItem.quantityReturned = newQtyReturned;
        reqItem.returnNote = updatedReturnNote;

        // 2. หากสภาพพร้อมใช้ (SEALED_INTACT หรือ UNSEALED_USABLE_SIM) คืนสต็อกเข้าคลัง
        if (condition === 'SEALED_INTACT' || condition === 'UNSEALED_USABLE_SIM') {
          // ดึงล็อตล่าสุดภายใน transaction เสมอ เพื่อป้องกันข้อมูลล็อตค้างจากรอบก่อนหน้า
          let targetLot = await tx.stockLot.findFirst({
            where: { itemId: reqItem.itemId, quantityRemaining: { gte: 0 } },
            orderBy: [{ expiryDate: 'desc' }, { receivedDate: 'desc' }, { createdAt: 'desc' }],
          });
          if (!targetLot) {
            targetLot = await tx.stockLot.findFirst({
              where: { itemId: reqItem.itemId },
              orderBy: [{ expiryDate: 'desc' }, { receivedDate: 'desc' }],
            });
          }

          if (targetLot) {
            const pSize = Number(targetLot.packSize) > 0 ? Number(targetLot.packSize) : itemRatio;
            const basePieces =
              typeof targetLot.piecesRemaining === 'number'
                ? targetLot.piecesRemaining
                : (targetLot.quantityRemaining * pSize) + (targetLot.openPackRemainder || 0);

            if (isSub && pSize > 1) {
              // คืนแบบหน่วยย่อย
              const currentOpenRem = targetLot.openPackRemainder || 0;
              const newOpenRem = currentOpenRem + returnQty;
              const consolidatedPacks = Math.floor(newOpenRem / pSize);
              const remainderPieces = newOpenRem % pSize;

              const newQuantityRem = targetLot.quantityRemaining + consolidatedPacks;
              const newPiecesRem = Math.max(0, basePieces + returnQty);

              await tx.stockLot.update({
                where: { id: targetLot.id },
                data: {
                  quantityRemaining: newQuantityRem,
                  piecesRemaining: newPiecesRem,
                  openPackRemainder: remainderPieces,
                },
              });
            } else {
              // คืนแบบหน่วยใหญ่ (กล่อง/ห่อเต็ม)
              const newQuantityRem = targetLot.quantityRemaining + returnQty;
              const newPiecesRem = Math.max(0, basePieces + (returnQty * pSize));

              await tx.stockLot.update({
                where: { id: targetLot.id },
                data: {
                  quantityRemaining: newQuantityRem,
                  piecesRemaining: newPiecesRem,
                },
              });
            }

            // บันทึก StockTransaction ประเภท RETURN_RESTOCK
            const conditionLabel =
              condition === 'SEALED_INTACT'
                ? 'ซองสมบูรณ์ 100% (เข้าคลังหลัก)'
                : 'ฉีกซองแล้วแต่สะอาด (เข้าคลังฝึกหุ่น Sim Lab)';

            await tx.stockTransaction.create({
              data: {
                itemId: reqItem.itemId,
                lotId: targetLot.id,
                type: 'RETURN_RESTOCK',
                quantity: returnQty,
                unitCost: unitPrice,
                totalCost: lineDeductCost,
                courseId: requisition.courseId,
                referenceNumber: requisition.requestNumber,
                createdById: effectiveOperatorId,
                note: `รับคืนวัสดุเหลือใช้ (${conditionLabel}) จำนวน ${returnQty} ${reqItem.requestedUnit || reqItem.item.unit} จากคำขอ ${requisition.requestNumber} [ผู้คืน: ${formatUserName(requisition.user)}]${note ? ` - ${note}` : ''}`,
              },
            });
          }
        } else {
          // กรณี DAMAGED_DISCARD (ชำรุด/ปนเปื้อน ต้องทิ้ง)
          await tx.stockTransaction.create({
            data: {
              itemId: reqItem.itemId,
              type: 'WRITE_OFF',
              quantity: 0,
              unitCost: unitPrice,
              totalCost: lineDeductCost,
              courseId: requisition.courseId,
              referenceNumber: requisition.requestNumber,
              createdById: effectiveOperatorId,
              note: `รับคืนวัสดุเหลือใช้ที่ชำรุด/ปนเปื้อน (ส่งกำจัดตามระเบียบขยะแล็ป) จำนวน ${returnQty} ${reqItem.requestedUnit || reqItem.item.unit} จากคำขอ ${requisition.requestNumber}${note ? ` - ${note}` : ''}`,
            },
          });
        }
      }

      // 3. คำนวณต้นทุนรวมสุทธิของใบเบิกใหม่
      const allUpdatedItems = await tx.requisitionItem.findMany({
        where: { requisitionRequestId: requisition.id },
      });
      const newTotalRequisitionCost = allUpdatedItems.reduce((acc, it) => acc + (it.totalCost || 0), 0);

      const updatedRequisition = await tx.requisitionRequest.update({
        where: { id: requisition.id },
        data: {
          totalCost: newTotalRequisitionCost,
        },
        include: {
          user: true,
          course: true,
          items: {
            include: { item: true },
          },
        },
      });

      return updatedRequisition;
    });

    // ล็อกประวัติกิจกรรม
    logActivity({
      userId: effectiveOperatorId,
      action: 'UPDATE',
      entityType: 'REQUISITION',
      entityId: requisition.id,
      entityTitle: requisition.requestNumber,
      details: `เจ้าหน้าที่ตรวจรับคืนวัสดุสิ้นเปลืองเหลือใช้ตามคำขอ ${requisition.requestNumber} รวม ${totalItemsReturnedCount} ชิ้น (ประหยัดงบ ฿${totalSavedCost.toFixed(2)} บาท)`,
    });

    // Invalidate caches
    invalidateCache('requisitions:');
    invalidateCache('items:');
    invalidateCache('dashboard:');
    invalidateCache('borrow:');

    return NextResponse.json({
      success: true,
      message: `บันทึกการรับคืนวัสดุเหลือใช้เรียบร้อยแล้ว (${totalItemsReturnedCount} รายการ, ประหยัดงบ ฿${totalSavedCost.toFixed(2)} บาท)`,
      requisition: result,
      totalSavedCost,
      totalItemsReturnedCount,
    });
  } catch (error: any) {
    if (error instanceof ReturnValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Consumable return error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการประมวลผลรับคืนวัสดุสิ้นเปลือง' },
      { status: 500 }
    );
  }
}
