import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createApiClient } from "../lib/apiClient.js";

const STORAGE_KEY = "auth";

const Ctx = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);

const normaliseUser = (maybeUser) => {
  if (!maybeUser) {
    return null;
  }
  const id = maybeUser.id ?? maybeUser.userId ?? maybeUser.email ?? null;
  if (!id) {
    return null;
  }
  return {
    id,
    username: maybeUser.username ?? "",
    email: maybeUser.email ?? "",
    avatarUrl: maybeUser.avatarUrl ?? "",
    role: (maybeUser.role ?? "user").toString().toLowerCase(),
    createdAt: maybeUser.createdAt ?? maybeUser.created_at ?? null,
    updatedAt: maybeUser.updatedAt ?? maybeUser.updated_at ?? null,
  };
};

const normaliseEmailInput = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
};

const extractValidationErrorMessage = (error, fallbackMessage) => {
  const issues = error?.payload?.errors;
  if (Array.isArray(issues) && issues.length > 0) {
    const uniqueMessages = Array.from(new Set(issues.map((issue) => issue.message)));
    return uniqueMessages.join(", ");
  }
  return error?.message ?? fallbackMessage;
};

const readStoredAuth = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const localRaw = window.localStorage.getItem(STORAGE_KEY);
  if (localRaw) {
    try {
      const parsed = JSON.parse(localRaw);
      return { ...parsed, remember: true };
    } catch (error) {
      console.warn("Failed to parse persisted auth payload", error);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  const sessionRaw = window.sessionStorage.getItem(STORAGE_KEY);
  if (sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw);
      return { ...parsed, remember: false };
    } catch (error) {
      console.warn("Failed to parse session auth payload", error);
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  return null;
};

const persistAuth = (payload, remember) => {
  if (typeof window === "undefined") {
    return;
  }
  const body = JSON.stringify({ ...payload, remember });
  const target = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;
  target.setItem(STORAGE_KEY, body);
  other.removeItem(STORAGE_KEY);
};

const clearPersistedAuth = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
};

export function AuthProvider({ children }) {
  const [userState, setUserState] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const rememberRef = useRef(true);

  const setAuthState = (nextUser, token, remember = rememberRef.current) => {
    const normalisedUser = normaliseUser(nextUser);
    rememberRef.current = remember ?? rememberRef.current;
    setUserState(normalisedUser);
    setAccessToken(token ?? null);
    if (normalisedUser && token) {
      persistAuth({ user: normalisedUser, accessToken: token }, rememberRef.current);
    } else {
      clearPersistedAuth();
    }
  };

  const clearAuthState = () => {
    setUserState(null);
    setAccessToken(null);
    rememberRef.current = true;
    clearPersistedAuth();
  };

  const buildAuthClient = () =>
    createApiClient({
      getAuthHeaders: () => {
        const headers = {};
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
        if (userState?.id) {
          headers["x-user-id"] = userState.id;
        }
        return headers;
      },
    });

  const refreshAccessToken = async () => {
    try {
      const client = createApiClient();
      const response = await client.post("/auth/refresh", {});
      const newToken =
        response?.data?.accessToken ?? response?.accessToken ?? null;
      if (!newToken) {
        return null;
      }
      setAccessToken(newToken);
      if (userState) {
        persistAuth({ user: userState, accessToken: newToken }, rememberRef.current);
      }
      return newToken;
    } catch (error) {
      console.warn("Failed to refresh access token", error);
      return null;
    }
  };

  useEffect(() => {
    const hydrate = async () => {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      const stored = readStoredAuth();
      if (!stored?.accessToken) {
        clearPersistedAuth();
        setLoading(false);
        return;
      }

      rememberRef.current = stored.remember ?? true;
      const storedUser = normaliseUser(stored.user);
      if (storedUser) {
        setUserState(storedUser);
      }
      setAccessToken(stored.accessToken);

      try {
        const client = createApiClient({
          getAuthHeaders: () => ({
            Authorization: `Bearer ${stored.accessToken}`,
          }),
        });
        const profile = await client.get("/auth/me");
        const fetchedUser = normaliseUser(profile?.data?.user ?? profile?.user);
        if (fetchedUser) {
          setAuthState(fetchedUser, stored.accessToken, rememberRef.current);
        }
      } catch (error) {
        console.warn("Failed to hydrate profile with stored token", error);
        const newToken = await refreshAccessToken();
        if (newToken) {
          try {
            const client = createApiClient({
              getAuthHeaders: () => ({
                Authorization: `Bearer ${newToken}`,
              }),
            });
            const profile = await client.get("/auth/me");
            const fetchedUser = normaliseUser(profile?.data?.user ?? profile?.user);
            if (fetchedUser) {
              setAuthState(fetchedUser, newToken, rememberRef.current);
            } else {
              clearAuthState();
            }
          } catch (profileError) {
            console.warn("Failed to fetch profile after refresh", profileError);
            clearAuthState();
          }
        } else {
          clearAuthState();
        }
      } finally {
        setLoading(false);
      }
    };

    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password, rememberMe = true) => {
    const trimmedEmail = normaliseEmailInput(email);
    const rawPassword = typeof password === "string" ? password : "";
    if (!trimmedEmail) {
      throw new Error("Email is required");
    }
    if (!rawPassword) {
      throw new Error("Password is required");
    }
    try {
      const client = createApiClient();
      const response = await client.post("/auth/login", {
        email: trimmedEmail,
        password: rawPassword,
      });
      if (response?.success === false) {
        throw new Error(response?.error ?? "Failed to login");
      }
      const data = response?.data ?? response;
      const access = data?.accessToken;
      const userPayload = data?.user;
      if (!access || !userPayload) {
        throw new Error("Invalid login response");
      }
      const normalisedUser = normaliseUser(userPayload);
      setAuthState(normalisedUser, access, rememberMe);
      return { user: normalisedUser, accessToken: access };
    } catch (error) {
      throw new Error(extractValidationErrorMessage(error, "Failed to login"));
    }
  };

  const register = async ({ username, email, password, avatarUrl }, rememberMe = true) => {
    const trimmedUsername = typeof username === "string" ? username.trim() : "";
    const trimmedEmail = normaliseEmailInput(email);
    const rawPassword = typeof password === "string" ? password : "";
    const cleanedAvatarUrl =
      typeof avatarUrl === "string" && avatarUrl.trim().length > 0
        ? avatarUrl.trim()
        : undefined;
    try {
      const client = createApiClient();
      const response = await client.post("/auth/register", {
        username: trimmedUsername,
        email: trimmedEmail,
        password: rawPassword,
        avatarUrl: cleanedAvatarUrl,
      });
      if (response?.success === false) {
        throw new Error(response?.error ?? "Failed to register");
      }
      const data = response?.data ?? response;
      const access = data?.accessToken;
      const userPayload = data?.user;
      if (!access || !userPayload) {
        throw new Error("Invalid registration response");
      }
      const normalisedUser = normaliseUser(userPayload);
      setAuthState(normalisedUser, access, rememberMe);
      return { user: normalisedUser, accessToken: access };
    } catch (error) {
      throw new Error(extractValidationErrorMessage(error, "Failed to register"));
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        const client = buildAuthClient();
        await client.post("/auth/logout", {});
      }
    } catch (error) {
      console.warn("Logout request failed", error);
    } finally {
      clearAuthState();
    }
  };

  const updateProfile = async (updates = {}) => {
    const client = buildAuthClient();
    const response = await client.patch("/auth/profile", updates);
    if (response?.success === false) {
      throw new Error(response?.error ?? "Failed to update profile");
    }
    const updatedUser = normaliseUser(response?.data?.user ?? response?.user);
    if (updatedUser) {
      setAuthState(updatedUser, accessToken, rememberRef.current);
    }
    return updatedUser;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    const client = buildAuthClient();
    const response = await client.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    if (response?.success === false) {
      throw new Error(response?.error ?? "Failed to change password");
    }
    clearAuthState();
    return response?.message ?? "Password changed successfully. Please log in again.";
  };

  const deleteAccount = async () => {
    const client = buildAuthClient();
    await client.delete("/users/me");
    clearAuthState();
  };

  const refreshUser = async () => {
    const client = buildAuthClient();
    const response = await client.get("/auth/me");
    if (response?.success === false) {
      throw new Error(response?.error ?? "Failed to load profile");
    }
    const fetchedUser = normaliseUser(response?.data?.user ?? response?.user);
    if (fetchedUser) {
      setAuthState(fetchedUser, accessToken, rememberRef.current);
    }
    return fetchedUser;
  };

  const setUserWithPersist = (updater) => {
    setUserState((previous) => {
      const next =
        typeof updater === "function" ? updater(previous) : updater;
      const normalised = normaliseUser(next);
      if (normalised && accessToken) {
        persistAuth({ user: normalised, accessToken }, rememberRef.current);
      }
      if (!normalised) {
        clearPersistedAuth();
      }
      return normalised;
    });
  };

  const value = useMemo(
    () => ({
      user: userState,
      access: accessToken,
      accessToken,
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
      refreshUser,
      setUser: setUserWithPersist,
      setAccessToken,
      isAdmin: userState?.role === "admin",
    }),
    [userState, accessToken, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
