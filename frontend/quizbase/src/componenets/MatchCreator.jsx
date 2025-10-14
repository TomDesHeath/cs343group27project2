import { useMemo, useState } from "react";

const CATEGORY_OPTIONS = [
  "General Knowledge",
  "Science",
  "Entertainment",
  "Geography",
  "Sports",
  "History",
];

const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Expert"];

const PRIVACY_OPTIONS = [
  { value: "private", label: "Private · code only" },
  { value: "invite", label: "Invite only" },
  { value: "public", label: "Public lobby" },
];

const MAX_ROUNDS = 4;
const MAX_QUESTIONS_PER_ROUND = 7;

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `round-${Math.random().toString(36).slice(2, 9)}`;
};

function createDefaultRound(index) {
  return {
    id: generateId(),
    number: index + 1,
    label: `Round ${index + 1}`,
    category: CATEGORY_OPTIONS[index % CATEGORY_OPTIONS.length],
    difficulty: DIFFICULTY_OPTIONS[index % DIFFICULTY_OPTIONS.length],
    questionCount: 5,
  };
}

function MatchCreator() {
  const [matchName, setMatchName] = useState("Friday Trivia Night");
  const [scheduleType, setScheduleType] = useState("now");
  const [startTime, setStartTime] = useState("");
  const [privacy, setPrivacy] = useState("private");
  const [questionTimeLimit, setQuestionTimeLimit] = useState(20);
  const [rounds, setRounds] = useState(() => [createDefaultRound(0), createDefaultRound(1)]);
  const [notes, setNotes] = useState("Winner chooses the next theme.");
  const [invitees, setInvitees] = useState("friend@campus.edu, rival@campus.edu");
  const [draftConfig, setDraftConfig] = useState(null);

  const canAddRound = rounds.length < MAX_ROUNDS;
  const canRemoveRound = rounds.length > 1;

  const totalQuestions = useMemo(
    () => rounds.reduce((sum, round) => sum + Number(round.questionCount || 0), 0),
    [rounds],
  );

  const matchCode = useMemo(() => {
    const seed = matchName || "QUIZ";
    const initials = seed
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 2)
      .padEnd(2, "Q");
    const randomDigits = Math.random().toString(16).slice(2, 4).toUpperCase();
    return `${initials}${randomDigits}`;
  }, [matchName]);

  const handleRoundChange = (roundId, key, value) => {
    setRounds((prev) =>
      prev.map((round) => {
        if (round.id !== roundId) {
          return round;
        }
        if (key === "questionCount") {
          const sanitized = Math.min(Math.max(Number(value) || 1, 1), MAX_QUESTIONS_PER_ROUND);
          return { ...round, questionCount: sanitized };
        }
        return { ...round, [key]: value };
      }),
    );
  };

  const handleAddRound = () => {
    if (!canAddRound) {
      return;
    }
    setRounds((prev) => [...prev, createDefaultRound(prev.length)]);
  };

  const handleRemoveRound = (roundId) => {
    if (!canRemoveRound) {
      return;
    }
    setRounds((prev) => prev.filter((round) => round.id !== roundId));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      matchName,
      scheduleType,
      startTime: scheduleType === "later" ? startTime : "Start immediately",
      privacy,
      questionTimeLimit,
      rounds,
      notes,
      invitees: invitees
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean),
      totalQuestions,
      code: matchCode,
    };
    setDraftConfig(payload);
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 text-content">
      <header className="flex flex-col gap-3 rounded-lg border border-border bg-surface/70 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-content-muted">Create a new match</p>
          <h1 className="mt-2 text-2xl font-semibold text-content">Match Creator</h1>
          <p className="mt-1 text-sm text-content-subtle">
            Configure up to four rounds with seven questions each. Hosts approve players in the lobby before the match begins.
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-content">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Match code (preview)</p>
          <p className="mt-1 font-mono text-lg tracking-widest">{matchCode}</p>
        </div>
      </header>

      <section className="grid gap-6 rounded-lg border border-border bg-surface/80 p-6 md:grid-cols-[2fr,1fr]">
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-content">Match title</label>
              <input
                type="text"
                value={matchName}
                onChange={(event) => setMatchName(event.target.value)}
                placeholder="Campus Trivia Throwdown"
                className="w-full rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                maxLength={60}
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-semibold text-content">Scheduling</legend>
                <div className="flex items-center gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="schedule"
                      value="now"
                      checked={scheduleType === "now"}
                      onChange={() => setScheduleType("now")}
                      className="h-4 w-4 border-border text-brand-500 focus:ring-brand-500"
                    />
                    Start as soon as lobby is ready
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="schedule"
                      value="later"
                      checked={scheduleType === "later"}
                      onChange={() => setScheduleType("later")}
                      className="h-4 w-4 border-border text-brand-500 focus:ring-brand-500"
                    />
                    Schedule for later
                  </label>
                </div>
                {scheduleType === "later" && (
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    required
                  />
                )}
              </fieldset>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-content">Question time limit</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={45}
                    step={5}
                    value={questionTimeLimit}
                    onChange={(event) => setQuestionTimeLimit(Number(event.target.value))}
                    className="w-24 rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                  <span className="text-sm text-content-muted">seconds per question (spec recommends 20s)</span>
                </div>
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-content">Privacy</legend>
              <div className="grid gap-2">
                {PRIVACY_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm transition hover:border-brand-400">
                    <span className="font-medium text-content">{option.label}</span>
                    <input
                      type="radio"
                      name="privacy"
                      value={option.value}
                      checked={privacy === option.value}
                      onChange={(event) => setPrivacy(event.target.value)}
                      className="h-4 w-4 border-border text-brand-500 focus:ring-brand-500"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-content">Rounds setup</h2>
              <div className="text-xs uppercase tracking-wide text-content-muted">
                {rounds.length} / {MAX_ROUNDS} rounds · {totalQuestions} questions total
              </div>
            </div>
            <p className="text-sm text-content-subtle">
              Each round pulls from the selected category and difficulty. Question count is capped at {MAX_QUESTIONS_PER_ROUND} to align with project rules.
            </p>

            <div className="space-y-4">
              {rounds.map((round) => (
                <div key={round.id} className="rounded-lg border border-border bg-surface px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-content">{round.label}</h3>
                    <div className="flex items-center gap-2 text-xs text-content-muted">
                      <span>Up to {MAX_QUESTIONS_PER_ROUND} questions</span>
                      {canRemoveRound && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRound(round.id)}
                          className="rounded-md border border-border px-2 py-1 font-medium text-content transition hover:border-accent-danger/60 hover:text-accent-danger"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-content-muted">Category</label>
                      <select
                        value={round.category}
                        onChange={(event) => handleRoundChange(round.id, "category", event.target.value)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      >
                        {CATEGORY_OPTIONS.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-content-muted">Difficulty</label>
                      <select
                        value={round.difficulty}
                        onChange={(event) => handleRoundChange(round.id, "difficulty", event.target.value)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      >
                        {DIFFICULTY_OPTIONS.map((difficulty) => (
                          <option key={difficulty} value={difficulty}>
                            {difficulty}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-content-muted">Questions</label>
                      <input
                        type="number"
                        min={1}
                        max={MAX_QUESTIONS_PER_ROUND}
                        value={round.questionCount}
                        onChange={(event) => handleRoundChange(round.id, "questionCount", event.target.value)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAddRound}
                disabled={!canAddRound}
                className="inline-flex items-center gap-2 rounded-md border border-brand-500 px-3 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-border disabled:text-content-muted"
              >
                + Add round
              </button>
              {!canAddRound && <span className="text-xs text-content-muted">Maximum of {MAX_ROUNDS} rounds reached.</span>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-content">Invite players</label>
              <textarea
                value={invitees}
                onChange={(event) => setInvitees(event.target.value)}
                rows={3}
                placeholder="player1@campus.edu, player2@campus.edu"
                className="w-full rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <p className="text-xs text-content-muted">Separate addresses with commas or line breaks. Invites are sent when the backend wiring is in place.</p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-content">Host notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Share any house rules or streaming links."
                className="w-full rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-5 py-2 text-sm font-semibold text-content-inverted transition hover:bg-brand-600"
            >
              Create match lobby
            </button>
            <p className="text-xs text-content-muted">Configuration is stored locally until the backend endpoint is connected.</p>
          </div>
        </form>

        <aside className="space-y-5 rounded-lg border border-border bg-surface-subdued p-5 text-sm text-content-subtle">
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-content-muted">Match blueprint</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-content-muted">Status</dt>
                <dd className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                  {scheduleType === "now" ? "Start when ready" : "Scheduled"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-content-muted">Privacy</dt>
                <dd className="text-content">{PRIVACY_OPTIONS.find((option) => option.value === privacy)?.label}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-content-muted">Time per question</dt>
                <dd className="text-content">{questionTimeLimit}s</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-content-muted">Total questions</dt>
                <dd className="text-content">{totalQuestions}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-content-muted">Rounds overview</h2>
            <ul className="space-y-3">
              {rounds.map((round) => (
                <li key={round.id} className="rounded-md border border-border bg-surface px-3 py-2">
                  <p className="text-sm font-semibold text-content">{round.label}</p>
                  <p className="text-xs text-content-muted">
                    {round.category} · {round.difficulty} · {round.questionCount} question{round.questionCount > 1 ? "s" : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-content-muted">Next steps</h2>
            <p>
              After creation you will land in the waiting room to approve players and share the lobby code. Match settings map directly to the project specification.
            </p>
          </section>

          {draftConfig && (
            <section className="space-y-2 rounded-md border border-dashed border-brand-300 bg-brand-50 px-3 py-3 text-xs text-brand-700">
              <p className="text-xs font-semibold uppercase tracking-wide">Draft saved</p>
              <p className="text-sm text-brand-700">
                Match "{draftConfig.matchName}" prepared with {draftConfig.rounds.length} round{draftConfig.rounds.length > 1 ? "s" : ""}. Wire the POST /matches endpoint to submit this payload.
              </p>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}

export default MatchCreator;
