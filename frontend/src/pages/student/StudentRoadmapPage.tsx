import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import type { RoadmapBlock } from "../../types/learning";

export function StudentRoadmapPage() {
  const [blocks, setBlocks] = useState<RoadmapBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoadmap() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get("/student/roadmap");
        // backend returns { data: [...] }
        const data = response.data.data ?? response.data;
        setBlocks(data as RoadmapBlock[]);
      } catch (err: unknown) {
        console.error(err);
        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        const message =
          axiosError?.response?.data?.message ?? "Failed to load roadmap.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoadmap();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Loading roadmap...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="max-w-md bg-red-900/40 border border-red-700 rounded-lg px-4 py-3">
          <p className="text-sm text-red-100">{error}</p>
        </div>
      </div>
    );
  }

  if (!blocks.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">
          No roadmap blocks found for this student yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <h1 className="text-3xl font-bold mb-2">Your Roadmap</h1>
        <p className="text-slate-300 text-sm mb-6">
          Choose a block to see its tasks and start working on them.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {blocks.map((block) => (
            <Link
              key={block.id}
              to={`/student/blocks/${block.id}/tasks`}
              className="block rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-sky-500 hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">{block.title}</h2>
                <span className="text-xs rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                  {block.level} · {block.domain}
                </span>
              </div>
              {block.description && (
                <p className="text-sm text-slate-300 line-clamp-3">
                  {block.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
