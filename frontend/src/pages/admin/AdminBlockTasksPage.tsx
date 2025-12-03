import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import type { RoadmapBlock, Task } from "../../types/learning";

export function AdminBlockTasksPage() {
  const { blockId } = useParams();
  const [block, setBlock] = useState<RoadmapBlock | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingBlock, setIsLoadingBlock] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state for creating a task
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("project"); // or "quiz", "practice", etc.
  const [difficulty, setDifficulty] = useState<number | "">("");
  const [maxScore, setMaxScore] = useState<number | "">(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!blockId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">
          No block selected. Go back to roadmap blocks.
        </p>
      </div>
    );
  }

  async function loadBlock() {
    setIsLoadingBlock(true);
    setError(null);
    try {
      // ما عندنا endpoint منفصل للـ block، فنستعمل /admin/learning/blocks ونفلتر
      const response = await apiClient.get("/admin/learning/blocks");
      const data = (response.data.data ?? response.data) as RoadmapBlock[];
      const found = data.find((b) => b.id === Number(blockId)) ?? null;
      setBlock(found);
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ?? "Failed to load block details.";
      setError(message);
    } finally {
      setIsLoadingBlock(false);
    }
  }

  async function loadTasks() {
    setIsLoadingTasks(true);
    setError(null);
    try {
      const response = await apiClient.get(
        `/admin/learning/blocks/${blockId}/tasks`
      );
      const data = response.data.data ?? response.data;
      setTasks(data as Task[]);
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message ?? "Failed to load tasks.";
      setError(message);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  useEffect(() => {
    void loadBlock();
    void loadTasks();
  }, [blockId]);

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        title,
        description: description || null,
        type,
        difficulty: difficulty === "" ? 1 : Number(difficulty),
        max_score: maxScore === "" ? 100 : Number(maxScore),
      };

      await apiClient.post(`/admin/learning/blocks/${blockId}/tasks`, payload);

      setSuccessMessage("Task created successfully.");
      setTitle("");
      setDescription("");
      setDifficulty("");
      setMaxScore(100);
      await loadTasks();
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ??
        "Failed to create task. Please check your input.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingBlock && isLoadingTasks) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Loading block & tasks...</p>
      </div>
    );
  }

  if (!block) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">
          Block not found. Go back to roadmap blocks.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <header className="space-y-1">
          <p className="text-xs text-slate-400 mb-1">
            <Link
              to="/admin/learning/blocks"
              className="text-sky-400 hover:underline"
            >
              &larr; Back to blocks
            </Link>
          </p>
          <h1 className="text-2xl font-bold">Tasks for: {block.title}</h1>
          <p className="text-xs text-slate-400">
            {block.level} · {block.domain}
          </p>
          {block.description && (
            <p className="text-sm text-slate-300">{block.description}</p>
          )}
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Create New Task</h2>

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

          <form onSubmit={handleCreateTask} className="space-y-3">
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
                placeholder="Simple HTML Page, REST API Endpoint, etc."
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
                placeholder="Explain the requirements of this task."
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="block text-sm text-slate-200">Type</label>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="project">Project</option>
                  <option value="coding">Coding</option>
                  <option value="quiz">Quiz</option>
                  <option value="theory">Theory</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm text-slate-200">
                  Difficulty
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="1–5"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm text-slate-200">
                  Max score
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  value={maxScore}
                  onChange={(e) =>
                    setMaxScore(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Existing Tasks</h2>

          {isLoadingTasks ? (
            <p className="text-slate-300 text-sm">Loading tasks...</p>
          ) : !tasks.length ? (
            <p className="text-slate-400 text-sm">
              No tasks defined for this block yet.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-md font-semibold">{task.title}</h3>
                    <span className="text-xs rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                      {task.type} · difficulty {task.difficulty}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-300">{task.description}</p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">
                    Max score: {task.max_score}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
