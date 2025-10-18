import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(form.email, form.password, form.rememberMe);
      nav("/profile");
    } catch (err) {
      console.error("Login failed", err);
      setError(err?.message ?? "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 p-6 text-content">
      <h1 className="text-2xl font-bold">Log in</h1>
      {error && (
        <p className="rounded border border-accent-danger bg-accent-danger/10 px-3 py-2 text-sm text-accent-danger">
          {error}
        </p>
      )}
      <input
        className="w-full rounded border border-border px-3 py-2"
        placeholder="Email"
        value={form.email}
        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        disabled={submitting}
      />
      <input
        className="w-full rounded border border-border px-3 py-2"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        disabled={submitting}
      />
      <label className="flex items-center gap-2 text-sm text-content-muted">
        <input
          type="checkbox"
          checked={form.rememberMe}
          onChange={(event) =>
            setForm((current) => ({ ...current, rememberMe: event.target.checked }))
          }
          disabled={submitting}
        />{" "}
        Remember me
      </label>
      <button
        className="w-full rounded-md bg-brand-500 px-3 py-2 text-content-inverted transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
      >
        {submitting ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-sm text-content-muted">
        No account?{" "}
        <Link className="text-brand-600 underline" to="/register">
          Register
        </Link>
      </p>
    </form>
  );
}
