import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";

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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">
          No assignment selected. Go back to assignments.
        </p>
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
      console.error(err);
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ??
        "Failed to create portfolio item. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <h1 className="text-2xl font-bold">Add Assignment to Portfolio</h1>
        <p className="text-slate-300 text-sm">
          Fill in the details you want to showcase for this assignment.
        </p>

        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/40 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-md border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm text-emerald-100">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="title" className="block text-sm text-slate-200">
              Title
            </label>
            <input
              id="title"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="E.g. Landing page for SaaS startup"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="description"
              className="block text-sm text-slate-200"
            >
              Description
            </label>
            <textarea
              id="description"
              className="w-full min-h-[120px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you build? What was your role?"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="githubUrl" className="block text-sm text-slate-200">
              GitHub URL (optional)
            </label>
            <input
              id="githubUrl"
              type="url"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="liveDemoUrl"
              className="block text-sm text-slate-200"
            >
              Live Demo URL (optional)
            </label>
            <input
              id="liveDemoUrl"
              type="url"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={liveDemoUrl}
              onChange={(e) => setLiveDemoUrl(e.target.value)}
              placeholder="https://myproject.vercel.app"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
          >
            {isSubmitting ? "Saving..." : "Save to Portfolio"}
          </button>
        </form>
      </div>
    </div>
  );
}
