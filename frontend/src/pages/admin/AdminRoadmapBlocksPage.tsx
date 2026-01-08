import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import type { RoadmapBlock } from "../../types/learning";

type LevelOption = "beginner" | "intermediate" | "advanced";
type DomainOption = "frontend" | "backend";

export function AdminRoadmapBlocksPage() {
  const [blocks, setBlocks] = useState<RoadmapBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state for creating a new block
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<LevelOption>("beginner");
  const [domain, setDomain] = useState<DomainOption>("frontend");
  const [order, setOrder] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadBlocks() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/admin/learning/blocks");
      const data = response.data.data ?? response.data;
      setBlocks(data as RoadmapBlock[]);
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ?? "Failed to load roadmap blocks.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBlocks();
  }, []);

  async function handleCreateBlock(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        title,
        description: description || null,
        level,
        domain,
        order_index: order === "" ? null : Number(order),
      };

      await apiClient.post("/admin/learning/blocks", payload);
      setSuccessMessage("Block created successfully.");
      setTitle("");
      setDescription("");
      setOrder("");
      await loadBlocks();
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ??
        "Failed to create roadmap block. Please check your input.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="py-8 animate-page-enter">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Learning Roadmap Blocks</h1>
          <p className="text-muted-foreground text-sm">
            Manage the learning blocks for each level & domain. Each block can
            contain multiple tasks.
          </p>
        </header>

        {/* Create block form */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Create New Block</h2>

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

          <form onSubmit={handleCreateBlock} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-sm text-slate-200" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="HTML basics, React fundamentals, etc."
              />
            </div>

            <div className="space-y-1">
              <label
                className="block text-sm text-slate-200"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                className="w-full min-h-[80px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this block about?"
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

              <div className="space-y-1">
                <label className="block text-sm text-slate-200">
                  Order (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  value={order}
                  onChange={(e) =>
                    setOrder(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="1"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
            >
              {isSubmitting ? "Creating..." : "Create Block"}
            </button>
          </form>
        </section>

        {/* Blocks list */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Existing Blocks</h2>

          {isLoading ? (
            <p className="text-slate-300 text-sm">Loading blocks...</p>
          ) : !blocks.length ? (
            <p className="text-slate-400 text-sm">
              No roadmap blocks found yet.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {blocks.map((block) => (
                <Link
                  key={block.id}
                  to={`/admin/learning/blocks/${block.id}/tasks`}
                  className="block rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-sky-500 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-md font-semibold">{block.title}</h3>
                    <span className="text-xs rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                      {block.level} · {block.domain}
                    </span>
                  </div>
                  {block.description && (
                    <p className="text-xs text-slate-300 line-clamp-3">
                      {block.description}
                    </p>
                  )}
                  {block.order_index != null && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Order: {block.order_index}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
