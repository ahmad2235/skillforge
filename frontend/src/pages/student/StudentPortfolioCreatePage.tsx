import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";

export function StudentPortfolioCreatePage() {
  // Changed from assignmentId to assignment to match backend route
  const { assignment } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveDemoUrl, setLiveDemoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!assignment) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Add Assignment to Portfolio</h1>
          <p className="text-sm text-slate-600">
            Fill in the details you want to showcase for this assignment.
          </p>
        </header>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No assignment selected. Go back to assignments.
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post(
        `/student/projects/assignments/${assignment}/portfolio`,
        {
          title,
          description: description || null,
          github_url: githubUrl || null,
          live_demo_url: liveDemoUrl || null,
        }
      );

      const message =
        response.data?.message ?? "Portfolio entry created successfully.";
      setSuccessMessage(message);

      setTimeout(() => {
        navigate("/student/portfolios");
      }, 800);
    } catch (err: unknown) {
      safeLogError(err, "PortfolioCreate");
      setError(getSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Add Assignment to Portfolio</h1>
        <p className="text-sm text-slate-600">
          Fill in the details you want to showcase for this assignment.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="title" className="block text-sm font-medium text-slate-800">
            Title
          </label>
          <input
            id="title"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="E.g. Landing page for SaaS startup"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium text-slate-800">
            Description
          </label>
          <textarea
            id="description"
            className="w-full min-h-[120px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you build? What was your role?"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-800">
            GitHub URL (optional)
          </label>
          <input
            id="githubUrl"
            type="url"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/username/repo"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="liveDemoUrl" className="block text-sm font-medium text-slate-800">
            Live Demo URL (optional)
          </label>
          <input
            id="liveDemoUrl"
            type="url"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            value={liveDemoUrl}
            onChange={(e) => setLiveDemoUrl(e.target.value)}
            placeholder="https://myproject.vercel.app"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save to Portfolio"}
        </button>
      </form>
    </div>
  );
}
