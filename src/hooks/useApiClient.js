import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { createApiClient } from "../lib/apiClient.js";

const sanitizeUserId = (value) => {
  if (!value) {
    return null;
  }
  return value;
};

export function useApiClient() {
  const { user, access } = useAuth();

  return useMemo(() => {
    return createApiClient({
      getAuthHeaders: () => {
        const headers = {};
        if (access) {
          headers.Authorization = `Bearer ${access}`;
        }
        const userId = sanitizeUserId(user?.id ?? user?.email ?? user?.username);
        if (userId) {
          headers["x-user-id"] = userId;
        }
        return headers;
      },
    });
  }, [access, user?.email, user?.id, user?.username]);
}

export default useApiClient;
