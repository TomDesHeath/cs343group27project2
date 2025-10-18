/**
 * Real-Time Match Engine (Socket.IO)
 * ----------------------------------
 * This module wires up all realtime game behavior for the trivia app:
 * - Manages in-memory match state (players, host, stage, timers).
 * - Loads questions from DB (via Prisma) with a JSON fallback.
 * - Sets up the game loop: lobby → questions → scoring → end.
 * - Emits presence, timer ticks, score updates, and reveal events.
 * - Supports scheduled starts, host cancel, and late join/ready sync.
 *
 * Key concepts:
 * - MatchState: in-memory snapshot per match room (match:<id>).
 * - Required responders: only ready players are required to answer.
 * - Scoring: fastest-answer bonus via response-time-based awards.
 * - Timers: per-question hard timeout + 1s tick broadcast.
 *
 * Security note:
 * - Assumes a trusted socket identity for host/user (no JWT here).
 *   Add auth/room authorization at the gateway layer in production.
 */

import { Server, Socket } from "socket.io";
import fs from "fs";
import path from "path";
import { prisma } from "../config/database";

type Question = {
  id: string;
  text: string;
  choices: string[];
  correctAnswer: string;
  correctAnswerIndex: number;
  category?: string;
  difficulty?: string;
  source?: string;
};

type Player = {
  socketId: string;
  displayName: string;
  ready: boolean;
  points: number;
  answeredFor?: string; // question id answered in current round
  correctCount: number;
  totalResponseTimeMs: number; // cumulative ms for tie-breaks
};

type SubmissionRecord = {
  correct: boolean;
  responseMs: number;
};

type QuestionRuntime = {
  submissions: Map<string, SubmissionRecord>;
  fastestCorrectMs?: number;
};

type StartMatchConfig = {
  rounds: number;
  perRound: number;
  perQuestionMs: number;
  category?: string;
  difficulty?: string;
};

type StartAttempt = {
  ok: boolean;
  reason?: "insufficient-pool" | "window-violation";
  available?: number;
  required?: number;
};


type MatchState = {
  id: string;
  hostSocketId?: string;
  players: Record<string, Player>; // by socketId
  questionList: Question[];
  stage: "lobby" | "in_progress" | "ended";
  currentIndex: number; // 0-based index into questionList
  perQuestionMs: number;
  timer?: NodeJS.Timeout;
  questionEndsAt?: number; // epoch ms
  category?: string;
  difficulty?: string;
  rounds?: number;
  perRound?: number;
  tickInterval?: NodeJS.Timeout;
  questionResolved?: boolean;
  requiredResponders?: Set<string>;
  questionStartedAt?: number;
  currentQuestionStats?: QuestionRuntime;
  scheduledStartMs?: number;
  scheduledStartTimer?: NodeJS.Timeout;
  scheduledStartConfig?: StartMatchConfig;
};

const matches = new Map<string, MatchState>();

function loadQuestions(): Question[] {
  const p = path.join(__dirname, "..", "..", "questions.json");
  try {
    const buf = fs.readFileSync(p, "utf-8");
    const arr = JSON.parse(buf) as Question[];
    return arr;
  } catch (e) {
    console.error("Failed to load questions.json", e);
    return [];
  }
}

function toPresencePlayers(players: Record<string, Player>) {
  return Object.values(players).map((p) => ({
    displayName: p.displayName,
    ready: p.ready,
    points: p.points,
  }));
}

function broadcastPresence(io: Server, match: MatchState) {
  io.to(roomId(match.id)).emit("presence:update", {
    players: toPresencePlayers(match.players),
    hostId: match.hostSocketId,
  });
}

function roomId(matchId: string) {
  return `match:${matchId}`;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function averageResponseMs(player: Player) {
  return player.correctCount > 0 ? player.totalResponseTimeMs / player.correctCount : Number.POSITIVE_INFINITY;
}

function playerComparator(a: Player, b: Player) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
  const avgA = averageResponseMs(a);
  const avgB = averageResponseMs(b);
  if (avgA !== avgB) return avgA - avgB;
  return a.displayName.localeCompare(b.displayName);
}

function buildLeaderboard(match: MatchState) {
  return Object.values(match.players)
    .sort(playerComparator)
    .map((p) => ({
      displayName: p.displayName,
      points: p.points,
      correct: p.correctCount,
      averageResponseMs: p.correctCount > 0 ? Math.round(p.totalResponseTimeMs / p.correctCount) : null,
    }));
}

function emitScoreboard(io: Server, match: MatchState) {
  const leaderboard = buildLeaderboard(match);
  io.to(roomId(match.id)).emit("score:update", { leaderboard });
  return leaderboard;
}

function startTimer(io: Server, match: MatchState) {
  const now = Date.now();
  match.questionEndsAt = now + match.perQuestionMs;
  // tick every 1s
  if (match.tickInterval) clearInterval(match.tickInterval);
  match.tickInterval = setInterval(() => {
    if (!match.questionEndsAt) return;
    const msRemaining = Math.max(0, match.questionEndsAt - Date.now());
    io.to(roomId(match.id)).emit("timer:tick", { msRemaining });
  }, 1000);
  // clear after done
  setTimeout(() => {
    if (match.tickInterval) {
      clearInterval(match.tickInterval);
      match.tickInterval = undefined;
    }
  }, match.perQuestionMs + 50);
}

function clearQuestionTimers(match: MatchState) {
  if (match.timer) {
    clearTimeout(match.timer);
    match.timer = undefined;
  }
  if (match.tickInterval) {
    clearInterval(match.tickInterval);
    match.tickInterval = undefined;
  }
  match.questionEndsAt = undefined;
}

function applyQuestionScoring(match: MatchState) {
  const stats = match.currentQuestionStats;
  if (!stats) {
    match.questionStartedAt = undefined;
    return;
  }
  let fastest = Number.POSITIVE_INFINITY;
  for (const submission of stats.submissions.values()) {
    if (submission.correct) {
      fastest = Math.min(fastest, submission.responseMs);
    }
  }
  if (!Number.isFinite(fastest)) {
    match.currentQuestionStats = undefined;
    match.questionStartedAt = undefined;
    return;
  }
  stats.fastestCorrectMs = fastest;
  for (const [socketId, submission] of stats.submissions.entries()) {
    if (!submission.correct) continue;
    const player = match.players[socketId];
    if (!player) continue;
    const delta = Math.max(0, submission.responseMs - fastest);
    const penalty = Math.floor(delta / 100);
    const award = Math.max(0, 100 - penalty);
    player.points += award;
    player.correctCount += 1;
    player.totalResponseTimeMs += submission.responseMs;
  }
  match.currentQuestionStats = undefined;
  match.questionStartedAt = undefined;
}

function clearScheduledStart(match: MatchState) {
  let cleared = false;
  if (match.scheduledStartTimer) {
    clearTimeout(match.scheduledStartTimer);
    match.scheduledStartTimer = undefined;
    cleared = true;
  }
  if (typeof match.scheduledStartMs !== "undefined") {
    match.scheduledStartMs = undefined;
    cleared = true;
  }
  if (match.scheduledStartConfig) {
    match.scheduledStartConfig = undefined;
    cleared = true;
  }
  return cleared;
}

function sanitizeStartConfig(
  input: { rounds?: number; perRound?: number; perQuestionMs?: number; category?: string; difficulty?: string },
  fallbackPerQuestionMs: number
): StartMatchConfig {
  const roundsRaw = Number(input.rounds);
  const perRoundRaw = Number(input.perRound);
  const perQuestionRaw = Number(input.perQuestionMs);
  const rounds = Number.isFinite(roundsRaw) && roundsRaw > 0 ? Math.floor(roundsRaw) : 1;
  const perRound = Number.isFinite(perRoundRaw) && perRoundRaw > 0 ? Math.floor(perRoundRaw) : 3;
  const perQuestionMs = Math.max(3000, Number.isFinite(perQuestionRaw) && perQuestionRaw > 0 ? Math.floor(perQuestionRaw) : Math.floor(fallbackPerQuestionMs));
  const category = (input.category || "").trim() || undefined;
  const difficulty = (input.difficulty || "").trim() || undefined;
  return { rounds, perRound, perQuestionMs, category, difficulty };
}

function startMatch(io: Server, match: MatchState, allQuestions: Question[], config: StartMatchConfig): StartAttempt {
  const total = Math.max(1, config.rounds * config.perRound);
  let pool = allQuestions;
  if (config.category) {
    const cat = config.category.toLowerCase();
    pool = pool.filter((q) => (q.category || "").trim().toLowerCase() === cat);
  }
  if (config.difficulty) {
    const diff = config.difficulty.toLowerCase();
    pool = pool.filter((q) => (q.difficulty || "").trim().toLowerCase() === diff);
  }
  if (pool.length < total) {
    return { ok: false, reason: "insufficient-pool", available: pool.length, required: total };
  }

  clearQuestionTimers(match);
  match.category = config.category;
  match.difficulty = config.difficulty;
  match.rounds = config.rounds;
  match.perRound = config.perRound;
  match.perQuestionMs = Math.max(3000, config.perQuestionMs);
  match.questionList = pickRandom(pool, total);
  match.stage = "in_progress";
  match.currentIndex = 0;
  match.questionResolved = false;
  match.requiredResponders = undefined;
  match.currentQuestionStats = undefined;
  match.questionStartedAt = undefined;
  const scheduleCleared = clearScheduledStart(match);

  for (const player of Object.values(match.players)) {
    player.points = 0;
    player.answeredFor = undefined;
    player.correctCount = 0;
    player.totalResponseTimeMs = 0;
  }

  io.to(roomId(match.id)).emit("lobby:config", {
    matchId: match.id,
    category: match.category,
    difficulty: match.difficulty,
    rounds: match.rounds,
    perRound: match.perRound,
    perQuestionMs: match.perQuestionMs,
  });
  emitScoreboard(io, match);
  if (scheduleCleared) {
    io.to(roomId(match.id)).emit("lobby:schedule", { matchId: match.id, scheduledStartMs: null });
  }
  showQuestion(io, match);
  return { ok: true };
}

function scheduleAutomaticStart(io: Server, match: MatchState, allQuestions: Question[]) {
  if (!match.scheduledStartMs || !match.scheduledStartConfig) return;
  if (match.scheduledStartTimer) {
    clearTimeout(match.scheduledStartTimer);
    match.scheduledStartTimer = undefined;
  }
  const delay = Math.max(0, match.scheduledStartMs - Date.now());
  match.scheduledStartTimer = setTimeout(() => {
    const current = matches.get(match.id);
    if (!current || current.stage !== "lobby" || !current.scheduledStartConfig) return;
    const result = startMatch(io, current, allQuestions, current.scheduledStartConfig);
    if (!result.ok) {
      const hostId = current.hostSocketId;
      if (hostId) {
        const hostSocket = io.sockets.sockets.get(hostId);
        hostSocket?.emit("host:start:ack", {
          accepted: false,
          auto: true,
          reason: result.reason,
          available: result.available,
          required: result.required,
        });
      }
    }
  }, delay);
}

function finishQuestion(io: Server, match: MatchState) {
  if (match.questionResolved) return;
  match.questionResolved = true;
  const q = match.questionList[match.currentIndex];
  if (!q) return;
  clearQuestionTimers(match);
  applyQuestionScoring(match);
  match.requiredResponders = undefined;
  revealAndNext(io, match, q);
}


function revealAndNext(io: Server, match: MatchState, q: Question) {
  // Reveal correct answer
  io.to(roomId(match.id)).emit("question:reveal", {
    questionId: q.id,
    correctAnswer: q.correctAnswer,
    correctAnswerIndex: q.correctAnswerIndex,
  });

  const leaderboard = emitScoreboard(io, match);

  // short pause then next question or end
  setTimeout(() => {
    if (match.stage !== "in_progress") return; // cancelled or ended
    match.currentIndex += 1;
    // reset per-player answered flag
    Object.values(match.players).forEach((p) => (p.answeredFor = undefined));
    if (match.currentIndex >= match.questionList.length) {
      match.stage = "ended";
      io.to(roomId(match.id)).emit("match:end", { ranking: leaderboard });
      return;
    }
    showQuestion(io, match);
  }, 1500);
}

function allRequiredPlayersAnswered(match: MatchState, questionId: string) {
  const responders = match.requiredResponders;
  if (!responders || responders.size === 0) return false;
  for (const socketId of responders) {
    const player = match.players[socketId];
    if (!player || player.answeredFor !== questionId) {
      return false;
    }
  }
  return true;
}

function showQuestion(io: Server, match: MatchState) {
  if (match.stage !== "in_progress") return;
  clearQuestionTimers(match);
  match.questionResolved = false;
  const responderIds = Object.entries(match.players)
    .filter(([, p]) => p.ready)
    .map(([socketId]) => socketId);
  const participants = responderIds.length > 0 ? responderIds : Object.keys(match.players);
  match.requiredResponders = new Set(participants);
  const q = match.questionList[match.currentIndex];
  const questionStart = Date.now();
  match.questionStartedAt = questionStart;
  match.currentQuestionStats = { submissions: new Map() };
  const payload = {
    round: 1 + Math.floor(match.currentIndex / Math.max(1, Math.floor(match.questionList.length))),
    index: match.currentIndex + 1,
    questionId: q.id,
    text: q.text,
    choices: q.choices,
    timeLimitMs: match.perQuestionMs,
    endsAtMs: questionStart + match.perQuestionMs,
  };
  io.to(roomId(match.id)).emit("question:show", payload);
  startTimer(io, match);
  match.timer = setTimeout(() => finishQuestion(io, match), match.perQuestionMs);
}

export function initSockets(io: Server) {
  let allQuestions = loadQuestions();
  // Prefer DB at runtime; fall back to JSON file if DB not ready
  prisma.question
    .findMany({ include: { answers: true, category: true } })
    .then((rows) => {
      const mapped = rows
        .map((q) => {
          const answers = [...q.answers].sort((a, b) => a.id.localeCompare(b.id));
          const choices = answers.map((a) => a.text);
          const correctIndex = answers.findIndex((a) => a.isCorrect);
          return {
            id: q.id,
            text: q.text,
            choices,
            correctAnswer: correctIndex >= 0 ? answers[correctIndex].text : "",
            correctAnswerIndex: Math.max(0, correctIndex),
            category: q.category?.name,
            difficulty: (q as any).difficulty?.toString?.().toLowerCase?.(),
            source: q.source || undefined,
          } as Question;
        })
        .filter((q) => q.choices.length >= 2);
      if (mapped.length > 0) {
        allQuestions = mapped;
        console.log(`Loaded ${allQuestions.length} questions from DB`);
      } else {
        console.warn("No questions found in DB; using questions.json fallback");
      }
    })
    .catch((err) => {
      console.error("DB question load failed; using questions.json", err);
    });

  io.on("connection", (socket: Socket) => {
    // join match
    socket.on("match:join", (d: { matchId: string; displayName: string }) => {
      const matchId = (d?.matchId || "").trim();
      const displayName = (d?.displayName || "Player").trim();
      if (!matchId) return;

      let match = matches.get(matchId);
      if (!match) {
        match = {
          id: matchId,
          players: {},
          questionList: [],
          stage: "lobby",
          currentIndex: 0,
          perQuestionMs: 20000,
        };
        matches.set(matchId, match);
      }
      socket.join(roomId(matchId));
      if (!match.hostSocketId) match.hostSocketId = socket.id;

      match.players[socket.id] = {
        socketId: socket.id,
        displayName,
        ready: false,
        points: 0,
        correctCount: 0,
        totalResponseTimeMs: 0,
      };
      broadcastPresence(io, match);

      // If a player joins mid-round, sync them with current question and timer + leaderboard
      if (match.stage === "in_progress") {
        const q = match.questionList[match.currentIndex];
        if (q && match.questionEndsAt) {
          const msRemaining = Math.max(0, match.questionEndsAt - Date.now());
          socket.emit("question:show", {
            round: 1 + Math.floor(match.currentIndex / Math.max(1, Math.floor(match.questionList.length))),
            index: match.currentIndex + 1,
            questionId: q.id,
            text: q.text,
            choices: q.choices,
            timeLimitMs: match.perQuestionMs,
            endsAtMs: match.questionEndsAt ?? Date.now() + msRemaining,
          });
          socket.emit("timer:tick", { msRemaining });
          const leaderboard = buildLeaderboard(match);
          socket.emit("score:update", { leaderboard });
        }
      }
    });

    // ready/unready
    socket.on("lobby:ready", (d: { matchId: string; ready: boolean }) => {
      const match = d?.matchId ? matches.get(d.matchId) : undefined;
      if (!match || match.stage === "ended") return;
      const p = match.players[socket.id];
      if (!p) return;
      const nextReady = !!d.ready;
      if (p.ready === nextReady) return;
      p.ready = nextReady;

      if (match.stage === "in_progress") {
        const activeQuestion = !match.questionResolved ? match.questionList[match.currentIndex] : undefined;
        if (activeQuestion) {
          match.requiredResponders ??= new Set();
          if (nextReady) {
            match.requiredResponders.add(socket.id);
            // resync question + timer + leaderboard for late-ready player
            const payload = {
              round: 1 + Math.floor(match.currentIndex / Math.max(1, Math.floor(match.questionList.length))),
              index: match.currentIndex + 1,
              questionId: activeQuestion.id,
              text: activeQuestion.text,
              choices: activeQuestion.choices,
              timeLimitMs: match.perQuestionMs,
              endsAtMs: match.questionEndsAt,
            };
            socket.emit("question:show", payload);
            if (match.questionEndsAt) {
              const msRemaining = Math.max(0, match.questionEndsAt - Date.now());
              socket.emit("timer:tick", { msRemaining });
            }
            const leaderboard = buildLeaderboard(match);
            socket.emit("score:update", { leaderboard });
          } else if (match.requiredResponders.has(socket.id)) {
            match.requiredResponders.delete(socket.id);
            if (match.requiredResponders.size === 0 || allRequiredPlayersAnswered(match, activeQuestion.id)) {
              finishQuestion(io, match);
            }
          }
        }
      }

      broadcastPresence(io, match);
    });

    // start match (host)
    socket.on(
      "host:start",
      (d: {
        matchId: string;
        rounds?: number;
        perRound?: number;
        perQuestionMs?: number;
        category?: string;
        difficulty?: string;
      }) => {
        const match = d?.matchId ? matches.get(d.matchId) : undefined;
        if (!match) return;
        if (match.stage !== "lobby") return;

        if (match.hostSocketId && match.hostSocketId !== socket.id) return;

        if (typeof match.scheduledStartMs === "number") {
          const now = Date.now();
          if (now < match.scheduledStartMs - 30000 || now > match.scheduledStartMs + 30000) {
            socket.emit("host:start:ack", {
              accepted: false,
              reason: "window-violation",
              scheduledStartMs: match.scheduledStartMs,
            });
            return;
          }
        }

        const config = sanitizeStartConfig(d || {}, match.perQuestionMs || 20000);
        const result = startMatch(io, match, allQuestions, config);

        if (!result.ok) {
          socket.emit("host:start:ack", {
            accepted: false,
            reason: result.reason,
            available: result.available,
            required: result.required,
          });
          return;
        }

        socket.emit("host:start:ack", { accepted: true });
      }
    );

    socket.on(
      "host:schedule",
      (d: {
        matchId: string;
        scheduledStartMs?: number | null;
        rounds?: number;
        perRound?: number;
        perQuestionMs?: number;
        category?: string;
        difficulty?: string;
      }) => {
        const match = d?.matchId ? matches.get(d.matchId) : undefined;
        if (!match) return;
        if (match.stage !== "lobby") return;
        if (match.hostSocketId && match.hostSocketId !== socket.id) return;

        if (d?.scheduledStartMs === undefined || d.scheduledStartMs === null) {
          const cleared = clearScheduledStart(match);
          socket.emit("host:schedule:ack", { accepted: true, scheduledStartMs: null });
          if (cleared) {
            io.to(roomId(match.id)).emit("lobby:schedule", { matchId: match.id, scheduledStartMs: null });
          }
          return;
        }

        const scheduledRaw = Number(d.scheduledStartMs);
        if (!Number.isFinite(scheduledRaw)) {
          socket.emit("host:schedule:ack", { accepted: false, reason: "invalid-time" });
          return;
        }
        const scheduledStartMs = Math.floor(scheduledRaw);
        const now = Date.now();
        if (scheduledStartMs < now - 30000) {
          socket.emit("host:schedule:ack", {
            accepted: false,
            reason: "window-violation",
            scheduledStartMs,
          });
          return;
        }

        const config = sanitizeStartConfig(d || {}, match.perQuestionMs || 20000);
        match.scheduledStartMs = scheduledStartMs;
        match.scheduledStartConfig = config;
        scheduleAutomaticStart(io, match, allQuestions);

        socket.emit("host:schedule:ack", { accepted: true, scheduledStartMs });
        io.to(roomId(match.id)).emit("lobby:schedule", { matchId: match.id, scheduledStartMs });
      }
    );

    // host cancel
    socket.on("host:cancel", (d: { matchId: string }) => {
      const match = d?.matchId ? matches.get(d.matchId) : undefined;
      if (!match) return;
      if (match.hostSocketId && match.hostSocketId !== socket.id) return;
      if (match.stage === "ended") return;
      clearQuestionTimers(match);
      const scheduleCleared = clearScheduledStart(match);
      match.questionResolved = true;
      match.requiredResponders = undefined;
      match.stage = "ended";
      const leaderboard = buildLeaderboard(match);
      io.to(roomId(match.id)).emit("match:end", { ranking: leaderboard, reason: "cancelled" });
      if (scheduleCleared) {
        io.to(roomId(match.id)).emit("lobby:schedule", { matchId: match.id, scheduledStartMs: null });
      }
    });

    // answer submission
    socket.on(
      "answer:submit",
      (d: { matchId: string; questionId: string; answer: string; atMs?: number }) => {
        const match = d?.matchId ? matches.get(d.matchId) : undefined;
        if (!match || match.stage !== "in_progress") return;
        const q = match.questionList[match.currentIndex];
        if (!q || q.id !== d.questionId) return;
        const player = match.players[socket.id];
        if (!player) return;
        if (!player.ready) {
          socket.emit("answer:ack", { accepted: false, reason: "not-ready" });
          return;
        }
        if (player.answeredFor === q.id) {
          socket.emit("answer:ack", { accepted: false, reason: "already-answered" });
          return;
        }
        if (!match.questionEndsAt || Date.now() > match.questionEndsAt) {
          socket.emit("answer:ack", { accepted: false, reason: "late" });
          return;
        }

        player.answeredFor = q.id;
        const correct = (d.answer || "").trim() === q.correctAnswer;
        const now = Date.now();
        const questionStart = match.questionStartedAt ?? now;
        const elapsedMs = Math.max(0, Math.min(match.perQuestionMs, now - questionStart));
        if (!match.currentQuestionStats) {
          match.currentQuestionStats = { submissions: new Map() };
        }
        match.currentQuestionStats.submissions.set(socket.id, {
          correct,
          responseMs: elapsedMs,
        });
        if (correct && match.currentQuestionStats) {
          if (typeof match.currentQuestionStats.fastestCorrectMs === "undefined" || elapsedMs < match.currentQuestionStats.fastestCorrectMs) {
            match.currentQuestionStats.fastestCorrectMs = elapsedMs;
          }
        }

        socket.emit("answer:ack", { accepted: true, correctKnown: false });

        if (allRequiredPlayersAnswered(match, q.id)) {
          finishQuestion(io, match);
        }
      }
    );

    socket.on("disconnect", () => {
      // Remove player from any match and broadcast presence
      for (const match of matches.values()) {
        if (match.players[socket.id]) {
          delete match.players[socket.id];
          // Reassign host if needed
          if (match.hostSocketId === socket.id) {
            match.hostSocketId = Object.keys(match.players)[0];
          }
          if (match.requiredResponders?.has(socket.id)) {
            match.requiredResponders.delete(socket.id);
            if (match.stage === "in_progress" && !match.questionResolved) {
              const current = match.questionList[match.currentIndex];
              if (!current || match.requiredResponders.size === 0 || allRequiredPlayersAnswered(match, current.id)) {
                finishQuestion(io, match);
              }
            }
          }
          broadcastPresence(io, match);
        }
      }
    });
  });
}
