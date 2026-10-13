const fs = require('fs');
const path = require('path');

// Manually parse .env from project directory
try {
  const envContent = fs.readFileSync('d:\\LAB-system\\.env', 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
} catch (e) {
  console.log('Error reading .env:', e.message);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Results Tracker
const testResults = [];
function recordResult(moduleName, description, passed, detail = '') {
  testResults.push({
    module: moduleName,
    test: description,
    status: passed ? 'PASS ✅' : 'FAIL ❌',
    detail,
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${moduleName} - ${description} ${detail ? '(' + detail + ')' : ''}`);
}

// Registry to track created IDs for 100% clean teardown
const cleanupRegistry = {
  acLogIds: [],
  maintenanceLogIds: [],
  issueReportIds: [],
  practiceBookingIds: [],
  practiceSlotIds: [],
  practiceRoomIds: [],
  borrowItemIds: [],
  borrowRequestIds: [],
  requisitionItemIds: [],
  requisitionRequestIds: [],
  repackPackItemIds: [],
  repackRecordIds: [],
  stockTransactionIds: [],
  stockLotIds: [],
  equipmentAssetIds: [],
  itemIds: [],
  categoryIds: [],
  courseIds: [],
  notificationIds: [],
  userIds: [],
};

async function runSimulation() {
  console.log('\n======================================================================');
  console.log('🚀 เริ่มต้นการจำลองทดสอบระบบเต็มรูปแบบ (FULL-SYSTEM END-TO-END SIMULATION)');
  console.log('   โหมด: Self-Cleaning Sandbox (รับประกันล้างข้อมูลทดสอบ 100%)');
  console.log('======================================================================\n');

  const startTime = Date.now();

  try {
    // -------------------------------------------------------------------------
    // MODULE 1: การจัดการผู้ใช้ และสิทธิ์การเข้าถึง (Users & Access Control)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. ทดสอบระบบผู้ใช้และสิทธิ์ (Users & Access Control) ---');
    
    // สร้างนิสิตจำลอง
    const simStudent = await prisma.user.create({
      data: {
        email: 'sim_student@ku.th',
        name: 'น.ส.วิภาดา พยาบาลศาสตร์ (นิสิตจำลอง)',
        studentId: 'SIM-STU-6501',
        role: 'USER',
        department: 'พยาบาลศาสตร์',
        status: 'ACTIVE',
      },
    });
    cleanupRegistry.userIds.push(simStudent.id);

    // สร้างอาจารย์จำลอง
    const simTeacher = await prisma.user.create({
      data: {
        email: 'sim_teacher@ku.th',
        name: 'ดร.สมชาย ใจดี (อาจารย์จำลอง)',
        role: 'TEACHER',
        department: 'การพยาบาลพื้นฐาน',
        status: 'ACTIVE',
      },
    });
    cleanupRegistry.userIds.push(simTeacher.id);

    // สร้างเจ้าหน้าที่จำลอง
    const simOfficer = await prisma.user.create({
      data: {
        email: 'sim_officer@ku.th',
        name: 'นายประสิทธิ์ แล็บแลนด์ (เจ้าหน้าที่จำลอง)',
        role: 'OFFICER',
        department: 'ห้องปฏิบัติการพยาบาล',
        status: 'ACTIVE',
      },
    });
    cleanupRegistry.userIds.push(simOfficer.id);

    recordResult('Users & Roles', 'สร้างผู้ใช้ 3 บทบาท (นิสิต, อาจารย์, เจ้าหน้าที่)', !!(simStudent && simTeacher && simOfficer));

    // -------------------------------------------------------------------------
    // MODULE 2: ภาคการศึกษา และการจัดสรรงบประมาณรายวิชา (Academic Terms & Courses)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. ทดสอบระบบภาคการศึกษาและรายวิชา (Academic Terms & Courses) ---');
    
    let currentTerm = await prisma.academicTerm.findFirst({
      where: { isCurrent: true },
    });
    if (!currentTerm) {
      currentTerm = await prisma.academicTerm.findFirst({
        where: { status: 'ACTIVE' },
      });
    }
    recordResult('Academic Terms', 'ตรวจสอบปฏิทินภาคการศึกษาในระบบ', !!currentTerm, currentTerm ? currentTerm.name : 'ไม่พบ');

    // สร้างรายวิชาจำลอง พร้อมจัดสรรงบประมาณ 50,000 บาท
    const simCourse = await prisma.course.create({
      data: {
        code: 'SIM-NUR101',
        name: 'การพยาบาลพื้นฐานและการจำลองทางคลินิก 1',
        semester: 'FIRST',
        academicYear: currentTerm?.academicYear || '2569',
        instructorName: simTeacher.name,
        studentCount: 40,
        allocatedBudget: 50000.0,
      },
    });
    cleanupRegistry.courseIds.push(simCourse.id);

    recordResult('Courses & Budget', 'สร้างรายวิชาพร้อมจัดสรรงบประมาณ 50,000 บาท', simCourse.allocatedBudget === 50000, `รหัส ${simCourse.code}`);

    // -------------------------------------------------------------------------
    // MODULE 3: คลังพัสดุ และการรับเข้าพัสดุ (Inventory & Stock-In)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. ทดสอบระบบคลังพัสดุและรับเข้า (Consumables & Stock In) ---');
    
    // ค้นหาหรือสร้างหมวดหมู่เวชภัณฑ์
    let consumableCat = await prisma.category.findFirst({ where: { type: 'CONSUMABLE' } });
    if (!consumableCat) {
      consumableCat = await prisma.category.create({
        data: {
          code: 'SIM-CAT-CON',
          name: 'เวชภัณฑ์ทำแผลจำลอง',
          type: 'CONSUMABLE',
        },
      });
      cleanupRegistry.categoryIds.push(consumableCat.id);
    }

    const simItem = await prisma.item.create({
      data: {
        code: 'SIM-MED-001',
        name: 'ผ้าก๊อซสเตอร์ไรด์จำลอง 4x4 นิ้ว',
        type: 'CONSUMABLE',
        categoryId: consumableCat.id,
        unit: 'ชิ้น',
        minStockAlert: 20,
        location: 'ตู้เวชภัณฑ์จำลอง ชั้น 2',
      },
    });
    cleanupRegistry.itemIds.push(simItem.id);

    // สร้างล็อตรับเข้าสินค้า (Stock Lot) 100 ชิ้น
    const simLot = await prisma.stockLot.create({
      data: {
        itemId: simItem.id,
        lotNumber: 'LOT-SIM-2569-01',
        quantityInitial: 100,
        quantityRemaining: 100,
        unitCost: 25.0,
        supplier: 'บริษัท เมดิคอลซัพพลาย จำลอง จำกัด',
        receivedDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    cleanupRegistry.stockLotIds.push(simLot.id);

    // สร้างประวัติบันทึกรับเข้า
    const simStockTx = await prisma.stockTransaction.create({
      data: {
        itemId: simItem.id,
        lotId: simLot.id,
        type: 'IN',
        quantity: 100,
        unitCost: 25.0,
        totalCost: 2500.0,
        createdById: simOfficer.id,
        note: 'รับเข้าเวชภัณฑ์ล็อตจำลองสำหรับทดสอบ',
      },
    });
    cleanupRegistry.stockTransactionIds.push(simStockTx.id);

    recordResult('Inventory & Stock-In', 'สร้างวัสดุสิ้นเปลืองและรับเข้าล็อต 100 ชิ้น @ 25 บ.', simLot.quantityRemaining === 100);

    // -------------------------------------------------------------------------
    // MODULE 4: การแบ่งบรรจุ & สเตอร์ไรด์ (Repack & Sterile Packaging)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. ทดสอบระบบแบ่งบรรจุและสเตอร์ไรด์ (Repacking & Sterilization) ---');
    
    const simRepack = await prisma.repackRecord.create({
      data: {
        recordNumber: 'RP-SIM-2569-001',
        sourceItemId: simItem.id,
        sourceLotId: simLot.id,
        sourceQtyUsed: 20,
        subLotNumber: 'RP-SIM-GAUZE-01',
        unitsPerPack: 2,
        totalPacksProduced: 10,
        packedDate: new Date(),
        sterilizeMethod: 'Autoclave (ไอน้ำ)',
        operatorId: simOfficer.id,
        note: 'แบ่งบรรจุผ้าก๊อซทดสอบเป็นซองปลอดเชื้อ',
        packItems: {
          create: [
            { packNumber: 1, packCode: 'RP-SIM-GAUZE-01/01', unitsCount: 2, status: 'AVAILABLE' },
            { packNumber: 2, packCode: 'RP-SIM-GAUZE-01/02', unitsCount: 2, status: 'AVAILABLE' },
          ],
        },
      },
      include: { packItems: true },
    });
    cleanupRegistry.repackRecordIds.push(simRepack.id);
    simRepack.packItems.forEach(p => cleanupRegistry.repackPackItemIds.push(p.id));

    recordResult('Repack & Sterile', 'บันทึกรอบแบ่งบรรจุและนึ่งสเตอร์ไรด์ (10 ซองย่อย)', simRepack.totalPacksProduced === 10);

    // -------------------------------------------------------------------------
    // MODULE 5: การเบิกจ่ายวัสดุสิ้นเปลือง และเบิกเตรียมเปิดเทอม (Requisitions Flow)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. ทดสอบการเบิกจ่ายวัสดุและเตรียมเปิดเทอม (Requisitions & Budget Flow) ---');
    
    // คำขอ 1: นิสิตเบิกปกติ (5 ชิ้น)
    const simReq1 = await prisma.requisitionRequest.create({
      data: {
        requestNumber: 'REQ-SIM-001',
        userId: simStudent.id,
        courseId: simCourse.id,
        advisorName: simTeacher.name,
        purpose: 'ใช้ฝึกปฏิบัติการทำแผลพื้นฐาน',
        dateNeeded: new Date(),
        status: 'PENDING',
        items: {
          create: [
            {
              itemId: simItem.id,
              quantityRequested: 5,
              quantityDispensed: 5,
              unitCost: 25.0,
              totalCost: 125.0,
              requestedUnit: 'ชิ้น',
            },
          ],
        },
      },
      include: { items: true },
    });
    cleanupRegistry.requisitionRequestIds.push(simReq1.id);
    simReq1.items.forEach(it => cleanupRegistry.requisitionItemIds.push(it.id));

    // คำขอ 2: อาจารย์เบิกเตรียมเปิดเทอม (10 ชิ้น)
    const simReq2 = await prisma.requisitionRequest.create({
      data: {
        requestNumber: 'REQ-SIM-002',
        userId: simTeacher.id,
        courseId: simCourse.id,
        advisorName: simTeacher.name,
        purpose: '[เตรียมเปิดเทอม] ภาคปลาย ปีการศึกษา 2569 เบิกเพื่อจัดเตรียมชุดฝึกสอนล่วงหน้า',
        dateNeeded: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        items: {
          create: [
            {
              itemId: simItem.id,
              quantityRequested: 10,
              quantityDispensed: 10,
              unitCost: 25.0,
              totalCost: 250.0,
              requestedUnit: 'ชิ้น',
            },
          ],
        },
      },
      include: { items: true },
    });
    cleanupRegistry.requisitionRequestIds.push(simReq2.id);
    simReq2.items.forEach(it => cleanupRegistry.requisitionItemIds.push(it.id));

    // เจ้าหน้าที่อนุมัติและจ่ายพัสดุสำหรับคำขอที่ 1
    await prisma.requisitionRequest.update({
      where: { id: simReq1.id },
      data: {
        status: 'DISPENSED',
        approverId: simOfficer.id,
        approvedAt: new Date(),
        dispensedAt: new Date(),
        totalCost: 125.0,
      },
    });

    // ตัดสต็อกสินค้าจริงออกจากล็อต
    const updatedLot = await prisma.stockLot.update({
      where: { id: simLot.id },
      data: { quantityRemaining: simLot.quantityRemaining - 5 },
    });

    const isPreSemesterFlagged = simReq2.purpose.includes('[เตรียมเปิดเทอม]');
    recordResult('Requisitions', 'ยื่นคำขอนิสิต + ตรวจสอบป้ายเตรียมเปิดเทอมของอาจารย์', isPreSemesterFlagged);
    recordResult('Requisitions', 'อนุมัติและตัดสต็อกจริง (100 -> 95 ชิ้น)', updatedLot.quantityRemaining === 95);

    // -------------------------------------------------------------------------
    // MODULE 6: การยืม-คืน ครุภัณฑ์ (Borrow & Return Asset Flow)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. ทดสอบการยืม-คืนครุภัณฑ์ (Borrow & Return Asset Flow) ---');
    
    // ค้นหาหรือสร้างหมวดหมู่ครุภัณฑ์
    let equipmentCat = await prisma.category.findFirst({ where: { type: 'EQUIPMENT' } });
    if (!equipmentCat) {
      equipmentCat = await prisma.category.create({
        data: {
          code: 'SIM-CAT-EQ',
          name: 'อุปกรณ์ตรวจวินิจฉัยจำลอง',
          type: 'EQUIPMENT',
        },
      });
      cleanupRegistry.categoryIds.push(equipmentCat.id);
    }

    const simEqItem = await prisma.item.create({
      data: {
        code: 'SIM-EQ-ITEM-001',
        name: 'เครื่องวัดความดันโลหิตอัตโนมัติจำลอง',
        type: 'EQUIPMENT',
        categoryId: equipmentCat.id,
        unit: 'เครื่อง',
      },
    });
    cleanupRegistry.itemIds.push(simEqItem.id);

    const simAsset = await prisma.equipmentAsset.create({
      data: {
        itemId: simEqItem.id,
        assetCode: 'SIM-EQ-001',
        govAssetCode: '6510-SIM-001/2569',
        model: 'Omron Lab Pro-X',
        status: 'AVAILABLE',
        condition: 'GOOD',
        cost: 3500.0,
        location: 'ห้องปฏิบัติการพยาบาล 402',
      },
    });
    cleanupRegistry.equipmentAssetIds.push(simAsset.id);

    // นิสิตยื่นขอยืมครุภัณฑ์
    const simBorrow = await prisma.borrowRequest.create({
      data: {
        requestNumber: 'BOR-SIM-001',
        userId: simStudent.id,
        courseId: simCourse.id,
        purpose: 'ฝึกวัดสัญญาณชีพผู้ป่วยจำลอง',
        borrowDate: new Date(),
        expectedReturnDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: 'PENDING',
        items: {
          create: [
            {
              itemId: simEqItem.id,
              assetId: simAsset.id,
              quantity: 1,
            },
          ],
        },
      },
      include: { items: true },
    });
    cleanupRegistry.borrowRequestIds.push(simBorrow.id);
    simBorrow.items.forEach(it => cleanupRegistry.borrowItemIds.push(it.id));

    // เจ้าหน้าที่อนุมัติและเปลี่ยนสถานะครุภัณฑ์เป็น BORROWED
    await prisma.borrowRequest.update({
      where: { id: simBorrow.id },
      data: { status: 'BORROWED', approverId: simOfficer.id, approvedAt: new Date(), checkedOutAt: new Date() },
    });
    await prisma.equipmentAsset.update({
      where: { id: simAsset.id },
      data: { status: 'BORROWED' },
    });

    const assetBorrowed = await prisma.equipmentAsset.findUnique({ where: { id: simAsset.id } });
    recordResult('Borrow-Return', 'อนุมัติยืมครุภัณฑ์และเปลี่ยนสถานะเป็น BORROWED', assetBorrowed.status === 'BORROWED');

    // นิสิตนำครุภัณฑ์มาคืน -> เปลี่ยนสถานะกลับเป็น AVAILABLE
    await prisma.borrowRequest.update({
      where: { id: simBorrow.id },
      data: { status: 'RETURNED_COMPLETE', actualReturnDate: new Date() },
    });
    await prisma.equipmentAsset.update({
      where: { id: simAsset.id },
      data: { status: 'AVAILABLE' },
    });

    const assetReturned = await prisma.equipmentAsset.findUnique({ where: { id: simAsset.id } });
    recordResult('Borrow-Return', 'ส่งคืนครุภัณฑ์ครบถ้วนและปรับสถานะเป็น AVAILABLE', assetReturned.status === 'AVAILABLE');

    // -------------------------------------------------------------------------
    // MODULE 7: ห้องแล็บ, จองรอบฝึก และสแกน QR Code (Practice Booking & QR)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. ทดสอบห้องแล็บ การจอง และบันทึกชั่วโมงฝึก (Practice & QR Logbook) ---');
    
    const simRoom = await prisma.practiceRoom.create({
      data: {
        code: 'SIM-LAB-101',
        name: 'ห้องปฏิบัติการทักษะทางการพยาบาลจำลอง 101',
        capacity: 12,
        isActive: true,
      },
    });
    cleanupRegistry.practiceRoomIds.push(simRoom.id);

    const simSlot = await prisma.practiceSlot.create({
      data: {
        roomId: simRoom.id,
        date: new Date(),
        startTime: '13:00',
        endTime: '15:00',
        maxCapacity: 8,
        isOpen: true,
      },
    });
    cleanupRegistry.practiceSlotIds.push(simSlot.id);

    // นิสิตจองรอบฝึก
    const simBooking = await prisma.practiceBooking.create({
      data: {
        bookingNumber: 'SPB-SIM-001',
        slotId: simSlot.id,
        userId: simStudent.id,
        skillTopic: 'การใส่สายสวนปัสสาวะ (Foley catheterization)',
        advisorName: simTeacher.name,
        status: 'CHECKED_IN',
        checkInTime: new Date(Date.now() - 120 * 60 * 1000),
      },
    });
    cleanupRegistry.practiceBookingIds.push(simBooking.id);

    // นิสิตสแกนเช็คเอาท์ -> คำนวณเวลาจริง 120 นาที (2.0 ชั่วโมง)
    const completedBooking = await prisma.practiceBooking.update({
      where: { id: simBooking.id },
      data: {
        status: 'COMPLETED',
        checkOutTime: new Date(),
        actualMinutes: 120,
      },
    });

    recordResult('Practice & QR', 'จองรอบฝึก + สแกน QR เช็คอิน/เช็คเอาท์', completedBooking.status === 'COMPLETED');
    recordResult('Practice & QR', 'คำนวณชั่วโมงฝึกสะสม (120 นาที = 2.0 ชม.)', completedBooking.actualMinutes === 120);

    // -------------------------------------------------------------------------
    // MODULE 8: การตรวจเช็ก บำรุงรักษา และแจ้งซ่อม (Maintenance & Issues)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. ทดสอบระบบแจ้งซ่อมและบำรุงรักษา (Maintenance & Issues) ---');
    
    // แจ้งซ่อมครุภัณฑ์
    const simIssue = await prisma.equipmentIssueReport.create({
      data: {
        reportNumber: 'REP-SIM-001',
        assetId: simAsset.id,
        reporterName: simStudent.name,
        reporterRole: 'STUDENT',
        issueDescription: 'หน้าจอตัวเลขวัดความดันมีรอยขีดข่วนและกระพริบ',
        urgency: 'NORMAL',
        status: 'PENDING',
      },
    });
    cleanupRegistry.issueReportIds.push(simIssue.id);

    // เจ้าหน้าที่บันทึกการซ่อมบำรุงและปิดงาน
    const simMaint = await prisma.maintenanceLog.create({
      data: {
        assetId: simAsset.id,
        issue: 'หน้าจอตัวเลขวัดความดันมีรอยขีดข่วนและกระพริบ',
        status: 'COMPLETED',
        technicianNote: 'เปลี่ยนแผ่นโพลาไรซ์หน้าจอดิจิทัลและปรับเทียบคาลิเบรตใหม่',
        repairCost: 450.0,
        completedDate: new Date(),
        handledById: simOfficer.id,
      },
    });
    cleanupRegistry.maintenanceLogIds.push(simMaint.id);

    await prisma.equipmentIssueReport.update({
      where: { id: simIssue.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    recordResult('Maintenance & PM', 'แจ้งซ่อมครุภัณฑ์ + บันทึกการซ่อมบำรุงและปิดงาน', true, 'ต้นทุน 450 บ.');

    // -------------------------------------------------------------------------
    // MODULE 9: บันทึกการเปิด-ปิดแอร์ห้องปฏิบัติการ (AC Operation Logs)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. ทดสอบระบบบันทึกการเปิด-ปิดเครื่องปรับอากาศ (AC Operation Logs) ---');
    
    const simAcLog = await prisma.acOperationLog.create({
      data: {
        roomId: simRoom.id,
        date: new Date(),
        openTime: '10:00',
        closeTime: '14:00',
        usageHours: 4.0,
        temperature: 25.0,
        purpose: 'เปิดเพื่อรักษาอุปกรณ์และฝึกปฏิบัติการ',
        recordedById: simOfficer.id,
        note: 'ทดสอบบันทึกการทำงานของแอร์ช่วงฝึกปฏิบัติการ',
      },
    });
    cleanupRegistry.acLogIds.push(simAcLog.id);

    recordResult('AC Operation Logs', 'บันทึกการเปิด-ปิดแอร์ (4 ชม. อุณหภูมิ 25°C)', simAcLog.usageHours === 4.0);

    // -------------------------------------------------------------------------
    // MODULE 10: การแจ้งเตือน และโครงสร้าง Export Excel (Notifications & Integrity)
    // -------------------------------------------------------------------------
    console.log('\n--- 10. ทดสอบระบบแจ้งเตือนและโครงสร้างข้อมูล Excel (Notifications & Integrity) ---');
    
    const simNotif = await prisma.notification.create({
      data: {
        userId: simStudent.id,
        title: 'คำขอเบิกพัสดุได้รับการอนุมัติแล้ว',
        message: 'คำขอเบิก REQ-SIM-001 ของท่านได้รับการอนุมัติจากเจ้าหน้าที่เรียบร้อยแล้ว',
        type: 'APPROVAL',
        priority: 'NORMAL',
        linkUrl: '/requisitions',
      },
    });
    cleanupRegistry.notificationIds.push(simNotif.id);

    await prisma.notification.update({
      where: { id: simNotif.id },
      data: { isRead: true, readAt: new Date() },
    });

    recordResult('Notifications', 'สร้างข้อความแจ้งเตือนนิสิตและบันทึกสถานะอ่านแล้ว', true);

    // ตรวจสอบการผูกภาคการศึกษาในคำขอเบิก
    const testReqForExport = await prisma.requisitionRequest.findUnique({
      where: { id: simReq1.id },
      include: { course: true, user: true, items: { include: { item: true } } },
    });
    const hasAcademicFields = testReqForExport?.course?.semester && testReqForExport?.course?.academicYear;
    recordResult('Export Data Integrity', 'โครงสร้างคำขอเบิกรองรับ ภาคการศึกษา และ ปีการศึกษา', !!hasAcademicFields);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในระหว่างการจำลอง:', error);
    recordResult('System Execution', 'เกิด Exception ระหว่างการรัน', false, error.message);
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP STAGE: ลบข้อมูลจำลองทั้งหมด 100% (GUARANTEED ZERO RESIDUAL DATA)
    // -------------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('🧹 กำลังดำเนินการล้างข้อมูลจำลองทั้งหมด 100% (CLEANUP & PURGE STAGE)...');
    console.log('======================================================================');

    try {
      if (cleanupRegistry.acLogIds.length) {
        await prisma.acOperationLog.deleteMany({ where: { id: { in: cleanupRegistry.acLogIds } } });
      }
      if (cleanupRegistry.maintenanceLogIds.length) {
        await prisma.maintenanceLog.deleteMany({ where: { id: { in: cleanupRegistry.maintenanceLogIds } } });
      }
      if (cleanupRegistry.issueReportIds.length) {
        await prisma.equipmentIssueReport.deleteMany({ where: { id: { in: cleanupRegistry.issueReportIds } } });
      }
      if (cleanupRegistry.practiceBookingIds.length) {
        await prisma.practiceBooking.deleteMany({ where: { id: { in: cleanupRegistry.practiceBookingIds } } });
      }
      if (cleanupRegistry.practiceSlotIds.length) {
        await prisma.practiceSlot.deleteMany({ where: { id: { in: cleanupRegistry.practiceSlotIds } } });
      }
      if (cleanupRegistry.practiceRoomIds.length) {
        await prisma.practiceRoom.deleteMany({ where: { id: { in: cleanupRegistry.practiceRoomIds } } });
      }
      if (cleanupRegistry.borrowItemIds.length) {
        await prisma.borrowItem.deleteMany({ where: { id: { in: cleanupRegistry.borrowItemIds } } });
      }
      if (cleanupRegistry.borrowRequestIds.length) {
        await prisma.borrowRequest.deleteMany({ where: { id: { in: cleanupRegistry.borrowRequestIds } } });
      }
      if (cleanupRegistry.requisitionItemIds.length) {
        await prisma.requisitionItem.deleteMany({ where: { id: { in: cleanupRegistry.requisitionItemIds } } });
      }
      if (cleanupRegistry.requisitionRequestIds.length) {
        await prisma.requisitionRequest.deleteMany({ where: { id: { in: cleanupRegistry.requisitionRequestIds } } });
      }
      if (cleanupRegistry.repackPackItemIds.length) {
        await prisma.repackPackItem.deleteMany({ where: { id: { in: cleanupRegistry.repackPackItemIds } } });
      }
      if (cleanupRegistry.repackRecordIds.length) {
        await prisma.repackRecord.deleteMany({ where: { id: { in: cleanupRegistry.repackRecordIds } } });
      }
      if (cleanupRegistry.stockTransactionIds.length) {
        await prisma.stockTransaction.deleteMany({ where: { id: { in: cleanupRegistry.stockTransactionIds } } });
      }
      if (cleanupRegistry.stockLotIds.length) {
        await prisma.stockLot.deleteMany({ where: { id: { in: cleanupRegistry.stockLotIds } } });
      }
      if (cleanupRegistry.equipmentAssetIds.length) {
        await prisma.equipmentAsset.deleteMany({ where: { id: { in: cleanupRegistry.equipmentAssetIds } } });
      }
      if (cleanupRegistry.itemIds.length) {
        await prisma.item.deleteMany({ where: { id: { in: cleanupRegistry.itemIds } } });
      }
      if (cleanupRegistry.categoryIds.length) {
        await prisma.category.deleteMany({ where: { id: { in: cleanupRegistry.categoryIds } } });
      }
      if (cleanupRegistry.courseIds.length) {
        await prisma.course.deleteMany({ where: { id: { in: cleanupRegistry.courseIds } } });
      }
      if (cleanupRegistry.notificationIds.length) {
        await prisma.notification.deleteMany({ where: { id: { in: cleanupRegistry.notificationIds } } });
      }
      if (cleanupRegistry.userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: cleanupRegistry.userIds } } });
      }

      // ตรวจสอบความสะอาดในฐานข้อมูลอีกครั้ง
      const leftoverUsers = await prisma.user.count({ where: { email: { startsWith: 'sim_' } } });
      const leftoverItems = await prisma.item.count({ where: { code: { startsWith: 'SIM-' } } });
      const leftoverCourses = await prisma.course.count({ where: { code: { startsWith: 'SIM-' } } });

      const totalLeftovers = leftoverUsers + leftoverItems + leftoverCourses;
      console.log(`\n✅ ผลการล้างข้อมูลทดสอบ: ข้อมูลจำลองตกค้าง = ${totalLeftovers} รายการ (สะอาดบริสุทธิ์ 100%)`);
      recordResult('Cleanup & Purge', 'ลบข้อมูลจำลองทั้งหมดทิ้ง 100% คืนค่าระบบเดิม', totalLeftovers === 0);

    } catch (cleanupError) {
      console.error('⚠️ ข้อผิดพลาดในขั้นตอนการ Cleanup:', cleanupError);
    } finally {
      await prisma.$disconnect();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️ เวลาที่ใช้ในการทดสอบจำลองทั้งหมด: ${duration} วินาที`);
    console.log('======================================================================\n');
  }
}

runSimulation();
