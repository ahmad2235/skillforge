export type ApiErrorKind = "unauthorized" | "forbidden" | "not_found" | "validation" | "network" | "server" | "unknown";

export interface ParsedApiError {
  kind: ApiErrorKind;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export function parseApiError(err: any): ParsedApiError {
  // Network error (no response from server or explicit network flag)
  if (err?.isNetworkError || (!err?.isHttpError && !err?.isNetworkError && !err?.status && !err?.payload && !err?.response)) {
    return {
      kind: "network",
      message: err?.message || "Network error. Please check your connection and try again.",
    };
  }

  // Http error produced by apiClient
  const status = err?.status ?? err?.response?.status ?? null;
  const payload = err?.payload ?? err?.response?.data ?? null;
  const message = err?.message || payload?.message || "";

  if (status === 401) {
    return { kind: "unauthorized", message: message || "Your session has expired. Please log in again." };
  }

  if (status === 403) {
    return { kind: "forbidden", message: message || "You do not have permission to perform this action." };
  }

  if (status === 404) {
    return { kind: "not_found", message: message || "Resource not found." };
  }

  if (status === 422) {
    const fieldErrors = payload?.errors ?? err?.errors ?? null;
    return {
      kind: "validation",
      message: message || "Please check your input and try again.",
      fieldErrors: fieldErrors ? (typeof fieldErrors === "object" ? fieldErrors : undefined) : undefined,
    };
  }

  if (status === 429) {
    return { kind: "server", message: "Too many requests. Please wait and try again." };
  }

  if (status && status >= 500) {
    return { kind: "server", message: message || "Server error. Please try again later." };
  }

  return { kind: "unknown", message: message || "An error occurred. Please try again." };
}
