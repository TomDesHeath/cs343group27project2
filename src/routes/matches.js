import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { matchesRuntime } from '../state/matchState.js';
import { perQuestionScore } from '../services/scoring.js';

const r = Router();

function currentUser(req) {
  return req.headers['x-user-id']?.toString() || 'demo-user';
}

async function ensureUser(id) {
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email: id + '@demo.local', username: id, passwordHash: '' }
  });
}

r.get('/', async (req, res) => {
  const { q, status, categoryId } = req.query;
  const matches = await prisma.match.findMany({
    where: {
      ...(q ? { title: { contains: String(q), mode: 'insensitive' } } : {}),
      ...(status ? { status: String(status) } : {}),
      ...(categoryId ? { categoryId: String(categoryId) } : {})
    },
    orderBy: { createdAt: 'desc' },
    include: { Category: true, players: true }
  });
  res.json(matches);
});

r.get('/:id', async (req, res) => {
  const m = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { Category: true, players: { include: { User: true } } }
  });
  if (!m) return res.status(404).json({ error: 'not found' });
  res.json(m);
});

r.get('/mine', async (req, res) => {
  const userId = currentUser(req);
  await ensureUser(userId);
  const created = await prisma.match.findMany({
    where: { hostUserId: userId },
    orderBy: { createdAt: 'desc' }
  });
  const joined = await prisma.player.findMany({
    where: { userId },
    include: { Match: true }
  });
  res.json({ created, joined: joined.map(j => j.Match) });
});

r.post('/', async (req, res) => {
  try {
    const hostUserId = currentUser(req);
    await ensureUser(hostUserId);
    const { title, categoryId = null, perQuestionMs = 20000 } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    const m = await prisma.match.create({
      data: { title, hostUserId, categoryId, perQuestionMs }
    });
    await prisma.player.create({ data: { userId: hostUserId, matchId: m.id } });
    res.status(201).json(m);
  } catch (e) {
    res.status(500).json({ error: 'failed to create match', details: String(e) });
  }
});

r.post('/:id/join', async (req, res) => {
  try {
    const userId = currentUser(req);
    const matchId = req.params.id;
    await ensureUser(userId);
    await prisma.player.upsert({
      where: { userId_matchId: { userId, matchId } },
      update: {},
      create: { userId, matchId }
    });
    const data = await prisma.match.findUnique({
      where: { id: matchId },
      include: { players: { include: { User: true } }, Category: true }
    });
    if (!data) return res.status(404).json({ error: 'match not found' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'failed to join match', details: String(e) });
  }
});

r.post('/:id/start', async (req, res) => {
  try {
    const userId = currentUser(req);
    const matchId = req.params.id;
    const m = await prisma.match.findUnique({ where: { id: matchId } });
    if (!m) return res.status(404).json({ error: 'match not found' });
    if (m.hostUserId !== userId) return res.status(403).json({ error: 'only host can start' });
    const runtime = { matchId, startedAt: Date.now(), currentIndex: 0, fastestMs: undefined, players: {} };
    const players = await prisma.player.findMany({ where: { matchId } });
    players.forEach(p => { runtime.players[p.userId] = { userId: p.userId, score: p.score, answered: false }; });
    matchesRuntime.set(matchId, runtime);
    await prisma.match.update({ where: { id: matchId }, data: { status: 'LIVE' } });
    res.json({ ok: true, state: { ...runtime, players: Object.values(runtime.players) } });
  } catch (e) {
    res.status(500).json({ error: 'failed to start match', details: String(e) });
  }
});

r.post('/:id/resume', async (req, res) => {
  try {
    const matchId = req.params.id;
    const m = await prisma.match.findUnique({ where: { id: matchId } });
    if (!m) return res.status(404).json({ error: 'match not found' });
    if (m.status !== 'LIVE') return res.status(409).json({ error: 'match not live' });
    if (matchesRuntime.get(matchId)) return res.json({ ok: true, resumed: false, reason: 'already running' });
    const players = await prisma.player.findMany({ where: { matchId } });
    const runtime = { matchId, startedAt: Date.now(), currentIndex: 0, fastestMs: undefined, players: {} };
    players.forEach(p => { runtime.players[p.userId] = { userId: p.userId, score: p.score, answered: false }; });
    matchesRuntime.set(matchId, runtime);
    res.json({ ok: true, resumed: true, state: { ...runtime, players: Object.values(runtime.players) } });
  } catch (e) {
    res.status(500).json({ error: 'failed to resume', details: String(e) });
  }
});

r.post('/:id/answer', async (req, res) => {
  try {
    const userId = currentUser(req);
    const matchId = req.params.id;
    const { questionId, chosen, responseMs } = req.body || {};
    if (!questionId || typeof responseMs !== 'number') return res.status(400).json({ error: 'questionId and responseMs required' });

    const runtime = matchesRuntime.get(matchId);
    if (!runtime) return res.status(409).json({ error: 'match not live' });

    const q = await prisma.question.findUnique({ where: { id: questionId } });
    if (!q) return res.status(404).json({ error: 'question not found' });

    const isCorrect = chosen === q.answer;
    const nowFastest = runtime.fastestMs === undefined ? responseMs : Math.min(runtime.fastestMs, responseMs);
    runtime.fastestMs = nowFastest;

    if (!runtime.players[userId]) runtime.players[userId] = { userId, score: 0, answered: false };
    let delta = 0;
    if (isCorrect) delta = perQuestionScore(responseMs, runtime.fastestMs);
    runtime.players[userId].score += delta;
    runtime.players[userId].answered = true;

    try {
      const order = Number.isInteger(runtime.currentIndex) ? runtime.currentIndex : 0;

      let mq = await prisma.matchQuestion.findFirst({
        where: { matchId, questionId, ...(Number.isInteger(order) ? { order } : {}) },
        select: { id: true }
      });

      if (!mq) {
        mq = await prisma.matchQuestion.create({
          data: { matchId, questionId, order },
          select: { id: true }
        });
      }

      await prisma.answer.create({
        data: {
          selected: chosen,
          correct: isCorrect,
          responseMs,
          Player: { connect: { userId_matchId: { userId, matchId } } },
          MatchQuestion: { connect: { id: mq.id } }
        }
      });
    } catch (e) {
      console.error('answer.create failed', e);
    }

    try {
      const newScore = runtime.players[userId].score;
      await prisma.player.upsert({
        where: { userId_matchId: { userId, matchId } },
        update: { score: newScore },
        create: { userId, matchId, score: newScore }
      });
    } catch (e) {
      console.error('player score persist failed', e);
    }

    const row = await prisma.player.findUnique({
      where: { userId_matchId: { userId, matchId } },
      select: { score: true }
    });

    res.json({
      ok: true,
      isCorrect,
      scoreDelta: delta,
      total: runtime.players[userId].score,
      dbScore: row?.score ?? null
    });
  } catch (e) {
    res.status(500).json({ error: 'failed to record answer', details: String(e) });
  }
});

r.post('/:id/next', async (req, res) => {
  try {
    const matchId = req.params.id;
    const runtime = matchesRuntime.get(matchId);
    if (!runtime) return res.status(409).json({ error: 'match not live' });
    runtime.currentIndex += 1;
    runtime.fastestMs = undefined;
    Object.values(runtime.players).forEach(p => { p.answered = false; });
    res.json({ ok: true, currentIndex: runtime.currentIndex });
  } catch (e) {
    res.status(500).json({ error: 'failed to advance', details: String(e) });
  }
});

r.post('/:id/reconnect', async (req, res) => {
  try {
    const userId = currentUser(req);
    const matchId = req.params.id;
    await ensureUser(userId);
    const m = await prisma.match.findUnique({ where: { id: matchId } });
    if (!m) return res.status(404).json({ error: 'match not found' });
    const runtime = matchesRuntime.get(matchId);
    if (!runtime) return res.json({ status: m.status, currentIndex: null, players: [] });
    const me = runtime.players[userId] || { userId, score: 0, answered: false };
    res.json({ status: 'LIVE', currentIndex: runtime.currentIndex, fastestMs: runtime.fastestMs ?? null, you: me, players: Object.values(runtime.players) });
  } catch (e) {
    res.status(500).json({ error: 'failed to reconnect', details: String(e) });
  }
});

r.get('/:id/leaderboard', async (req, res) => {
  const matchId = req.params.id;
  const runtime = matchesRuntime.get(matchId);
  let rows = await prisma.player.findMany({
    where: { matchId },
    select: { userId: true, score: true }
  });
  if (runtime) {
    const live = Object.values(runtime.players).map(p => ({ userId: p.userId, score: p.score }));
    const byId = new Map(rows.map(r => [r.userId, r.score]));
    live.forEach(p => byId.set(p.userId, p.score));
    rows = Array.from(byId, ([userId, score]) => ({ userId, score }));
  }
  rows.sort((a, b) => b.score - a.score);
  res.json(rows);
});

r.get('/:id/state', async (req, res) => {
  try {
    const matchId = req.params.id;
    const m = await prisma.match.findUnique({ where: { id: matchId } });
    if (!m) return res.status(404).json({ error: 'match not found' });
    const runtime = matchesRuntime.get(matchId);
    if (!runtime) return res.json({ status: m.status, currentIndex: null, elapsedMs: 0, players: [] });
    const now = Date.now();
    res.json({ status: 'LIVE', currentIndex: runtime.currentIndex, elapsedMs: runtime.startedAt ? now - runtime.startedAt : 0, players: Object.values(runtime.players) });
  } catch (e) {
    res.status(500).json({ error: 'failed to fetch state', details: String(e) });
  }
});

export default r;
