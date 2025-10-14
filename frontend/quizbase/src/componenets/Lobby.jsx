import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Leaderboard from "./Leaderboard";

const communityMatches = [
  {
    code: "AB7Q",
    host: "Lena",
    category: "Science & Nature",
    fills: "12 / 16 players",
    startsIn: "Starts in 3 min",
  },
  {
    code: "Z4PK",
    host: "Diego",
    category: "Movies & TV",
    fills: "8 / 12 players",
    startsIn: "Starts in 6 min",
  },
  {
    code: "M9TN",
    host: "Aya",
    category: "World History",
    fills: "5 / 10 players",
    startsIn: "Waiting on host",
  },
];

export default function Lobby() {
  const navigate = useNavigate();
  const [matchCode, setMatchCode] = useState("");

  const handlePrivateJoin = (event) => {
    event.preventDefault();
    const trimmed = matchCode.trim().toUpperCase();

    if (!trimmed) {
      return;
    }

    navigate(`/play?match=${trimmed}`);
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
              <p className="text-xs uppercase tracking-wide text-brand-600">
                Public lobbies
              </p>
              <h2 className="mt-1 text-xl font-semibold text-content">
                Join a community match
              </h2>
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-content-subtle">
              Live now: {communityMatches.length}
            </span>
          </div>

          <ul className="mt-6 space-y-4">
            {communityMatches.map((match) => (
              <li key={match.code}>
                <Link
                  to={`/play?match=${match.code}`}
                  className="flex flex-col gap-4 rounded-md border border-border px-5 py-4 transition hover:border-brand-400 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-content">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-600">
                        #{match.code}
                      </span>
                      {match.category}
                    </p>
                    <p className="mt-1 text-xs text-content-muted">
                      Hosted by {match.host}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-content-muted">
                    <span className="rounded-full bg-surface-subdued px-3 py-1 text-content">
                      {match.fills}
                    </span>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-500">
                      {match.startsIn}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
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
                  maxLength={6}
                  value={matchCode}
                  onChange={(event) => setMatchCode(event.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-content-inverted transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-surface-subdued disabled:text-content-muted"
                  disabled={!matchCode.trim()}
                >
                  Enter match
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
