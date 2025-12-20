import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";
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
        safeLogError(err, "Portfolio");
        setError(getSafeErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    void fetchPortfolio();
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Your Portfolio</h1>
        <p className="text-sm text-slate-600">
          Projects you have completed and decided to showcase.
        </p>
      </header>

      {isLoading && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Loading portfolio...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && !items.length && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">You have no portfolio items yet.</p>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-1">{item.title}</h2>
              {item.description && (
                <p className="text-sm text-slate-600 mb-2">{item.description}</p>
              )}

              {item.score !== undefined && item.score !== null && (
                <p className="text-sm text-slate-700 mb-1">
                  Score: <span className="font-bold text-slate-900">{item.score}</span>
                </p>
              )}

              {item.feedback && (
                <p className="text-sm text-slate-500 mb-2 italic">
                  Feedback: {item.feedback}
                </p>
              )}

              <div className="flex gap-3 mt-2">
                {item.github_url && (
                  <a
                    href={item.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-sky-600 hover:underline"
                  >
                    GitHub
                  </a>
                )}
                {item.live_demo_url && (
                  <a
                    href={item.live_demo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
