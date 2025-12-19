import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";
import type { BusinessProject } from "../../types/projects";

export function BusinessProjectsListPage() {
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get("/business/projects");
        const data = response.data.data ?? response.data;
        setProjects(data as BusinessProject[]);
      } catch (err: any) {
        safeLogError(err, "BusinessProjectsList");
        setError(getSafeErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    void loadProjects();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Projects</h1>
            <p className="text-slate-300 text-sm">
              Create and manage projects to assign to students.
            </p>
          </div>
          <Link
            to="/business/projects/new"
            className="rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-sm font-medium text-white"
          >
            + New Project
          </Link>
        </header>

        {!projects.length ? (
          <p className="text-slate-400 text-sm">
            You don&apos;t have any projects yet. Create your first one.
          </p>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/business/projects/${project.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-sky-500 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold">{project.title}</h2>
                  {project.status && (
                    <span className="text-xs rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                      {project.status}
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {project.description}
                  </p>
                )}
                {(project.level || project.domain) && (
                  <p className="mt-2 text-xs text-slate-400">
                    {project.level && <>Level: {project.level} · </>}
                    {project.domain && <>Domain: {project.domain}</>}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
