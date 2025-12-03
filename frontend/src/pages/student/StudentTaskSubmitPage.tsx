import type { FormEvent } from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import type { TaskEvaluation } from "../../types/learning";

export function StudentTaskSubmitPage() {
  const { taskId } = useParams();
  const [answerText, setAnswerText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<TaskEvaluation | null>(null);

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
    setIsSubmitting(true);

    try {
      const response = await apiClient.post(`/student/tasks/${taskId}/submit`, {
        answer_text: answerText,
        attachment_url: attachmentUrl || null,
      });

      const data = response.data as {
        message?: string;
        submission?: unknown;
        evaluation?: TaskEvaluation;
      };

      if (data.message) {
        setSuccessMessage(data.message);
      } else {
        setSuccessMessage("Task submitted successfully.");
      }

      if (data.evaluation) {
        setEvaluation(data.evaluation);
      }
    } catch (err: unknown) {
      console.error(err);
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ??
        "Failed to submit the task. Please try again.";
      setError(message);
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
            Paste your solution and optional GitHub / deployment link, then
            submit.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-700 bg-red-900/40 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm text-emerald-100">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="answerText"
              className="block text-sm text-slate-200"
            >
              Answer / Solution
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
          >
            {isSubmitting ? "Submitting..." : "Submit Task"}
          </button>
        </form>

        {evaluation && (
          <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 space-y-2">
            <h2 className="text-lg font-semibold">AI Evaluation</h2>
            <p className="text-sm text-slate-200">
              Score:{" "}
              <span className="font-bold">{evaluation.score ?? "N/A"}</span>
            </p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">
              {evaluation.feedback ?? "No feedback provided yet."}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
