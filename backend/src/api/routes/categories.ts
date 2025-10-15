import { Router } from 'express';
import { prisma } from '../utils/prisma';

const r = Router();

r.get('/', async (_req, res) => {
  const rows = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(rows);
});

export default r;
