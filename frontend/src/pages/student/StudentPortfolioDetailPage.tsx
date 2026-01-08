import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";
import type { PortfolioItem } from "../../types/projects";
import { FileDown, Edit2, Trash2, Eye, EyeOff } from "lucide-react";

export function StudentPortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchPortfolioItem() {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/student/portfolios/${id}`);
        const data = response.data.data ?? response.data;
        setItem(data as PortfolioItem);
      } catch (err: unknown) {
        safeLogError(err, "Portfolio Detail");
        setError(getSafeErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    void fetchPortfolioItem();
  }, [id]);

  async function handleExportPdf() {
    if (!item) return;
    setIsExporting(true);
    try {
      const response = await apiClient.get(`/student/portfolios/${item.id}/export-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `portfolio-${item.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      safeLogError(err, "PDF Export");
      alert("Failed to export PDF: " + getSafeErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleToggleVisibility() {
    if (!item) return;
    try {
      const response = await apiClient.patch(`/student/portfolios/${item.id}/visibility`);
      setItem(response.data.portfolio as PortfolioItem);
    } catch (err: unknown) {
      safeLogError(err, "Toggle Visibility");
      alert("Failed to toggle visibility: " + getSafeErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!item) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/student/portfolios/${item.id}`);
      navigate("/student/portfolios");
    } catch (err: unknown) {
      safeLogError(err, "Delete Portfolio");
      alert("Failed to delete: " + getSafeErrorMessage(err));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-page-enter">
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
          <p className="text-sm text-slate-300">Loading portfolio item...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-6 animate-page-enter">
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error || "Portfolio item not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header with actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">{item.title}</h1>
          {item.metadata?.project_name && (
            <p className="text-sm text-slate-400">
              Associated Project: <span className="text-slate-200 font-medium">{item.metadata.project_name}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleToggleVisibility}
            title={item.is_public ? "Make Private" : "Make Public"}
            className="p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {item.is_public ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>

          <button
            onClick={() => navigate(`/student/portfolios/${item.id}/edit`)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-sm"
          >
            <Edit2 size={16} />
            Edit
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm disabled:opacity-50"
          >
            <FileDown size={16} />
            {isExporting ? "Exporting..." : "Export PDF"}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 shadow-xl space-y-6">
        {/* Description */}
        {item.description && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 uppercase mb-2">Description</h2>
            <p className="text-slate-200 leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Score & Feedback */}
        {(item.score !== undefined || item.feedback) && (
          <div className="grid grid-cols-2 gap-4">
            {item.score !== undefined && item.score !== null && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
                <p className="text-xs text-blue-300 uppercase font-semibold mb-2">Score</p>
                <p className="text-3xl font-bold text-blue-400">{item.score.toFixed(1)}</p>
                <p className="text-xs text-blue-300 mt-1">/100</p>
              </div>
            )}

            {item.feedback && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
                <p className="text-xs text-amber-300 uppercase font-semibold mb-2">Feedback</p>
                <p className="text-sm text-amber-200">{item.feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Links */}
        {(item.github_url || item.live_demo_url) && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 uppercase mb-3">Project Links</h2>
            <div className="flex gap-3 flex-wrap">
              {item.github_url && (
                <a
                  href={item.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-sky-400 hover:text-sky-300 transition-colors text-sm"
                >
                  📦 GitHub Repository
                </a>
              )}
              {item.live_demo_url && (
                <a
                  href={item.live_demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-emerald-400 hover:text-emerald-300 transition-colors text-sm"
                >
                  🔗 Live Demo
                </a>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        {(item.metadata?.category || item.metadata?.tags) && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 uppercase mb-3">Tags</h2>
            <div className="flex gap-2 flex-wrap">
              {item.metadata?.category && (
                <span className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-medium">
                  {item.metadata.category}
                </span>
              )}
              {item.metadata?.tags?.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata info */}
        {item.user && (
          <div className="border-t border-slate-700 pt-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase mb-3">Student Info</h2>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <span className="text-slate-400">Name:</span> {item.user.name}
              </p>
              <p>
                <span className="text-slate-400">Email:</span> {item.user.email}
              </p>
              {item.user.level && (
                <p>
                  <span className="text-slate-400">Level:</span>{" "}
                  <span className="capitalize">{item.user.level}</span>
                </p>
              )}
              {item.user.domain && (
                <p>
                  <span className="text-slate-400">Domain:</span>{" "}
                  <span className="capitalize">{item.user.domain}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Visibility status */}
        <div className="border-t border-slate-700 pt-4">
          <p className="text-xs text-slate-400">
            Status: {item.is_public ? "🌐 Public" : "🔒 Private"}
          </p>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Delete Portfolio Item?</h3>
            <p className="text-sm text-slate-300 mb-6">
              This action cannot be undone. The portfolio item "{item.title}" will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
