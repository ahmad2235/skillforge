import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Use cookie-based session auth for the SPA (Sanctum)
});

// Attach Authorization header if token exists in localStorage
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sf_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Ensure X-XSRF-TOKEN header is set from the XSRF-TOKEN cookie (decoded)
    // This makes CSRF deterministic (decodeURIComponent is required because
    // cookies may be URL-encoded). Only set for state-mutating requests.
    const method = (config.method || "").toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      const match = document.cookie.match(/(^|;)\s*XSRF-TOKEN\s*=\s*([^;]+)/);
      if (match) {
        try {
          const xsrf = decodeURIComponent(match[2]);
          config.headers = config.headers || {};
          if (!config.headers["X-XSRF-TOKEN"]) {
            config.headers["X-XSRF-TOKEN"] = xsrf;
          }
        } catch (e) {
          // no-op: if decoding fails, let the request continue and server will return 419
        }
      }
    }
  }
  return config;
});

// Helper to ensure the CSRF cookie is present. Uses a module-level promise to
// avoid duplicate requests (React StrictMode can call effects twice).
// Note: The Sanctum CSRF route is at /sanctum/csrf-cookie (NOT under /api),
// so we use axios directly with an absolute URL.
let csrfPromise: Promise<any> | null = null;
export function ensureCsrfCookie(): Promise<any> {
  if (csrfPromise) return csrfPromise;
  const baseOrigin = new URL(API_BASE_URL).origin; // e.g. http://127.0.0.1:8000
  csrfPromise = axios.get(`${baseOrigin}/sanctum/csrf-cookie`, { withCredentials: true }).finally(() => {
    csrfPromise = null;
  });
  return csrfPromise;
}

// Global response handler for auth and safe errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network / fetch errors (no response)
    if (!error.response) {
      const safeError = {
        isNetworkError: true,
        message: error?.message || (error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK"
          ? "Cannot connect to server. Please check if the server is running."
          : "Network error. Please check your connection and try again."),
        status: null,
      };
      return Promise.reject(safeError);
    }

    // We have a response from the server — build a structured HttpError
    const status = error.response.status;
    let payload = null;
    try {
      payload = error.response.data ?? null;
    } catch (e) {
      payload = null;
    }

    const httpError = {
      isHttpError: true,
      status,
      url: error.config?.url ?? null,
      message: (payload?.message as string) || error.message || error.response?.statusText || "Request failed",
      payload,
    };

    // For authentication errors, clear local auth state but do NOT navigate away immediately.
    // Let pages render the unauthorized state so users see a helpful message instead of a generic network error.
    if (status === 401 || status === 403) {
      try {
        localStorage.removeItem("sf_token");
        localStorage.removeItem("sf_user");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("sf:auth-logout"));
        }
      } catch {}
    }

    return Promise.reject(httpError);
  }
);
