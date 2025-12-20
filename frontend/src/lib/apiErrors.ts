export type ApiErrorKind = "unauthorized" | "forbidden" | "not_found" | "validation" | "network" | "server" | "unknown";

export interface ParsedApiError {
  kind: ApiErrorKind;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export function parseApiError(err: any): ParsedApiError {
  // Network error (no response from server)
  if (!err?.response) {
    return {
      kind: "network",
      message: err?.message || "Network error. Please check your connection and try again.",
    };
  }

  const status = err.status ?? err.response?.status;
  const message = err.message || err.response?.data?.message || "";

  // 401 Unauthorized
  if (status === 401) {
    return {
      kind: "unauthorized",
      message: message || "Your session has expired. Please log in again.",
    };
  }

  // 403 Forbidden
  if (status === 403) {
    return {
      kind: "forbidden",
      message: message || "You do not have permission to perform this action.",
    };
  }

  // 404 Not Found
  if (status === 404) {
    return {
      kind: "not_found",
      message: message || "Resource not found.",
    };
  }

  // 422 Validation Error
  if (status === 422) {
    const fieldErrors = err.errors || err.response?.data?.errors || null;
    return {
      kind: "validation",
      message: message || "Please check your input and try again.",
      fieldErrors: fieldErrors ? (typeof fieldErrors === "object" ? fieldErrors : undefined) : undefined,
    };
  }

  // 429 Too Many Requests
  if (status === 429) {
    return {
      kind: "server",
      message: "Too many requests. Please wait and try again.",
    };
  }

  // 5xx Server Error
  if (status && status >= 500) {
    return {
      kind: "server",
      message: message || "Server error. Please try again later.",
    };
  }

  // Default unknown error
  return {
    kind: "unknown",
    message: message || "An error occurred. Please try again.",
  };
}
