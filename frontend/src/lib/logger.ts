export function safeLogError(err: unknown, context?: string) {
  // Avoid logging tokens or sensitive backend payloads
  const prefix = context ? `[${context}] ` : "";
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(`${prefix}Error`, {
      status: (err as any)?.status ?? (err as any)?.response?.status,
      message: (err as any)?.message ?? (err as any)?.response?.data?.message,
    });
  }
}
