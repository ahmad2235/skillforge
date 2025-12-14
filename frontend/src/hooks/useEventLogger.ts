import { useCallback } from "react";
import { apiClient } from "../lib/apiClient";

const logSilently = async (payload: Record<string, unknown>) => {
  try {
    await apiClient.post("/student/events", payload);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("event log failed", err);
    }
  }
};

export function useEventLogger() {
  const logView = useCallback(
    (
      targetType: string,
      targetId?: number,
      metadata?: Record<string, unknown>
    ) => {
      return logSilently({
        event_type: "view",
        target_type: targetType,
        target_id: targetId,
        metadata,
      });
    },
    []
  );

  const logClick = useCallback(
    (
      targetType: string,
      targetId?: number,
      metadata?: Record<string, unknown>
    ) => {
      return logSilently({
        event_type: "click",
        target_type: targetType,
        target_id: targetId,
        metadata,
      });
    },
    []
  );

  const logDuration = useCallback(
    (
      targetType: string,
      targetId: number | undefined,
      durationSeconds: number,
      metadata?: Record<string, unknown>
    ) => {
      return logSilently({
        event_type: "duration",
        target_type: targetType,
        target_id: targetId,
        duration_seconds: durationSeconds,
        metadata,
      });
    },
    []
  );

  const logSubmit = useCallback(
    (
      targetType: string,
      targetId?: number,
      metadata?: Record<string, unknown>
    ) => {
      return logSilently({
        event_type: "submit",
        target_type: targetType,
        target_id: targetId,
        metadata,
      });
    },
    []
  );

  return { logView, logClick, logDuration, logSubmit };
}
