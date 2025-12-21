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
