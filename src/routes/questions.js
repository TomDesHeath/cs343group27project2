import { Router } from 'express';
import { prisma } from '../utils/prisma.js';

const r = Router();

r.get('/', async (req, res) => {
  const { categoryId, limit = 10 } = req.query;
  const where = categoryId ? { categoryId: String(categoryId) } : {};
  const items = await prisma.question.findMany({
    where,
    take: Number(limit),
    orderBy: { id: 'desc' },
    select: { id: true, prompt: true, categoryId: true }
  });
  res.json(items);
});

r.get('/:id/debug', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') return res.status(403).json({ error: 'forbidden' });
  const q = await prisma.question.findUnique({
    where: { id: req.params.id },
    select: { id: true, prompt: true, options: true, answer: true, categoryId: true }
  });
  if (!q) return res.status(404).json({ error: 'not found' });
  res.json(q);
});

export default r;
