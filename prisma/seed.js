import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

try {
  await db.category.createMany({
    data: [
      { name: 'General Knowledge' },
      { name: 'Science' },
      { name: 'History' }
    ],
    skipDuplicates: true
  });
  console.log('Seed complete');
} finally {
  await db.$disconnect();
}
