import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import type { Task, RoadmapBlock } from "../../types/learning";

export function StudentBlockTasksPage() {
  const { blockId } = useParams();
  const [block, setBlock] = useState<RoadmapBlock | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loadingBlock, setLoadingBlock] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load block info (we get it by filtering roadmap)
  useEffect(() => {
    async function fetchBlock() {
      try {
        const roadmapResponse = await apiClient.get("/student/roadmap");
        const roadmapBlocks: RoadmapBlock[] =
          roadmapResponse.data.data ?? roadmapResponse.data;

        const found = roadmapBlocks.find((b) => b.id === Number(blockId));
        setBlock(found ?? null);
      } catch (err: unknown) {
        console.error(err);
        setError("Failed to load block details.");
      } finally {
        setLoadingBlock(false);
      }
    }

    fetchBlock();
  }, [blockId]);

  // Load tasks for this block
  useEffect(() => {
    async function fetchTasks() {
      try {
        const response = await apiClient.get(
          `/student/blocks/${blockId}/tasks`
        );
        const data = response.data.data ?? response.data;
        setTasks(data);
      } catch (err: unknown) {
        console.error(err);
        setError("Failed to load tasks.");
      } finally {
        setLoadingTasks(false);
      }
    }

    fetchTasks();
  }, [blockId]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (loadingBlock || loadingTasks) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300">Loading tasks...</p>
      </div>
    );
  }

  if (!block) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">This block was not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-3xl font-bold">{block.title}</h1>
        <p className="text-slate-300 text-sm">
          {block.description ?? "No description provided."}
        </p>

        <h2 className="text-xl font-semibold mt-6">Tasks</h2>

        {!tasks.length ? (
          <p className="text-slate-400 text-sm">No tasks found.</p>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-4"
              >
                <h3 className="text-lg font-medium">{task.title}</h3>
                <p className="text-slate-400 text-sm mb-3">
                  {task.description ?? "No description provided."}
                </p>

                <Link
                  to={`/student/tasks/${task.id}/submit`}
                  className="inline-block mt-1 rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1 text-sm text-white"
                >
                  Open Task
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
