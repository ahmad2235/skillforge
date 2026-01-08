import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { apiClient } from "../../lib/apiClient";
import { safeLogError } from "../../lib/logger";
import { ApiStateCard } from "../../components/shared/ApiStateCard";
import { EmptyState } from "../../components/feedback/EmptyState";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { TaskDescription } from "../../components/task/TaskDescription";
import type { Task } from "../../types/learning";

type ErrorState = "invalid" | "not-found" | "generic";

export function StudentBlockTasksPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  useEffect(() => {
    const numericId = Number(id);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError("invalid");
      setLoading(false);
      return;
    }

    async function fetchTasks() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get(`/student/blocks/${numericId}/tasks`);
        const data = response.data.data ?? response.data;
        setTasks(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        safeLogError(err, "BlockTasks");

        if (isAxiosError(err) && err.response?.status === 404) {
          setError("not-found");
        } else {
          setError("generic");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [id]);

  const { blockTitle, breadcrumbTitle, blockId } = useMemo(() => {
    const state = (location.state || {}) as { blockTitle?: string; blockId?: number };
    const derivedTitle = state.blockTitle || "Learning block";
    return {
      blockTitle: state.blockTitle,
      breadcrumbTitle: derivedTitle,
      blockId: state.blockId,
    };
  }, [location.state]);

  const handleBackToRoadmap = () => navigate("/student/roadmap");

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-md bg-slate-800" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-slate-800" />
        </div>
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (error === "invalid") {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind="validation" title="Invalid block" description="The block id is missing or invalid." primaryActionLabel="Back to Roadmap" onPrimaryAction={handleBackToRoadmap} />
      </div>
    );
  }

  if (error === "not-found") {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind="not_found" title="Block not found" description="We couldn't find this block." primaryActionLabel="Back to Roadmap" onPrimaryAction={handleBackToRoadmap} />
      </div>
    );
  }

  if (error === "generic") {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind="network" title="Unable to load tasks" description="Please try again or return to your roadmap." primaryActionLabel="Back to Roadmap" onPrimaryAction={handleBackToRoadmap} />
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind="not_found" title="No tasks yet" description="This block doesn't have tasks yet. Check back soon." primaryActionLabel="Back to Roadmap" onPrimaryAction={handleBackToRoadmap} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 animate-page-enter">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          {blockTitle ? `${blockTitle} — Tasks` : "Learning block — Tasks"}
        </h1>
        <p className="text-base text-slate-300">
          Explore the tasks for this learning block.
        </p>
      </header>

      <div className="space-y-3">
        {tasks.map((task) => {
          const isCompleted = task.is_completed === true;
          const score = typeof task.score === 'number' ? Math.round(task.score) : null;
          const hasFailed = score !== null && score < 80 && !isCompleted;

          return (
            <Card 
              key={task.id} 
              className={
                "space-y-2 border p-4 shadow-xl shadow-slate-950/30 transition " +
                (isCompleted 
                  ? "border-emerald-500/40 bg-emerald-500/5" 
                  : hasFailed 
                    ? "border-red-500/40 bg-red-500/5"
                    : "border-slate-800 bg-slate-900/80")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-50">{task.title}</h3>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
                        ✓ Completed
                      </span>
                    )}
                    {hasFailed && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-200">
                        ✗ Failed
                      </span>
                    )}
                  </div>
                  {score !== null && (
                    <div className="text-sm">
                      <span className={isCompleted ? "text-emerald-300 font-medium" : "text-red-300 font-medium"}>
                        Score: {score}/100
                      </span>
                    </div>
                  )}
                  <div className="text-sm text-slate-300">
                    <TaskDescription description={task.description} />
                  </div>
                </div>
              </div>

              {isCompleted ? (
                <div className="mt-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-200">
                  🎉 Great job! You've passed this task. No resubmission needed.
                </div>
              ) : hasFailed ? (
                <div className="space-y-2 mt-2">
                  <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200">
                    📚 Keep studying and try again! You can resubmit to improve your score.
                  </div>
                  <Button size="sm" className="w-full sm:w-auto" asChild>
                    <Link
                      to={`/student/tasks/${task.id}`}
                      state={{
                        taskTitle: task.title,
                        blockId: blockId ?? Number(id),
                        blockTitle: blockTitle,
                      }}
                    >
                      Retry task
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="mt-2 w-full sm:w-auto" asChild>
                  <Link
                    to={`/student/tasks/${task.id}`}
                    state={{
                      taskTitle: task.title,
                      blockId: blockId ?? Number(id),
                      blockTitle: blockTitle,
                    }}
                  >
                    Open task
                  </Link>
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
