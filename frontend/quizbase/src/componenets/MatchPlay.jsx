import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const STATUS_META = {
  pending: {
    label: "Awaiting approval",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Approved",
    tone: "border-brand-200 bg-brand-50 text-brand-600",
  },
  ready: {
    label: "Ready",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

const SAMPLE_MATCH = {
  id: "AB7Q",
  name: "Science Sprint Showdown",
  hostId: "host",
  settings: {
    category: "Science & Nature",
    questionCount: 10,
    questionTimeLimitSec: 15,
    privacy: "Private (code only)",
  },
  players: [
    { id: "host", name: "Alex Rivers", score: 1420, streak: 3, status: "ready" },
    { id: "you", name: "Jordan Lee", score: 1280, streak: 1, status: "pending" },
    { id: "mira", name: "Mira Shah", score: 1110, streak: 0, status: "ready" },
  ],
  questions: [
    {
      id: "q1",
      category: "Science",
      prompt: "What planet in our solar system is known for its prominent ring system?",
      choices: ["Mars", "Saturn", "Neptune", "Venus"],
      answerIndex: 1,
      explanation: "Saturn's rings are the most extensive and visible in our solar system.",
    },
    {
      id: "q2",
      category: "History",
      prompt: "In which year did the Second World War end?",
      choices: ["1942", "1945", "1948", "1951"],
      answerIndex: 1,
      explanation: "World War II ended in 1945 following the surrender of Germany and later Japan.",
    },
    {
      id: "q3",
      category: "Geography",
      prompt: "Which river runs through the city of Paris?",
      choices: ["Danube", "Seine", "Thames", "Rhine"],
      answerIndex: 1,
      explanation: "The Seine River flows through Paris and is central to the city's geography.",
    },
  ],
};

const QUESTION_TIME_MS = 15000;

function MatchPlay() {
  const [searchParams] = useSearchParams();
  const activeMatchCode = searchParams.get("match") ?? SAMPLE_MATCH.id;
  const defaultRole = searchParams.get("as") === "host" ? "host" : "player";

  const [role, setRole] = useState(defaultRole);
  const [phase, setPhase] = useState("waiting");
  const [roster, setRoster] = useState(() => SAMPLE_MATCH.players);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_MS);
  const [showAnswer, setShowAnswer] = useState(false);

  const currentPlayerId = role === "host" ? SAMPLE_MATCH.hostId : "you";
  const isHost = role === "host";

  const activePlayers = useMemo(() => roster.filter((player) => player.status !== "removed"), [roster]);

  const currentPlayer = activePlayers.find((player) => player.id === currentPlayerId);
  const pendingApproval = activePlayers.filter((player) => player.status === "pending").length;
  const readyCount = activePlayers.filter((player) => player.status === "ready").length;
  const everyoneReady = activePlayers.length > 0 && readyCount === activePlayers.length;

  useEffect(() => {
    if (phase !== "playing" || showAnswer) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1000) {
          window.clearInterval(interval);
          setShowAnswer(true);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, questionIndex, showAnswer]);

  useEffect(() => {
    if (phase !== "playing") {
      return;
    }

    setTimeRemaining(QUESTION_TIME_MS);
    setSelectedChoice(null);
    setShowAnswer(false);
  }, [questionIndex, phase]);

  useEffect(() => {
    if (phase !== "playing") {
      return;
    }

    setQuestionIndex(0);
    setSelectedChoice(null);
    setShowAnswer(false);
    setTimeRemaining(QUESTION_TIME_MS);
  }, [phase]);

  const playerStandings = useMemo(() => {
    return activePlayers.map((player) => {
      let projectedScore = player.score;
      if (
        phase === "playing" &&
        player.id === currentPlayerId &&
        selectedChoice !== null &&
        !showAnswer
      ) {
        projectedScore += 100;
      }
      return { ...player, projectedScore };
    });
  }, [activePlayers, currentPlayerId, phase, selectedChoice, showAnswer]);

  const handleApprove = (playerId) => {
    setRoster((prev) =>
      prev.map((player) => (player.id === playerId ? { ...player, status: "approved" } : player)),
    );
  };

  const handleToggleReady = (playerId) => {
    setRoster((prev) =>
      prev.map((player) => {
        if (player.id !== playerId) {
          return player;
        }
        if (player.status === "ready") {
          return { ...player, status: "approved" };
        }
        if (player.status === "approved") {
          return { ...player, status: "ready" };
        }
        return player;
      }),
    );
  };

  const handleReadyToggle = () => {
    if (!currentPlayer || currentPlayer.status === "pending") {
      return;
    }
    handleToggleReady(currentPlayerId);
  };

  const handleStartMatch = () => {
    if (!isHost || !everyoneReady) {
      return;
    }
    setPhase("playing");
  };

  const handleSelect = (index) => {
    if (phase !== "playing" || showAnswer) {
      return;
    }
    setSelectedChoice(index);
  };

  const handleReveal = () => {
    if (phase !== "playing" || showAnswer) {
      return;
    }
    setShowAnswer(true);
  };

  const handleNext = () => {
    if (phase !== "playing") {
      return;
    }

    if (questionIndex === SAMPLE_MATCH.questions.length - 1) {
      return;
    }

    setQuestionIndex((prev) => prev + 1);
  };

  const sortedPlayers = [...activePlayers].sort((a, b) => {
    if (a.id === SAMPLE_MATCH.hostId && b.id !== SAMPLE_MATCH.hostId) {
      return -1;
    }
    if (b.id === SAMPLE_MATCH.hostId && a.id !== SAMPLE_MATCH.hostId) {
      return 1;
    }
    if (a.id === currentPlayerId && b.id !== currentPlayerId) {
      return -1;
    }
    if (b.id === currentPlayerId && a.id !== currentPlayerId) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  const waitingSummaryMessage = pendingApproval > 0
    ? `${pendingApproval} player${pendingApproval > 1 ? "s" : ""} awaiting approval`
    : everyoneReady
      ? "All players are ready – start whenever you're set."
      : "Waiting for players to ready up.";

  const playerSummaryMessage = !currentPlayer
    ? "Waiting room"
    : currentPlayer.status === "pending"
      ? "Hang tight — the host will approve you shortly."
      : currentPlayer.status === "approved"
        ? "Ready up when you're set. We'll move you into the match automatically."
        : "You're ready! Waiting on the host to start the match.";

  const currentQuestion = phase === "playing" ? SAMPLE_MATCH.questions[questionIndex] : null;
  const totalQuestions = SAMPLE_MATCH.questions.length;
  const progressPercent = phase === "playing" ? Math.round(((questionIndex + 1) / totalQuestions) * 100) : 0;
  const secondsRemaining = phase === "playing" ? Math.ceil(timeRemaining / 1000) : 0;
  const answerIndex = currentQuestion?.answerIndex ?? -1;

  let headerContent;
  let bodyContent;

  if (phase === "waiting") {
    headerContent = (
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-surface/80 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-content-muted">
            Waiting room · #{activeMatchCode}
          </p>
          <h1 className="mt-2 text-xl font-semibold text-content">{SAMPLE_MATCH.name}</h1>
          <p className="mt-1 text-sm text-content-subtle">
            The host approves players before everyone readies up to begin the quiz.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 text-sm md:items-end">
          <div className="rounded-md border border-border bg-surface px-3 py-2 text-content">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              Match code
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tracking-widest">
              {activeMatchCode.toUpperCase()}
            </p>
          </div>
          <div className="grid gap-1 text-xs text-content-muted">
            <span className="font-medium text-content">
              {readyCount} of {activePlayers.length} ready
            </span>
            {pendingApproval > 0 && <span>{pendingApproval} waiting for approval</span>}
          </div>
        </div>
      </header>
    );

    bodyContent = (
      <section className="grid gap-6 rounded-lg border border-border bg-surface/80 p-6 md:grid-cols-[2fr,1fr]">
        <div>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-content">Players in lobby</h2>
              <p className="text-sm text-content-subtle">
                Approve new players, then wait for everyone to mark themselves ready.
              </p>
            </div>
            <p className="text-xs uppercase tracking-wide text-content-muted">
              Host: {SAMPLE_MATCH.players.find((player) => player.id === SAMPLE_MATCH.hostId)?.name ?? ""}
            </p>
          </div>

          <ul className="mt-6 space-y-3">
            {sortedPlayers.map((player) => {
              const isHostRow = player.id === SAMPLE_MATCH.hostId;
              const isCurrent = player.id === currentPlayerId;

              const statusDescription = player.status === "pending"
                ? isCurrent
                  ? "Waiting for the host to approve you."
                  : "Awaiting host approval."
                : player.status === "approved"
                  ? isCurrent
                    ? "You're cleared — ready up when you're set."
                    : "Ready for player confirmation."
                  : "Ready to start.";

              const renderActions = () => {
                if (isHost) {
                  if (player.id === SAMPLE_MATCH.hostId) {
                    return (
                      <button
                        type="button"
                        onClick={() => handleToggleReady(player.id)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-content transition hover:border-brand-500"
                      >
                        {player.status === "ready" ? "Unready" : "I'm ready"}
                      </button>
                    );
                  }

                  if (player.status === "pending") {
                    return (
                      <button
                        type="button"
                        onClick={() => handleApprove(player.id)}
                        className="rounded-md border border-brand-500 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                      >
                        Approve
                      </button>
                    );
                  }

                  if (player.status === "approved" || player.status === "ready") {
                    return (
                      <button
                        type="button"
                        onClick={() => handleToggleReady(player.id)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-content transition hover:border-brand-500"
                      >
                        {player.status === "ready" ? "Mark not ready" : "Mark ready"}
                      </button>
                    );
                  }
                }

                if (!isHost && isCurrent) {
                  return (
                    <button
                      type="button"
                      onClick={handleReadyToggle}
                      disabled={player.status === "pending"}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-content transition hover:border-brand-500 disabled:cursor-not-allowed disabled:border-border disabled:text-content-muted"
                    >
                      {player.status === "ready" ? "Unready" : "Ready up"}
                    </button>
                  );
                }

                return null;
              };

              return (
                <li
                  key={player.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-content">
                      {player.name}
                      {isHostRow && (
                        <span className="ml-2 text-xs uppercase text-brand-500">Host</span>
                      )}
                      {isCurrent && (
                        <span className="ml-2 text-xs uppercase text-brand-500">You</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-content-muted">{statusDescription}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={player.status} />
                    {renderActions()}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-subdued px-4 py-3 text-sm text-content-muted">
            <span>{isHost ? waitingSummaryMessage : playerSummaryMessage}</span>
            {isHost && (
              <button
                type="button"
                onClick={handleStartMatch}
                disabled={!everyoneReady}
                className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-content-inverted transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-surface disabled:text-content-muted"
              >
                Start match
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-5 rounded-lg border border-border bg-surface-subdued p-5 text-sm text-content-subtle">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              Match settings
            </h3>
            <dl className="grid grid-cols-1 gap-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-content-muted">Category</dt>
                <dd className="text-content">{SAMPLE_MATCH.settings.category}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-content-muted">Questions</dt>
                <dd className="text-content">{SAMPLE_MATCH.settings.questionCount}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-content-muted">Time limit</dt>
                <dd className="text-content">{SAMPLE_MATCH.settings.questionTimeLimitSec}s per question</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-content-muted">Privacy</dt>
                <dd className="text-content">{SAMPLE_MATCH.settings.privacy}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-xs">
            <p className="font-semibold text-content">Prototype preview</p>
            <p className="mt-1 text-content-muted">
              Switch perspectives to mimic host and player flows while backend wiring is still pending.
            </p>
            <div className="mt-3">
              <RoleSwitch role={role} onChange={setRole} />
            </div>
          </div>
        </aside>
      </section>
    );
  } else {
    headerContent = (
      <header className="flex flex-col gap-3 rounded-lg border border-border bg-surface/80 p-4">
        <div className="flex items-center justify-between text-sm text-content-muted">
          <span className="uppercase tracking-wide">Live match · #{activeMatchCode}</span>
          <span>
            Question {questionIndex + 1} / {totalQuestions}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subdued">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase text-brand-600">
              {currentQuestion?.category}
            </span>
            <span className="text-content-subtle">{SAMPLE_MATCH.settings.questionTimeLimitSec}s per question</span>
          </div>
          <div className="flex items-center gap-2 text-content">
            <TimeIcon className="h-4 w-4" />
            <span className="text-base font-semibold">{secondsRemaining}s</span>
          </div>
        </div>
      </header>
    );

    bodyContent = (
      <section className="grid gap-6 rounded-lg border border-border bg-surface/80 p-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-content">{currentQuestion?.prompt}</h1>
          <div className="space-y-3">
            {currentQuestion?.choices.map((choice, index) => {
              const isSelected = selectedChoice === index;
              const isAnswer = answerIndex === index;
              const showCorrect = showAnswer && isAnswer;
              const showIncorrect = showAnswer && isSelected && !isAnswer;

              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleSelect(index)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    showCorrect
                      ? "border-brand-500 bg-brand-50/40 text-brand-600"
                      : showIncorrect
                        ? "border-accent-danger/60 bg-accent-danger/10 text-accent-danger"
                        : isSelected
                          ? "border-brand-500 bg-brand-500/10 text-brand-600"
                          : "border-border bg-surface-subdued text-content"
                  } ${showAnswer ? "cursor-default" : "hover:border-brand-500"}`}
                  disabled={showAnswer}
                >
                  <span className="flex items-center justify-between text-sm font-medium">
                    <span>{choice}</span>
                    {showCorrect && <Badge label="Correct" variant="success" />}
                    {showIncorrect && <Badge label="Incorrect" variant="danger" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-content-muted">
            {showAnswer ? (
              <p className="text-content-subtle">{currentQuestion?.explanation}</p>
            ) : (
              <p>Select an answer before the timer runs out.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4">
            {!showAnswer && (
              <button
                type="button"
                onClick={handleReveal}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-content transition hover:border-brand-500"
              >
                Reveal answer
              </button>
            )}
            {showAnswer && questionIndex < totalQuestions - 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-content-inverted transition hover:bg-brand-600"
              >
                Next question
              </button>
            )}
            {showAnswer && questionIndex === totalQuestions - 1 && (
              <span className="text-sm font-medium text-brand-500">Match complete! 🎉</span>
            )}
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border border-border bg-surface-subdued p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-content-muted">
            Leaderboard
          </h2>
          <ol className="space-y-2">
            {playerStandings.map((player) => (
              <li
                key={player.id}
                className={`flex items-center justify-between rounded-md border border-transparent bg-surface px-3 py-2 text-sm transition-colors ${
                  player.id === currentPlayerId ? "border-brand-500" : ""
                }`}
              >
                <span className="font-medium text-content">
                  {player.name}
                  {player.id === currentPlayerId && (
                    <span className="ml-2 text-xs uppercase text-brand-500">You</span>
                  )}
                  {player.id === SAMPLE_MATCH.hostId && (
                    <span className="ml-2 text-xs uppercase text-content-muted">Host</span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-content-muted">
                  <span className="font-semibold text-content">{player.projectedScore}</span>
                  <span className="rounded-full bg-surface-subdued px-2 py-0.5 text-xs">
                    {player.streak}🔥
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-content-muted">
            Scores update automatically once the server confirms results. This mock view
            shows projected changes when you select an answer.
          </div>
          <div className="rounded-md border border-dashed border-border bg-surface px-3 py-2 text-xs text-content-muted">
            <p className="font-semibold text-content">Preview as</p>
            <p className="mt-1">Switch roles to experience the match from both perspectives.</p>
            <div className="mt-2">
              <RoleSwitch role={role} onChange={setRole} />
            </div>
          </div>
        </aside>
      </section>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 text-content">
      {headerContent}
      {bodyContent}
    </main>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>
      {meta.label}
    </span>
  );
}

function RoleSwitch({ role, onChange }) {
  return (
    <div className="flex items-center gap-2 text-xs text-content-muted">
      <span className="uppercase tracking-wide">Preview:</span>
      <button
        type="button"
        onClick={() => onChange("host")}
        className={`rounded-full border px-2.5 py-1 font-semibold transition ${
          role === "host"
            ? "border-brand-500 bg-brand-500/10 text-brand-600"
            : "border-border bg-surface text-content hover:border-brand-400"
        }`}
      >
        Host
      </button>
      <button
        type="button"
        onClick={() => onChange("player")}
        className={`rounded-full border px-2.5 py-1 font-semibold transition ${
          role === "player"
            ? "border-brand-500 bg-brand-500/10 text-brand-600"
            : "border-border bg-surface text-content hover:border-brand-400"
        }`}
      >
        Player
      </button>
    </div>
  );
}

function Badge({ label, variant }) {
  const tone =
    variant === "success"
      ? "bg-brand-500/10 text-brand-600"
      : variant === "danger"
        ? "bg-accent-danger/10 text-accent-danger"
        : "bg-surface-subdued text-content";

  return (
    <span className={`ml-3 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function TimeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 2" />
    </svg>
  );
}

export default MatchPlay;
