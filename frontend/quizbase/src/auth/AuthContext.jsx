import { createContext, useContext, useState, useEffect } from "react";
import { createApiClient } from "../lib/apiClient.js";

const Ctx = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);

const DEFAULT_ROLE = "player";

const nowIso = () => new Date().toISOString();

const deriveRoleFromEmail = (email) => {
  if (!email) {
    return DEFAULT_ROLE;
  }
  const normalised = email.trim().toLowerCase();
  if (normalised.startsWith("admin@") || normalised.endsWith("@quizbase.admin")) {
    return "admin";
  }
  return DEFAULT_ROLE;
};

const deriveUserId = (input) => {
  const source =
    (typeof input === "string" && input) ||
    input?.id ||
    input?.email ||
    input?.username;
  if (!source) {
    return "demo-user";
  }
  const trimmed = source.trim().toLowerCase();
  if (!trimmed) {
    return "demo-user";
  }
  return trimmed.replace(/[^a-z0-9]+/g, "-");
};

const MERGE_KEYS = ["id", "username", "avatarUrl", "email", "role", "createdAt"];

const ensureUserShape = (maybeUser) => {
  if (!maybeUser) {
    return null;
  }
  const id = maybeUser.id ?? deriveUserId(maybeUser);
  const email = maybeUser.email ?? `${id}@quizbase.local`;
  return {
    id,
    username: maybeUser.username ?? "player1",
    avatarUrl: maybeUser.avatarUrl ?? "",
    email,
    role: maybeUser.role ?? deriveRoleFromEmail(email),
    createdAt: maybeUser.createdAt ?? nowIso(),
  };
};

const mergeUserData = (current, incoming) => {
  const shaped = ensureUserShape({ ...current, ...incoming });
  if (!shaped) {
    return current ?? null;
  }
  if (!current) {
    return shaped;
  }
  const hasChanged = MERGE_KEYS.some((key) => current[key] !== shaped[key]);
  return hasChanged ? shaped : current;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [refresh, setRefresh] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistAuth = (payload, rememberMe) => {
    if (typeof window === "undefined") {
      return;
    }
    const targetStore = rememberMe ? window.localStorage : window.sessionStorage;
    const otherStore = rememberMe ? window.sessionStorage : window.localStorage;
    targetStore.setItem("auth", JSON.stringify(payload));
    otherStore.removeItem("auth");
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    const stored = window.localStorage.getItem("auth") ?? window.sessionStorage.getItem("auth");
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const saved = JSON.parse(stored);
      if (saved?.access) {
        setAccess(saved.access);
        setRefresh(saved.refresh ?? null);
        const hydratedUser = ensureUserShape(saved.user);
        if (hydratedUser) {
          setUser(hydratedUser);
        }
      }
    } catch (error) {
      console.warn("Failed to parse stored auth payload", error);
      window.localStorage.removeItem("auth");
      window.sessionStorage.removeItem("auth");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    let cancelled = false;
    const client = createApiClient({
      getAuthHeaders: () => {
        const headers = {
          "x-user-id": user.id,
        };
        if (access) {
          headers.Authorization = `Bearer ${access}`;
        }
        return headers;
      },
    });
    (async () => {
      try {
        const profile = await client.get("/users/me");
        if (!profile || cancelled) {
          return;
        }
        setUser((previous) => mergeUserData(previous, profile));
      } catch (error) {
        console.warn("Failed to hydrate user profile", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [access, user?.id]);

  const login = async (email, _password, rememberMe = true) => {
    const baseUser = ensureUserShape({
      id: deriveUserId(email),
      username: email?.split("@")[0] || "player",
      avatarUrl: "",
      email,
      role: deriveRoleFromEmail(email),
      createdAt: nowIso(),
    });
    const payload = { access: "tok", refresh: "reftok", user: baseUser };
    setUser(baseUser);
    setAccess(payload.access);
    setRefresh(payload.refresh);
    persistAuth(payload, rememberMe);
    return payload;
  };

  const register = async ({ username, email, password, avatarUrl }) => {
    const payload = await login(email, password, true);
    const enrichedUser = ensureUserShape({
      id: deriveUserId(email),
      username,
      avatarUrl,
      email,
      role: deriveRoleFromEmail(email),
      createdAt: payload.user?.createdAt,
    });
    if (enrichedUser) {
      setUser(enrichedUser);
      persistAuth({ ...payload, user: enrichedUser }, true);
    }
  };

  const logout = () => {
    setUser(null);
    setAccess(null);
    setRefresh(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("auth");
      window.sessionStorage.removeItem("auth");
    }
  };

  const isAdmin = user?.role === "admin";

  const value = {
    user,
    access,
    refresh,
    loading,
    login,
    register,
    logout,
    setUser,
    isAdmin,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
