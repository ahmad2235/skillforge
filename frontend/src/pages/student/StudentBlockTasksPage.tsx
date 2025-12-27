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
          <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-slate-200" />
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
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {blockTitle ? `${blockTitle} — Tasks` : "Learning block — Tasks"}
        </h1>
        <p className="text-base text-slate-700">
          Explore the tasks for this learning block.
        </p>
      </header>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className="space-y-2 border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                <p className="text-sm text-slate-700">
                  {task.description ?? "No description provided."}
                </p>
              </div>
            </div>

            <Button size="sm" className="mt-2" asChild>
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
          </Card>
        ))}
      </div>
    </div>
  );
}
