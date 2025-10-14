import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function idByName(name) {
  const c = await db.category.findFirst({ where: { name } });
  return c?.id || null;
}

try {
  const gk = await idByName('General Knowledge');
  const sci = await idByName('Science');
  const hist = await idByName('History');

  const data = [
    { prompt: 'What is the capital of France?', options: ['Paris','Rome','Madrid','Berlin'], answer: 'Paris', categoryId: gk },
    { prompt: 'H2O is the chemical formula for what?', options: ['Oxygen','Hydrogen','Water','Salt'], answer: 'Water', categoryId: sci },
    { prompt: 'Who was the first U.S. President?', options: ['Abraham Lincoln','George Washington','John Adams','Thomas Jefferson'], answer: 'George Washington', categoryId: hist },
    { prompt: 'Which planet is the Red Planet?', options: ['Venus','Mars','Jupiter','Mercury'], answer: 'Mars', categoryId: sci },
    { prompt: 'In what year did WWII end?', options: ['1942','1945','1948','1950'], answer: '1945', categoryId: hist }
  ].filter(q => q.categoryId);

  await db.question.createMany({ data, skipDuplicates: true });
  console.log('Question seed complete');
} finally {
  await db.$disconnect();
}
