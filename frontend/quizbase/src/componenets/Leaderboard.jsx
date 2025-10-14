const sampleEntries = [
  { name: "Sasha", score: 1820, streak: 7 },
  { name: "Kai", score: 1745, streak: 5 },
  { name: "Morgan", score: 1690, streak: 6 },
  { name: "Jordan", score: 1635, streak: 4 },
  { name: "Reese", score: 1580, streak: 3 },
];

export default function Leaderboard({ entries = sampleEntries, title = "Leaderboard" }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-12">
    <section className="rounded-lg border border-border bg-surface shadow-sm">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-content">{title}</h2>
      </header>
      <ul className="divide-y divide-border/60">
        {entries.map((entry, index) => (
          <li key={entry.name} className="flex items-center justify-between px-4 py-3 text-sm text-content">
            <span className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-600">
                {index + 1}
              </span>
              <span className="font-medium">{entry.name}</span>
            </span>
            <span className="flex items-center gap-6 text-content-muted">
              <span className="flex flex-col items-end">
                <span className="text-xs uppercase tracking-wide text-content-subtle">Score</span>
                <span className="font-semibold text-content">{entry.score}</span>
              </span>
              <span className="flex flex-col items-end">
                <span className="text-xs uppercase tracking-wide text-content-subtle">Streak</span>
                <span className="font-semibold text-content">{entry.streak}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
    </div>
  );
}

function LeaderboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-content">Leaderboard</h1>
        <p className="mt-2 text-sm text-content-subtle">
          Track the top performers across all ongoing trivia tournaments.
        </p>
      </div>
      <Leaderboard title="Global Standings" />
    </main>
  );
}
