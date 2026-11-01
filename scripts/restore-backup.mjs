import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tables in dependency order
const tableOrder = [
  'user',
  'academicTerm',
  'course',
  'category',
  'storageLocation',
  'practiceRoom',
  'practiceSlot',
  'practiceConfig',
  'item',
  'equipmentAsset',
  'stockLot',
  'stockLotBox',
  'stockTransaction',
  'roomBooking',
  'borrowRequest',
  'borrowItem',
  'requisitionRequest',
  'requisitionItem',
  'practiceKit',
  'practiceKitItem',
  'repackRecord',
  'repackPackItem',
  'customHoliday',
  'notificationTemplate',
  'notification',
  'pushSubscription',
  'broadcastMessage',
  'acOperationLog',
  'inspectionLog',
  'equipmentIssueReport',
  'inspectionPlan',
  'inspectionPlanItem',
  'maintenanceLog',
  'activityLog',
];

// List of known Date fields in the schema
const dateFieldNames = new Set([
  'createdAt',
  'updatedAt',
  'bookingDate',
  'startDate',
  'endDate',
  'date',
  'expiryDate',
  'receivedDate',
  'requestDate',
  'borrowDate',
  'expectedReturnDate',
  'actualReturnDate',
  'inspectedAt',
  'scheduledDate',
  'lastUsedAt',
]);

function convertDates(obj) {
  const newObj = { ...obj };
  for (const [key, value] of Object.entries(newObj)) {
    if (typeof value === 'string' && (dateFieldNames.has(key) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
      newObj[key] = new Date(value);
    }
  }
  return newObj;
}

async function restore() {
  const backupFile = path.join(process.cwd(), 'backups', 'FULL_BACKUP_2026-11-01T07-05-32-811Z.json');
  console.log('Reading backup:', backupFile);
  const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  // Disable FK checks if possible in PostgreSQL
  try {
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
    console.log('FK checks disabled for restore.');
  } catch (e) {
    console.warn('Could not set session_replication_role:', e.message);
  }

  const results = {};

  for (const model of tableOrder) {
    if (data[model] && data[model].length > 0) {
      const records = data[model].map(convertDates);
      console.log(`Inserting ${records.length} records into ${model}...`);
      
      try {
        // Use createMany in chunks of 500
        const chunkSize = 500;
        let inserted = 0;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          await prisma[model].createMany({
            data: chunk,
            skipDuplicates: true,
          });
          inserted += chunk.length;
        }
        results[model] = inserted;
        console.log(`  -> OK: ${model} (${inserted} rows)`);
      } catch (err) {
        console.error(`  -> ERROR inserting into ${model}:`, err.message);
        // Fallback row-by-row
        let successCount = 0;
        for (const row of records) {
          try {
            await prisma[model].create({ data: row });
            successCount++;
          } catch (rowErr) {
            // skip if duplicate
          }
        }
        results[model] = successCount;
        console.log(`  -> Fallback row-by-row for ${model}: ${successCount}/${records.length}`);
      }
    }
  }

  // Re-enable FK checks
  try {
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    console.log('FK checks re-enabled.');
  } catch (e) {
    console.warn('Could not reset session_replication_role:', e.message);
  }

  console.log('RESTORE_FINISHED:', JSON.stringify(results, null, 2));
}

restore()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((e) => {
    console.error('Fatal restore error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
