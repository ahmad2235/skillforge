import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { apiClient } from "../../lib/apiClient";
import { ApiStateCard } from "../../components/shared/ApiStateCard";
import { parseApiError } from "../../lib/apiErrors";
import { SkeletonList } from "../../components/feedback/Skeletons";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import type { AssignmentStatus, ProjectAssignment } from "../../types/projects";
import { Link, useNavigate } from "react-router-dom";

const STATUS_TABS: AssignmentStatus[] = ["invited", "active", "completed"];

export function StudentAssignmentsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AssignmentStatus>("invited");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/student/projects/assignments", {
        params: { status },
      });
      const data = response.data.data ?? response.data;
      setAssignments(data as ProjectAssignment[]);
    } catch (err: unknown) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  async function handleAccept(assignmentId: number) {
    try {
      await apiClient.post(
        `/student/projects/assignments/${assignmentId}/accept`
      );
      await fetchAssignments();
    } catch (err: unknown) {
      setError(err);
    }
  }

  async function handleDecline(assignmentId: number) {
    try {
      await apiClient.post(
        `/student/projects/assignments/${assignmentId}/decline`
      );
      await fetchAssignments();
    } catch (err: unknown) {
      setError(err);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (error) {
    const parsed = parseApiError(error);
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ApiStateCard kind={parsed.kind} description={parsed.message} primaryActionLabel="Retry" onPrimaryAction={fetchAssignments} />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card className="space-y-3 border border-slate-200 bg-white p-6 shadow-sm text-center">
          <h3 className="text-lg font-semibold text-slate-900">No assignments yet</h3>
          <p className="text-sm text-slate-700">
            You don't have any assignments at the moment. Check your roadmap or continue learning to receive assignments.
          </p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate("/student/roadmap")}>Go to roadmap</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Your Project Assignments</h1>
        <p className="text-sm text-slate-700">
          Review invitations, active projects, and completed work.
        </p>
      </header>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatus(tab)}
            className={`rounded-md border px-3 py-1 text-sm transition ${
              status === tab
                ? "border-primary bg-primary/10 text-primary"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {!error &&
          assignments.map((assignment) => {
            const project = assignment.project;
            return (
              <Card key={assignment.id} className="border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {project?.title ?? `Assignment #${assignment.id}`}
                  </h2>
                  <span className="text-xs rounded-full border border-slate-200 px-2 py-0.5 text-slate-700">
                    {assignment.status}
                  </span>
                </div>
                {project?.description && (
                  <p className="mb-2 line-clamp-3 text-sm text-slate-700">
                    {project.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  {status === "invited" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAccept(assignment.id)}
                        className="rounded-md bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-500"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(assignment.id)}
                        className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-500"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {status === "active" && (
                    <Link
                      to={`/student/projects/assignments/${assignment.id}/portfolio`}
                      className="rounded-md bg-primary px-3 py-1 text-white hover:bg-primary/90"
                    >
                      Add to Portfolio
                    </Link>
                  )}

                  {status === "completed" && (
                    <Link
                      to="/student/portfolios"
                      className="rounded-md border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
                    >
                      View in Portfolio
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
