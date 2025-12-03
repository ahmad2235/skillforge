import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";

type LevelOption = "beginner" | "intermediate" | "advanced";
type DomainOption = "frontend" | "backend";

export function BusinessProjectCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<LevelOption>("beginner");
  const [domain, setDomain] = useState<DomainOption>("frontend");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/business/projects", {
        title,
        description,
        level,
        domain,
      });

      const created = response.data?.data ?? response.data;
      const id = created?.id;

      if (id) {
        navigate(`/business/projects/${id}`);
      } else {
        navigate("/business/projects");
      }
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ??
        "Failed to create project. Please check your input.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <h1 className="text-2xl font-bold">Create New Project</h1>
        <p className="text-slate-300 text-sm">
          Define a project that students can work on. You can later invite
          specific students or let the system recommend candidates.
        </p>

        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/40 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="title" className="block text-sm text-slate-200">
              Title
            </label>
            <input
              id="title"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
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
              className="w-full min-h-[120px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about? What skills are needed?"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="block text-sm text-slate-200">Level</label>
              <select
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                value={level}
                onChange={(e) => setLevel(e.target.value as LevelOption)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm text-slate-200">Domain</label>
              <select
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                value={domain}
                onChange={(e) => setDomain(e.target.value as DomainOption)}
              >
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
          >
            {isSubmitting ? "Creating..." : "Create Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
