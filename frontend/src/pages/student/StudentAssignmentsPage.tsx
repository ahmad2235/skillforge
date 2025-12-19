import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { getSafeErrorMessage } from "../../lib/errors";
import { safeLogError } from "../../lib/logger";
import type { AssignmentStatus, ProjectAssignment } from "../../types/projects";
import { Link } from "react-router-dom";

const STATUS_TABS: AssignmentStatus[] = ["invited", "active", "completed"];

export function StudentAssignmentsPage() {
  const [status, setStatus] = useState<AssignmentStatus>("invited");
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function loadAssignments(selectedStatus: AssignmentStatus) {
    setIsLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const response = await apiClient.get("/student/projects/assignments", {
        params: { status: selectedStatus },
      });
      const data = response.data.data ?? response.data;
      setAssignments(data as ProjectAssignment[]);
    } catch (err: unknown) {
      safeLogError(err, "AssignmentsLoad");
      setError(getSafeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAssignments(status);
  }, [status]);

  async function handleAccept(assignmentId: number) {
    setActionMessage(null);
    setError(null);
    try {
      await apiClient.post(
        `/student/projects/assignments/${assignmentId}/accept`
      );
      setActionMessage("Assignment accepted successfully.");
      await loadAssignments(status);
    } catch (err: unknown) {
      safeLogError(err, "AssignmentAccept");
      setError(getSafeErrorMessage(err));
    }
  }

  async function handleDecline(assignmentId: number) {
    setActionMessage(null);
    setError(null);
    try {
      await apiClient.post(
        `/student/projects/assignments/${assignmentId}/decline`
      );
      setActionMessage("Assignment declined.");
      await loadAssignments(status);
    } catch (err: unknown) {
      safeLogError(err, "AssignmentDecline");
      setError(getSafeErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Your Project Assignments</h1>
          <p className="text-slate-300 text-sm">
            Review invitations, active projects, and completed work.
          </p>
        </header>

        {/* Status tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatus(tab)}
              className={`px-3 py-1 text-sm rounded-md border ${
                status === tab
                  ? "border-sky-500 bg-sky-600/20 text-sky-200"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLoading && (
          <p className="text-slate-300 text-sm">Loading assignments...</p>
        )}

        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/40 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="rounded-md border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm text-emerald-100">
            {actionMessage}
          </div>
        )}

        {!isLoading && !error && !assignments.length && (
          <p className="text-slate-400 text-sm">
            No assignments found with status "{status}".
          </p>
        )}

        <div className="space-y-3">
          {assignments.map((assignment) => {
            const project = assignment.project;
            return (
              <div
                key={assignment.id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold">
                    {project?.title ?? `Assignment #${assignment.id}`}
                  </h2>
                  <span className="text-xs rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                    {assignment.status}
                  </span>
                </div>
                {project?.description && (
                  <p className="text-sm text-slate-300 mb-2 line-clamp-3">
                    {project.description}
                  </p>
                )}

                <div className="flex gap-2 text-sm mt-2 flex-wrap">
                  {status === "invited" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAccept(assignment.id)}
                        className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-white"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(assignment.id)}
                        className="rounded-md bg-red-600 hover:bg-red-500 px-3 py-1 text-white"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {status === "active" && (
                    <Link
                      to={`/student/projects/assignments/${assignment.id}/portfolio`}
                      className="rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-1 text-white"
                    >
                      Add to Portfolio
                    </Link>
                  )}

                  {status === "completed" && (
                    <Link
                      to="/student/portfolios"
                      className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                    >
                      View in Portfolio
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
