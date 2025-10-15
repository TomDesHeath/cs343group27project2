import { Router } from 'express';
import { MatchStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { matchesRuntime } from '../state/matchState';
import { perQuestionScore } from '../services/scoring';

const r = Router();

const MATCH_STATUSES = new Set<MatchStatus>(Object.values(MatchStatus));

const toMatchStatus = (value: unknown): MatchStatus | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalised = value.trim().toUpperCase();
  return MATCH_STATUSES.has(normalised as MatchStatus) ? (normalised as MatchStatus) : undefined;
};

function currentUser(req: any) {
  return req.headers['x-user-id']?.toString() || 'demo-user';
}

async function ensureUser(id: string) {
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email: `${id}@demo.local`, username: id, passwordHash: '' }
  });
}

r.get('/', async (req, res) => {
  const { q, status, categoryId } = req.query;
  const statusValue = toMatchStatus(status);

  const where: Prisma.MatchWhereInput = {
    ...(q ? { title: { contains: String(q), mode: 'insensitive' } } : {}),
    ...(statusValue ? { status: statusValue } : {}),
    ...(categoryId ? { categoryId: String(categoryId) } : {})
  };

  const matches = await prisma.match.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
      players: {
        include: { user: true }
      }
    }
  });

  res.json(matches);
});

r.get('/:id', async (req, res) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      players: {
        include: { user: true }
      }
    }
  });
  if (!match) return res.status(404).json({ error: 'not found' });
  res.json(match);
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
    include: { match: true }
  });
  res.json({ created, joined: joined.map((j) => j.match) });
});

r.post('/', async (req, res) => {
  try {
    const hostUserId = currentUser(req);
    await ensureUser(hostUserId);

    const { title, categoryId = null, perQuestionMs = 20000 } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });

    const perQuestionTimeMs = Number(perQuestionMs) || 20000;

    const match = await prisma.match.create({
      data: {
        title,
        hostUserId,
        categoryId: categoryId ?? null,
        perQuestionTimeMs
      }
    });

    await prisma.player.create({
      data: { userId: hostUserId, matchId: match.id }
    });

    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ error: 'failed to create match', details: String(error) });
  }
});

r.post('/:id/join', async (req, res) => {
  try {
    const userId = currentUser(req);
    const matchId = req.params.id;
    await ensureUser(userId);

    await prisma.player.upsert({
      where: { matchId_userId: { matchId, userId } },
      update: {},
      create: { userId, matchId }
    });

    const data = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        category: true,
        players: { include: { user: true } }
      }
    });

    if (!data) return res.status(404).json({ error: 'match not found' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'failed to join match', details: String(error) });
  }
});

r.post('/:id/start', async (req, res) => {
  try {
    const userId = currentUser(req);
    const matchId = req.params.id;
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'match not found' });
    if (match.hostUserId !== userId) return res.status(403).json({ error: 'only host can start' });

    const runtime: any = { matchId, startedAt: Date.now(), currentIndex: 0, fastestMs: undefined, players: {} };
    const players = await prisma.player.findMany({ where: { matchId } });
    players.forEach((player) => {
      runtime.players[player.userId] = { userId: player.userId, score: player.score, answered: false };
    });
    matchesRuntime.set(matchId, runtime);

    await prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.ACTIVE, actualStartTime: new Date() }
    });

    res.json({ ok: true, state: { ...runtime, players: Object.values(runtime.players) } });
  } catch (error) {
    res.status(500).json({ error: 'failed to start match', details: String(error) });
  }
});

r.post('/:id/resume', async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'match not found' });
    if (match.status !== MatchStatus.ACTIVE) return res.status(409).json({ error: 'match not active' });
    if (matchesRuntime.get(matchId)) return res.json({ ok: true, resumed: false, reason: 'already running' });

    const players = await prisma.player.findMany({ where: { matchId } });
    const runtime: any = { matchId, startedAt: Date.now(), currentIndex: 0, fastestMs: undefined, players: {} };
    players.forEach((player) => {
      runtime.players[player.userId] = { userId: player.userId, score: player.score, answered: false };
    });
    matchesRuntime.set(matchId, runtime);
    res.json({ ok: true, resumed: true, state: { ...runtime, players: Object.values(runtime.players) } });
  } catch (error) {
    res.status(500).json({ error: 'failed to resume', details: String(error) });
  }
});

r.post('/:id/answer', async (req, res) => {
  try {
    const userId = currentUser(req);
    const matchId = req.params.id;
    const { questionId, chosen, responseMs } = req.body || {};
    if (!questionId || typeof responseMs !== 'number') {
      return res.status(400).json({ error: 'questionId and responseMs required' });
    }

    const runtime = matchesRuntime.get(matchId);
    if (!runtime) return res.status(409).json({ error: 'match not active' });

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { answers: true }
    });
    if (!question) return res.status(404).json({ error: 'question not found' });

    const chosenAnswer = typeof chosen === 'string'
      ? question.answers.find((answer) => answer.id === chosen)
      : undefined;
    const isCorrect = Boolean(chosenAnswer?.isCorrect);

    const nowFastest = runtime.fastestMs === undefined ? responseMs : Math.min(runtime.fastestMs, responseMs);
    runtime.fastestMs = nowFastest;

    if (!runtime.players[userId]) {
      runtime.players[userId] = { userId, score: 0, answered: false };
    }

    let delta = 0;
    if (isCorrect) {
      delta = perQuestionScore(responseMs, runtime.fastestMs);
    }
    runtime.players[userId].score += delta;
    runtime.players[userId].answered = true;

    const questionOrder = Number.isInteger(runtime.currentIndex) ? Number(runtime.currentIndex) : 0;

    let matchQuestion = await prisma.matchQuestion.findFirst({
      where: { matchId, questionId },
      select: { id: true }
    });

    if (!matchQuestion) {
      matchQuestion = await prisma.matchQuestion.create({
        data: {
          matchId,
          questionId,
          roundNumber: 1,
          questionOrder: questionOrder + 1,
          shownAt: new Date()
        },
        select: { id: true }
      });
    }

    const persistedPlayer = await prisma.player.upsert({
      where: { matchId_userId: { matchId, userId } },
      update: { score: runtime.players[userId].score },
      create: { userId, matchId, score: runtime.players[userId].score }
    });

    await prisma.playerAnswer.upsert({
      where: { playerId_questionId: { playerId: persistedPlayer.id, questionId } },
      update: {
        answerId: chosenAnswer?.id ?? null,
        answeredAtMs: responseMs,
        isCorrect,
        pointsEarned: delta
      },
      create: {
        playerId: persistedPlayer.id,
        questionId,
        answerId: chosenAnswer?.id ?? null,
        answeredAtMs: responseMs,
        isCorrect,
        pointsEarned: delta
      }
    });

    const row = await prisma.player.findUnique({
      where: { matchId_userId: { matchId, userId } },
      select: { score: true }
    });

    res.json({
      ok: true,
      isCorrect,
      scoreDelta: delta,
      total: runtime.players[userId].score,
      dbScore: row?.score ?? null
    });
  } catch (error) {
    res.status(500).json({ error: 'failed to record answer', details: String(error) });
  }
});

r.post('/:id/next', async (req, res) => {
  try {
    const matchId = req.params.id;
    const runtime = matchesRuntime.get(matchId);
    if (!runtime) return res.status(409).json({ error: 'match not active' });
    runtime.currentIndex += 1;
    runtime.fastestMs = undefined;
    Object.values(runtime.players).forEach((player: any) => {
      player.answered = false;
    });
    res.json({ ok: true, currentIndex: runtime.currentIndex });
  } catch (error) {
    res.status(500).json({ error: 'failed to advance', details: String(error) });
  }
});

r.post('/:id/reconnect', async (req, res) => {
  try {
    const userId = currentUser(req);
    const matchId = req.params.id;
    await ensureUser(userId);
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'match not found' });
    const runtime = matchesRuntime.get(matchId);
    if (!runtime) {
      return res.json({ status: match.status, currentIndex: null, players: [] });
    }
    const me = runtime.players[userId] || { userId, score: 0, answered: false };
    res.json({
      status: MatchStatus.ACTIVE,
      currentIndex: runtime.currentIndex,
      fastestMs: runtime.fastestMs ?? null,
      you: me,
      players: Object.values(runtime.players)
    });
  } catch (error) {
    res.status(500).json({ error: 'failed to reconnect', details: String(error) });
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
    const live = Object.values(runtime.players).map((player: any) => ({ userId: player.userId, score: player.score }));
    const byId = new Map(rows.map((row) => [row.userId, row.score]));
    live.forEach((player: any) => byId.set(player.userId, player.score));
    rows = Array.from(byId, ([userId, score]) => ({ userId, score })) as typeof rows;
  }
  rows.sort((a, b) => b.score - a.score);
  res.json(rows);
});

r.get('/:id/state', async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'match not found' });
    const runtime = matchesRuntime.get(matchId);
    if (!runtime) {
      return res.json({ status: match.status, currentIndex: null, elapsedMs: 0, players: [] });
    }
    const now = Date.now();
    res.json({
      status: MatchStatus.ACTIVE,
      currentIndex: runtime.currentIndex,
      elapsedMs: runtime.startedAt ? now - runtime.startedAt : 0,
      players: Object.values(runtime.players)
    });
  } catch (error) {
    res.status(500).json({ error: 'failed to fetch state', details: String(error) });
  }
});

export default r;
