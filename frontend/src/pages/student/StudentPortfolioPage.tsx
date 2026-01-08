import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";
import type { PortfolioItem } from "../../types/projects";
import { FileDown, Edit2, Trash2, Eye, EyeOff, Plus } from "lucide-react";

export function StudentPortfolioPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchPortfolio();
  }, []);

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

  const handleSelectItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item) => item.id));
    }
  };

  async function handleToggleVisibility(item: PortfolioItem, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const response = await apiClient.patch(`/student/portfolios/${item.id}/visibility`);
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? (response.data.portfolio as PortfolioItem) : p))
      );
    } catch (err: unknown) {
      safeLogError(err, "Toggle Visibility");
      alert("Failed: " + getSafeErrorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiClient.delete(`/student/portfolios/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      safeLogError(err, "Delete Portfolio");
      alert("Failed: " + getSafeErrorMessage(err));
    }
  }

  async function handleExportMultiple() {
    if (selectedItems.length === 0) {
      alert("Please select items to export");
      return;
    }

    try {
      const response = await apiClient.post(
        "/student/portfolios/export-pdf/multiple",
        { portfolio_ids: selectedItems },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `portfolio-${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSelectedItems([]);
    } catch (err: unknown) {
      safeLogError(err, "Export Multiple");
      alert("Failed: " + getSafeErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6 animate-page-enter">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Your Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Projects you have completed and decided to showcase.
          </p>
        </div>
        <button
          onClick={() => navigate("/student/portfolios/create")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Portfolio Item
        </button>
      </header>

      {isLoading && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/30">
          <p className="text-sm text-slate-300">Loading portfolio...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {!isLoading && !error && !items.length && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/30 text-center">
          <p className="text-sm text-slate-300 mb-4">You have no portfolio items yet.</p>
          <button
            onClick={() => navigate("/student/portfolios/create")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm"
          >
            <Plus size={16} />
            Create First Portfolio Item
          </button>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          {/* Bulk actions */}
          {items.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <input
                type="checkbox"
                checked={selectedItems.length === items.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 cursor-pointer"
              />
              <span className="text-sm text-slate-300">
                {selectedItems.length > 0
                  ? `${selectedItems.length} selected`
                  : "Select items for bulk actions"}
              </span>
              {selectedItems.length > 0 && (
                <button
                  onClick={handleExportMultiple}
                  className="ml-auto flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
                >
                  <FileDown size={14} />
                  Export as PDF
                </button>
              )}
            </div>
          )}

          {/* Portfolio items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/student/portfolios/${item.id}`)}
                className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/30 hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectItem(item.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 cursor-pointer mt-1"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-slate-50 mb-1 truncate">
                      {item.title}
                    </h2>
                    {item.metadata?.project_name && (
                      <p className="text-xs text-slate-400 mb-2">
                        Project: <span className="text-slate-300">{item.metadata.project_name}</span>
                      </p>
                    )}
                    {item.description && (
                      <p className="text-sm text-slate-300 mb-2 line-clamp-2">{item.description}</p>
                    )}

                    {item.score !== undefined && item.score !== null && (
                      <p className="text-sm text-slate-300 mb-1">
                        Score: <span className="font-bold text-slate-50">{item.score.toFixed(1)}</span>
                      </p>
                    )}

                    {item.metadata?.tags && item.metadata.tags.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.metadata.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {item.metadata.tags.length > 3 && (
                          <span className="text-xs text-slate-400">
                            +{item.metadata.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleToggleVisibility(item, e)}
                      title={item.is_public ? "Make Private" : "Make Public"}
                      className="p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      {item.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student/portfolios/${item.id}/edit`);
                      }}
                      className="p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(item.id);
                      }}
                      className="p-2 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Delete Portfolio Item?</h3>
            <p className="text-sm text-slate-300 mb-6">
              This action cannot be undone. The portfolio item will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
