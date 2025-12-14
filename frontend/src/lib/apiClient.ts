import axios, { AxiosError } from "axios";

const rawBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
// Ensure we always hit the API prefix while keeping the provided base flexible
const baseURL = rawBase.endsWith("/api")
  ? rawBase
  : `${rawBase.replace(/\/$/, "")}/api`;

export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
});

// Attach Authorization header if token exists in localStorage
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("token") || localStorage.getItem("sf_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Normalize errors and handle unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("sf_token");
      window.location.href = "/auth/login";
    }

    const normalized = {
      message:
        (error.response?.data as { message?: string })?.message ||
        error.message ||
        "Request failed",
      status,
      errors: (error.response?.data as { errors?: unknown })?.errors,
    };

    return Promise.reject(normalized);
  }
);
