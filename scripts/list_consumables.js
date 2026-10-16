const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = await prisma.item.findMany({
    where: { type: 'CONSUMABLE' },
    select: {
      code: true,
      name: true,
      category: { select: { name: true } },
      imageUrl: true,
      unit: true,
      usageUnit: true,
      conversionRatio: true,
      stockLots: { select: { quantityRemaining: true } }
    },
    orderBy: { code: 'asc' }
  });

  console.log(`TOTAL=${data.length}`);
  const noImg = data.filter(d => !d.imageUrl);
  console.log(`NO_IMG=${noImg.length}`);

  data.forEach((d, i) => {
    const stock = d.stockLots.reduce((s, l) => s + l.quantityRemaining, 0);
    console.log(`${i + 1}. [${d.code}] ${d.name} | หมวด: ${d.category?.name || '-'} | คงเหลือ: ${stock} ${d.unit} | รูป: ${d.imageUrl ? 'มีแล้ว' : 'ยังไม่มี'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
