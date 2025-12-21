import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import type { CandidateRanked } from "../../types/projects";

export function BusinessProjectCandidatesPage() {
  const { projectId } = useParams();
  const [candidates, setCandidates] = useState<CandidateRanked[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!projectId) {
    return (
      <div className="py-10">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-slate-500 text-sm">No project selected.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    async function loadCandidates() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(
          `/business/projects/${projectId}/candidates`
        );
        const data = response.data.data ?? response.data;
        setCandidates(data as CandidateRanked[]);
      } catch (err: any) {
        console.error(err);
        const message =
          err?.response?.data?.message ??
          "Failed to load candidates for this project.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadCandidates();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="py-10">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-slate-500 text-sm">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="max-w-md rounded-lg border border-red-700 bg-red-50/40 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!candidates.length) {
    return (
      <div className="py-10">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-slate-500 text-sm">No candidates available for this project yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Recommended Candidates</h1>
          <p className="text-slate-700 text-sm">
            Ranked list of students for this project, based on AI evaluation.
          </p>
        </header>

        <div className="space-y-3">
          {candidates.map((entry, index) => (
            <div
              key={entry.student.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-slate-400">#{index + 1}</p>
                  <h2 className="text-lg font-semibold">
                    {entry.student.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {entry.student.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-sky-300">
                    Score: <span className="font-bold">{entry.score}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {entry.student.level && (
                      <>Level: {entry.student.level} · </>
                    )}
                    {entry.student.domain && (
                      <>Domain: {entry.student.domain}</>
                    )}
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-300">
                {entry.reason ?? "No explanation provided."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
