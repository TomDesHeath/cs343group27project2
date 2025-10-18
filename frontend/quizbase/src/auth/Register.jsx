import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    avatarUrl: "",
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
      await register(form);
      nav("/profile");
    } catch (err) {
      console.error("Registration failed", err);
      setError(err?.message ?? "Unable to create the account right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 p-6 text-content">
      <h1 className="text-2xl font-bold">Create account</h1>
      {error && (
        <p className="rounded border border-accent-danger bg-accent-danger/10 px-3 py-2 text-sm text-accent-danger">
          {error}
        </p>
      )}
      <input
        className="w-full rounded border border-border px-3 py-2"
        placeholder="Username"
        value={form.username}
        onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
        disabled={submitting}
      />
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
      <input
        className="w-full rounded border border-border px-3 py-2"
        placeholder="Avatar URL (image link)"
        value={form.avatarUrl}
        onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))}
        disabled={submitting}
      />
      <button
        className="w-full rounded-md bg-brand-500 px-3 py-2 text-content-inverted transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
      >
        {submitting ? "Creating account..." : "Register"}
      </button>
    </form>
  );
}
