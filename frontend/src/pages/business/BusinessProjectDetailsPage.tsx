import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import type { BusinessProject } from "../../types/projects";

export function BusinessProjectDetailsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<BusinessProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">No project selected.</p>
      </div>
    );
  }

  useEffect(() => {
    async function loadProject() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/business/projects/${projectId}`);
        const data = response.data.data ?? response.data;
        setProject(data as BusinessProject);
      } catch (err: any) {
        console.error(err);
        const message =
          err?.response?.data?.message ?? "Failed to load project.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-100">
          {error ?? "Project not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">{project.title}</h1>
          {project.description && (
            <p className="text-slate-300 text-sm">{project.description}</p>
          )}
          <p className="text-xs text-slate-400">
            {project.level && <>Level: {project.level} · </>}
            {project.domain && <>Domain: {project.domain}</>}
            {project.status && <> · Status: {project.status}</>}
          </p>
        </header>

        <section className="flex flex-wrap gap-3">
          <Link
            to={`/business/projects/${project.id}/candidates`}
            className="rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-sm font-medium text-white"
          >
            View Candidates
          </Link>

          <Link
            to={`/business/projects/${project.id}/assignments`}
            className="rounded-md border border-slate-700 hover:bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
          >
            View Assignments
          </Link>
        </section>
      </div>
    </div>
  );
}
