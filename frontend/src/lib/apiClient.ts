import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // نستخدم Bearer token بدل cookies
});

// Attach Authorization header if token exists in localStorage
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sf_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Global response handler for auth and safe errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors (no response from server)
    if (!error.response) {
      const safeError = {
        message: error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK"
          ? "Cannot connect to server. Please check if the server is running."
          : "Network error. Please check your connection and try again.",
        status: null,
        errors: null,
      };
      return Promise.reject(safeError);
    }

    const status = error.response.status;
    const validationErrors =
      status === 422 ? error?.response?.data?.errors ?? null : null;

    // 401/403 -> force logout and redirect to login
    if (status === 401 || status === 403) {
      try {
        localStorage.removeItem("sf_token");
        localStorage.removeItem("sf_user");
        // Notify any listeners (AuthProvider) to sync state
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("sf:auth-logout"));
        }
      } catch {}

      if (typeof window !== "undefined") {
        const current = window.location.pathname + window.location.search;
        const loginUrl = `/auth/login?next=${encodeURIComponent(current)}`;
        window.location.assign(loginUrl);
      }
    }

    // Normalize error payload shape without leaking backend raw data
    const safeMessage =
      typeof error?.response?.data?.message === "string"
        ? error.response.data.message
        : status === 429
        ? "Too many requests. Please wait and try again."
        : status === 404
        ? "Resource not found."
        : status >= 500
        ? "Server error. Please try again later."
        : "Request failed. Please check and try again.";

    const safeError = {
      message: safeMessage,
      status,
      errors: validationErrors,
    };

    return Promise.reject(safeError);
  }
);
