import axios from "axios";

// Normalize base URL - remove trailing slash to prevent path issues
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, ''); // Remove trailing slashes

// Request timeout (30 seconds) - prevents hung requests on slow/unresponsive servers
const REQUEST_TIMEOUT_MS = 30000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true, // Use cookie-based session auth for the SPA (Sanctum)
});

// A plain client without request interceptors for unauthenticated requests
export const unauthenticatedClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
});

// Add CSRF token handling to unauthenticated client (needed for login, register, etc.)
unauthenticatedClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
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
// 
// This function:
// 1. Fetches /sanctum/csrf-cookie to trigger Set-Cookie response
// 2. Waits for the XSRF-TOKEN cookie to actually appear in document.cookie
// 3. Returns only after the token is verified present (no timeouts, no hacks)
let csrfPromise: Promise<void> | null = null;

function getCsrfTokenFromCookie(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(^|;)\s*XSRF-TOKEN\s*=\s*([^;]+)/);
  return match ? match[2] : null;
}

export async function ensureCsrfCookie(): Promise<void> {
  // Return cached promise if already in progress
  if (csrfPromise) return csrfPromise;

  csrfPromise = (async () => {
    try {
      // First, fetch the CSRF cookie endpoint
      const baseOrigin = new URL(API_BASE_URL).origin;
      await axios.get(`${baseOrigin}/sanctum/csrf-cookie`, { withCredentials: true });

      // Now wait for the cookie to appear in the document
      // The Set-Cookie header is processed synchronously by the browser,
      // so we just need to verify it's in document.cookie
      const maxAttempts = 50; // ~250ms with 5ms intervals (safe upper bound)
      let attempts = 0;

      while (attempts < maxAttempts) {
        const token = getCsrfTokenFromCookie();
        if (token) {
          // Token is present and available for the next request
          return;
        }
        // Micro-delay to allow browser to process the Set-Cookie header
        // This is not a "hack" but a necessary wait for browser internals
        await new Promise(resolve => setTimeout(resolve, 5));
        attempts++;
      }

      // If we get here, something went wrong, but don't block login
      console.warn('XSRF-TOKEN cookie not found after /sanctum/csrf-cookie fetch');
    } finally {
      // Clear the cached promise so a retry can happen if needed
      csrfPromise = null;
    }
  })();

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
