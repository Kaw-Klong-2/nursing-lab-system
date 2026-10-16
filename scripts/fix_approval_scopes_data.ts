import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('[DATA CLEANUP] Starting approvalScopes cleanup...');

  // 1. Reset all USER (นิสิต) to have null approvalScopes
  const userResult = await prisma.user.updateMany({
    where: { role: 'USER' },
    data: { approvalScopes: null },
  });
  console.log(`[DATA CLEANUP] Updated ${userResult.count} student (USER) records -> approvalScopes: null`);

  // 2. Reset all TEACHER (อาจารย์ทั่วไป) to have null approvalScopes
  const teacherResult = await prisma.user.updateMany({
    where: { role: 'TEACHER' },
    data: { approvalScopes: null },
  });
  console.log(`[DATA CLEANUP] Updated ${teacherResult.count} teacher (TEACHER) records -> approvalScopes: null`);

  // 3. Update executive (ดร.สายสมร เฉลยกิตติ)
  const execResult = await prisma.user.updateMany({
    where: {
      OR: [
        { role: 'EXECUTIVE' },
        { email: 'saisamorn.c@ku.th' },
      ],
    },
    data: {
      isExecutive: true,
      executiveRole: 'คณบดีคณะพยาบาลศาสตร์',
      approvalScopes: null,
    },
  });
  console.log(`[DATA CLEANUP] Updated ${execResult.count} executive records -> isExecutive: true, approvalScopes: null`);

  // 4. Verify legitimate approvers have their correct scopes
  const approvers = await prisma.user.findMany({
    where: { role: { in: ['APPROVER', 'ADMIN'] } },
    select: { id: true, name: true, role: true, approvalScopes: true },
  });
  console.log('[DATA CLEANUP] Verified approver & admin roles:', approvers);

  // 5. Overall summary check
  const allUsers = await prisma.user.findMany({
    select: { id: true, role: true, approvalScopes: true },
  });
  const summary = allUsers.reduce((acc: any, u) => {
    const key = `${u.role} (scopes: ${u.approvalScopes || 'NULL'})`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log('[DATA CLEANUP] Summary distribution after cleanup:');
  console.log(summary);

  console.log('[DATA CLEANUP] Done successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
