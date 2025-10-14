import { Link } from "react-router-dom";
import Leaderboard from "./Leaderboard";

function Landing() {
  return (
    <main className="w-full text-content">
      <section>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome to QuizBase,
          </h1>
          <p className="mt-3 max-w-2xl text-base text-content-subtle">
            Create and join real‑time trivia matches across six different.
            Simple, fast, and competitive.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/lobby"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-content-inverted transition hover:bg-brand-600"
            >
              Go to lobby
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-4 pb-12">
          <Leaderboard />
        </div>
      </section>
    </main>
  );
}

export default Landing;
