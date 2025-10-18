import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const buildSuccessMessage = (profileUpdated) => {
  if (profileUpdated) {
    return "Profile updated";
  }
  return "No changes detected.";
};

export default function Profile() {
  const { user, isAdmin, updateProfile, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setDeleteError(null);
  };

  const onSave = async (event) => {
    event.preventDefault();
    if (!isEditing || saving) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const rawUsername = formData.get("username");
    const rawAvatar = formData.get("avatarUrl");
    const rawCurrentPassword = formData.get("currentPassword");
    const rawNewPassword = formData.get("newPassword");
    const rawConfirmPassword = formData.get("confirmPassword");

    const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
    const avatarUrl = typeof rawAvatar === "string" ? rawAvatar.trim() : "";
    const currentPassword =
      typeof rawCurrentPassword === "string" ? rawCurrentPassword : "";
    const newPassword = typeof rawNewPassword === "string" ? rawNewPassword : "";
    const confirmPassword =
      typeof rawConfirmPassword === "string" ? rawConfirmPassword : "";

    const wantsPasswordChange =
      currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword) {
        setErrorMessage("Current and new password are required to change your password.");
        setSuccessMessage(null);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("New password and confirmation must match.");
        setSuccessMessage(null);
        return;
      }
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const profileUpdates = {};
      if (username && username !== user?.username) {
        profileUpdates.username = username;
      }
      if (avatarUrl !== (user?.avatarUrl ?? "")) {
        profileUpdates.avatarUrl = avatarUrl || null;
      }

      let profileUpdated = false;
      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(profileUpdates);
        profileUpdated = true;
      }

      if (wantsPasswordChange) {
        const message = await changePassword({
          currentPassword,
          newPassword,
        });
        if (typeof window !== "undefined") {
          window.alert(message);
        }
        navigate("/login", { replace: true });
        return;
      }

      const message = buildSuccessMessage(profileUpdated);
      setSuccessMessage(message);
      if (profileUpdated) {
        setIsEditing(false);
      }
    } catch (error) {
      const message = error?.message ?? "Failed to update profile.";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleting) {
      return;
    }
    resetMessages();
    const confirmed =
      typeof window === "undefined" ? true : window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      navigate("/", { replace: true });
    } catch (error) {
      const message = error?.message ?? "Failed to delete account.";
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
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
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Profile information</h2>
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                resetMessages();
              }}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:border-brand-500 hover:text-brand-600"
            >
              Edit profile
            </button>
          )}
        </div>
        {errorMessage && (
          <p className="text-sm text-accent-danger" role="alert">
            {errorMessage}
          </p>
        )}
        {successMessage && !errorMessage && (
          <p className="text-sm text-accent-success" role="status">
            {successMessage}
          </p>
        )}
        {isEditing ? (
          <form
            key={`${user?.username ?? ""}-${user?.avatarUrl ?? ""}`}
            onSubmit={onSave}
            className="grid gap-3 md:grid-cols-2"
          >
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
            <input
              className="rounded border border-border px-3 py-2"
              name="currentPassword"
              type="password"
              placeholder="Current password"
              autoComplete="current-password"
            />
            <input
              className="rounded border border-border px-3 py-2"
              name="newPassword"
              type="password"
              placeholder="New password"
              autoComplete="new-password"
            />
            <input
              className="rounded border border-border px-3 py-2 md:col-span-2"
              name="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-500 px-3 py-2 text-content-inverted transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-surface-subdued disabled:text-content-muted"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  resetMessages();
                }}
                className="rounded-md border border-border px-3 py-2 transition hover:border-content"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border border-border px-3 py-2">
              <p className="text-xs uppercase text-content-muted">Username</p>
              <p className="text-lg font-medium">{user?.username ?? "Not set"}</p>
            </div>
            <div className="rounded border border-border px-3 py-2">
              <p className="text-xs uppercase text-content-muted">Avatar URL</p>
              <p className="truncate text-lg font-medium">
                {user?.avatarUrl ?? "https://placehold.co/96x96"}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Match history</h2>
        <div className="rounded border border-border p-3 text-sm text-content-muted">Coming soon</div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-accent-danger">Danger zone</h2>
        {deleteError && (
          <p className="text-sm text-accent-danger" role="alert">
            {deleteError}
          </p>
        )}
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="rounded-md border border-accent-danger px-3 py-2 text-accent-danger transition hover:bg-accent-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete my account"}
        </button>
      </section>
    </div>
  );
}
