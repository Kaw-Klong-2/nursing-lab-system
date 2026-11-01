const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: {
      imageUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      imageUrl: true,
    },
  });

  const validItems = items.filter(i => i.imageUrl && i.imageUrl.trim() !== '');
  console.log('Total items with valid imageUrl:', validItems.length);
  
  // Categorize URL types
  const driveUrls = validItems.filter(i => i.imageUrl.includes('drive.google.com') || i.imageUrl.includes('drive.usercontent.google.com') || i.imageUrl.includes('googleusercontent.com'));
  const localUrls = validItems.filter(i => i.imageUrl.startsWith('/'));
  const otherUrls = validItems.filter(i => !driveUrls.includes(i) && !localUrls.includes(i));

  console.log(`- Google Drive URLs: ${driveUrls.length}`);
  console.log(`- Local URLs: ${localUrls.length}`);
  console.log(`- Other URLs: ${otherUrls.length}`);

  console.log('\nSample Google Drive URLs:');
  driveUrls.slice(0, 5).forEach(i => console.log(`[${i.code}] ${i.name} -> ${i.imageUrl}`));

  console.log('\nSample Local URLs:');
  localUrls.slice(0, 5).forEach(i => console.log(`[${i.code}] ${i.name} -> ${i.imageUrl}`));

  if (otherUrls.length > 0) {
    console.log('\nSample Other URLs:');
    otherUrls.slice(0, 5).forEach(i => console.log(`[${i.code}] ${i.name} -> ${i.imageUrl}`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
