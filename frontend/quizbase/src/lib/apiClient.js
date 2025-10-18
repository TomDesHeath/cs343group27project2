const DEFAULT_BASE = (import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:4000").trim();

const normaliseBase = (value) => {
  if (!value) {
    return "http://localhost:4000/api";
  }
  const stripped = value.replace(/\/+$/, "");
  if (stripped.endsWith("/api")) {
    return stripped;
  }
  return `${stripped}/api`;
};

const API_BASE = normaliseBase(DEFAULT_BASE);

const buildUrl = (path, params) => {
  const target = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const url = new URL(target);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url;
};

const isFormData = (maybe) => typeof FormData !== "undefined" && maybe instanceof FormData;

export function createApiClient({ getAuthHeaders } = {}) {
  const request = async (path, options = {}) => {
    const {
      method = "GET",
      params,
      data,
      headers = {},
      raw = false,
      parseJson = true,
      signal,
    } = options;

    const url = buildUrl(path, params);
    const init = {
      method,
      headers: {
        Accept: "application/json",
        ...headers,
      },
      signal,
    };

    init.credentials = options.credentials ?? "include";

    const authHeaders = typeof getAuthHeaders === "function" ? getAuthHeaders() ?? {} : {};
    for (const [key, value] of Object.entries(authHeaders)) {
      if (value !== undefined && value !== null && value !== "") {
        init.headers[key] = value;
      }
    }

    if (data !== undefined) {
      if (isFormData(data)) {
        init.body = data;
      } else if (typeof data === "string") {
        init.headers["Content-Type"] = init.headers["Content-Type"] ?? "application/json";
        init.body = data;
      } else {
        init.headers["Content-Type"] = init.headers["Content-Type"] ?? "application/json";
        init.body = JSON.stringify(data);
      }
    }

    const response = await fetch(url, init);
    if (raw) {
      return response;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (!response.ok) {
      let errorPayload = null;
      if (isJson) {
        try {
          errorPayload = await response.json();
        } catch {
          // ignore parsing failure
        }
      }
      const message = errorPayload?.error ?? errorPayload?.message ?? `Request failed with status ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.payload = errorPayload;
      throw err;
    }

    if (!parseJson) {
      return response;
    }

    if (response.status === 204 || response.status === 205) {
      return null;
    }

    if (!isJson) {
      const text = await response.text();
      return text ?? null;
    }

    return response.json();
  };

  return {
    request,
    get: (path, options = {}) => request(path, { ...options, method: "GET" }),
    post: (path, data, options = {}) => request(path, { ...options, method: "POST", data }),
    put: (path, data, options = {}) => request(path, { ...options, method: "PUT", data }),
    patch: (path, data, options = {}) => request(path, { ...options, method: "PATCH", data }),
    delete: (path, options = {}) => request(path, { ...options, method: "DELETE" }),
    baseUrl: API_BASE,
  };
}

export const apiClient = createApiClient();

export { API_BASE };
