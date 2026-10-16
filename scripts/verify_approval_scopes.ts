import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, approvalScopes: true, isExecutive: true },
  });

  const summary = users.reduce((acc: Record<string, number>, u) => {
    const key = `${u.role} (scopes: ${u.approvalScopes || 'NULL'}, isExecutive: ${u.isExecutive})`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log('=== User Count By Role & Scopes ===');
  console.log(JSON.stringify(summary, null, 2));

  // Check any student with non-null approvalScopes
  const badStudents = users.filter((u) => u.role === 'USER' && u.approvalScopes);
  if (badStudents.length > 0) {
    console.error('ERROR: Found students with approvalScopes:', badStudents);
  } else {
    console.log('SUCCESS: All students have approvalScopes = NULL');
  }

  // Check approvers
  const approvers = users.filter((u) => u.role === 'APPROVER' || u.role === 'ADMIN');
  console.log('Approver accounts:', approvers.map((u) => `${u.name} [${u.role}] -> scopes: ${u.approvalScopes}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
