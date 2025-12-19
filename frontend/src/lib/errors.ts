export function getSafeErrorMessage(err: unknown): string {
  const anyErr = err as any;
  const status: number | undefined = anyErr?.status ?? anyErr?.response?.status;

  const backendMsg: unknown = anyErr?.response?.data?.message ?? anyErr?.message;
  const isStringMsg = typeof backendMsg === "string" && backendMsg.trim().length > 0;

  if (status === 401 || status === 403) {
    return "Your session has expired or you are not authorized.";
  }
  if (status === 429) {
    return "Too many requests. Please wait and try again.";
  }
  if (status === 404) {
    return "Resource not found.";
  }
  if (typeof status === "number" && status >= 500) {
    return "Server error. Please try again later.";
  }

  return isStringMsg ? (backendMsg as string) : "Request failed. Please try again.";
}
