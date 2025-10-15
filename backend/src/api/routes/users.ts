import { Router } from 'express';
import { prisma } from '../utils/prisma';

const r = Router();

function currentUser(req: any) {
  return req.headers['x-user-id']?.toString() || 'demo-user';
}

async function ensureUser(id: string) {
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email: id + '@demo.local', username: id, passwordHash: '' }
  });
}

r.get('/', (_req, res) => {
  res.json({ ok: true, scope: 'users' });
});

r.get('/me', async (req, res) => {
  const id = currentUser(req);
  const u = await ensureUser(id);
  res.json({ id: u.id, email: u.email, username: u.username, role: u.role });
});

export default r;
