import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import type { PortfolioItem } from "../../types/projects";

export function StudentPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPortfolio() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get("/student/portfolios");
        const data = response.data.data ?? response.data;
        setItems(data as PortfolioItem[]);
      } catch (err: unknown) {
        console.error(err);
        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        const message =
          axiosError?.response?.data?.message ??
          "Failed to load portfolio items.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchPortfolio();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Loading portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">
          You have no portfolio items yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <h1 className="text-2xl font-bold">Your Portfolio</h1>
        <p className="text-slate-300 text-sm">
          Projects you have completed and decided to showcase.
        </p>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <h2 className="text-lg font-semibold mb-1">{item.title}</h2>
              {item.description && (
                <p className="text-sm text-slate-300 mb-2">
                  {item.description}
                </p>
              )}

              {item.score !== undefined && item.score !== null && (
                <p className="text-sm text-slate-200 mb-1">
                  Score: <span className="font-bold">{item.score}</span>
                </p>
              )}

              {item.feedback && (
                <p className="text-sm text-slate-400 mb-2 italic">
                  Feedback: {item.feedback}
                </p>
              )}

              <div className="flex gap-3 mt-2">
                {item.github_url && (
                  <a
                    href={item.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-sky-400 hover:underline"
                  >
                    GitHub
                  </a>
                )}
                {item.live_demo_url && (
                  <a
                    href={item.live_demo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-emerald-400 hover:underline"
                  >
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
