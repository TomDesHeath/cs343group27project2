import { Router } from 'express';
import { prisma } from '../utils/prisma';

const r = Router();

r.get('/', async (req, res) => {
  const { categoryId, limit = 10 } = req.query;
  const where = categoryId ? { categoryId: String(categoryId) } : {};

  const items = await prisma.question.findMany({
    where,
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
    select: { id: true, text: true, categoryId: true }
  });

  res.json(
    items.map((item) => ({
      id: item.id,
      prompt: item.text,
      categoryId: item.categoryId
    }))
  );
});

r.get('/:id/debug', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'forbidden' });
  }

  const question = await prisma.question.findUnique({
    where: { id: req.params.id },
    include: {
      answers: {
        select: { id: true, text: true, isCorrect: true }
      }
    }
  });

  if (!question) return res.status(404).json({ error: 'not found' });

  res.json({
    id: question.id,
    prompt: question.text,
    categoryId: question.categoryId,
    difficulty: question.difficulty,
    source: question.source,
    answers: question.answers
  });
});

export default r;
