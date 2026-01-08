import { useEffect, useRef, useState, useCallback } from "react";
import { apiClient } from "../lib/apiClient";

type AiEvaluation = {
  id?: number | null;
  status?: string | null;
  semantic_status?: string | null;
  score?: number | null;
  feedback?: string | null;
  updated_at?: string | null;
  meta?: { reason?: string } | null;
} | null;

export function useSubmissionPolling(submissionId?: number | string | null, opts?: { intervalMs?: number; maxAttempts?: number }) {
  const intervalMs = opts?.intervalMs ?? 2500;
  const maxAttempts = opts?.maxAttempts ?? 24; // ~60 seconds

  const attemptsRef = useRef(0);
  const [attempts, setAttempts] = useState(0); // mirror for UI
  const [isPolling, setIsPolling] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<AiEvaluation>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [semanticStatus, setSemanticStatus] = useState<string | null>(null);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [evaluationDebug, setEvaluationDebug] = useState<any | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const activeSubmissionRef = useRef<number | string | null>(null);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const stopPolling = useCallback((reason?: string) => {
    setIsPolling(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (reason) setStopReason(reason);
  }, []);

  const runPollOnce = useCallback(async () => {
    if (!submissionId) return;

    try {
      const res = await apiClient.get(`/student/submissions/${submissionId}`);
      const payload = res?.data?.data ?? res?.data ?? {};
      const root = payload?.data ?? payload;

      // Normalize fields preferring root when present
      const evaluation = root?.ai_evaluation ?? payload?.ai_evaluation ?? null;
      const evaluationDebug = root?.evaluation_debug ?? payload?.evaluation_debug ?? null;
      const submissionStatus = root?.status ?? payload?.status ?? null;
      const userMessage = root?.user_message ?? payload?.user_message ?? null;

      // update debug values
      if (evaluation) {
        setAiEvaluation(evaluation);
        setLastUpdatedAt(evaluation.updated_at ?? evaluationDebug?.latest_ai_evaluation_updated_at ?? null);
      } else {
        setAiEvaluation(null);
        setLastUpdatedAt(root?.evaluated_at ?? payload?.evaluated_at ?? payload?.submitted_at ?? null);
      }
      setStatus(submissionStatus ?? null);
      if (evaluationDebug) {
        setEvaluationDebug(evaluationDebug);
        setLastUpdatedAt(evaluationDebug.latest_ai_evaluation_updated_at ?? (evaluation?.updated_at ?? null));
      } else {
        setEvaluationDebug(null);
      }

      // clear previous errors if there's a user message
      if (userMessage) {
        setLastError(null);
      }

      // final score snapshot if provided by payload
      const fs = root?.final_score ?? payload?.final_score ?? null;
      setFinalScore(typeof fs === 'number' ? fs : null);

      // Use server-provided canonical evaluation status if present (authoritative)
      const serverEvalStatus = payload?.evaluation_status ?? root?.evaluation_status ?? null;

      if (serverEvalStatus) {
        setSemanticStatus(serverEvalStatus ?? null);

        const terminalStatuses = ['completed', 'manual_review', 'skipped', 'failed', 'timed_out'];
        if (terminalStatuses.includes(serverEvalStatus)) {
          // If failed or timed_out, surface a reason for display
          if (serverEvalStatus === 'failed' || serverEvalStatus === 'timed_out') {
            const reason = evaluation?.meta?.reason ?? evaluationDebug?.message ?? 'Unknown';
            setLastError(reason);
          }

          const updatedAt = evaluation?.updated_at ?? evaluationDebug?.latest_ai_evaluation_updated_at ?? root?.evaluated_at ?? payload?.evaluated_at ?? payload?.submitted_at ?? null;
          setLastUpdatedAt(updatedAt ?? null);
          // stop polling and use server-provided semantic as stopReason
          stopPolling(serverEvalStatus);
          return;
        }

        // not terminal -> keep polling
        setSemanticStatus(serverEvalStatus);
      } else {
        // If evaluation_status is missing (migration fallback), try to use ai_evaluation.semantic_status or legacy flags
        const semanticFallback = root?.ai_evaluation?.semantic_status ?? payload?.ai_evaluation?.semantic_status ?? null;
        if (semanticFallback) setSemanticStatus(semanticFallback);

        // Legacy: if submission flags indicate evaluated, stop polling
        if (submissionStatus === 'evaluated' || payload?.is_evaluated) {
          stopPolling('completed');
          return;
        }
      }

      // continue polling: increment attempts
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      setLastError(null);

    } catch (err: any) {
      // network or server error
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      setLastError(err?.message ?? String(err));
    }

    if (attemptsRef.current >= maxAttempts) {
      // Do a final manual fetch in case the evaluation completed just after our last poll
      await manualCheck();
      stopPolling('timeout');
    }
  }, [submissionId, stopPolling, maxAttempts]);

  const startPolling = useCallback(() => {
    if (!submissionId) return;
    if (timerRef.current) return; // already polling for a submission

    // reset counters
    attemptsRef.current = 0;
    setAttempts(0);
    setStopReason(null);
    setLastError(null);

    activeSubmissionRef.current = submissionId;
    setIsPolling(true);

    // immediate first poll
    runPollOnce();
    timerRef.current = window.setInterval(async () => {
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      
      await runPollOnce();

      if (attemptsRef.current >= maxAttempts) {
        stopPolling('timeout');
      }
    }, intervalMs);
  }, [submissionId, runPollOnce, intervalMs, maxAttempts, stopPolling]);

  // start/stop when submissionId changes
  useEffect(() => {
    // if submissionId changed, stop previous poll and start fresh
    if (!submissionId) return;

    // ensure only one interval exists
    if (activeSubmissionRef.current !== submissionId) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startPolling();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [submissionId, startPolling]);

  const manualCheck = useCallback(async () => {
    // one-off immediate fetch without changing polling state
    try {
      const res = await apiClient.get(`/student/submissions/${submissionId}`);
      const payload = res?.data?.data ?? res?.data ?? {};
      const evaluation = payload?.ai_evaluation ?? null;
      setAiEvaluation(evaluation ?? null);
      const semantic = evaluation?.semantic_status ?? (payload?.evaluation_status === 'manual_review' ? 'manual_review' : null);
      setSemanticStatus(semantic ?? null);
      setStatus(payload?.status ?? null);
      setLastUpdatedAt(evaluation?.updated_at ?? payload?.evaluated_at ?? null);
      setLastError(null);
      return payload;
    } catch (e: any) {
      setLastError(e?.message ?? String(e));
      return null;
    }
  }, [submissionId]);

  const progressPct = Math.floor((Math.min(attemptsRef.current, maxAttempts) / maxAttempts) * 100);

  // Treat 'pending' and 'processing' as evaluating states to ensure UI shows progress
  const isEvaluating = semanticStatus === 'evaluating' || semanticStatus === 'queued' || semanticStatus === 'pending' || semanticStatus === 'processing';
  const isCompleted = semanticStatus === 'completed';
  const isManualReview = semanticStatus === 'manual_review';
  const isTimedOut = semanticStatus === 'timed_out';
  const isFailed = semanticStatus === 'failed';
  const isSkipped = semanticStatus === 'skipped';

  return {
    aiEvaluation,
    evaluationDebug,
    finalScore,
    isPolling,
    semanticStatus,
    isEvaluating,
    isCompleted,
    isManualReview,
    isTimedOut,
    isFailed,
    isSkipped,
    attempts: attemptsRef.current,
    maxAttempts,
    progressPct,
    status,
    stopReason,
    lastUpdatedAt,
    lastError,
    manualCheck,
  };
}

