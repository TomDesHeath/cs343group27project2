import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Profile() {
  const { user, setUser, isAdmin } = useAuth();

  const onSave = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setUser((previous) => ({
      ...previous,
      username: formData.get("username"),
      avatarUrl: formData.get("avatarUrl"),
    }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 text-content">
      <header className="flex items-center gap-4">
        <img
          src={user?.avatarUrl || "https://placehold.co/96x96"}
          alt=""
          className="h-16 w-16 rounded-full border border-border"
        />
        <div>
          <h1 className="text-2xl font-bold">@{user?.username ?? "me"}</h1>
          <p className="text-sm text-content-muted">
            Member since {new Date(user?.createdAt ?? Date.now()).toLocaleDateString()}
          </p>
        </div>
      </header>

      {isAdmin && (
        <section className="space-y-3">
          <h2 className="font-semibold">Administration</h2>
          <div className="rounded border border-border bg-surface-subdued p-4">
            <p className="text-sm text-content-muted">
              Manage the scraped question bank, categories, and live matches from the control
              center.
            </p>
            <Link
              to="/admin"
              className="mt-3 inline-flex items-center justify-center rounded bg-brand-500 px-4 py-2 text-sm font-medium text-content-inverted transition hover:bg-brand-600"
            >
              Open admin dashboard
            </Link>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Edit profile</h2>
        <form onSubmit={onSave} className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded border border-border px-3 py-2"
            name="username"
            defaultValue={user?.username}
            placeholder="Username"
          />
          <input
            className="rounded border border-border px-3 py-2"
            name="avatarUrl"
            defaultValue={user?.avatarUrl}
            placeholder="Avatar URL"
          />
          <button className="rounded-md bg-brand-500 px-3 py-2 text-content-inverted transition hover:bg-brand-600 md:col-span-2">
            Save changes
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Match history</h2>
        <div className="rounded border border-border p-3 text-sm text-content-muted">Coming soon</div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-accent-danger">Danger zone</h2>
        <button className="rounded-md border border-accent-danger px-3 py-2 text-accent-danger">
          Delete my account
        </button>
      </section>
    </div>
  );
}
