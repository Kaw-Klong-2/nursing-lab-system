import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableRLS() {
  console.log('Enabling Row Level Security (RLS) on all public tables...');
  
  await prisma.$executeRawUnsafe(`
    DO $$ 
    DECLARE 
        tbl text;
    BEGIN 
        FOR tbl IN 
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename NOT LIKE '_prisma%'
        LOOP 
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        END LOOP; 
    END $$;
  `);

  console.log('RLS command executed successfully.');

  // Verify
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename ASC;
  `);

  console.log('\nVerification of all tables:');
  let allEnabled = true;
  for (const t of tables) {
    console.log(`  [${t.rowsecurity ? 'PROTECTED (RLS ON)' : 'UNRESTRICTED'}] ${t.tablename}`);
    if (!t.rowsecurity) allEnabled = false;
  }

  // Quick sanity check with Prisma
  const userCount = await prisma.user.count();
  const itemCount = await prisma.item.count();
  console.log(`\nSanity check via App connection: Users=${userCount}, Items=${itemCount} (Working seamlessly!)`);

  if (allEnabled) {
    console.log('\nALL TABLES SUCCESSFULLY SECURED WITH RLS!');
  }
}

enableRLS()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((e) => {
    console.error('Error enabling RLS:', e);
    prisma.$disconnect();
    process.exit(1);
  });
