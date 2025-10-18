import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useApiClient from "../hooks/useApiClient.js";

const aggregateLeaderboard = (matches) => {
  if (!Array.isArray(matches) || matches.length === 0) {
    return [];
  }
  const totals = new Map();
  for (const match of matches) {
    const players = Array.isArray(match?.players) ? match.players : [];
    for (const player of players) {
      const key = player.userId ?? player.id;
      if (!key) {
        continue;
      }
      const current = totals.get(key) ?? {
        name: player.User?.username ?? player.username ?? player.displayName ?? player.userId ?? "Player",
        score: 0,
        streak: player.streak ?? 0,
      };
      current.score = Math.max(current.score, player.score ?? 0);
      current.streak = Math.max(current.streak ?? 0, player.streak ?? 0);
      totals.set(key, current);
    }
  }
  return Array.from(totals.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 10);
};

export default function Leaderboard({ entries, title = "Leaderboard" }) {
  const client = useApiClient();
  const shouldFetch = !entries;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["matches", "leaderboard"],
    queryFn: () => client.get("/matches"),
    enabled: shouldFetch,
    staleTime: 30_000,
    refetchInterval: 5000,
  });

  const derivedEntries = useMemo(() => {
    if (entries && entries.length > 0) {
      return entries;
    }
    const aggregated = aggregateLeaderboard(data);
    return aggregated;
  }, [entries, data]);

  if (shouldFetch && isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-12">
        <section className="animate-pulse rounded-lg border border-border bg-surface shadow-sm">
          <header className="border-b border-border px-4 py-3">
            <div className="h-4 w-32 rounded bg-surface-subdued" />
          </header>
          <ul className="divide-y divide-border/60">
            {Array.from({ length: 5 }).map((_, index) => (
              <li key={index} className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-surface-subdued" />
                  <span className="h-4 w-24 rounded bg-surface-subdued" />
                </span>
                <span className="flex items-center gap-6">
                  <span className="h-4 w-12 rounded bg-surface-subdued" />
                  <span className="h-4 w-12 rounded bg-surface-subdued" />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  if (shouldFetch && isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-12">
        <section className="rounded-lg border border-accent-danger bg-surface shadow-sm">
          <header className="border-b border-accent-danger/40 px-4 py-3">
            <h2 className="text-base font-semibold text-content">{title}</h2>
          </header>
          <div className="px-4 py-3 text-sm text-accent-danger">
            Failed to load leaderboard: {error?.message ?? "Unknown error"}
          </div>
        </section>
      </div>
    );
  }

  const items = derivedEntries ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-12">
    <section className="rounded-lg border border-border bg-surface shadow-sm">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-content">{title}</h2>
      </header>
      {items.length === 0 ? (
        <div className="px-4 py-6 text-sm text-content-muted">No players exist yet.</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((entry, index) => (
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
                  <span className="font-semibold text-content">{entry.streak ?? "—"}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
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
