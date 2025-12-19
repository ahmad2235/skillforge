import type { FormEvent } from "react";
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";
import type { TaskEvaluation } from "../../types/learning";

interface SubmissionData {
  id: number;
  ai_score: number | null;
  ai_feedback: string | null;
  ai_metadata: Record<string, any> | null;
  is_evaluated: boolean;
}

export function StudentTaskSubmitPage() {
  const { taskId } = useParams();
  const [answerText, setAnswerText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [runStatus, setRunStatus] = useState("");
  const [knownIssues, setKnownIssues] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<TaskEvaluation | null>(null);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for evaluation results
  useEffect(() => {
    if (!submissionId || isEvaluating) return;

    const pollEvaluation = async () => {
      try {
        const response = await apiClient.get(
          `/student/submissions/${submissionId}`
        );
        const submission = response.data.data as SubmissionData;

        if (submission.is_evaluated && submission.ai_metadata) {
          // Evaluation complete
          setEvaluation({
            score: submission.ai_score,
            feedback: submission.ai_feedback,
          });
          setSuccessMessage(
            "Task submitted successfully. Evaluation complete!"
          );

          // Display detailed results
          if (submission.ai_metadata.passed) {
            setSuccessMessage(
              "✅ " +
                (submission.ai_metadata.congrats_message ||
                  "Task evaluated successfully!")
            );
          }

          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsEvaluating(false);
        }
      } catch (err) {
        safeLogError(err, "PollEvaluation");
      }
    };

    // Start polling every 2 seconds
    if (!pollIntervalRef.current) {
      setIsEvaluating(true);
      pollIntervalRef.current = setInterval(pollEvaluation, 2000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [submissionId, isEvaluating]);

  if (!taskId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">
          No task selected. Please go back to your roadmap.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setEvaluation(null);
    setSubmissionId(null);
    setIsSubmitting(true);
    setIsEvaluating(false);

    try {
      const response = await apiClient.post(`/student/tasks/${taskId}/submit`, {
        answer_text: answerText,
        attachment_url: attachmentUrl || null,
        run_status: runStatus,
        known_issues: knownIssues,
      });

      const data = response.data as {
        message?: string;
        submission?: { id: number };
      };

      if (data.submission?.id) {
        setSubmissionId(data.submission.id);
        setSuccessMessage("Task submitted. Evaluating...");
      }

      setAnswerText("");
      setAttachmentUrl("");
      setRunStatus("");
      setKnownIssues("");
    } catch (err: unknown) {
      safeLogError(err, "SubmitTask");
      setError(getSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Submit Task #{taskId}</h1>
          <p className="text-slate-300 text-sm">
            Submit your solution with optional GitHub link. AI will evaluate
            your work.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-700 bg-red-900/40 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        {successMessage && !isEvaluating && (
          <div className="rounded-lg border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm text-emerald-100">
            {successMessage}
          </div>
        )}

        {isEvaluating && (
          <div className="rounded-lg border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm text-amber-100">
            ⏳ Evaluating your submission... This may take a moment.
          </div>
        )}

        {!submissionId ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="answerText"
                className="block text-sm text-slate-200"
              >
                Answer / Solution *
              </label>
              <textarea
                id="answerText"
                className="w-full min-h-[160px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Describe your solution or paste important parts of your code..."
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="attachmentUrl"
                className="block text-sm text-slate-200"
              >
                Attachment URL (optional)
              </label>
              <input
                id="attachmentUrl"
                type="url"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="https://github.com/username/repo or deployed URL"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="runStatus"
                className="block text-sm text-slate-200"
              >
                Does it run? (optional)
              </label>
              <input
                id="runStatus"
                type="text"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Yes / No / Partially / With issues"
                value={runStatus}
                onChange={(e) => setRunStatus(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="knownIssues"
                className="block text-sm text-slate-200"
              >
                Known issues (optional)
              </label>
              <input
                id="knownIssues"
                type="text"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="List any issues you encountered..."
                value={knownIssues}
                onChange={(e) => setKnownIssues(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit Task"}
            </button>
          </form>
        ) : null}

        {evaluation && (
          <EvaluationResultsPanel
            score={evaluation.score}
            feedback={evaluation.feedback}
            metadata={evaluation as any}
          />
        )}
      </div>
    </div>
  );
}

interface EvaluationResultsPanelProps {
  score: number | null;
  feedback: string | null;
  metadata: any;
}

function EvaluationResultsPanel({
  score,
  feedback,
  metadata,
}: EvaluationResultsPanelProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">AI Evaluation Results</h2>
          <span
            className={`text-2xl font-bold ${
              score && score >= 80 ? "text-green-400" : "text-orange-400"
            }`}
          >
            {score ?? 0} / 100
          </span>
        </div>

        {feedback && (
          <div className="bg-slate-950 rounded-lg p-3 text-sm text-slate-200">
            <p className="whitespace-pre-wrap">{feedback}</p>
          </div>
        )}

        {metadata?.passed && (
          <div className="rounded-lg bg-green-900/40 border border-green-700 p-3 text-sm text-green-100">
            ✅ {metadata.congrats_message || "Congratulations, you passed!"}
          </div>
        )}

        {!metadata?.passed && score !== null && (
          <div className="rounded-lg bg-orange-900/40 border border-orange-700 p-3 text-sm text-orange-100">
            ⚠️ Keep improving. Target score is 80+.
          </div>
        )}

        {metadata?.developer_assessment && (
          <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 text-sm">
            <p className="text-slate-300">
              <strong>Level:</strong>{" "}
              {metadata.developer_assessment.estimated_level || "Unknown"}
            </p>
            {metadata.developer_assessment.strengths?.length > 0 && (
              <p className="text-slate-300">
                <strong>Strengths:</strong>{" "}
                {metadata.developer_assessment.strengths.join(", ")}
              </p>
            )}
            {metadata.developer_assessment.weaknesses?.length > 0 && (
              <p className="text-slate-300">
                <strong>Improve:</strong>{" "}
                {metadata.developer_assessment.weaknesses.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
