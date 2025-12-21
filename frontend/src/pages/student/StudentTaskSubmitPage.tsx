import { useEffect, useState, useRef, useMemo, FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { apiClient } from "../../lib/apiClient";
import { safeLogError } from "../../lib/logger";
import { useAppToast } from "../../components/feedback/useAppToast";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

type ErrorState = "invalid" | "not-found" | "generic";

type TaskDetail = {
  id: number;
  title?: string | null;
  description?: string | null;
};

export function StudentTaskSubmitPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toastSuccess, toastError } = useAppToast();

  const [answerText, setAnswerText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ answer?: string; attachment?: string }>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [submissionMeta, setSubmissionMeta] = useState<{ id?: number | string | null; updatedAt?: string | null; submittedAt?: string | null }>({ submittedAt: null });

  useEffect(() => {
    const numericId = Number(id);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError("invalid");
      setLoading(false);
      return;
    }

    async function fetchTask() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/student/tasks/${numericId}`);
        const data = res.data.data ?? res.data;
        setTask({ id: numericId, title: data?.title ?? null, description: data?.description ?? null });
      } catch (err: unknown) {
        safeLogError(err, "TaskDetails");
        if (isAxiosError(err) && err.response?.status === 404) {
          setError("not-found");
        } else {
          // Fallback placeholder when details endpoint is not available
          setTask({ id: numericId, title: `Task #${numericId}`, description: null });
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTask();
  }, [id]);

  const headingTitle = useMemo(() => {
    const state = (location.state || {}) as { taskTitle?: string };
    return state.taskTitle || task?.title || (task?.id ? `Task #${task.id}` : "Task");
  }, [location.state, task]);

  const handleBackToRoadmap = () => navigate("/student/roadmap");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numericId = Number(id);

    // Prevent duplicate submissions
    if (isSubmitting) return;

    if (!Number.isInteger(numericId) || numericId <= 0) {
      toastError("Invalid task id.");
      return;
    }

    // inline validation
    const errors: { answer?: string; attachment?: string } = {};
    if (!answerText.trim()) {
      errors.answer = "Answer is required.";
    }

    if (attachmentUrl && !attachmentUrl.startsWith("https://")) {
      errors.attachment = "Attachment URL must start with https://";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormMessage("Please fix the errors below.");
      return;
    }

    setFieldErrors({});
    setFormMessage(null);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/student/tasks/${numericId}/submit`, {
        answer_text: answerText,
        attachment_url: attachmentUrl || null,
      });

      // Success: update UI immediately
      setSubmitted(true);
      const payload = res?.data ?? {};
      const nowIso = new Date().toISOString();
      const evalFeedback = payload?.ai_feedback ?? payload?.evaluation?.feedback ?? null;
      const evalScore = payload?.ai_score ?? payload?.evaluation?.score ?? null;
      setSubmissionMeta({
        id: payload?.submission?.id ?? payload?.id ?? null,
        updatedAt: payload?.submission?.updated_at ?? payload?.updated_at ?? nowIso,
        submittedAt: nowIso,
      });
      setAiFeedback(evalFeedback || "Feedback will appear here after evaluation.");
      setAiScore(typeof evalScore === "number" ? evalScore : null);
      toastSuccess("Submitted: Your solution was saved successfully.");
    } catch (err: unknown) {
      safeLogError(err, "TaskSubmit");

      // Validation errors (422) -> show inline and persist until user edits
      if (isAxiosError(err) && err.response?.status === 422) {
        const validation = err.response?.data?.errors ?? {};
        const mapped: { answer?: string; attachment?: string } = {};
        if (validation.answer_text) mapped.answer = Array.isArray(validation.answer_text) ? validation.answer_text.join(" ") : String(validation.answer_text);
        if (validation.attachment_url) mapped.attachment = Array.isArray(validation.attachment_url) ? validation.attachment_url.join(" ") : String(validation.attachment_url);
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
        setFormMessage(err.response?.data?.message ?? "Please fix the errors below.");
      } else {
        const message = isAxiosError(err) ? (err.response?.data?.message || "Failed to submit task.") : "Failed to submit task.";
        setFormMessage(message);
      }

      toastError("Submission failed. See messages below.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const formSubmitting =
    typeof isSubmitting !== "undefined"
      ? // @ts-ignore
        isSubmitting
      : typeof loading !== "undefined"
      ? // @ts-ignore
        loading
      : false;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-slate-200" />
        </div>
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (error === "invalid") {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <EmptyState
          title="Invalid task"
          description="The task id is missing or invalid."
          primaryActionLabel="Back to Roadmap"
          onPrimaryAction={handleBackToRoadmap}
        />
      </div>
    );
  }

  if (error === "not-found") {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <EmptyState
          title="Task not found"
          description="We couldn't find this task."
          primaryActionLabel="Back to Roadmap"
          onPrimaryAction={handleBackToRoadmap}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Link to="/" className="font-medium text-slate-700 hover:text-slate-900">
          Home
        </Link>
        <span className="text-slate-400">/</span>
        <Link
          to="/student/roadmap"
          className="font-medium text-slate-700 hover:text-slate-900"
        >
          Roadmap
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-medium text-slate-700">Tasks</span>
        <span className="text-slate-400">/</span>
        <span className="font-medium text-slate-900">{headingTitle}</span>
      </nav>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">{headingTitle}</h1>
          {submitted && (
            <Badge variant="outline" className="text-emerald-700">Submitted</Badge>
          )}
        </div>
        <p className="text-base text-slate-700">Submit your answer below to complete this task.</p>
      </header>

      <Card className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">Task details</h3>
          <p className="text-sm text-slate-700">{task?.description || "No description provided."}</p>
        </div>

        {submitted ? (
          <Badge variant="outline" className="text-emerald-700">Submitted</Badge>
        ) : null}
      </Card>

      {!submitted ? (
        <form onSubmit={handleSubmit} aria-busy={formSubmitting} className="space-y-4">
          <Card className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900" htmlFor="answer_text">Your answer</label>
              <textarea
                id="answer_text"
                disabled={isSubmitting}
                className="min-h-[160px] w-full rounded-md border border-slate-300 p-2 text-sm disabled:opacity-60 disabled:bg-slate-50"
                placeholder="Write your solution, explanation, or notes..."
                value={answerText}
                onChange={(e) => {
                  setAnswerText(e.target.value);
                  if (fieldErrors.answer) setFieldErrors(prev => ({ ...prev, answer: undefined }));
                  if (formMessage) setFormMessage(null);
                }}
                aria-invalid={!!fieldErrors.answer}
                aria-describedby={fieldErrors.answer ? "answer-error" : "answer-help"}
              />
              <p id="answer-help" className="text-xs text-slate-500">
                Provide your answer, link, or upload details.
              </p>
              {fieldErrors.answer && (
                <p id="answer-error" role="alert" className="text-sm text-red-600">
                  {fieldErrors.answer}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900" htmlFor="attachment_url">Attachment URL (optional)</label>
              <input
                id="attachment_url"
                type="url"
                disabled={isSubmitting}
                className="w-full rounded-md border border-slate-300 p-2 text-sm disabled:opacity-60 disabled:bg-slate-50"
                placeholder="https://your-hosted-solution.example.com"
                value={attachmentUrl}
                onChange={(e) => {
                  setAttachmentUrl(e.target.value);
                  if (fieldErrors.attachment) setFieldErrors(prev => ({ ...prev, attachment: undefined }));
                  if (formMessage) setFormMessage(null);
                }}
                aria-invalid={!!fieldErrors.attachment}
                aria-describedby={fieldErrors.attachment ? "attachment-error" : "attachment-help"}
              />
              <p id="attachment-help" className="text-xs text-slate-500">
                Must start with https:// if provided.
              </p>
              {fieldErrors.attachment && (
                <p id="attachment-error" role="alert" className="text-sm text-red-600">
                  {fieldErrors.attachment}
                </p>
              )}
            </div>

            {formMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {formMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M22 12a10 10 0 0 1-10 10" /></svg>
                    Submitting...
                  </span>
                ) : (
                  "Submit"
                )}
              </Button>
              <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" disabled className="opacity-60 cursor-not-allowed">
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M22 12a10 10 0 0 1-10 10" /></svg>
                    Save draft (coming soon)
                  </span>
                ) : "Save draft (coming soon)"}
                </Button>
                {isSubmitting && <p className="text-xs text-slate-600">Disabled while submission is in progress.</p>}
              </div>
            </div>
          </Card>
        </form>
      ) : null}

      {submitted && (
        <div className="mt-3">
          <Card className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">Submission status</h3>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <Badge variant="outline" className="text-emerald-700">Submitted</Badge>
                  <span>{submissionMeta.submittedAt ? `Submitted at ${new Date(submissionMeta.submittedAt).toLocaleString()}` : (submissionMeta.updatedAt ? `Submitted at ${new Date(submissionMeta.updatedAt).toLocaleString()}` : 'Submitted just now')}</span>
                  {submissionMeta.id ? <span className="text-slate-500">ID: {submissionMeta.id}</span> : null}
                </div>
              </div>

              <div>
                <Button
                  variant="default"
                  onClick={() => {
                    const state = (location.state || {}) as { blockId?: number };
                    const dest = state.blockId && Number.isFinite(state.blockId)
                      ? `/student/blocks/${state.blockId}`
                      : "/student/roadmap";
                    navigate(dest);
                  }}
                >
                  Back to block tasks
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {submitted && (
        <Card className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Feedback</h3>
            </div>
            {typeof aiScore === "number" && (
              <span className="text-sm font-medium text-slate-900">Score: {aiScore} / 100</span>
            )}
          </div>
          <p className="text-sm text-slate-700">{aiFeedback}</p>
        </Card>
      )}

    </div>
  );
}
