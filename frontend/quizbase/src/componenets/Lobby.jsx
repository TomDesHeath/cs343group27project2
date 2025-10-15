import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useApiClient from "../hooks/useApiClient.js";
import Leaderboard from "./Leaderboard";

const STATUS_LABELS = {
  WAITING: "Waiting for players",
  READY: "Ready",
  ACTIVE: "Live",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
};

export default function Lobby() {
  const navigate = useNavigate();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [matchCode, setMatchCode] = useState("");
  const [joiningId, setJoiningId] = useState(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["matches", "list"],
    queryFn: () => client.get("/matches"),
    staleTime: 10_000,
  });

  const matches = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const joinMatch = useMutation({
    mutationFn: async (matchId) => client.post(`/matches/${matchId}/join`, {}),
    onMutate: (matchId) => {
      setJoiningId(matchId);
    },
    onSuccess: (_data, matchId) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      navigate(`/play?match=${matchId}`);
    },
    onError: (joinError) => {
      console.error("Failed to join match", joinError);
    },
    onSettled: () => {
      setJoiningId(null);
    },
  });

  const handlePrivateJoin = (event) => {
    event.preventDefault();
    const trimmed = matchCode.trim();

    if (!trimmed) {
      return;
    }

    joinMatch.mutate(trimmed);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-content">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-content">Match Lobby</h1>
        <p className="mt-2 max-w-2xl text-sm text-content-subtle">
          Jump straight into public matches, enter a private match code, or launch
          a brand new lobby for friends.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="md:col-span-2 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-600">Public lobbies</p>
              <h2 className="mt-1 text-xl font-semibold text-content">Join a community match</h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-content-subtle">
              <span>Live now: {matches.length}</span>
              <button
                type="button"
                className="rounded border border-border px-2 py-1 text-[11px] font-medium uppercase tracking-wide transition hover:border-brand-500 hover:text-brand-600"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                Refresh
              </button>
            </div>
          </div>

          {isLoading ? (
            <ul className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <li key={index} className="flex animate-pulse flex-col gap-4 rounded-md border border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-subdued text-xs" />
                    <span className="h-4 w-40 rounded bg-surface-subdued" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="h-4 w-24 rounded bg-surface-subdued" />
                    <span className="h-4 w-20 rounded bg-surface-subdued" />
                  </div>
                </li>
              ))}
            </ul>
          ) : isError ? (
            <div className="mt-6 rounded border border-accent-danger bg-surface-subdued px-4 py-3 text-sm text-accent-danger">
              Failed to load matches: {error?.message ?? "Unknown error"}
            </div>
          ) : matches.length === 0 ? (
            <div className="mt-6 rounded border border-border bg-surface-subdued px-4 py-5 text-sm text-content-muted">
              No public lobbies available right now. Create one or refresh in a moment.
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {matches.map((match) => {
                const status = STATUS_LABELS[match.status] ?? match.status ?? "Unknown";
                const categoryName = match.Category?.name ?? "Any category";
                const playerCount = Array.isArray(match.players) ? match.players.length : 0;
                const maxPlayers = match.maxPlayers ?? "∞";
                return (
                  <li key={match.id}>
                    <div className="flex flex-col gap-4 rounded-md border border-border px-5 py-4 transition hover:border-brand-400 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-content">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-600">
                            #{(match.id ?? "").slice(0, 4).toUpperCase()}
                          </span>
                          {match.title ?? "Untitled match"}
                        </p>
                        <p className="mt-1 text-xs text-content-muted">
                          {categoryName} • Host: {match.hostUserId ?? "Unknown host"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-content-muted">
                        <span className="rounded-full bg-surface-subdued px-3 py-1 text-content">
                          {playerCount} / {maxPlayers} players
                        </span>
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-500">
                          {status}
                        </span>
                        <button
                          type="button"
                          onClick={() => joinMatch.mutate(match.id)}
                          className="rounded-md bg-brand-500 px-3 py-1 text-sm font-medium text-content-inverted transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-surface-subdued disabled:text-content-muted"
                          disabled={!match?.id || joinMatch.isPending || joiningId === match.id}
                        >
                          {joiningId === match.id && joinMatch.isPending ? "Joining..." : "Join"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <aside className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-6">
            <section>
              <h3 className="text-base font-semibold text-content">Join a private match</h3>
              <p className="mt-1 text-sm text-content-subtle">
                Enter a code provided by a friend to jump straight into their lobby.
              </p>
              <form className="mt-4 space-y-3" onSubmit={handlePrivateJoin}>
                <label className="block text-xs font-medium uppercase tracking-wide text-content-subtle">
                  Match code
                </label>
                <input
                  type="text"
                  name="match-code"
                  placeholder="e.g. XY7P"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  value={matchCode}
                  onChange={(event) => setMatchCode(event.target.value)}
                />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-content-inverted transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-surface-subdued disabled:text-content-muted"
                  disabled={!matchCode.trim() || joinMatch.isPending}
                >
                  {joinMatch.isPending ? "Joining..." : "Enter match"}
                </button>
              </form>
            </section>

            <section className="rounded-md border border-dashed border-brand-200 bg-brand-50 px-4 py-5 text-sm text-brand-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Host your own
              </p>
              <h3 className="mt-1 text-base font-semibold text-brand-700">
                Create a custom match
              </h3>
              <p className="mt-2 text-sm text-brand-600">
                Choose categories, set time limits, and invite players instantly.
              </p>
              <Link
                to="/create"
                className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-100"
              >
                Open match creator
              </Link>
            </section>
          </div>
        </aside>
      </section>

      <div className="mt-10 space-y-5">
        <Leaderboard title="Live Standings" />
      </div>
    </main>
  );
}
