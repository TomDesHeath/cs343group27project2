import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useApiClient from "../hooks/useApiClient.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useSocket } from "../hooks/useSocket.js";
import { useGameSocket } from "../hooks/useGameSocket.js";

const STATUS_LABELS = {
  WAITING: "Waiting for players",
  READY: "Ready",
  ACTIVE: "In progress",
  LIVE: "Live",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
};

const formatStatus = (status) => STATUS_LABELS[status] ?? status ?? "Unknown";

const scoreSort = (a, b) => (b?.score ?? 0) - (a?.score ?? 0);

function PlayerRow({ player, isHost }) {
  const displayName = player.User?.username ?? player.userId ?? "Player";
  const readyLabel = player.isReady ? "Ready" : "Pending";
  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-sm text-content">
      <span className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: player.isReady ? "#16a34a" : "#f97316" }} />
        <span className="font-medium">{displayName}</span>
        {isHost && <span className="rounded-full bg-surface-subdued px-2 py-0.5 text-[11px] uppercase tracking-wide text-content-muted">Host</span>}
      </span>
      <span className="flex items-center gap-4 text-xs text-content-muted">
        <span className="rounded-full bg-surface-subdued px-2 py-1 text-content">{readyLabel}</span>
        <span className="rounded-full bg-brand-50 px-2 py-1 text-brand-600 font-semibold">{player.score ?? 0} pts</span>
      </span>
    </li>
  );
}

function EmptyState({ matchId }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-center text-content-muted">
      <p className="text-lg font-semibold text-content">Select a match to get started</p>
      <p className="text-sm">
        Provide a match ID in the URL, for example <code className="rounded bg-surface-subdued px-2 py-1 text-content">{`/play?match=${matchId ?? "MATCH_ID"}`}</code>, or create a new lobby first.
      </p>
      <div className="flex justify-center gap-3 text-sm">
        <Link to="/lobby" className="rounded-md bg-brand-500 px-4 py-2 font-medium text-content-inverted transition hover:bg-brand-600">
          Browse lobby
        </Link>
        <Link to="/create" className="rounded-md border border-brand-500 px-4 py-2 font-medium text-brand-600 transition hover:bg-brand-100">
          Create a match
        </Link>
      </div>
    </div>
  );
}

export default function MatchPlay() {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match");
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hasJoined = useRef(false);

  // Socket.IO connection
  const { socket, isConnected } = useSocket();
  
  // Game-specific socket events
  const {
    players: socketPlayers,
    hostId,
    currentQuestion,
    timeRemaining,
    leaderboard: socketLeaderboard,
    matchConfig,
    gameEnded,
    finalRanking,
    isReady,
    toggleReady,
    submitAnswer,
    startMatch: socketStartMatch,
    cancelMatch,
  } = useGameSocket(socket, matchId, user?.username || user?.email || 'Guest');

  // Track selected answer
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Reset answer state when new question appears
  useEffect(() => {
    if (currentQuestion) {
      setSelectedAnswer(null);
      setHasAnswered(false);
    }
  }, [currentQuestion]);

  const { data: match, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => client.get(`/matches/${matchId}`),
    enabled: Boolean(matchId),
    refetchInterval: 5000,
  });

  const joinMatch = useMutation({
    mutationFn: () => client.post(`/matches/${matchId}/join`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (joinError) => {
      console.error("Failed to join match", joinError);
    },
  });

  useEffect(() => {
    if (!matchId || hasJoined.current) {
      return;
    }
    hasJoined.current = true;
    joinMatch.mutate();
  }, [joinMatch, matchId]);

  const startMatch = useMutation({
    mutationFn: () => client.post(`/matches/${matchId}/start`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
  });

  const resumeMatch = useMutation({
    mutationFn: () => client.post(`/matches/${matchId}/resume`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
  });

  const isHost = Boolean(match && user && match.hostUserId === user.id);
  const sortedPlayers = useMemo(() => {
    if (!match?.players) {
      return [];
    }
    return [...match.players].sort(scoreSort);
  }, [match?.players]);

  if (!matchId) {
    return <EmptyState />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 text-content">
        <div className="animate-pulse space-y-4 rounded-lg border border-border bg-surface px-6 py-6">
          <div className="h-5 w-48 rounded bg-surface-subdued" />
          <div className="h-3 w-64 rounded bg-surface-subdued" />
          <div className="h-3 w-40 rounded bg-surface-subdued" />
        </div>
        <div className="animate-pulse space-y-3 rounded-lg border border-border bg-surface px-6 py-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 rounded bg-surface-subdued" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-content">
        <div className="rounded-lg border border-accent-danger bg-surface px-6 py-5 text-sm text-accent-danger">
          Failed to load match: {error?.message ?? "Unknown error"}.
        </div>
        <Link to="/lobby" className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-content-inverted transition hover:bg-brand-600">
          Back to lobby
        </Link>
      </div>
    );
  }

  if (!match) {
    return <EmptyState matchId={matchId} />;
  }

  const statusLabel = formatStatus(match.status);
  const canStart = isHost && ["WAITING", "READY"].includes(match.status ?? "");
  const canResume = isHost && match.status === "LIVE";

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 text-content">
      <header className="rounded-lg border border-border bg-surface px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-content-muted">Match</p>
            <h1 className="text-2xl font-semibold text-content">{match.title ?? "Untitled match"}</h1>
            <p className="mt-1 text-sm text-content-muted">
              #{(match.id ?? "").slice(0, 8)} • Host: {match.hostUserId ?? "Unknown"} • {match.Category?.name ?? "Any category"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
              {statusLabel}
            </span>
            <span className="text-xs text-content-muted">
              Per-question timer: {Math.round((match.perQuestionMs ?? match.perQuestionTimeMs ?? 20000) / 1000)}s
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md border border-border px-3 py-1.5 font-medium transition hover:border-brand-500 hover:text-brand-600"
          >
            Refresh
          </button>
          {canStart && (
            <button
              type="button"
              onClick={() => {
                // Use Socket.IO to start match instead of REST API
                socketStartMatch({
                  rounds: 2,
                  perRound: 5,
                  perQuestionMs: 20000,
                });
              }}
              className="rounded-md bg-brand-500 px-3 py-1.5 font-medium text-content-inverted transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-surface-subdued disabled:text-content-muted"
              disabled={!socket || !socket.connected}
            >
              {socket && socket.connected ? "Start match" : "Connecting..."}
            </button>
          )}
          {canResume && (
            <button
              type="button"
              onClick={() => resumeMatch.mutate()}
              className="rounded-md border border-brand-500 px-3 py-1.5 font-medium text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-border disabled:text-content-muted"
              disabled={resumeMatch.isPending}
            >
              {resumeMatch.isPending ? "Resuming…" : "Resume match"}
            </button>
          )}
        </div>
      </header>

      <section className="grid gap-6 rounded-lg border border-border bg-surface px-6 py-6 shadow-sm md:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {/* Game Ended - Final Results */}
          {gameEnded && finalRanking.length > 0 && (
            <div className="rounded-lg border-2 border-brand-500 bg-brand-50 px-6 py-5">
              <h2 className="text-2xl font-bold text-brand-700">Game Over!</h2>
              <p className="mt-2 text-sm text-brand-600">Final Rankings:</p>
              <ol className="mt-4 space-y-3">
                {finalRanking.map((player, index) => (
                  <li key={index} className="flex items-center justify-between rounded-md bg-white px-4 py-3 shadow-sm">
                    <span className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-brand-600">#{index + 1}</span>
                      <span className="font-semibold text-content">{player.displayName}</span>
                    </span>
                    <span className="text-lg font-bold text-brand-600">{player.points} pts</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex gap-3">
                <Link to="/lobby" className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                  Back to Lobby
                </Link>
                <Link to="/create" className="rounded-md border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-100">
                  Create New Match
                </Link>
              </div>
            </div>
          )}

          {/* Current Question */}
          {!gameEnded && currentQuestion && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-content">Question {currentQuestion.index}</h2>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-surface-subdued px-3 py-1 text-xs font-medium text-content-muted">
                    Round {currentQuestion.round}
                  </span>
                  {timeRemaining !== null && (
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${timeRemaining < 5000 ? 'bg-red-100 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
                      {Math.ceil(timeRemaining / 1000)}s
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-subdued px-6 py-5">
                <p className="text-lg font-medium text-content">{currentQuestion.text}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {currentQuestion.choices.map((choice, index) => {
                  const isSelected = selectedAnswer === choice;
                  const isCorrect = currentQuestion.revealed && index === currentQuestion.correctAnswerIndex;
                  const isWrong = currentQuestion.revealed && isSelected && !isCorrect;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (!hasAnswered && !currentQuestion.revealed) {
                          setSelectedAnswer(choice);
                          setHasAnswered(true);
                          submitAnswer(currentQuestion.questionId, choice);
                        }
                      }}
                      disabled={hasAnswered || currentQuestion.revealed}
                      className={`rounded-lg border-2 px-4 py-3 text-left font-medium transition ${
                        isCorrect
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : isWrong
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : isSelected
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-border bg-surface text-content hover:border-brand-500 hover:bg-brand-50'
                      } disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-bold">{String.fromCharCode(65 + index)}.</span>
                        {choice}
                        {isCorrect && <span className="ml-auto text-green-600 font-bold">CORRECT</span>}
                        {isWrong && <span className="ml-auto text-red-600 font-bold">WRONG</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              {hasAnswered && !currentQuestion.revealed && (
                <div className="rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  Answer submitted! Waiting for other players...
                </div>
              )}

              {currentQuestion.revealed && (
                <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                  Correct answer: <strong>{currentQuestion.correctAnswer}</strong>
                </div>
              )}
            </div>
          )}

          {/* Waiting for game to start */}
          {!gameEnded && !currentQuestion && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-content">Players</h2>
                <span className="text-xs uppercase tracking-wide text-content-muted">{sortedPlayers.length} joined</span>
              </div>
              {sortedPlayers.length === 0 ? (
                <div className="rounded-md border border-border bg-surface-subdued px-4 py-5 text-sm text-content-muted">
                  No players have joined yet.
                </div>
              ) : (
                <ul className="space-y-3">
                  {sortedPlayers.map((player) => (
                    <PlayerRow key={player.id} player={player} isHost={player.userId === match.hostUserId} />
                  ))}
                </ul>
              )}

              {/* Socket Connection Status */}
              {socket && (
                <div className="rounded-md border border-dashed border-brand-200 bg-brand-50 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${socket.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium text-brand-700">
                      {socket.connected ? 'Real-time connection active' : 'Connecting to game server...'}
                    </span>
                  </div>
                  {socket.connected && (
                    <p className="mt-2 text-xs text-brand-600">
                      Ready to play! The host can start the match when ready.
                    </p>
                  )}
                </div>
              )}

              {/* Ready Button */}
              <button
                onClick={toggleReady}
                className={`w-full rounded-md px-4 py-2 font-medium transition ${
                  isReady
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-surface-subdued text-content-muted hover:bg-brand-500 hover:text-white'
                }`}
              >
                {isReady ? 'Ready!' : 'Mark as Ready'}
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-md border border-border bg-surface-subdued px-4 py-4 text-sm text-content-muted">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">Match details</h3>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between">
                <dt>Created</dt>
                <dd>{new Date(match.createdAt ?? Date.now()).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Status</dt>
                <dd>{statusLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Max players</dt>
                <dd>{match.maxPlayers ?? "—"}</dd>
              </div>
              {matchConfig && (
                <>
                  <div className="flex justify-between">
                    <dt>Rounds</dt>
                    <dd>{matchConfig.rounds}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Per Round</dt>
                    <dd>{matchConfig.perRound} questions</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">Live scoreboard</h3>
            <ol className="mt-3 space-y-2 text-sm">
              {(socketLeaderboard.length > 0 ? socketLeaderboard : sortedPlayers).length === 0 ? (
                <li>No scores yet.</li>
              ) : (
                (socketLeaderboard.length > 0 ? socketLeaderboard : sortedPlayers.slice(0, 5)).map((player, index) => (
                  <li key={player.id || index} className="flex items-center justify-between rounded bg-surface px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                        {index + 1}
                      </span>
                      <span className="font-medium text-content">
                        {player.displayName || player.User?.username || player.userId || "Player"}
                      </span>
                    </span>
                    <span className="font-semibold text-content">{player.points || player.score || 0}</span>
                  </li>
                ))
              )}
            </ol>
          </div>

          {/* Real-time Players from Socket */}
          {socketPlayers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">Live Players</h3>
              <ul className="mt-3 space-y-2 text-xs">
                {socketPlayers.map((player, index) => (
                  <li key={index} className="flex items-center justify-between rounded bg-surface px-2 py-1">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${player.ready ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {player.displayName}
                    </span>
                    <span>{player.points} pts</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
